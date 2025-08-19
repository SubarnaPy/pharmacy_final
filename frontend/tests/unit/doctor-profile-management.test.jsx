import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import '@testing-library/jest-dom';

// Import components
import DoctorProfileContainer from '../../src/components/doctor/profile/DoctorProfileContainer';
import PersonalInfoSection from '../../src/components/doctor/profile/PersonalInfoSection';
import MedicalLicenseSection from '../../src/components/doctor/profile/MedicalLicenseSection';
import SpecializationsSection from '../../src/components/doctor/profile/SpecializationsSection';
import QualificationsSection from '../../src/components/doctor/profile/QualificationsSection';
import ExperienceSection from '../../src/components/doctor/profile/ExperienceSection';
import ConsultationModesSection from '../../src/components/doctor/profile/ConsultationModesSection';
import AvailabilitySection from '../../src/components/doctor/profile/AvailabilitySection';
import NotificationPreferencesSection from '../../src/components/doctor/profile/NotificationPreferencesSection';
import ProfileStatsSection from '../../src/components/doctor/profile/ProfileStatsSection';

// Import form components
import EditableField from '../../src/components/forms/EditableField';
import MultiSelectField from '../../src/components/forms/MultiSelectField';
import TimeSlotPicker from '../../src/components/forms/TimeSlotPicker';
import DocumentUploader from '../../src/components/forms/DocumentUploader';

// Import hooks
import { useDoctorProfile } from '../../src/hooks/useDoctorProfile';
import { useProfileValidation } from '../../src/hooks/useProfileValidation';

// Import validation service
import { validatePersonalInfo, validateMedicalLicense, validateSpecializations } from '../../src/services/validationService';

// Mock Redux store
const createMockStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      doctorProfile: (state = {
        profile: {
          id: 'doctor123',
          personalInfo: {
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@example.com',
            phone: '+1234567890'
          },
          medicalLicense: {
            licenseNumber: 'MD123456',
            issuingAuthority: 'State Medical Board',
            issueDate: '2020-01-01',
            expiryDate: '2025-01-01'
          },
          specializations: ['Cardiology', 'Internal Medicine'],
          qualifications: [
            {
              degree: 'MD',
              institution: 'Harvard Medical School',
              year: 2018,
              specialization: 'Medicine'
            }
          ]
        },
        loading: false,
        error: null,
        ...initialState
      })
    }
  });
};

// Mock hooks
jest.mock('../../src/hooks/useDoctorProfile');
jest.mock('../../src/hooks/useProfileValidation');

describe('Doctor Profile Management - Unit Tests', () => {
  let mockStore;

  beforeEach(() => {
    mockStore = createMockStore();
    
    // Mock hook implementations
    useDoctorProfile.mockReturnValue({
      profile: mockStore.getState().doctorProfile.profile,
      loading: false,
      error: null,
      updateProfile: jest.fn(),
      saveProfile: jest.fn()
    });

    useProfileValidation.mockReturnValue({
      errors: {},
      validateField: jest.fn(),
      validateSection: jest.fn(),
      isValid: true
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('DoctorProfileContainer', () => {
    test('renders all profile sections', () => {
      render(
        <Provider store={mockStore}>
          <DoctorProfileContainer doctorId="doctor123" />
        </Provider>
      );

      expect(screen.getByText('Personal Information')).toBeInTheDocument();
      expect(screen.getByText('Medical License')).toBeInTheDocument();
      expect(screen.getByText('Specializations')).toBeInTheDocument();
      expect(screen.getByText('Qualifications')).toBeInTheDocument();
    });

    test('handles section navigation correctly', () => {
      render(
        <Provider store={mockStore}>
          <DoctorProfileContainer doctorId="doctor123" />
        </Provider>
      );

      const personalInfoTab = screen.getByText('Personal Information');
      fireEvent.click(personalInfoTab);
      
      expect(screen.getByDisplayValue('John')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Doe')).toBeInTheDocument();
    });

    test('shows unsaved changes warning', async () => {
      const mockUpdateProfile = jest.fn();
      useDoctorProfile.mockReturnValue({
        profile: mockStore.getState().doctorProfile.profile,
        loading: false,
        error: null,
        updateProfile: mockUpdateProfile,
        saveProfile: jest.fn(),
        hasUnsavedChanges: true
      });

      render(
        <Provider store={mockStore}>
          <DoctorProfileContainer doctorId="doctor123" />
        </Provider>
      );

      const qualificationsTab = screen.getByText('Qualifications');
      fireEvent.click(qualificationsTab);

      await waitFor(() => {
        expect(screen.getByText(/unsaved changes/i)).toBeInTheDocument();
      });
    });
  });

  describe('PersonalInfoSection', () => {
    const mockPersonalInfo = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      phone: '+1234567890',
      address: '123 Main St, City, State'
    };

    test('renders personal information fields', () => {
      render(
        <PersonalInfoSection 
          personalInfo={mockPersonalInfo}
          onUpdate={jest.fn()}
          isEditing={false}
        />
      );

      expect(screen.getByDisplayValue('John')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Doe')).toBeInTheDocument();
      expect(screen.getByDisplayValue('john.doe@example.com')).toBeInTheDocument();
    });

    test('enables editing mode when edit button is clicked', () => {
      const mockOnUpdate = jest.fn();
      render(
        <PersonalInfoSection 
          personalInfo={mockPersonalInfo}
          onUpdate={mockOnUpdate}
          isEditing={false}
        />
      );

      const editButton = screen.getByText('Edit');
      fireEvent.click(editButton);

      expect(screen.getByText('Save')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    test('validates email format', async () => {
      const mockOnUpdate = jest.fn();
      render(
        <PersonalInfoSection 
          personalInfo={mockPersonalInfo}
          onUpdate={mockOnUpdate}
          isEditing={true}
        />
      );

      const emailInput = screen.getByDisplayValue('john.doe@example.com');
      fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
      fireEvent.blur(emailInput);

      await waitFor(() => {
        expect(screen.getByText(/invalid email format/i)).toBeInTheDocument();
      });
    });

    test('validates phone number format', async () => {
      const mockOnUpdate = jest.fn();
      render(
        <PersonalInfoSection 
          personalInfo={mockPersonalInfo}
          onUpdate={mockOnUpdate}
          isEditing={true}
        />
      );

      const phoneInput = screen.getByDisplayValue('+1234567890');
      fireEvent.change(phoneInput, { target: { value: '123' } });
      fireEvent.blur(phoneInput);

      await waitFor(() => {
        expect(screen.getByText(/invalid phone number/i)).toBeInTheDocument();
      });
    });
  });

  describe('MedicalLicenseSection', () => {
    const mockLicenseInfo = {
      licenseNumber: 'MD123456',
      issuingAuthority: 'State Medical Board',
      issueDate: '2020-01-01',
      expiryDate: '2025-01-01',
      verificationStatus: 'verified'
    };

    test('renders license information', () => {
      render(
        <MedicalLicenseSection 
          licenseInfo={mockLicenseInfo}
          onUpdate={jest.fn()}
          isEditing={false}
        />
      );

      expect(screen.getByDisplayValue('MD123456')).toBeInTheDocument();
      expect(screen.getByDisplayValue('State Medical Board')).toBeInTheDocument();
    });

    test('shows expiry warning for licenses expiring soon', () => {
      const soonToExpireLicense = {
        ...mockLicenseInfo,
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 30 days from now
      };

      render(
        <MedicalLicenseSection 
          licenseInfo={soonToExpireLicense}
          onUpdate={jest.fn()}
          isEditing={false}
        />
      );

      expect(screen.getByText(/license expires soon/i)).toBeInTheDocument();
    });

    test('validates license expiry date', async () => {
      const mockOnUpdate = jest.fn();
      render(
        <MedicalLicenseSection 
          licenseInfo={mockLicenseInfo}
          onUpdate={mockOnUpdate}
          isEditing={true}
        />
      );

      const expiryInput = screen.getByDisplayValue('2025-01-01');
      fireEvent.change(expiryInput, { target: { value: '2020-01-01' } }); // Past date
      fireEvent.blur(expiryInput);

      await waitFor(() => {
        expect(screen.getByText(/expiry date cannot be in the past/i)).toBeInTheDocument();
      });
    });
  });

  describe('SpecializationsSection', () => {
    const mockSpecializations = ['Cardiology', 'Internal Medicine'];
    const availableSpecializations = [
      'Cardiology', 'Internal Medicine', 'Neurology', 'Orthopedics', 'Pediatrics'
    ];

    test('renders current specializations', () => {
      render(
        <SpecializationsSection 
          specializations={mockSpecializations}
          availableSpecializations={availableSpecializations}
          onUpdate={jest.fn()}
          isEditing={false}
        />
      );

      expect(screen.getByText('Cardiology')).toBeInTheDocument();
      expect(screen.getByText('Internal Medicine')).toBeInTheDocument();
    });

    test('allows adding new specializations', async () => {
      const mockOnUpdate = jest.fn();
      render(
        <SpecializationsSection 
          specializations={mockSpecializations}
          availableSpecializations={availableSpecializations}
          onUpdate={mockOnUpdate}
          isEditing={true}
        />
      );

      const addButton = screen.getByText('Add Specialization');
      fireEvent.click(addButton);

      const dropdown = screen.getByRole('combobox');
      fireEvent.change(dropdown, { target: { value: 'Neurology' } });
      
      const confirmButton = screen.getByText('Add');
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockOnUpdate).toHaveBeenCalledWith([...mockSpecializations, 'Neurology']);
      });
    });

    test('prevents duplicate specializations', async () => {
      const mockOnUpdate = jest.fn();
      render(
        <SpecializationsSection 
          specializations={mockSpecializations}
          availableSpecializations={availableSpecializations}
          onUpdate={mockOnUpdate}
          isEditing={true}
        />
      );

      const addButton = screen.getByText('Add Specialization');
      fireEvent.click(addButton);

      const dropdown = screen.getByRole('combobox');
      fireEvent.change(dropdown, { target: { value: 'Cardiology' } }); // Already exists
      
      const confirmButton = screen.getByText('Add');
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByText(/specialization already exists/i)).toBeInTheDocument();
      });
    });
  });

  describe('Form Components', () => {
    describe('EditableField', () => {
      test('renders in view mode by default', () => {
        render(
          <EditableField 
            value="Test Value"
            onChange={jest.fn()}
            label="Test Field"
          />
        );

        expect(screen.getByText('Test Value')).toBeInTheDocument();
        expect(screen.getByText('Edit')).toBeInTheDocument();
      });

      test('switches to edit mode when edit button is clicked', () => {
        render(
          <EditableField 
            value="Test Value"
            onChange={jest.fn()}
            label="Test Field"
          />
        );

        const editButton = screen.getByText('Edit');
        fireEvent.click(editButton);

        expect(screen.getByDisplayValue('Test Value')).toBeInTheDocument();
        expect(screen.getByText('Save')).toBeInTheDocument();
        expect(screen.getByText('Cancel')).toBeInTheDocument();
      });

      test('calls onChange when value is updated', () => {
        const mockOnChange = jest.fn();
        render(
          <EditableField 
            value="Test Value"
            onChange={mockOnChange}
            label="Test Field"
            isEditing={true}
          />
        );

        const input = screen.getByDisplayValue('Test Value');
        fireEvent.change(input, { target: { value: 'New Value' } });

        expect(mockOnChange).toHaveBeenCalledWith('New Value');
      });
    });

    describe('MultiSelectField', () => {
      const options = ['Option 1', 'Option 2', 'Option 3'];
      const selectedValues = ['Option 1'];

      test('renders selected values', () => {
        render(
          <MultiSelectField 
            options={options}
            selectedValues={selectedValues}
            onChange={jest.fn()}
            label="Multi Select"
          />
        );

        expect(screen.getByText('Option 1')).toBeInTheDocument();
      });

      test('allows selecting additional options', () => {
        const mockOnChange = jest.fn();
        render(
          <MultiSelectField 
            options={options}
            selectedValues={selectedValues}
            onChange={mockOnChange}
            label="Multi Select"
          />
        );

        const dropdown = screen.getByRole('combobox');
        fireEvent.change(dropdown, { target: { value: 'Option 2' } });

        expect(mockOnChange).toHaveBeenCalledWith(['Option 1', 'Option 2']);
      });
    });

    describe('TimeSlotPicker', () => {
      test('renders time slots', () => {
        const timeSlots = [
          { day: 'Monday', startTime: '09:00', endTime: '17:00' },
          { day: 'Tuesday', startTime: '09:00', endTime: '17:00' }
        ];

        render(
          <TimeSlotPicker 
            timeSlots={timeSlots}
            onChange={jest.fn()}
          />
        );

        expect(screen.getByText('Monday')).toBeInTheDocument();
        expect(screen.getByText('Tuesday')).toBeInTheDocument();
      });

      test('validates time slot conflicts', async () => {
        const mockOnChange = jest.fn();
        const timeSlots = [
          { day: 'Monday', startTime: '09:00', endTime: '17:00' }
        ];

        render(
          <TimeSlotPicker 
            timeSlots={timeSlots}
            onChange={mockOnChange}
          />
        );

        // Try to add overlapping time slot
        const addButton = screen.getByText('Add Time Slot');
        fireEvent.click(addButton);

        const daySelect = screen.getByLabelText('Day');
        fireEvent.change(daySelect, { target: { value: 'Monday' } });

        const startTimeInput = screen.getByLabelText('Start Time');
        fireEvent.change(startTimeInput, { target: { value: '10:00' } });

        const endTimeInput = screen.getByLabelText('End Time');
        fireEvent.change(endTimeInput, { target: { value: '12:00' } });

        const saveButton = screen.getByText('Save');
        fireEvent.click(saveButton);

        await waitFor(() => {
          expect(screen.getByText(/time slot conflicts/i)).toBeInTheDocument();
        });
      });
    });
  });

  describe('Validation Service', () => {
    describe('validatePersonalInfo', () => {
      test('validates required fields', () => {
        const invalidData = {
          firstName: '',
          lastName: 'Doe',
          email: 'john@example.com'
        };

        const result = validatePersonalInfo(invalidData);
        expect(result.isValid).toBe(false);
        expect(result.errors.firstName).toBe('First name is required');
      });

      test('validates email format', () => {
        const invalidData = {
          firstName: 'John',
          lastName: 'Doe',
          email: 'invalid-email'
        };

        const result = validatePersonalInfo(invalidData);
        expect(result.isValid).toBe(false);
        expect(result.errors.email).toBe('Invalid email format');
      });

      test('validates phone number format', () => {
        const invalidData = {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          phone: '123'
        };

        const result = validatePersonalInfo(invalidData);
        expect(result.isValid).toBe(false);
        expect(result.errors.phone).toBe('Invalid phone number format');
      });
    });

    describe('validateMedicalLicense', () => {
      test('validates license number format', () => {
        const invalidData = {
          licenseNumber: '',
          issuingAuthority: 'State Board',
          issueDate: '2020-01-01',
          expiryDate: '2025-01-01'
        };

        const result = validateMedicalLicense(invalidData);
        expect(result.isValid).toBe(false);
        expect(result.errors.licenseNumber).toBe('License number is required');
      });

      test('validates expiry date is in future', () => {
        const invalidData = {
          licenseNumber: 'MD123456',
          issuingAuthority: 'State Board',
          issueDate: '2020-01-01',
          expiryDate: '2020-01-01' // Past date
        };

        const result = validateMedicalLicense(invalidData);
        expect(result.isValid).toBe(false);
        expect(result.errors.expiryDate).toBe('Expiry date must be in the future');
      });
    });

    describe('validateSpecializations', () => {
      test('validates minimum specializations', () => {
        const result = validateSpecializations([]);
        expect(result.isValid).toBe(false);
        expect(result.errors.specializations).toBe('At least one specialization is required');
      });

      test('validates maximum specializations', () => {
        const tooManySpecializations = new Array(11).fill('Specialization');
        const result = validateSpecializations(tooManySpecializations);
        expect(result.isValid).toBe(false);
        expect(result.errors.specializations).toBe('Maximum 10 specializations allowed');
      });
    });
  });
});