import { getEventCoordinates, debounce, throttle, clamp } from '../utils/helpers.js';
import { UI, TOOLS, EVENTS } from '../config/constants.js';

export class Canvas {
    constructor(container, nodeService, connectionService) {
        this.container = container;
        this.nodeService = nodeService;
        this.connectionService = connectionService;
        this.currentTool = TOOLS.SELECT;
        
        this.zoom = 1;
        this.panX = 0;
        this.panY = 0;
        this.isDragging = false;
        this.isSelecting = false;
        this.isPanning = false;
        
        this.dragStart = { x: 0, y: 0 };
        this.selectionStart = { x: 0, y: 0 };
        this.draggedNodes = new Set();
        this.tempConnection = null;
        
        this.eventListeners = new Map();
        this.setupEventListeners();
    }

    setupEventListeners() {
        this.container.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.container.addEventListener('mousemove', throttle(this.handleMouseMove.bind(this), UI.DEBOUNCE_DELAY));
        this.container.addEventListener('mouseup', this.handleMouseUp.bind(this));
        this.container.addEventListener('wheel', this.handleWheel.bind(this));
        this.container.addEventListener('contextmenu', this.handleContextMenu.bind(this));
        
        this.container.addEventListener('touchstart', this.handleTouchStart.bind(this));
        this.container.addEventListener('touchmove', this.handleTouchMove.bind(this));
        this.container.addEventListener('touchend', this.handleTouchEnd.bind(this));

        this.nodeService.on(EVENTS.NODE_CREATED, this.renderNode.bind(this));
        this.nodeService.on(EVENTS.NODE_UPDATED, this.updateNodeElement.bind(this));
        this.nodeService.on(EVENTS.NODE_DELETED, this.removeNodeElement.bind(this));
        this.nodeService.on(EVENTS.NODE_SELECTED, this.updateNodeSelection.bind(this));
        
        this.connectionService.on(EVENTS.CONNECTION_CREATED, this.renderConnection.bind(this));
        this.connectionService.on(EVENTS.CONNECTION_DELETED, this.removeConnectionElement.bind(this));
        this.connectionService.on(EVENTS.CONNECTION_SELECTED, this.updateConnectionSelection.bind(this));
    }

    setTool(tool) {
        this.currentTool = tool;
        this.container.className = `canvas tool-${tool}`;
        
        if (tool !== TOOLS.CONNECTION && this.tempConnection) {
            this.removeTempConnection();
        }
    }

    handleMouseDown(event) {
        event.preventDefault();
        const coords = getEventCoordinates(event, this.container);
        const worldCoords = this.screenToWorld(coords.x, coords.y);
        
        this.dragStart = { x: coords.x, y: coords.y };
        
        const nodeAtPoint = this.nodeService.getNodeAt(worldCoords.x, worldCoords.y);
        
        switch (this.currentTool) {
            case TOOLS.SELECT:
                this.handleSelectTool(worldCoords, nodeAtPoint, event.shiftKey);
                break;
            case TOOLS.NODE:
                this.handleNodeTool(worldCoords);
                break;
            case TOOLS.CONNECTION:
                this.handleConnectionTool(worldCoords, nodeAtPoint);
                break;
            case TOOLS.DELETE:
                this.handleDeleteTool(worldCoords, nodeAtPoint);
                break;
        }
    }

    handleMouseMove(event) {
        const coords = getEventCoordinates(event, this.container);
        const worldCoords = this.screenToWorld(coords.x, coords.y);
        
        if (this.isDragging && this.draggedNodes.size > 0) {
            const deltaX = coords.x - this.dragStart.x;
            const deltaY = coords.y - this.dragStart.y;
            
            if (Math.abs(deltaX) > UI.MIN_MOVEMENT || Math.abs(deltaY) > UI.MIN_MOVEMENT) {
                const worldDelta = this.screenToWorldDelta(deltaX, deltaY);
                this.nodeService.moveSelectedNodes(worldDelta.x, worldDelta.y);
                this.dragStart = { x: coords.x, y: coords.y };
                this.updateConnections();
            }
        } else if (this.isSelecting) {
            this.updateSelectionBox(coords);
        } else if (this.isPanning) {
            const deltaX = coords.x - this.dragStart.x;
            const deltaY = coords.y - this.dragStart.y;
            
            this.panX += deltaX;
            this.panY += deltaY;
            this.dragStart = { x: coords.x, y: coords.y };
            this.updateTransform();
        } else if (this.tempConnection) {
            this.updateTempConnection(worldCoords);
        }
    }

    handleMouseUp(event) {
        const coords = getEventCoordinates(event, this.container);
        const worldCoords = this.screenToWorld(coords.x, coords.y);
        
        if (this.isSelecting) {
            this.finishSelection();
        }
        
        if (this.tempConnection && this.currentTool === TOOLS.CONNECTION) {
            const targetNode = this.nodeService.getNodeAt(worldCoords.x, worldCoords.y);
            if (targetNode && targetNode.id !== this.tempConnection.sourceId) {
                this.connectionService.createConnection(this.tempConnection.sourceId, targetNode.id);
                this.removeTempConnection();
            }
            // Don't remove temp connection if we didn't complete one - let the user complete it with another click
        }
        
        this.isDragging = false;
        this.isSelecting = false;
        this.isPanning = false;
        this.draggedNodes.clear();
        this.removeSelectionBox();
    }

    handleSelectTool(worldCoords, nodeAtPoint, shiftKey) {
        if (nodeAtPoint) {
            this.nodeService.selectNode(nodeAtPoint.id, shiftKey);
            this.isDragging = true;
            this.draggedNodes.add(nodeAtPoint.id);
        } else {
            if (!shiftKey) {
                this.nodeService.clearSelection();
                this.connectionService.clearSelection();
            }
            
            const connectionNear = this.connectionService.getConnectionsNearPoint(worldCoords.x, worldCoords.y, 10);
            if (connectionNear.length > 0) {
                this.connectionService.selectConnection(connectionNear[0].connection.id, shiftKey);
            } else {
                this.startSelection(worldCoords);
            }
        }
    }

    handleNodeTool(worldCoords) {
        this.nodeService.createNode(worldCoords.x, worldCoords.y);
    }

    handleConnectionTool(worldCoords, nodeAtPoint) {
        if (nodeAtPoint) {
            if (!this.tempConnection) {
                this.startTempConnection(nodeAtPoint.id, worldCoords);
            } else {
                // Complete connection if clicking on another node
                if (nodeAtPoint.id !== this.tempConnection.sourceId) {
                    this.connectionService.createConnection(this.tempConnection.sourceId, nodeAtPoint.id);
                }
                this.removeTempConnection();
            }
        } else {
            // Remove temp connection if clicking on empty space
            if (this.tempConnection) {
                this.removeTempConnection();
            }
        }
    }

    handleDeleteTool(worldCoords, nodeAtPoint) {
        if (nodeAtPoint) {
            this.nodeService.deleteNode(nodeAtPoint.id);
        } else {
            const connectionNear = this.connectionService.getConnectionsNearPoint(worldCoords.x, worldCoords.y, 10);
            if (connectionNear.length > 0) {
                this.connectionService.deleteConnection(connectionNear[0].connection.id);
            }
        }
    }

    startSelection(worldCoords) {
        this.isSelecting = true;
        this.selectionStart = worldCoords;
        this.createSelectionBox();
    }

    createSelectionBox() {
        if (this.selectionBox) return;
        
        this.selectionBox = document.createElement('div');
        this.selectionBox.className = 'selection-box';
        this.container.appendChild(this.selectionBox);
    }

    updateSelectionBox(coords) {
        if (!this.selectionBox) return;
        
        const worldCoords = this.screenToWorld(coords.x, coords.y);
        const screenStart = this.worldToScreen(this.selectionStart.x, this.selectionStart.y);
        
        const left = Math.min(screenStart.x, coords.x);
        const top = Math.min(screenStart.y, coords.y);
        const width = Math.abs(coords.x - screenStart.x);
        const height = Math.abs(coords.y - screenStart.y);
        
        this.selectionBox.style.left = `${left}px`;
        this.selectionBox.style.top = `${top}px`;
        this.selectionBox.style.width = `${width}px`;
        this.selectionBox.style.height = `${height}px`;
    }

    finishSelection() {
        if (!this.selectionBox) return;
        
        const rect = this.selectionBox.getBoundingClientRect();
        const containerRect = this.container.getBoundingClientRect();
        
        const worldStart = this.screenToWorld(
            rect.left - containerRect.left,
            rect.top - containerRect.top
        );
        const worldEnd = this.screenToWorld(
            rect.right - containerRect.left,
            rect.bottom - containerRect.top
        );
        
        const nodesInRect = this.nodeService.getNodesInRect(
            worldStart.x, worldStart.y, worldEnd.x, worldEnd.y
        );
        
        nodesInRect.forEach(node => {
            this.nodeService.selectNode(node.id, true);
        });
    }

    removeSelectionBox() {
        if (this.selectionBox) {
            this.selectionBox.remove();
            this.selectionBox = null;
        }
    }

    startTempConnection(sourceNodeId, worldCoords) {
        this.tempConnection = {
            sourceId: sourceNodeId,
            startX: worldCoords.x,
            startY: worldCoords.y,
            endX: worldCoords.x,
            endY: worldCoords.y
        };
        this.createTempConnectionElement();
    }

    updateTempConnection(worldCoords) {
        if (!this.tempConnection) return;
        
        this.tempConnection.endX = worldCoords.x;
        this.tempConnection.endY = worldCoords.y;
        this.updateTempConnectionElement();
    }

    createTempConnectionElement() {
        if (!this.tempConnectionSvg) {
            this.tempConnectionSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            this.tempConnectionSvg.style.cssText = 'position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 15;';
            
            this.tempConnectionLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            this.tempConnectionLine.classList.add('mind-map-connection', 'temp');
            this.tempConnectionSvg.appendChild(this.tempConnectionLine);
            
            this.container.appendChild(this.tempConnectionSvg);
        }
    }

    updateTempConnectionElement() {
        if (!this.tempConnectionLine || !this.tempConnection) return;
        
        const start = this.worldToScreen(this.tempConnection.startX, this.tempConnection.startY);
        const end = this.worldToScreen(this.tempConnection.endX, this.tempConnection.endY);
        
        this.tempConnectionLine.setAttribute('x1', start.x);
        this.tempConnectionLine.setAttribute('y1', start.y);
        this.tempConnectionLine.setAttribute('x2', end.x);
        this.tempConnectionLine.setAttribute('y2', end.y);
    }

    removeTempConnection() {
        this.tempConnection = null;
        if (this.tempConnectionSvg) {
            this.tempConnectionSvg.remove();
            this.tempConnectionSvg = null;
            this.tempConnectionLine = null;
        }
    }

    handleWheel(event) {
        event.preventDefault();
        
        const coords = getEventCoordinates(event, this.container);
        const worldBefore = this.screenToWorld(coords.x, coords.y);
        
        const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1;
        this.zoom = clamp(this.zoom * zoomFactor, UI.ZOOM_MIN, UI.ZOOM_MAX);
        
        const worldAfter = this.screenToWorld(coords.x, coords.y);
        this.panX += (worldAfter.x - worldBefore.x) * this.zoom;
        this.panY += (worldAfter.y - worldBefore.y) * this.zoom;
        
        this.updateTransform();
        this.updateConnections();
        this.emit(EVENTS.ZOOM_CHANGED, this.zoom);
    }

    handleContextMenu(event) {
        event.preventDefault();
        const coords = getEventCoordinates(event, this.container);
        const worldCoords = this.screenToWorld(coords.x, coords.y);
        
        this.emit(EVENTS.CONTEXT_MENU, {
            x: event.clientX,
            y: event.clientY,
            worldX: worldCoords.x,
            worldY: worldCoords.y
        });
    }

    handleTouchStart(event) {
        if (event.touches.length === 1) {
            this.handleMouseDown(event);
        }
    }

    handleTouchMove(event) {
        event.preventDefault();
        if (event.touches.length === 1) {
            this.handleMouseMove(event);
        }
    }

    handleTouchEnd(event) {
        this.handleMouseUp(event);
    }

    screenToWorld(screenX, screenY) {
        return {
            x: (screenX - this.panX) / this.zoom,
            y: (screenY - this.panY) / this.zoom
        };
    }

    worldToScreen(worldX, worldY) {
        return {
            x: worldX * this.zoom + this.panX,
            y: worldY * this.zoom + this.panY
        };
    }

    screenToWorldDelta(deltaX, deltaY) {
        return {
            x: deltaX / this.zoom,
            y: deltaY / this.zoom
        };
    }

    updateTransform() {
        this.container.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.zoom})`;
        this.container.style.transformOrigin = '0 0';
    }

    renderNode(node) {
        const element = document.createElement('div');
        element.className = 'mind-map-node';
        element.dataset.nodeId = node.id;
        element.textContent = node.text || 'New Node';
        element.style.cssText = `
            position: absolute;
            left: ${node.x}px;
            top: ${node.y}px;
            background-color: ${node.color};
            padding: 8px 16px;
            border-radius: 8px;
            cursor: pointer;
            user-select: none;
            min-width: 80px;
            text-align: center;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        `;
        
        this.container.appendChild(element);
        element.classList.add('node-animations-enter');
    }

    updateNodeElement(node) {
        const element = this.container.querySelector(`[data-node-id="${node.id}"]`);
        if (!element) return;
        
        element.textContent = node.text;
        element.style.left = `${node.x}px`;
        element.style.top = `${node.y}px`;
        element.style.backgroundColor = node.color;
    }

    removeNodeElement(data) {
        const element = this.container.querySelector(`[data-node-id="${data.id}"]`);
        if (element) {
            element.classList.add('node-animations-exit');
            setTimeout(() => element.remove(), 300);
        }
    }

    updateNodeSelection(data) {
        const element = this.container.querySelector(`[data-node-id="${data.nodeId}"]`);
        if (element) {
            element.classList.toggle('selected', data.selected);
        }
    }

    renderConnection(connection) {
        if (!this.connectionsSvg) {
            this.connectionsSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            this.connectionsSvg.style.cssText = 'position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 5;';
            this.container.appendChild(this.connectionsSvg);
        }
        
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.classList.add('mind-map-connection');
        line.dataset.connectionId = connection.id;
        line.setAttribute('stroke', '#6b7280');
        line.setAttribute('stroke-width', '2');
        
        this.updateConnectionPath(line, connection);
        this.connectionsSvg.appendChild(line);
        
        line.classList.add('connection-animations-draw');
    }

    updateConnectionPath(line, connection) {
        const path = this.connectionService.getConnectionPath(connection);
        if (!path) {
            return;
        }
        
        line.setAttribute('x1', path.x1);
        line.setAttribute('y1', path.y1);
        line.setAttribute('x2', path.x2);
        line.setAttribute('y2', path.y2);
    }

    removeConnectionElement(data) {
        const line = this.connectionsSvg?.querySelector(`[data-connection-id="${data.id}"]`);
        if (line) {
            line.remove();
        }
    }

    updateConnectionSelection(data) {
        const line = this.connectionsSvg?.querySelector(`[data-connection-id="${data.connectionId}"]`);
        if (line) {
            line.classList.toggle('selected', data.selected);
        }
    }

    updateConnections() {
        if (!this.connectionsSvg) return;
        
        this.connectionService.connections.forEach(connection => {
            const line = this.connectionsSvg.querySelector(`[data-connection-id="${connection.id}"]`);
            if (line) {
                this.updateConnectionPath(line, connection);
            }
        });
    }

    centerView() {
        if (this.nodeService.nodes.size === 0) {
            this.panX = 0;
            this.panY = 0;
            this.zoom = 1;
        } else {
            const nodes = Array.from(this.nodeService.nodes.values());
            const bounds = this.calculateBounds(nodes);
            
            const centerX = (bounds.minX + bounds.maxX) / 2;
            const centerY = (bounds.minY + bounds.maxY) / 2;
            
            const containerRect = this.container.getBoundingClientRect();
            this.panX = containerRect.width / 2 - centerX;
            this.panY = containerRect.height / 2 - centerY;
        }
        
        this.updateTransform();
        this.updateConnections();
    }

    fitToView() {
        if (this.nodeService.nodes.size === 0) {
            this.centerView();
            return;
        }
        
        const nodes = Array.from(this.nodeService.nodes.values());
        const bounds = this.calculateBounds(nodes);
        
        const padding = 50;
        const containerRect = this.container.getBoundingClientRect();
        
        const scaleX = (containerRect.width - padding * 2) / (bounds.maxX - bounds.minX);
        const scaleY = (containerRect.height - padding * 2) / (bounds.maxY - bounds.minY);
        
        this.zoom = clamp(Math.min(scaleX, scaleY), UI.ZOOM_MIN, UI.ZOOM_MAX);
        
        const centerX = (bounds.minX + bounds.maxX) / 2;
        const centerY = (bounds.minY + bounds.maxY) / 2;
        
        this.panX = containerRect.width / 2 - centerX * this.zoom;
        this.panY = containerRect.height / 2 - centerY * this.zoom;
        
        this.updateTransform();
        this.updateConnections();
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

    clear() {
        this.container.innerHTML = '';
        this.connectionsSvg = null;
        this.tempConnectionSvg = null;
        this.tempConnectionLine = null;
        this.selectionBox = null;
        this.tempConnection = null;
    }

    on(event, listener) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, new Set());
        }
        this.eventListeners.get(event).add(listener);
    }

    off(event, listener) {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            listeners.delete(listener);
        }
    }

    emit(event, data = null) {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            listeners.forEach(listener => {
                try {
                    listener(data);
                } catch (error) {
                    console.error('Event listener error:', error);
                }
            });
        }
    }
}