const { test, expect } = require('@playwright/test');

test.describe('Calendar Booking - Interface', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    // Wait for app to initialize
    await page.waitForSelector('.loading-state', { state: 'hidden', timeout: 10000 });
  });

  test('should display the main calendar interface', async ({ page }) => {
    // Check header elements
    await expect(page.locator('.app-title')).toHaveText('Calendar Booking');
    await expect(page.locator('.tagline')).toHaveText('Real-time professional scheduling');
    
    // Check connection status
    await expect(page.locator('.connection-status')).toBeVisible();
    
    // Check sidebar with professionals
    await expect(page.locator('.professionals-section h2')).toHaveText('Professionals');
    await expect(page.locator('.professional-item')).toHaveCount(4);
    
    // Check calendar header
    await expect(page.locator('.calendar-header')).toBeVisible();
    await expect(page.locator('#currentWeek')).toBeVisible();
    
    // Check calendar grid
    await expect(page.locator('.time-column')).toBeVisible();
    await expect(page.locator('.days-container')).toBeVisible();
  });

  test('should show professional information correctly', async ({ page }) => {
    const professionals = await page.locator('.professional-item').all();
    expect(professionals.length).toBe(4);
    
    // Check first professional
    const firstProf = professionals[0];
    await expect(firstProf.locator('.professional-name')).toContainText('Dr. Sarah Johnson');
    await expect(firstProf.locator('.professional-specialty')).toContainText('Cardiologist');
    await expect(firstProf.locator('.professional-avatar')).toContainText('SJ');
    await expect(firstProf.locator('.status-dot')).toBeVisible();
  });

  test('should allow professional selection', async ({ page }) => {
    // Select first professional
    await page.click('.professional-item:first-child');
    
    // Check if professional is selected
    await expect(page.locator('.professional-item:first-child')).toHaveClass(/selected/);
    
    // Select different professional
    await page.click('.professional-item:nth-child(2)');
    
    // Check selection changed
    await expect(page.locator('.professional-item:first-child')).not.toHaveClass(/selected/);
    await expect(page.locator('.professional-item:nth-child(2)')).toHaveClass(/selected/);
  });

  test('should filter professionals correctly', async ({ page }) => {
    // Check all professionals are visible initially
    await expect(page.locator('.professional-item')).toHaveCount(4);
    
    // Filter by available only
    await page.click('[data-filter="available"]');
    
    // Check filter is active
    await expect(page.locator('[data-filter="available"]')).toHaveClass(/active/);
    
    // Check that only available professionals are shown (3 out of 4)
    const visibleProfessionals = await page.locator('.professional-item:visible').count();
    expect(visibleProfessionals).toBe(3);
    
    // Switch back to all
    await page.click('[data-filter="all"]');
    await expect(page.locator('.professional-item')).toHaveCount(4);
  });

  test('should navigate calendar weeks', async ({ page }) => {
    // Get initial week title
    const initialWeek = await page.locator('#currentWeek').textContent();
    
    // Navigate to next week
    await page.click('#nextWeek');
    const nextWeek = await page.locator('#currentWeek').textContent();
    expect(nextWeek).not.toBe(initialWeek);
    
    // Navigate to previous week
    await page.click('#prevWeek');
    const backToInitial = await page.locator('#currentWeek').textContent();
    expect(backToInitial).toBe(initialWeek);
  });

  test('should have working "Today" button', async ({ page }) => {
    // Navigate away from today
    await page.click('#nextWeek');
    await page.click('#nextWeek');
    
    // Click Today button
    await page.click('#todayBtn');
    
    // Check that today's date is highlighted
    await expect(page.locator('.day-header.today')).toBeVisible();
  });

  test('should switch between week and day views', async ({ page }) => {
    // Check initial week view
    await expect(page.locator('[data-view="week"]')).toHaveClass(/active/);
    await expect(page.locator('.day-column')).toHaveCount(7);
    
    // Switch to day view
    await page.click('[data-view="day"]');
    await expect(page.locator('[data-view="day"]')).toHaveClass(/active/);
    await expect(page.locator('.day-column')).toHaveCount(1);
    
    // Switch back to week view
    await page.click('[data-view="week"]');
    await expect(page.locator('[data-view="week"]')).toHaveClass(/active/);
    await expect(page.locator('.day-column')).toHaveCount(7);
  });

  test('should display time slots correctly', async ({ page }) => {
    // Check time slots are present (9 AM to 5 PM = 8 hours)
    const timeSlots = await page.locator('.time-slot').count();
    expect(timeSlots).toBe(8);
    
    // Check first and last time slots
    await expect(page.locator('.time-slot').first()).toContainText('9:00 AM');
    await expect(page.locator('.time-slot').last()).toContainText('4:00 PM');
  });

  test('should show current day highlighted', async ({ page }) => {
    // Check that today's column has the special styling
    const todayHeaders = await page.locator('.day-header.today').count();
    expect(todayHeaders).toBe(1);
  });

  test('should display day names and numbers correctly', async ({ page }) => {
    const dayHeaders = await page.locator('.day-header').all();
    expect(dayHeaders.length).toBe(7);
    
    // Each header should have day name and number
    for (const header of dayHeaders) {
      await expect(header.locator('.day-name')).toBeVisible();
      await expect(header.locator('.day-number')).toBeVisible();
    }
  });

  test('should have proper responsive layout', async ({ page }) => {
    // Check that main layout components are properly positioned
    await expect(page.locator('.main-content')).toHaveCSS('display', 'flex');
    await expect(page.locator('.sidebar')).toBeVisible();
    await expect(page.locator('.calendar-section')).toBeVisible();
    
    // Test mobile responsiveness
    await page.setViewportSize({ width: 768, height: 1024 });
    
    // Check that layout adapts (sidebar should be full width on mobile)
    await expect(page.locator('.sidebar')).toBeVisible();
    await expect(page.locator('.calendar-section')).toBeVisible();
  });
});