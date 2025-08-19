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

// Mock EditableField component with simpler implementation
jest.mock('../../forms/EditableField.jsx', () => {
  return function MockEditableField({ label, value, onSave, disabled }) {
    const [isEditing, setIsEditing] = React.useState(false);
    const [editValue, setEditValue] = React.useState(value || '');

    React.useEffect(() => {
      setEditValue(value || '');
    }, [value]);

    const handleSave = async () => {
      await onSave(editValue);
      setIsEditing(false);
    };

    if (disabled) {
      return React.createElement('div', {
        'data-testid': `editable-field-${label.toLowerCase().replace(/\s+/g, '-')}`
      }, [
        React.createElement('label', { key: 'label' }, label),
        React.createElement('span', { key: 'value' }, value || 'No value set')
      ]);
    }

    return React.createElement('div', {
      'data-testid': `editable-field-${label.toLowerCase().replace(/\s+/g, '-')}`
    }, [
      React.createElement('label', { key: 'label' }, label),
      isEditing ? React.createElement('div', { key: 'editing' }, [
        React.createElement('input', {
          key: 'input',
          value: editValue,
          onChange: (e) => setEditValue(e.target.value),
          'data-testid': `${label.toLowerCase().replace(/\s+/g, '-')}-input`
        }),
        React.createElement('button', { 
          key: 'save', 
          onClick: handleSave,
          'data-testid': `${label.toLowerCase().replace(/\s+/g, '-')}-save`
        }, 'Save'),
        React.createElement('button', { 
          key: 'cancel', 
          onClick: () => setIsEditing(false),
          'data-testid': `${label.toLowerCase().replace(/\s+/g, '-')}-cancel`
        }, 'Cancel')
      ]) : React.createElement('div', { key: 'display' }, [
        React.createElement('span', { key: 'value' }, value || 'No value set'),
        React.createElement('button', { 
          key: 'edit', 
          onClick: () => setIsEditing(true),
          'data-testid': `${label.toLowerCase().replace(/\s+/g, '-')}-edit`
        }, 'Edit')
      ])
    ]);
  };
});

describe('ExperienceSection - Core Functionality', () => {
  const mockProps = {
    doctorId: 'doctor123',
    experienceData: {
      totalYears: 5,
      currentPosition: 'Senior Physician',
      workplace: []
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
    test('renders experience section with title', () => {
      render(<ExperienceSection {...mockProps} />);
      
      expect(screen.getByText('Professional Experience')).toBeInTheDocument();
    });

    test('renders experience fields', () => {
      render(<ExperienceSection {...mockProps} />);
      
      expect(screen.getByTestId('editable-field-total-years-of-experience')).toBeInTheDocument();
      expect(screen.getByTestId('editable-field-current-position')).toBeInTheDocument();
    });

    test('displays bio content', () => {
      render(<ExperienceSection {...mockProps} />);
      
      expect(screen.getByText('Professional Bio')).toBeInTheDocument();
      expect(screen.getByText(mockProps.bio)).toBeInTheDocument();
    });

    test('shows work history section', () => {
      render(<ExperienceSection {...mockProps} />);
      
      expect(screen.getByText('Work History')).toBeInTheDocument();
      expect(screen.getByText('Add Workplace')).toBeInTheDocument();
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
    });

    test('shows character count', async () => {
      const user = userEvent.setup();
      render(<ExperienceSection {...mockProps} />);
      
      const editButton = screen.getByTitle('Edit Bio');
      await user.click(editButton);
      
      expect(screen.getByText(/\/1000/)).toBeInTheDocument();
    });

    test('updates bio successfully', async () => {
      const user = userEvent.setup();
      render(<ExperienceSection {...mockProps} />);
      
      const editButton = screen.getByTitle('Edit Bio');
      await user.click(editButton);
      
      const textarea = screen.getByRole('textbox');
      await user.clear(textarea);
      await user.type(textarea, 'Updated bio');
      
      const saveButton = screen.getByText('Save Bio');
      await user.click(saveButton);
      
      await waitFor(() => {
        expect(apiClient.put).toHaveBeenCalledWith('/doctors/doctor123/profile/section', {
          section: 'personal',
          data: { bio: 'Updated bio' }
        });
      });
      
      expect(toast.success).toHaveBeenCalledWith('Bio updated successfully');
    });
  });

  describe('Experience Fields', () => {
    test('displays current values', () => {
      render(<ExperienceSection {...mockProps} />);
      
      const totalYearsField = screen.getByTestId('editable-field-total-years-of-experience');
      const currentPositionField = screen.getByTestId('editable-field-current-position');
      
      expect(totalYearsField).toHaveTextContent('5');
      expect(currentPositionField).toHaveTextContent('Senior Physician');
    });

    test('allows editing total years', async () => {
      const user = userEvent.setup();
      render(<ExperienceSection {...mockProps} />);
      
      const editButton = screen.getByTestId('total-years-of-experience-edit');
      await user.click(editButton);
      
      const input = screen.getByTestId('total-years-of-experience-input');
      await user.clear(input);
      await user.type(input, '10');
      
      const saveButton = screen.getByTestId('total-years-of-experience-save');
      await user.click(saveButton);
      
      await waitFor(() => {
        expect(apiClient.put).toHaveBeenCalledWith('/doctors/doctor123/profile/section', {
          section: 'experience',
          data: { totalYears: 10 }
        });
      });
    });
  });

  describe('Workplace Management', () => {
    test('shows add workplace form', async () => {
      const user = userEvent.setup();
      render(<ExperienceSection {...mockProps} />);
      
      const addButton = screen.getByText('Add Workplace');
      await user.click(addButton);
      
      expect(screen.getByText('Add New Workplace')).toBeInTheDocument();
      expect(screen.getByLabelText('Hospital/Clinic Name *')).toBeInTheDocument();
      expect(screen.getByLabelText('Position *')).toBeInTheDocument();
    });

    test('validates required fields', async () => {
      const user = userEvent.setup();
      render(<ExperienceSection {...mockProps} />);
      
      const addButton = screen.getByText('Add Workplace');
      await user.click(addButton);
      
      const submitButton = screen.getByText('Add Workplace');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Hospital/Clinic name is required')).toBeInTheDocument();
        expect(screen.getByText('Position is required')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    test('handles API errors gracefully', async () => {
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
  });

  describe('Accessibility', () => {
    test('has proper labels for form fields', async () => {
      const user = userEvent.setup();
      render(<ExperienceSection {...mockProps} />);
      
      const addButton = screen.getByText('Add Workplace');
      await user.click(addButton);
      
      expect(screen.getByLabelText('Hospital/Clinic Name *')).toBeInTheDocument();
      expect(screen.getByLabelText('Position *')).toBeInTheDocument();
      expect(screen.getByLabelText('Start Date *')).toBeInTheDocument();
      expect(screen.getByLabelText('End Date')).toBeInTheDocument();
    });

    test('disables form when not editable', () => {
      const nonEditableProps = { ...mockProps, isEditable: false };
      render(<ExperienceSection {...nonEditableProps} />);
      
      expect(screen.queryByText('Add Workplace')).not.toBeInTheDocument();
      expect(screen.queryByTitle('Edit Bio')).not.toBeInTheDocument();
    });
  });
});