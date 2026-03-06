import * as CRDT from './crdt.js';

class CollaborativeEditorApp {
    constructor() {
        this.nundb = null;
        this.doc = null;
        this.workspace = null;
        this.nundbKey = null;
        this.isLocalChange = false;
        this.saveTimeout = null;
        this.isConnected = false;

        this.init();
    }

    async init() {
        const useMock = window.COLLAB_EDITOR_MOCK === true;

        if (useMock) {
            this.initMockConnection();
        } else {
            await this.connectToNunDB();
        }

        this.setupEventListeners();
        window._editorReady = true;
    }

    async connectToNunDB() {
        this.updateConnectionStatus('connecting', 'Connecting...');

        try {
            this.nundb = new NunDb({
                url: 'wss://ws-staging.nundb.org/',
                db: 'mind-map-demo',
                token: 'demo-token',
            });

            await Promise.race([
                this.nundb._connectionPromise,
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Connection timeout')), 15000)
                ),
            ]);

            this.isConnected = true;
            this.updateConnectionStatus('connected', 'Connected');
        } catch (error) {
            console.error('Failed to connect to NunDB:', error);
            this.isConnected = false;
            this.updateConnectionStatus('disconnected', 'Disconnected');
        }
    }

    initMockConnection() {
        this.nundb = {
            _mockStorage: new Map(),
            _mockWatchers: new Map(),

            async get(key) {
                const value = this._mockStorage.get(key);
                return value !== undefined ? { value } : null;
            },

            async set(key, value) {
                this._mockStorage.set(key, value);
                const watchers = this._mockWatchers.get(key) || [];
                for (const callback of watchers) {
                    setTimeout(() => callback({ value }), 0);
                }
            },

            async watch(key, callback) {
                if (!this._mockWatchers.has(key)) {
                    this._mockWatchers.set(key, []);
                }
                this._mockWatchers.get(key).push(callback);
            },
        };

        this.isConnected = true;
        this.updateConnectionStatus('connected', 'Connected (Mock)');
    }

    setupEventListeners() {
        const workspaceInput = document.getElementById('workspace-input');
        const joinBtn = document.getElementById('join-btn');

        workspaceInput.addEventListener('input', () => {
            const isValid = workspaceInput.value.trim().length > 0 && workspaceInput.checkValidity();
            joinBtn.disabled = !isValid;
        });

        workspaceInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !joinBtn.disabled) {
                this.handleJoinWorkspace();
            }
        });

        joinBtn.addEventListener('click', () => {
            this.handleJoinWorkspace();
        });

        document.getElementById('change-workspace-btn').addEventListener('click', () => {
            this.handleLeaveWorkspace();
        });

        document.getElementById('doc-title').addEventListener('input', (e) => {
            this.handleLocalEdit('title', e.target.value);
        });

        document.getElementById('doc-content').addEventListener('input', (e) => {
            this.handleLocalEdit('content', e.target.value);
        });
    }

    async handleJoinWorkspace() {
        const input = document.getElementById('workspace-input');
        this.workspace = input.value.trim();
        this.nundbKey = `collab_editor_${this.workspace}`;

        // Initialize a fresh CRDT document
        this.doc = CRDT.from({ title: '', content: '' });

        // Try to load existing document from NunDB
        try {
            const result = await this.nundb.get(this.nundbKey);
            if (result && result.value) {
                const bytes = this.base64ToUint8Array(result.value);
                const remoteDoc = CRDT.load(bytes);
                this.doc = CRDT.merge(this.doc, remoteDoc);
            }
        } catch (error) {
            console.warn('No existing document found, starting fresh:', error);
        }

        // Update UI from doc state
        this.updateUIFromDoc();

        // Watch for remote changes
        this.nundb.watch(this.nundbKey, (data) => {
            this.handleRemoteUpdate(data);
        });

        // Show editor screen
        document.getElementById('workspace-name').textContent = this.workspace;
        document.getElementById('setup-screen').style.display = 'none';
        document.getElementById('editor-screen').style.display = 'flex';
        this.updateSaveStatus('Ready');
    }

    handleLeaveWorkspace() {
        this.workspace = null;
        this.nundbKey = null;
        this.doc = null;
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
            this.saveTimeout = null;
        }

        document.getElementById('doc-title').value = '';
        document.getElementById('doc-content').value = '';
        document.getElementById('workspace-input').value = '';
        document.getElementById('join-btn').disabled = true;

        document.getElementById('editor-screen').style.display = 'none';
        document.getElementById('setup-screen').style.display = 'flex';
    }

    handleLocalEdit(field, value) {
        if (!this.doc) return;

        this.doc = CRDT.change(this.doc, (d) => {
            d[field] = value;
        });

        this.updateSaveStatus('Saving...');
        this.debouncedSave();
    }

    debouncedSave() {
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
        }
        this.saveTimeout = setTimeout(() => {
            this.saveToNunDB();
        }, 300);
    }

    async saveToNunDB() {
        if (!this.doc || !this.nundbKey) return;

        try {
            const bytes = CRDT.save(this.doc);
            const base64 = this.uint8ArrayToBase64(bytes);
            this.isLocalChange = true;
            await this.nundb.set(this.nundbKey, base64);
            this.updateSaveStatus('Saved');
            document.getElementById('last-saved').textContent =
                'Last saved: ' + new Date().toLocaleTimeString();
        } catch (error) {
            console.error('Failed to save:', error);
            this.updateSaveStatus('Save failed');
        }
    }

    handleRemoteUpdate(data) {
        if (this.isLocalChange) {
            this.isLocalChange = false;
            return;
        }

        if (!data || !data.value || !this.doc) return;

        try {
            const bytes = this.base64ToUint8Array(data.value);
            const remoteDoc = CRDT.load(bytes);
            this.doc = CRDT.merge(this.doc, remoteDoc);
            this.updateUIFromDoc();
        } catch (error) {
            console.error('Failed to merge remote update:', error);
        }
    }

    updateUIFromDoc() {
        if (!this.doc) return;

        const titleInput = document.getElementById('doc-title');
        const contentTextarea = document.getElementById('doc-content');
        const docTitle = CRDT.getValue(this.doc, 'title') || '';
        const docContent = CRDT.getValue(this.doc, 'content') || '';

        if (titleInput.value !== docTitle) {
            const selStart = titleInput.selectionStart;
            const selEnd = titleInput.selectionEnd;
            titleInput.value = docTitle;
            titleInput.setSelectionRange(selStart, selEnd);
        }

        if (contentTextarea.value !== docContent) {
            const selStart = contentTextarea.selectionStart;
            const selEnd = contentTextarea.selectionEnd;
            contentTextarea.value = docContent;
            contentTextarea.setSelectionRange(selStart, selEnd);
        }
    }

    uint8ArrayToBase64(bytes) {
        let binary = '';
        for (let i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }

    base64ToUint8Array(base64) {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes;
    }

    updateConnectionStatus(status, text) {
        const dot = document.querySelector('.status-dot');
        const statusText = document.querySelector('.status-text');
        if (dot) {
            dot.className = 'status-dot';
            if (status === 'connected') dot.classList.add('connected');
            else if (status === 'disconnected') dot.classList.add('disconnected');
        }
        if (statusText) {
            statusText.textContent = text;
        }
    }

    updateSaveStatus(text) {
        const el = document.getElementById('save-status');
        if (el) el.textContent = text;
    }
}

window.CollaborativeEditorApp = CollaborativeEditorApp;

// Module scripts are deferred, so DOM is already parsed
window._editorApp = new CollaborativeEditorApp();
