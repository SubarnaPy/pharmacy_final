// Mock implementations for testing
export const mockUseDoctorProfile = {
  profile: null,
  updateProfileSection: jest.fn(),
  isLoading: false
};

export const mockUseProfileValidation = {
  validateSection: jest.fn(() => ({ isValid: true, errors: [] })),
  errors: {}
};