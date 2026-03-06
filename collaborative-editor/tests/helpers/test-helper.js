class TestHelper {
    constructor(page) {
        this.page = page;
    }

    async setupMockMode() {
        await this.page.addInitScript(() => {
            window.COLLAB_EDITOR_MOCK = true;
        });
    }

    async goto() {
        await this.page.goto('/', { waitUntil: 'load' });
        await this.page.waitForFunction(() => window._editorReady === true, { timeout: 30000 });
    }

    async waitForConnection() {
        await this.page.waitForSelector('.status-dot.connected', { timeout: 5000 });
    }

    async joinWorkspace(name) {
        await this.page.fill('#workspace-input', name);
        // Ensure input event fires to enable the join button
        await this.page.locator('#workspace-input').dispatchEvent('input');
        await this.page.waitForFunction(() => !document.getElementById('join-btn').disabled, { timeout: 5000 });
        await this.page.click('#join-btn');
        await this.page.waitForSelector('#editor-screen', { state: 'visible', timeout: 10000 });
    }

    async typeInTitle(text) {
        const titleInput = this.page.locator('#doc-title');
        await titleInput.fill(text);
        await titleInput.dispatchEvent('input');
        // Wait a tick for Automerge change to process
        await this.page.waitForTimeout(50);
    }

    async typeInContent(text) {
        const contentArea = this.page.locator('#doc-content');
        await contentArea.fill(text);
        await contentArea.dispatchEvent('input');
        await this.page.waitForTimeout(50);
    }

    async getDocTitle() {
        return this.page.locator('#doc-title').inputValue();
    }

    async getDocContent() {
        return this.page.locator('#doc-content').inputValue();
    }

    async waitForSaved() {
        await this.page.waitForFunction(
            () => document.getElementById('save-status')?.textContent === 'Saved',
            { timeout: 5000 }
        );
    }

    async simulateRemoteUpdate(key, base64) {
        await this.page.evaluate(
            ({ key, base64 }) => {
                const app = window._editorApp;
                if (app && app.nundb && app.nundb._mockStorage) {
                    app.nundb._mockStorage.set(key, base64);
                    const watchers = app.nundb._mockWatchers.get(key) || [];
                    for (const cb of watchers) {
                        cb({ value: base64 });
                    }
                }
            },
            { key, base64 }
        );
    }

    async getSerializedDoc() {
        return this.page.evaluate(() => {
            const app = window._editorApp;
            if (app && app.nundbKey && app.nundb && app.nundb._mockStorage) {
                return app.nundb._mockStorage.get(app.nundbKey) || null;
            }
            return null;
        });
    }

    async getNunDBKey() {
        return this.page.evaluate(() => {
            const app = window._editorApp;
            return app ? app.nundbKey : null;
        });
    }

    generateTestWorkspace() {
        return `test_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    }
}

module.exports = { TestHelper };
