import React, { useState, useEffect } from 'react';
import { 
  ChatBubbleLeftRightIcon, 
  PhoneIcon, 
  EnvelopeIcon, 
  VideoCameraIcon,
  CurrencyDollarIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import EditableField from '../../forms/EditableField';
import useDoctorProfile from '../../../hooks/useDoctorProfile.js';

const ConsultationModesSection = ({
  doctorId,
  consultationModes: propConsultationModes = {},
  onUpdate,
  isEditable = true,
  validation = null,
  className = ''
}) => {
  const { updateProfileSection, consultationModes: hookConsultationModes } = useDoctorProfile(doctorId);
  
  // Use data from hook if available, otherwise fall back to props
  const consultationModes = hookConsultationModes || propConsultationModes;
  
  const [validationErrors, setValidationErrors] = useState({});
  const [expandedMode, setExpandedMode] = useState(null);

  const consultationTypes = [
    {
      key: 'chat',
      label: 'Chat Consultation',
      icon: ChatBubbleLeftRightIcon,
      description: 'Text-based consultation through secure messaging',
      durationLabel: 'Session Duration',
      durationUnit: 'minutes',
      defaultDuration: 30,
      minDuration: 15,
      maxDuration: 120
    },
    {
      key: 'phone',
      label: 'Phone Consultation',
      icon: PhoneIcon,
      description: 'Voice consultation via phone call',
      durationLabel: 'Call Duration',
      durationUnit: 'minutes',
      defaultDuration: 30,
      minDuration: 15,
      maxDuration: 60
    },
    {
      key: 'email',
      label: 'Email Consultation',
      icon: EnvelopeIcon,
      description: 'Detailed consultation via email exchange',
      durationLabel: 'Response Time',
      durationUnit: 'hours',
      defaultDuration: 24,
      minDuration: 2,
      maxDuration: 72,
      useResponseTime: true
    },
    {
      key: 'video',
      label: 'Video Consultation',
      icon: VideoCameraIcon,
      description: 'Face-to-face consultation via video call',
      durationLabel: 'Session Duration',
      durationUnit: 'minutes',
      defaultDuration: 30,
      minDuration: 15,
      maxDuration: 60
    }
  ];

  // Validate on mount
  useEffect(() => {
    validateConsultationModes(consultationModes);
  }, []); // Only run on mount

  const validateConsultationModes = (modes) => {
    const errors = {};

    // Check if at least one mode is enabled
    const hasEnabledMode = Object.values(modes).some(mode => mode?.available);
    if (!hasEnabledMode) {
      errors.general = 'At least one consultation mode must be enabled';
    }

    // Validate each enabled mode
    Object.entries(modes).forEach(([modeKey, modeData]) => {
      if (!modeData?.available) return;

      const modeErrors = [];
      const modeConfig = consultationTypes.find(type => type.key === modeKey);

      // Validate fee
      if (modeData.fee === undefined || modeData.fee === null || modeData.fee < 0) {
        modeErrors.push('Fee must be a valid positive number');
      } else if (modeData.fee > 10000) {
        modeErrors.push('Fee cannot exceed $10,000');
      }

      // Validate duration/response time
      const durationField = modeConfig?.useResponseTime ? 'responseTime' : 'duration';
      const duration = modeData[durationField];
      
      if (!duration || duration < modeConfig?.minDuration) {
        modeErrors.push(`${modeConfig?.durationLabel} must be at least ${modeConfig?.minDuration} ${modeConfig?.durationUnit}`);
      } else if (duration > modeConfig?.maxDuration) {
        modeErrors.push(`${modeConfig?.durationLabel} cannot exceed ${modeConfig?.maxDuration} ${modeConfig?.durationUnit}`);
      }

      if (modeErrors.length > 0) {
        errors[modeKey] = modeErrors;
      }
    });

    // Custom validation
    if (validation) {
      const customErrors = validation(modes);
      if (customErrors && typeof customErrors === 'object') {
        Object.assign(errors, customErrors);
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const updateConsultationMode = (modeKey, updates) => {
    const modeConfig = consultationTypes.find(type => type.key === modeKey);
    const currentMode = consultationModes[modeKey] || {};
    
    const newModeData = {
      available: false,
      fee: 0,
      duration: modeConfig?.defaultDuration || 30,
      ...currentMode,
      ...updates
    };

    // Handle email mode response time
    if (modeConfig?.useResponseTime) {
      newModeData.responseTime = updates.responseTime || currentMode.responseTime || modeConfig.defaultDuration;
      delete newModeData.duration; // Email mode doesn't use duration
    }

    const newModes = {
      ...consultationModes,
      [modeKey]: newModeData
    };
    
    // Update via hook
    updateProfileSection('consultationModes', newModes);
    
    // Update parent component
    if (onUpdate) {
      onUpdate('consultationModes', newModes);
    }
    
    // Validate after update
    setTimeout(() => validateConsultationModes(newModes), 0);
  };

  const toggleModeAvailability = (modeKey) => {
    const currentMode = consultationModes[modeKey] || {};
    const modeConfig = consultationTypes.find(type => type.key === modeKey);
    
    updateConsultationMode(modeKey, {
      available: !currentMode.available,
      fee: currentMode.fee || 50, // Default fee
      duration: currentMode.duration || modeConfig?.defaultDuration || 30,
      ...(modeConfig?.useResponseTime && { responseTime: currentMode.responseTime || modeConfig.defaultDuration })
    });
  };

  const renderModeCard = (modeConfig) => {
    const modeData = consultationModes[modeConfig.key] || {};
    const isEnabled = modeData.available;
    const isExpanded = expandedMode === modeConfig.key;
    const hasErrors = validationErrors[modeConfig.key];
    const IconComponent = modeConfig.icon;

    return (
      <div 
        key={modeConfig.key}
        className={`border rounded-lg transition-all duration-200 ${
          isEnabled 
            ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-900/20' 
            : 'border-gray-200 dark:border-gray-700'
        } ${hasErrors ? 'border-red-300 dark:border-red-600' : ''}`}
      >
        <div 
          className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50"
          onClick={() => setExpandedMode(isExpanded ? null : modeConfig.key)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={isEnabled ?? false}
                onChange={(e) => {
                  e.stopPropagation();
                  toggleModeAvailability(modeConfig.key);
                }}
                disabled={!isEditable}
                className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                aria-label={modeConfig.label}
              />
              <IconComponent className={`h-5 w-5 ${isEnabled ? 'text-emerald-600' : 'text-gray-400'}`} />
              <div>
                <h3 className="font-medium text-gray-900 dark:text-gray-100">
                  {modeConfig.label}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {modeConfig.description}
                </p>
              </div>
              {hasErrors && (
                <ExclamationTriangleIcon className="h-4 w-4 text-red-500" />
              )}
            </div>
            
            {isEnabled && (
              <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-center gap-1">
                  <CurrencyDollarIcon className="h-4 w-4" />
                  <span>${modeData.fee || 0}</span>
                </div>
                <div className="flex items-center gap-1">
                  <ClockIcon className="h-4 w-4" />
                  <span>
                    {modeConfig.useResponseTime ? (modeData.responseTime ?? modeConfig.defaultDuration) : (modeData.duration ?? modeConfig.defaultDuration)} {modeConfig.durationUnit}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {isExpanded && isEnabled && (
          <div className="border-t border-gray-200 dark:border-gray-700 p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Fee Configuration */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Consultation Fee
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="number"
                    value={modeData.fee ?? 0}
                    onChange={(e) => updateConsultationMode(modeConfig.key, { fee: parseFloat(e.target.value) || 0 })}
                    disabled={!isEditable}
                    placeholder="Enter fee amount"
                    min={0}
                    max={10000}
                    step={5}
                    className="w-full pl-8 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-gray-100"
                  />
                </div>
              </div>

              {/* Duration/Response Time Configuration */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {modeConfig.durationLabel}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={modeConfig.useResponseTime ? (modeData.responseTime ?? modeConfig.defaultDuration) : (modeData.duration ?? modeConfig.defaultDuration)}
                    onChange={(e) => {
                      const field = modeConfig.useResponseTime ? 'responseTime' : 'duration';
                      updateConsultationMode(modeConfig.key, { [field]: parseInt(e.target.value) || modeConfig.defaultDuration });
                    }}
                    disabled={!isEditable}
                    placeholder={`Enter ${modeConfig.durationLabel.toLowerCase()}`}
                    min={modeConfig.minDuration}
                    max={modeConfig.maxDuration}
                    step={modeConfig.useResponseTime ? 1 : 5}
                    className="w-full pr-16 pl-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-gray-100"
                  />
                  <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                    {modeConfig.durationUnit}
                  </span>
                </div>
              </div>
            </div>

            {/* Mode-specific information */}
            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
              <div className="flex items-start gap-2">
                <InformationCircleIcon className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-700 dark:text-blue-300">
                  {modeConfig.key === 'chat' && (
                    <p>Patients will be able to send messages and receive responses during the session duration. Consider your availability for real-time responses.</p>
                  )}
                  {modeConfig.key === 'phone' && (
                    <p>Phone consultations require your direct availability. Ensure your phone number is updated in your profile settings.</p>
                  )}
                  {modeConfig.key === 'email' && (
                    <p>Email consultations allow for detailed responses. Response time indicates your commitment to reply within the specified hours.</p>
                  )}
                  {modeConfig.key === 'video' && (
                    <p>Video consultations provide face-to-face interaction. Ensure you have a stable internet connection and appropriate setup.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Mode-specific errors */}
            {hasErrors && (
              <div className="text-sm text-red-600 dark:text-red-400 space-y-1">
                {hasErrors.map((error, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <ExclamationTriangleIcon className="h-4 w-4" />
                    {error}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Display errors even when not expanded for failed validation */}
        {hasErrors && !isExpanded && (
          <div className="border-t border-gray-200 dark:border-gray-700 p-4">
            <div className="text-sm text-red-600 dark:text-red-400 space-y-1">
              {hasErrors.map((error, index) => (
                <div key={index} className="flex items-center gap-2">
                  <ExclamationTriangleIcon className="h-4 w-4" />
                  {error}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const enabledModes = Object.entries(consultationModes).filter(([_, mode]) => mode?.available);
  const totalPotentialEarnings = enabledModes.reduce((sum, [_, mode]) => sum + (mode.fee || 0), 0);

  return (
    <div className={`consultation-modes-section ${className}`}>
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
          Consultation Modes
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Configure the types of consultations you offer and set your fees for each mode.
        </p>
      </div>

      <div className="space-y-4">
        {consultationTypes.map(renderModeCard)}
      </div>

      {/* Summary */}
      {enabledModes.length > 0 && (
        <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-600 dark:text-gray-400">Enabled Modes:</span>
              <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">
                {enabledModes.length}
              </span>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">Average Fee:</span>
              <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">
                ${enabledModes.length > 0 ? (totalPotentialEarnings / enabledModes.length).toFixed(2) : '0.00'}
              </span>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">Fee Range:</span>
              <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">
                ${Math.min(...enabledModes.map(([_, mode]) => mode.fee || 0))} - ${Math.max(...enabledModes.map(([_, mode]) => mode.fee || 0))}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* General validation errors */}
      {validationErrors.general && (
        <p className="mt-4 text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
          <ExclamationTriangleIcon className="h-4 w-4" />
          {validationErrors.general}
        </p>
      )}
    </div>
  );
};

export default ConsultationModesSection;