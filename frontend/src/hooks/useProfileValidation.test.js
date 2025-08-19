import { renderHook, act } from '@testing-library/react';
import useProfileValidation from './useProfileValidation';

describe('useProfileValidation', () => {
  let result;

  beforeEach(() => {
    const { result: hookResult } = renderHook(() => useProfileValidation());
    result = hookResult;
  });

  describe('Field Validation', () => {
    test('validates firstName correctly', () => {
      act(() => {
        // Valid first name
        const validResult = result.current.validateField('firstName', 'John');
        expect(validResult.isValid).toBe(true);
        expect(validResult.error).toBeNull();

        // Invalid first name (too short)
        const invalidResult = result.current.validateField('firstName', 'J');
        expect(invalidResult.isValid).toBe(false);
        expect(invalidResult.error).toContain('at least 2 characters');

        // Empty first name
        const emptyResult = result.current.validateField('firstName', '');
        expect(emptyResult.isValid).toBe(false);
        expect(emptyResult.error).toContain('required');
      });
    });

    test('validates email correctly', () => {
      act(() => {
        // Valid email
        const validResult = result.current.validateField('email', 'test@example.com');
        expect(validResult.isValid).toBe(true);
        expect(validResult.error).toBeNull();

        // Invalid email format
        const invalidResult = result.current.validateField('email', 'invalid-email');
        expect(invalidResult.isValid).toBe(false);
        expect(invalidResult.error).toContain('valid email address');

        // Empty email
        const emptyResult = result.current.validateField('email', '');
        expect(emptyResult.isValid).toBe(false);
        expect(emptyResult.error).toContain('required');
      });
    });

    test('validates phone correctly', () => {
      act(() => {
        // Valid phone
        const validResult = result.current.validateField('phone', '+1234567890');
        expect(validResult.isValid).toBe(true);
        expect(validResult.error).toBeNull();

        // Invalid phone (too short)
        const invalidResult = result.current.validateField('phone', '123');
        expect(invalidResult.isValid).toBe(false);
        expect(invalidResult.error).toContain('between 10-15 digits');

        // Empty phone
        const emptyResult = result.current.validateField('phone', '');
        expect(emptyResult.isValid).toBe(false);
        expect(emptyResult.error).toContain('required');
      });
    });

    test('validates license number correctly', () => {
      act(() => {
        // Valid license number
        const validResult = result.current.validateField('licenseNumber', 'MD123456');
        expect(validResult.isValid).toBe(true);
        expect(validResult.error).toBeNull();

        // Invalid license number (too short)
        const invalidResult = result.current.validateField('licenseNumber', 'MD1');
        expect(invalidResult.isValid).toBe(false);
        expect(invalidResult.error).toContain('at least 5 characters');

        // Empty license number
        const emptyResult = result.current.validateField('licenseNumber', '');
        expect(emptyResult.isValid).toBe(false);
        expect(emptyResult.error).toContain('required');
      });
    });

    test('validates expiry date with warnings', () => {
      act(() => {
        // Future date (valid)
        const futureDate = new Date();
        futureDate.setFullYear(futureDate.getFullYear() + 2);
        const validResult = result.current.validateField('expiryDate', futureDate.toISOString().split('T')[0]);
        expect(validResult.isValid).toBe(true);
        expect(validResult.error).toBeNull();

        // Expired date
        const pastDate = new Date();
        pastDate.setFullYear(pastDate.getFullYear() - 1);
        const expiredResult = result.current.validateField('expiryDate', pastDate.toISOString().split('T')[0]);
        expect(expiredResult.isValid).toBe(false);
        expect(expiredResult.error).toContain('expired');

        // Expiring soon (should show warning)
        const soonDate = new Date();
        soonDate.setMonth(soonDate.getMonth() + 2);
        const soonResult = result.current.validateField('expiryDate', soonDate.toISOString().split('T')[0]);
        expect(soonResult.isValid).toBe(true);
        expect(soonResult.warning).toContain('expires soon');
      });
    });

    test('validates bio with character limits', () => {
      act(() => {
        // Valid bio
        const validBio = 'This is a professional bio with sufficient content for patient understanding.';
        const validResult = result.current.validateField('bio', validBio);
        expect(validResult.isValid).toBe(true);
        expect(validResult.error).toBeNull();

        // Too long bio
        const longBio = 'a'.repeat(1001);
        const longResult = result.current.validateField('bio', longBio);
        expect(longResult.isValid).toBe(false);
        expect(longResult.error).toContain('less than 1000 characters');

        // Short bio (should show warning)
        const shortBio = 'Short';
        const shortResult = result.current.validateField('bio', shortBio);
        expect(shortResult.isValid).toBe(true);
        expect(shortResult.warning).toContain('at least 10 characters');
      });
    });

    test('validates experience years correctly', () => {
      act(() => {
        // Valid experience
        const validResult = result.current.validateField('experienceYears', 10);
        expect(validResult.isValid).toBe(true);
        expect(validResult.error).toBeNull();

        // Negative experience
        const negativeResult = result.current.validateField('experienceYears', -5);
        expect(negativeResult.isValid).toBe(false);
        expect(negativeResult.error).toContain('positive number');

        // Too high experience (should show warning)
        const highResult = result.current.validateField('experienceYears', 55);
        expect(highResult.isValid).toBe(true);
        expect(highResult.warning).toContain('unusually high');

        // Empty experience
        const emptyResult = result.current.validateField('experienceYears', '');
        expect(emptyResult.isValid).toBe(false);
        expect(emptyResult.error).toContain('required');
      });
    });
  });

  describe('Business Rules Validation', () => {
    test('validates license expiry business rules', () => {
      act(() => {
        const profileData = {
          medicalLicense: {
            expiryDate: '2023-01-01' // Expired
          }
        };

        const businessRules = result.current.validateBusinessRules(profileData);
        expect(businessRules.businessErrors.licenseExpired).toContain('expired');
      });
    });

    test('validates specialization limits', () => {
      act(() => {
        const profileData = {
          specializations: Array(12).fill('Cardiology') // Too many
        };

        const businessRules = result.current.validateBusinessRules(profileData);
        expect(businessRules.businessErrors.tooManySpecializations).toContain('Maximum 10');
      });
    });

    test('validates consultation fee ranges', () => {
      act(() => {
        const profileData = {
          consultationModes: {
            video: {
              available: true,
              fee: 5
            }
          }
        };

        const businessRules = result.current.validateBusinessRules(profileData);
        expect(businessRules.businessWarnings.videoFeeLow).toContain('seems low');
      });
    });

    test('validates working hours limits', () => {
      act(() => {
        const profileData = {
          workingHours: {
            monday: {
              available: true,
              start: '06:00',
              end: '23:00' // 17 hours
            }
          }
        };

        const businessRules = result.current.validateBusinessRules(profileData);
        expect(businessRules.businessWarnings.mondayLongHours).toContain('exceed 12 hours');
      });
    });
  });

  describe('Validation Summary', () => {
    test('provides correct validation summary', () => {
      act(() => {
        // Add some errors and warnings
        result.current.setError('firstName', 'First name is required');
        result.current.setError('email', 'Invalid email format');
        result.current.setWarning('bio', 'Bio should be longer');
      });

      const summary = result.current.validationSummary;
      expect(summary.hasErrors).toBe(true);
      expect(summary.hasWarnings).toBe(true);
      expect(summary.errorCount).toBe(2);
      expect(summary.warningCount).toBe(1);
      expect(summary.isValid).toBe(false);
      expect(summary.canSave).toBe(false);
      expect(summary.summary).toContain('2 errors');
    });

    test('shows success state when no errors', () => {
      const summary = result.current.validationSummary;
      expect(summary.hasErrors).toBe(false);
      expect(summary.hasWarnings).toBe(false);
      expect(summary.errorCount).toBe(0);
      expect(summary.warningCount).toBe(0);
      expect(summary.isValid).toBe(true);
      expect(summary.canSave).toBe(true);
      expect(summary.summary).toContain('All validations passed');
    });
  });

  describe('Error Management', () => {
    test('clears errors correctly', () => {
      act(() => {
        result.current.setError('firstName', 'Error message');
        result.current.setError('email', 'Another error');
      });

      expect(Object.keys(result.current.validationErrors)).toHaveLength(2);

      act(() => {
        result.current.clearErrors('firstName');
      });

      expect(Object.keys(result.current.validationErrors)).toHaveLength(1);
      expect(result.current.validationErrors.firstName).toBeUndefined();

      act(() => {
        result.current.clearErrors();
      });

      expect(Object.keys(result.current.validationErrors)).toHaveLength(0);
    });

    test('manages warnings correctly', () => {
      act(() => {
        result.current.setWarning('bio', 'Warning message');
      });

      expect(result.current.validationWarnings.bio).toBe('Warning message');

      act(() => {
        result.current.clearWarnings('bio');
      });

      expect(result.current.validationWarnings.bio).toBeUndefined();
    });
  });

  describe('Field Status', () => {
    test('returns correct field status', () => {
      act(() => {
        result.current.setError('firstName', 'Error message');
        result.current.setWarning('bio', 'Warning message');
      });

      const errorStatus = result.current.getFieldStatus('firstName');
      expect(errorStatus.type).toBe('error');
      expect(errorStatus.message).toBe('Error message');

      const warningStatus = result.current.getFieldStatus('bio');
      expect(warningStatus.type).toBe('warning');
      expect(warningStatus.message).toBe('Warning message');

      const successStatus = result.current.getFieldStatus('email');
      expect(successStatus.type).toBe('success');
      expect(successStatus.message).toBeNull();
    });
  });

  describe('Guidance Messages', () => {
    test('provides appropriate guidance messages', () => {
      const firstNameGuidance = result.current.getGuidanceMessage('firstName');
      expect(firstNameGuidance).toContain('legal first name');

      const emailGuidance = result.current.getGuidanceMessage('email');
      expect(emailGuidance).toContain('professional email');

      const licenseGuidance = result.current.getGuidanceMessage('licenseNumber');
      expect(licenseGuidance).toContain('license number exactly');

      const bioGuidance = result.current.getGuidanceMessage('bio');
      expect(bioGuidance).toContain('professional summary');
    });
  });
});