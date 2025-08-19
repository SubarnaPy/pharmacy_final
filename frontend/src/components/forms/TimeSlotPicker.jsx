import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ClockIcon, PlusIcon, TrashIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

const TimeSlotPicker = ({
  value = {},
  onChange,
  label = 'Working Hours',
  disabled = false,
  validation = null,
  className = '',
  timeFormat = '24', // '12' or '24'
  slotDuration = 30, // minutes
  breakDuration = 15, // minutes
  minAdvanceBooking = 1, // hours
  maxAdvanceBooking = 168, // hours (1 week)
  allowOverlaps = false,
  required = false
}) => {
  const [validationErrors, setValidationErrors] = useState({});
  const [expandedDay, setExpandedDay] = useState(null);

  const daysOfWeek = [
    { key: 'monday', label: 'Monday' },
    { key: 'tuesday', label: 'Tuesday' },
    { key: 'wednesday', label: 'Wednesday' },
    { key: 'thursday', label: 'Thursday' },
    { key: 'friday', label: 'Friday' },
    { key: 'saturday', label: 'Saturday' },
    { key: 'sunday', label: 'Sunday' }
  ];

  const defaultDaySchedule = {
    available: false,
    slots: [],
    breaks: []
  };

  const defaultSlot = {
    start: '09:00',
    end: '17:00'
  };

  const defaultBreak = {
    start: '12:00',
    end: '13:00',
    label: 'Lunch Break'
  };

  // Memoize the validation function to prevent unnecessary re-renders
  const validateSchedule = useCallback((schedule) => {
    const errors = {};

    if (required) {
      const hasAnyAvailableDay = Object.values(schedule).some(day => day?.available);
      if (!hasAnyAvailableDay) {
        errors.general = 'At least one day must be available';
      }
    }

    Object.entries(schedule).forEach(([dayKey, dayData]) => {
      if (!dayData?.available) return;

      const dayErrors = [];

      // Validate slots
      if (!dayData.slots || dayData.slots.length === 0) {
        dayErrors.push('At least one time slot is required');
      } else {
        dayData.slots.forEach((slot, index) => {
          if (!slot.start || !slot.end) {
            dayErrors.push(`Slot ${index + 1}: Start and end times are required`);
          } else if (slot.start >= slot.end) {
            dayErrors.push(`Slot ${index + 1}: End time must be after start time`);
          }
        });

        // Check for overlapping slots
        if (!allowOverlaps) {
          for (let i = 0; i < dayData.slots.length; i++) {
            for (let j = i + 1; j < dayData.slots.length; j++) {
              const slot1 = dayData.slots[i];
              const slot2 = dayData.slots[j];
              if (timeOverlaps(slot1, slot2)) {
                dayErrors.push(`Slots ${i + 1} and ${j + 1} overlap`);
              }
            }
          }
        }
      }

      // Validate breaks
      if (dayData.breaks) {
        dayData.breaks.forEach((breakTime, index) => {
          if (breakTime.start && breakTime.end) {
            if (breakTime.start >= breakTime.end) {
              dayErrors.push(`Break ${index + 1}: End time must be after start time`);
            }
            
            // Check if break is within working hours
            const isWithinWorkingHours = dayData.slots.some(slot => 
              breakTime.start >= slot.start && breakTime.end <= slot.end
            );
            if (!isWithinWorkingHours) {
              dayErrors.push(`Break ${index + 1}: Must be within working hours`);
            }
          }
        });
      }

      if (dayErrors.length > 0) {
        errors[dayKey] = dayErrors;
      }
    });

    if (validation) {
      const customErrors = validation(schedule);
      if (customErrors && typeof customErrors === 'object') {
        Object.assign(errors, customErrors);
      }
    }

    setValidationErrors(prevErrors => {
      // Only update if errors actually changed to prevent infinite loops
      const errorKeys = Object.keys(errors);
      const prevErrorKeys = Object.keys(prevErrors);
      
      if (errorKeys.length !== prevErrorKeys.length) {
        return errors;
      }
      
      const hasChanged = errorKeys.some(key => {
        const currentErrors = errors[key];
        const prevErrors_key = prevErrors[key];
        
        if (!currentErrors && !prevErrors_key) return false;
        if (!currentErrors || !prevErrors_key) return true;
        
        if (Array.isArray(currentErrors) && Array.isArray(prevErrors_key)) {
          return currentErrors.length !== prevErrors_key.length || 
                 currentErrors.some((err, idx) => err !== prevErrors_key[idx]);
        }
        
        return currentErrors !== prevErrors_key;
      });
      
      return hasChanged ? errors : prevErrors;
    });
    return Object.keys(errors).length === 0;
  }, [required, allowOverlaps, validation]);

  // Create a stable string representation of the value for comparison
  const valueString = useMemo(() => {
    return JSON.stringify(value || {});
  }, [value]);

  // Use effect with stable dependency
  useEffect(() => {
    if (value && Object.keys(value).length > 0) {
      validateSchedule(value);
    }
  }, [valueString, validateSchedule]);

  const timeOverlaps = (slot1, slot2) => {
    return slot1.start < slot2.end && slot2.start < slot1.end;
  };

  const formatTime = (time) => {
    if (timeFormat === '12') {
      const [hours, minutes] = time.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      return `${displayHour}:${minutes} ${ampm}`;
    }
    return time;
  };

  const updateDaySchedule = (dayKey, updates) => {
    const currentDay = value[dayKey] || defaultDaySchedule;
    const updatedDay = {
      ...defaultDaySchedule,
      ...currentDay,
      ...updates
    };
    
    const newSchedule = {
      ...value,
      [dayKey]: updatedDay
    };
    onChange(newSchedule);
  };

  const toggleDayAvailability = (dayKey) => {
    const currentDay = value[dayKey] || defaultDaySchedule;
    const newAvailable = !currentDay.available;
    
    updateDaySchedule(dayKey, {
      available: newAvailable,
      slots: newAvailable && (!currentDay.slots || currentDay.slots.length === 0) ? [{ ...defaultSlot }] : currentDay.slots
    });
  };

  const addSlot = (dayKey) => {
    const currentDay = value[dayKey] || defaultDaySchedule;
    const newSlots = [...(currentDay.slots || []), { ...defaultSlot }];
    updateDaySchedule(dayKey, { slots: newSlots });
  };

  const updateSlot = (dayKey, slotIndex, updates) => {
    const currentDay = value[dayKey] || defaultDaySchedule;
    const newSlots = [...(currentDay.slots || [])];
    newSlots[slotIndex] = { ...newSlots[slotIndex], ...updates };
    updateDaySchedule(dayKey, { slots: newSlots });
  };

  const removeSlot = (dayKey, slotIndex) => {
    const currentDay = value[dayKey] || defaultDaySchedule;
    const newSlots = (currentDay.slots || []).filter((_, index) => index !== slotIndex);
    updateDaySchedule(dayKey, { slots: newSlots });
  };

  const addBreak = (dayKey) => {
    const currentDay = value[dayKey] || defaultDaySchedule;
    const newBreaks = [...(currentDay.breaks || []), { ...defaultBreak }];
    updateDaySchedule(dayKey, { breaks: newBreaks });
  };

  const updateBreak = (dayKey, breakIndex, updates) => {
    const currentDay = value[dayKey] || defaultDaySchedule;
    const newBreaks = [...(currentDay.breaks || [])];
    newBreaks[breakIndex] = { ...newBreaks[breakIndex], ...updates };
    updateDaySchedule(dayKey, { breaks: newBreaks });
  };

  const removeBreak = (dayKey, breakIndex) => {
    const currentDay = value[dayKey] || defaultDaySchedule;
    const newBreaks = (currentDay.breaks || []).filter((_, index) => index !== breakIndex);
    updateDaySchedule(dayKey, { breaks: newBreaks });
  };

  const copyToAllDays = (dayKey) => {
    const sourceDay = value[dayKey];
    if (!sourceDay) return;

    const newSchedule = { ...value };
    daysOfWeek.forEach(({ key }) => {
      if (key !== dayKey) {
        newSchedule[key] = {
          ...sourceDay,
          available: sourceDay.available
        };
      }
    });
    onChange(newSchedule);
  };

  const renderTimeInput = (time, onTimeChange, placeholder = '') => (
    <input
      type="time"
      value={time || ''}
      onChange={(e) => onTimeChange(e.target.value)}
      disabled={disabled}
      placeholder={placeholder}
      className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-gray-100 text-sm"
    />
  );

  const renderDaySchedule = (dayKey, dayData) => {
    const isExpanded = expandedDay === dayKey;
    const hasErrors = validationErrors[dayKey];

    return (
      <div key={dayKey} className="border border-gray-200 dark:border-gray-700 rounded-lg">
        <div 
          className={`p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
            dayData?.available ? 'bg-emerald-50 dark:bg-emerald-900/20' : ''
          }`}
          onClick={() => setExpandedDay(isExpanded ? null : dayKey)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={dayData?.available || false}
                onChange={(e) => {
                  e.stopPropagation();
                  toggleDayAvailability(dayKey);
                }}
                disabled={disabled}
                className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
              />
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {daysOfWeek.find(d => d.key === dayKey)?.label}
              </span>
              {hasErrors && (
                <ExclamationTriangleIcon className="h-4 w-4 text-red-500" />
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              {dayData?.available && dayData.slots?.length > 0 && (
                <span>
                  {dayData.slots.map(slot => `${formatTime(slot.start)}-${formatTime(slot.end)}`).join(', ')}
                </span>
              )}
              <ClockIcon className="h-4 w-4" />
            </div>
          </div>
        </div>

        {isExpanded && dayData?.available && (
          <div className="border-t border-gray-200 dark:border-gray-700 p-4 space-y-4">
            {/* Time Slots */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">Time Slots</h4>
                <div className="flex gap-2">
                  <button
                    onClick={() => addSlot(dayKey)}
                    disabled={disabled}
                    className="text-xs px-2 py-1 bg-emerald-500 text-white rounded hover:bg-emerald-600 disabled:opacity-50 flex items-center gap-1"
                  >
                    <PlusIcon className="h-3 w-3" />
                    Add Slot
                  </button>
                  <button
                    onClick={() => copyToAllDays(dayKey)}
                    disabled={disabled}
                    className="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                  >
                    Copy to All
                  </button>
                </div>
              </div>
              
              <div className="space-y-2">
                {(dayData.slots || []).map((slot, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700/50 rounded">
                    <span className="text-sm text-gray-600 dark:text-gray-400 w-12">From:</span>
                    {renderTimeInput(slot.start, (time) => updateSlot(dayKey, index, { start: time }))}
                    <span className="text-sm text-gray-600 dark:text-gray-400">To:</span>
                    {renderTimeInput(slot.end, (time) => updateSlot(dayKey, index, { end: time }))}
                    <button
                      onClick={() => removeSlot(dayKey, index)}
                      disabled={disabled || (dayData.slots || []).length <= 1}
                      className="p-1 text-red-500 hover:text-red-700 disabled:opacity-50"
                      title="Remove slot"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Breaks */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">Breaks</h4>
                <button
                  onClick={() => addBreak(dayKey)}
                  disabled={disabled}
                  className="text-xs px-2 py-1 bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-50 flex items-center gap-1"
                >
                  <PlusIcon className="h-3 w-3" />
                  Add Break
                </button>
              </div>
              
              <div className="space-y-2">
                {(dayData.breaks || []).map((breakTime, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-orange-50 dark:bg-orange-900/20 rounded">
                    <input
                      type="text"
                      value={breakTime.label || ''}
                      onChange={(e) => updateBreak(dayKey, index, { label: e.target.value })}
                      placeholder="Break name"
                      disabled={disabled}
                      className="flex-1 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-gray-100 text-sm"
                    />
                    {renderTimeInput(breakTime.start, (time) => updateBreak(dayKey, index, { start: time }))}
                    <span className="text-sm text-gray-600 dark:text-gray-400">to</span>
                    {renderTimeInput(breakTime.end, (time) => updateBreak(dayKey, index, { end: time }))}
                    <button
                      onClick={() => removeBreak(dayKey, index)}
                      disabled={disabled}
                      className="p-1 text-red-500 hover:text-red-700 disabled:opacity-50"
                      title="Remove break"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Day-specific errors */}
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
      </div>
    );
  };

  return (
    <div className={`time-slot-picker ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      <div className="space-y-2">
        {daysOfWeek.map(({ key }) => 
          renderDaySchedule(key, value[key])
        )}
      </div>

      {/* General validation errors */}
      {validationErrors.general && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
          <ExclamationTriangleIcon className="h-4 w-4" />
          {validationErrors.general}
        </p>
      )}

      {/* Configuration Summary */}
      <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-sm text-gray-600 dark:text-gray-400">
        <div className="grid grid-cols-2 gap-4">
          <div>Slot Duration: {slotDuration} minutes</div>
          <div>Break Duration: {breakDuration} minutes</div>
          <div>Min Advance Booking: {minAdvanceBooking} hours</div>
          <div>Max Advance Booking: {maxAdvanceBooking} hours</div>
        </div>
      </div>
    </div>
  );
};

export default TimeSlotPicker;