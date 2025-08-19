import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'react-toastify';
import ExperienceSection from './ExperienceSection.jsx';
import apiClient from '../../../api/apiClient.js';

// Mock dependencies
jest.mock('../../../api/apiClient.js');
jest.mock('react-toastify', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock EditableField component
jest.mock('../../forms/EditableField.jsx', () => {
  const mockReact = require('react');
  return function MockEditableField({ label, value, onSave, validation, disabled, placeholder }) {
    const [isEditing, setIsEditing] = mockReact.useState(false);
    const [editValue, setEditValue] = mockReact.useState(value || '');

    const handleSave = async () => {
      if (validation) {
        const result = validation(editValue);
        if (result !== true) {
          return;
        }
      }
      await onSave(editValue);
      setIsEditing(false);
    };

    return mockReact.createElement('div', {
      'data-testid': `editable-field-${label.toLowerCase().replace(/\s+/g, '-')}`
    }, [
      mockReact.createElement('label', { key: 'label' }, label),
      isEditing ? mockReact.createElement('div', { key: 'editing' }, [
        mockReact.createElement('input', {
          key: 'input',
          value: editValue,
          onChange: (e) => setEditValue(e.target.value),
          placeholder: placeholder,
          disabled: disabled
        }),
        mockReact.createElement('button', { key: 'save', onClick: handleSave }, 'Save'),
        mockReact.createElement('button', { key: 'cancel', onClick: () => setIsEditing(false) }, 'Cancel')
      ]) : mockReact.createElement('div', { key: 'display' }, [
        mockReact.createElement('span', { key: 'value' }, value || 'No value set'),
        !disabled && mockReact.createElement('button', { key: 'edit', onClick: () => setIsEditing(true) }, 'Edit')
      ])
    ]);
  };
});

describe('ExperienceSection', () => {
  const mockProps = {
    doctorId: 'doctor123',
    experienceData: {
      totalYears: 5,
      currentPosition: 'Senior Physician',
      workplace: [
        {
          hospitalName: 'General Hospital',
          position: 'Resident Doctor',
          startDate: '2020-01-01',
          endDate: '2022-12-31',
          isCurrent: false
        },
        {
          hospitalName: 'City Medical Center',
          position: 'Senior Physician',
          startDate: '2023-01-01',
          endDate: '',
          isCurrent: true
        }
      ]
    },
    bio: 'Experienced physician with expertise in internal medicine.',
    onUpdate: jest.fn(),
    isEditable: true
  };

  beforeEach(() => {
    jest.clearAllMocks();
    apiClient.put.mockResolvedValue({
      data: { data: { success: true } }
    });
  });

  describe('Component Rendering', () => {
    test('renders experience section with all elements', () => {
      render(<ExperienceSection {...mockProps} />);
      
      expect(screen.getByText('Professional Experience')).toBeInTheDocument();
      expect(screen.getByTestId('editable-field-total-years-of-experience')).toBeInTheDocument();
      expect(screen.getByTestId('editable-field-current-position')).toBeInTheDocument();
      expect(screen.getByText('Professional Bio')).toBeInTheDocument();
      expect(screen.getByText('Work History')).toBeInTheDocument();
    });

    test('displays bio content correctly', () => {
      render(<ExperienceSection {...mockProps} />);
      
      expect(screen.getByText(mockProps.bio)).toBeInTheDocument();
    });

    test('displays workplace history correctly', () => {
      render(<ExperienceSection {...mockProps} />);
      
      expect(screen.getByText('General Hospital')).toBeInTheDocument();
      expect(screen.getByText('Resident Doctor')).toBeInTheDocument();
      expect(screen.getByText('City Medical Center')).toBeInTheDocument();
      expect(screen.getByText('Senior Physician')).toBeInTheDocument();
      expect(screen.getByText('Current')).toBeInTheDocument();
    });

    test('shows empty state when no workplace history exists', () => {
      const propsWithoutWorkplace = {
        ...mockProps,
        experienceData: { totalYears: 5, currentPosition: 'Doctor' }
      };
      
      render(<ExperienceSection {...propsWithoutWorkplace} />);
      
      expect(screen.getByText('No work history added yet')).toBeInTheDocument();
    });

    test('shows empty bio state correctly', () => {
      const propsWithoutBio = { ...mockProps, bio: '' };
      
      render(<ExperienceSection {...propsWithoutBio} />);
      
      expect(screen.getByText(/No professional bio added yet/)).toBeInTheDocument();
    });
  });

  describe('Bio Management', () => {
    test('allows editing bio', async () => {
      const user = userEvent.setup();
      render(<ExperienceSection {...mockProps} />);
      
      const editButton = screen.getByTitle('Edit Bio');
      await user.click(editButton);
      
      expect(screen.getByRole('textbox')).toBeInTheDocument();
      expect(screen.getByText('Save Bio')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    test('updates bio successfully', async () => {
      const user = userEvent.setup();
      render(<ExperienceSection {...mockProps} />);
      
      const editButton = screen.getByTitle('Edit Bio');
      await user.click(editButton);
      
      const textarea = screen.getByRole('textbox');
      await user.clear(textarea);
      await user.type(textarea, 'Updated bio content');
      
      const saveButton = screen.getByText('Save Bio');
      await user.click(saveButton);
      
      await waitFor(() => {
        expect(apiClient.put).toHaveBeenCalledWith('/doctors/doctor123/profile/section', {
          section: 'personal',
          data: { bio: 'Updated bio content' }
        });
      });
      
      expect(toast.success).toHaveBeenCalledWith('Bio updated successfully');
      expect(mockProps.onUpdate).toHaveBeenCalledWith('personal', { bio: 'Updated bio content' });
    });

    test('shows character count for bio', async () => {
      const user = userEvent.setup();
      render(<ExperienceSection {...mockProps} />);
      
      const editButton = screen.getByTitle('Edit Bio');
      await user.click(editButton);
      
      expect(screen.getByText(/\/1000/)).toBeInTheDocument();
    });

    test('prevents saving bio when character limit exceeded', async () => {
      const user = userEvent.setup();
      render(<ExperienceSection {...mockProps} />);
      
      const editButton = screen.getByTitle('Edit Bio');
      await user.click(editButton);
      
      const textarea = screen.getByRole('textbox');
      const longText = 'a'.repeat(1001);
      await user.clear(textarea);
      await user.type(textarea, longText);
      
      const saveButton = screen.getByText('Save Bio');
      expect(saveButton).toBeDisabled();
    });

    test('cancels bio editing', async () => {
      const user = userEvent.setup();
      render(<ExperienceSection {...mockProps} />);
      
      const editButton = screen.getByTitle('Edit Bio');
      await user.click(editButton);
      
      const textarea = screen.getByRole('textbox');
      await user.clear(textarea);
      await user.type(textarea, 'Changed text');
      
      const cancelButton = screen.getByText('Cancel');
      await user.click(cancelButton);
      
      expect(screen.getByText(mockProps.bio)).toBeInTheDocument();
    });
  });

  describe('Workplace Management', () => {
    test('shows add workplace button', () => {
      render(<ExperienceSection {...mockProps} />);
      
      expect(screen.getByText('Add Workplace')).toBeInTheDocument();
    });

    test('opens add workplace form', async () => {
      const user = userEvent.setup();
      render(<ExperienceSection {...mockProps} />);
      
      const addButton = screen.getByText('Add Workplace');
      await user.click(addButton);
      
      expect(screen.getByText('Add New Workplace')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter hospital or clinic name')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter your position')).toBeInTheDocument();
    });

    test('validates workplace form fields', async () => {
      const user = userEvent.setup();
      render(<ExperienceSection {...mockProps} />);
      
      const addButton = screen.getByText('Add Workplace');
      await user.click(addButton);
      
      const submitButton = screen.getByText('Add Workplace');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Hospital/Clinic name is required')).toBeInTheDocument();
        expect(screen.getByText('Position is required')).toBeInTheDocument();
        expect(screen.getByText('Start date is required')).toBeInTheDocument();
      });
    });

    test('adds new workplace successfully', async () => {
      const user = userEvent.setup();
      render(<ExperienceSection {...mockProps} />);
      
      const addButton = screen.getByText('Add Workplace');
      await user.click(addButton);
      
      await user.type(screen.getByPlaceholderText('Enter hospital or clinic name'), 'New Hospital');
      await user.type(screen.getByPlaceholderText('Enter your position'), 'Consultant');
      
      const startDateInput = screen.getByLabelText('Start Date *');
      await user.type(startDateInput, '2024-01-01');
      
      const submitButton = screen.getByText('Add Workplace');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(apiClient.put).toHaveBeenCalledWith('/doctors/doctor123/profile/section', {
          section: 'experience',
          data: {
            workplace: [
              ...mockProps.experienceData.workplace,
              {
                hospitalName: 'New Hospital',
                position: 'Consultant',
                startDate: '2024-01-01',
                endDate: '',
                isCurrent: false
              }
            ]
          }
        });
      });
    });

    test('handles current position checkbox', async () => {
      const user = userEvent.setup();
      render(<ExperienceSection {...mockProps} />);
      
      const addButton = screen.getByText('Add Workplace');
      await user.click(addButton);
      
      const currentCheckbox = screen.getByLabelText('This is my current position');
      await user.click(currentCheckbox);
      
      expect(currentCheckbox).toBeChecked();
      expect(screen.getByLabelText('End Date')).toBeDisabled();
    });

    test('allows editing existing workplace', async () => {
      const user = userEvent.setup();
      render(<ExperienceSection {...mockProps} />);
      
      const editButtons = screen.getAllByTitle('Edit');
      await user.click(editButtons[0]);
      
      expect(screen.getByDisplayValue('General Hospital')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Resident Doctor')).toBeInTheDocument();
    });

    test('removes workplace', async () => {
      const user = userEvent.setup();
      render(<ExperienceSection {...mockProps} />);
      
      const removeButtons = screen.getAllByTitle('Remove');
      await user.click(removeButtons[0]);
      
      await waitFor(() => {
        expect(apiClient.put).toHaveBeenCalledWith('/doctors/doctor123/profile/section', {
          section: 'experience',
          data: {
            workplace: [mockProps.experienceData.workplace[1]]
          }
        });
      });
      
      expect(toast.success).toHaveBeenCalledWith('Workplace removed successfully');
    });
  });

  describe('Experience Fields', () => {
    test('updates total years of experience', async () => {
      const user = userEvent.setup();
      render(<ExperienceSection {...mockProps} />);
      
      const editButton = screen.getByTestId('editable-field-total-years-of-experience').querySelector('button');
      await user.click(editButton);
      
      const input = screen.getByTestId('editable-field-total-years-of-experience').querySelector('input');
      await user.clear(input);
      await user.type(input, '10');
      
      const saveButton = screen.getByTestId('editable-field-total-years-of-experience').querySelector('button');
      await user.click(saveButton);
      
      await waitFor(() => {
        expect(apiClient.put).toHaveBeenCalledWith('/doctors/doctor123/profile/section', {
          section: 'experience',
          data: { totalYears: 10 }
        });
      });
    });

    test('updates current position', async () => {
      const user = userEvent.setup();
      render(<ExperienceSection {...mockProps} />);
      
      const editButton = screen.getByTestId('editable-field-current-position').querySelector('button');
      await user.click(editButton);
      
      const input = screen.getByTestId('editable-field-current-position').querySelector('input');
      await user.clear(input);
      await user.type(input, 'Chief Physician');
      
      const saveButton = screen.getByTestId('editable-field-current-position').querySelector('button');
      await user.click(saveButton);
      
      await waitFor(() => {
        expect(apiClient.put).toHaveBeenCalledWith('/doctors/doctor123/profile/section', {
          section: 'experience',
          data: { currentPosition: 'Chief Physician' }
        });
      });
    });
  });

  describe('Error Handling', () => {
    test('handles API errors for bio update', async () => {
      const user = userEvent.setup();
      apiClient.put.mockRejectedValueOnce(new Error('Network error'));
      
      render(<ExperienceSection {...mockProps} />);
      
      const editButton = screen.getByTitle('Edit Bio');
      await user.click(editButton);
      
      const saveButton = screen.getByText('Save Bio');
      await user.click(saveButton);
      
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to update bio');
      });
    });

    test('handles API errors for experience field updates', async () => {
      const user = userEvent.setup();
      apiClient.put.mockRejectedValueOnce({
        response: { data: { message: 'Validation failed' } }
      });
      
      render(<ExperienceSection {...mockProps} />);
      
      const editButton = screen.getByTestId('editable-field-total-years-of-experience').querySelector('button');
      await user.click(editButton);
      
      const saveButton = screen.getByTestId('editable-field-total-years-of-experience').querySelector('button');
      await user.click(saveButton);
      
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Validation failed');
      });
    });

    test('shows validation errors', async () => {
      const user = userEvent.setup();
      render(<ExperienceSection {...mockProps} />);
      
      const addButton = screen.getByText('Add Workplace');
      await user.click(addButton);
      
      const submitButton = screen.getByText('Add Workplace');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Please fix the following errors:')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility and UX', () => {
    test('disables form elements when not editable', () => {
      const nonEditableProps = { ...mockProps, isEditable: false };
      render(<ExperienceSection {...nonEditableProps} />);
      
      expect(screen.queryByText('Add Workplace')).not.toBeInTheDocument();
      expect(screen.queryByTitle('Edit Bio')).not.toBeInTheDocument();
      expect(screen.queryByTitle('Edit')).not.toBeInTheDocument();
    });

    test('shows loading state during bio save', async () => {
      const user = userEvent.setup();
      apiClient.put.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
      
      render(<ExperienceSection {...mockProps} />);
      
      const editButton = screen.getByTitle('Edit Bio');
      await user.click(editButton);
      
      const saveButton = screen.getByText('Save Bio');
      await user.click(saveButton);
      
      expect(screen.getByText('Saving...')).toBeInTheDocument();
    });

    test('formats dates correctly', () => {
      render(<ExperienceSection {...mockProps} />);
      
      expect(screen.getByText('Jan 2020 - Dec 2022')).toBeInTheDocument();
      expect(screen.getByText('Jan 2023 - Present')).toBeInTheDocument();
    });
  });
});