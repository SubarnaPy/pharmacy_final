import React, { useState, useEffect, useCallback } from 'react';
import { FieldValidation } from './ValidationDisplay';
import useProfileValidation from '../../hooks/useProfileValidation';

/**
 * ValidatedField - A wrapper component that adds validation to form fields
 */
const ValidatedField = ({
  field,
  value,
  onChange,
  onBlur,
  children,
  section = null,
  validateOnChange = true,
  validateOnBlur = true,
  showGuidance = true,
  className = '',
  ...props
}) => {
  const { validateField, getFieldStatus, getGuidanceMessage } = useProfileValidation();
  const [hasBeenTouched, setHasBeenTouched] = useState(false);
  const [isValidating, setIsValidating] = useState(false);

  // Get current validation status
  const status = getFieldStatus(field);
  const guidance = getGuidanceMessage(field);

  // Debounced validation function
  const debouncedValidate = useCallback(
    debounce((fieldName, fieldValue, sectionName) => {
      setIsValidating(true);
      validateField(fieldName, fieldValue, sectionName);
      setIsValidating(false);
    }, 300),
    [validateField]
  );

  // Handle field change
  const handleChange = useCallback((e) => {
    const newValue = e.target ? e.target.value : e;
    onChange?.(newValue);

    if (validateOnChange && hasBeenTouched) {
      debouncedValidate(field, newValue, section);
    }
  }, [onChange, validateOnChange, hasBeenTouched, debouncedValidate, field, section]);

  // Handle field blur
  const handleBlur = useCallback((e) => {
    setHasBeenTouched(true);
    onBlur?.(e);

    if (validateOnBlur) {
      const currentValue = e.target ? e.target.value : value;
      validateField(field, currentValue, section);
    }
  }, [onBlur, validateOnBlur, validateField, field, value, section]);

  // Validate on mount if field has value
  useEffect(() => {
    if (value && value !== '' && !hasBeenTouched) {
      validateField(field, value, section);
    }
  }, [field, value, section, validateField, hasBeenTouched]);

  // Clone children and add validation props
  const enhancedChildren = React.cloneElement(children, {
    value,
    onChange: handleChange,
    onBlur: handleBlur,
    'aria-invalid': status.type === 'error',
    'aria-describedby': status.message ? `${field}-validation` : undefined,
    className: `${children.props.className || ''} ${getFieldClassName(status.type)}`.trim(),
    ...props
  });

  return (
    <div className={`space-y-1 ${className}`}>
      {enhancedChildren}
      
      {/* Validation feedback */}
      {(hasBeenTouched || status.type === 'error') && (
        <div id={`${field}-validation`}>
          <FieldValidation
            field={field}
            status={status}
            guidance={showGuidance ? guidance : null}
            showGuidance={showGuidance}
          />
        </div>
      )}

      {/* Loading indicator for async validation */}
      {isValidating && (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
          <span>Validating...</span>
        </div>
      )}
    </div>
  );
};

/**
 * Get CSS classes based on validation status
 */
const getFieldClassName = (statusType) => {
  switch (statusType) {
    case 'error':
      return 'border-red-300 focus:border-red-500 focus:ring-red-500';
    case 'warning':
      return 'border-yellow-300 focus:border-yellow-500 focus:ring-yellow-500';
    case 'success':
      return 'border-green-300 focus:border-green-500 focus:ring-green-500';
    default:
      return '';
  }
};

/**
 * Debounce utility function
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * ValidatedInput - Pre-configured input field with validation
 */
export const ValidatedInput = ({
  field,
  label,
  type = 'text',
  placeholder,
  required = false,
  className = '',
  ...props
}) => {
  return (
    <ValidatedField field={field} className={className} {...props}>
      <div>
        {label && (
          <label htmlFor={field} className="block text-sm font-medium text-gray-700 mb-1">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <input
          id={field}
          name={field}
          type={type}
          placeholder={placeholder}
          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 sm:text-sm"
          {...(required && { required: true })}
        />
      </div>
    </ValidatedField>
  );
};

/**
 * ValidatedTextarea - Pre-configured textarea field with validation
 */
export const ValidatedTextarea = ({
  field,
  label,
  placeholder,
  rows = 4,
  maxLength,
  required = false,
  showCharCount = false,
  className = '',
  ...props
}) => {
  const [charCount, setCharCount] = useState(0);

  const handleChange = (value) => {
    setCharCount(value.length);
    props.onChange?.(value);
  };

  return (
    <ValidatedField field={field} className={className} {...props} onChange={handleChange}>
      <div>
        {label && (
          <div className="flex justify-between items-center mb-1">
            <label htmlFor={field} className="block text-sm font-medium text-gray-700">
              {label}
              {required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {showCharCount && maxLength && (
              <span className={`text-sm ${charCount > maxLength * 0.9 ? 'text-red-500' : 'text-gray-500'}`}>
                {charCount}/{maxLength}
              </span>
            )}
          </div>
        )}
        <textarea
          id={field}
          name={field}
          rows={rows}
          placeholder={placeholder}
          maxLength={maxLength}
          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 sm:text-sm resize-vertical"
          {...(required && { required: true })}
        />
      </div>
    </ValidatedField>
  );
};

/**
 * ValidatedSelect - Pre-configured select field with validation
 */
export const ValidatedSelect = ({
  field,
  label,
  options = [],
  placeholder = 'Select an option',
  required = false,
  className = '',
  ...props
}) => {
  return (
    <ValidatedField field={field} className={className} {...props}>
      <div>
        {label && (
          <label htmlFor={field} className="block text-sm font-medium text-gray-700 mb-1">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <select
          id={field}
          name={field}
          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 sm:text-sm"
          {...(required && { required: true })}
        >
          <option value="">{placeholder}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </ValidatedField>
  );
};

export default ValidatedField;