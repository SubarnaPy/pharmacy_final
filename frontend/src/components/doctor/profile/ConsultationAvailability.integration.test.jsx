import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ConsultationModesSection from './ConsultationModesSection';
import AvailabilitySection from './AvailabilitySection';

// Mock the TimeSlotPicker component for integration testing
jest.mock('../../forms/TimeSlotPicker', () => {
  return function MockTimeSlotPicker({ label, value, onChange, validation }) {
    const handleAddDay = (day) => {
      const newValue = {
        ...value,
        [day]: {
          available: true,
          slots: [{ start: '09:00', end: '17:00' }],
          breaks: []
        }
      };
      onChange(newValue);
    };

    return (
      <div data-testid="time-slot-picker">
        <label>{label}</label>
        <div>
          {['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].map(day => (
            <button 
              key={day}
              onClick={() => handleAddDay(day)}
              data-testid={`add-${day}`}
            >
              Add {day}
            </button>
          ))}
        </div>
        <div data-testid="schedule-display">
          {JSON.stringify(value)}
        </div>
      </div>
    );
  };
});

describe('Consultation Modes and Availability Integration', () => {
  describe('Combined Workflow', () => {
    it('allows setting up consultation modes and availability together', async () => {
      const user = userEvent.setup();
      const onConsultationChange = jest.fn();
      const onAvailabilityChange = jest.fn();

      const ConsultationAvailabilityContainer = () => {
        const [consultationModes, setCo