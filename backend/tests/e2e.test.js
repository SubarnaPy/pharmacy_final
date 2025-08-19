// End-to-End Tests for Critical User Flows
import { test, expect } from '@playwright/test';

test.describe('New Pharmacy Platform E2E Tests', () => {
  let page;
  let context;

  test.beforeEach(async ({ browser }) => {
    context = await browser.newContext({
      viewport: { width: 1280, height: 720 }
    });
    page = await context.newPage();
    
    // Navigate to the application
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
  });

  test.afterEach(async () => {
    await context.close();
  });

  test.describe('User Registration and Authentication Flow', () => {
    test('should complete patient registration flow', async () => {
      // Navigate to registration page
      await page.click('[data-testid="register-button"]');
      await expect(page).toHaveURL(/.*\/register/);

      // Fill registration form
      await page.fill('[data-testid="name-input"]', 'John Doe');
      await page.fill('[data-testid="email-input"]', `patient${Date.now()}@test.com`);
      await page.fill('[data-testid="password-input"]', 'TestPassword123!');
      await page.fill('[data-testid="confirm-password-input"]', 'TestPassword123!');
      await page.selectOption('[data-testid="role-select"]', 'patient');

      // Submit registration
      await page.click('[data-testid="register-submit"]');
      
      // Wait for success message
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Registration successful');

      // Should redirect to dashboard
      await expect(page).toHaveURL(/.*\/patient\/dashboard/);
    });

    test('should complete pharmacy registration flow', async () => {
      await page.click('[data-testid="register-button"]');
      
      await page.fill('[data-testid="name-input"]', 'Test Pharmacy');
      await page.fill('[data-testid="email-input"]', `pharmacy${Date.now()}@test.com`);
      await page.fill('[data-testid="password-input"]', 'PharmacyPassword123!');
      await page.fill('[data-testid="confirm-password-input"]', 'PharmacyPassword123!');
      await page.selectOption('[data-testid="role-select"]', 'pharmacy');

      // Additional pharmacy fields
      await page.fill('[data-testid="license-number-input"]', 'PHARM123456');
      await page.fill('[data-testid="phone-input"]', '+1234567890');
      await page.fill('[data-testid="address-input"]', '123 Pharmacy St, NYC, NY 10001');

      await page.click('[data-testid="register-submit"]');
      
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
      await expect(page).toHaveURL(/.*\/pharmacy\/dashboard/);
    });

    test('should login with valid credentials', async () => {
      await page.click('[data-testid="login-button"]');
      
      await page.fill('[data-testid="email-input"]', 'patient@test.com');
      await page.fill('[data-testid="password-input"]', 'TestPassword123!');
      
      await page.click('[data-testid="login-submit"]');
      
      await expect(page).toHaveURL(/.*\/patient\/dashboard/);
      await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
    });

    test('should handle login with invalid credentials', async () => {
      await page.click('[data-testid="login-button"]');
      
      await page.fill('[data-testid="email-input"]', 'invalid@test.com');
      await page.fill('[data-testid="password-input"]', 'wrongpassword');
      
      await page.click('[data-testid="login-submit"]');
      
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="error-message"]')).toContainText('Invalid credentials');
    });

    test('should complete password reset flow', async () => {
      await page.click('[data-testid="login-button"]');
      await page.click('[data-testid="forgot-password-link"]');
      
      await page.fill('[data-testid="email-input"]', 'patient@test.com');
      await page.click('[data-testid="reset-submit"]');
      
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="success-message"]')).toContainText('reset link sent');
    });
  });

  test.describe('Pharmacy Discovery Flow', () => {
    test.beforeEach(async () => {
      // Login as patient
      await page.goto('http://localhost:3000/login');
      await page.fill('[data-testid="email-input"]', 'patient@test.com');
      await page.fill('[data-testid="password-input"]', 'TestPassword123!');
      await page.click('[data-testid="login-submit"]');
      await page.waitForURL(/.*\/patient\/dashboard/);
    });

    test('should discover nearby pharmacies', async () => {
      await page.click('[data-testid="find-pharmacy-button"]');
      await expect(page).toHaveURL(/.*\/discover/);

      // Allow location access (mock)
      await page.click('[data-testid="use-current-location"]');
      
      // Wait for pharmacies to load
      await expect(page.locator('[data-testid="pharmacy-list"]')).toBeVisible();
      await expect(page.locator('[data-testid="pharmacy-card"]').first()).toBeVisible();

      // Check pharmacy card content
      const firstPharmacy = page.locator('[data-testid="pharmacy-card"]').first();
      await expect(firstPharmacy.locator('[data-testid="pharmacy-name"]')).toBeVisible();
      await expect(firstPharmacy.locator('[data-testid="pharmacy-distance"]')).toBeVisible();
      await expect(firstPharmacy.locator('[data-testid="pharmacy-rating"]')).toBeVisible();
    });

    test('should filter pharmacies by services', async () => {
      await page.goto('http://localhost:3000/discover');
      
      // Apply delivery filter
      await page.check('[data-testid="filter-delivery"]');
      await page.click('[data-testid="apply-filters"]');
      
      // Wait for filtered results
      await page.waitForTimeout(1000);
      
      // Verify all displayed pharmacies offer delivery
      const pharmacyCards = page.locator('[data-testid="pharmacy-card"]');
      const count = await pharmacyCards.count();
      
      for (let i = 0; i < count; i++) {
        const card = pharmacyCards.nth(i);
        await expect(card.locator('[data-testid="delivery-badge"]')).toBeVisible();
      }
    });

    test('should search pharmacies by name', async () => {
      await page.goto('http://localhost:3000/discover');
      
      await page.fill('[data-testid="search-input"]', 'CVS');
      await page.click('[data-testid="search-button"]');
      
      await page.waitForTimeout(1000);
      
      const searchResults = page.locator('[data-testid="pharmacy-card"]');
      await expect(searchResults.first()).toBeVisible();
      
      // Verify search results contain CVS
      const firstResult = searchResults.first();
      await expect(firstResult.locator('[data-testid="pharmacy-name"]')).toContainText('CVS');
    });

    test('should view pharmacy details', async () => {
      await page.goto('http://localhost:3000/discover');
      
      await page.click('[data-testid="pharmacy-card"]');
      await expect(page).toHaveURL(/.*\/pharmacy\/[a-f0-9]{24}/);
      
      // Verify pharmacy details page
      await expect(page.locator('[data-testid="pharmacy-header"]')).toBeVisible();
      await expect(page.locator('[data-testid="operating-hours"]')).toBeVisible();
      await expect(page.locator('[data-testid="services-list"]')).toBeVisible();
      await expect(page.locator('[data-testid="contact-info"]')).toBeVisible();
    });
  });

  test.describe('Prescription Request Flow', () => {
    test.beforeEach(async () => {
      // Login as patient
      await page.goto('http://localhost:3000/login');
      await page.fill('[data-testid="email-input"]', 'patient@test.com');
      await page.fill('[data-testid="password-input"]', 'TestPassword123!');
      await page.click('[data-testid="login-submit"]');
      await page.waitForURL(/.*\/patient\/dashboard/);
    });

    test('should create new prescription request', async () => {
      await page.click('[data-testid="new-prescription-button"]');
      await expect(page).toHaveURL(/.*\/prescription\/new/);

      // Select pharmacy
      await page.click('[data-testid="select-pharmacy-button"]');
      await page.click('[data-testid="pharmacy-option"]');

      // Add medication
      await page.click('[data-testid="add-medication-button"]');
      await page.fill('[data-testid="medication-name"]', 'Aspirin');
      await page.fill('[data-testid="medication-dosage"]', '81mg');
      await page.fill('[data-testid="medication-quantity"]', '30');
      await page.selectOption('[data-testid="medication-frequency"]', 'Once daily');

      // Set delivery option
      await page.selectOption('[data-testid="delivery-option"]', 'pickup');

      // Add notes
      await page.fill('[data-testid="notes-textarea"]', 'Please call when ready');

      // Submit request
      await page.click('[data-testid="submit-request"]');

      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
      await expect(page).toHaveURL(/.*\/prescription-requests/);
    });

    test('should upload prescription image', async () => {
      await page.goto('http://localhost:3000/prescription/upload');

      // Upload file
      await page.setInputFiles('[data-testid="prescription-upload"]', {
        name: 'prescription.jpg',
        mimeType: 'image/jpeg',
        buffer: Buffer.from('fake-image-data')
      });

      await expect(page.locator('[data-testid="upload-preview"]')).toBeVisible();

      // Add metadata
      await page.fill('[data-testid="doctor-name"]', 'Dr. Smith');
      await page.fill('[data-testid="prescription-date"]', '2024-01-15');

      await page.click('[data-testid="submit-upload"]');

      await expect(page.locator('[data-testid="upload-success"]')).toBeVisible();
    });

    test('should view prescription request status', async () => {
      await page.goto('http://localhost:3000/prescription-requests');

      // Click on a prescription request
      await page.click('[data-testid="prescription-row"]');
      
      await expect(page.locator('[data-testid="prescription-details"]')).toBeVisible();
      await expect(page.locator('[data-testid="status-badge"]')).toBeVisible();
      await expect(page.locator('[data-testid="medication-list"]')).toBeVisible();
      await expect(page.locator('[data-testid="pharmacy-info"]')).toBeVisible();
    });

    test('should cancel prescription request', async () => {
      await page.goto('http://localhost:3000/prescription-requests');

      // Find a pending request
      const pendingRequest = page.locator('[data-testid="prescription-row"][data-status="pending"]').first();
      await pendingRequest.click();

      await page.click('[data-testid="cancel-request-button"]');
      
      // Confirm cancellation
      await page.click('[data-testid="confirm-cancel"]');

      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="status-badge"]')).toContainText('Cancelled');
    });
  });

  test.describe('Pharmacy Management Flow', () => {
    test.beforeEach(async () => {
      // Login as pharmacy
      await page.goto('http://localhost:3000/login');
      await page.fill('[data-testid="email-input"]', 'pharmacy@test.com');
      await page.fill('[data-testid="password-input"]', 'PharmacyPassword123!');
      await page.click('[data-testid="login-submit"]');
      await page.waitForURL(/.*\/pharmacy\/dashboard/);
    });

    test('should view pharmacy dashboard', async () => {
      await expect(page.locator('[data-testid="dashboard-header"]')).toBeVisible();
      await expect(page.locator('[data-testid="pending-requests-count"]')).toBeVisible();
      await expect(page.locator('[data-testid="ready-prescriptions-count"]')).toBeVisible();
      await expect(page.locator('[data-testid="today-revenue"]')).toBeVisible();
    });

    test('should manage prescription requests', async () => {
      await page.click('[data-testid="prescription-requests-tab"]');
      
      // View request details
      await page.click('[data-testid="request-row"]');
      await expect(page.locator('[data-testid="request-details"]')).toBeVisible();

      // Accept request
      await page.click('[data-testid="accept-request-button"]');
      await page.fill('[data-testid="estimated-time"]', '30');
      await page.click('[data-testid="confirm-accept"]');

      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    });

    test('should update prescription status', async () => {
      await page.goto('http://localhost:3000/pharmacy/prescriptions');

      const prescriptionRow = page.locator('[data-testid="prescription-row"]').first();
      await prescriptionRow.click();

      // Update status to ready
      await page.selectOption('[data-testid="status-select"]', 'ready');
      await page.fill('[data-testid="notes-input"]', 'Prescription is ready for pickup');
      await page.click('[data-testid="update-status"]');

      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    });

    test('should manage pharmacy profile', async () => {
      await page.click('[data-testid="profile-tab"]');
      
      // Update operating hours
      await page.selectOption('[data-testid="monday-open"]', '08:00');
      await page.selectOption('[data-testid="monday-close"]', '20:00');

      // Update services
      await page.check('[data-testid="service-compounding"]');
      await page.uncheck('[data-testid="service-vaccination"]');

      await page.click('[data-testid="save-profile"]');

      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    });
  });

  test.describe('Communication Features', () => {
    test.beforeEach(async () => {
      await page.goto('http://localhost:3000/login');
      await page.fill('[data-testid="email-input"]', 'patient@test.com');
      await page.fill('[data-testid="password-input"]', 'TestPassword123!');
      await page.click('[data-testid="login-submit"]');
      await page.waitForURL(/.*\/patient\/dashboard/);
    });

    test('should send message to pharmacy', async () => {
      await page.goto('http://localhost:3000/messages');

      await page.click('[data-testid="new-message-button"]');
      await page.selectOption('[data-testid="recipient-select"]', 'pharmacy');
      await page.fill('[data-testid="subject-input"]', 'Question about prescription');
      await page.fill('[data-testid="message-textarea"]', 'When will my prescription be ready?');

      await page.click('[data-testid="send-message"]');

      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    });

    test('should receive real-time notifications', async () => {
      // Simulate prescription status update
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('prescription-status-update', {
          detail: {
            prescriptionId: '123',
            status: 'ready',
            message: 'Your prescription is ready for pickup'
          }
        }));
      });

      await expect(page.locator('[data-testid="notification-toast"]')).toBeVisible();
      await expect(page.locator('[data-testid="notification-toast"]')).toContainText('ready for pickup');
    });
  });

  test.describe('Mobile Responsiveness', () => {
    test.beforeEach(async ({ browser }) => {
      context = await browser.newContext({
        viewport: { width: 375, height: 667 } // iPhone SE dimensions
      });
      page = await context.newPage();
    });

    test('should work on mobile devices', async () => {
      await page.goto('http://localhost:3000');

      // Check mobile navigation
      await expect(page.locator('[data-testid="mobile-menu-button"]')).toBeVisible();
      await page.click('[data-testid="mobile-menu-button"]');
      await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();

      // Test login on mobile
      await page.click('[data-testid="mobile-login-link"]');
      await page.fill('[data-testid="email-input"]', 'patient@test.com');
      await page.fill('[data-testid="password-input"]', 'TestPassword123!');
      await page.click('[data-testid="login-submit"]');

      await expect(page).toHaveURL(/.*\/patient\/dashboard/);
    });

    test('should handle touch interactions', async () => {
      await page.goto('http://localhost:3000/discover');

      // Test swipe gestures on pharmacy cards
      const pharmacyCard = page.locator('[data-testid="pharmacy-card"]').first();
      
      // Swipe left
      await pharmacyCard.hover();
      await page.mouse.down();
      await page.mouse.move(300, 0);
      await page.mouse.up();

      // Check if swipe actions are visible
      await expect(page.locator('[data-testid="swipe-actions"]')).toBeVisible();
    });
  });

  test.describe('Accessibility Features', () => {
    test('should support keyboard navigation', async () => {
      await page.goto('http://localhost:3000');

      // Navigate using Tab key
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Enter'); // Should activate login button

      await expect(page).toHaveURL(/.*\/login/);

      // Navigate form with keyboard
      await page.keyboard.press('Tab');
      await page.keyboard.type('patient@test.com');
      await page.keyboard.press('Tab');
      await page.keyboard.type('TestPassword123!');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Enter');

      await expect(page).toHaveURL(/.*\/patient\/dashboard/);
    });

    test('should have proper ARIA labels', async () => {
      await page.goto('http://localhost:3000/discover');

      // Check ARIA labels
      await expect(page.locator('[aria-label="Search pharmacies"]')).toBeVisible();
      await expect(page.locator('[aria-label="Filter options"]')).toBeVisible();
      await expect(page.locator('[role="main"]')).toBeVisible();
    });

    test('should support screen readers', async () => {
      await page.goto('http://localhost:3000');

      // Check for screen reader content
      await expect(page.locator('[data-testid="sr-only"]')).toHaveCSS('position', 'absolute');
      await expect(page.locator('h1')).toBeVisible();
    });
  });

  test.describe('Error Handling', () => {
    test('should handle network errors gracefully', async () => {
      // Simulate network failure
      await page.route('**/api/**', route => {
        route.abort('failed');
      });

      await page.goto('http://localhost:3000/discover');

      await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
    });

    test('should display meaningful error messages', async () => {
      await page.goto('http://localhost:3000/login');

      // Submit empty form
      await page.click('[data-testid="login-submit"]');

      await expect(page.locator('[data-testid="email-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="password-error"]')).toBeVisible();
    });

    test('should recover from errors', async () => {
      await page.goto('http://localhost:3000/nonexistent-page');

      await expect(page.locator('[data-testid="404-page"]')).toBeVisible();
      await page.click('[data-testid="home-link"]');

      await expect(page).toHaveURL('http://localhost:3000/');
    });
  });

  test.describe('Performance', () => {
    test('should load pages quickly', async () => {
      const startTime = Date.now();
      await page.goto('http://localhost:3000');
      await page.waitForLoadState('networkidle');
      const loadTime = Date.now() - startTime;

      expect(loadTime).toBeLessThan(3000); // Page should load in under 3 seconds
    });

    test('should handle large datasets', async () => {
      await page.goto('http://localhost:3000/discover');

      // Load many pharmacies
      await page.click('[data-testid="load-more-button"]');
      await page.waitForTimeout(1000);

      // Check if pagination works
      const pharmacyCards = page.locator('[data-testid="pharmacy-card"]');
      const count = await pharmacyCards.count();
      expect(count).toBeGreaterThan(10);
    });
  });
});

export default test;
