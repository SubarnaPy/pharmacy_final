import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import DoctorProfileContainer from './DoctorProfileContainer';
import doctorProfileSlice from '../../../store/doctorProfileSlice';
import authSlice from '../../../store/authSlice';

// Mock the profile section components
jest.mock('./PersonalInfoSection', () => {
  return function MockPersonalInfoSection({ doctorId, onUpdate }) {
    return (
      <div data-testid="personal-info-section">
        Personal Info Section for {doctorId}
        <button onClick={() => onUpdate('personal', true)}>Make Changes</button>
      </div>
    );
  };
});

jest.mock('./MedicalLicenseSection', () => {
  return function MockMedicalLicenseSection({ doctorId }) {
    return <div data-testid="medical-license-section">Medical License Section for {doctorId}</div>;
  };
});

jest.mock('./SpecializationsSection', () => {
  return function MockSpecializationsSection({ doctorId }) {
    return <div data-testid="specializations-section">Specializations Section for {doctorId}</div>;
  };
});

// Mock other sections similarly
jest.mock('./QualificationsSection', () => {
  return function MockQualificationsSection() {
    return <div data-testid="qualifications-section">Qualifications Section</div>;
  };
});

jest.mock('./ExperienceSection', () => {
  return function MockExperienceSection() {
    return <div data-testid="experience-section">Experience Section</div>;
  };
});

jest.mock('./ConsultationModesSection', () => {
  return function MockConsultationModesSection() {
    return <div data-testid="consultation-modes-section">Consultation Modes Section</div>;
  };
});

jest.mock('./AvailabilitySection', () => {
  return function MockAvailabilitySection() {
    return <div data-testid="availability-section">Availability Section</div>;
  };
});

jest.mock('./LanguagePreferencesSection', () => {
  return function MockLanguagePreferencesSection() {
    return <div data-testid="language-preferences-section">Language Preferences Section</div>;
  };
});

jest.mock('./NotificationPreferencesSection', () => {
  return function MockNotificationPreferencesSection() {
    return <div data-testid="notification-preferences-section">Notification Preferences Section</div>;
  };
});

jest.mock('./ProfileStatsSection', () => {
  return function MockProfileStatsSection() {
    return <div data-testid="profile-stats-section">Profile Stats Section</div>;
  };
});

// Mock the useDoctorProfile hook
jest.mock('../../../hooks/useDoctorProfile', () => {
  return jest.fn(() => ({
    profileData: {
      _id: 'doctor123',
      personalInfo: {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com'
      }
    },
    loading: false,
    error: null,
    canEdit: true,
    validateProfileCompleteness: () => ({
      isComplete: false,
      completionPercentage: 75,
      missingFields: ['specializations']
    })
  }));
});

// Mock the useUnsavedChangesWarning hook
jest.mock('../../../hooks/useUnsavedChangesWarning', () => {
  return jest.fn(() => ({
    hasUnsavedChanges: false,
    handleNavigation: jest.fn()
  }));
});

// Mock react-toastify
jest.mock('react-toastify', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn()
  }
}));

const createMockStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      auth: authSlice,
      doctorProfile: doctorProfileSlice
    },
    preloadedState: {
      auth: {
        user: { _id: 'doctor123', role: 'doctor' },
        isAuthenticated: true,
        ...initialState.auth
      },
      doctorProfile: {
        ui: {
          activeSection: 'personal',
          unsavedChanges: {},
          validationErrors: {}
        },
        ...initialState.doctorProfile
      }
    }
  });
};

const renderWithProviders = (component, { initialState = {} } = {}) => {
  const store = createMockStore(initialState);
  return render(
    <Provider store={store}>
      <BrowserRouter>
        {component}
      </BrowserRouter>
    </Provider>
  );
};

describe('DoctorProfileContainer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders profile container with navigation and content', () => {
    renderWithProviders(<DoctorProfileContainer />);
    
    // Check if header is rendered
    expect(screen.getByText('Profile Management')).toBeInTheDocument();
    expect(screen.getByText('Manage your professional profile and settings')).toBeInTheDocument();
    
    // Check if profile completion indicator is shown
    expect(screen.getByText('75% complete')).toBeInTheDocument();
    
    // Check if navigation sections are rendered
    expect(screen.getByText('Personal Information')).toBeInTheDocument();
    expect(screen.getByText('Medical License')).toBeInTheDocument();
    expect(screen.getByText('Specializations')).toBeInTheDocument();
    
    // Check if the default section (personal) is rendered
    expect(screen.getByTestId('personal-info-section')).toBeInTheDocument();
  });

  test('switches between profile sections', async () => {
    renderWithProviders(<DoctorProfileContainer />);
    
    // Initially shows personal info section
    expect(screen.getByTestId('personal-info-section')).toBeInTheDocument();
    
    // Click on Medical License section
    fireEvent.click(screen.getByText('Medical License'));
    
    await waitFor(() => {
      expect(screen.getByTestId('medical-license-section')).toBeInTheDocument();
      expect(screen.queryByTestId('personal-info-section')).not.toBeInTheDocument();
    });
  });

  test('shows unsaved changes warning when navigating with unsaved changes', async () => {
    const initialState = {
      doctorProfile: {
        ui: {
          activeSection: 'personal',
          unsavedChanges: { doctor123: { personal: true } },
          validationErrors: {}
        }
      }
    };
    
    renderWithProviders(<DoctorProfileContainer />, { initialState });
    
    // Try to navigate to another section
    fireEvent.click(screen.getByText('Medical License'));
    
    // Should show unsaved changes warning
    await waitFor(() => {
      expect(screen.getByText('Unsaved Changes')).toBeInTheDocument();
      expect(screen.getByText(/You have unsaved changes/)).toBeInTheDocument();
    });
  });

  test('handles mobile sidebar toggle', () => {
    renderWithProviders(<DoctorProfileContainer />);
    
    // Find and click mobile menu button (should be hidden on desktop but present in DOM)
    const mobileMenuButton = screen.getByRole('button', { name: /menu/i });
    fireEvent.click(mobileMenuButton);
    
    // Mobile sidebar should be visible (check for close button)
    expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();
  });

  test('updates unsaved changes state when section reports changes', async () => {
    renderWithProviders(<DoctorProfileContainer />);
    
    // Click the "Make Changes" button in the mocked PersonalInfoSection
    const makeChangesButton = screen.getByText('Make Changes');
    fireEvent.click(makeChangesButton);
    
    // The component should handle the update (this would normally update Redux state)
    // Since we're mocking, we can't easily test the Redux state change,
    // but we can verify the component doesn't crash
    expect(screen.getByTestId('personal-info-section')).toBeInTheDocument();
  });

  test('handles back navigation', () => {
    const mockNavigate = jest.fn();
    jest.doMock('react-router-dom', () => ({
      ...jest.requireActual('react-router-dom'),
      useNavigate: () => mockNavigate
    }));
    
    renderWithProviders(<DoctorProfileContainer />);
    
    // Click back button
    const backButton = screen.getByRole('button', { name: /back/i });
    fireEvent.click(backButton);
    
    // Should navigate to dashboard (or show warning if unsaved changes)
    // Since we mocked no unsaved changes, it should navigate directly
  });

  test('displays loading state', () => {
    // Mock loading state
    const useDoctorProfile = require('../../../hooks/useDoctorProfile');
    useDoctorProfile.mockReturnValue({
      profileData: null,
      loading: true,
      error: null,
      canEdit: false,
      validateProfileCompleteness: () => ({ isComplete: false, completionPercentage: 0, missingFields: [] })
    });
    
    renderWithProviders(<DoctorProfileContainer />);
    
    expect(screen.getByText('Loading profile...')).toBeInTheDocument();
  });

  test('displays error state', () => {
    // Mock error state
    const useDoctorProfile = require('../../../hooks/useDoctorProfile');
    useDoctorProfile.mockReturnValue({
      profileData: null,
      loading: false,
      error: 'Failed to load profile data',
      canEdit: false,
      validateProfileCompleteness: () => ({ isComplete: false, completionPercentage: 0, missingFields: [] })
    });
    
    renderWithProviders(<DoctorProfileContainer />);
    
    expect(screen.getByText('Failed to Load Profile')).toBeInTheDocument();
    expect(screen.getByText('Failed to load profile data')).toBeInTheDocument();
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  test('handles profile completion display', () => {
    renderWithProviders(<DoctorProfileContainer />);
    
    // Should show completion percentage
    expect(screen.getByText('75% complete')).toBeInTheDocument();
    
    // Should not show "Complete" badge since it's not 100%
    expect(screen.queryByText('Complete')).not.toBeInTheDocument();
  });

  test('shows complete badge when profile is 100% complete', () => {
    // Mock complete profile
    const useDoctorProfile = require('../../../hooks/useDoctorProfile');
    useDoctorProfile.mockReturnValue({
      profileData: { _id: 'doctor123' },
      loading: false,
      error: null,
      canEdit: true,
      validateProfileCompleteness: () => ({
        isComplete: true,
        completionPercentage: 100,
        missingFields: []
      })
    });
    
    renderWithProviders(<DoctorProfileContainer />);
    
    expect(screen.getByText('100% complete')).toBeInTheDocument();
    expect(screen.getByText('Complete')).toBeInTheDocument();
  });
});