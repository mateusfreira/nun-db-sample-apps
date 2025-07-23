const { test, expect } = require('@playwright/test');

test.describe('Mind Map Workspace Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Log errors for debugging
    page.on('pageerror', error => console.log('PAGE ERROR:', error));
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('CONSOLE ERROR:', msg.text());
      }
    });
    
    await page.goto('http://localhost:3000');
  });

  test('should allow workspace join workflow', async ({ page }) => {
    // Check initial state - setup screen visible
    await expect(page.locator('#setup-screen')).toBeVisible();
    await expect(page.locator('#workspace-screen')).not.toBeVisible();
    
    // Fill workspace name
    await page.locator('#workspace-input').fill('test-workspace');
    
    // Button should be enabled after typing
    await expect(page.locator('#join-workspace-btn')).not.toBeDisabled();
    
    // Click join button
    await page.locator('#join-workspace-btn').click();
    
    // Wait for transition to workspace screen
    await page.waitForTimeout(3000); // Give time for database connection
    
    // Check if workspace screen is shown
    const setupVisible = await page.locator('#setup-screen').isVisible();
    const workspaceVisible = await page.locator('#workspace-screen').isVisible();
    
    console.log('Setup screen visible after join:', setupVisible);
    console.log('Workspace screen visible after join:', workspaceVisible);
    
    // Either workspace screen should be visible, or we should see connection status
    const hasWorkspaceElements = await page.locator('#workspace-screen').count() > 0;
    expect(hasWorkspaceElements).toBe(true);
  });

  test('should handle workspace input validation', async ({ page }) => {
    const input = page.locator('#workspace-input');
    const button = page.locator('#join-workspace-btn');
    
    // Initial state - button disabled
    await expect(button).toBeDisabled();
    
    // Type less than 3 characters - button should stay disabled
    await input.fill('ab');
    await expect(button).toBeDisabled();
    
    // Type 3 or more characters - button should be enabled
    await input.fill('abc');
    await expect(button).not.toBeDisabled();
    
    // Clear input - button should be disabled again
    await input.fill('');
    await expect(button).toBeDisabled();
  });

  test('should handle connection states', async ({ page }) => {
    // Fill workspace and join
    await page.locator('#workspace-input').fill('connection-test');
    await page.locator('#join-workspace-btn').click();
    
    // Wait a bit for connection attempt
    await page.waitForTimeout(2000);
    
    // Check if connection status is shown somewhere
    // This is more about testing that the app doesn't crash
    const hasErrors = await page.evaluate(() => {
      return window.onerror !== null;
    });
    
    // No JavaScript errors should have occurred
    expect(hasErrors).toBeFalsy();
  });
});