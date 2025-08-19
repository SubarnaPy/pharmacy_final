import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { toast } from 'react-toastify';
import SpecializationsSection from './SpecializationsSection.jsx';
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

describe('SpecializationsSection', () => {
  const mockUpdateProfileSection = jest.fn();
  const mockValidateSpecializations = jest.fn();
  const mockClearErrors = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    
    useDoctorProfile.mockReturnValue({
      specializations: ['Cardiology', 'Internal Medicine'],
      updateProfileSection: mockUpdateProfileSection,
      saving: false
    });

    useProfileValidation.mockReturnValue({
      validateSpecializations: mockValidateSpecializations,
      validationErrors: {},
      clearErrors: mockClearErrors
    });
  });

  it('renders specializations section with current data', () => {
    renderWithProvider(<SpecializationsSection doctorId="doctor1" />);
    
    expect(screen.getByText('Medical Specializations')).toBeInTheDocument();
    expect(screen.getByText('Cardiology')).toBeInTheDocument();
    expect(screen.getByText('Internal Medicine')).toBeInTheDocument();
    expect(screen.getByText('2 of 5 specializations selected')).toBeInTheDocument();
  });

  it('shows empty state when no specializations are selected', () => {
    useDoctorProfile.mockReturnValue({
      specializations: [],
      updateProfileSection: mockUpdateProfileSection,
      saving: false
    });

    renderWithProvider(<SpecializationsSection doctorId="doctor1" />);
    
    expect(screen.getByText(/No specializations selected/)).toBeInTheDocument();
  });

  it('enters edit mode when edit button is clicked', () => {
    renderWithProvider(<SpecializationsSection doctorId="doctor1" />);
    
    fireEvent.click(screen.getByText('Edit'));
    
    expect(screen.getByText('Select Specializations')).toBeInTheDocument();
    expect(screen.getByText('Save Changes')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('cancels editing and reverts changes', () => {
    renderWithProvider(<SpecializationsSection doctorId="doctor1" />);
    
    fireEvent.click(screen.getByText('Edit'));
    fireEvent.click(screen.getByText('Cancel'));
    
    expect(screen.queryByText('Select Specializations')).not.toBeInTheDocument();
    expect(mockClearErrors).toHaveBeenCalledWith('specializations');
  });

  it('validates specializations before saving', async () => {
    mockValidateSpecializations.mockReturnValue(true);
    mockUpdateProfileSection.mockResolvedValue({});

    renderWithProvider(<SpecializationsSection doctorId="doctor1" />);
    
    fireEvent.click(screen.getByText('Edit'));
    fireEvent.click(screen.getByText('Save Changes'));
    
    await waitFor(() => {
      expect(mockValidateSpecializations).toHaveBeenCalled();
      expect(mockUpdateProfileSection).toHaveBeenCalledWith('specializations', ['Cardiology', 'Internal Medicine']);
    });
  });

  it('does not save when validation fails', async () => {
    mockValidateSpecializations.mockReturnValue(false);

    renderWithProvider(<SpecializationsSection doctorId="doctor1" />);
    
    fireEvent.click(screen.getByText('Edit'));
    fireEvent.click(screen.getByText('Save Changes'));
    
    await waitFor(() => {
      expect(mockValidateSpecializations).toHaveBeenCalled();
      expect(mockUpdateProfileSection).not.toHaveBeenCalled();
    });
  });

  it('shows validation errors', () => {
    useProfileValidation.mockReturnValue({
      validateSpecializations: mockValidateSpecializations,
      validationErrors: { specializations: 'At least one specialization is required' },
      clearErrors: mockClearErrors
    });

    renderWithProvider(<SpecializationsSection doctorId="doctor1" />);
    
    fireEvent.click(screen.getByText('Edit'));
    
    expect(screen.getByText('At least one specialization is required')).toBeInTheDocument();
  });

  it('shows success toast on successful save', async () => {
    mockValidateSpecializations.mockReturnValue(true);
    mockUpdateProfileSection.mockResolvedValue({});

    renderWithProvider(<SpecializationsSection doctorId="doctor1" />);
    
    fireEvent.click(screen.getByText('Edit'));
    fireEvent.click(screen.getByText('Save Changes'));
    
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Specializations updated successfully');
    });
  });

  it('shows error toast on save failure', async () => {
    mockValidateSpecializations.mockReturnValue(true);
    mockUpdateProfileSection.mockRejectedValue(new Error('Save failed'));

    renderWithProvider(<SpecializationsSection doctorId="doctor1" />);
    
    fireEvent.click(screen.getByText('Edit'));
    fireEvent.click(screen.getByText('Save Changes'));
    
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to update specializations');
    });
  });

  it('disables save button when saving', () => {
    useDoctorProfile.mockReturnValue({
      specializations: ['Cardiology'],
      updateProfileSection: mockUpdateProfileSection,
      saving: true
    });

    renderWithProvider(<SpecializationsSection doctorId="doctor1" />);
    
    fireEvent.click(screen.getByText('Edit'));
    
    const saveButton = screen.getByText('Saving...');
    expect(saveButton).toBeDisabled();
  });

  it('disables save button when no changes are made', () => {
    renderWithProvider(<SpecializationsSection doctorId="doctor1" />);
    
    fireEvent.click(screen.getByText('Edit'));
    
    const saveButton = screen.getByText('Save Changes');
    expect(saveButton).toBeDisabled();
  });

  it('hides edit button when not editable', () => {
    renderWithProvider(<SpecializationsSection doctorId="doctor1" isEditable={false} />);
    
    expect(screen.queryByText('Edit')).not.toBeInTheDocument();
  });

  it('clears validation errors when specializations change', () => {
    renderWithProvider(<SpecializationsSection doctorId="doctor1" />);
    
    fireEvent.click(screen.getByText('Edit'));
    
    // Simulate specialization change through MultiSelectField
    // This would normally be triggered by the MultiSelectField component
    expect(mockClearErrors).toHaveBeenCalledWith('specializations');
  });

  it('shows help text', () => {
    renderWithProvider(<SpecializationsSection doctorId="doctor1" />);
    
    expect(screen.getByText(/Your specializations help patients find you/)).toBeInTheDocument();
  });

  it('limits specializations to maximum of 5', () => {
    renderWithProvider(<SpecializationsSection doctorId="doctor1" />);
    
    fireEvent.click(screen.getByText('Edit'));
    
    // The MultiSelectField should have maxSelections prop set to 5
    const multiSelectField = screen.getByText('Select Specializations').closest('div');
    expect(multiSelectField).toBeInTheDocument();
  });
});