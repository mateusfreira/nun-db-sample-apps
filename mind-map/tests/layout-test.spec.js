const { test, expect } = require('@playwright/test');

test('layout and toolbar verification', async ({ page }) => {
  await page.goto('http://localhost:3000');
  
  // Wait for page to load
  await page.waitForTimeout(1000);
  
  // Join a workspace to see the full layout
  await page.locator('#workspace-input').fill('layout-test');
  await page.locator('#join-workspace-btn').click();
  
  // Wait for workspace screen to load
  await page.waitForTimeout(3000);
  
  // Check if workspace screen is visible
  await expect(page.locator('#workspace-screen')).toBeVisible();
  
  // Check if toolbar is visible and has content
  const toolbar = page.locator('#toolbar');
  await expect(toolbar).toBeVisible();
  
  // Check if canvas container is visible
  const canvasContainer = page.locator('.canvas-container');
  await expect(canvasContainer).toBeVisible();
  
  // Check if canvas is visible and has proper size
  const canvas = page.locator('#canvas');
  await expect(canvas).toBeVisible();
  
  // Get canvas dimensions
  const canvasBox = await canvas.boundingBox();
  console.log('Canvas dimensions:', canvasBox);
  
  // Canvas should have reasonable dimensions
  expect(canvasBox.width).toBeGreaterThan(400);
  expect(canvasBox.height).toBeGreaterThan(400);
  
  // Check if toolbar has proper styling
  const toolbarStyle = await toolbar.evaluate(el => {
    const styles = window.getComputedStyle(el);
    return {
      background: styles.background,
      borderRadius: styles.borderRadius,
      display: styles.display
    };
  });
  
  console.log('Toolbar styles:', toolbarStyle);
  
  // Check if canvas has proper background pattern
  const canvasStyle = await canvas.evaluate(el => {
    const styles = window.getComputedStyle(el);
    return {
      backgroundImage: styles.backgroundImage,
      cursor: styles.cursor,
      position: styles.position
    };
  });
  
  console.log('Canvas styles:', canvasStyle);
  
  // Verify canvas has the dot pattern background
  expect(canvasStyle.backgroundImage).toContain('radial-gradient');
  expect(canvasStyle.position).toBe('relative');
  
  // Take screenshot of the full workspace
  await page.screenshot({ path: 'test-results/workspace-layout.png', fullPage: true });
  
  console.log('✅ Layout and styling verification complete!');
});