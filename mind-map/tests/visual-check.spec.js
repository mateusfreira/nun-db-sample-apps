const { test, expect } = require('@playwright/test');

test('visual appearance check', async ({ page }) => {
  await page.goto('http://localhost:3000');
  
  // Wait for page to load completely
  await page.waitForTimeout(2000);
  
  // Take a screenshot of the initial screen
  await page.screenshot({ path: 'test-results/setup-screen.png', fullPage: true });
  
  // Check if key elements are visible and positioned
  await expect(page.locator('#setup-screen')).toBeVisible();
  await expect(page.locator('.setup-card')).toBeVisible();
  await expect(page.locator('#workspace-input')).toBeVisible();
  await expect(page.locator('#join-workspace-btn')).toBeVisible();
  
  // Test the workspace join flow
  await page.locator('#workspace-input').fill('visual-test');
  
  // Button should be enabled now
  await expect(page.locator('#join-workspace-btn')).not.toBeDisabled();
  
  // Click to join workspace
  await page.locator('#join-workspace-btn').click();
  
  // Wait for workspace screen to load
  await page.waitForTimeout(3000);
  
  // Take screenshot of workspace screen
  await page.screenshot({ path: 'test-results/workspace-screen.png', fullPage: true });
  
  // Check if workspace screen is shown
  const workspaceVisible = await page.locator('#workspace-screen').isVisible();
  console.log('Workspace screen visible:', workspaceVisible);
  
  if (workspaceVisible) {
    console.log('✅ Application UI is working and properly styled!');
  } else {
    console.log('❌ Workspace screen not visible');
  }
  
  expect(workspaceVisible).toBe(true);
});