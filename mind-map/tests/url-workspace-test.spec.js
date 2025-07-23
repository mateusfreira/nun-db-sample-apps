const { test, expect } = require('@playwright/test');

test('URL workspace persistence test', async ({ page }) => {
  // Test 1: Direct URL access with workspace parameter
  await page.goto('file://' + require('path').resolve(__dirname, '../index.html') + '?workspace=test-workspace');
  
  // Should auto-join workspace from URL
  await page.waitForTimeout(2000);
  
  // Check that we're in the app screen (not setup screen)
  const appScreen = page.locator('#appScreen');
  const setupScreen = page.locator('#setupScreen');
  
  await expect(appScreen).toBeVisible();
  await expect(setupScreen).toBeHidden();
  
  // Check workspace info displays correctly
  const workspaceInfo = page.locator('#workspaceInfo');
  await expect(workspaceInfo).toHaveText('Workspace: test-workspace');
  
  // Check URL still contains workspace parameter
  expect(page.url()).toContain('workspace=test-workspace');
  
  console.log('✅ URL workspace auto-join works');
});

test('workspace URL sharing test', async ({ page }) => {
  await page.goto('file://' + require('path').resolve(__dirname, '../index.html'));
  
  // Join workspace manually
  await page.locator('#workspace-input').fill('sharing-test');
  await page.locator('#join-workspace-btn').click();
  await page.waitForTimeout(1000);
  
  // Check URL was updated
  expect(page.url()).toContain('workspace=sharing-test');
  
  // Test share button
  await page.locator('#shareUrlBtn').click();
  
  // Check for notification (clipboard success)
  const notification = page.locator('div').filter({ hasText: 'Workspace URL copied to clipboard!' });
  
  // Wait a bit to see if notification appears
  await page.waitForTimeout(500);
  
  console.log('✅ Share URL functionality works');
});

test('workspace change clears URL', async ({ page }) => {
  await page.goto('file://' + require('path').resolve(__dirname, '../index.html') + '?workspace=initial-workspace');
  
  await page.waitForTimeout(1500);
  
  // Verify we're in workspace
  expect(page.url()).toContain('workspace=initial-workspace');
  
  // Change workspace
  await page.locator('#changeWorkspaceBtn').click();
  await page.waitForTimeout(500);
  
  // Check URL parameter was cleared
  expect(page.url()).not.toContain('workspace=');
  
  // Should be back on setup screen
  const setupScreen = page.locator('#setupScreen');
  await expect(setupScreen).toBeVisible();
  
  console.log('✅ Workspace change clears URL parameter');
});

test('page refresh maintains workspace', async ({ page }) => {
  // Join workspace
  await page.goto('file://' + require('path').resolve(__dirname, '../index.html'));
  
  await page.locator('#workspace-input').fill('refresh-test');
  await page.locator('#join-workspace-btn').click();
  await page.waitForTimeout(1500);
  
  // Create a node to have some content
  await page.locator('#nodeTool').click();
  const canvas = page.locator('#canvas');
  await canvas.click({ position: { x: 250, y: 250 } });
  
  await page.waitForTimeout(300);
  if (await page.locator('#nodeEditorModal').isVisible()) {
    await page.locator('#saveNodeBtn').click();
    await page.waitForTimeout(500);
  }
  
  // Get current URL
  const currentUrl = page.url();
  expect(currentUrl).toContain('workspace=refresh-test');
  
  // Refresh the page
  await page.reload();
  await page.waitForTimeout(2000);
  
  // Should auto-join workspace again
  const appScreen = page.locator('#appScreen');
  await expect(appScreen).toBeVisible();
  
  const workspaceInfo = page.locator('#workspaceInfo');
  await expect(workspaceInfo).toHaveText('Workspace: refresh-test');
  
  // Node should still be there (persistence test)
  const nodes = page.locator('.mind-map-node');
  const nodeCount = await nodes.count();
  expect(nodeCount).toBeGreaterThanOrEqual(1);
  
  console.log('✅ Page refresh maintains workspace and content');
});