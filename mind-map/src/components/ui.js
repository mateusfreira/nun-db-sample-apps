import { validateWorkspaceName, sanitizeInput } from '../utils/validation.js';
import { createElement, debounce } from '../utils/helpers.js';

export class UI {
    constructor() {
        this.currentToast = null;
        this.currentModal = null;
        this.contextMenu = null;
        this.setupGlobalEvents();
    }

    setupGlobalEvents() {
        document.addEventListener('click', () => {
            this.hideContextMenu();
        });

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                this.hideContextMenu();
                this.hideModal();
            }
        });
    }

    showSetupScreen() {
        const setupScreen = document.getElementById('setup-screen');
        const workspaceScreen = document.getElementById('workspace-screen');
        
        if (setupScreen) setupScreen.style.display = 'flex';
        if (workspaceScreen) workspaceScreen.style.display = 'none';
    }

    showWorkspaceScreen() {
        const setupScreen = document.getElementById('setup-screen');
        const workspaceScreen = document.getElementById('workspace-screen');
        
        if (setupScreen) setupScreen.style.display = 'none';
        if (workspaceScreen) workspaceScreen.style.display = 'flex';
    }

    updateConnectionStatus(status, message = '') {
        const statusElement = document.getElementById('connection-status');
        if (!statusElement) return;

        statusElement.className = `connection-status ${status}`;
        
        const statusText = {
            connecting: '🔄 Connecting...',
            connected: '✅ Connected',
            disconnected: '❌ Disconnected'
        };

        statusElement.textContent = message || statusText[status] || status;
    }

    updateWorkspaceInfo(workspaceName) {
        const workspaceNameElement = document.getElementById('workspace-name');
        if (workspaceNameElement) {
            workspaceNameElement.textContent = `Workspace: ${workspaceName}`;
        }
    }

    showToast(message, type = 'info', duration = 3000) {
        this.hideToast();

        const toast = createElement('div', {
            className: `toast ${type}`,
            innerHTML: `
                <div class="toast-icon">${this.getToastIcon(type)}</div>
                <div class="toast-message">${message}</div>
                <button class="toast-close">&times;</button>
            `
        });

        document.body.appendChild(toast);
        this.currentToast = toast;

        const closeBtn = toast.querySelector('.toast-close');
        closeBtn.addEventListener('click', () => this.hideToast());

        setTimeout(() => toast.classList.add('show'), 10);

        if (duration > 0) {
            setTimeout(() => this.hideToast(), duration);
        }
    }

    hideToast() {
        if (this.currentToast) {
            this.currentToast.classList.remove('show');
            setTimeout(() => {
                if (this.currentToast) {
                    this.currentToast.remove();
                    this.currentToast = null;
                }
            }, 300);
        }
    }

    getToastIcon(type) {
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        return icons[type] || icons.info;
    }

    showContextMenu(x, y, options) {
        this.hideContextMenu();

        const contextMenu = createElement('div', {
            className: 'context-menu',
            style: {
                left: `${x}px`,
                top: `${y}px`
            }
        });

        options.forEach(option => {
            if (option.separator) {
                const separator = createElement('div', {
                    className: 'context-menu-separator'
                });
                contextMenu.appendChild(separator);
            } else {
                const item = createElement('div', {
                    className: `context-menu-item ${option.danger ? 'danger' : ''}`,
                    innerHTML: `${option.icon || ''} ${option.label}`
                });

                item.addEventListener('click', (event) => {
                    event.stopPropagation();
                    this.hideContextMenu();
                    if (option.action) {
                        option.action();
                    }
                });

                contextMenu.appendChild(item);
            }
        });

        document.body.appendChild(contextMenu);
        this.contextMenu = contextMenu;

        const rect = contextMenu.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        if (rect.right > viewportWidth) {
            contextMenu.style.left = `${x - rect.width}px`;
        }

        if (rect.bottom > viewportHeight) {
            contextMenu.style.top = `${y - rect.height}px`;
        }
    }

    hideContextMenu() {
        if (this.contextMenu) {
            this.contextMenu.remove();
            this.contextMenu = null;
        }
    }

    showModal(content, options = {}) {
        this.hideModal();

        const modal = createElement('div', {
            className: 'modal-backdrop',
            innerHTML: `
                <div class="modal-content ${options.className || ''}">
                    <div class="modal-header">
                        <h3 class="modal-title">${options.title || ''}</h3>
                        <button class="modal-close">&times;</button>
                    </div>
                    <div class="modal-body">
                        ${content}
                    </div>
                </div>
            `
        });

        const closeBtn = modal.querySelector('.modal-close');
        closeBtn.addEventListener('click', () => this.hideModal());

        modal.addEventListener('click', (event) => {
            if (event.target === modal) {
                this.hideModal();
            }
        });

        document.body.appendChild(modal);
        this.currentModal = modal;

        return modal;
    }

    hideModal() {
        if (this.currentModal) {
            this.currentModal.remove();
            this.currentModal = null;
        }
    }

    showWorkspaceJoinDialog() {
        return new Promise((resolve) => {
            const content = `
                <form id="workspace-form">
                    <div class="form-group">
                        <label for="workspace-name">Workspace Name</label>
                        <input 
                            type="text" 
                            id="workspace-name" 
                            class="form-input" 
                            placeholder="Enter workspace name"
                            autocomplete="off"
                            required
                        >
                        <div class="form-error" id="workspace-error"></div>
                    </div>
                    <div class="form-actions">
                        <button type="button" class="btn-secondary" data-action="cancel">Cancel</button>
                        <button type="submit" class="btn-primary">Join Workspace</button>
                    </div>
                </form>
            `;

            const modal = this.showModal(content, {
                title: 'Join Workspace',
                className: 'workspace-modal'
            });

            const form = modal.querySelector('#workspace-form');
            const input = modal.querySelector('#workspace-name');
            const errorDiv = modal.querySelector('#workspace-error');
            const cancelBtn = modal.querySelector('[data-action="cancel"]');

            input.focus();

            const validateInput = debounce(() => {
                const value = input.value.trim();
                const error = validateWorkspaceName(value);
                
                if (error) {
                    errorDiv.textContent = error;
                    errorDiv.style.display = 'block';
                    return false;
                } else {
                    errorDiv.style.display = 'none';
                    return true;
                }
            }, 300);

            input.addEventListener('input', validateInput);

            cancelBtn.addEventListener('click', () => {
                this.hideModal();
                resolve(null);
            });

            form.addEventListener('submit', (event) => {
                event.preventDefault();
                
                const workspaceName = sanitizeInput(input.value);
                const error = validateWorkspaceName(workspaceName);
                
                if (error) {
                    errorDiv.textContent = error;
                    errorDiv.style.display = 'block';
                    input.focus();
                    return;
                }

                this.hideModal();
                resolve(workspaceName);
            });
        });
    }

    showExportDialog(nodes, connections) {
        const content = `
            <form id="export-form">
                <div class="form-group">
                    <label>Export Format</label>
                    <select id="export-format" class="form-select">
                        <option value="json">JSON</option>
                        <option value="csv">CSV</option>
                        <option value="svg">SVG</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>
                        <input type="checkbox" id="include-connections" checked>
                        Include connections
                    </label>
                </div>
                <div class="export-preview">
                    <strong>Export Summary:</strong>
                    <div>Nodes: ${nodes.length}</div>
                    <div>Connections: ${connections.length}</div>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn-secondary" data-action="cancel">Cancel</button>
                    <button type="submit" class="btn-primary">Export</button>
                </div>
            </form>
        `;

        return new Promise((resolve) => {
            const modal = this.showModal(content, {
                title: 'Export Mind Map',
                className: 'export-modal'
            });

            const form = modal.querySelector('#export-form');
            const formatSelect = modal.querySelector('#export-format');
            const includeConnections = modal.querySelector('#include-connections');
            const cancelBtn = modal.querySelector('[data-action="cancel"]');

            cancelBtn.addEventListener('click', () => {
                this.hideModal();
                resolve(null);
            });

            form.addEventListener('submit', (event) => {
                event.preventDefault();
                
                const exportData = {
                    format: formatSelect.value,
                    includeConnections: includeConnections.checked,
                    nodes,
                    connections: includeConnections.checked ? connections : []
                };

                this.hideModal();
                resolve(exportData);
            });
        });
    }

    showImportDialog() {
        const content = `
            <form id="import-form">
                <div class="form-group">
                    <label for="import-file">Select File</label>
                    <input type="file" id="import-file" class="form-input" accept=".json,.csv" required>
                </div>
                <div class="form-group">
                    <label>
                        <input type="checkbox" id="merge-data" checked>
                        Merge with existing data (uncheck to replace)
                    </label>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn-secondary" data-action="cancel">Cancel</button>
                    <button type="submit" class="btn-primary">Import</button>
                </div>
            </form>
        `;

        return new Promise((resolve) => {
            const modal = this.showModal(content, {
                title: 'Import Mind Map',
                className: 'import-modal'
            });

            const form = modal.querySelector('#import-form');
            const fileInput = modal.querySelector('#import-file');
            const mergeData = modal.querySelector('#merge-data');
            const cancelBtn = modal.querySelector('[data-action="cancel"]');

            cancelBtn.addEventListener('click', () => {
                this.hideModal();
                resolve(null);
            });

            form.addEventListener('submit', (event) => {
                event.preventDefault();
                
                const file = fileInput.files[0];
                if (!file) {
                    this.showToast('Please select a file', 'error');
                    return;
                }

                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const data = JSON.parse(e.target.result);
                        const importData = {
                            merge: mergeData.checked,
                            data
                        };
                        
                        this.hideModal();
                        resolve(importData);
                    } catch (error) {
                        this.showToast('Invalid file format', 'error');
                    }
                };
                
                reader.readAsText(file);
            });
        });
    }

    showConfirmDialog(title, message, confirmText = 'Confirm', cancelText = 'Cancel') {
        const content = `
            <div class="confirm-message">${message}</div>
            <div class="form-actions">
                <button type="button" class="btn-secondary" data-action="cancel">${cancelText}</button>
                <button type="button" class="btn-danger" data-action="confirm">${confirmText}</button>
            </div>
        `;

        return new Promise((resolve) => {
            const modal = this.showModal(content, {
                title,
                className: 'confirm-modal'
            });

            const confirmBtn = modal.querySelector('[data-action="confirm"]');
            const cancelBtn = modal.querySelector('[data-action="cancel"]');

            confirmBtn.addEventListener('click', () => {
                this.hideModal();
                resolve(true);
            });

            cancelBtn.addEventListener('click', () => {
                this.hideModal();
                resolve(false);
            });
        });
    }

    showLoadingIndicator(message = 'Loading...') {
        const loader = createElement('div', {
            className: 'loading-indicator',
            innerHTML: `
                <div class="loading-spinner"></div>
                <div class="loading-message">${message}</div>
            `
        });

        document.body.appendChild(loader);
        return loader;
    }

    hideLoadingIndicator(loader) {
        if (loader && loader.parentNode) {
            loader.remove();
        }
    }

    updateStatsPanel(nodeStats, connectionStats) {
        const statsElements = {
            'total-nodes': nodeStats.totalNodes,
            'selected-nodes': nodeStats.selectedNodes,
            'total-connections': connectionStats.totalConnections,
            'selected-connections': connectionStats.selectedConnections
        };

        Object.entries(statsElements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
            }
        });
    }

    createMinimap(canvas, nodes, connections) {
        const minimap = document.createElement('div');
        minimap.className = 'minimap';
        
        const minimapCanvas = document.createElement('canvas');
        minimapCanvas.width = 150;
        minimapCanvas.height = 100;
        minimap.appendChild(minimapCanvas);
        
        const ctx = minimapCanvas.getContext('2d');
        
        this.updateMinimap = () => {
            ctx.clearRect(0, 0, 150, 100);
            
            if (nodes.size === 0) return;
            
            const bounds = this.calculateBounds(Array.from(nodes.values()));
            const scaleX = 140 / (bounds.maxX - bounds.minX || 1);
            const scaleY = 90 / (bounds.maxY - bounds.minY || 1);
            const scale = Math.min(scaleX, scaleY);
            
            connections.forEach(connection => {
                const sourceNode = nodes.get(connection.source);
                const targetNode = nodes.get(connection.target);
                
                if (sourceNode && targetNode) {
                    ctx.strokeStyle = '#ccc';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(
                        (sourceNode.x - bounds.minX) * scale + 5,
                        (sourceNode.y - bounds.minY) * scale + 5
                    );
                    ctx.lineTo(
                        (targetNode.x - bounds.minX) * scale + 5,
                        (targetNode.y - bounds.minY) * scale + 5
                    );
                    ctx.stroke();
                }
            });
            
            nodes.forEach(node => {
                ctx.fillStyle = node.color;
                ctx.beginPath();
                ctx.arc(
                    (node.x - bounds.minX) * scale + 5,
                    (node.y - bounds.minY) * scale + 5,
                    2,
                    0,
                    2 * Math.PI
                );
                ctx.fill();
            });
        };
        
        this.updateMinimap();
        return minimap;
    }

    calculateBounds(nodes) {
        if (nodes.length === 0) {
            return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
        }
        
        let minX = nodes[0].x;
        let maxX = nodes[0].x;
        let minY = nodes[0].y;
        let maxY = nodes[0].y;
        
        nodes.forEach(node => {
            minX = Math.min(minX, node.x);
            maxX = Math.max(maxX, node.x);
            minY = Math.min(minY, node.y);
            maxY = Math.max(maxY, node.y);
        });
        
        return { minX, maxX, minY, maxY };
    }
}