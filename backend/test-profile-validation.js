import ProfileValidationService from './src/services/ProfileValidationService.js';

/**
 * Test script for comprehensive profile validation system
 */

console.log('🧪 Testing Profile Validation System\n');

// Test data samples
const validPersonalInfo = {
  firstName: 'John',
  lastName: 'Smith',
  email: 'john.smith@example.com',
  phone: '+1234567890',
  address: '123 Medical Center Dr, City, State 12345'
};

const invalidPersonalInfo = {
  firstName: 'J',
  lastName: '',
  email: 'invalid-email',
  phone: '123',
  address: ''
};

const validMedicalLicense = {
  licenseNumber: 'MD123456',
  issuingAuthority: 'State Medical Board',
  issueDate: '2020-01-01',
  expiryDate: '2025-12-31'
};

const expiredMedicalLicense = {
  licenseNumber: 'MD123456',
  issuingAuthority: 'State Medical Board',
  issueDate: '2020-01-01',
  expiryDate: '2023-01-01' // Expired
};

const validSpecializations = ['Cardiology', 'Internal Medicine'];
const tooManySpecializations = Array(12).fill('Cardiology'); // Too many

const validQualifications = [
  {
    degree: 'MBBS',
    institution: 'Medical University',
    year: 2018,
    specialization: 'General Medicine'
  }
];

const invalidQualifications = [
  {
    degree: '',
    institution: 'Medical University',
    year: 2050, // Future year
    specialization: 'General Medicine'
  }
];

const validConsultationModes = {
  video: {
    available: true,
    fee: 100,
    duration: 30
  },
  chat: {
    available: true,
    fee: 50,
    duration: 15
  }
};

const invalidConsultationModes = {
  video: {
    available: true,
    fee: -10, // Negative fee
    duration: 300 // Too long
  }
};

const validWorkingHours = {
  monday: {
    available: true,
    start: '09:00',
    end: '17:00'
  },
  tuesday: {
    available: true,
    start: '09:00',
    end: '17:00'
  }
};

const invalidWorkingHours = {
  monday: {
    available: true,
    start: '17:00',
    end: '09:00' // End before start
  }
};

// Test functions
function testPersonalInfoValidation() {
  console.log('📋 Testing Personal Info Validation');
  
  const validResult = ProfileValidationService.validatePersonalInfo(validPersonalInfo);
  console.log('✅ Valid personal info:', validResult.isValid ? 'PASS' : 'FAIL');
  
  const invalidResult = ProfileValidationService.validatePersonalInfo(invalidPersonalInfo);
  console.log('❌ Invalid personal info:', !invalidResult.isValid ? 'PASS' : 'FAIL');
  console.log('   Errors found:', invalidResult.errors.length);
  
  console.log('');
}

function testMedicalLicenseValidation() {
  console.log('🏥 Testing Medical License Validation');
  
  const validResult = ProfileValidationService.validateMedicalLicense(validMedicalLicense);
  console.log('✅ Valid license:', validResult.isValid ? 'PASS' : 'FAIL');
  
  const expiredResult = ProfileValidationService.validateMedicalLicense(expiredMedicalLicense);
  console.log('❌ Expired license:', !expiredResult.isValid ? 'PASS' : 'FAIL');
  console.log('   Errors found:', expiredResult.errors.length);
  
  console.log('');
}

function testSpecializationsValidation() {
  console.log('🎯 Testing Specializations Validation');
  
  const validResult = ProfileValidationService.validateSpecializations(validSpecializations);
  console.log('✅ Valid specializations:', validResult.isValid ? 'PASS' : 'FAIL');
  
  const tooManyResult = ProfileValidationService.validateSpecializations(tooManySpecializations);
  console.log('❌ Too many specializations:', !tooManyResult.isValid ? 'PASS' : 'FAIL');
  console.log('   Errors found:', tooManyResult.errors.length);
  
  console.log('');
}

function testQualificationsValidation() {
  console.log('🎓 Testing Qualifications Validation');
  
  const validResult = ProfileValidationService.validateQualifications(validQualifications);
  console.log('✅ Valid qualifications:', validResult.isValid ? 'PASS' : 'FAIL');
  
  const invalidResult = ProfileValidationService.validateQualifications(invalidQualifications);
  console.log('❌ Invalid qualifications:', !invalidResult.isValid ? 'PASS' : 'FAIL');
  console.log('   Errors found:', invalidResult.errors.length);
  
  console.log('');
}

function testConsultationModesValidation() {
  console.log('💬 Testing Consultation Modes Validation');
  
  const validResult = ProfileValidationService.validateConsultationModes(validConsultationModes);
  console.log('✅ Valid consultation modes:', validResult.isValid ? 'PASS' : 'FAIL');
  
  const invalidResult = ProfileValidationService.validateConsultationModes(invalidConsultationModes);
  console.log('❌ Invalid consultation modes:', !invalidResult.isValid ? 'PASS' : 'FAIL');
  console.log('   Errors found:', invalidResult.errors.length);
  
  console.log('');
}

function testWorkingHoursValidation() {
  console.log('⏰ Testing Working Hours Validation');
  
  const validResult = ProfileValidationService.validateWorkingHours(validWorkingHours);
  console.log('✅ Valid working hours:', validResult.isValid ? 'PASS' : 'FAIL');
  
  const invalidResult = ProfileValidationService.validateWorkingHours(invalidWorkingHours);
  console.log('❌ Invalid working hours:', !invalidResult.isValid ? 'PASS' : 'FAIL');
  console.log('   Errors found:', invalidResult.errors.length);
  
  console.log('');
}

function testBusinessRulesValidation() {
  console.log('🏢 Testing Business Rules Validation');
  
  const profileWithExpiredLicense = {
    medicalLicense: expiredMedicalLicense,
    specializations: tooManySpecializations,
    consultationModes: {
      video: { available: true, fee: 5000 } // Very high fee
    },
    workingHours: {
      monday: { available: true, start: '06:00', end: '23:00' } // 17 hours
    }
  };
  
  const businessRules = ProfileValidationService.validateBusinessRules(profileWithExpiredLicense);
  console.log('❌ Business rule violations found:', businessRules.errors.length);
  console.log('⚠️  Business rule warnings found:', businessRules.warnings.length);
  
  if (businessRules.errors.length > 0) {
    console.log('   Critical errors:');
    businessRules.errors.forEach(error => {
      console.log(`   - ${error.message} (${error.code})`);
    });
  }
  
  if (businessRules.warnings.length > 0) {
    console.log('   Warnings:');
    businessRules.warnings.forEach(warning => {
      console.log(`   - ${warning.message} (${warning.code})`);
    });
  }
  
  console.log('');
}

function testCompleteProfileValidation() {
  console.log('🔍 Testing Complete Profile Validation');
  
  const completeValidProfile = {
    personalInfo: validPersonalInfo,
    medicalLicense: validMedicalLicense,
    specializations: validSpecializations,
    qualifications: validQualifications,
    consultationModes: validConsultationModes,
    workingHours: validWorkingHours,
    bio: 'Experienced doctor with 10+ years in cardiology and internal medicine.',
    languages: ['English', 'Spanish'],
    experience: {
      totalYears: 10,
      workplace: [
        {
          hospitalName: 'City General Hospital',
          position: 'Senior Cardiologist',
          startDate: '2020-01-01',
          endDate: null
        }
      ]
    }
  };
  
  const incompleteProfile = {
    personalInfo: invalidPersonalInfo,
    medicalLicense: expiredMedicalLicense,
    specializations: [],
    qualifications: []
  };
  
  const validResult = ProfileValidationService.validateCompleteProfile(completeValidProfile);
  console.log('✅ Complete valid profile:', validResult.isValid ? 'PASS' : 'FAIL');
  console.log('   Can activate profile:', validResult.canActivateProfile ? 'YES' : 'NO');
  
  const invalidResult = ProfileValidationService.validateCompleteProfile(incompleteProfile);
  console.log('❌ Incomplete profile:', !invalidResult.isValid ? 'PASS' : 'FAIL');
  console.log('   Can activate profile:', invalidResult.canActivateProfile ? 'YES' : 'NO');
  console.log('   Total errors:', (invalidResult.errors?.length || 0) + (invalidResult.businessRuleErrors?.length || 0));
  console.log('   Total warnings:', (invalidResult.warnings?.length || 0) + (invalidResult.businessRuleWarnings?.length || 0));
  
  console.log('');
}

function testSectionValidation() {
  console.log('📝 Testing Section-Specific Validation');
  
  const sections = [
    { name: 'personalInfo', data: validPersonalInfo },
    { name: 'medicalLicense', data: validMedicalLicense },
    { name: 'specializations', data: validSpecializations },
    { name: 'qualifications', data: validQualifications }
  ];
  
  sections.forEach(section => {
    const result = ProfileValidationService.validateSectionData(section.name, section.data);
    console.log(`   ${section.name}:`, result.isValid ? '✅ PASS' : '❌ FAIL');
  });
  
  console.log('');
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Starting Profile Validation Tests\n');
  
  testPersonalInfoValidation();
  testMedicalLicenseValidation();
  testSpecializationsValidation();
  testQualificationsValidation();
  testConsultationModesValidation();
  testWorkingHoursValidation();
  testBusinessRulesValidation();
  testCompleteProfileValidation();
  testSectionValidation();
  
  console.log('✨ All tests completed!\n');
}

// Run the tests
runAllTests().catch(console.error);