import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { toast } from 'react-toastify';
import QualificationsSection from './QualificationsSection.jsx';
import useDoctorProfile from '../../../hooks/useDoctorProfile.js';
import useProfileValidation from '../../../hooks/useProfileValidation.js';

// Mock the hooks
jest.mock('../../../hooks/useDoctorProfile.js');
jest.mock('../../../hooks/useProfileValidation.js');
jest.mock('react-toastify', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn()
  }
}));

// Mock store
const mockStore = configureStore({
  reducer: {
    auth: (state = { user: { _id: 'user1', role: 'doctor' } }) => state
  }
});

const renderWithProvider = (component) => {
  return render(
    <Provider store={mockStore}>
      {component}
    </Provider>
  );
};

describe('QualificationsSection', () => {
  const mockUpdateProfileSection = jest.fn();
  const mockValidateQualifications = jest.fn();
  const mockClearErrors = jest.fn();

  const mockQualifications = [
    {
      degree: 'MBBS',
      institution: 'Harvard Medical School',
      year: 2015,
      specialization: 'General Medicine'
    },
    {
      degree: 'MD',
      institution: 'Johns Hopkins University',
      year: 2018,
      specialization: 'Cardiology'
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    useDoctorProfile.mockReturnValue({
      qualifications: mockQualifications,
      updateProfileSection: mockUpdateProfileSection,
      saving: false
    });

    useProfileValidation.mockReturnValue({
      validateQualifications: mockValidateQualifications,
      validationErrors: {},
      clearErrors: mockClearErrors
    });
  });

  it('renders qualifications section with current data', () => {
    renderWithProvider(<QualificationsSection doctorId="doctor1" />);
    
    expect(screen.getByText('Educational Qualifications')).toBeInTheDocument();
    expect(screen.getByText('MBBS')).toBeInTheDocument();
    expect(screen.getByText('Harvard Medical School')).toBeInTheDocument();
    expect(screen.getByText('MD')).toBeInTheDocument();
    expect(screen.getByText('Johns Hopkins University')).toBeInTheDocument();
    expect(screen.getByText('2 qualifications added')).toBeInTheDocument();
  });

  it('shows empty state when no qualifications are added', () => {
    useDoctorProfile.mockReturnValue({
      qualifications: [],
      updateProfileSection: mockUpdateProfileSection,
      saving: false
    });

    renderWithProvider(<QualificationsSection doctorId="doctor1" />);
    
    expect(screen.getByText(/No qualifications added yet/)).toBeInTheDocument();
  });

  it('enters edit mode when edit button is clicked', () => {
    renderWithProvider(<QualificationsSection doctorId="doctor1" />);
    
    fireEvent.click(screen.getByText('Edit'));
    
    expect(screen.getByText('Add New Qualification')).toBeInTheDocument();
    expect(screen.getByText('Save Changes')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('shows add qualification form when add button is clicked', () => {
    renderWithProvider(<QualificationsSection doctorId="doctor1" />);
    
    fireEvent.click(screen.getByText('Edit'));
    fireEvent.click(screen.getByText('Add New Qualification'));
    
    expect(screen.getByLabelText(/Degree/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Institution/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Year/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Specialization/)).toBeInTheDocument();
  });

  it('allows editing existing qualifications', () => {
    renderWithProvider(<QualificationsSection doctorId="doctor1" />);
    
    fireEvent.click(screen.getByText('Edit'));
    
    const editButtons = screen.getAllByTitle('Edit qualification');
    fireEvent.click(editButtons[0]);
    
    expect(screen.getByDisplayValue('MBBS')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Harvard Medical School')).toBeInTheDocument();
  });

  it('allows deleting qualifications', () => {
    renderWithProvider(<QualificationsSection doctorId="doctor1" />);
    
    fireEvent.click(screen.getByText('Edit'));
    
    const deleteButtons = screen.getAllByTitle('Delete qualification');
    fireEvent.click(deleteButtons[0]);
    
    // Should remove the first qualification
    expect(screen.queryByText('MBBS')).not.toBeInTheDocument();
  });

  it('validates qualifications before saving', async () => {
    mockValidateQualifications.mockReturnValue(true);
    mockUpdateProfileSection.mockResolvedValue({});

    renderWithProvider(<QualificationsSection doctorId="doctor1" />);
    
    fireEvent.click(screen.getByText('Edit'));
    fireEvent.click(screen.getByText('Save Changes'));
    
    await waitFor(() => {
      expect(mockValidateQualifications).toHaveBeenCalled();
      expect(mockUpdateProfileSection).toHaveBeenCalledWith('qualifications', mockQualifications);
    });
  });

  it('does not save when validation fails', async () => {
    mockValidateQualifications.mockReturnValue(false);

    renderWithProvider(<QualificationsSection doctorId="doctor1" />);
    
    fireEvent.click(screen.getByText('Edit'));
    fireEvent.click(screen.getByText('Save Changes'));
    
    await waitFor(() => {
      expect(mockValidateQualifications).toHaveBeenCalled();
      expect(mockUpdateProfileSection).not.toHaveBeenCalled();
    });
  });

  it('shows validation errors', () => {
    useProfileValidation.mockReturnValue({
      validateQualifications: mockValidateQualifications,
      validationErrors: { 
        qualifications: 'At least one qualification is required',
        qualification_0: { degree: 'Degree is required' }
      },
      clearErrors: mockClearErrors
    });

    renderWithProvider(<QualificationsSection doctorId="doctor1" />);
    
    fireEvent.click(screen.getByText('Edit'));
    
    expect(screen.getByText('At least one qualification is required')).toBeInTheDocument();
  });

  it('validates individual qualification fields', () => {
    renderWithProvider(<QualificationsSection doctorId="doctor1" />);
    
    fireEvent.click(screen.getByText('Edit'));
    fireEvent.click(screen.getByText('Add New Qualification'));
    
    // Try to save without filling required fields
    const saveButton = screen.getByText('Save');
    fireEvent.click(saveButton);
    
    expect(toast.error).toHaveBeenCalledWith('Please fill in all required fields');
  });

  it('cancels editing and reverts changes', () => {
    renderWithProvider(<QualificationsSection doctorId="doctor1" />);
    
    fireEvent.click(screen.getByText('Edit'));
    fireEvent.click(screen.getByText('Cancel'));
    
    expect(screen.queryByText('Add New Qualification')).not.toBeInTheDocument();
    expect(mockClearErrors).toHaveBeenCalled();
  });

  it('shows success toast on successful save', async () => {
    mockValidateQualifications.mockReturnValue(true);
    mockUpdateProfileSection.mockResolvedValue({});

    renderWithProvider(<QualificationsSection doctorId="doctor1" />);
    
    fireEvent.click(screen.getByText('Edit'));
    fireEvent.click(screen.getByText('Save Changes'));
    
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Qualifications updated successfully');
    });
  });

  it('shows error toast on save failure', async () => {
    mockValidateQualifications.mockReturnValue(true);
    mockUpdateProfileSection.mockRejectedValue(new Error('Save failed'));

    renderWithProvider(<QualificationsSection doctorId="doctor1" />);
    
    fireEvent.click(screen.getByText('Edit'));
    fireEvent.click(screen.getByText('Save Changes'));
    
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to update qualifications');
    });
  });

  it('disables save button when saving', () => {
    useDoctorProfile.mockReturnValue({
      qualifications: mockQualifications,
      updateProfileSection: mockUpdateProfileSection,
      saving: true
    });

    renderWithProvider(<QualificationsSection doctorId="doctor1" />);
    
    fireEvent.click(screen.getByText('Edit'));
    
    const saveButton = screen.getByText('Saving...');
    expect(saveButton).toBeDisabled();
  });

  it('disables save button when no changes are made', () => {
    renderWithProvider(<QualificationsSection doctorId="doctor1" />);
    
    fireEvent.click(screen.getByText('Edit'));
    
    const saveButton = screen.getByText('Save Changes');
    expect(saveButton).toBeDisabled();
  });

  it('hides edit button when not editable', () => {
    renderWithProvider(<QualificationsSection doctorId="doctor1" isEditable={false} />);
    
    expect(screen.queryByText('Edit')).not.toBeInTheDocument();
  });

  it('shows help text', () => {
    renderWithProvider(<QualificationsSection doctorId="doctor1" />);
    
    expect(screen.getByText(/Include all relevant medical degrees/)).toBeInTheDocument();
  });

  it('handles qualification form input changes', () => {
    renderWithProvider(<QualificationsSection doctorId="doctor1" />);
    
    fireEvent.click(screen.getByText('Edit'));
    fireEvent.click(screen.getByText('Add New Qualification'));
    
    const degreeInput = screen.getByLabelText(/Degree/);
    fireEvent.change(degreeInput, { target: { value: 'PhD' } });
    
    expect(degreeInput.value).toBe('PhD');
  });

  it('cancels adding new qualification', () => {
    renderWithProvider(<QualificationsSection doctorId="doctor1" />);
    
    fireEvent.click(screen.getByText('Edit'));
    fireEvent.click(screen.getByText('Add New Qualification'));
    
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);
    
    // Should remove the form and the newly added qualification
    expect(screen.queryByLabelText(/Degree/)).not.toBeInTheDocument();
  });

  it('displays specialization in qualification badge', () => {
    renderWithProvider(<QualificationsSection doctorId="doctor1" />);
    
    expect(screen.getByText('(General Medicine)')).toBeInTheDocument();
    expect(screen.getByText('(Cardiology)')).toBeInTheDocument();
  });

  it('shows graduation year in qualification display', () => {
    renderWithProvider(<QualificationsSection doctorId="doctor1" />);
    
    expect(screen.getByText('Graduated: 2015')).toBeInTheDocument();
    expect(screen.getByText('Graduated: 2018')).toBeInTheDocument();
  });
});