import React, { useState } from 'react';
import { ValidatedInput, ValidatedTextarea, ValidatedSelect } from './ValidatedField';
import { ValidationSummary, BusinessRuleValidation } from './ValidationDisplay';
import useProfileValidation from '../../hooks/useProfileValidation';
import ValidationService from '../../services/validationService';

/**
 * ValidationDemo - Demonstrates the comprehensive validation system
 */
const ValidationDemo = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    licenseNumber: '',
    issuingAuthority: '',
    issueDate: '',
    expiryDate: '',
    bio: '',
    experienceYears: ''
  });

  const [serverValidation, setServerValidation] = useState(null);
  const [isValidating, setIsValidating] = useState(false);

  const {
    validationErrors,
    validationWarnings,
    validationSummary,
    validateCompleteProfile,
    validateBusinessRules,
    clearErrors
  } = useProfileValidation();

  // Handle form field changes
  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Validate complete form
  const handleValidateComplete = async () => {
    setIsValidating(true);
    
    try {
      // Client-side validation
      const clientValidation = validateCompleteProfile({
        personalInfo: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone
        },
        medicalLicense: {
          licenseNumber: formData.licenseNumber,
          issuingAuthority: formData.issuingAuthority,
          issueDate: formData.issueDate,
          expiryDate: formData.expiryDate
        },
        bio: formData.bio,
        experience: {
          experienceYears: parseInt(formData.experienceYears) || 0
        }
      });

      // Business rules validation
      const businessRules = validateBusinessRules({
        medicalLicense: {
          expiryDate: formData.expiryDate
        },
        experience: {
          totalYears: parseInt(formData.experienceYears) || 0
        },
        bio: formData.bio
      });

      setServerValidation({
        clientValidation,
        businessRules,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Validation error:', error);
    } finally {
      setIsValidating(false);
    }
  };

  // Clear all validation
  const handleClearValidation = () => {
    clearErrors();
    setServerValidation(null);
  };

  // Test data presets
  const loadTestData = (type) => {
    const testData = {
      valid: {
        firstName: 'Dr. John',
        lastName: 'Smith',
        email: 'john.smith@hospital.com',
        phone: '+1234567890',
        licenseNumber: 'MD123456789',
        issuingAuthority: 'State Medical Board',
        issueDate: '2020-01-01',
        expiryDate: '2025-12-31',
        bio: 'Experienced cardiologist with over 10 years of practice in interventional cardiology and heart disease prevention.',
        experienceYears: '12'
      },
      invalid: {
        firstName: 'J',
        lastName: '',
        email: 'invalid-email',
        phone: '123',
        licenseNumber: 'MD',
        issuingAuthority: '',
        issueDate: '2025-01-01',
        expiryDate: '2023-01-01',
        bio: 'Short',
        experienceYears: '70'
      },
      expired: {
        firstName: 'Dr. Jane',
        lastName: 'Doe',
        email: 'jane.doe@clinic.com',
        phone: '+1987654321',
        licenseNumber: 'MD987654321',
        issuingAuthority: 'Medical Council',
        issueDate: '2018-01-01',
        expiryDate: '2023-01-01', // Expired
        bio: 'General practitioner with focus on family medicine and preventive care.',
        experienceYears: '8'
      }
    };

    setFormData(testData[type]);
    clearErrors();
    setServerValidation(null);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          Profile Validation System Demo
        </h1>

        {/* Test Data Buttons */}
        <div className="mb-6 flex gap-3">
          <button
            onClick={() => loadTestData('valid')}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
          >
            Load Valid Data
          </button>
          <button
            onClick={() => loadTestData('invalid')}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
          >
            Load Invalid Data
          </button>
          <button
            onClick={() => loadTestData('expired')}
            className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors"
          >
            Load Expired License
          </button>
          <button
            onClick={handleClearValidation}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
          >
            Clear All
          </button>
        </div>

        {/* Form Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Personal Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Personal Information</h3>
            
            <ValidatedInput
              field="firstName"
              label="First Name"
              value={formData.firstName}
              onChange={(value) => handleChange('firstName', value)}
              required
            />

            <ValidatedInput
              field="lastName"
              label="Last Name"
              value={formData.lastName}
              onChange={(value) => handleChange('lastName', value)}
              required
            />

            <ValidatedInput
              field="email"
              label="Email"
              type="email"
              value={formData.email}
              onChange={(value) => handleChange('email', value)}
              required
            />

            <ValidatedInput
              field="phone"
              label="Phone Number"
              value={formData.phone}
              onChange={(value) => handleChange('phone', value)}
              required
            />
          </div>

          {/* Medical License */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Medical License</h3>
            
            <ValidatedInput
              field="licenseNumber"
              label="License Number"
              value={formData.licenseNumber}
              onChange={(value) => handleChange('licenseNumber', value)}
              required
            />

            <ValidatedInput
              field="issuingAuthority"
              label="Issuing Authority"
              value={formData.issuingAuthority}
              onChange={(value) => handleChange('issuingAuthority', value)}
              required
            />

            <ValidatedInput
              field="issueDate"
              label="Issue Date"
              type="date"
              value={formData.issueDate}
              onChange={(value) => handleChange('issueDate', value)}
              required
            />

            <ValidatedInput
              field="expiryDate"
              label="Expiry Date"
              type="date"
              value={formData.expiryDate}
              onChange={(value) => handleChange('expiryDate', value)}
              required
            />
          </div>
        </div>

        {/* Additional Fields */}
        <div className="space-y-4 mb-6">
          <ValidatedInput
            field="experienceYears"
            label="Years of Experience"
            type="number"
            value={formData.experienceYears}
            onChange={(value) => handleChange('experienceYears', value)}
            required
          />

          <ValidatedTextarea
            field="bio"
            label="Professional Bio"
            value={formData.bio}
            onChange={(value) => handleChange('bio', value)}
            rows={4}
            maxLength={1000}
            showCharCount
            placeholder="Write a professional summary of your medical expertise and experience..."
          />
        </div>

        {/* Validation Actions */}
        <div className="flex gap-3 mb-6">
          <button
            onClick={handleValidateComplete}
            disabled={isValidating}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {isValidating ? 'Validating...' : 'Validate Complete Profile'}
          </button>
        </div>

        {/* Validation Summary */}
        {validationSummary && (
          <ValidationSummary
            summary={validationSummary}
            errors={validationErrors}
            warnings={validationWarnings}
            showDetails={true}
            className="mb-6"
          />
        )}

        {/* Server Validation Results */}
        {serverValidation && (
          <div className="space-y-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Validation Results
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="bg-white rounded-md p-3">
                  <h4 className="font-medium text-gray-900 mb-2">Client-side Validation</h4>
                  <p className="text-sm">
                    <span className={`font-medium ${serverValidation.clientValidation.isValid ? 'text-green-600' : 'text-red-600'}`}>
                      {serverValidation.clientValidation.isValid ? '✅ Valid' : '❌ Invalid'}
                    </span>
                  </p>
                  <p className="text-sm text-gray-600">
                    Can Save: {serverValidation.clientValidation.canSave ? 'Yes' : 'No'}
                  </p>
                </div>

                <div className="bg-white rounded-md p-3">
                  <h4 className="font-medium text-gray-900 mb-2">Business Rules</h4>
                  <p className="text-sm">
                    <span className="text-red-600">
                      {serverValidation.businessRules.businessErrors ? Object.keys(serverValidation.businessRules.businessErrors).length : 0} Errors
                    </span>
                    {' | '}
                    <span className="text-yellow-600">
                      {serverValidation.businessRules.businessWarnings ? Object.keys(serverValidation.businessRules.businessWarnings).length : 0} Warnings
                    </span>
                  </p>
                </div>
              </div>

              {/* Business Rules Display */}
              {serverValidation.businessRules && (
                <BusinessRuleValidation
                  businessErrors={serverValidation.businessRules.businessErrors || {}}
                  businessWarnings={serverValidation.businessRules.businessWarnings || {}}
                />
              )}
            </div>
          </div>
        )}

        {/* Guidance Information */}
        <div className="bg-blue-50 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">
            How the Validation System Works
          </h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• <strong>Real-time validation:</strong> Fields are validated as you type or when you leave the field</li>
            <li>• <strong>Client-side validation:</strong> Immediate feedback for format and basic requirements</li>
            <li>• <strong>Server-side validation:</strong> Comprehensive validation with business rules</li>
            <li>• <strong>Business rules:</strong> Advanced validation like license expiry, fee limits, etc.</li>
            <li>• <strong>Guidance messages:</strong> Helpful tips for each field to guide completion</li>
            <li>• <strong>Error highlighting:</strong> Visual indicators show which fields need attention</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ValidationDemo;