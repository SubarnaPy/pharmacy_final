import React, { useState, useRef, useEffect } from 'react';
import { ChevronDownIcon, XMarkIcon, PlusIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

const MultiSelectField = ({
  value = [],
  onChange,
  options = [],
  label = '',
  placeholder = 'Select options...',
  searchPlaceholder = 'Search options...',
  disabled = false,
  maxSelections = null,
  allowCustom = false,
  customInputPlaceholder = 'Add custom option...',
  validation = null,
  className = '',
  optionRenderer = null,
  selectedRenderer = null,
  emptyMessage = 'No options available',
  searchable = true,
  creatable = false,
  required = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [customInput, setCustomInput] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [validationError, setValidationError] = useState('');
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setShowCustomInput(false);
        setCustomInput('');
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && searchable && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen, searchable]);

  const validateSelection = (newValue) => {
    if (required && (!newValue || newValue.length === 0)) {
      return 'At least one option must be selected';
    }

    if (maxSelections && newValue.length > maxSelections) {
      return `Maximum ${maxSelections} selections allowed`;
    }

    if (validation) {
      const result = validation(newValue);
      return result === true ? '' : result;
    }

    return '';
  };

  const handleToggleOption = (option) => {
    if (disabled) return;

    const isSelected = value.includes(option);
    let newValue;

    if (isSelected) {
      newValue = value.filter(v => v !== option);
    } else {
      if (maxSelections && value.length >= maxSelections) {
        setValidationError(`Maximum ${maxSelections} selections allowed`);
        return;
      }
      newValue = [...value, option];
    }

    const error = validateSelection(newValue);
    setValidationError(error);
    
    if (!error) {
      onChange(newValue);
    }
  };

  const handleRemoveOption = (option, e) => {
    e.stopPropagation();
    if (disabled) return;

    const newValue = value.filter(v => v !== option);
    const error = validateSelection(newValue);
    setValidationError(error);
    
    if (!error) {
      onChange(newValue);
    }
  };

  const handleAddCustom = () => {
    if (!customInput.trim() || value.includes(customInput.trim())) {
      setCustomInput('');
      return;
    }

    const newOption = customInput.trim();
    const newValue = [...value, newOption];
    
    const error = validateSelection(newValue);
    setValidationError(error);
    
    if (!error) {
      onChange(newValue);
      setCustomInput('');
      setShowCustomInput(false);
    }
  };

  const handleCustomInputKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddCustom();
    } else if (e.key === 'Escape') {
      setCustomInput('');
      setShowCustomInput(false);
    }
  };

  const filteredOptions = searchable && searchTerm
    ? options.filter(option => 
        option.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : options;

  const availableOptions = filteredOptions.filter(option => !value.includes(option));

  const renderSelectedOption = (option) => {
    if (selectedRenderer) {
      return selectedRenderer(option, () => handleRemoveOption(option));
    }

    return (
      <span
        key={option}
        className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-400 rounded-full text-sm"
      >
        {option}
        {!disabled && (
          <button
            onClick={(e) => handleRemoveOption(option, e)}
            className="hover:text-emerald-600 dark:hover:text-emerald-300"
            title="Remove"
          >
            <XMarkIcon className="h-3 w-3" />
          </button>
        )}
      </span>
    );
  };

  const renderOption = (option) => {
    if (optionRenderer) {
      return optionRenderer(option, value.includes(option));
    }

    const isSelected = value.includes(option);
    return (
      <div
        key={option}
        onClick={() => handleToggleOption(option)}
        className={`px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between ${
          isSelected ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400' : 'text-gray-900 dark:text-gray-100'
        }`}
      >
        <span>{option}</span>
        {isSelected && (
          <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
        )}
      </div>
    );
  };

  return (
    <div className={`multi-select-field ${className}`} ref={dropdownRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      {/* Selected Options Display */}
      <div className="mb-2">
        {value.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {value.map(renderSelectedOption)}
          </div>
        ) : (
          <div className="text-gray-400 italic text-sm">No options selected</div>
        )}
      </div>

      {/* Dropdown Trigger */}
      <div className="relative">
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={`w-full px-3 py-2 text-left border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 flex items-center justify-between ${
            disabled ? 'bg-gray-100 dark:bg-gray-800 cursor-not-allowed' : 'bg-white hover:bg-gray-50 dark:hover:bg-gray-600'
          } ${validationError ? 'border-red-500' : 'border-gray-300'}`}
        >
          <span className={value.length === 0 ? 'text-gray-400' : 'text-gray-900 dark:text-gray-100'}>
            {value.length === 0 ? placeholder : `${value.length} selected`}
          </span>
          <ChevronDownIcon className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-hidden">
            {/* Search Input */}
            {searchable && (
              <div className="p-2 border-b border-gray-200 dark:border-gray-700">
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder={searchPlaceholder}
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-gray-100"
                  />
                </div>
              </div>
            )}

            {/* Options List */}
            <div className="max-h-40 overflow-y-auto">
              {availableOptions.length > 0 ? (
                availableOptions.map(renderOption)
              ) : (
                <div className="px-3 py-2 text-gray-500 dark:text-gray-400 text-sm">
                  {searchTerm ? 'No matching options found' : emptyMessage}
                </div>
              )}
            </div>

            {/* Custom Input Section */}
            {(allowCustom || creatable) && (
              <div className="border-t border-gray-200 dark:border-gray-700 p-2">
                {showCustomInput ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={customInput}
                      onChange={(e) => setCustomInput(e.target.value)}
                      onKeyDown={handleCustomInputKeyDown}
                      placeholder={customInputPlaceholder}
                      className="flex-1 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-gray-100 text-sm"
                      autoFocus
                    />
                    <button
                      onClick={handleAddCustom}
                      className="px-2 py-1 bg-emerald-500 text-white rounded hover:bg-emerald-600 text-sm"
                    >
                      Add
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowCustomInput(true)}
                    className="w-full px-2 py-1 text-left text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded text-sm flex items-center gap-2"
                  >
                    <PlusIcon className="h-4 w-4" />
                    Add custom option
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Validation Error */}
      {validationError && (
        <p className="mt-1 text-sm text-red-600 dark:text-red-400">
          {validationError}
        </p>
      )}

      {/* Helper Text */}
      {maxSelections && (
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {value.length}/{maxSelections} selections
        </p>
      )}
    </div>
  );
};

export default MultiSelectField;