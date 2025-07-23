const { test, expect } = require('@playwright/test');

test('debug application loading', async ({ page }) => {
  // Log all console messages
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  
  // Log all page errors
  page.on('pageerror', error => console.log('PAGE ERROR:', error));
  
  await page.goto('http://localhost:3000');
  
  // Wait for page to load
  await page.waitForTimeout(2000);
  
  // Check if basic elements exist
  const setupScreen = await page.locator('#setup-screen').isVisible();
  console.log('Setup screen visible:', setupScreen);
  
  const workspaceInput = await page.locator('#workspace-input').isVisible();
  console.log('Workspace input visible:', workspaceInput);
  
  const joinButton = await page.locator('#join-workspace-btn').isVisible();
  console.log('Join button visible:', joinButton);
  
  // Check if join button is disabled
  const isDisabled = await page.locator('#join-workspace-btn').isDisabled();
  console.log('Join button disabled:', isDisabled);
  
  // Try typing in the input
  await page.locator('#workspace-input').fill('test-workspace');
  await page.waitForTimeout(500);
  
  // Check if button is now enabled
  const isStillDisabled = await page.locator('#join-workspace-btn').isDisabled();
  console.log('Join button still disabled after typing:', isStillDisabled);
  
  // Check if any JavaScript errors occurred
  const hasApp = await page.evaluate(() => {
    return typeof window.mindMapApp !== 'undefined';
  });
  console.log('MindMapApp instance exists:', hasApp);
  
  expect(setupScreen).toBe(true);
  expect(workspaceInput).toBe(true);
  expect(joinButton).toBe(true);
});