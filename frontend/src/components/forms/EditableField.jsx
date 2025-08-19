import React, { useState, useEffect, useRef } from 'react';
import { PencilIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';

const EditableField = ({
  value,
  onSave,
  onCancel,
  type = 'text',
  placeholder = '',
  label = '',
  validation = null,
  multiline = false,
  disabled = false,
  className = '',
  displayComponent = null,
  editComponent = null,
  showEditButton = true,
  autoFocus = true,
  maxLength = null,
  required = false
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value || '');
  const [validationError, setValidationError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    setEditValue(value || '');
  }, [value]);

  useEffect(() => {
    if (isEditing && autoFocus && inputRef.current) {
      inputRef.current.focus();
      if (type === 'text' || type === 'email' || type === 'tel') {
        inputRef.current.select();
      }
    }
  }, [isEditing, autoFocus, type]);

  const validateInput = (inputValue) => {
    if (required && (!inputValue || inputValue.trim() === '')) {
      return 'This field is required';
    }

    if (validation) {
      const result = validation(inputValue);
      return result === true ? '' : result;
    }

    // Built-in validations
    if (type === 'email' && inputValue) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(inputValue)) {
        return 'Please enter a valid email address';
      }
    }

    if (type === 'tel' && inputValue) {
      const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
      if (!phoneRegex.test(inputValue.replace(/[\s\-\(\)]/g, ''))) {
        return 'Please enter a valid phone number';
      }
    }

    if (maxLength && inputValue && inputValue.length > maxLength) {
      return `Maximum ${maxLength} characters allowed`;
    }

    return '';
  };

  const handleEdit = () => {
    if (disabled) return;
    setIsEditing(true);
    setValidationError('');
  };

  const handleSave = async () => {
    const error = validateInput(editValue);
    if (error) {
      setValidationError(error);
      return;
    }

    setIsLoading(true);
    try {
      await onSave(editValue);
      setIsEditing(false);
      setValidationError('');
    } catch (err) {
      setValidationError(err.message || 'Failed to save changes');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setEditValue(value || '');
    setValidationError('');
    setIsEditing(false);
    if (onCancel) {
      onCancel();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !multiline) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  const renderDisplayMode = () => {
    if (displayComponent) {
      return displayComponent(value);
    }

    return (
      <div className="group flex items-center justify-between">
        <div className="flex-1">
          {label && (
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {label}
            </label>
          )}
          <div className="text-gray-900 dark:text-gray-100">
            {value || <span className="text-gray-400 italic">No value set</span>}
          </div>
        </div>
        {showEditButton && !disabled && (
          <button
            onClick={handleEdit}
            className="opacity-0 group-hover:opacity-100 ml-2 p-1 text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all duration-200"
            title="Edit"
          >
            <PencilIcon className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  };

  const renderEditMode = () => {
    if (editComponent) {
      return editComponent(editValue, setEditValue, handleSave, handleCancel);
    }

    const inputProps = {
      ref: inputRef,
      value: editValue,
      onChange: (e) => setEditValue(e.target.value),
      onKeyDown: handleKeyDown,
      placeholder,
      disabled: isLoading,
      maxLength,
      className: `w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 ${
        validationError ? 'border-red-500' : 'border-gray-300'
      }`
    };

    return (
      <div className="space-y-2">
        {label && (
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {label}
          </label>
        )}
        <div className="flex items-start gap-2">
          <div className="flex-1">
            {multiline ? (
              <textarea
                {...inputProps}
                rows={3}
                className={`${inputProps.className} resize-none`}
              />
            ) : (
              <input
                {...inputProps}
                type={type}
              />
            )}
            {validationError && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {validationError}
              </p>
            )}
            {maxLength && (
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {editValue.length}/{maxLength} characters
              </p>
            )}
          </div>
          <div className="flex gap-1 mt-1">
            <button
              onClick={handleSave}
              disabled={isLoading}
              className="p-1 text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 disabled:opacity-50"
              title="Save"
            >
              <CheckIcon className="h-4 w-4" />
            </button>
            <button
              onClick={handleCancel}
              disabled={isLoading}
              className="p-1 text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 disabled:opacity-50"
              title="Cancel"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`editable-field ${className}`}>
      {isEditing ? renderEditMode() : renderDisplayMode()}
    </div>
  );
};

export default EditableField;