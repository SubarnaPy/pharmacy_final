#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function colorize(text, color) {
  return `${colors[color]}${text}${colors.reset}`;
}

function checkFileExists(filePath, description) {
  const fullPath = path.join(__dirname, '..', filePath);
  const exists = fs.existsSync(fullPath);
  
  if (exists) {
    console.log(colorize(`✓ ${description}`, 'green'));
    return true;
  } else {
    console.log(colorize(`✗ ${description} (Missing: ${filePath})`, 'red'));
    return false;
  }
}

function checkFileContent(filePath, description, requiredContent = []) {
  const fullPath = path.join(__dirname, '..', filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(colorize(`✗ ${description} (File not found)`, 'red'));
    return false;
  }
  
  try {
    const content = fs.readFileSync(fullPath, 'utf8');
    let allFound = true;
    
    for (const required of requiredContent) {
      if (!content.includes(required)) {
        console.log(colorize(`✗ ${description} (Missing: ${required})`, 'red'));
        allFound = false;
      }
    }
    
    if (allFound) {
      console.log(colorize(`✓ ${description}`, 'green'));
      return true;
    }
    
    return false;
  } catch (error) {
    console.log(colorize(`✗ ${description} (Error reading file: ${error.message})`, 'red'));
    return false;
  }
}

console.log(colorize('Doctor Profile Management - Test Verification', 'cyan'));
console.log('='.repeat(60));

let allChecksPass = true;

// Check test files exist
console.log(colorize('\nChecking Test Files:', 'yellow'));
allChecksPass &= checkFileExists('frontend/tests/unit/doctor-profile-management.test.jsx', 'Frontend Unit Tests');
allChecksPass &= checkFileExists('backend/tests/doctor-profile-integration.test.js', 'Backend Integration Tests');
allChecksPass &= checkFileExists('frontend/tests/e2e/doctor-profile-e2e.test.js', 'Frontend E2E Tests');
allChecksPass &= checkFileExists('backend/tests/doctor-profile-performance.test.js', 'Backend Performance Tests');

// Check utility files
console.log(colorize('\nChecking Utility Files:', 'yellow'));
allChecksPass &= checkFileExists('frontend/tests/utils/test-utils.jsx', 'Test Utilities');
allChecksPass &= checkFileExists('frontend/tests/config/test-config.js', 'Test Configuration');
allChecksPass &= checkFileExists('scripts/run-profile-tests.js', 'Test Runner Script');
allChecksPass &= checkFileExists('scripts/run-profile-tests.bat', 'Windows Test Runner');

// Check test content
console.log(colorize('\nChecking Test Content:', 'yellow'));
allChecksPass &= checkFileContent(
  'frontend/tests/unit/doctor-profile-management.test.jsx',
  'Unit Tests Content',
  ['describe', 'test', 'expect', 'DoctorProfileContainer', 'PersonalInfoSection']
);

allChecksPass &= checkFileContent(
  'backend/tests/doctor-profile-integration.test.js',
  'Integration Tests Content',
  ['describe', 'test', 'expect', 'request', 'DoctorProfileService']
);

allChecksPass &= checkFileContent(
  'backend/tests/doctor-profile-performance.test.js',
  'Performance Tests Content',
  ['describe', 'test', 'expect', 'performance', 'concurrent']
);

// Check configuration files
console.log(colorize('\nChecking Configuration:', 'yellow'));
allChecksPass &= checkFileContent(
  'frontend/jest.config.js',
  'Jest Configuration',
  ['testEnvironment', 'jsdom']
);

allChecksPass &= checkFileContent(
  'backend/tests/package.json',
  'Backend Test Package',
  ['jest', 'supertest']
);

// Summary
console.log('\n' + '='.repeat(60));
if (allChecksPass) {
  console.log(colorize('✓ All test files and configurations are properly set up!', 'green'));
  console.log(colorize('\nYou can now run the comprehensive test suite:', 'blue'));
  console.log('  Windows: scripts\\run-profile-tests.bat');
  console.log('  Unix/Mac: node scripts/run-profile-tests.js');
} else {
  console.log(colorize('✗ Some test files or configurations are missing or incomplete.', 'red'));
  console.log(colorize('Please review the issues above and fix them before running tests.', 'yellow'));
}

console.log('='.repeat(60));
process.exit(allChecksPass ? 0 : 1);