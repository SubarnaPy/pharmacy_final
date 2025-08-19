import { test, expect } from '@playwright/test';

test.describe('Doctor Profile Management - E2E Tests', () => {
  let page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    
    // Mock authentication
    await page.route('**/api/auth/**', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            token: 'mock-jwt-token',
            user: {
              id: 'doctor123',
              role: 'doctor',
              email: 'testdoctor@example.com'
            }
          }
        })
      });
    });

    // Mock doctor profile API
    await page.route('**/api/doctors/*/profile/full', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            id: 'doctor123',
            personalInfo: {
              firstName: 'John',
              lastName: 'Doe',
              email: 'john.doe@example.com',
              phone: '+1234567890',
              address: '123 Main St, City, State'
            },
            medicalLicense: {
              licenseNumber: 'MD123456',
              issuingAuthority: 'State Medical Board',
              issueDate: '2020-01-01',
              expiryDate: '2025-01-01',
              verificationStatus: 'verified'
            },
            specializations: ['Cardiology', 'Internal Medicine'],
            qualifications: [{
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
            }
          }
        })
      });
    });

    // Navigate to doctor profile page
    await page.goto('/doctor/profile');
    await page.waitForLoadState('networkidle');
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('should load and display complete doctor profile', async () => {
    // Verify profile sections are visible
    await expect(page.locator('[data-testid="personal-info-section"]')).toBeVisible();
    await expect(page.locator('[data-testid="medical-license-section"]')).toBeVisible();
    await expect(page.locator('[data-testid="specializations-section"]')).toBeVisible();
    await expect(page.locator('[data-testid="qualifications-section"]')).toBeVisible();

    // Verify personal information is displayed
    await expect(page.locator('input[name="firstName"]')).toHaveValue('John');
    await expect(page.locator('input[name="lastName"]')).toHaveValue('Doe');
    await expect(page.locator('input[name="email"]')).toHaveValue('john.doe@example.com');
    await expect(page.locator('input[name="phone"]')).toHaveValue('+1234567890');

    // Verify specializations are displayed
    await expect(page.locator('text=Cardiology')).toBeVisible();
    await expect(page.locator('text=Internal Medicine')).toBeVisible();
  });

  test('should complete personal information update workflow', async () => {
    // Mock profile update API
    await page.route('**/api/doctors/*/profile/section', route => {
      const request = route.request();
      const postData = JSON.parse(request.postData());
      
      if (postData.section === 'personalInfo') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              personalInfo: postData.data
            }
          })
        });
      }
    });

    // Navigate to personal info section
    await page.click('[data-testid="personal-info-tab"]');
    
    // Click edit button
    await page.click('[data-testid="edit-personal-info"]');
    
    // Update fields
    await page.fill('input[name="firstName"]', 'Jane');
    await page.fill('input[name="lastName"]', 'Smith');
    await page.fill('input[name="phone"]', '+1987654321');
    
    // Save changes
    await page.click('[data-testid="save-personal-info"]');
    
    // Wait for success message
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="success-message"]')).toContainText('Profile updated successfully');
    
    // Verify fields are updated
    await expect(page.locator('input[name="firstName"]')).toHaveValue('Jane');
    await expect(page.locator('input[name="lastName"]')).toHaveValue('Smith');
    await expect(page.locator('input[name="phone"]')).toHaveValue('+1987654321');
  });

  test('should handle validation errors during profile update', async () => {
    // Mock validation error response
    await page.route('**/api/doctors/*/profile/section', route => {
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          errors: {
            firstName: 'First name is required',
            email: 'Invalid email format'
          }
        })
      });
    });

    // Navigate to personal info section
    await page.click('[data-testid="personal-info-tab"]');
    
    // Click edit button
    await page.click('[data-testid="edit-personal-info"]');
    
    // Clear required field and enter invalid email
    await page.fill('input[name="firstName"]', '');
    await page.fill('input[name="email"]', 'invalid-email');
    
    // Try to save
    await page.click('[data-testid="save-personal-info"]');
    
    // Verify error messages are displayed
    await expect(page.locator('[data-testid="error-firstName"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-firstName"]')).toContainText('First name is required');
    await expect(page.locator('[data-testid="error-email"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-email"]')).toContainText('Invalid email format');
    
    // Verify form is still in edit mode
    await expect(page.locator('[data-testid="save-personal-info"]')).toBeVisible();
    await expect(page.locator('[data-testid="cancel-personal-info"]')).toBeVisible();
  });

  test('should complete medical license update workflow', async () => {
    // Mock license update API
    await page.route('**/api/doctors/*/profile/section', route => {
      const request = route.request();
      const postData = JSON.parse(request.postData());
      
      if (postData.section === 'medicalLicense') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              medicalLicense: postData.data
            }
          })
        });
      }
    });

    // Navigate to medical license section
    await page.click('[data-testid="medical-license-tab"]');
    
    // Click edit button
    await page.click('[data-testid="edit-medical-license"]');
    
    // Update license information
    await page.fill('input[name="licenseNumber"]', 'MD789012');
    await page.fill('input[name="issuingAuthority"]', 'Updated Medical Board');
    await page.fill('input[name="expiryDate"]', '2026-12-31');
    
    // Save changes
    await page.click('[data-testid="save-medical-license"]');
    
    // Wait for success message
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    
    // Verify fields are updated
    await expect(page.locator('input[name="licenseNumber"]')).toHaveValue('MD789012');
    await expect(page.locator('input[name="issuingAuthority"]')).toHaveValue('Updated Medical Board');
  });

  test('should complete specializations management workflow', async () => {
    // Mock specializations update API
    await page.route('**/api/doctors/*/profile/section', route => {
      const request = route.request();
      const postData = JSON.parse(request.postData());
      
      if (postData.section === 'specializations') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              specializations: postData.data
            }
          })
        });
      }
    });

    // Navigate to specializations section
    await page.click('[data-testid="specializations-tab"]');
    
    // Click edit button
    await page.click('[data-testid="edit-specializations"]');
    
    // Remove existing specialization
    await page.click('[data-testid="remove-specialization-Cardiology"]');
    
    // Add new specialization
    await page.click('[data-testid="add-specialization"]');
    await page.selectOption('[data-testid="specialization-select"]', 'Neurology');
    await page.click('[data-testid="confirm-add-specialization"]');
    
    // Save changes
    await page.click('[data-testid="save-specializations"]');
    
    // Wait for success message
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    
    // Verify specializations are updated
    await expect(page.locator('text=Neurology')).toBeVisible();
    await expect(page.locator('text=Internal Medicine')).toBeVisible();
    await expect(page.locator('text=Cardiology')).not.toBeVisible();
  });

  test('should complete consultation modes configuration workflow', async () => {
    // Mock consultation modes update API
    await page.route('**/api/doctors/*/profile/section', route => {
      const request = route.request();
      const postData = JSON.parse(request.postData());
      
      if (postData.section === 'consultationModes') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              consultationModes: postData.data
            }
          })
        });
      }
    });

    // Navigate to consultation modes section
    await page.click('[data-testid="consultation-modes-tab"]');
    
    // Click edit button
    await page.click('[data-testid="edit-consultation-modes"]');
    
    // Enable email consultation
    await page.check('[data-testid="enable-email-consultation"]');
    await page.fill('[data-testid="email-consultation-fee"]', '30');
    
    // Update video consultation fee
    await page.fill('[data-testid="video-consultation-fee"]', '120');
    await page.fill('[data-testid="video-consultation-duration"]', '60');
    
    // Save changes
    await page.click('[data-testid="save-consultation-modes"]');
    
    // Wait for success message
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    
    // Verify consultation modes are updated
    await expect(page.locator('[data-testid="email-consultation-enabled"]')).toBeChecked();
    await expect(page.locator('[data-testid="video-consultation-fee"]')).toHaveValue('120');
  });

  test('should complete availability configuration workflow', async () => {
    // Mock availability update API
    await page.route('**/api/doctors/*/profile/section', route => {
      const request = route.request();
      const postData = JSON.parse(request.postData());
      
      if (postData.section === 'availability') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              availability: postData.data
            }
          })
        });
      }
    });

    // Navigate to availability section
    await page.click('[data-testid="availability-tab"]');
    
    // Click edit button
    await page.click('[data-testid="edit-availability"]');
    
    // Update Monday working hours
    await page.fill('[data-testid="monday-start-time"]', '08:00');
    await page.fill('[data-testid="monday-end-time"]', '18:00');
    
    // Disable Tuesday
    await page.uncheck('[data-testid="tuesday-available"]');
    
    // Update time slot duration
    await page.fill('[data-testid="time-slot-duration"]', '45');
    
    // Save changes
    await page.click('[data-testid="save-availability"]');
    
    // Wait for success message
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    
    // Verify availability is updated
    await expect(page.locator('[data-testid="monday-start-time"]')).toHaveValue('08:00');
    await expect(page.locator('[data-testid="monday-end-time"]')).toHaveValue('18:00');
    await expect(page.locator('[data-testid="tuesday-available"]')).not.toBeChecked();
  });

  test('should handle unsaved changes warning', async () => {
    // Navigate to personal info section
    await page.click('[data-testid="personal-info-tab"]');
    
    // Click edit button
    await page.click('[data-testid="edit-personal-info"]');
    
    // Make changes without saving
    await page.fill('input[name="firstName"]', 'Changed Name');
    
    // Try to navigate to another section
    await page.click('[data-testid="medical-license-tab"]');
    
    // Verify unsaved changes warning appears
    await expect(page.locator('[data-testid="unsaved-changes-modal"]')).toBeVisible();
    await expect(page.locator('[data-testid="unsaved-changes-modal"]')).toContainText('You have unsaved changes');
    
    // Click stay to remain on current section
    await page.click('[data-testid="stay-on-section"]');
    
    // Verify we're still on personal info section
    await expect(page.locator('[data-testid="personal-info-section"]')).toBeVisible();
    await expect(page.locator('input[name="firstName"]')).toHaveValue('Changed Name');
  });

  test('should complete document upload workflow', async () => {
    // Mock document upload API
    await page.route('**/api/doctors/*/documents', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            documentId: 'doc123',
            documentUrl: 'https://example.com/documents/doc123.pdf',
            documentType: 'medicalLicense'
          }
        })
      });
    });

    // Navigate to medical license section
    await page.click('[data-testid="medical-license-tab"]');
    
    // Click edit button
    await page.click('[data-testid="edit-medical-license"]');
    
    // Upload document
    const fileInput = page.locator('[data-testid="license-document-upload"]');
    await fileInput.setInputFiles({
      name: 'license.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('mock pdf content')
    });
    
    // Wait for upload to complete
    await expect(page.locator('[data-testid="upload-success"]')).toBeVisible();
    await expect(page.locator('[data-testid="upload-success"]')).toContainText('Document uploaded successfully');
    
    // Verify document is displayed
    await expect(page.locator('[data-testid="uploaded-document"]')).toBeVisible();
    await expect(page.locator('[data-testid="document-name"]')).toContainText('license.pdf');
  });

  test('should handle network errors gracefully', async () => {
    // Mock network error
    await page.route('**/api/doctors/*/profile/section', route => {
      route.abort('failed');
    });

    // Navigate to personal info section
    await page.click('[data-testid="personal-info-tab"]');
    
    // Click edit button
    await page.click('[data-testid="edit-personal-info"]');
    
    // Make changes
    await page.fill('input[name="firstName"]', 'Network Test');
    
    // Try to save
    await page.click('[data-testid="save-personal-info"]');
    
    // Verify error message is displayed
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Network error');
    
    // Verify retry button is available
    await expect(page.locator('[data-testid="retry-save"]')).toBeVisible();
  });

  test('should maintain form state during navigation', async () => {
    // Navigate to personal info section
    await page.click('[data-testid="personal-info-tab"]');
    
    // Click edit button
    await page.click('[data-testid="edit-personal-info"]');
    
    // Make changes
    await page.fill('input[name="firstName"]', 'State Test');
    await page.fill('input[name="lastName"]', 'Navigation');
    
    // Navigate to another section and back
    await page.click('[data-testid="medical-license-tab"]');
    await page.click('[data-testid="discard-changes"]'); // Discard unsaved changes warning
    await page.click('[data-testid="personal-info-tab"]');
    
    // Verify original values are restored (changes were discarded)
    await expect(page.locator('input[name="firstName"]')).toHaveValue('John');
    await expect(page.locator('input[name="lastName"]')).toHaveValue('Doe');
  });

  test('should show loading states during operations', async () => {
    // Mock slow API response
    await page.route('**/api/doctors/*/profile/section', async route => {
      await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { personalInfo: { firstName: 'Updated' } }
        })
      });
    });

    // Navigate to personal info section
    await page.click('[data-testid="personal-info-tab"]');
    
    // Click edit button
    await page.click('[data-testid="edit-personal-info"]');
    
    // Make changes
    await page.fill('input[name="firstName"]', 'Loading Test');
    
    // Save changes
    await page.click('[data-testid="save-personal-info"]');
    
    // Verify loading state is shown
    await expect(page.locator('[data-testid="saving-indicator"]')).toBeVisible();
    await expect(page.locator('[data-testid="save-personal-info"]')).toBeDisabled();
    
    // Wait for operation to complete
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible({ timeout: 5000 });
    
    // Verify loading state is hidden
    await expect(page.locator('[data-testid="saving-indicator"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="save-personal-info"]')).not.toBeDisabled();
  });
});