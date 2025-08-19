import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ConsultationModesSection from './ConsultationModesSection';

describe('ConsultationModesSection', () => {
  const defaultProps = {
    consultationModes: {},
    onChange: jest.fn(),
    disabled: false
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders all consultation mode options', () => {
      render(<ConsultationModesSection {...defaultProps} />);
      
      expect(screen.getByText('Chat Consultation')).toBeInTheDocument();
      expect(screen.getByText('Phone Consultation')).toBeInTheDocument();
      expect(screen.getByText('Email Consultation')).toBeInTheDocument();
      expect(screen.getByText('Video Consultation')).toBeInTheDocument();
    });

    it('renders section title and description', () => {
      render(<ConsultationModesSection {...defaultProps} />);
      
      expect(screen.getByText('Consultation Modes')).toBeInTheDocument();
      expect(screen.getByText(/Configure the types of consultations you offer/)).toBeInTheDocument();
    });

    it('shows all modes as disabled by default', () => {
      render(<ConsultationModesSection {...defaultProps} />);
      
      const checkboxes = screen.getAllByRole('checkbox');
      checkboxes.forEach(checkbox => {
        expect(checkbox).not.toBeChecked();
      });
    });
  });

  describe('Mode Enabling/Disabling', () => {
    it('enables a consultation mode when checkbox is clicked', async () => {
      const user = userEvent.setup();
      const onChange = jest.fn();
      
      render(<ConsultationModesSection {...defaultProps} onChange={onChange} />);
      
      const chatCheckbox = screen.getByRole('checkbox', { name: /chat consultation/i });
      await user.click(chatCheckbox);
      
      expect(onChange).toHaveBeenCalledWith({
        chat: {
          available: true,
          fee: 50,
          duration: 30
        }
      });
    });

    it('disables a consultation mode when checkbox is unchecked', async () => {
      const user = userEvent.setup();
      const onChange = jest.fn();
      const consultationModes = {
        chat: { available: true, fee: 75, duration: 45 }
      };
      
      render(
        <ConsultationModesSection 
          {...defaultProps} 
          consultationModes={consultationModes}
          onChange={onChange} 
        />
      );
      
      const chatCheckbox = screen.getByRole('checkbox', { name: /chat consultation/i });
      await user.click(chatCheckbox);
      
      expect(onChange).toHaveBeenCalledWith({
        chat: {
          available: false,
          fee: 75,
          duration: 45
        }
      });
    });

    it('shows fee and duration when mode is enabled', () => {
      const consultationModes = {
        chat: { available: true, fee: 75, duration: 45 }
      };
      
      render(
        <ConsultationModesSection 
          {...defaultProps} 
          consultationModes={consultationModes}
        />
      );
      
      expect(screen.getByText('$75')).toBeInTheDocument();
      expect(screen.getByText('45 minutes')).toBeInTheDocument();
    });
  });

  describe('Mode Configuration', () => {
    it('expands mode configuration when clicked', async () => {
      const user = userEvent.setup();
      const consultationModes = {
        chat: { available: true, fee: 75, duration: 45 }
      };
      
      render(
        <ConsultationModesSection 
          {...defaultProps} 
          consultationModes={consultationModes}
        />
      );
      
      const chatCard = screen.getByText('Chat Consultation').closest('div').closest('div');
      await user.click(chatCard);
      
      expect(screen.getByText('Consultation Fee')).toBeInTheDocument();
      expect(screen.getByText('Session Duration')).toBeInTheDocument();
    });

    it('updates fee when changed', async () => {
      const user = userEvent.setup();
      const onChange = jest.fn();
      const consultationModes = {
        chat: { available: true, fee: 75, duration: 45 }
      };
      
      render(
        <ConsultationModesSection 
          {...defaultProps} 
          consultationModes={consultationModes}
          onChange={onChange}
        />
      );
      
      // Expand the chat mode
      const chatCard = screen.getByText('Chat Consultation').closest('div').closest('div');
      await user.click(chatCard);
      
      // Find and update the fee input
      const feeInput = screen.getByDisplayValue('75');
      fireEvent.change(feeInput, { target: { value: '100' } });
      
      expect(onChange).toHaveBeenCalledWith({
        chat: {
          available: true,
          fee: 100,
          duration: 45
        }
      });
    });

    it('updates duration when changed', async () => {
      const user = userEvent.setup();
      const onChange = jest.fn();
      const consultationModes = {
        video: { available: true, fee: 100, duration: 30 }
      };
      
      render(
        <ConsultationModesSection 
          {...defaultProps} 
          consultationModes={consultationModes}
          onChange={onChange}
        />
      );
      
      // Expand the video mode
      const videoCard = screen.getByText('Video Consultation').closest('div').closest('div');
      await user.click(videoCard);
      
      // Find and update the duration input
      const durationInput = screen.getByDisplayValue('30');
      fireEvent.change(durationInput, { target: { value: '60' } });
      
      expect(onChange).toHaveBeenCalledWith({
        video: {
          available: true,
          fee: 100,
          duration: 60
        }
      });
    });

    it('handles email consultation response time correctly', async () => {
      const user = userEvent.setup();
      const onChange = jest.fn();
      const consultationModes = {
        email: { available: true, fee: 50, responseTime: 24 }
      };
      
      render(
        <ConsultationModesSection 
          {...defaultProps} 
          consultationModes={consultationModes}
          onChange={onChange}
        />
      );
      
      // Expand the email mode
      const emailCard = screen.getByText('Email Consultation').closest('div').closest('div');
      await user.click(emailCard);
      
      expect(screen.getByText('Response Time')).toBeInTheDocument();
      expect(screen.getByDisplayValue('24')).toBeInTheDocument();
    });
  });

  describe('Validation', () => {
    it('shows error when no modes are enabled', () => {
      render(<ConsultationModesSection {...defaultProps} />);
      
      expect(screen.getByText('At least one consultation mode must be enabled')).toBeInTheDocument();
    });

    it('validates fee ranges', async () => {
      const user = userEvent.setup();
      const consultationModes = {
        chat: { available: true, fee: -10, duration: 30 }
      };
      
      render(
        <ConsultationModesSection 
          {...defaultProps} 
          consultationModes={consultationModes}
        />
      );
      
      // Should show validation error for negative fee
      expect(screen.getByText(/Fee must be a valid positive number/)).toBeInTheDocument();
    });

    it('validates duration ranges', () => {
      const consultationModes = {
        chat: { available: true, fee: 50, duration: 5 }
      };
      
      render(
        <ConsultationModesSection 
          {...defaultProps} 
          consultationModes={consultationModes}
        />
      );
      
      expect(screen.getByText(/Session Duration must be at least 15 minutes/)).toBeInTheDocument();
    });

    it('shows custom validation errors', () => {
      const validation = jest.fn().mockReturnValue({
        chat: ['Custom error message']
      });
      const consultationModes = {
        chat: { available: true, fee: 50, duration: 30 }
      };
      
      render(
        <ConsultationModesSection 
          {...defaultProps} 
          consultationModes={consultationModes}
          validation={validation}
        />
      );
      
      expect(screen.getByText('Custom error message')).toBeInTheDocument();
    });
  });

  describe('Summary Display', () => {
    it('shows summary when modes are enabled', () => {
      const consultationModes = {
        chat: { available: true, fee: 50, duration: 30 },
        video: { available: true, fee: 100, duration: 45 }
      };
      
      render(
        <ConsultationModesSection 
          {...defaultProps} 
          consultationModes={consultationModes}
        />
      );
      
      expect(screen.getByText('Summary')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument(); // Enabled modes count
      expect(screen.getByText('$75.00')).toBeInTheDocument(); // Average fee
      expect(screen.getByText('$50 - $100')).toBeInTheDocument(); // Fee range
    });

    it('does not show summary when no modes are enabled', () => {
      render(<ConsultationModesSection {...defaultProps} />);
      
      expect(screen.queryByText('Summary')).not.toBeInTheDocument();
    });
  });

  describe('Disabled State', () => {
    it('disables all inputs when disabled prop is true', () => {
      const consultationModes = {
        chat: { available: true, fee: 50, duration: 30 }
      };
      
      render(
        <ConsultationModesSection 
          {...defaultProps} 
          consultationModes={consultationModes}
          disabled={true}
        />
      );
      
      const checkboxes = screen.getAllByRole('checkbox');
      checkboxes.forEach(checkbox => {
        expect(checkbox).toBeDisabled();
      });
    });
  });

  describe('Mode-specific Information', () => {
    it('shows mode-specific information when expanded', async () => {
      const user = userEvent.setup();
      const consultationModes = {
        chat: { available: true, fee: 50, duration: 30 }
      };
      
      render(
        <ConsultationModesSection 
          {...defaultProps} 
          consultationModes={consultationModes}
        />
      );
      
      const chatCard = screen.getByText('Chat Consultation').closest('div').closest('div');
      await user.click(chatCard);
      
      expect(screen.getByText(/Patients will be able to send messages/)).toBeInTheDocument();
    });

    it('shows different information for different modes', async () => {
      const user = userEvent.setup();
      const consultationModes = {
        phone: { available: true, fee: 75, duration: 30 }
      };
      
      render(
        <ConsultationModesSection 
          {...defaultProps} 
          consultationModes={consultationModes}
        />
      );
      
      const phoneCard = screen.getByText('Phone Consultation').closest('div').closest('div');
      await user.click(phoneCard);
      
      expect(screen.getByText(/Phone consultations require your direct availability/)).toBeInTheDocument();
    });
  });
});