import { DatabaseService } from './src/services/database-service.js';
import { NodeService } from './src/services/node-service.js';
import { ConnectionService } from './src/services/connection-service.js';
import { Canvas } from './src/components/canvas.js';
import { Toolbar } from './src/components/toolbar.js';
import { UI } from './src/components/ui.js';
import { EVENTS } from './src/config/constants.js';
import { saveToLocalStorage, loadFromLocalStorage } from './src/utils/helpers.js';

class MindMapApp {
    constructor() {
        this.isInitialized = false;
        this.currentWorkspace = null;
        this.autoSaveTimer = null;
        
        this.ui = new UI();
        this.databaseService = new DatabaseService();
        this.nodeService = new NodeService(this.databaseService);
        this.connectionService = new ConnectionService(this.databaseService, this.nodeService);
        
        this.setupEventListeners();
        // Initialize in background but don't block UI
        setTimeout(() => this.init(), 100);
    }

    async init() {
        try {
            this.ui.updateConnectionStatus('connecting');
            
            const connected = await this.databaseService.connect();
            if (connected) {
                this.ui.updateConnectionStatus('connected');
            } else {
                console.warn('Database connection failed, continuing in offline mode');
                this.ui.updateConnectionStatus('disconnected');
            }
            
            const savedWorkspace = loadFromLocalStorage('mindmap-workspace');
            if (savedWorkspace && connected) {
                await this.joinWorkspace(savedWorkspace);
            } else {
                this.showSetupScreen();
            }
        } catch (error) {
            console.error('Initialization error:', error);
            this.ui.updateConnectionStatus('disconnected');
            this.ui.showToast('Connection failed, some features may be limited', 'warning');
            this.showSetupScreen();
        }
    }

    setupEventListeners() {
        this.databaseService.on(EVENTS.CONNECTION_ESTABLISHED, () => {
            this.ui.updateConnectionStatus('connected');
        });

        this.databaseService.on(EVENTS.CONNECTION_LOST, () => {
            this.ui.updateConnectionStatus('disconnected');
            this.ui.showToast('Connection lost. Attempting to reconnect...', 'warning');
        });

        this.databaseService.on(EVENTS.ERROR_OCCURRED, (error) => {
            console.error('Database error:', error);
            this.ui.showToast(`Database error: ${error.message}`, 'error');
        });

        this.nodeService.on(EVENTS.NODE_CREATED, () => {
            this.scheduleAutoSave();
        });

        this.nodeService.on(EVENTS.NODE_UPDATED, () => {
            this.scheduleAutoSave();
        });

        this.nodeService.on(EVENTS.NODE_DELETED, () => {
            this.scheduleAutoSave();
        });

        this.connectionService.on(EVENTS.CONNECTION_CREATED, () => {
            this.scheduleAutoSave();
        });

        this.connectionService.on(EVENTS.CONNECTION_DELETED, () => {
            this.scheduleAutoSave();
        });

        const workspaceInput = document.getElementById('workspace-input');
        const joinBtn = document.getElementById('join-workspace-btn');
        
        if (workspaceInput && joinBtn) {
            workspaceInput.addEventListener('input', (e) => {
                const value = e.target.value.trim();
                const shouldEnable = value.length >= 3;
                joinBtn.disabled = !shouldEnable;
            });
            
            workspaceInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !joinBtn.disabled) {
                    this.handleJoinWorkspace();
                }
            });
            
            joinBtn.addEventListener('click', () => this.handleJoinWorkspace());
            
            // Enable button immediately if there's already text
            const initialValue = workspaceInput.value.trim();
            if (initialValue.length >= 3) {
                joinBtn.disabled = false;
            }
        }

        const createBtn = document.getElementById('create-workspace-btn');
        if (createBtn) {
            createBtn.addEventListener('click', () => this.handleCreateWorkspace());
        }

        const leaveBtn = document.getElementById('leave-workspace-btn');
        if (leaveBtn) {
            leaveBtn.addEventListener('click', () => this.handleLeaveWorkspace());
        }

        const exportBtn = document.getElementById('export-btn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.handleExport());
        }

        const importBtn = document.getElementById('import-btn');
        if (importBtn) {
            importBtn.addEventListener('click', () => this.handleImport());
        }

        const clearBtn = document.getElementById('clear-all-btn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.handleClearAll());
        }

        window.addEventListener('beforeunload', () => {
            this.cleanup();
        });

        document.addEventListener('keydown', (event) => {
            if ((event.ctrlKey || event.metaKey) && event.key === 's') {
                event.preventDefault();
                this.saveWorkspace();
            }
        });
    }

    showSetupScreen() {
        this.ui.showSetupScreen();
        this.isInitialized = false;
    }

    async showWorkspaceScreen() {
        this.ui.showWorkspaceScreen();
        
        if (!this.isInitialized) {
            await this.initializeWorkspaceComponents();
            this.isInitialized = true;
        }
    }

    async initializeWorkspaceComponents() {
        const canvasContainer = document.getElementById('canvas');
        const toolbarContainer = document.getElementById('toolbar');

        if (!canvasContainer || !toolbarContainer) {
            throw new Error('Required DOM elements not found');
        }

        this.canvas = new Canvas(canvasContainer, this.nodeService, this.connectionService);
        this.toolbar = new Toolbar(toolbarContainer, this.canvas, this.nodeService, this.connectionService);

        this.canvas.on(EVENTS.CONTEXT_MENU, (data) => {
            this.showContextMenu(data);
        });

        await this.loadWorkspaceData();
        this.startAutoSave();
    }

    async handleJoinWorkspace() {
        const workspaceInput = document.getElementById('workspace-input');
        const workspaceName = workspaceInput ? workspaceInput.value.trim() : '';
        
        if (workspaceName && workspaceName.length >= 3) {
            try {
                this.ui.updateConnectionStatus('connecting', 'Connecting to database...');
                
                if (!this.databaseService.isConnected) {
                    const connected = await this.databaseService.connect();
                    if (!connected) {
                        throw new Error('Failed to connect to database');
                    }
                }
                
                await this.joinWorkspace(workspaceName);
            } catch (error) {
                console.error('Join workspace error:', error);
                this.ui.updateConnectionStatus('disconnected');
                this.ui.showToast(`Failed to join workspace: ${error.message}`, 'error');
            }
        }
    }

    async handleCreateWorkspace() {
        const workspaceName = await this.ui.showWorkspaceJoinDialog();
        if (workspaceName) {
            await this.createWorkspace(workspaceName);
        }
    }

    async joinWorkspace(workspaceName) {
        try {
            this.ui.updateConnectionStatus('connecting', 'Joining workspace...');
            
            const success = await this.databaseService.joinWorkspace(workspaceName);
            if (!success) {
                throw new Error('Failed to join workspace');
            }

            this.currentWorkspace = workspaceName;
            this.ui.updateWorkspaceInfo(workspaceName);
            this.ui.updateConnectionStatus('connected');
            
            saveToLocalStorage('mindmap-workspace', workspaceName);
            
            await this.showWorkspaceScreen();
            this.ui.showToast(`Joined workspace: ${workspaceName}`, 'success');
        } catch (error) {
            console.error('Join workspace error:', error);
            this.ui.updateConnectionStatus('disconnected');
            this.ui.showToast(`Failed to join workspace: ${error.message}`, 'error');
        }
    }

    async createWorkspace(workspaceName) {
        await this.joinWorkspace(workspaceName);
    }

    async handleLeaveWorkspace() {
        const confirmed = await this.ui.showConfirmDialog(
            'Leave Workspace',
            'Are you sure you want to leave this workspace? Unsaved changes will be lost.',
            'Leave',
            'Cancel'
        );

        if (confirmed) {
            this.leaveWorkspace();
        }
    }

    leaveWorkspace() {
        this.cleanup();
        this.currentWorkspace = null;
        this.isInitialized = false;
        
        saveToLocalStorage('mindmap-workspace', null);
        
        this.ui.showSetupScreen();
        this.ui.updateConnectionStatus('connected');
        this.ui.showToast('Left workspace', 'info');
    }

    async loadWorkspaceData() {
        try {
            const data = await this.databaseService.loadWorkspaceData();
            
            this.nodeService.loadNodes(data.nodes);
            this.connectionService.loadConnections(data.connections);
            
            if (data.nodes.size > 0) {
                setTimeout(() => {
                    this.canvas.centerView();
                }, 100);
            }
        } catch (error) {
            console.error('Load workspace error:', error);
            this.ui.showToast('Failed to load workspace data', 'error');
        }
    }

    scheduleAutoSave() {
        if (this.autoSaveTimer) {
            clearTimeout(this.autoSaveTimer);
        }
        
        this.autoSaveTimer = setTimeout(() => {
            this.saveWorkspace();
        }, 2000);
    }

    async saveWorkspace() {
        if (!this.currentWorkspace) return;

        try {
            const nodes = Array.from(this.nodeService.nodes.values());
            const connections = Array.from(this.connectionService.connections.values());
            
            await Promise.all([
                ...nodes.map(node => this.databaseService.saveNode(node)),
                ...connections.map(conn => this.databaseService.saveConnection(conn))
            ]);
            
            saveToLocalStorage(`mindmap-backup-${this.currentWorkspace}`, {
                nodes,
                connections,
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Save error:', error);
            this.ui.showToast('Failed to save changes', 'error');
        }
    }

    startAutoSave() {
        setInterval(() => {
            this.saveWorkspace();
        }, 30000);
    }

    showContextMenu(data) {
        const nodeAtPoint = this.nodeService.getNodeAt(data.worldX, data.worldY);
        
        let options = [];

        if (nodeAtPoint) {
            options = [
                {
                    label: 'Edit Node',
                    icon: '✏️',
                    action: () => this.editNode(nodeAtPoint, data.x, data.y)
                },
                {
                    label: 'Duplicate Node',
                    icon: '📋',
                    action: () => this.duplicateNode(nodeAtPoint)
                },
                { separator: true },
                {
                    label: 'Delete Node',
                    icon: '🗑️',
                    danger: true,
                    action: () => this.nodeService.deleteNode(nodeAtPoint.id)
                }
            ];
        } else {
            options = [
                {
                    label: 'Create Node',
                    icon: '⚪',
                    action: () => this.nodeService.createNode(data.worldX, data.worldY, 'New Node')
                },
                { separator: true },
                {
                    label: 'Center View',
                    icon: '🎯',
                    action: () => this.canvas.centerView()
                },
                {
                    label: 'Fit to View',
                    icon: '🔍',
                    action: () => this.canvas.fitToView()
                }
            ];
        }

        this.ui.showContextMenu(data.x, data.y, options);
    }

    editNode(node, x, y) {
        this.toolbar.showNodeEditor(node, x, y);
    }

    duplicateNode(node) {
        this.nodeService.createNode(
            node.x + 50,
            node.y + 50,
            node.text,
            node.color
        );
    }

    async handleExport() {
        const nodes = this.nodeService.exportNodes();
        const connections = this.connectionService.exportConnections();
        
        const exportData = await this.ui.showExportDialog(nodes, connections);
        if (!exportData) return;

        try {
            await this.exportData(exportData);
            this.ui.showToast('Export completed successfully', 'success');
        } catch (error) {
            console.error('Export error:', error);
            this.ui.showToast(`Export failed: ${error.message}`, 'error');
        }
    }

    async exportData(exportData) {
        const data = {
            nodes: exportData.nodes,
            connections: exportData.includeConnections ? exportData.connections : [],
            workspace: this.currentWorkspace,
            exported: new Date().toISOString()
        };

        let content = '';
        let filename = '';
        let mimeType = '';

        switch (exportData.format) {
            case 'json':
                content = JSON.stringify(data, null, 2);
                filename = `mindmap-${this.currentWorkspace}-${Date.now()}.json`;
                mimeType = 'application/json';
                break;
            case 'csv':
                content = this.exportToCSV(data.nodes);
                filename = `mindmap-${this.currentWorkspace}-${Date.now()}.csv`;
                mimeType = 'text/csv';
                break;
            default:
                throw new Error('Unsupported export format');
        }

        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        URL.revokeObjectURL(url);
    }

    exportToCSV(nodes) {
        const headers = ['ID', 'Text', 'X', 'Y', 'Color', 'Created', 'Updated'];
        const rows = nodes.map(node => [
            node.id,
            `"${node.text.replace(/"/g, '""')}"`,
            node.x,
            node.y,
            node.color,
            new Date(node.created).toISOString(),
            new Date(node.updated).toISOString()
        ]);

        return [headers, ...rows].map(row => row.join(',')).join('\n');
    }

    async handleImport() {
        const importData = await this.ui.showImportDialog();
        if (!importData) return;

        try {
            if (!importData.merge) {
                await this.clearWorkspace();
            }

            const imported = this.importData(importData.data);
            this.ui.showToast(`Imported ${imported.nodes} nodes and ${imported.connections} connections`, 'success');
            
            setTimeout(() => {
                this.canvas.fitToView();
            }, 100);
        } catch (error) {
            console.error('Import error:', error);
            this.ui.showToast(`Import failed: ${error.message}`, 'error');
        }
    }

    importData(data) {
        const importedNodes = this.nodeService.importNodes(data.nodes || []);
        const importedConnections = this.connectionService.importConnections(data.connections || []);

        return {
            nodes: importedNodes.length,
            connections: importedConnections.length
        };
    }

    async handleClearAll() {
        const confirmed = await this.ui.showConfirmDialog(
            'Clear Workspace',
            'Are you sure you want to clear all nodes and connections? This action cannot be undone.',
            'Clear All',
            'Cancel'
        );

        if (confirmed) {
            await this.clearWorkspace();
            this.ui.showToast('Workspace cleared', 'info');
        }
    }

    async clearWorkspace() {
        const nodeIds = Array.from(this.nodeService.nodes.keys());
        const connectionIds = Array.from(this.connectionService.connections.keys());

        await Promise.all([
            ...nodeIds.map(id => this.nodeService.deleteNode(id)),
            ...connectionIds.map(id => this.connectionService.deleteConnection(id))
        ]);

        this.canvas.clear();
    }

    cleanup() {
        if (this.autoSaveTimer) {
            clearTimeout(this.autoSaveTimer);
            this.autoSaveTimer = null;
        }

        if (this.currentWorkspace) {
            this.saveWorkspace();
        }

        this.databaseService.disconnect();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.mindMapApp = new MindMapApp();
});