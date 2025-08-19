import React, { useState, useCallback, useEffect } from 'react';
import {
  BriefcaseIcon,
  PlusIcon,
  TrashIcon,
  BuildingOfficeIcon,
  CalendarIcon,
  PencilSquareIcon,
  CheckIcon,
  XMarkIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import EditableField from '../../forms/EditableField.jsx';
import useDoctorProfile from '../../../hooks/useDoctorProfile.js';
import { toast } from 'react-toastify';

const ExperienceSection = ({
  doctorId,
  experienceData: propExperienceData = {},
  bio: propBio = '',
  onUpdate,
  isEditable = true
}) => {
  const { updateProfileSection, experience, personalInfo } = useDoctorProfile(doctorId);

  // Use data from hook if available, otherwise fall back to props
  const experienceData = experience || propExperienceData;
  const bio = personalInfo?.bio || propBio;

  // Force re-render when experience data changes
  const [localExperienceData, setLocalExperienceData] = useState(experienceData);

  useEffect(() => {
    if (experienceData && Object.keys(experienceData).length > 0) {
      setLocalExperienceData(experienceData);
    }
  }, [experienceData]);

  const [validationErrors, setValidationErrors] = useState({});
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [bioValue, setBioValue] = useState(bio || '');
  const [bioCharCount, setBioCharCount] = useState((bio || '').length);
  const [isSavingBio, setIsSavingBio] = useState(false);
  const [editingWorkplace, setEditingWorkplace] = useState(null);
  const [newWorkplace, setNewWorkplace] = useState({
    hospitalName: '',
    position: '',
    startDate: '',
    endDate: '',
    isCurrent: false
  });
  const [showAddWorkplace, setShowAddWorkplace] = useState(false);

  const BIO_MAX_LENGTH = 1000;

  // Validation functions
  const validateTotalYears = (value) => {
    const years = parseInt(value);
    if (isNaN(years) || years < 0 || years > 60) {
      return 'Total years must be between 0 and 60';
    }
    return true;
  };

  const validateWorkplace = (workplace) => {
    const errors = {};

    if (!workplace.hospitalName || workplace.hospitalName.trim() === '') {
      errors.hospitalName = 'Hospital/clinic name is required';
    }

    if (!workplace.position || workplace.position.trim() === '') {
      errors.position = 'Position is required';
    }

    if (!workplace.startDate) {
      errors.startDate = 'Start date is required';
    }

    if (workplace.endDate && workplace.startDate) {
      const start = new Date(workplace.startDate);
      const end = new Date(workplace.endDate);
      if (start >= end) {
        errors.endDate = 'End date must be after start date';
      }
    }

    return Object.keys(errors).length === 0 ? true : errors;
  };

  // API call functions
  const updateExperienceField = async (field, value) => {
    try {
      // Get current experience data and merge with new field
      const currentData = {
        totalYears: localExperienceData.totalYears || 0,
        currentPosition: localExperienceData.currentPosition || '',
        workplace: localExperienceData.workplace || [],
        bio: bio || '',
        ...localExperienceData,
        [field]: value
      };

      // console.log('Updating experience field:', field, 'with value:', value);

      const result = await updateProfileSection('experience', currentData);

      // Update local state to reflect the change
      setLocalExperienceData(prev => ({
        ...prev,
        [field]: value
      }));

      // Update parent component
      if (onUpdate) {
        onUpdate('experience', { [field]: value });
      }

      toast.success(`${field.charAt(0).toUpperCase() + field.slice(1)} updated successfully`);

      // Clear any validation errors for this field
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });

      return result;
    } catch (error) {
      const errorMessage = error.response?.data?.message || `Failed to update ${field}`;
      toast.error(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const saveBio = async () => {
    if (bioValue.length > BIO_MAX_LENGTH) {
      toast.error(`Bio must not exceed ${BIO_MAX_LENGTH} characters`);
      return;
    }

    setIsSavingBio(true);
    try {
      await updateProfileSection('personal', { bio: bioValue });

      // Update parent component
      if (onUpdate) {
        onUpdate('personal', { bio: bioValue });
      }

      setIsEditingBio(false);
      toast.success('Bio updated successfully');
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to update bio';
      toast.error(errorMessage);
    } finally {
      setIsSavingBio(false);
    }
  };

  const addWorkplace = async () => {
    const validation = validateWorkplace(newWorkplace);
    if (validation !== true) {
      setValidationErrors({ workplace: validation });
      return;
    }

    try {
      const currentWorkplaces = localExperienceData.workplace || [];
      const updatedWorkplaces = [...currentWorkplaces, newWorkplace];

      await updateExperienceField('workplace', updatedWorkplaces);

      setNewWorkplace({
        hospitalName: '',
        position: '',
        startDate: '',
        endDate: '',
        isCurrent: false
      });
      setShowAddWorkplace(false);
      setValidationErrors({});
    } catch (error) {
      console.error('Failed to add workplace:', error);
    }
  };

  const updateWorkplace = async (index, updatedWorkplace) => {
    const validation = validateWorkplace(updatedWorkplace);
    if (validation !== true) {
      setValidationErrors({ [`workplace_${index}`]: validation });
      return;
    }

    try {
      const currentWorkplaces = [...(localExperienceData.workplace || [])];
      currentWorkplaces[index] = updatedWorkplace;

      await updateExperienceField('workplace', currentWorkplaces);
      setEditingWorkplace(null);
      setValidationErrors({});
    } catch (error) {
      console.error('Failed to update workplace:', error);
    }
  };

  const removeWorkplace = async (index) => {
    try {
      const currentWorkplaces = [...(localExperienceData.workplace || [])];
      currentWorkplaces.splice(index, 1);

      await updateExperienceField('workplace', currentWorkplaces);
      toast.success('Workplace removed successfully');
    } catch (error) {
      console.error('Failed to remove workplace:', error);
    }
  };

  const handleBioChange = (e) => {
    const value = e.target.value;
    setBioValue(value);
    setBioCharCount(value.length);
  };

  const cancelBioEdit = () => {
    setBioValue(bio || '');
    setBioCharCount((bio || '').length);
    setIsEditingBio(false);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short'
    });
  };

  // Workplace form component to avoid hooks in render functions
  const WorkplaceForm = ({ workplace, onSave, onCancel, isNew = false, errors = {} }) => {
    const [localWorkplace, setLocalWorkplace] = useState(workplace);

    const handleFieldChange = (field, value) => {
      setLocalWorkplace(prev => ({ ...prev, [field]: value }));
      if (isNew) {
        setNewWorkplace(prev => ({ ...prev, [field]: value }));
      }
    };

    const handleSave = () => {
      onSave(localWorkplace);
    };

    return (
      <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Hospital/Clinic Name *
            </label>
            <input
              type="text"
              value={localWorkplace.hospitalName || ''}
              onChange={(e) => handleFieldChange('hospitalName', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-gray-100"
              placeholder="Enter hospital or clinic name"
            />
            {errors.hospitalName && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.hospitalName}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Position *
            </label>
            <input
              type="text"
              value={localWorkplace.position || ''}
              onChange={(e) => handleFieldChange('position', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-gray-100"
              placeholder="Enter your position"
            />
            {errors.position && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.position}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Start Date *
            </label>
            <input
              type="date"
              value={localWorkplace.startDate ? new Date(localWorkplace.startDate).toISOString().split('T')[0] : ''}
              onChange={(e) => handleFieldChange('startDate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-gray-100"
            />
            {errors.startDate && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.startDate}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              End Date
            </label>
            <input
              type="date"
              value={localWorkplace.endDate ? new Date(localWorkplace.endDate).toISOString().split('T')[0] : ''}
              onChange={(e) => handleFieldChange('endDate', e.target.value)}
              disabled={localWorkplace.isCurrent}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            {errors.endDate && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.endDate}</p>
            )}
          </div>
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id={`current-${isNew ? 'new' : editingWorkplace}`}
            checked={localWorkplace.isCurrent || false}
            onChange={(e) => handleFieldChange('isCurrent', e.target.checked)}
            className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
          />
          <label htmlFor={`current-${isNew ? 'new' : editingWorkplace}`} className="ml-2 text-sm text-gray-700 dark:text-gray-300">
            This is my current workplace
          </label>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-600">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors"
          >
            {isNew ? 'Add Workplace' : 'Save Changes'}
          </button>
        </div>
      </div>
    );
  };

  const renderWorkplaceForm = (workplace, onSave, onCancel, isNew = false) => {
    const workplaceErrors = validationErrors[isNew ? 'workplace' : `workplace_${editingWorkplace}`] || {};

    return (
      <WorkplaceForm
        workplace={workplace}
        onSave={onSave}
        onCancel={onCancel}
        isNew={isNew}
        errors={workplaceErrors}
      />
    );
  };

  return (
    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl p-6 border border-white/20 dark:border-gray-700/30 shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
            <BriefcaseIcon className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Professional Experience
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Your professional background and work history
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-8">
        {/* Total Years of Experience */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <EditableField
            label="Total Years of Experience"
            value={localExperienceData.totalYears?.toString() || '0'}
            onSave={(value) => updateExperienceField('totalYears', parseInt(value))}
            type="number"
            validation={validateTotalYears}
            disabled={!isEditable}
            placeholder="Enter years of experience"
            className="space-y-2"
          />

          <EditableField
            label="Current Position"
            value={localExperienceData.currentPosition || ''}
            onSave={(value) => updateExperienceField('currentPosition', value)}
            disabled={!isEditable}
            placeholder="Enter current position"
            className="space-y-2"
          />
        </div>

        {/* Bio Section */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Professional Bio
          </label>

          {!isEditingBio ? (
            <div className="group relative">
              <div className="min-h-[100px] p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                {bio ? (
                  <p className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                    {bio}
                  </p>
                ) : (
                  <p className="text-gray-400 italic">
                    Add a professional bio to tell patients about your background and expertise...
                  </p>
                )}
              </div>
              {isEditable && (
                <button
                  onClick={() => setIsEditingBio(true)}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all duration-200"
                  title="Edit bio"
                >
                  <PencilSquareIcon className="h-4 w-4" />
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="relative">
                <textarea
                  value={bioValue}
                  onChange={handleBioChange}
                  className="w-full min-h-[120px] p-4 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-gray-100 resize-none"
                  placeholder="Write about your professional background, expertise, and what makes you unique as a healthcare provider..."
                  maxLength={BIO_MAX_LENGTH}
                />
                <div className="absolute bottom-2 right-2 text-xs text-gray-400">
                  {bioCharCount}/{BIO_MAX_LENGTH}
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={cancelBioEdit}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={saveBio}
                  disabled={isSavingBio || bioCharCount > BIO_MAX_LENGTH}
                  className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                >
                  {isSavingBio ? 'Saving...' : 'Save Bio'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Work History Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100">
              Work History
            </h4>
            {isEditable && !showAddWorkplace && (
              <button
                onClick={() => setShowAddWorkplace(true)}
                className="flex items-center px-3 py-1 text-sm text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
              >
                <PlusIcon className="h-4 w-4 mr-1" />
                Add Workplace
              </button>
            )}
          </div>

          {/* Add New Workplace Form */}
          {showAddWorkplace && (
            <div>
              <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Add New Workplace</h5>
              {renderWorkplaceForm(
                newWorkplace,
                addWorkplace,
                () => {
                  setShowAddWorkplace(false);
                  setValidationErrors({});
                },
                true
              )}
            </div>
          )}

          {/* Existing Workplaces */}
          <div className="space-y-3">
            {localExperienceData.workplace && localExperienceData.workplace.length > 0 ? (
              localExperienceData.workplace.map((workplace, index) => (
                <div key={index} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                  {editingWorkplace === index ? (
                    renderWorkplaceForm(
                      workplace,
                      () => updateWorkplace(index, workplace),
                      () => {
                        setEditingWorkplace(null);
                        setValidationErrors({});
                      }
                    )
                  ) : (
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <BuildingOfficeIcon className="h-5 w-5 text-gray-400" />
                          <h5 className="font-medium text-gray-900 dark:text-gray-100">
                            {workplace.hospitalName}
                          </h5>
                          {workplace.isCurrent && (
                            <span className="px-2 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/30 rounded-full">
                              Current
                            </span>
                          )}
                        </div>

                        <p className="text-gray-600 dark:text-gray-400 mb-2">
                          {workplace.position}
                        </p>

                        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                          <CalendarIcon className="h-4 w-4" />
                          <span>
                            {formatDate(workplace.startDate)} - {
                              workplace.isCurrent ? 'Present' :
                                workplace.endDate ? formatDate(workplace.endDate) : 'Present'
                            }
                          </span>
                        </div>
                      </div>

                      {isEditable && (
                        <div className="flex items-center gap-2 ml-4">
                          <button
                            onClick={() => setEditingWorkplace(index)}
                            className="p-1 text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                            title="Edit workplace"
                          >
                            <PencilSquareIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => removeWorkplace(index)}
                            className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                            title="Remove workplace"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <BriefcaseIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No work history added yet</p>
                {isEditable && (
                  <p className="text-sm">Click "Add Workplace" to get started</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExperienceSection;