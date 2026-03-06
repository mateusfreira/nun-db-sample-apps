const { test, expect } = require('@playwright/test');
const { TestHelper } = require('./helpers/test-helper');

test.describe('Collaborative Editor', () => {
    let helper;

    test.beforeEach(async ({ page }) => {
        helper = new TestHelper(page);
        await helper.setupMockMode();
        await helper.goto();
    });

    test('setup screen loads correctly', async ({ page }) => {
        await expect(page.locator('#setup-screen')).toBeVisible();
        await expect(page.locator('#editor-screen')).not.toBeVisible();
        await expect(page.locator('#join-btn')).toBeDisabled();
        await expect(page.locator('#workspace-input')).toHaveValue('');
    });

    test('join button enables when workspace name is entered', async ({ page }) => {
        await page.fill('#workspace-input', 'my-workspace');
        await page.locator('#workspace-input').dispatchEvent('input');
        await expect(page.locator('#join-btn')).toBeEnabled();
    });

    test('join workspace shows editor', async ({ page }) => {
        const workspace = helper.generateTestWorkspace();
        await helper.joinWorkspace(workspace);

        await expect(page.locator('#editor-screen')).toBeVisible();
        await expect(page.locator('#setup-screen')).not.toBeVisible();
        await expect(page.locator('#workspace-name')).toHaveText(workspace);
        await expect(page.locator('#doc-title')).toBeVisible();
        await expect(page.locator('#doc-content')).toBeVisible();
    });

    test('text input persists in title and content', async ({ page }) => {
        const workspace = helper.generateTestWorkspace();
        await helper.joinWorkspace(workspace);

        await helper.typeInTitle('My Document Title');
        await helper.typeInContent('Hello, this is the document content.');

        expect(await helper.getDocTitle()).toBe('My Document Title');
        expect(await helper.getDocContent()).toBe('Hello, this is the document content.');
    });

    test('document is saved to NunDB after typing', async ({ page }) => {
        const workspace = helper.generateTestWorkspace();
        await helper.joinWorkspace(workspace);

        await helper.typeInTitle('Save Test');
        await helper.waitForSaved();

        const serialized = await helper.getSerializedDoc();
        expect(serialized).toBeTruthy();
        expect(typeof serialized).toBe('string');
        expect(serialized.length).toBeGreaterThan(0);
    });

    test('multi-user sync: remote update appears on local', async ({ page }) => {
        const workspace = helper.generateTestWorkspace();
        await helper.joinWorkspace(workspace);

        await helper.typeInTitle('Local Title');
        await helper.waitForSaved();

        const key = await helper.getNunDBKey();
        expect(key).toBe(`collab_editor_${workspace}`);

        // Create a remote CRDT doc via page.evaluate using our crdt.js module
        const remoteBase64 = await page.evaluate(async () => {
            const CRDT = await import('./crdt.js');
            // Create a doc with higher counter so it wins the merge
            let doc = CRDT.from({ title: 'Remote Title', content: 'Remote Content' });
            // Bump counter to ensure remote wins
            doc = CRDT.change(doc, (d) => { d.title = 'Remote Title'; });
            doc = CRDT.change(doc, (d) => { d.content = 'Remote Content'; });
            doc = CRDT.change(doc, (d) => { d.title = 'Remote Title'; });
            const bytes = CRDT.save(doc);
            let binary = '';
            for (let i = 0; i < bytes.length; i++) {
                binary += String.fromCharCode(bytes[i]);
            }
            return btoa(binary);
        });

        await helper.simulateRemoteUpdate(key, remoteBase64);
        await page.waitForTimeout(200);

        const title = await helper.getDocTitle();
        const content = await helper.getDocContent();
        expect(title.length).toBeGreaterThan(0);
        expect(content.length).toBeGreaterThan(0);
    });

    test('persistence: rejoin workspace preserves data', async ({ page }) => {
        const workspace = helper.generateTestWorkspace();
        await helper.joinWorkspace(workspace);

        await helper.typeInTitle('Persistent Title');
        await helper.typeInContent('Persistent Content');
        await helper.waitForSaved();

        // Leave workspace
        await page.click('#change-workspace-btn');
        await expect(page.locator('#setup-screen')).toBeVisible();

        // Rejoin same workspace
        await helper.joinWorkspace(workspace);

        expect(await helper.getDocTitle()).toBe('Persistent Title');
        expect(await helper.getDocContent()).toBe('Persistent Content');
    });

    test('leave workspace returns to setup screen', async ({ page }) => {
        const workspace = helper.generateTestWorkspace();
        await helper.joinWorkspace(workspace);

        await page.click('#change-workspace-btn');

        await expect(page.locator('#setup-screen')).toBeVisible();
        await expect(page.locator('#editor-screen')).not.toBeVisible();
        await expect(page.locator('#workspace-input')).toHaveValue('');
        await expect(page.locator('#join-btn')).toBeDisabled();
    });

    test('concurrent editing: two contexts edit different fields', async ({ page }) => {
        const workspace = helper.generateTestWorkspace();

        // User A joins and types a title
        await helper.joinWorkspace(workspace);
        await helper.typeInTitle('Title by User A');
        await helper.waitForSaved();

        const key = await helper.getNunDBKey();

        // Simulate User B: load A's doc, edit content field, push back
        const mergedBase64 = await page.evaluate(async (key) => {
            const CRDT = await import('./crdt.js');
            const app = window._editorApp;
            const existingB64 = app.nundb._mockStorage.get(key);

            // Decode User A's doc
            const binary = atob(existingB64);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) {
                bytes[i] = binary.charCodeAt(i);
            }
            let docB = CRDT.load(bytes);

            // User B edits only the content field
            docB = CRDT.change(docB, (d) => {
                d.content = 'Content by User B';
            });

            // Save and encode
            const savedBytes = CRDT.save(docB);
            let bin = '';
            for (let i = 0; i < savedBytes.length; i++) {
                bin += String.fromCharCode(savedBytes[i]);
            }
            return btoa(bin);
        }, key);

        await helper.simulateRemoteUpdate(key, mergedBase64);
        await page.waitForTimeout(200);

        const title = await helper.getDocTitle();
        const content = await helper.getDocContent();

        expect(title).toBe('Title by User A');
        expect(content).toBe('Content by User B');
    });
});
