# Doctor Profile Management - Comprehensive Test Suite

This directory contains a comprehensive test suite for the Doctor Profile Management feature, covering all aspects of functionality, performance, and user experience.

## Test Structure

```
tests/
├── unit/                           # Unit tests
│   └── doctor-profile-management.test.jsx
├── integration/                    # Integration tests (backend)
│   └── doctor-profile-integration.test.js
├── e2e/                           # End-to-end tests
│   └── doctor-profile-e2e.test.js
├── performance/                   # Performance tests (backend)
│   └── doctor-profile-performance.test.js
├── utils/                         # Test utilities
│   └── test-utils.jsx
├── config/                        # Test configuration
│   └── test-config.js
└── README.md                      # This file
```

## Test Coverage

### 1. Unit Tests (`unit/doctor-profile-management.test.jsx`)

**Components Tested:**
- `DoctorProfileContainer` - Main orchestrating component
- `PersonalInfoSection` - Personal information management
- `MedicalLicenseSection` - License and credentials management
- `SpecializationsSection` - Medical specializations management
- `QualificationsSection` - Educational qualifications management
- `ExperienceSection` - Professional experience management
- `ConsultationModesSection` - Consultation preferences
- `AvailabilitySection` - Working hours and availability
- `NotificationPreferencesSection` - Notification settings
- `ProfileStatsSection` - Statistics and earnings display

**Form Components Tested:**
- `EditableField` - Inline editing functionality
- `MultiSelectField` - Multi-selection interface
- `TimeSlotPicker` - Time slot configuration
- `DocumentUploader` - File upload functionality

**Validation Services Tested:**
- `validatePersonalInfo` - Personal information validation
- `validateMedicalLicense` - License validation
- `validateSpecializations` - Specializations validation
- `validateConsultationModes` - Consultation modes validation
- `validateWorkingHours` - Working hours validation

**Test Scenarios:**
- Component rendering and display
- User interactions and state changes
- Form validation and error handling
- Data updates and persistence
- Edge cases and error conditions

### 2. Integration Tests (`backend/tests/doctor-profile-integration.test.js`)

**API Endpoints Tested:**
- `GET /api/doctors/:id/profile/full` - Retrieve complete profile
- `PUT /api/doctors/:id/profile/section` - Update profile sections
- `POST /api/doctors/:id/documents` - Upload documents
- `DELETE /api/doctors/:id/documents/:docId` - Delete documents

**Services Tested:**
- `DoctorProfileService` - Profile management operations
- `ProfileValidationService` - Server-side validation
- `DocumentUploadService` - File upload handling
- `ProfileSyncService` - Cross-platform synchronization

**Database Operations Tested:**
- Profile data retrieval and updates
- Concurrent update handling
- Transaction rollback on failures
- Audit trail creation
- Data integrity validation

**Test Scenarios:**
- Successful profile operations
- Validation error handling
- Authentication and authorization
- Concurrent access scenarios
- Database error recovery
- File upload and validation

### 3. End-to-End Tests (`frontend/tests/e2e/doctor-profile-e2e.test.js`)

**Complete Workflows Tested:**
- Profile loading and navigation
- Personal information update workflow
- Medical license management workflow
- Specializations management workflow
- Consultation modes configuration
- Availability setup workflow
- Document upload workflow

**User Experience Scenarios:**
- Form validation and error display
- Unsaved changes warnings
- Loading states and feedback
- Network error handling
- Responsive design behavior
- Accessibility compliance

**Browser Interactions:**
- Form filling and submission
- File uploads and drag-and-drop
- Modal dialogs and confirmations
- Navigation and routing
- Real-time validation feedback

### 4. Performance Tests (`backend/tests/doctor-profile-performance.test.js`)

**Performance Metrics:**
- Profile loading times
- Update operation performance
- Concurrent request handling
- Database query optimization
- Memory usage patterns
- Network efficiency

**Load Testing Scenarios:**
- Single profile operations
- Concurrent user scenarios
- Large dataset handling
- Sustained load testing
- Stress testing limits
- Memory leak detection

**Benchmarks:**
- API response times < 1000ms
- Concurrent operations < 2000ms average
- Memory usage < 50MB for normal operations
- 95%+ success rate under load
- Database queries < 200ms

## Running Tests

### Prerequisites

1. **Frontend Dependencies:**
   ```bash
   cd frontend
   npm install
   ```

2. **Backend Dependencies:**
   ```bash
   cd backend/tests
   npm install
   ```

3. **Environment Setup:**
   ```bash
   # Set test environment variables
   export NODE_ENV=test
   export MONGODB_TEST_URI=mongodb://localhost:27017/pharmacy_test
   export TEST_BASE_URL=http://localhost:3000
   export TEST_API_URL=http://localhost:5000
   ```

### Running Individual Test Suites

**Unit Tests:**
```bash
cd frontend
npm test -- --testPathPattern=tests/unit/doctor-profile-management.test.jsx
```

**Integration Tests:**
```bash
cd backend/tests
npm run test -- tests/doctor-profile-integration.test.js
```

**E2E Tests:**
```bash
cd frontend
npx playwright test tests/e2e/doctor-profile-e2e.test.js
```

**Performance Tests:**
```bash
cd backend/tests
npm run test -- tests/doctor-profile-performance.test.js
```

### Running Complete Test Suite

Use the comprehensive test runner:
```bash
node scripts/run-profile-tests.js
```

This will execute all test suites in sequence and provide a comprehensive report.

## Test Configuration

### Environment Variables

- `NODE_ENV=test` - Set test environment
- `MONGODB_TEST_URI` - Test database connection
- `TEST_BASE_URL` - Frontend application URL
- `TEST_API_URL` - Backend API URL
- `TEST_HEADLESS=false` - Run E2E tests with browser UI
- `TEST_SLOW_MO=100` - Slow down E2E tests for debugging

### Test Data

Tests use isolated test data that is created and cleaned up for each test run:
- Mock doctor profiles with comprehensive data
- Test users with appropriate permissions
- Sample documents for upload testing
- Validation test cases for all scenarios

### Performance Benchmarks

- **Fast Operations:** < 200ms
- **Acceptable Operations:** < 1000ms
- **Slow Operations:** > 3000ms (flagged for optimization)
- **Memory Usage:** < 50MB for normal operations
- **Success Rate:** > 95% under concurrent load

## Test Utilities

### Mock Data Generation

```javascript
import { generateMockDoctor, testDataSets } from './utils/test-utils';

const mockDoctor = generateMockDoctor({
  personalInfo: { firstName: 'Custom' }
});
```

### Custom Render Function

```javascript
import { renderWithProviders } from './utils/test-utils';

const { store } = renderWithProviders(<Component />, {
  preloadedState: { doctorProfile: { profile: mockDoctor } }
});
```

### Performance Testing

```javascript
import { performanceUtils } from './utils/test-utils';

const { result, renderTime } = performanceUtils.measureRenderTime(() => {
  return render(<Component />);
});
```

### Accessibility Testing

```javascript
import { a11yUtils } from './utils/test-utils';

const missingLabels = a11yUtils.checkAriaLabels(container);
const focusableElements = a11yUtils.checkKeyboardNavigation(container);
```

## Continuous Integration

### GitHub Actions Integration

```yaml
name: Doctor Profile Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm install
      - run: node scripts/run-profile-tests.js
```

### Coverage Reports

Tests generate coverage reports in multiple formats:
- HTML reports in `coverage/` directory
- LCOV format for CI integration
- Console summary for quick feedback

### Quality Gates

- **Unit Test Coverage:** > 80%
- **Integration Test Coverage:** > 70%
- **E2E Test Coverage:** > 60%
- **Performance Benchmarks:** All tests must pass
- **Accessibility Compliance:** WCAG 2.1 AA standards

## Debugging Tests

### Debug Mode

Run tests with additional debugging information:
```bash
DEBUG=true npm test
```

### Browser Debugging (E2E)

Run E2E tests with visible browser:
```bash
TEST_HEADLESS=false npx playwright test
```

### Performance Profiling

Enable performance profiling:
```bash
NODE_OPTIONS="--inspect" npm test
```

## Best Practices

### Test Organization

1. **Arrange-Act-Assert Pattern:** Structure tests clearly
2. **Descriptive Test Names:** Use clear, specific test descriptions
3. **Independent Tests:** Each test should be isolated and independent
4. **Mock External Dependencies:** Use mocks for external services
5. **Clean Up:** Properly clean up test data and resources

### Performance Testing

1. **Baseline Measurements:** Establish performance baselines
2. **Realistic Data:** Use realistic data sizes and scenarios
3. **Multiple Runs:** Average results across multiple test runs
4. **Memory Monitoring:** Track memory usage patterns
5. **Load Patterns:** Test various load patterns and scenarios

### Accessibility Testing

1. **Automated Checks:** Use automated accessibility testing tools
2. **Manual Testing:** Supplement with manual accessibility testing
3. **Screen Reader Testing:** Test with actual screen readers
4. **Keyboard Navigation:** Verify complete keyboard accessibility
5. **Color Contrast:** Ensure adequate color contrast ratios

## Troubleshooting

### Common Issues

1. **Test Database Connection:** Ensure MongoDB test instance is running
2. **Port Conflicts:** Check that test ports are available
3. **File Permissions:** Verify file upload directory permissions
4. **Memory Issues:** Increase Node.js memory limit if needed
5. **Timeout Issues:** Adjust test timeouts for slower environments

### Debug Commands

```bash
# Check test database connection
mongosh mongodb://localhost:27017/pharmacy_test

# Verify test environment
node -e "console.log(process.env.NODE_ENV)"

# Check available ports
netstat -tulpn | grep :3000

# Monitor memory usage
node --max-old-space-size=4096 scripts/run-profile-tests.js
```

## Contributing

When adding new tests:

1. Follow existing test patterns and structure
2. Add appropriate test documentation
3. Update performance benchmarks if needed
4. Ensure tests are deterministic and reliable
5. Add accessibility checks for UI components
6. Include both positive and negative test cases
7. Update this README with new test information

## Reporting Issues

When reporting test issues:

1. Include test environment details
2. Provide complete error messages and stack traces
3. Include steps to reproduce the issue
4. Specify which test suite is affected
5. Include relevant configuration and environment variables