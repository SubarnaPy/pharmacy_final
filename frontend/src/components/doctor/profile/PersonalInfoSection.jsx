import React, { useState, useCallback } from 'react';
import { 
  UserIcon, 
  CameraIcon, 
  EnvelopeIcon, 
  PhoneIcon,
  MapPinIcon,
  CheckIcon,
  XMarkIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import EditableField from '../../forms/EditableField.jsx';
import ProfileErrorHandler from './ProfileErrorHandler.jsx';
import ProfileSaveStatus from './ProfileSaveStatus.jsx';
import useEnhancedProfileSave from '../../../hooks/useEnhancedProfileSave.js';
import apiClient from '../../../api/apiClient.js';

const PersonalInfoSection = ({ 
  doctorId, 
  personalInfo = {}, 
  onUpdate,
  isEditable = true 
}) => {
  const [profileImageFile, setProfileImageFile] = useState(null);
  const [profileImagePreview, setProfileImagePreview] = useState(personalInfo.profileImage || null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [sectionError, setSectionError] = useState(null);

  // Enhanced save functionality with error handling
  const { 
    saveSection, 
    debouncedSave, 
    getSaveStatus,
    isSaving 
  } = useEnhancedProfileSave(doctorId, 'personalInfo');

  // Validation functions
  const validateEmail = (email) => {
    if (!email || email.trim() === '') {
      return 'Email is required';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return 'Please enter a valid email address';
    }
    return true;
  };

  const validatePhone = (phone) => {
    if (!phone || phone.trim() === '') {
      return 'Phone number is required';
    }
    // Remove all non-digit characters for validation
    const cleanPhone = phone.replace(/[\s\-\(\)\+]/g, '');
    if (cleanPhone.length < 10 || cleanPhone.length > 15) {
      return 'Phone number must be between 10-15 digits';
    }
    const phoneRegex = /^[\+]?[1-9][\d]{9,14}$/;
    if (!phoneRegex.test(cleanPhone)) {
      return 'Please enter a valid phone number';
    }
    return true;
  };

  const validateName = (name) => {
    if (!name || name.trim() === '') {
      return 'Name is required';
    }
    if (name.trim().length < 2) {
      return 'Name must be at least 2 characters long';
    }
    if (name.trim().length > 50) {
      return 'Name must be less than 50 characters';
    }
    return true;
  };

  // Enhanced save function with error handling
  const updatePersonalField = async (field, value) => {
    try {
      setSectionError(null);
      
      const result = await saveSection({ [field]: value }, {
        showSuccessNotification: true,
        showErrorNotification: true
      });

      // Update parent component
      if (onUpdate) {
        onUpdate('personal', { [field]: value });
      }
      
      // Clear any validation errors for this field
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });

      return result;
    } catch (error) {
      setSectionError(error);
      throw error;
    }
  };

  // Debounced save for auto-save functionality
  const handleFieldChange = (field, value) => {
    // Update parent immediately for optimistic updates
    if (onUpdate) {
      onUpdate('personal', { [field]: value });
    }

    // Debounced save
    debouncedSave({ [field]: value }, 2000, {
      showSuccessNotification: false // Don't show notifications for auto-saves
    });
  };

  const handleProfileImageChange = useCallback((event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please select a valid image file (JPEG, PNG, or WebP)');
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('Image file size must be less than 5MB');
      return;
    }

    setProfileImageFile(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setProfileImagePreview(e.target.result);
    };
    reader.readAsDataURL(file);
  }, []);

  const uploadProfileImage = async () => {
    if (!profileImageFile) return;

    setIsUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('documents', profileImageFile);
      formData.append('documentType', 'profile-image');

      const response = await apiClient.post(`/doctors/${doctorId}/documents`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const uploadedImage = response.data.data.uploadedDocuments[0];
      
      // Update the profile with the new image URL
      await updatePersonalField('profileImage', uploadedImage.fileUrl);
      
      setProfileImageFile(null);
      toast.success('Profile image updated successfully');
    } catch (error) {
      console.error('Profile image upload failed:', error);
      toast.error('Failed to upload profile image');
      // Reset preview on error
      setProfileImagePreview(personalInfo.profileImage || null);
    } finally {
      setIsUploadingImage(false);
    }
  };

  const cancelImageUpload = () => {
    setProfileImageFile(null);
    setProfileImagePreview(personalInfo.profileImage || null);
  };

  return (
    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl p-6 border border-white/20 dark:border-gray-700/30 shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center">
          <UserIcon className="h-5 w-5 mr-2 text-emerald-500" />
          Personal Information
        </h3>
        
        {/* Save Status Indicator */}
        <ProfileSaveStatus 
          saveStatus={getSaveStatus()}
          sectionName="Personal Information"
          showDetails={false}
        />
      </div>

      {/* Error Handler */}
      {sectionError && (
        <div className="mb-6">
          <ProfileErrorHandler
            error={sectionError}
            onRetry={() => {
              setSectionError(null);
              // Retry the last operation if needed
            }}
            onDismiss={() => setSectionError(null)}
            sectionName="Personal Information"
            showOfflineStatus={true}
          />
        </div>
      )}

      <div className="space-y-6">
        {/* Profile Image Section */}
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <div className="w-24 h-24 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center overflow-hidden">
              {profileImagePreview ? (
                <img
                  src={profileImagePreview}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <UserIcon className="h-12 w-12 text-gray-400" />
              )}
            </div>
            
            {isEditable && (
              <label className="absolute bottom-0 right-0 w-8 h-8 bg-emerald-500 hover:bg-emerald-600 rounded-full flex items-center justify-center cursor-pointer transition-colors">
                <CameraIcon className="h-4 w-4 text-white" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleProfileImageChange}
                  className="hidden"
                  disabled={isUploadingImage}
                />
              </label>
            )}
          </div>

          {/* Image Upload Controls */}
          {profileImageFile && (
            <div className="flex items-center space-x-2">
              <button
                onClick={uploadProfileImage}
                disabled={isUploadingImage}
                className="px-3 py-1 bg-emerald-500 text-white text-sm rounded-lg hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {isUploadingImage ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                    Uploading...
                  </>
                ) : (
                  <>
                    <CheckIcon className="h-3 w-3 mr-1" />
                    Save Image
                  </>
                )}
              </button>
              <button
                onClick={cancelImageUpload}
                disabled={isUploadingImage}
                className="px-3 py-1 bg-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                <XMarkIcon className="h-3 w-3 mr-1" />
                Cancel
              </button>
            </div>
          )}
        </div>

        {/* Personal Information Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* First Name */}
          <EditableField
            label="First Name"
            value={personalInfo.firstName || ''}
            onSave={(value) => updatePersonalField('firstName', value)}
            validation={validateName}
            required={true}
            disabled={!isEditable}
            placeholder="Enter first name"
            className="space-y-2"
          />

          {/* Last Name */}
          <EditableField
            label="Last Name"
            value={personalInfo.lastName || ''}
            onSave={(value) => updatePersonalField('lastName', value)}
            validation={validateName}
            required={true}
            disabled={!isEditable}
            placeholder="Enter last name"
            className="space-y-2"
          />
        </div>

        {/* Email */}
        <EditableField
          label="Email Address"
          value={personalInfo.email || ''}
          onSave={(value) => updatePersonalField('email', value)}
          type="email"
          validation={validateEmail}
          required={true}
          disabled={!isEditable}
          placeholder="Enter email address"
          className="space-y-2"
          displayComponent={(value) => (
            <div className="group flex items-center justify-between">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email Address
                </label>
                <div className="flex items-center text-gray-900 dark:text-gray-100">
                  <EnvelopeIcon className="h-4 w-4 mr-2 text-gray-500" />
                  {value || <span className="text-gray-400 italic">No email set</span>}
                </div>
              </div>
            </div>
          )}
        />

        {/* Phone */}
        <EditableField
          label="Phone Number"
          value={personalInfo.phone || ''}
          onSave={(value) => updatePersonalField('phone', value)}
          type="tel"
          validation={validatePhone}
          required={true}
          disabled={!isEditable}
          placeholder="Enter phone number"
          className="space-y-2"
          displayComponent={(value) => (
            <div className="group flex items-center justify-between">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Phone Number
                </label>
                <div className="flex items-center text-gray-900 dark:text-gray-100">
                  <PhoneIcon className="h-4 w-4 mr-2 text-gray-500" />
                  {value || <span className="text-gray-400 italic">No phone number set</span>}
                </div>
              </div>
            </div>
          )}
        />

        {/* Address (Optional) */}
        <EditableField
          label="Address"
          value={personalInfo.address || ''}
          onSave={(value) => updatePersonalField('address', value)}
          multiline={true}
          disabled={!isEditable}
          placeholder="Enter your address"
          className="space-y-2"
          displayComponent={(value) => (
            <div className="group flex items-center justify-between">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Address
                </label>
                <div className="flex items-start text-gray-900 dark:text-gray-100">
                  <MapPinIcon className="h-4 w-4 mr-2 text-gray-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    {value ? (
                      <div className="whitespace-pre-wrap">{value}</div>
                    ) : (
                      <span className="text-gray-400 italic">No address set</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        />

        {/* Validation Errors Display */}
        {Object.keys(validationErrors).length > 0 && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex items-start">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">
                  Please fix the following errors:
                </h4>
                <ul className="text-sm text-red-700 dark:text-red-300 space-y-1">
                  {Object.entries(validationErrors).map(([field, error]) => (
                    <li key={field}>• {error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PersonalInfoSection;