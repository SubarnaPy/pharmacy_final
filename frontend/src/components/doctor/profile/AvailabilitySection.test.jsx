import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AvailabilitySection from './AvailabilitySection';

// Mock the TimeSlotPicker component
jest.mock('../../forms/TimeSlotPicker', () => {
  return function MockTimeSlotPicker({ label, value, onChange, validation, required }) {
    return (
      <div data-testid="time-slot-picker">
        <label>{label}</label>
        <button 
          onClick={() => onChange({ 
            monday: { available: true, slots: [{ start: '09:00', end: '17:00' }] }
          })}
        >
          Add Monday Schedule
        </button>
        {required && <span>Required</span>}
        {JSON.stringify(value)}
      </div>
    );
  };
});

describe('AvailabilitySection', () => {
  const defaultProps = {
    workingHours: {},
    timeSlotDuration: 30,
    breakBetweenSlots: 10,
    maxAdvanceBookingDays: 30,
    onChange: jest.fn(),
    disabled: false
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders section title and description', () => {
      render(<AvailabilitySection {...defaultProps} />);
      
      expect(screen.getByText('Availability & Schedule')).toBeInTheDocument();
      expect(screen.getByText(/Set your working hours and availability preferences/)).toBeInTheDocument();
    });

    it('renders TimeSlotPicker component', () => {
      render(<AvailabilitySection {...defaultProps} />);
      
      expect(screen.getByTestId('time-slot-picker')).toBeInTheDocument();
      expect(screen.getByText('Weekly Schedule')).toBeInTheDocument();
    });

    it('renders advanced settings section', () => {
      render(<AvailabilitySection {...defaultProps} />);
      
      expect(screen.getByText('Advanced Settings')).toBeInTheDocument();
    });
  });

  describe('Working Hours Management', () => {
    it('calls onChange when working hours are updated', async () => {
      const user = userEvent.setup();
      const onChange = jest.fn();
      
      render(<AvailabilitySection {...defaultProps} onChange={onChange} />);
      
      const addButton = screen.getByText('Add Monday Schedule');
      await user.click(addButton);
      
      expect(onChange).toHaveBeenCalledWith({
        workingHours: { 
          monday: { available: true, slots: [{ start: '09:00', end: '17:00' }] }
        },
        timeSlotDuration: 30,
        breakBetweenSlots: 10,
        maxAdvanceBookingDays: 30
      });
    });
  });

  describe('Advanced Settings', () => {
    it('toggles advanced settings visibility', async () => {
      const user = userEvent.setup();
      
      render(<AvailabilitySection {...defaultProps} />);
      
      const advancedButton = screen.getByText('Advanced Settings');
      
      // Initially collapsed
      expect(screen.queryByText('Time Slot Duration')).not.toBeInTheDocument();
      
      // Expand
      await user.click(advancedButton);
      expect(screen.getByText('Time Slot Duration')).toBeInTheDocument();
      expect(screen.getByText('Break Between Slots')).toBeInTheDocument();
      expect(screen.getByText('Max Advance Booking')).toBeInTheDocument();
    });

    it('updates time slot duration', async () => {
      const user = userEvent.setup();
      const onChange = jest.fn();
      
      render(<AvailabilitySection {...defaultProps} onChange={onChange} />);
      
      // Expand advanced settings
      const advancedButton = screen.getByText('Advanced Settings');
      await user.click(advancedButton);
      
      // Find and update time slot duration input
      const durationInput = screen.getByDisplayValue('30');
      await user.clear(durationInput);
      await user.type(durationInput, '45');
      
      await waitFor(() => {
        expect(onChange).toHaveBeenCalledWith({
          workingHours: {},
          timeSlotDuration: 45,
          breakBetweenSlots: 10,
          maxAdvanceBookingDays: 30
        });
      });
    });

    it('updates break between slots', async () => {
      const user = userEvent.setup();
      const onChange = jest.fn();
      
      render(<AvailabilitySection {...defaultProps} onChange={onChange} />);
      
      // Expand advanced settings
      const advancedButton = screen.getByText('Advanced Settings');
      await user.click(advancedButton);
      
      // Find and update break duration input
      const breakInput = screen.getByDisplayValue('10');
      await user.clear(breakInput);
      await user.type(breakInput, '15');
      
      await waitFor(() => {
        expect(onChange).toHaveBeenCalledWith({
          workingHours: {},
          timeSlotDuration: 30,
          breakBetweenSlots: 15,
          maxAdvanceBookingDays: 30
        });
      });
    });

    it('updates max advance booking days', async () => {
      const user = userEvent.setup();
      const onChange = jest.fn();
      
      render(<AvailabilitySection {...defaultProps} onChange={onChange} />);
      
      // Expand advanced settings
      const advancedButton = screen.getByText('Advanced Settings');
      await user.click(advancedButton);
      
      // Find and update max advance booking input
      const bookingInput = screen.getByDisplayValue('30');
      await user.clear(bookingInput);
      await user.type(bookingInput, '60');
      
      await waitFor(() => {
        expect(onChange).toHaveBeenCalledWith({
          workingHours: {},
          timeSlotDuration: 30,
          breakBetweenSlots: 10,
          maxAdvanceBookingDays: 60
        });
      });
    });
  });

  describe('Validation', () => {
    it('shows error when no days are available', () => {
      render(<AvailabilitySection {...defaultProps} />);
      
      expect(screen.getByText('At least one day must be available for consultations')).toBeInTheDocument();
    });

    it('validates time slot duration range', () => {
      render(
        <AvailabilitySection 
          {...defaultProps} 
          timeSlotDuration={10}
        />
      );
      
      expect(screen.getByText('Time slot duration must be at least 15 minutes')).toBeInTheDocument();
    });

    it('validates break duration range', () => {
      render(
        <AvailabilitySection 
          {...defaultProps} 
          breakBetweenSlots={-5}
        />
      );
      
      expect(screen.getByText('Break duration cannot be negative')).toBeInTheDocument();
    });

    it('validates advance booking days range', () => {
      render(
        <AvailabilitySection 
          {...defaultProps} 
          maxAdvanceBookingDays={0}
        />
      );
      
      expect(screen.getByText('Advance booking must be at least 1 day')).toBeInTheDocument();
    });

    it('shows custom validation errors', () => {
      const validation = jest.fn().mockReturnValue({
        general: 'Custom validation error'
      });
      
      render(
        <AvailabilitySection 
          {...defaultProps} 
          validation={validation}
        />
      );
      
      expect(screen.getByText('Custom validation error')).toBeInTheDocument();
    });
  });

  describe('Schedule Summary', () => {
    it('shows schedule summary when days are available', () => {
      const workingHours = {
        monday: { 
          available: true, 
          slots: [{ start: '09:00', end: '17:00' }] 
        },
        tuesday: { 
          available: true, 
          slots: [{ start: '10:00', end: '16:00' }] 
        }
      };
      
      render(
        <AvailabilitySection 
          {...defaultProps} 
          workingHours={workingHours}
        />
      );
      
      expect(screen.getByText('Schedule Summary')).toBeInTheDocument();
      expect(screen.getByText('2 days/week')).toBeInTheDocument();
      expect(screen.getByText('30 min')).toBeInTheDocument();
    });

    it('calculates weekly hours correctly', () => {
      const workingHours = {
        monday: { 
          available: true, 
          slots: [{ start: '09:00', end: '17:00' }] // 8 hours
        }
      };
      
      render(
        <AvailabilitySection 
          {...defaultProps} 
          workingHours={workingHours}
        />
      );
      
      expect(screen.getByText('8.0 hours')).toBeInTheDocument();
    });

    it('does not show summary when no days are available', () => {
      render(<AvailabilitySection {...defaultProps} />);
      
      expect(screen.queryByText('Schedule Summary')).not.toBeInTheDocument();
    });
  });

  describe('Disabled State', () => {
    it('disables advanced settings button when disabled', () => {
      render(<AvailabilitySection {...defaultProps} disabled={true} />);
      
      const advancedButton = screen.getByText('Advanced Settings').closest('button');
      expect(advancedButton).toBeDisabled();
    });
  });

  describe('Settings Information', () => {
    it('shows settings information when advanced settings are expanded', async () => {
      const user = userEvent.setup();
      
      render(<AvailabilitySection {...defaultProps} />);
      
      const advancedButton = screen.getByText('Advanced Settings');
      await user.click(advancedButton);
      
      expect(screen.getByText('Time Slot Duration:')).toBeInTheDocument();
      expect(screen.getByText('How long each consultation appointment will be.')).toBeInTheDocument();
      expect(screen.getByText('Break Between Slots:')).toBeInTheDocument();
      expect(screen.getByText('Buffer time between appointments for preparation and notes.')).toBeInTheDocument();
      expect(screen.getByText('Max Advance Booking:')).toBeInTheDocument();
      expect(screen.getByText('How far in advance patients can book appointments.')).toBeInTheDocument();
    });
  });

  describe('Working Hours Validation', () => {
    it('validates excessive daily working hours', () => {
      const workingHours = {
        monday: { 
          available: true, 
          slots: [
            { start: '06:00', end: '12:00' }, // 6 hours
            { start: '13:00', end: '20:00' }  // 7 hours = 13 total
          ] 
        }
      };
      
      render(
        <AvailabilitySection 
          {...defaultProps} 
          workingHours={workingHours}
        />
      );
      
      expect(screen.getByText(/Working hours exceed 12 hours per day/)).toBeInTheDocument();
    });
  });

  describe('Slot Duration Validation', () => {
    it('validates slot duration against time slot duration setting', () => {
      const workingHours = {
        monday: { 
          available: true, 
          slots: [{ start: '09:00', end: '09:15' }] // 15 minutes
        }
      };
      
      render(
        <AvailabilitySection 
          {...defaultProps} 
          workingHours={workingHours}
          timeSlotDuration={30} // Requires 30 minutes
        />
      );
      
      expect(screen.getByText(/Slot 1 duration.*is less than time slot duration/)).toBeInTheDocument();
    });
  });
});