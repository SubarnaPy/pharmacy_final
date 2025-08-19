import React, { useState, useEffect, useMemo } from 'react';
import { PlusIcon, XMarkIcon, CheckIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import useDoctorProfile from '../../../hooks/useDoctorProfile.js';
import useProfileValidation from '../../../hooks/useProfileValidation.js';
import { toast } from 'react-toastify';

const QualificationsSection = ({ doctorId, isEditable = true }) => {
  const { qualifications, updateProfileSection, saving } = useDoctorProfile(doctorId);
  const { validateQualifications, validationErrors, clearErrors } = useProfileValidation();
  
  const [isEditing, setIsEditing] = useState(false);
  const [localQualifications, setLocalQualifications] = useState([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [editingIndex, setEditingIndex] = useState(-1);
  const [showAddForm, setShowAddForm] = useState(false);

  // Initialize local state with current qualifications
  useEffect(() => {
    if (qualifications && Array.isArray(qualifications)) {
      setLocalQualifications([...qualifications]);
    }
  }, [qualifications]);

  // Check for changes - only compare when qualifications change from props
  useEffect(() => {
    const currentQuals = qualifications || [];
    const hasChanged = JSON.stringify(currentQuals) !== JSON.stringify(localQualifications);
    setHasChanges(hasChanged);
  }, [qualifications]); // Only depend on qualifications from props

  const handleEdit = () => {
    setIsEditing(true);
    clearErrors(['qualifications']);
  };

  const handleCancel = () => {
    setLocalQualifications([...(qualifications || [])]);
    setIsEditing(false);
    setHasChanges(false);
    setEditingIndex(-1);
    setShowAddForm(false);
    clearErrors(['qualifications']);
  };

  const handleSave = async () => {
    try {
      // Validate qualifications
      const isValid = validateQualifications(localQualifications);
      if (!isValid) {
        return;
      }

      // Update profile
      await updateProfileSection('qualifications', localQualifications);
      
      setIsEditing(false);
      setHasChanges(false);
      setEditingIndex(-1);
      setShowAddForm(false);
      toast.success('Qualifications updated successfully');
    } catch (error) {
      console.error('Failed to update qualifications:', error);
      toast.error('Failed to update qualifications');
    }
  };

  const handleAddQualification = () => {
    const newQualification = {
      degree: '',
      institution: '',
      year: new Date().getFullYear(),
      specialization: ''
    };
    
    setLocalQualifications([...localQualifications, newQualification]);
    setEditingIndex(localQualifications.length);
    setShowAddForm(true);
  };

  const handleEditQualification = (index) => {
    setEditingIndex(index);
  };

  const handleDeleteQualification = (index) => {
    const updatedQualifications = localQualifications.filter((_, i) => i !== index);
    setLocalQualifications(updatedQualifications);
    
    if (editingIndex === index) {
      setEditingIndex(-1);
    } else if (editingIndex > index) {
      setEditingIndex(editingIndex - 1);
    }
  };

  const handleQualificationChange = (index, field, value) => {
    const updatedQualifications = [...localQualifications];
    updatedQualifications[index] = {
      ...updatedQualifications[index],
      [field]: value
    };
    setLocalQualifications(updatedQualifications);
    clearErrors([`qualification_${index}`]);
  };

  const handleSaveQualification = (index) => {
    const qualification = localQualifications[index];
    
    // Basic validation for the specific qualification
    if (!qualification.degree.trim() || !qualification.institution.trim() || !qualification.year) {
      toast.error('Please fill in all required fields');
      return;
    }

    setEditingIndex(-1);
    setShowAddForm(false);
  };

  const handleCancelQualificationEdit = (index) => {
    if (showAddForm && index === localQualifications.length - 1) {
      // Remove the newly added qualification if canceling add
      setLocalQualifications(localQualifications.slice(0, -1));
      setShowAddForm(false);
    }
    setEditingIndex(-1);
  };

  const renderQualificationForm = (qualification, index) => (
    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Degree */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Degree <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={qualification.degree}
            onChange={(e) => handleQualificationChange(index, 'degree', e.target.value)}
            placeholder="e.g., MBBS, MD, PhD"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-gray-100"
          />
        </div>

        {/* Institution */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Institution <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={qualification.institution}
            onChange={(e) => handleQualificationChange(index, 'institution', e.target.value)}
            placeholder="e.g., Harvard Medical School"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-gray-100"
          />
        </div>

        {/* Year */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Year <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            value={qualification.year}
            onChange={(e) => handleQualificationChange(index, 'year', parseInt(e.target.value))}
            min="1950"
            max={new Date().getFullYear()}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-gray-100"
          />
        </div>

        {/* Specialization (optional) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Specialization
          </label>
          <input
            type="text"
            value={qualification.specialization || ''}
            onChange={(e) => handleQualificationChange(index, 'specialization', e.target.value)}
            placeholder="e.g., Cardiology, Surgery"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-gray-100"
          />
        </div>
      </div>

      {/* Validation Errors for this qualification */}
      {validationErrors[`qualification_${index}`] && (
        <div className="mt-3 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
          {Object.entries(validationErrors[`qualification_${index}`]).map(([field, error]) => (
            <div key={field}>{field}: {error}</div>
          ))}
        </div>
      )}

      {/* Form Actions */}
      <div className="flex items-center gap-2 mt-4">
        <button
          onClick={() => handleSaveQualification(index)}
          className="inline-flex items-center px-3 py-1.5 bg-emerald-600 text-white text-sm font-medium rounded-md hover:bg-emerald-700 transition-colors"
        >
          <CheckIcon className="h-4 w-4 mr-1" />
          Save
        </button>
        <button
          onClick={() => handleCancelQualificationEdit(index)}
          className="inline-flex items-center px-3 py-1.5 text-gray-600 dark:text-gray-400 text-sm font-medium hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
        >
          <XMarkIcon className="h-4 w-4 mr-1" />
          Cancel
        </button>
      </div>
    </div>
  );

  const renderQualificationDisplay = (qualification, index) => (
    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h4 className="font-semibold text-gray-900 dark:text-gray-100">
            {qualification.degree}
            {qualification.specialization && (
              <span className="text-emerald-600 dark:text-emerald-400 ml-2">
                ({qualification.specialization})
              </span>
            )}
          </h4>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {qualification.institution}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
            Graduated: {qualification.year}
          </p>
        </div>

        {isEditing && (
          <div className="flex items-center gap-2 ml-4">
            <button
              onClick={() => handleEditQualification(index)}
              className="p-1.5 text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
              title="Edit qualification"
            >
              <PencilIcon className="h-4 w-4" />
            </button>
            <button
              onClick={() => handleDeleteQualification(index)}
              className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
              title="Delete qualification"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Educational Qualifications
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Add your medical degrees and educational background
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
          {/* Qualifications List */}
          {localQualifications.map((qualification, index) => (
            <div key={index}>
              {editingIndex === index ? 
                renderQualificationForm(qualification, index) : 
                renderQualificationDisplay(qualification, index)
              }
            </div>
          ))}

          {/* Add New Qualification Button */}
          {!showAddForm && (
            <button
              onClick={handleAddQualification}
              className="w-full p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
            >
              <PlusIcon className="h-5 w-5 mx-auto mb-2" />
              Add New Qualification
            </button>
          )}

          {/* Global Validation Error */}
          {validationErrors.qualifications && (
            <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
              {validationErrors.qualifications}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
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
          {/* Display current qualifications */}
          {localQualifications && localQualifications.length > 0 ? (
            <div className="space-y-3">
              {localQualifications.map((qualification, index) => 
                <div key={`qualification-${index}-${qualification.degree}-${qualification.institution}`}>
                  {renderQualificationDisplay(qualification, index)}
                </div>
              )}
            </div>
          ) : (
            <div className="text-gray-500 dark:text-gray-400 italic text-center py-8">
              No qualifications added yet. Click "Edit" to add your educational background.
            </div>
          )}

          {/* Qualification count */}
          {localQualifications && localQualifications.length > 0 && (
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {localQualifications.length} qualification{localQualifications.length !== 1 ? 's' : ''} added
            </div>
          )}
        </div>
      )}

      {/* Help Text */}
      <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <p className="text-sm text-blue-800 dark:text-blue-400">
          <strong>Note:</strong> Include all relevant medical degrees and certifications. 
          This information helps establish your credibility and expertise with patients.
        </p>
      </div>
    </div>
  );
};

export default QualificationsSection;