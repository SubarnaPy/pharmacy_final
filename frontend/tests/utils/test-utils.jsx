import React from 'react';
import { render } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { BrowserRouter } from 'react-router-dom';
import doctorProfileSlice from '../../src/store/doctorProfileSlice';

// Mock data generators
export const generateMockDoctor = (overrides = {}) => ({
  id: 'doctor123',
  personalInfo: {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    phone: '+1234567890',
    address: '123 Main St, City, State',
    profileImage: null,
    ...overrides.personalInfo
  },
  medicalLicense: {
    licenseNumber: 'MD123456',
    issuingAuthority: 'State Medical Board',
    issueDate: '2020-01-01',
    expiryDate: '2025-01-01',
    verificationStatus: 'verified',
    documents: [],
    ...overrides.medicalLicense
  },
  specializations: ['Cardiology', 'Internal Medicine'],
  qualifications: [{
    id: 'qual1',
    degree: 'MD',
    institution: 'Harvard Medical School',
    year: 2018,
    specialization: 'Medicine'
  }],
  experience: {
    totalYears: 5,
    currentPosition: 'Senior Cardiologist',
    bio: 'Experienced cardiologist with expertise in interventional procedures.',
    workplaces: [{
      id: 'work1',
      name: 'City General Hospital',
      position: 'Cardiologist',
      startDate: '2020-01-01',
      endDate: null,
      isCurrent: true
    }]
  },
  consultationModes: {
    chat: { enabled: true, fee: 50, duration: 30 },
    phone: { enabled: true, fee: 75, duration: 30 },
    video: { enabled: true, fee: 100, duration: 45 },
    email: { enabled: false, fee: 25, duration: 0 }
  },
  availability: {
    workingHours: [
      { day: 'Monday', startTime: '09:00', endTime: '17:00', isAvailable: true },
      { day: 'Tuesday', startTime: '09:00', endTime: '17:00', isAvailable: true },
      { day: 'Wednesday', startTime: '09:00', endTime: '17:00', isAvailable: true },
      { day: 'Thursday', startTime: '09:00', endTime: '17:00', isAvailable: true },
      { day: 'Friday', startTime: '09:00', endTime: '17:00', isAvailable: true }
    ],
    timeSlotDuration: 30,
    breakTime: 15,
    advanceBookingDays: 30
  },
  languagePreferences: ['English', 'Spanish'],
  notificationPreferences: {
    email: {
      appointments: true,
      messages: true,
      reminders: true,
      marketing: false
    },
    sms: {
      appointments: true,
      messages: false,
      reminders: true,
      marketing: false
    },
    push: {
      appointments: true,
      messages: true,
      reminders: true,
      marketing: false
    }
  },
  profileStats: {
    totalConsultations: 150,
    averageRating: 4.8,
    totalEarnings: 15000,
    monthlyEarnings: 2500
  },
  ...overrides
});

export const generateMockValidationErrors = (fields = []) => {
  const errors = {};
  fields.forEach(field => {
    switch (field) {
      case 'firstName':
        errors.firstName = 'First name is required';
        break;
      case 'lastName':
        errors.lastName = 'Last name is required';
        break;
      case 'email':
        errors.email = 'Invalid email format';
        break;
      case 'phone':
        errors.phone = 'Invalid phone number format';
        break;
      case 'licenseNumber':
        errors.licenseNumber = 'License number is required';
        break;
      case 'expiryDate':
        errors.expiryDate = 'Expiry date must be in the future';
        break;
      case 'specializations':
        errors.specializations = 'At least one specialization is required';
        break;
      default:
        errors[field] = `${field} is invalid`;
    }
  });
  return errors;
};

// Custom render function with providers
export const renderWithProviders = (
  ui,
  {
    preloadedState = {},
    store = configureStore({
      reducer: {
        doctorProfile: doctorProfileSlice
      },
      preloadedState
    }),
    ...renderOptions
  } = {}
) => {
  function Wrapper({ children }) {
    return (
      <Provider store={store}>
        <BrowserRouter>
          {children}
        </BrowserRouter>
      </Provider>
    );
  }

  return { store, ...render(ui, { wrapper: Wrapper, ...renderOptions }) };
};

// Mock API responses
export const mockApiResponses = {
  getProfile: (doctorId, profile = null) => ({
    success: true,
    data: profile || generateMockDoctor({ id: doctorId })
  }),
  
  updateProfile: (section, data) => ({
    success: true,
    data: {
      [section]: data
    }
  }),
  
  uploadDocument: (documentType) => ({
    success: true,
    data: {
      documentId: 'doc123',
      documentUrl: `https://example.com/documents/doc123.pdf`,
      documentType
    }
  }),
  
  validationError: (errors) => ({
    success: false,
    errors
  }),
  
  networkError: () => ({
    success: false,
    message: 'Network error occurred'
  })
};

// Test data sets
export const testDataSets = {
  validPersonalInfo: {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    phone: '+1234567890',
    address: '123 Main St, City, State'
  },
  
  invalidPersonalInfo: {
    firstName: '',
    lastName: 'Doe',
    email: 'invalid-email',
    phone: '123'
  },
  
  validMedicalLicense: {
    licenseNumber: 'MD123456',
    issuingAuthority: 'State Medical Board',
    issueDate: '2020-01-01',
    expiryDate: '2025-01-01'
  },
  
  invalidMedicalLicense: {
    licenseNumber: '',
    issuingAuthority: 'State Medical Board',
    issueDate: '2020-01-01',
    expiryDate: '2020-01-01' // Past date
  },
  
  validSpecializations: ['Cardiology', 'Internal Medicine'],
  
  invalidSpecializations: [], // Empty array
  
  validConsultationModes: {
    chat: { enabled: true, fee: 50, duration: 30 },
    phone: { enabled: true, fee: 75, duration: 30 },
    video: { enabled: true, fee: 100, duration: 45 },
    email: { enabled: false, fee: 25, duration: 0 }
  },
  
  invalidConsultationModes: {
    chat: { enabled: true, fee: -10, duration: 30 }, // Negative fee
    phone: { enabled: true, fee: 75, duration: 0 }, // Zero duration
    video: { enabled: true, fee: 100, duration: 45 },
    email: { enabled: false, fee: 25, duration: 0 }
  },
  
  validWorkingHours: [
    { day: 'Monday', startTime: '09:00', endTime: '17:00', isAvailable: true },
    { day: 'Tuesday', startTime: '09:00', endTime: '17:00', isAvailable: true }
  ],
  
  invalidWorkingHours: [
    { day: 'Monday', startTime: '17:00', endTime: '09:00', isAvailable: true } // End before start
  ]
};

// Performance testing utilities
export const performanceUtils = {
  measureRenderTime: (renderFn) => {
    const start = performance.now();
    const result = renderFn();
    const end = performance.now();
    return {
      result,
      renderTime: end - start
    };
  },
  
  measureAsyncOperation: async (asyncFn) => {
    const start = performance.now();
    const result = await asyncFn();
    const end = performance.now();
    return {
      result,
      duration: end - start
    };
  },
  
  createLargeDataset: (size) => {
    return Array.from({ length: size }, (_, i) => ({
      id: `item-${i}`,
      name: `Item ${i}`,
      value: Math.random() * 1000,
      description: `Description for item ${i}`.repeat(10)
    }));
  }
};

// Accessibility testing utilities
export const a11yUtils = {
  checkAriaLabels: (container) => {
    const elementsNeedingLabels = container.querySelectorAll('input, button, select, textarea');
    const missingLabels = [];
    
    elementsNeedingLabels.forEach(element => {
      const hasLabel = element.getAttribute('aria-label') || 
                      element.getAttribute('aria-labelledby') ||
                      container.querySelector(`label[for="${element.id}"]`);
      
      if (!hasLabel) {
        missingLabels.push(element);
      }
    });
    
    return missingLabels;
  },
  
  checkKeyboardNavigation: (container) => {
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    return Array.from(focusableElements).filter(element => {
      return element.tabIndex >= 0 && !element.disabled;
    });
  },
  
  checkColorContrast: (element) => {
    const styles = window.getComputedStyle(element);
    const backgroundColor = styles.backgroundColor;
    const color = styles.color;
    
    // This is a simplified check - in real scenarios, you'd use a proper contrast ratio calculator
    return {
      backgroundColor,
      color,
      hasGoodContrast: backgroundColor !== color
    };
  }
};

// Error boundary for testing
export class TestErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Test Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div data-testid="error-boundary">
          <h2>Something went wrong.</h2>
          <details>
            <summary>Error details</summary>
            <pre>{this.state.error?.toString()}</pre>
          </details>
        </div>
      );
    }

    return this.props.children;
  }
}

// Custom hooks for testing
export const useTestSetup = () => {
  const [mockData, setMockData] = React.useState(generateMockDoctor());
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);

  const simulateLoading = (duration = 1000) => {
    setLoading(true);
    setTimeout(() => setLoading(false), duration);
  };

  const simulateError = (errorMessage = 'Test error') => {
    setError(errorMessage);
    setTimeout(() => setError(null), 3000);
  };

  return {
    mockData,
    setMockData,
    loading,
    error,
    simulateLoading,
    simulateError
  };
};

export default {
  generateMockDoctor,
  generateMockValidationErrors,
  renderWithProviders,
  mockApiResponses,
  testDataSets,
  performanceUtils,
  a11yUtils,
  TestErrorBoundary,
  useTestSetup
};