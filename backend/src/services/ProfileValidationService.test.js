import ProfileValidationService from './ProfileValidationService.js';

describe('ProfileValidationService - Specializations and Qualifications', () => {
  describe('validateSpecializations', () => {
    it('should validate valid specializations array', () => {
      const specializations = ['Cardiology', 'Internal Medicine', 'Neurology'];
      const result = ProfileValidationService.validateSpecializations(specializations);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject empty specializations array', () => {
      const specializations = [];
      const result = ProfileValidationService.validateSpecializations(specializations);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'specializations',
        message: 'At least one specialization is required'
      });
    });

    it('should reject more than 5 specializations', () => {
      const specializations = [
        'Cardiology', 'Internal Medicine', 'Neurology', 
        'Orthopedics', 'Pediatrics', 'Gynecology'
      ];
      const result = ProfileValidationService.validateSpecializations(specializations);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'specializations',
        message: 'Maximum 5 specializations allowed'
      });
    });

    it('should reject duplicate specializations', () => {
      const specializations = ['Cardiology', 'Internal Medicine', 'Cardiology'];
      const result = ProfileValidationService.validateSpecializations(specializations);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'specializations',
        message: 'Duplicate specializations are not allowed'
      });
    });

    it('should reject case-insensitive duplicate specializations', () => {
      const specializations = ['Cardiology', 'CARDIOLOGY'];
      const result = ProfileValidationService.validateSpecializations(specializations);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'specializations',
        message: 'Duplicate specializations are not allowed'
      });
    });

    it('should reject invalid specializations', () => {
      const specializations = ['Cardiology', 'Invalid Specialization'];
      const result = ProfileValidationService.validateSpecializations(specializations);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'specializations[1]',
        message: 'Invalid specialization: Invalid Specialization. Must be one of the predefined options.'
      });
    });

    it('should reject empty string specializations', () => {
      const specializations = ['Cardiology', ''];
      const result = ProfileValidationService.validateSpecializations(specializations);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'specializations[1]',
        message: 'Specialization cannot be empty'
      });
    });

    it('should reject non-array input', () => {
      const specializations = 'not an array';
      const result = ProfileValidationService.validateSpecializations(specializations);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'specializations',
        message: 'Specializations must be an array'
      });
    });

    it('should accept all valid predefined specializations', () => {
      const validSpecializations = [
        'General Medicine', 'Cardiology', 'Neurology', 'Orthopedics', 'Pediatrics'
      ];
      const result = ProfileValidationService.validateSpecializations(validSpecializations);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('validateQualifications', () => {
    const validQualification = {
      degree: 'MBBS',
      institution: 'Harvard Medical School',
      year: 2020,
      specialization: 'General Medicine'
    };

    it('should validate valid qualifications array', () => {
      const qualifications = [validQualification];
      const result = ProfileValidationService.validateQualifications(qualifications);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject empty qualifications array', () => {
      const qualifications = [];
      const result = ProfileValidationService.validateQualifications(qualifications);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'qualifications',
        message: 'At least one qualification is required'
      });
    });

    it('should reject more than 20 qualifications', () => {
      const qualifications = Array(21).fill(validQualification);
      const result = ProfileValidationService.validateQualifications(qualifications);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'qualifications',
        message: 'Maximum 20 qualifications allowed'
      });
    });

    it('should reject duplicate qualifications', () => {
      const qualifications = [validQualification, validQualification];
      const result = ProfileValidationService.validateQualifications(qualifications);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'qualifications',
        message: 'Duplicate qualifications are not allowed'
      });
    });

    it('should reject qualification with missing degree', () => {
      const qualifications = [{
        institution: 'Harvard Medical School',
        year: 2020
      }];
      const result = ProfileValidationService.validateQualifications(qualifications);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'qualifications[0].degree',
        message: 'Degree is required and must be at least 2 characters'
      });
    });

    it('should reject qualification with short degree', () => {
      const qualifications = [{
        degree: 'M',
        institution: 'Harvard Medical School',
        year: 2020
      }];
      const result = ProfileValidationService.validateQualifications(qualifications);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'qualifications[0].degree',
        message: 'Degree is required and must be at least 2 characters'
      });
    });

    it('should reject qualification with long degree', () => {
      const qualifications = [{
        degree: 'A'.repeat(101),
        institution: 'Harvard Medical School',
        year: 2020
      }];
      const result = ProfileValidationService.validateQualifications(qualifications);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'qualifications[0].degree',
        message: 'Degree must be less than 100 characters'
      });
    });

    it('should reject qualification with missing institution', () => {
      const qualifications = [{
        degree: 'MBBS',
        year: 2020
      }];
      const result = ProfileValidationService.validateQualifications(qualifications);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'qualifications[0].institution',
        message: 'Institution is required and must be at least 3 characters'
      });
    });

    it('should reject qualification with short institution', () => {
      const qualifications = [{
        degree: 'MBBS',
        institution: 'AB',
        year: 2020
      }];
      const result = ProfileValidationService.validateQualifications(qualifications);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'qualifications[0].institution',
        message: 'Institution is required and must be at least 3 characters'
      });
    });

    it('should reject qualification with long institution', () => {
      const qualifications = [{
        degree: 'MBBS',
        institution: 'A'.repeat(201),
        year: 2020
      }];
      const result = ProfileValidationService.validateQualifications(qualifications);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'qualifications[0].institution',
        message: 'Institution name must be less than 200 characters'
      });
    });

    it('should reject qualification with missing year', () => {
      const qualifications = [{
        degree: 'MBBS',
        institution: 'Harvard Medical School'
      }];
      const result = ProfileValidationService.validateQualifications(qualifications);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'qualifications[0].year',
        message: 'Valid graduation year is required'
      });
    });

    it('should reject qualification with invalid year (too old)', () => {
      const qualifications = [{
        degree: 'MBBS',
        institution: 'Harvard Medical School',
        year: 1949
      }];
      const result = ProfileValidationService.validateQualifications(qualifications);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'qualifications[0].year',
        message: `Graduation year must be between 1950 and ${new Date().getFullYear()}`
      });
    });

    it('should reject qualification with invalid year (future)', () => {
      const futureYear = new Date().getFullYear() + 1;
      const qualifications = [{
        degree: 'MBBS',
        institution: 'Harvard Medical School',
        year: futureYear
      }];
      const result = ProfileValidationService.validateQualifications(qualifications);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'qualifications[0].year',
        message: `Graduation year must be between 1950 and ${new Date().getFullYear()}`
      });
    });

    it('should reject qualification with long specialization', () => {
      const qualifications = [{
        degree: 'MBBS',
        institution: 'Harvard Medical School',
        year: 2020,
        specialization: 'A'.repeat(101)
      }];
      const result = ProfileValidationService.validateQualifications(qualifications);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'qualifications[0].specialization',
        message: 'Specialization must be less than 100 characters'
      });
    });

    it('should accept qualification without specialization', () => {
      const qualifications = [{
        degree: 'MBBS',
        institution: 'Harvard Medical School',
        year: 2020
      }];
      const result = ProfileValidationService.validateQualifications(qualifications);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject non-array input', () => {
      const qualifications = 'not an array';
      const result = ProfileValidationService.validateQualifications(qualifications);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'qualifications',
        message: 'Qualifications must be an array'
      });
    });

    it('should validate multiple valid qualifications', () => {
      const qualifications = [
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
      const result = ProfileValidationService.validateQualifications(qualifications);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle mixed valid and invalid qualifications', () => {
      const qualifications = [
        {
          degree: 'MBBS',
          institution: 'Harvard Medical School',
          year: 2015
        },
        {
          degree: '', // Invalid
          institution: 'Johns Hopkins University',
          year: 2018
        }
      ];
      const result = ProfileValidationService.validateQualifications(qualifications);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'qualifications[1].degree',
        message: 'Degree is required and must be at least 2 characters'
      });
    });
  });
});