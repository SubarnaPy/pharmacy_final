import React, { useState, useEffect } from 'react';
import { PlusIcon, XMarkIcon, CheckIcon } from '@heroicons/react/24/outline';
import MultiSelectField from '../../forms/MultiSelectField.jsx';
import useDoctorProfile from '../../../hooks/useDoctorProfile.js';
import useProfileValidation from '../../../hooks/useProfileValidation.js';
import { toast } from 'react-toastify';

const AVAILABLE_SPECIALIZATIONS = [
  'General Medicine', 'Cardiology', 'Neurology', 'Orthopedics', 'Pediatrics',
  'Gynecology', 'Dermatology', 'Psychiatry', 'Ophthalmology', 'ENT',
  'Radiology', 'Pathology', 'Anesthesiology', 'Emergency Medicine',
  'Internal Medicine', 'Surgery', 'Oncology', 'Endocrinology',
  'Gastroenterology', 'Nephrology', 'Pulmonology', 'Rheumatology',
  'Infectious Disease', 'Allergy & Immunology', 'Sports Medicine',
  'Pain Management', 'Rehabilitation', 'Preventive Medicine', 'Other'
];

const SpecializationsSection = ({ doctorId, isEditable = true }) => {
  const { specializations, updateProfileSection, saving } = useDoctorProfile(doctorId);
  const { validateSpecializations, validationErrors, clearErrors } = useProfileValidation();
  
  const [isEditing, setIsEditing] = useState(false);
  const [localSpecializations, setLocalSpecializations] = useState([]);
  const [hasChanges, setHasChanges] = useState(false);

  const areArraysEqualIgnoreOrder = (a = [], b = []) => {
    if (!Array.isArray(a) || !Array.isArray(b)) return false;
    if (a.length !== b.length) return false;
    const setA = new Set(a);
    for (const item of b) {
      if (!setA.has(item)) return false;
    }
    return true;
  };

  // Initialize/sync local state with current specializations, without causing loops
  useEffect(() => {
    if (Array.isArray(specializations)) {
      if (!areArraysEqualIgnoreOrder(localSpecializations, specializations)) {
        setLocalSpecializations([...specializations]);
      }
    }
  }, [specializations, localSpecializations]);

  // Check for changes
  useEffect(() => {
    const currentSpecs = Array.isArray(specializations) ? specializations : [];
    const changed = !areArraysEqualIgnoreOrder(currentSpecs, localSpecializations);
    if (changed !== hasChanges) {
      setHasChanges(changed);
    }
  }, [specializations, localSpecializations, hasChanges]);

  const handleEdit = () => {
    setIsEditing(true);
    clearErrors('specializations');
  };

  const handleCancel = () => {
    setLocalSpecializations([...(specializations || [])]);
    setIsEditing(false);
    setHasChanges(false);
    clearErrors('specializations');
  };

  const handleSave = async () => {
    try {
      // Validate specializations
      const isValid = validateSpecializations(localSpecializations);
      if (!isValid) {
        return;
      }

      // Update profile
      await updateProfileSection('specializations', localSpecializations);
      
      setIsEditing(false);
      setHasChanges(false);
      toast.success('Specializations updated successfully');
    } catch (error) {
      console.error('Failed to update specializations:', error);
      toast.error('Failed to update specializations');
    }
  };

  const handleSpecializationsChange = (newSpecializations) => {
    setLocalSpecializations(newSpecializations);
    clearErrors('specializations');
  };

  const validateSpecializationSelection = (selectedSpecs) => {
    if (!selectedSpecs || selectedSpecs.length === 0) {
      return 'At least one specialization is required';
    }
    
    if (selectedSpecs.length > 5) {
      return 'Maximum 5 specializations allowed';
    }

    // Check for duplicates
    const uniqueSpecs = [...new Set(selectedSpecs)];
    if (uniqueSpecs.length !== selectedSpecs.length) {
      return 'Duplicate specializations are not allowed';
    }

    return true;
  };

  const renderSpecializationBadge = (specialization) => (
    <span
      key={specialization}
      className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-700"
    >
      {specialization}
    </span>
  );

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Medical Specializations
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Select your areas of medical expertise (maximum 5)
          </p>
        </div>
        
        {isEditable && !isEditing && (
          <button
            onClick={handleEdit}
            className="px-4 py-2 text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors"
          >
            Edit
          </button>
        )}
      </div>

      {/* Content */}
      {isEditing ? (
        <div className="space-y-4">
          {/* Multi-select field for specializations */}
          <MultiSelectField
            label="Select Specializations"
            value={localSpecializations}
            onChange={handleSpecializationsChange}
            options={AVAILABLE_SPECIALIZATIONS}
            placeholder="Choose your medical specializations..."
            searchPlaceholder="Search specializations..."
            maxSelections={5}
            validation={validateSpecializationSelection}
            required={true}
            searchable={true}
            emptyMessage="No specializations found"
            className="w-full"
          />

          {/* Validation Error Display */}
          {validationErrors.specializations && (
            <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
              {validationErrors.specializations}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-4">
            <button
              onClick={handleSave}
              disabled={saving || !hasChanges}
              className="inline-flex items-center px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? (
                <>
                  <div className="animate-spin -ml-1 mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                  Saving...
                </>
              ) : (
                <>
                  <CheckIcon className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </button>
            
            <button
              onClick={handleCancel}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Display current specializations */}
          {localSpecializations && localSpecializations.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {localSpecializations.map(renderSpecializationBadge)}
            </div>
          ) : (
            <div className="text-gray-500 dark:text-gray-400 italic">
              No specializations selected. Click "Edit" to add your medical specializations.
            </div>
          )}

          {/* Specialization count */}
          {localSpecializations && localSpecializations.length > 0 && (
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {localSpecializations.length} of 5 specializations selected
            </div>
          )}
        </div>
      )}

      {/* Help Text */}
      <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <p className="text-sm text-blue-800 dark:text-blue-400">
          <strong>Note:</strong> Your specializations help patients find you when searching for specific medical expertise. 
          Choose the areas where you have the most experience and qualifications.
        </p>
      </div>
    </div>
  );
};

export default SpecializationsSection;