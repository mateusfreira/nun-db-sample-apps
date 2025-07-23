const { test, expect } = require('@playwright/test');

test('comprehensive visual debugging test', async ({ page }) => {
  await page.goto('file://' + require('path').resolve(__dirname, '../index.html'));
  
  // Enable console logging
  page.on('console', msg => {
    if (msg.text().includes('node') || msg.text().includes('Node') || msg.text().includes('duplicate')) {
      console.log('BROWSER:', msg.text());
    }
  });
  
  // Join workspace
  await page.locator('#workspace-input').fill('visual-debug');
  await page.locator('#join-workspace-btn').click();
  await page.waitForTimeout(1500); // Longer wait for connection
  
  // Create a node
  await page.locator('#nodeTool').click();
  const canvas = page.locator('#canvas');
  await canvas.click({ position: { x: 200, y: 200 } });
  
  // Close modal
  await page.waitForTimeout(500);
  if (await page.locator('#nodeEditorModal').isVisible()) {
    await page.locator('#saveNodeBtn').click();
    await page.waitForTimeout(300);
  }
  
  // Switch to select mode
  await page.locator('#selectTool').click();
  await page.waitForTimeout(1000);
  
  console.log('\n=== BEFORE DRAG ===');
  
  // Take screenshot before drag
  await page.screenshot({ path: 'before-drag.png', fullPage: true });
  
  // Count all circle elements (not just .mind-map-node)
  const allCircles = page.locator('svg circle');
  const circleCount = await allCircles.count();
  console.log(`Total circle elements: ${circleCount}`);
  
  // Check for any hidden or invisible nodes
  const allNodes = page.locator('.mind-map-node');
  const nodeCount = await allNodes.count();
  console.log(`Total node groups: ${nodeCount}`);
  
  // Check CSS styles that might cause visual duplication
  const firstNode = allNodes.first();
  const nodeStyles = await firstNode.evaluate(el => {
    const style = window.getComputedStyle(el);
    return {
      opacity: style.opacity,
      visibility: style.visibility,
      display: style.display,
      transform: style.transform,
      transition: style.transition,
      filter: style.filter
    };
  });
  console.log('Node styles:', JSON.stringify(nodeStyles, null, 2));
  
  // Start drag with more realistic timing
  const nodeBox = await firstNode.boundingBox();
  console.log('\n=== STARTING DRAG ===');
  
  await page.mouse.move(nodeBox.x + nodeBox.width/2, nodeBox.y + nodeBox.height/2);
  await page.waitForTimeout(100);
  await page.mouse.down();
  await page.waitForTimeout(50);
  
  // Take screenshot immediately after mouse down
  await page.screenshot({ path: 'mouse-down.png', fullPage: true });
  
  // Check for CSS changes during drag start
  const dragStartStyles = await firstNode.evaluate(el => {
    const style = window.getComputedStyle(el);
    return {
      opacity: style.opacity,
      visibility: style.visibility,
      display: style.display,
      transform: style.transform,
      transition: style.transition,
      filter: style.filter,
      classList: Array.from(el.classList)
    };
  });
  console.log('Drag start styles:', JSON.stringify(dragStartStyles, null, 2));
  
  // Move mouse slowly in steps
  console.log('\n=== DURING DRAG MOVEMENT ===');
  for (let step = 0; step < 5; step++) {
    await page.mouse.move(nodeBox.x + 50 + step * 10, nodeBox.y + 30 + step * 5);
    await page.waitForTimeout(100);
    
    // Count elements at each step
    const stepCircles = await allCircles.count();
    const stepNodes = await allNodes.count();
    console.log(`Step ${step}: Circles=${stepCircles}, Nodes=${stepNodes}`);
    
    if (step === 2) {
      // Take mid-drag screenshot
      await page.screenshot({ path: 'mid-drag.png', fullPage: true });
      
      // Check if any elements have duplicate positions
      console.log('\n--- Mid-drag element analysis ---');
      for (let i = 0; i < stepCircles; i++) {
        const circle = allCircles.nth(i);
        const cx = await circle.getAttribute('cx');
        const cy = await circle.getAttribute('cy');
        const r = await circle.getAttribute('r');
        const fill = await circle.getAttribute('fill');
        const parent = await circle.evaluate(el => el.parentElement?.getAttribute('data-node-id') || 'no-parent');
        console.log(`Circle ${i}: cx=${cx}, cy=${cy}, r=${r}, fill=${fill}, parent=${parent}`);
      }
    }
  }
  
  // Release mouse
  await page.mouse.up();
  await page.waitForTimeout(200);
  
  // Take screenshot after mouse up
  await page.screenshot({ path: 'mouse-up.png', fullPage: true });
  
  console.log('\n=== AFTER DRAG ===');
  
  // Final analysis
  const finalCircles = await allCircles.count();
  const finalNodes = await allNodes.count();
  console.log(`Final: Circles=${finalCircles}, Nodes=${finalNodes}`);
  
  // Check final styles
  const finalStyles = await firstNode.evaluate(el => {
    const style = window.getComputedStyle(el);
    return {
      opacity: style.opacity,
      visibility: style.visibility,
      display: style.display,
      transform: style.transform,
      transition: style.transition,
      filter: style.filter,
      classList: Array.from(el.classList)
    };
  });
  console.log('Final styles:', JSON.stringify(finalStyles, null, 2));
  
  // Take final screenshot
  await page.screenshot({ path: 'after-drag.png', fullPage: true });
  
  // Look for any elements that might be causing visual duplication
  const suspiciousElements = await page.evaluate(() => {
    const elements = [];
    const allSvgElements = document.querySelectorAll('svg *');
    
    allSvgElements.forEach((el, index) => {
      if (el.tagName === 'circle' || el.tagName === 'g') {
        const rect = el.getBoundingClientRect();
        elements.push({
          index,
          tag: el.tagName,
          classes: Array.from(el.classList),
          id: el.getAttribute('data-node-id') || 'none',
          style: el.getAttribute('style') || 'none',
          position: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
          attributes: Object.fromEntries(Array.from(el.attributes).map(attr => [attr.name, attr.value]))
        });
      }
    });
    
    return elements;
  });
  
  console.log('\n=== ALL SVG ELEMENTS ANALYSIS ===');
  suspiciousElements.forEach((el, i) => {
    console.log(`Element ${i}:`, JSON.stringify(el, null, 2));
  });
  
  // Check for elements at similar positions
  const positionGroups = {};
  suspiciousElements.forEach(el => {
    const key = `${Math.round(el.position.x)},${Math.round(el.position.y)}`;
    if (!positionGroups[key]) positionGroups[key] = [];
    positionGroups[key].push(el);
  });
  
  console.log('\n=== POSITION GROUPS ===');
  Object.entries(positionGroups).forEach(([pos, elements]) => {
    if (elements.length > 1) {
      console.log(`❌ MULTIPLE ELEMENTS AT POSITION ${pos}:`);
      elements.forEach((el, i) => {
        console.log(`  ${i}: ${el.tag} with classes [${el.classes.join(', ')}]`);
      });
    }
  });
  
  expect(finalNodes).toBe(1);
  expect(finalCircles).toBe(1);
});