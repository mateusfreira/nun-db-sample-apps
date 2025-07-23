const { test, expect } = require('@playwright/test');

test('visual artifacts test', async ({ page }) => {
  await page.goto('file://' + require('path').resolve(__dirname, '../index.html'));
  
  // Join workspace
  await page.locator('#workspace-input').fill('visual-test');
  await page.locator('#join-workspace-btn').click();
  await page.waitForTimeout(1000);
  
  // Create a node
  await page.locator('#nodeTool').click();
  const canvas = page.locator('#canvas');
  await canvas.click({ position: { x: 200, y: 200 } });
  
  // Close modal quickly
  await page.waitForTimeout(200);
  if (await page.locator('#nodeEditorModal').isVisible()) {
    await page.locator('#saveNodeBtn').click();
  }
  
  // Switch to select mode
  await page.locator('#selectTool').click();
  await page.waitForTimeout(500);
  
  console.log('\n=== TESTING FOR VISUAL ARTIFACTS ===');
  
  // Take screenshot before drag
  await page.screenshot({ path: 'before-drag.png' });
  
  // Start a quick drag
  const node = page.locator('.mind-map-node').first();
  await node.hover();
  await page.mouse.down();
  
  // Take screenshot during drag
  await page.screenshot({ path: 'during-drag.png' });
  
  // Quick move
  await page.mouse.move(300, 250);
  await page.waitForTimeout(50);
  
  // Take screenshot mid-drag
  await page.screenshot({ path: 'mid-drag.png' });
  
  await page.mouse.up();
  
  // Take screenshot after drag
  await page.screenshot({ path: 'after-drag.png' });
  
  // Final count
  const finalCount = await page.locator('.mind-map-node').count();
  console.log(`Final node count: ${finalCount}`);
  
  // Check for any CSS transitions that might be running
  const nodeElement = page.locator('.mind-map-node').first();
  const hasTransition = await nodeElement.evaluate(el => {
    const style = window.getComputedStyle(el);
    return style.transition !== 'none' && style.transition !== '';
  });
  
  console.log(`Node has CSS transitions: ${hasTransition}`);
  
  // Check if any elements have opacity or transform that might cause visual duplicates
  const opacity = await nodeElement.evaluate(el => window.getComputedStyle(el).opacity);
  const transform = await nodeElement.evaluate(el => window.getComputedStyle(el).transform);
  
  console.log(`Node opacity: ${opacity}`);
  console.log(`Node transform: ${transform}`);
  
  // Look for any elements with similar positions that might appear as duplicates
  const allCircles = page.locator('circle');
  const circleCount = await allCircles.count();
  console.log(`Total circles in DOM: ${circleCount}`);
  
  if (circleCount > 1) {
    console.log('Multiple circles found, checking positions...');
    for (let i = 0; i < circleCount; i++) {
      const circle = allCircles.nth(i);
      const cx = await circle.getAttribute('cx');
      const cy = await circle.getAttribute('cy');
      const r = await circle.getAttribute('r');
      console.log(`Circle ${i}: position=(${cx}, ${cy}), radius=${r}`);
    }
  }
  
  expect(finalCount).toBe(1);
  console.log('✅ Test completed - check screenshots for visual artifacts');
});