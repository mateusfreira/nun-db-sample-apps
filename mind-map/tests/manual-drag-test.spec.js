const { test, expect } = require('@playwright/test');

test('manual-style drag test', async ({ page }) => {
  await page.goto('file://' + require('path').resolve(__dirname, '../index.html'));
  
  // Enable console logging to see what's happening
  page.on('console', msg => {
    if (msg.text().includes('node') || msg.text().includes('Node') || msg.text().includes('duplicate')) {
      console.log('BROWSER:', msg.text());
    }
  });
  
  // Join workspace
  await page.locator('#workspace-input').fill('manual-drag');
  await page.locator('#join-workspace-btn').click();
  await page.waitForTimeout(1500); // Longer wait
  
  // Create a node
  await page.locator('#nodeTool').click();
  const canvas = page.locator('#canvas');
  await canvas.click({ position: { x: 200, y: 200 } });
  
  // Wait and close modal
  await page.waitForTimeout(500);
  if (await page.locator('#nodeEditorModal').isVisible()) {
    await page.locator('#saveNodeBtn').click();
    await page.waitForTimeout(300);
  }
  
  // Switch to select mode and wait
  await page.locator('#selectTool').click();
  await page.waitForTimeout(1000); // Give time for DB sync
  
  console.log('\n=== BEFORE DRAG ===');
  let nodeCount = await page.locator('.mind-map-node').count();
  console.log(`Node count: ${nodeCount}`);
  
  // Get all node elements and their positions
  for (let i = 0; i < nodeCount; i++) {
    const node = page.locator('.mind-map-node').nth(i);
    const nodeId = await node.getAttribute('data-node-id');
    const circle = node.locator('circle');
    const cx = await circle.getAttribute('cx');
    const cy = await circle.getAttribute('cy');
    console.log(`Node ${i}: ID=${nodeId?.substr(-8)}, Position=(${cx}, ${cy})`);
  }
  
  // Simulate slower, more manual drag
  const firstNode = page.locator('.mind-map-node').first();
  
  // Start drag slowly like a human would
  await firstNode.hover();
  await page.waitForTimeout(200);
  await page.mouse.down();
  await page.waitForTimeout(100);
  
  console.log('\n=== DURING SLOW DRAG ===');
  
  // Move in small increments like a human
  for (let step = 0; step < 10; step++) {
    await page.mouse.move(220 + step * 5, 220 + step * 3);
    await page.waitForTimeout(50);
    
    // Check for duplicates during drag
    if (step === 5) {
      nodeCount = await page.locator('.mind-map-node').count();
      console.log(`Mid-drag node count: ${nodeCount}`);
      if (nodeCount > 1) {
        console.log('❌ DUPLICATES DETECTED DURING DRAG!');
        for (let i = 0; i < nodeCount; i++) {
          const node = page.locator('.mind-map-node').nth(i);
          const nodeId = await node.getAttribute('data-node-id');
          const circle = node.locator('circle');
          const cx = await circle.getAttribute('cx');
          const cy = await circle.getAttribute('cy');
          console.log(`  Node ${i}: ID=${nodeId?.substr(-8)}, Position=(${cx}, ${cy})`);
        }
      }
    }
  }
  
  await page.mouse.up();
  await page.waitForTimeout(1000); // Wait for save and sync
  
  console.log('\n=== AFTER DRAG ===');
  nodeCount = await page.locator('.mind-map-node').count();
  console.log(`Final node count: ${nodeCount}`);
  
  // Final analysis
  const finalNodes = [];
  for (let i = 0; i < nodeCount; i++) {
    const node = page.locator('.mind-map-node').nth(i);
    const nodeId = await node.getAttribute('data-node-id');
    const circle = node.locator('circle');
    const cx = await circle.getAttribute('cx');
    const cy = await circle.getAttribute('cy');
    finalNodes.push({id: nodeId, x: cx, y: cy});
    console.log(`Final Node ${i}: ID=${nodeId?.substr(-8)}, Position=(${cx}, ${cy})`);
  }
  
  // Check for identical IDs (real duplicates)
  const nodeIds = finalNodes.map(n => n.id);
  const uniqueIds = [...new Set(nodeIds)];
  
  console.log('\n=== FINAL ANALYSIS ===');
  console.log(`Total nodes: ${nodeCount}`);
  console.log(`Unique IDs: ${uniqueIds.length}`);
  
  if (nodeCount > uniqueIds.length) {
    console.log('❌ TRUE DUPLICATES - Same node ID multiple times');
  } else if (nodeCount > 1) {
    console.log('❌ MULTIPLE DIFFERENT NODES - Should only be 1');
  } else {
    console.log('✅ NO DUPLICATES - Perfect!');
  }
  
  // The test should pass with exactly 1 node
  expect(nodeCount).toBe(1);
});