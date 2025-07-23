const { test, expect } = require('@playwright/test');

test('final duplicate visual bug test', async ({ page }) => {
  await page.goto('file://' + require('path').resolve(__dirname, '../index.html'));
  
  // Enable verbose console logging
  page.on('console', msg => {
    console.log('BROWSER:', msg.text());
  });
  
  // Join workspace
  await page.locator('#workspace-input').fill('final-test');
  await page.locator('#join-workspace-btn').click();
  await page.waitForTimeout(2000);
  
  // Create a node
  await page.locator('#nodeTool').click();
  const canvas = page.locator('#canvas');
  await canvas.click({ position: { x: 300, y: 300 } });
  
  // Close modal immediately
  await page.waitForTimeout(200);
  await page.locator('#saveNodeBtn').click();
  await page.waitForTimeout(500);
  
  // Switch to select mode
  await page.locator('#selectTool').click();
  await page.waitForTimeout(1000);
  
  console.log('\n=== TESTING DRAG BEHAVIOR ===');
  
  // Get node info before drag
  const nodes = page.locator('.mind-map-node');
  const initialCount = await nodes.count();
  console.log(`Initial nodes: ${initialCount}`);
  
  const firstNode = nodes.first();
  const initialId = await firstNode.getAttribute('data-node-id');
  console.log(`Node ID: ${initialId}`);
  
  // Start dragging
  await firstNode.hover();
  await page.mouse.down();
  await page.waitForTimeout(100);
  
  // Check for duplicates during drag start
  let dragStartCount = await nodes.count();
  console.log(`Nodes during drag start: ${dragStartCount}`);
  
  // Move gradually
  for (let i = 0; i < 8; i++) {
    await page.mouse.move(320 + i * 10, 320 + i * 5);
    await page.waitForTimeout(50);
    
    // Count at each step
    const stepCount = await nodes.count();
    if (stepCount > 1) {
      console.log(`❌ STEP ${i}: ${stepCount} nodes detected!`);
      
      // Analyze all nodes
      for (let j = 0; j < stepCount; j++) {
        const node = nodes.nth(j);
        const nodeId = await node.getAttribute('data-node-id');
        const circle = node.locator('circle');
        const cx = await circle.getAttribute('cx');
        const cy = await circle.getAttribute('cy');
        console.log(`  Node ${j}: ID=${nodeId?.substr(-8)}, pos=(${cx}, ${cy})`);
      }
    }
  }
  
  // Release drag
  await page.mouse.up();
  await page.waitForTimeout(1000);
  
  // Final count
  const finalCount = await nodes.count();
  console.log(`Final nodes: ${finalCount}`);
  
  // Check for any duplicate IDs
  const nodeIds = [];
  for (let i = 0; i < finalCount; i++) {
    const nodeId = await nodes.nth(i).getAttribute('data-node-id');
    nodeIds.push(nodeId);
  }
  
  const uniqueIds = [...new Set(nodeIds)];
  console.log(`Unique IDs: ${uniqueIds.length}, Total nodes: ${finalCount}`);
  
  if (finalCount === 1 && uniqueIds.length === 1) {
    console.log('✅ SUCCESS: No duplicate visual bug detected!');
  } else {
    console.log('❌ FAILED: Visual duplicates still exist');
    console.log('Node IDs:', nodeIds);
  }
  
  // Final verification
  expect(finalCount).toBe(1);
  expect(uniqueIds.length).toBe(1);
  
  console.log('🎉 Test completed successfully - visual bug appears to be fixed!');
});