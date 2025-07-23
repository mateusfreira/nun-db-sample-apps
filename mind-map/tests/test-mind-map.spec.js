const { test, expect } = require('@playwright/test');

test.describe('Mind Map Application', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the mind map app
    await page.goto('file://' + require('path').resolve(__dirname, '../index.html'));
  });

  test('should load the setup screen initially', async ({ page }) => {
    // Check if setup screen is visible
    await expect(page.locator('#setupScreen')).toBeVisible();
    await expect(page.locator('#appScreen')).toBeHidden();
    
    // Check for workspace input
    await expect(page.locator('#workspace-input')).toBeVisible();
    await expect(page.locator('#join-workspace-btn')).toBeDisabled();
  });

  test('should enable join button when valid workspace name is entered', async ({ page }) => {
    const workspaceInput = page.locator('#workspace-input');
    const joinButton = page.locator('#join-workspace-btn');
    
    // Initially disabled
    await expect(joinButton).toBeDisabled();
    
    // Type a valid workspace name
    await workspaceInput.fill('test-workspace');
    await expect(joinButton).toBeEnabled();
    
    // Clear input
    await workspaceInput.fill('');
    await expect(joinButton).toBeDisabled();
  });

  test('should transition to app screen when joining workspace', async ({ page }) => {
    const workspaceInput = page.locator('#workspace-input');
    const joinButton = page.locator('#join-workspace-btn');
    
    // Enter workspace name and join
    await workspaceInput.fill('test-workspace');
    await joinButton.click();
    
    // Check if app screen is visible
    await expect(page.locator('#setupScreen')).toBeHidden();
    await expect(page.locator('#appScreen')).toBeVisible();
    
    // Check workspace info is displayed
    await expect(page.locator('#workspaceInfo')).toContainText('test-workspace');
  });

  test('should show toolbar with correct tools', async ({ page }) => {
    // Join workspace first
    await page.locator('#workspace-input').fill('test-workspace');
    await page.locator('#join-workspace-btn').click();
    
    // Check toolbar is visible
    await expect(page.locator('.toolbar')).toBeVisible();
    
    // Check all tools are present
    await expect(page.locator('#selectTool')).toBeVisible();
    await expect(page.locator('#nodeTool')).toBeVisible();
    await expect(page.locator('#connectTool')).toBeVisible();
    
    // Select tool should be active by default
    await expect(page.locator('#selectTool')).toHaveClass(/active/);
  });

  test('should switch between tools correctly', async ({ page }) => {
    // Join workspace first
    await page.locator('#workspace-input').fill('test-workspace');
    await page.locator('#join-workspace-btn').click();
    
    const selectTool = page.locator('#selectTool');
    const nodeTool = page.locator('#nodeTool');
    const connectTool = page.locator('#connectTool');
    const canvas = page.locator('#canvas');
    
    // Initially select tool is active
    await expect(selectTool).toHaveClass(/active/);
    await expect(canvas).toHaveClass(/select-mode/);
    
    // Switch to node tool
    await nodeTool.click();
    await expect(nodeTool).toHaveClass(/active/);
    await expect(selectTool).not.toHaveClass(/active/);
    await expect(canvas).toHaveClass(/node-mode/);
    
    // Switch to connect tool
    await connectTool.click();
    await expect(connectTool).toHaveClass(/active/);
    await expect(nodeTool).not.toHaveClass(/active/);
    await expect(canvas).toHaveClass(/connect-mode/);
  });

  test('should create nodes when clicking on canvas in node mode', async ({ page }) => {
    // Join workspace first
    await page.locator('#workspace-input').fill('test-workspace');
    await page.locator('#join-workspace-btn').click();
    
    // Wait for app to initialize properly
    await page.waitForTimeout(500);
    
    // Switch to node tool
    await page.locator('#nodeTool').click();
    
    // Wait for canvas to be ready
    await page.waitForSelector('#canvas');
    
    // Click on canvas to create a node
    const canvas = page.locator('#canvas');
    await canvas.click({ position: { x: 200, y: 150 } });
    
    // Wait for node to appear and modal to open
    await page.waitForSelector('.mind-map-node', { timeout: 5000 });
    await page.waitForTimeout(200); // Wait for modal animation
    
    // Check if node was created
    const nodes = page.locator('.mind-map-node');
    await expect(nodes).toHaveCount(1);
    
    // Check if modal opened for editing
    await expect(page.locator('#nodeEditorModal')).toBeVisible();
  });

  test('should edit node text and color', async ({ page }) => {
    // Join workspace and create a node
    await page.locator('#workspace-input').fill('test-workspace');
    await page.locator('#join-workspace-btn').click();
    await page.locator('#nodeTool').click();
    
    const canvas = page.locator('#canvas');
    await canvas.click({ position: { x: 200, y: 150 } });
    
    // Wait for modal to appear
    await page.waitForSelector('#nodeEditorModal');
    
    // Edit node text
    const textInput = page.locator('#nodeTextInput');
    await textInput.fill('Test Node');
    
    // Select a different color
    const colorOption = page.locator('.color-option[data-color="#10b981"]');
    await colorOption.click();
    await expect(colorOption).toHaveClass(/selected/);
    
    // Save the node
    await page.locator('#saveNodeBtn').click();
    
    // Check modal is closed
    await expect(page.locator('#nodeEditorModal')).toBeHidden();
    
    // Check node text is updated
    const nodeText = page.locator('.node-text');
    await expect(nodeText).toContainText('Test Node');
  });

  test('should create connections between nodes', async ({ page }) => {
    // Join workspace and create two nodes
    await page.locator('#workspace-input').fill('test-workspace');
    await page.locator('#join-workspace-btn').click();
    await page.locator('#nodeTool').click();
    
    const canvas = page.locator('#canvas');
    
    // Create first node
    await canvas.click({ position: { x: 150, y: 150 } });
    await page.locator('#nodeTextInput').fill('Node 1');
    await page.locator('#saveNodeBtn').click();
    
    // Create second node
    await canvas.click({ position: { x: 350, y: 150 } });
    await page.locator('#nodeTextInput').fill('Node 2');
    await page.locator('#saveNodeBtn').click();
    
    // Switch to connect tool
    await page.locator('#connectTool').click();
    
    // Wait for nodes to be rendered
    await page.waitForSelector('.mind-map-node', { timeout: 5000 });
    const nodes = page.locator('.mind-map-node');
    await expect(nodes).toHaveCount(2);
    
    // Click on first node to start connection
    await nodes.first().click();
    
    // Click on second node to finish connection
    await nodes.last().click();
    
    // Wait for connection to appear
    await page.waitForTimeout(1000); // Give time for connection to be created
    
    // Check if connection was created
    const connections = page.locator('.connection-line');
    await expect(connections).toHaveCount(1);
    
    // Verify connection is visible
    await expect(connections.first()).toBeVisible();
  });

  test('should drag nodes in select mode', async ({ page }) => {
    // Join workspace and create a node
    await page.locator('#workspace-input').fill('test-workspace');
    await page.locator('#join-workspace-btn').click();
    await page.locator('#nodeTool').click();
    
    const canvas = page.locator('#canvas');
    await canvas.click({ position: { x: 200, y: 150 } });
    await page.locator('#nodeTextInput').fill('Draggable Node');
    await page.locator('#saveNodeBtn').click();
    
    // Switch to select tool
    await page.locator('#selectTool').click();
    
    // Wait for node to be rendered
    await page.waitForSelector('.mind-map-node');
    
    // Get initial position
    const initialCircle = page.locator('.mind-map-node circle').first();
    const initialCx = await initialCircle.getAttribute('cx');
    
    // Simulate drag with mouse events
    const circle = page.locator('.mind-map-node circle').first();
    await circle.hover();
    await page.mouse.down();
    await page.mouse.move(300, 200);
    await page.mouse.up();
    
    // Wait a bit for the position update
    await page.waitForTimeout(500);
    
    // Check if node position changed
    const newCx = await initialCircle.getAttribute('cx');
    expect(parseFloat(newCx)).not.toBe(parseFloat(initialCx));
  });

  test('should delete node with Delete key', async ({ page }) => {
    // Set up dialog handler first
    page.on('dialog', async dialog => {
      expect(dialog.message()).toContain('Are you sure');
      await dialog.accept();
    });
    
    // Join workspace and create a node
    await page.locator('#workspace-input').fill('test-workspace');
    await page.locator('#join-workspace-btn').click();
    await page.locator('#nodeTool').click();
    
    const canvas = page.locator('#canvas');
    await canvas.click({ position: { x: 200, y: 150 } });
    await page.locator('#nodeTextInput').fill('Delete Me');
    await page.locator('#saveNodeBtn').click();
    
    // Switch to select tool and select the node
    await page.locator('#selectTool').click();
    const node = page.locator('.mind-map-node').first();
    await node.click();
    
    // Press Delete key
    await page.keyboard.press('Delete');
    
    // Check if node was deleted
    await expect(page.locator('.mind-map-node')).toHaveCount(0);
  });

  test('should clear map when clear button is clicked', async ({ page }) => {
    // Set up dialog handler first
    page.on('dialog', async dialog => {
      expect(dialog.message()).toContain('clear the entire mind map');
      await dialog.accept();
    });
    
    // Join workspace and create a node
    await page.locator('#workspace-input').fill('test-workspace');
    await page.locator('#join-workspace-btn').click();
    await page.locator('#nodeTool').click();
    
    const canvas = page.locator('#canvas');
    await canvas.click({ position: { x: 200, y: 150 } });
    await page.locator('#saveNodeBtn').click();
    
    // Check node exists
    await expect(page.locator('.mind-map-node')).toHaveCount(1);
    
    // Click clear map button
    await page.locator('#clearMapBtn').click();
    
    // Check if map was cleared
    await expect(page.locator('.mind-map-node')).toHaveCount(0);
    
    // Check if instructions are shown again
    await expect(page.locator('#canvasInstructions')).toBeVisible();
  });

  test('should show canvas instructions when no nodes exist', async ({ page }) => {
    // Join workspace
    await page.locator('#workspace-input').fill('test-workspace');
    await page.locator('#join-workspace-btn').click();
    
    // Check if instructions are visible initially
    await expect(page.locator('#canvasInstructions')).toBeVisible();
    await expect(page.locator('.instruction-box')).toContainText('Start Creating!');
  });

  test('should hide instructions after creating first node', async ({ page }) => {
    // Join workspace and create a node
    await page.locator('#workspace-input').fill('test-workspace');
    await page.locator('#join-workspace-btn').click();
    await page.locator('#nodeTool').click();
    
    const canvas = page.locator('#canvas');
    await canvas.click({ position: { x: 200, y: 150 } });
    await page.locator('#saveNodeBtn').click();
    
    // Check if instructions are hidden
    await expect(page.locator('#canvasInstructions')).toBeHidden();
  });

  test('should handle escape key to cancel operations', async ({ page }) => {
    // Join workspace
    await page.locator('#workspace-input').fill('test-workspace');
    await page.locator('#join-workspace-btn').click();
    
    // Switch to connect tool
    await page.locator('#connectTool').click();
    
    // Press Escape key
    await page.keyboard.press('Escape');
    
    // Should reset connection state
    // This is harder to test directly, but we can check if the tool state is reset
    // by checking if we can switch tools normally
    await page.locator('#selectTool').click();
    await expect(page.locator('#selectTool')).toHaveClass(/active/);
  });
});