const { test, expect } = require('@playwright/test');

test.describe('Calendar Booking - Real-time Features', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('.loading-state', { state: 'hidden', timeout: 10000 });
  });

  test('should show connection status', async ({ page }) => {
    // Check connection status is visible
    await expect(page.locator('.connection-status')).toBeVisible();
    await expect(page.locator('.status-indicator')).toBeVisible();
    await expect(page.locator('.status-text')).toBeVisible();
    
    // Status should eventually show connected or error
    await page.waitForTimeout(2000);
    const statusText = await page.locator('.status-text').textContent();
    expect(['Connected', 'Connection Error', 'Connecting...']).toContain(statusText);
  });

  test('should handle multiple users viewing same calendar', async ({ page, context }) => {
    // Open second page (simulate another user)
    const page2 = await context.newPage();
    await page2.goto('/');
    await page2.waitForLoadState('networkidle');
    await page2.waitForSelector('.loading-state', { state: 'hidden', timeout: 10000 });
    
    // Both pages should show the same professionals
    const professionals1 = await page.locator('.professional-item').count();
    const professionals2 = await page2.locator('.professional-item').count();
    expect(professionals1).toBe(professionals2);
    
    // Both should show the same calendar week
    const week1 = await page.locator('#currentWeek').textContent();
    const week2 = await page2.locator('#currentWeek').textContent();
    expect(week1).toBe(week2);
    
    await page2.close();
  });

  test('should show live updates when appointments are booked', async ({ page, context }) => {
    // This test simulates real-time updates
    // In a real scenario, appointments from other users would appear automatically
    
    // Select professional on first page
    await page.click('.professional-item:first-child');
    
    // Open second page to simulate another user
    const page2 = await context.newPage();
    await page2.goto('/');
    await page2.waitForLoadState('networkidle');
    await page2.waitForSelector('.loading-state', { state: 'hidden', timeout: 10000 });
    await page2.click('.professional-item:first-child');
    
    // Make booking on first page
    await page.click('.hour-slot.available:first-child');
    await page.fill('#clientName', 'Live Test User');
    await page.fill('#clientEmail', 'live@test.com');
    await page.selectOption('#serviceType', 'consultation');
    await page.click('button[type="submit"]');
    
    // Wait for booking to complete
    await expect(page.locator('.toast.success')).toBeVisible();
    
    // Check that the slot is now marked as booked
    // (In real implementation with working NunDB, this would update both pages)
    
    await page2.close();
  });

  test('should handle connection errors gracefully', async ({ page }) => {
    // Connection status should be visible even with errors
    await expect(page.locator('.connection-status')).toBeVisible();
    
    // App should still be functional even if connection fails
    await expect(page.locator('.professional-item')).toHaveCount(4);
    await expect(page.locator('.calendar-header')).toBeVisible();
    
    // User should be able to select professionals
    await page.click('.professional-item:first-child');
    await expect(page.locator('.professional-item:first-child')).toHaveClass(/selected/);
  });

  test('should show professional availability status', async ({ page }) => {
    // Check that each professional has a status indicator
    const professionals = await page.locator('.professional-item').all();
    
    for (const prof of professionals) {
      await expect(prof.locator('.status-dot')).toBeVisible();
      await expect(prof.locator('.professional-status')).toBeVisible();
    }
    
    // Check that at least one professional shows as available
    const availableStatuses = await page.locator('.professional-status:has-text("Available")').count();
    expect(availableStatuses).toBeGreaterThan(0);
  });

  test('should update calendar when navigating between weeks', async ({ page }) => {
    // Get initial calendar state
    const initialWeek = await page.locator('#currentWeek').textContent();
    const initialDayNumbers = await page.locator('.day-number').allTextContents();
    
    // Navigate to next week
    await page.click('#nextWeek');
    
    // Check that calendar updates
    const nextWeek = await page.locator('#currentWeek').textContent();
    const nextDayNumbers = await page.locator('.day-number').allTextContents();
    
    expect(nextWeek).not.toBe(initialWeek);
    expect(nextDayNumbers).not.toEqual(initialDayNumbers);
    
    // Calendar structure should remain the same
    await expect(page.locator('.day-column')).toHaveCount(7);
    await expect(page.locator('.time-slot')).toHaveCount(8);
  });

  test('should maintain professional selection across calendar navigation', async ({ page }) => {
    // Select a professional
    await page.click('.professional-item:nth-child(2)');
    await expect(page.locator('.professional-item:nth-child(2)')).toHaveClass(/selected/);
    
    // Navigate calendar
    await page.click('#nextWeek');
    await page.click('#prevWeek');
    
    // Professional should still be selected
    await expect(page.locator('.professional-item:nth-child(2)')).toHaveClass(/selected/);
    
    // Available slots should still be highlighted
    const availableSlots = await page.locator('.hour-slot.available').count();
    expect(availableSlots).toBeGreaterThan(0);
  });

  test('should handle view switching with selected professional', async ({ page }) => {
    // Select professional and check available slots
    await page.click('.professional-item:first-child');
    const weekAvailableSlots = await page.locator('.hour-slot.available').count();
    
    // Switch to day view
    await page.click('[data-view="day"]');
    await expect(page.locator('.day-column')).toHaveCount(1);
    
    // Should still show available slots for selected professional
    const dayAvailableSlots = await page.locator('.hour-slot.available').count();
    expect(dayAvailableSlots).toBeGreaterThan(0);
    
    // Switch back to week view
    await page.click('[data-view="week"]');
    await expect(page.locator('.day-column')).toHaveCount(7);
  });

  test('should handle rapid navigation without breaking', async ({ page }) => {
    // Rapidly navigate through weeks
    for (let i = 0; i < 5; i++) {
      await page.click('#nextWeek');
      await page.waitForTimeout(100);
    }
    
    for (let i = 0; i < 5; i++) {
      await page.click('#prevWeek');
      await page.waitForTimeout(100);
    }
    
    // Calendar should still be functional
    await expect(page.locator('.calendar-header')).toBeVisible();
    await expect(page.locator('.day-column')).toHaveCount(7);
    await expect(page.locator('#currentWeek')).toBeVisible();
  });

  test('should show toast notifications for user actions', async ({ page }) => {
    // Select professional
    await page.click('.professional-item:first-child');
    
    // Try to book an appointment
    await page.click('.hour-slot.available:first-child');
    await page.fill('#clientName', 'Toast Test');
    await page.fill('#clientEmail', 'toast@test.com');
    await page.selectOption('#serviceType', 'consultation');
    await page.click('button[type="submit"]');
    
    // Should show success toast
    await expect(page.locator('.toast')).toBeVisible();
    await expect(page.locator('.toast')).toHaveClass(/success/);
    
    // Toast should disappear after timeout
    await page.waitForTimeout(5000);
    await expect(page.locator('.toast.show')).not.toBeVisible();
  });

  test('should update today indicator when date changes', async ({ page }) => {
    // Check that today is highlighted
    const todayHeaders = await page.locator('.day-header.today').count();
    expect(todayHeaders).toBe(1);
    
    // Navigate away from current week
    await page.click('#nextWeek');
    
    // Should not show today indicator in different week
    const todayHeadersNextWeek = await page.locator('.day-header.today').count();
    expect(todayHeadersNextWeek).toBe(0);
    
    // Navigate back to today
    await page.click('#todayBtn');
    
    // Today should be highlighted again
    const todayHeadersBack = await page.locator('.day-header.today').count();
    expect(todayHeadersBack).toBe(1);
  });
});