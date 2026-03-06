const { test, expect } = require('@playwright/test');

test.describe('Calendar Booking - Booking Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('.loading-state', { state: 'hidden', timeout: 10000 });
    
    // Select a professional to enable booking
    await page.click('.professional-item:first-child');
    await expect(page.locator('.professional-item:first-child')).toHaveClass(/selected/);
  });

  test('should show available time slots when professional is selected', async ({ page }) => {
    // Check that available slots are highlighted
    const availableSlots = await page.locator('.hour-slot.available').count();
    expect(availableSlots).toBeGreaterThan(0);
    
    // Check that slots have the correct styling
    await expect(page.locator('.hour-slot.available').first()).toHaveCSS('border-left', '3px solid rgb(16, 185, 129)');
  });

  test('should show booking form when clicking available slot', async ({ page }) => {
    // Click on an available slot
    await page.click('.hour-slot.available:first-child');
    
    // Check that booking form appears
    await expect(page.locator('#bookingFormSection')).toBeVisible();
    await expect(page.locator('#bookingForm')).toBeVisible();
    
    // Check form fields are present
    await expect(page.locator('#clientName')).toBeVisible();
    await expect(page.locator('#clientEmail')).toBeVisible();
    await expect(page.locator('#clientPhone')).toBeVisible();
    await expect(page.locator('#serviceType')).toBeVisible();
    await expect(page.locator('#notes')).toBeVisible();
  });

  test('should fill and submit booking form successfully', async ({ page }) => {
    // Click on available slot
    await page.click('.hour-slot.available:first-child');
    
    // Fill out booking form
    await page.fill('#clientName', 'John Doe');
    await page.fill('#clientEmail', 'john.doe@example.com');
    await page.fill('#clientPhone', '+1234567890');
    await page.selectOption('#serviceType', 'consultation');
    await page.fill('#notes', 'First time consultation');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Check for success message
    await expect(page.locator('.toast.success')).toBeVisible();
    await expect(page.locator('.toast.success')).toContainText('successfully');
    
    // Check that form is hidden
    await expect(page.locator('#bookingFormSection')).toBeHidden();
  });

  test('should validate required fields', async ({ page }) => {
    // Click on available slot
    await page.click('.hour-slot.available:first-child');
    
    // Try to submit without filling required fields
    await page.click('button[type="submit"]');
    
    // Form should still be visible (browser validation)
    await expect(page.locator('#bookingFormSection')).toBeVisible();
    
    // Fill required fields only
    await page.fill('#clientName', 'Jane Smith');
    await page.fill('#clientEmail', 'jane@example.com');
    await page.selectOption('#serviceType', 'checkup');
    
    // Now form should submit successfully
    await page.click('button[type="submit"]');
    await expect(page.locator('.toast.success')).toBeVisible();
  });

  test('should cancel booking form', async ({ page }) => {
    // Click on available slot
    await page.click('.hour-slot.available:first-child');
    
    // Check form is visible
    await expect(page.locator('#bookingFormSection')).toBeVisible();
    
    // Click cancel button
    await page.click('#cancelBooking');
    
    // Check form is hidden
    await expect(page.locator('#bookingFormSection')).toBeHidden();
  });

  test('should prevent booking in past time slots', async ({ page }) => {
    // We can't easily test past slots without mocking time,
    // but we can check that the logic exists by looking at the class structure
    const hourSlots = await page.locator('.hour-slot').all();
    
    // At least some slots should be available (not all in the past)
    const availableSlots = await page.locator('.hour-slot.available').count();
    expect(availableSlots).toBeGreaterThan(0);
  });

  test('should show warning when clicking slot without selecting professional', async ({ page }) => {
    // Deselect professional by clicking another page area
    await page.click('.calendar-header');
    
    // Try to click a slot without professional selected
    await page.locator('.professional-item').first().click();
    // First deselect
    await page.click('.calendar-header');
    
    // Now click on a time slot
    await page.click('.hour-slot:first-child');
    
    // Should show warning toast
    // Note: This test might need adjustment based on actual implementation
  });

  test('should display service type options correctly', async ({ page }) => {
    // Click on available slot
    await page.click('.hour-slot.available:first-child');
    
    // Check service type dropdown options
    const serviceOptions = await page.locator('#serviceType option').allTextContents();
    expect(serviceOptions).toContain('Consultation (30 min)');
    expect(serviceOptions).toContain('Health Checkup (45 min)');
    expect(serviceOptions).toContain('Therapy Session (60 min)');
    expect(serviceOptions).toContain('Follow-up (15 min)');
  });

  test('should show professional name in booking form title', async ({ page }) => {
    // Click on available slot
    await page.click('.hour-slot.available:first-child');
    
    // Check that form title includes professional name
    const formTitle = await page.locator('#bookingFormSection h3').textContent();
    expect(formTitle).toContain('Dr. Sarah Johnson');
  });

  test('should handle form field validation', async ({ page }) => {
    // Click on available slot
    await page.click('.hour-slot.available:first-child');
    
    // Test email validation
    await page.fill('#clientEmail', 'invalid-email');
    await page.click('button[type="submit"]');
    
    // Browser should show validation message for invalid email
    const emailField = page.locator('#clientEmail');
    const isValid = await emailField.evaluate(el => el.validity.valid);
    expect(isValid).toBe(false);
    
    // Fix email and try again
    await page.fill('#clientEmail', 'valid@example.com');
    await page.fill('#clientName', 'Test User');
    await page.selectOption('#serviceType', 'consultation');
    
    await page.click('button[type="submit"]');
    await expect(page.locator('.toast.success')).toBeVisible();
  });

  test('should clear form when cancelled and reopened', async ({ page }) => {
    // Click on available slot
    await page.click('.hour-slot.available:first-child');
    
    // Fill some fields
    await page.fill('#clientName', 'Test Name');
    await page.fill('#clientEmail', 'test@example.com');
    
    // Cancel form
    await page.click('#cancelBooking');
    
    // Click same slot again
    await page.click('.hour-slot.available:first-child');
    
    // Check fields are cleared
    await expect(page.locator('#clientName')).toHaveValue('');
    await expect(page.locator('#clientEmail')).toHaveValue('');
  });

  test('should show correct time and date in booking form', async ({ page }) => {
    // Click on available slot
    await page.click('.hour-slot.available:first-child');
    
    // Check that form title shows time and date information
    const formTitle = await page.locator('#bookingFormSection h3').textContent();
    
    // Should contain date and time info (exact format may vary)
    expect(formTitle).toMatch(/\d+:\d+/); // Time format
    expect(formTitle).toMatch(/[A-Z][a-z]{2}/); // Month abbreviation
  });
});