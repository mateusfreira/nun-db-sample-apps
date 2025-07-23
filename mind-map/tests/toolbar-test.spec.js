const { test, expect } = require('@playwright/test');

test('toolbar functionality verification', async ({ page }) => {
  await page.goto('http://localhost:3000');
  
  // Join a workspace to see the toolbar
  await page.locator('#workspace-input').fill('toolbar-test');
  await page.locator('#join-workspace-btn').click();
  
  // Wait for workspace screen and toolbar to load
  await page.waitForTimeout(3000);
  
  // Check if toolbar elements are created dynamically
  const toolbarSections = await page.locator('.toolbar-section').count();
  console.log('Number of toolbar sections:', toolbarSections);
  
  // Check if tool buttons exist
  const selectTool = page.locator('[data-tool="select"]');
  const nodeTool = page.locator('[data-tool="node"]');
  const connectionTool = page.locator('[data-tool="connection"]');
  const deleteTool = page.locator('[data-tool="delete"]');
  
  // Verify all basic tools exist
  await expect(selectTool).toBeVisible();
  await expect(nodeTool).toBeVisible();
  await expect(connectionTool).toBeVisible();
  await expect(deleteTool).toBeVisible();
  
  // Check if select tool is active by default
  await expect(selectTool).toHaveClass(/active/);
  
  // Test tool switching
  await nodeTool.click();
  await expect(nodeTool).toHaveClass(/active/);
  await expect(selectTool).not.toHaveClass(/active/);
  
  // Check if stats display exists
  const nodeCount = page.locator('#node-count');
  const connectionCount = page.locator('#connection-count');
  const selectedCount = page.locator('#selected-count');
  
  if (await nodeCount.isVisible()) {
    const nodeCountText = await nodeCount.textContent();
    console.log('Node count display:', nodeCountText);
    expect(nodeCountText).toBe('0'); // Should start at 0
  }
  
  // Check zoom controls
  const zoomLevel = page.locator('.zoom-level');
  if (await zoomLevel.isVisible()) {
    const zoomText = await zoomLevel.textContent();
    console.log('Zoom level display:', zoomText);
    expect(zoomText).toBe('100%'); // Should start at 100%
  }
  
  console.log('✅ Toolbar functionality verification complete!');
});