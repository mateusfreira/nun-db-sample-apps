// Improved Mind Map Application with Modular Architecture
import { CONFIG } from './config.js';
import { Validators } from './utils/validators.js';
import { Helpers } from './utils/helpers.js';
import DatabaseManager from './managers/database-manager.js';
import NodeManager from './managers/node-manager.js';

class MindMapApp {
    constructor() {
        // Core managers
        this.databaseManager = new DatabaseManager();
        this.nodeManager = new NodeManager(this);
        
        // Application state
        this.workspace = '';
        this.userId = this.generateUserId();
        this.currentTool = CONFIG.TOOLS.SELECT;
        this.isInitialized = false;
        
        // UI state
        this.selectedElement = null;
        this.isDragging = false;
        this.isConnecting = false;
        this.dragOffset = { x: 0, y: 0 };
        this.scale = 1;
        this.panOffset = { x: 0, y: 0 };
        
        // Connection state
        this.connections = new Map();
        this.connectionStart = null;
        this.tempConnection = null;
        
        // Collaboration
        this.collaborators = new Set();
        this.lastSyncTime = Date.now();
        
        // Performance optimizations
        this.debouncedSave = Helpers.Event.debounce(this.saveWorkspace.bind(this), 1000);
        this.throttledMouseMove = Helpers.Event.throttle(this.handleMouseMove.bind(this), CONFIG.UI.DEBOUNCE_DELAY);
        
        // Event listeners cleanup
        this.cleanupFunctions = [];
        
        // Initialize application
        this.initialize();
    }

    /**
     * Initialize the application
     */
    async initialize() {
        try {
            this.setupEventListeners();
            this.checkUrlWorkspace();
            this.setTool(CONFIG.TOOLS.SELECT);
            this.setupAutoSave();
            this.isInitialized = true;
            
            Helpers.Notification.showToast('Mind Map initialized', 'success');
        } catch (error) {
            console.error('Failed to initialize Mind Map:', error);
            Helpers.Notification.showToast('Failed to initialize application', 'error');
        }
    }

    /**
     * Generate unique user ID
     * @returns {string} User ID
     */
    generateUserId() {
        return Helpers.Math.generateId('user_');
    }

    /**
     * Check and auto-join workspace from URL
     */
    checkUrlWorkspace() {
        const urlParams = new URLSearchParams(window.location.search);
        const workspaceFromUrl = urlParams.get('workspace');
        
        if (workspaceFromUrl) {
            const validationError = Validators.validateWorkspaceName(workspaceFromUrl);
            if (!validationError) {
                document.getElementById('workspaceInput').value = workspaceFromUrl;
                this.joinWorkspace();
            } else {
                console.warn('Invalid workspace from URL:', validationError);
            }
        }
    }

    /**
     * Setup event listeners with cleanup tracking
     */
    setupEventListeners() {
        // Workspace controls
        this.addEventListenerWithCleanup('#workspaceInput', 'keypress', (e) => {
            if (e.key === 'Enter') {
                this.joinWorkspace();
            }
        });

        this.addEventListenerWithCleanup('#joinBtn', 'click', () => {
            this.joinWorkspace();
        });

        this.addEventListenerWithCleanup('#leaveBtn', 'click', () => {
            this.leaveWorkspace();
        });

        // Tool selection
        document.querySelectorAll('.tool-btn').forEach(btn => {
            this.addEventListenerWithCleanup(btn, 'click', () => {
                this.setTool(btn.dataset.tool);
            });
        });

        // Canvas interactions
        const canvas = document.getElementById('canvas');
        this.addEventListenerWithCleanup(canvas, 'mousedown', this.handleMouseDown.bind(this));
        this.addEventListenerWithCleanup(canvas, 'mousemove', this.throttledMouseMove);
        this.addEventListenerWithCleanup(canvas, 'mouseup', this.handleMouseUp.bind(this));
        this.addEventListenerWithCleanup(canvas, 'click', this.handleCanvasClick.bind(this));
        this.addEventListenerWithCleanup(canvas, 'dblclick', this.handleDoubleClick.bind(this));

        // Touch events for mobile
        this.addEventListenerWithCleanup(canvas, 'touchstart', this.handleTouchStart.bind(this));
        this.addEventListenerWithCleanup(canvas, 'touchmove', this.handleTouchMove.bind(this));
        this.addEventListenerWithCleanup(canvas, 'touchend', this.handleTouchEnd.bind(this));

        // Keyboard shortcuts
        this.addEventListenerWithCleanup(document, 'keydown', this.handleKeyDown.bind(this));

        // Clear selection
        this.addEventListenerWithCleanup('#clearBtn', 'click', () => {
            this.clearSelection();
        });

        // Zoom controls
        this.addEventListenerWithCleanup('#zoomInBtn', 'click', () => {
            this.zoomIn();
        });

        this.addEventListenerWithCleanup('#zoomOutBtn', 'click', () => {
            this.zoomOut();
        });

        this.addEventListenerWithCleanup('#resetZoomBtn', 'click', () => {
            this.resetZoom();
        });
    }

    /**
     * Add event listener with automatic cleanup tracking
     * @param {string|Element} selector - Element selector or element
     * @param {string} event - Event name
     * @param {Function} handler - Event handler
     * @param {Object} options - Event options
     */
    addEventListenerWithCleanup(selector, event, handler, options = {}) {
        const element = typeof selector === 'string' ? document.querySelector(selector) : selector;
        if (element) {
            const cleanup = Helpers.Event.addEventListenerWithCleanup(element, event, handler, options);
            this.cleanupFunctions.push(cleanup);
        }
    }

    /**
     * Join a workspace
     */
    async joinWorkspace() {
        const workspaceInput = document.getElementById('workspaceInput');
        const workspaceName = workspaceInput.value.trim();
        
        if (!workspaceName) {
            Helpers.Notification.showToast('Please enter a workspace name', 'warning');
            return;
        }

        // Validate workspace name
        const validationError = Validators.validateWorkspaceName(workspaceName);
        if (validationError) {
            Helpers.Notification.showToast(validationError, 'error');
            return;
        }

        try {
            this.updateConnectionStatus('connecting', 'Connecting to workspace...');
            
            // Connect to database
            await this.databaseManager.connect((status, message) => {
                this.updateConnectionStatus(status, message);
            });

            // Set workspace
            this.workspace = workspaceName;
            this.updateUrlWorkspace(workspaceName);
            
            // Setup workspace watchers
            await this.setupWorkspaceWatchers();
            
            // Load existing data
            await this.loadWorkspace();
            
            // Update UI
            this.showWorkspaceScreen();
            this.updateWorkspaceInfo();
            
            this.updateConnectionStatus('connected', `Connected to "${workspaceName}"`);
            Helpers.Notification.showToast(`Joined workspace "${workspaceName}"`, 'success');
            
        } catch (error) {
            console.error('Failed to join workspace:', error);
            this.updateConnectionStatus('failed', 'Connection failed');
            Helpers.Notification.showToast('Failed to join workspace', 'error');
        }
    }

    /**
     * Leave current workspace
     */
    async leaveWorkspace() {
        if (!this.workspace) return;

        try {
            // Save current state before leaving
            await this.saveWorkspace();
            
            // Cleanup
            await this.databaseManager.disconnect();
            this.nodeManager.clearAllNodes();
            this.connections.clear();
            this.clearSelection();
            
            // Reset state
            this.workspace = '';
            this.collaborators.clear();
            
            // Update UI
            this.showSetupScreen();
            this.updateConnectionStatus('disconnected', 'Disconnected');
            
            // Update URL
            this.updateUrlWorkspace('');
            
            Helpers.Notification.showToast('Left workspace', 'info');
            
        } catch (error) {
            console.error('Error leaving workspace:', error);
            Helpers.Notification.showToast('Error leaving workspace', 'error');
        }
    }

    /**
     * Setup workspace data watchers
     */
    async setupWorkspaceWatchers() {
        const nodesKey = `${this.workspace}_nodes`;
        const connectionsKey = `${this.workspace}_connections`;
        const collaboratorsKey = `${this.workspace}_collaborators`;

        // Watch for node changes
        await this.databaseManager.watch(nodesKey, (data) => {
            this.handleNodesUpdate(data);
        });

        // Watch for connection changes  
        await this.databaseManager.watch(connectionsKey, (data) => {
            this.handleConnectionsUpdate(data);
        });

        // Watch for collaborator changes
        await this.databaseManager.watch(collaboratorsKey, (data) => {
            this.handleCollaboratorsUpdate(data);
        });
    }

    /**
     * Load workspace data from database
     */
    async loadWorkspace() {
        try {
            const nodesKey = `${this.workspace}_nodes`;
            const connectionsKey = `${this.workspace}_connections`;

            // Load nodes
            const nodesData = await this.databaseManager.load(nodesKey);
            if (nodesData && Array.isArray(nodesData)) {
                const loadResult = this.nodeManager.loadNodes(nodesData);
                console.log('Loaded nodes:', loadResult);
            }

            // Load connections
            const connectionsData = await this.databaseManager.load(connectionsKey);
            if (connectionsData && Array.isArray(connectionsData)) {
                this.loadConnections(connectionsData);
            }

            // Update display
            this.renderAll();
            
        } catch (error) {
            console.error('Failed to load workspace:', error);
            Helpers.Notification.showToast('Failed to load workspace data', 'warning');
        }
    }

    /**
     * Save workspace data to database
     */
    async saveWorkspace() {
        if (!this.databaseManager.isReady() || !this.workspace) {
            return;
        }

        try {
            const nodesKey = `${this.workspace}_nodes`;
            const connectionsKey = `${this.workspace}_connections`;

            // Prepare data
            const nodesData = this.nodeManager.exportNodes();
            const connectionsData = Array.from(this.connections.values());

            // Save to database
            await this.databaseManager.batchSave({
                [nodesKey]: nodesData,
                [connectionsKey]: connectionsData
            });

            this.lastSyncTime = Date.now();
            
        } catch (error) {
            console.error('Failed to save workspace:', error);
            Helpers.Notification.showToast('Failed to save changes', 'error');
        }
    }

    /**
     * Setup auto-save functionality
     */
    setupAutoSave() {
        setInterval(() => {
            if (this.workspace && this.databaseManager.isReady()) {
                this.debouncedSave();
            }
        }, CONFIG.UI.AUTO_SAVE_INTERVAL);
    }

    /**
     * Handle mouse down events
     * @param {MouseEvent} event - Mouse event
     */
    handleMouseDown(event) {
        const coords = Helpers.Event.getEventCoordinates(event, event.currentTarget);
        const nodeAtPosition = this.nodeManager.findNodeAtPosition(coords.x, coords.y);

        if (nodeAtPosition) {
            if (this.currentTool === CONFIG.TOOLS.SELECT) {
                this.startDragging(nodeAtPosition, coords);
            } else if (this.currentTool === CONFIG.TOOLS.CONNECTION) {
                this.startConnection(nodeAtPosition);
            } else if (this.currentTool === CONFIG.TOOLS.DELETE) {
                this.deleteNode(nodeAtPosition.id);
            }
        } else {
            if (this.currentTool === CONFIG.TOOLS.NODE) {
                this.createNodeAtPosition(coords.x, coords.y);
            }
        }
    }

    /**
     * Handle mouse move events
     * @param {MouseEvent} event - Mouse event
     */
    handleMouseMove(event) {
        if (!this.isDragging && !this.isConnecting) return;

        const coords = Helpers.Event.getEventCoordinates(event, event.currentTarget);

        if (this.isDragging && this.selectedElement) {
            this.dragNode(this.selectedElement.id, coords);
        }

        if (this.isConnecting) {
            this.updateTempConnection(coords);
        }
    }

    /**
     * Handle mouse up events
     * @param {MouseEvent} event - Mouse event
     */
    handleMouseUp(event) {
        if (this.isDragging) {
            this.stopDragging();
        }

        if (this.isConnecting) {
            const coords = Helpers.Event.getEventCoordinates(event, event.currentTarget);
            this.finishConnection(coords);
        }
    }

    /**
     * Handle canvas click events
     * @param {MouseEvent} event - Mouse event
     */
    handleCanvasClick(event) {
        const coords = Helpers.Event.getEventCoordinates(event, event.currentTarget);
        const nodeAtPosition = this.nodeManager.findNodeAtPosition(coords.x, coords.y);

        if (nodeAtPosition && this.currentTool === CONFIG.TOOLS.SELECT) {
            this.selectNode(nodeAtPosition.id);
        } else {
            this.clearSelection();
        }
    }

    /**
     * Handle double click events for editing
     * @param {MouseEvent} event - Mouse event
     */
    handleDoubleClick(event) {
        const coords = Helpers.Event.getEventCoordinates(event, event.currentTarget);
        const nodeAtPosition = this.nodeManager.findNodeAtPosition(coords.x, coords.y);

        if (nodeAtPosition) {
            this.editNode(nodeAtPosition.id);
        }
    }

    /**
     * Handle keyboard shortcuts
     * @param {KeyboardEvent} event - Keyboard event
     */
    handleKeyDown(event) {
        // Ignore if typing in input fields
        if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
            return;
        }

        const key = event.key.toLowerCase();
        const ctrl = event.ctrlKey || event.metaKey;

        switch (key) {
            case 'delete':
            case 'backspace':
                this.nodeManager.deleteSelectedNodes();
                this.renderAll();
                break;
                
            case 'c':
                if (ctrl) {
                    event.preventDefault();
                    this.nodeManager.copySelectedNodes();
                    Helpers.Notification.showToast('Copied nodes', 'info');
                }
                break;
                
            case 'v':
                if (ctrl) {
                    event.preventDefault();
                    const pasted = this.nodeManager.pasteNodes();
                    if (pasted.length > 0) {
                        this.renderAll();
                        Helpers.Notification.showToast(`Pasted ${pasted.length} nodes`, 'success');
                    }
                }
                break;
                
            case 'd':
                if (ctrl) {
                    event.preventDefault();
                    const duplicated = this.nodeManager.duplicateSelectedNodes();
                    if (duplicated.length > 0) {
                        this.renderAll();
                        Helpers.Notification.showToast(`Duplicated ${duplicated.length} nodes`, 'success');
                    }
                }
                break;
                
            case 'z':
                if (ctrl && !event.shiftKey) {
                    event.preventDefault();
                    if (this.nodeManager.undo()) {
                        this.renderAll();
                        Helpers.Notification.showToast('Undone', 'info');
                    }
                }
                break;
                
            case 'y':
                if (ctrl) {
                    event.preventDefault();
                    if (this.nodeManager.redo()) {
                        this.renderAll();
                        Helpers.Notification.showToast('Redone', 'info');
                    }
                }
                break;
                
            case 'a':
                if (ctrl) {
                    event.preventDefault();
                    // Select all nodes
                    const allNodes = this.nodeManager.getAllNodes();
                    this.nodeManager.setNodeSelection(allNodes.map(n => n.id), true);
                    this.renderAll();
                }
                break;

            case 'escape':
                this.clearSelection();
                this.setTool(CONFIG.TOOLS.SELECT);
                break;
        }
    }

    /**
     * Create node at position
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     */
    createNodeAtPosition(x, y) {
        try {
            const node = this.nodeManager.createNode(x, y);
            this.renderAll();
            this.debouncedSave();
            
            Helpers.Notification.showToast('Node created', 'success');
            return node;
        } catch (error) {
            console.error('Failed to create node:', error);
            Helpers.Notification.showToast('Failed to create node', 'error');
        }
    }

    /**
     * Select a node
     * @param {string} nodeId - Node ID
     */
    selectNode(nodeId) {
        this.nodeManager.clearSelection();
        this.nodeManager.setNodeSelection(nodeId, true);
        this.selectedElement = this.nodeManager.getNode(nodeId);
        this.renderAll();
    }

    /**
     * Clear all selections
     */
    clearSelection() {
        this.nodeManager.clearSelection();
        this.selectedElement = null;
        this.renderAll();
    }

    /**
     * Start dragging a node
     * @param {Object} node - Node to drag
     * @param {Object} coords - Mouse coordinates
     */
    startDragging(node, coords) {
        this.isDragging = true;
        this.selectedElement = node;
        this.dragOffset = {
            x: coords.x - node.x,
            y: coords.y - node.y
        };
        
        // Select the node being dragged
        this.selectNode(node.id);
    }

    /**
     * Drag node to new position
     * @param {string} nodeId - Node ID
     * @param {Object} coords - New coordinates
     */
    dragNode(nodeId, coords) {
        const newX = coords.x - this.dragOffset.x;
        const newY = coords.y - this.dragOffset.y;
        
        try {
            this.nodeManager.moveNode(nodeId, newX, newY);
            this.renderAll();
        } catch (error) {
            console.error('Failed to move node:', error);
        }
    }

    /**
     * Stop dragging
     */
    stopDragging() {
        this.isDragging = false;
        this.selectedElement = null;
        this.debouncedSave();
    }

    /**
     * Set active tool
     * @param {string} tool - Tool name
     */
    setTool(tool) {
        this.currentTool = tool;
        
        // Update UI
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tool === tool);
        });
        
        // Update cursor
        const canvas = document.getElementById('canvas');
        canvas.className = `canvas tool-${tool}`;
        
        // Clear temporary states
        this.clearSelection();
        this.isConnecting = false;
        this.tempConnection = null;
    }

    /**
     * Render all elements
     */
    renderAll() {
        this.renderNodes();
        this.renderConnections();
        this.updateStatistics();
    }

    /**
     * Render all nodes
     */
    renderNodes() {
        const canvas = document.getElementById('canvas');
        const existingNodes = canvas.querySelectorAll('.mind-map-node');
        existingNodes.forEach(node => node.remove());

        const nodes = this.nodeManager.getAllNodes();
        const selectedIds = new Set(Array.from(this.nodeManager.selectedNodes));

        Helpers.DOM.batchDOMUpdates(canvas, (fragment) => {
            nodes.forEach(node => {
                const nodeElement = this.createNodeElement(node, selectedIds.has(node.id));
                fragment.appendChild(nodeElement);
            });
        });
    }

    /**
     * Create DOM element for a node
     * @param {Object} node - Node data
     * @param {boolean} selected - Selection state
     * @returns {Element} Node element
     */
    createNodeElement(node, selected) {
        return Helpers.DOM.createElement('div', {
            className: `mind-map-node ${selected ? 'selected' : ''}`,
            attributes: {
                'data-node-id': node.id,
                'data-x': node.x,
                'data-y': node.y
            },
            style: {
                left: `${node.x - (node.width || CONFIG.UI.NODE_RADIUS)}px`,
                top: `${node.y - (node.height || CONFIG.UI.NODE_RADIUS)}px`,
                backgroundColor: node.color || CONFIG.COLORS.DEFAULT_NODE,
                width: `${node.width || CONFIG.UI.NODE_RADIUS * 2}px`,
                height: `${node.height || CONFIG.UI.NODE_RADIUS * 2}px`,
                borderRadius: '50%',
                position: 'absolute',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                userSelect: 'none',
                color: 'white',
                fontSize: '12px',
                fontWeight: 'bold',
                border: selected ? '3px solid #ef4444' : '2px solid rgba(0,0,0,0.1)',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                transition: 'all 0.2s ease'
            },
            textContent: node.text
        });
    }

    /**
     * Update connection status display
     * @param {string} status - Status type
     * @param {string} message - Status message
     */
    updateConnectionStatus(status, message) {
        const statusElement = document.getElementById('connectionStatus');
        if (statusElement) {
            statusElement.className = `connection-status ${status}`;
            statusElement.textContent = message;
        }
    }

    /**
     * Show workspace screen
     */
    showWorkspaceScreen() {
        document.getElementById('setupScreen').style.display = 'none';
        document.getElementById('workspaceScreen').style.display = 'block';
    }

    /**
     * Show setup screen
     */
    showSetupScreen() {
        document.getElementById('setupScreen').style.display = 'block';
        document.getElementById('workspaceScreen').style.display = 'none';
    }

    /**
     * Update workspace info display
     */
    updateWorkspaceInfo() {
        const workspaceInfo = document.getElementById('workspaceInfo');
        if (workspaceInfo) {
            workspaceInfo.textContent = `Workspace: "${this.workspace}" - Collaborate in real-time!`;
        }
        
        document.title = `Mind Map - ${this.workspace}`;
    }

    /**
     * Update URL with workspace parameter
     * @param {string} workspace - Workspace name
     */
    updateUrlWorkspace(workspace) {
        const url = new URL(window.location);
        if (workspace && workspace.trim()) {
            url.searchParams.set('workspace', workspace.trim());
        } else {
            url.searchParams.delete('workspace');
        }
        window.history.replaceState({}, '', url);
    }

    /**
     * Update statistics display
     */
    updateStatistics() {
        const stats = this.nodeManager.getStatistics();
        
        // Update node count
        const nodeCountElement = document.getElementById('nodeCount');
        if (nodeCountElement) {
            nodeCountElement.textContent = stats.total;
        }
        
        // Update selected count
        const selectedCountElement = document.getElementById('selectedCount');
        if (selectedCountElement) {
            selectedCountElement.textContent = stats.selected;
        }
    }

    /**
     * Zoom in
     */
    zoomIn() {
        this.scale = Helpers.Math.clamp(this.scale + CONFIG.UI.ZOOM_STEP, CONFIG.UI.ZOOM_MIN, CONFIG.UI.ZOOM_MAX);
        this.applyZoom();
    }

    /**
     * Zoom out
     */
    zoomOut() {
        this.scale = Helpers.Math.clamp(this.scale - CONFIG.UI.ZOOM_STEP, CONFIG.UI.ZOOM_MIN, CONFIG.UI.ZOOM_MAX);
        this.applyZoom();
    }

    /**
     * Reset zoom to 100%
     */
    resetZoom() {
        this.scale = 1;
        this.applyZoom();
    }

    /**
     * Apply zoom transformation
     */
    applyZoom() {
        const canvas = document.getElementById('canvas');
        if (canvas) {
            canvas.style.transform = `scale(${this.scale})`;
        }
        
        // Update zoom display
        const zoomDisplay = document.getElementById('zoomLevel');
        if (zoomDisplay) {
            zoomDisplay.textContent = `${Math.round(this.scale * 100)}%`;
        }
    }

    /**
     * Handle touch events (mobile support)
     */
    handleTouchStart(event) {
        event.preventDefault();
        const touch = event.touches[0];
        const mouseEvent = new MouseEvent('mousedown', {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        this.handleMouseDown(mouseEvent);
    }

    handleTouchMove(event) {
        event.preventDefault();
        const touch = event.touches[0];
        const mouseEvent = new MouseEvent('mousemove', {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        this.handleMouseMove(mouseEvent);
    }

    handleTouchEnd(event) {
        event.preventDefault();
        const mouseEvent = new MouseEvent('mouseup', {});
        this.handleMouseUp(mouseEvent);
    }

    /**
     * Handle real-time data updates
     */
    handleNodesUpdate(data) {
        // Implementation for handling real-time node updates
        console.log('Nodes updated:', data);
    }

    handleConnectionsUpdate(data) {
        // Implementation for handling real-time connection updates
        console.log('Connections updated:', data);
    }

    handleCollaboratorsUpdate(data) {
        // Implementation for handling collaborator updates
        console.log('Collaborators updated:', data);
    }

    /**
     * Render connections (placeholder)
     */
    renderConnections() {
        // Implementation for rendering connections between nodes
        // This would be expanded based on the connection system
    }

    /**
     * Load connections from data
     * @param {Array} connectionsData - Connection data array
     */
    loadConnections(connectionsData) {
        // Implementation for loading connections
        console.log('Loading connections:', connectionsData);
    }

    /**
     * Emit application events
     * @param {string} event - Event name
     * @param {any} data - Event data
     */
    emit(event, data) {
        console.log('Event:', event, data);
        // Implementation for event emission system
    }

    /**
     * Cleanup resources when app is destroyed
     */
    destroy() {
        // Cleanup all event listeners
        this.cleanupFunctions.forEach(cleanup => cleanup());
        this.cleanupFunctions.length = 0;
        
        // Disconnect from database
        this.databaseManager.disconnect();
        
        // Clear all data
        this.nodeManager.clearAllNodes();
        this.connections.clear();
        
        Helpers.Notification.showToast('Application cleaned up', 'info');
    }
}

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.mindMapApp = new MindMapApp();
});

// Handle page unload
window.addEventListener('beforeunload', () => {
    if (window.mindMapApp) {
        window.mindMapApp.destroy();
    }
});

export default MindMapApp;