import { TOOLS, COLORS } from '../config/constants.js';

export class Toolbar {
    constructor(container, canvas, nodeService, connectionService) {
        this.container = container;
        this.canvas = canvas;
        this.nodeService = nodeService;
        this.connectionService = connectionService;
        
        this.currentTool = TOOLS.SELECT;
        this.setupToolbar();
        this.updateStats();
        
        this.nodeService.on('node:created', () => this.updateStats());
        this.nodeService.on('node:deleted', () => this.updateStats());
        this.nodeService.on('node:selected', () => this.updateStats());
        this.connectionService.on('connection:created', () => this.updateStats());
        this.connectionService.on('connection:deleted', () => this.updateStats());
        this.connectionService.on('connection:selected', () => this.updateStats());
        this.canvas.on('zoom:changed', (zoom) => this.updateZoomDisplay(zoom));
    }

    setupToolbar() {
        this.container.innerHTML = `
            <div class="toolbar-section">
                <div class="tool-group" data-group="tools">
                    <button class="tool-btn active" data-tool="${TOOLS.SELECT}" title="Select Tool (S)">
                        ✋ Select
                    </button>
                    <button class="tool-btn" data-tool="${TOOLS.NODE}" title="Node Tool (N)">
                        ⚪ Node
                    </button>
                    <button class="tool-btn" data-tool="${TOOLS.CONNECTION}" title="Connection Tool (C)">
                        🔗 Connect
                    </button>
                    <button class="tool-btn" data-tool="${TOOLS.DELETE}" title="Delete Tool (D)">
                        🗑️ Delete
                    </button>
                </div>
                
                <div class="tool-group" data-group="actions">
                    <button class="tool-btn" data-action="duplicate" title="Duplicate Selected (Ctrl+D)">
                        📋 Duplicate
                    </button>
                    <button class="tool-btn" data-action="clear-selection" title="Clear Selection (Esc)">
                        🚫 Clear
                    </button>
                </div>
            </div>

            <div class="toolbar-section">
                <div class="tool-group" data-group="view">
                    <button class="tool-btn" data-action="center-view" title="Center View (Space)">
                        🎯 Center
                    </button>
                    <button class="tool-btn" data-action="fit-view" title="Fit to View (F)">
                        🔍 Fit
                    </button>
                </div>

                <div class="zoom-controls">
                    <button class="tool-btn" data-action="zoom-out" title="Zoom Out (-)">-</button>
                    <span class="zoom-level">100%</span>
                    <button class="tool-btn" data-action="zoom-in" title="Zoom In (+)">+</button>
                </div>
            </div>

            <div class="toolbar-section">
                <div class="stats-display">
                    <span class="stat-item">
                        <span class="stat-label">Nodes:</span>
                        <span class="stat-value" id="node-count">0</span>
                    </span>
                    <span class="stat-item">
                        <span class="stat-label">Connections:</span>
                        <span class="stat-value" id="connection-count">0</span>
                    </span>
                    <span class="stat-item">
                        <span class="stat-label">Selected:</span>
                        <span class="stat-value" id="selected-count">0</span>
                    </span>
                </div>
            </div>
        `;

        this.setupEventListeners();
    }

    setupEventListeners() {
        this.container.addEventListener('click', (event) => {
            const toolBtn = event.target.closest('.tool-btn');
            if (!toolBtn) return;

            const tool = toolBtn.dataset.tool;
            const action = toolBtn.dataset.action;

            if (tool) {
                this.selectTool(tool);
            } else if (action) {
                this.executeAction(action);
            }
        });

        document.addEventListener('keydown', (event) => {
            if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
                return;
            }
            
            this.handleKeydown(event);
        });
    }

    selectTool(tool) {
        if (this.currentTool === tool) return;

        this.currentTool = tool;
        this.canvas.setTool(tool);

        this.container.querySelectorAll('[data-tool]').forEach(btn => {
            btn.classList.remove('active');
        });

        const activeBtn = this.container.querySelector(`[data-tool="${tool}"]`);
        if (activeBtn) {
            activeBtn.classList.add('active');
        }
    }

    executeAction(action) {
        switch (action) {
            case 'duplicate':
                this.duplicateSelection();
                break;
            case 'clear-selection':
                this.clearSelection();
                break;
            case 'center-view':
                this.canvas.centerView();
                break;
            case 'fit-view':
                this.canvas.fitToView();
                break;
            case 'zoom-in':
                this.zoomIn();
                break;
            case 'zoom-out':
                this.zoomOut();
                break;
            case 'delete-selected':
                this.deleteSelected();
                break;
        }
    }

    handleKeydown(event) {
        switch (event.key.toLowerCase()) {
            case 's':
                event.preventDefault();
                this.selectTool(TOOLS.SELECT);
                break;
            case 'n':
                event.preventDefault();
                this.selectTool(TOOLS.NODE);
                break;
            case 'c':
                event.preventDefault();
                this.selectTool(TOOLS.CONNECTION);
                break;
            case 'd':
                if (event.ctrlKey || event.metaKey) {
                    event.preventDefault();
                    this.duplicateSelection();
                } else {
                    event.preventDefault();
                    this.selectTool(TOOLS.DELETE);
                }
                break;
            case 'escape':
                event.preventDefault();
                this.clearSelection();
                break;
            case ' ':
                event.preventDefault();
                this.canvas.centerView();
                break;
            case 'f':
                event.preventDefault();
                this.canvas.fitToView();
                break;
            case 'delete':
            case 'backspace':
                event.preventDefault();
                this.deleteSelected();
                break;
            case '=':
            case '+':
                event.preventDefault();
                this.zoomIn();
                break;
            case '-':
                event.preventDefault();
                this.zoomOut();
                break;
        }
    }

    duplicateSelection() {
        const selectedNodes = this.nodeService.getSelectedNodes();
        if (selectedNodes.length === 0) return;

        const duplicated = this.nodeService.duplicateSelectedNodes();
        if (duplicated.length > 0) {
            this.nodeService.clearSelection();
            duplicated.forEach(node => {
                this.nodeService.selectNode(node.id, true);
            });
        }
    }

    clearSelection() {
        this.nodeService.clearSelection();
        this.connectionService.clearSelection();
    }

    deleteSelected() {
        const deletedNodes = this.nodeService.deleteSelectedNodes();
        const deletedConnections = this.connectionService.deleteSelectedConnections();
        
        if (deletedNodes.length > 0 || deletedConnections.length > 0) {
            this.updateStats();
        }
    }

    zoomIn() {
        const currentZoom = this.canvas.zoom;
        const newZoom = Math.min(currentZoom * 1.2, 3.0);
        this.setZoom(newZoom);
    }

    zoomOut() {
        const currentZoom = this.canvas.zoom;
        const newZoom = Math.max(currentZoom / 1.2, 0.5);
        this.setZoom(newZoom);
    }

    setZoom(zoom) {
        this.canvas.zoom = zoom;
        this.canvas.updateTransform();
        this.canvas.updateConnections();
        this.updateZoomDisplay(zoom);
    }

    updateZoomDisplay(zoom) {
        const zoomLevel = this.container.querySelector('.zoom-level');
        if (zoomLevel) {
            zoomLevel.textContent = `${Math.round(zoom * 100)}%`;
        }
    }

    updateStats() {
        const nodeStats = this.nodeService.getStats();
        const connectionStats = this.connectionService.getStats();
        
        const nodeCount = this.container.querySelector('#node-count');
        const connectionCount = this.container.querySelector('#connection-count');
        const selectedCount = this.container.querySelector('#selected-count');

        if (nodeCount) {
            nodeCount.textContent = nodeStats.totalNodes;
        }
        
        if (connectionCount) {
            connectionCount.textContent = connectionStats.totalConnections;
        }
        
        if (selectedCount) {
            const total = nodeStats.selectedNodes + connectionStats.selectedConnections;
            selectedCount.textContent = total;
        }

        this.updateActionButtons();
    }

    updateActionButtons() {
        const hasSelection = this.nodeService.selectedNodes.size > 0 || this.connectionService.selectedConnections.size > 0;
        const hasNodeSelection = this.nodeService.selectedNodes.size > 0;
        
        const duplicateBtn = this.container.querySelector('[data-action="duplicate"]');
        const clearBtn = this.container.querySelector('[data-action="clear-selection"]');
        
        if (duplicateBtn) {
            duplicateBtn.disabled = !hasNodeSelection;
            duplicateBtn.classList.toggle('disabled', !hasNodeSelection);
        }
        
        if (clearBtn) {
            clearBtn.disabled = !hasSelection;
            clearBtn.classList.toggle('disabled', !hasSelection);
        }
    }

    createColorPicker() {
        const colorPicker = document.createElement('div');
        colorPicker.className = 'color-picker';
        colorPicker.innerHTML = COLORS.VALID_COLORS.map(color => 
            `<div class="color-option" style="background-color: ${color}" data-color="${color}"></div>`
        ).join('');

        colorPicker.addEventListener('click', (event) => {
            const colorOption = event.target.closest('.color-option');
            if (!colorOption) return;

            const color = colorOption.dataset.color;
            this.applyColorToSelected(color);
        });

        return colorPicker;
    }

    applyColorToSelected(color) {
        const selectedNodes = this.nodeService.getSelectedNodes();
        selectedNodes.forEach(node => {
            this.nodeService.updateNode(node.id, { color });
        });
    }

    showNodeEditor(node, x, y) {
        const editor = document.createElement('div');
        editor.className = 'node-editor';
        editor.style.left = `${x}px`;
        editor.style.top = `${y}px`;

        editor.innerHTML = `
            <input type="text" class="node-text" value="${node.text}" placeholder="Node text">
            <div class="color-picker">
                ${COLORS.VALID_COLORS.map(color => 
                    `<div class="color-option ${color === node.color ? 'selected' : ''}" 
                         style="background-color: ${color}" data-color="${color}"></div>`
                ).join('')}
            </div>
            <div class="actions">
                <button class="btn-secondary cancel-btn">Cancel</button>
                <button class="btn-primary save-btn">Save</button>
            </div>
        `;

        const textInput = editor.querySelector('.node-text');
        const colorOptions = editor.querySelectorAll('.color-option');
        const saveBtn = editor.querySelector('.save-btn');
        const cancelBtn = editor.querySelector('.cancel-btn');

        let selectedColor = node.color;

        colorOptions.forEach(option => {
            option.addEventListener('click', () => {
                colorOptions.forEach(opt => opt.classList.remove('selected'));
                option.classList.add('selected');
                selectedColor = option.dataset.color;
            });
        });

        saveBtn.addEventListener('click', () => {
            const newText = textInput.value.trim();
            this.nodeService.updateNode(node.id, { 
                text: newText, 
                color: selectedColor 
            });
            editor.remove();
        });

        cancelBtn.addEventListener('click', () => {
            editor.remove();
        });

        document.addEventListener('click', (event) => {
            if (!editor.contains(event.target)) {
                editor.remove();
            }
        }, { once: true });

        document.body.appendChild(editor);
        textInput.focus();
        textInput.select();
    }

    enable() {
        this.container.style.pointerEvents = 'auto';
        this.container.style.opacity = '1';
    }

    disable() {
        this.container.style.pointerEvents = 'none';
        this.container.style.opacity = '0.5';
    }
}