import React, { useState, useCallback } from 'react';
import { 
  BellIcon,
  EnvelopeIcon,
  DevicePhoneMobileIcon,
  ComputerDesktopIcon,
  CalendarIcon,
  CreditCardIcon,
  UserGroupIcon,
  CheckIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-toastify';
import apiClient from '../../../api/apiClient';

const NOTIFICATION_TYPES = [
  {
    key: 'email',
    label: 'Email Notifications',
    description: 'Receive notifications via email',
    icon: EnvelopeIcon
  },
  {
    key: 'sms',
    label: 'SMS Notifications',
    description: 'Receive notifications via text message',
    icon: DevicePhoneMobileIcon
  },
  {
    key: 'push',
    label: 'Push Notifications',
    description: 'Receive browser and mobile push notifications',
    icon: ComputerDesktopIcon
  }
];

const NOTIFICATION_CATEGORIES = [
  {
    key: 'appointmentReminders',
    label: 'Appointment Reminders',
    description: 'Get reminded about upcoming appointments',
    icon: CalendarIcon
  },
  {
    key: 'newBookings',
    label: 'New Bookings',
    description: 'Notifications when patients book appointments',
    icon: UserGroupIcon
  },
  {
    key: 'payments',
    label: 'Payment Notifications',
    description: 'Updates about payments and earnings',
    icon: CreditCardIcon
  },
  {
    key: 'profileUpdates',
    label: 'Profile Updates',
    description: 'Notifications about profile verification and changes',
    icon: BellIcon
  }
];

const NotificationPreferencesSection = ({ 
  doctorId, 
  notificationPreferences = {}, 
  onUpdate,
  isEditable = true 
}) => {
  const [preferences, setPreferences] = useState(notificationPreferences || {});
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  // Initialize default preferences if empty
  const initializePreferences = useCallback(() => {
    const defaultPreferences = {};
    
    NOTIFICATION_TYPES.forEach(type => {
      defaultPreferences[type.key] = {};
      NOTIFICATION_CATEGORIES.forEach(category => {
        // Use existing preference value or default to true only if no preferences exist at all
        if (preferences[type.key] && preferences[type.key].hasOwnProperty(category.key)) {
          defaultPreferences[type.key][category.key] = preferences[type.key][category.key];
        } else {
          defaultPreferences[type.key][category.key] = Object.keys(preferences).length === 0 ? true : false;
        }
      });
    });
    
    return defaultPreferences;
  }, [preferences]);

  // Validation
  const validatePreferences = useCallback((prefs) => {
    const errors = {};
    
    // Check if at least one notification method is enabled for critical categories
    const criticalCategories = ['appointmentReminders', 'newBookings'];
    
    criticalCategories.forEach(category => {
      const hasEnabledMethod = NOTIFICATION_TYPES.some(type => 
        prefs[type.key]?.[category] === true
      );
      
      if (!hasEnabledMethod) {
        errors[category] = `At least one notification method must be enabled for ${NOTIFICATION_CATEGORIES.find(cat => cat.key === category)?.label}`;
      }
    });

    return errors;
  }, []);

  // Handle preference change
  const handlePreferenceChange = useCallback((notificationType, category, enabled) => {
    const newPreferences = {
      ...preferences,
      [notificationType]: {
        ...preferences[notificationType],
        [category]: enabled
      }
    };
    
    setPreferences(newPreferences);
    
    // Validate changes
    const errors = validatePreferences(newPreferences);
    setValidationErrors(errors);
  }, [preferences, validatePreferences]);

  // Save changes
  const handleSave = useCallback(async () => {
    const errors = validatePreferences(preferences);
    setValidationErrors(errors);

    if (Object.keys(errors).length > 0) {
      toast.error('Please fix validation errors before saving');
      return;
    }

    setIsSaving(true);
    try {
      await apiClient.put(`/doctors/${doctorId}/profile/section`, {
        section: 'notifications',
        data: { notifications: preferences }
      });

      // Update parent component
      if (onUpdate) {
        onUpdate('notifications', preferences);
      }

      setIsEditing(false);
      toast.success('Notification preferences updated successfully');
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      toast.error(error.message || 'Failed to update notification preferences');
    } finally {
      setIsSaving(false);
    }
  }, [doctorId, preferences, onUpdate, validatePreferences]);

  // Cancel editing
  const handleCancel = useCallback(() => {
    setPreferences(notificationPreferences || {});
    setValidationErrors({});
    setIsEditing(false);
  }, [notificationPreferences]);

  // Start editing
  const handleEdit = useCallback(() => {
    setIsEditing(true);
    const initialPrefs = initializePreferences();
    setPreferences(initialPrefs);
    
    // Validate initial preferences
    const errors = validatePreferences(initialPrefs);
    setValidationErrors(errors);
  }, [initializePreferences, validatePreferences]);

  const currentPreferences = isEditing ? preferences : initializePreferences();

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <BellIcon className="h-6 w-6 text-purple-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Notification Preferences</h3>
            <p className="text-sm text-gray-600">Control how and when you receive notifications</p>
          </div>
        </div>
        
        {isEditable && !isEditing && (
          <button
            onClick={handleEdit}
            className="px-4 py-2 text-sm font-medium text-purple-600 bg-purple-50 rounded-md hover:bg-purple-100 transition-colors"
          >
            Edit Preferences
          </button>
        )}
      </div>

      {/* Validation Errors */}
      {Object.keys(validationErrors).length > 0 && (
        <div className="mb-4 space-y-2">
          {Object.entries(validationErrors).map(([key, error]) => (
            <div key={key} className="p-3 bg-red-50 border border-red-200 rounded-md flex items-center space-x-2">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-500 flex-shrink-0" />
              <span className="text-sm text-red-700">{error}</span>
            </div>
          ))}
        </div>
      )}

      {/* Notification Matrix */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 font-medium text-gray-900">Notification Type</th>
              {NOTIFICATION_TYPES.map(type => {
                const Icon = type.icon;
                return (
                  <th key={type.key} className="text-center py-3 px-4 font-medium text-gray-900">
                    <div className="flex flex-col items-center space-y-1">
                      <Icon className="h-5 w-5 text-gray-600" />
                      <span className="text-xs">{type.label.split(' ')[0]}</span>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {NOTIFICATION_CATEGORIES.map(category => {
              const Icon = category.icon;
              const hasError = validationErrors[category.key];
              
              return (
                <tr key={category.key} className={hasError ? 'bg-red-50' : 'hover:bg-gray-50'}>
                  <td className="py-4 px-4">
                    <div className="flex items-center space-x-3">
                      <Icon className={`h-5 w-5 ${hasError ? 'text-red-500' : 'text-gray-500'}`} />
                      <div>
                        <div className={`font-medium ${hasError ? 'text-red-900' : 'text-gray-900'}`}>
                          {category.label}
                        </div>
                        <div className={`text-sm ${hasError ? 'text-red-700' : 'text-gray-600'}`}>
                          {category.description}
                        </div>
                      </div>
                    </div>
                  </td>
                  {NOTIFICATION_TYPES.map(type => (
                    <td key={`${category.key}-${type.key}`} className="py-4 px-4 text-center">
                      <label className="inline-flex items-center">
                        <input
                          type="checkbox"
                          checked={currentPreferences[type.key]?.[category.key] || false}
                          onChange={(e) => isEditing && handlePreferenceChange(type.key, category.key, e.target.checked)}
                          disabled={!isEditing}
                          className="form-checkbox h-5 w-5 text-purple-600 rounded focus:ring-purple-500 focus:ring-offset-0 disabled:opacity-50"
                        />
                      </label>
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="text-sm font-medium text-gray-900 mb-3">Notification Methods</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {NOTIFICATION_TYPES.map(type => {
            const Icon = type.icon;
            return (
              <div key={type.key} className="flex items-center space-x-2">
                <Icon className="h-4 w-4 text-gray-500" />
                <div>
                  <div className="text-sm font-medium text-gray-900">{type.label}</div>
                  <div className="text-xs text-gray-600">{type.description}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Action Buttons */}
      {isEditing && (
        <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
          <button
            onClick={handleCancel}
            disabled={isSaving}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || Object.keys(validationErrors).length > 0}
            className="px-4 py-2 text-sm font-medium text-white bg-purple-600 border border-transparent rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Saving...</span>
              </>
            ) : (
              <>
                <CheckIcon className="h-4 w-4" />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default NotificationPreferencesSection;