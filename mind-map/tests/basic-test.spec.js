const { test, expect } = require('@playwright/test');

test.describe('Mind Map Basic Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
  });

  test('basic node creation workflow', async ({ page }) => {
    // Join workspace
    await page.locator('#workspace-input').fill('test-workspace');
    await page.locator('#join-workspace-btn').click();
    await page.waitForTimeout(1000); // Wait for app initialization
    
    // Create a node
    await page.locator('#nodeTool').click();
    const canvas = page.locator('#canvas');
    await canvas.click({ position: { x: 200, y: 200 } });
    
    // Wait for node to appear (regardless of modal)
    await page.waitForTimeout(500);
    
    // Check if node exists in DOM
    const nodeCount = await page.locator('.mind-map-node').count();
    console.log(`Found ${nodeCount} nodes`);
    
    // If modal is open, close it
    const modal = page.locator('#nodeEditorModal');
    if (await modal.isVisible()) {
      console.log('Modal is visible, closing it');
      await page.locator('#saveNodeBtn').click();
    }
    
    // Check final state
    await page.waitForTimeout(200);
    const finalNodeCount = await page.locator('.mind-map-node').count();
    console.log(`Final node count: ${finalNodeCount}`);
    
    // The test passes if we have at least one node
    expect(finalNodeCount).toBeGreaterThanOrEqual(1);
  });
  
  test('tool switching works', async ({ page }) => {
    // Join workspace
    await page.locator('#workspace-input').fill('test-workspace');
    await page.locator('#join-workspace-btn').click();
    await page.waitForTimeout(500);
    
    // Test tool switching
    const selectTool = page.locator('#selectTool');
    const nodeTool = page.locator('#nodeTool');
    const connectTool = page.locator('#connectTool');
    
    // Check initial state (select should be active)
    await expect(selectTool).toHaveClass(/active/);
    
    // Switch to node tool
    await nodeTool.click();
    await expect(nodeTool).toHaveClass(/active/);
    await expect(selectTool).not.toHaveClass(/active/);
    
    // Switch to connect tool
    await connectTool.click();
    await expect(connectTool).toHaveClass(/active/);
    await expect(nodeTool).not.toHaveClass(/active/);
    
    console.log('✅ Tool switching works perfectly!');
  });
});