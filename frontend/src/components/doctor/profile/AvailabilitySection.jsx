import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  CalendarDaysIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';
import TimeSlotPicker from '../../forms/TimeSlotPicker';
import EditableField from '../../forms/EditableField';

const AvailabilitySection = ({
  workingHours: initialWorkingHours = {},
  onChange = () => { },
  disabled = false,
  className = ''
}) => {
  const [validationErrors, setValidationErrors] = useState({});
  const [workingHours, setWorkingHours] = useState(initialWorkingHours || {});

  const validateAvailability = useCallback(() => {
    const errors = {};
    const hasAvailableDay = Object.values(workingHours).some(day => day?.available);
    if (!hasAvailableDay) {
      errors.general = 'At least one day must be available for consultations';
    }
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }, [workingHours]);

  useEffect(() => {
    setWorkingHours(initialWorkingHours || {});
  }, []);

  useEffect(() => {
    validateAvailability();
  }, [workingHours, validateAvailability]);



  const availableDays = useMemo(() =>
    Object.values(workingHours || {}).filter(day => day?.available).length,
    [workingHours]
  );



  const handleWorkingHoursChange = useCallback((newWorkingHours) => {
    setWorkingHours(newWorkingHours);
    onChange({ workingHours: newWorkingHours });
  }, [onChange]);



  return (
    <div className={`availability-section ${className}`}>
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
          Availability & Schedule
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Set your working hours and availability preferences for patient consultations.
        </p>
      </div>

      {/* Working Hours Configuration */}
      <div className="mb-6">
        <TimeSlotPicker
          label="Weekly Schedule"
          value={workingHours}
          onChange={handleWorkingHoursChange}
          disabled={disabled}
          allowOverlaps={false}
          required={true}
        />
      </div>



      {availableDays > 0 && (
        <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
            <CalendarDaysIcon className="h-4 w-4" />
            Schedule Summary
          </h3>
          <div className="text-sm">
            <span className="text-gray-600 dark:text-gray-400">Available Days:</span>
            <div className="font-medium text-gray-900 dark:text-gray-100">
              {availableDays} days/week
            </div>
          </div>
        </div>
      )}

      {validationErrors.general && (
        <p className="mt-4 text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
          <ExclamationTriangleIcon className="h-4 w-4" />
          {validationErrors.general}
        </p>
      )}


    </div>
  );
};

export default AvailabilitySection;