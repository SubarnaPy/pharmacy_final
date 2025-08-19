import React, { useState, useCallback } from 'react';
import { 
  ChatBubbleLeftRightIcon,
  PlusIcon,
  XMarkIcon,
  CheckIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-toastify';
import apiClient from '../../../api/apiClient.js';

const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ru', name: 'Russian' },
  { code: 'zh', name: 'Chinese (Mandarin)' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'ar', name: 'Arabic' },
  { code: 'hi', name: 'Hindi' },
  { code: 'bn', name: 'Bengali' },
  { code: 'ur', name: 'Urdu' },
  { code: 'ta', name: 'Tamil' },
  { code: 'te', name: 'Telugu' },
  { code: 'mr', name: 'Marathi' },
  { code: 'gu', name: 'Gujarati' },
  { code: 'kn', name: 'Kannada' },
  { code: 'ml', name: 'Malayalam' }
];

const LanguagePreferencesSection = ({ 
  doctorId, 
  languages = [], 
  onUpdate,
  isEditable = true 
}) => {
  const [selectedLanguages, setSelectedLanguages] = useState(languages || []);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showAddLanguage, setShowAddLanguage] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  // Get available languages (not already selected)
  const getAvailableLanguages = useCallback(() => {
    return SUPPORTED_LANGUAGES.filter(lang => 
      !selectedLanguages.includes(lang.code)
    );
  }, [selectedLanguages]);

  // Get language name by code
  const getLanguageName = useCallback((code) => {
    const language = SUPPORTED_LANGUAGES.find(lang => lang.code === code);
    return language ? language.name : code;
  }, []);

  // Validation
  const validateLanguages = useCallback((langs) => {
    const errors = {};
    
    if (!langs || langs.length === 0) {
      errors.languages = 'At least one language must be selected';
      return errors;
    }

    // Check for unsupported languages
    const supportedCodes = SUPPORTED_LANGUAGES.map(lang => lang.code);
    const unsupportedLanguages = langs.filter(code => !supportedCodes.includes(code));
    
    if (unsupportedLanguages.length > 0) {
      errors.languages = `Unsupported languages: ${unsupportedLanguages.join(', ')}`;
      return errors;
    }

    return {};
  }, []);

  // Add language
  const handleAddLanguage = useCallback((languageCode) => {
    if (!selectedLanguages.includes(languageCode)) {
      const newLanguages = [...selectedLanguages, languageCode];
      setSelectedLanguages(newLanguages);
      
      // Clear validation errors
      const errors = validateLanguages(newLanguages);
      setValidationErrors(errors);
    }
    setShowAddLanguage(false);
  }, [selectedLanguages, validateLanguages]);

  // Remove language
  const handleRemoveLanguage = useCallback((languageCode) => {
    const newLanguages = selectedLanguages.filter(code => code !== languageCode);
    setSelectedLanguages(newLanguages);
    
    // Validate after removal
    const errors = validateLanguages(newLanguages);
    setValidationErrors(errors);
  }, [selectedLanguages, validateLanguages]);

  // Save changes
  const handleSave = useCallback(async () => {
    const errors = validateLanguages(selectedLanguages);
    setValidationErrors(errors);

    if (Object.keys(errors).length > 0) {
      toast.error('Please fix validation errors before saving');
      return;
    }

    setIsSaving(true);
    try {
      await apiClient.put(`/doctors/${doctorId}/profile/section`, {
        section: 'languages',
        data: selectedLanguages
      });
      
      // Update parent component
      if (onUpdate) {
        onUpdate('languages', selectedLanguages);
      }

      setIsEditing(false);
      toast.success('Language preferences updated successfully');
    } catch (error) {
      console.error('Error updating languages:', error);
      toast.error(error.message || 'Failed to update language preferences');
    } finally {
      setIsSaving(false);
    }
  }, [doctorId, selectedLanguages, onUpdate, validateLanguages]);

  // Cancel editing
  const handleCancel = useCallback(() => {
    setSelectedLanguages(languages || []);
    setValidationErrors({});
    setIsEditing(false);
    setShowAddLanguage(false);
  }, [languages]);

  // Start editing
  const handleEdit = useCallback(() => {
    setIsEditing(true);
    setSelectedLanguages(languages || []);
    setValidationErrors({});
  }, [languages]);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <ChatBubbleLeftRightIcon className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Language Preferences</h3>
            <p className="text-sm text-gray-600">Manage languages you can communicate in</p>
          </div>
        </div>
        
        {isEditable && !isEditing && (
          <button
            onClick={handleEdit}
            className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
          >
            Edit Languages
          </button>
        )}
      </div>

      {/* Validation Errors */}
      {validationErrors.languages && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-center space-x-2">
          <ExclamationTriangleIcon className="h-5 w-5 text-red-500 flex-shrink-0" />
          <span className="text-sm text-red-700">{validationErrors.languages}</span>
        </div>
      )}

      {/* Languages Display */}
      <div className="space-y-4">
        {selectedLanguages.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <ChatBubbleLeftRightIcon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>No languages selected</p>
            {isEditing && (
              <button
                onClick={() => setShowAddLanguage(true)}
                className="mt-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                Add your first language
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {selectedLanguages.map((languageCode) => (
              <div
                key={languageCode}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
              >
                <span className="text-sm font-medium text-gray-900">
                  {getLanguageName(languageCode)}
                </span>
                {isEditing && (
                  <button
                    onClick={() => handleRemoveLanguage(languageCode)}
                    className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                    title="Remove language"
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Add Language Button */}
        {isEditing && selectedLanguages.length > 0 && (
          <button
            onClick={() => setShowAddLanguage(true)}
            className="flex items-center space-x-2 p-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors w-full"
          >
            <PlusIcon className="h-5 w-5 text-gray-400" />
            <span className="text-sm text-gray-600">Add another language</span>
          </button>
        )}

        {/* Add Language Dropdown */}
        {showAddLanguage && (
          <div className="p-4 bg-gray-50 rounded-lg border">
            <h4 className="text-sm font-medium text-gray-900 mb-3">Select a language to add:</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
              {getAvailableLanguages().map((language) => (
                <button
                  key={language.code}
                  onClick={() => handleAddLanguage(language.code)}
                  className="text-left p-2 text-sm text-gray-700 hover:bg-white hover:text-blue-600 rounded border hover:border-blue-300 transition-colors"
                >
                  {language.name}
                </button>
              ))}
            </div>
            <div className="flex justify-end mt-3">
              <button
                onClick={() => setShowAddLanguage(false)}
                className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
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
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
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

export default LanguagePreferencesSection;