const { test, expect } = require('@playwright/test');

test.describe('Mind Map Validation System', () => {
  
  test('should test workspace name validation', async ({ page }) => {
    // Create a test page for validation testing
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Validation Test</title>
      </head>
      <body>
        <script type="module">
          import { Validators } from '../utils/validators.js';
          
          // Test workspace validation
          window.testWorkspaceValidation = (name) => {
            return Validators.validateWorkspaceName(name);
          };
          
          // Test node validation
          window.testNodeValidation = (node) => {
            return Validators.validateNodeData(node);
          };
          
          // Test position validation
          window.testPositionValidation = (x, y) => {
            return Validators.isValidPosition(x, y);
          };
          
          // Test color validation
          window.testColorValidation = (color) => {
            return Validators.isValidColor(color);
          };
          
          window.validationReady = true;
        </script>
      </body>
      </html>
    `);
    
    // Wait for validation system to be ready
    await page.waitForFunction(() => window.validationReady === true, { timeout: 5000 });
    
    // Test workspace name validation
    const validWorkspace = await page.evaluate(() => window.testWorkspaceValidation('valid-workspace-123'));
    expect(validWorkspace).toBe(null); // null means valid
    
    const invalidShort = await page.evaluate(() => window.testWorkspaceValidation('ab'));
    expect(invalidShort).toBeTruthy(); // should return error message
    
    const invalidChars = await page.evaluate(() => window.testWorkspaceValidation('invalid@workspace'));
    expect(invalidChars).toBeTruthy(); // should return error message
    
    // Test position validation
    const validPosition = await page.evaluate(() => window.testPositionValidation(100, 200));
    expect(validPosition).toBe(true);
    
    const invalidPosition = await page.evaluate(() => window.testPositionValidation(-100, 200));
    expect(invalidPosition).toBe(false);
    
    // Test color validation
    const validColor = await page.evaluate(() => window.testColorValidation('#3b82f6'));
    expect(validColor).toBe(true);
    
    const invalidColor = await page.evaluate(() => window.testColorValidation('not-a-color'));
    expect(invalidColor).toBe(false);
    
    // Test node validation
    const validNode = await page.evaluate(() => {
      return window.testNodeValidation({
        id: 'test-node',
        text: 'Test Node',
        x: 100,
        y: 200,
        color: '#3b82f6'
      });
    });
    expect(validNode).toHaveLength(0); // empty array means valid
    
    const invalidNode = await page.evaluate(() => {
      return window.testNodeValidation({
        id: 'test-node',
        text: '', // empty text
        x: -100, // invalid position
        y: 200,
        color: 'invalid-color'
      });
    });
    expect(invalidNode.length).toBeGreaterThan(0); // should have validation errors
  });

  test('should test helper functions', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Helpers Test</title>
      </head>
      <body>
        <script type="module">
          import { Helpers } from '../utils/helpers.js';
          
          // Test math helpers
          window.testDistance = (p1, p2) => {
            return Helpers.Math.distance(p1, p2);
          };
          
          window.testClamp = (value, min, max) => {
            return Helpers.Math.clamp(value, min, max);
          };
          
          window.testGenerateId = (prefix) => {
            return Helpers.Math.generateId(prefix);
          };
          
          // Test data helpers
          window.testDeepClone = (obj) => {
            return Helpers.Data.deepClone(obj);
          };
          
          window.testSafeGet = (obj, path, defaultValue) => {
            return Helpers.Data.safeGet(obj, path, defaultValue);
          };
          
          window.helpersReady = true;
        </script>
      </body>
      </html>
    `);
    
    await page.waitForFunction(() => window.helpersReady === true, { timeout: 5000 });
    
    // Test distance calculation
    const distance = await page.evaluate(() => {
      return window.testDistance({ x: 0, y: 0 }, { x: 3, y: 4 });
    });
    expect(distance).toBe(5); // 3-4-5 triangle
    
    // Test clamp function
    const clamped = await page.evaluate(() => {
      return window.testClamp(150, 0, 100);
    });
    expect(clamped).toBe(100);
    
    // Test ID generation
    const id = await page.evaluate(() => {
      return window.testGenerateId('test_');
    });
    expect(id).toMatch(/^test_\w+_\w+$/);
    
    // Test deep clone
    const original = { a: 1, b: { c: 2 } };
    const cloned = await page.evaluate((obj) => {
      return window.testDeepClone(obj);
    }, original);
    expect(cloned).toEqual(original);
    
    // Test safe get
    const safeValue = await page.evaluate(() => {
      return window.testSafeGet({ user: { profile: { name: 'John' } } }, 'user.profile.name', 'Unknown');
    });
    expect(safeValue).toBe('John');
    
    const defaultValue = await page.evaluate(() => {
      return window.testSafeGet({ user: {} }, 'user.profile.name', 'Unknown');
    });
    expect(defaultValue).toBe('Unknown');
  });

  test('should test DOM helpers', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>DOM Helpers Test</title>
      </head>
      <body>
        <div id="test-container"></div>
        <div class="mind-map-node" data-id="test">Test Node</div>
        
        <script type="module">
          import { Helpers } from '../utils/helpers.js';
          
          // Test DOM element creation
          window.testCreateElement = () => {
            const element = Helpers.DOM.createElement('div', {
              className: 'test-class',
              attributes: { 'data-test': 'value' },
              textContent: 'Test Content'
            });
            return {
              tagName: element.tagName,
              className: element.className,
              textContent: element.textContent,
              dataTest: element.getAttribute('data-test')
            };
          };
          
          // Test finding node element
          window.testFindNodeElement = (startElement) => {
            const result = Helpers.DOM.findNodeElement(startElement);
            return result ? result.className : null;
          };
          
          window.domHelpersReady = true;
        </script>
      </body>
      </html>
    `);
    
    await page.waitForFunction(() => window.domHelpersReady === true, { timeout: 5000 });
    
    // Test element creation
    const elementInfo = await page.evaluate(() => {
      return window.testCreateElement();
    });
    
    expect(elementInfo.tagName).toBe('DIV');
    expect(elementInfo.className).toBe('test-class');
    expect(elementInfo.textContent).toBe('Test Content');
    expect(elementInfo.dataTest).toBe('value');
    
    // Test finding node element
    const nodeClass = await page.evaluate(() => {
      const nodeElement = document.querySelector('.mind-map-node');
      return window.testFindNodeElement(nodeElement);
    });
    expect(nodeClass).toContain('mind-map-node');
  });

  test('should test event helpers', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Event Helpers Test</title>
      </head>
      <body>
        <button id="test-btn">Test Button</button>
        
        <script type="module">
          import { Helpers } from '../utils/helpers.js';
          
          let clickCount = 0;
          let debounceCount = 0;
          let throttleCount = 0;
          
          // Test debounce
          const debouncedFunction = Helpers.Event.debounce(() => {
            debounceCount++;
          }, 100);
          
          // Test throttle
          const throttledFunction = Helpers.Event.throttle(() => {
            throttleCount++;
          }, 100);
          
          // Test event listener with cleanup
          const cleanup = Helpers.Event.addEventListenerWithCleanup(
            document.getElementById('test-btn'),
            'click',
            () => clickCount++
          );
          
          window.testDebounce = () => {
            // Call multiple times quickly
            debouncedFunction();
            debouncedFunction();
            debouncedFunction();
            return new Promise(resolve => {
              setTimeout(() => resolve(debounceCount), 200);
            });
          };
          
          window.testThrottle = () => {
            // Call multiple times quickly
            throttledFunction();
            throttledFunction();
            throttledFunction();
            return throttleCount;
          };
          
          window.testEventListener = () => {
            document.getElementById('test-btn').click();
            return clickCount;
          };
          
          window.testCleanup = () => {
            cleanup();
            document.getElementById('test-btn').click();
            return clickCount; // Should not increase after cleanup
          };
          
          window.eventHelpersReady = true;
        </script>
      </body>
      </html>
    `);
    
    await page.waitForFunction(() => window.eventHelpersReady === true, { timeout: 5000 });
    
    // Test debounce - should only execute once after delay
    const debounceResult = await page.evaluate(() => {
      return window.testDebounce();
    });
    expect(debounceResult).toBe(1);
    
    // Test throttle - should execute once immediately
    const throttleResult = await page.evaluate(() => {
      return window.testThrottle();
    });
    expect(throttleResult).toBe(1);
    
    // Test event listener
    const eventResult = await page.evaluate(() => {
      return window.testEventListener();
    });
    expect(eventResult).toBe(1);
    
    // Test cleanup
    const cleanupResult = await page.evaluate(() => {
      return window.testCleanup();
    });
    expect(cleanupResult).toBe(1); // Should not increase after cleanup
  });

  test('should test storage helpers', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Storage Helpers Test</title>
      </head>
      <body>
        <script type="module">
          import { Helpers } from '../utils/helpers.js';
          
          // Test localStorage operations
          window.testSaveToStorage = (key, data) => {
            return Helpers.Storage.saveToLocalStorage(key, data);
          };
          
          window.testLoadFromStorage = (key, defaultValue) => {
            return Helpers.Storage.loadFromLocalStorage(key, defaultValue);
          };
          
          window.testClearFromStorage = (key) => {
            return Helpers.Storage.clearFromLocalStorage(key);
          };
          
          window.storageHelpersReady = true;
        </script>
      </body>
      </html>
    `);
    
    await page.waitForFunction(() => window.storageHelpersReady === true, { timeout: 5000 });
    
    const testKey = 'test-storage-key';
    const testData = { message: 'Hello, World!', number: 42 };
    
    // Test save to storage
    const saveResult = await page.evaluate((key, data) => {
      return window.testSaveToStorage(key, data);
    }, testKey, testData);
    expect(saveResult).toBe(true);
    
    // Test load from storage
    const loadResult = await page.evaluate((key, defaultValue) => {
      return window.testLoadFromStorage(key, defaultValue);
    }, testKey, null);
    expect(loadResult).toEqual(testData);
    
    // Test load with default value
    const defaultResult = await page.evaluate((key, defaultValue) => {
      return window.testLoadFromStorage(key + '-nonexistent', defaultValue);
    }, testKey, 'default-value');
    expect(defaultResult).toBe('default-value');
    
    // Test clear from storage
    const clearResult = await page.evaluate((key) => {
      return window.testClearFromStorage(key);
    }, testKey);
    expect(clearResult).toBe(true);
    
    // Verify data was cleared
    const clearedResult = await page.evaluate((key, defaultValue) => {
      return window.testLoadFromStorage(key, defaultValue);
    }, testKey, 'was-cleared');
    expect(clearedResult).toBe('was-cleared');
  });
});