import { validateNodeData } from '../utils/validation.js';
import { generateId, clamp } from '../utils/helpers.js';
import { UI, COLORS, EVENTS } from '../config/constants.js';

export class NodeService {
    constructor(databaseService) {
        this.db = databaseService;
        this.nodes = new Map();
        this.selectedNodes = new Set();
        this.eventListeners = new Map();
        
        this.db.on(EVENTS.NODES_UPDATED, (data) => {
            this.handleNodesUpdate(data);
        });
    }

    createNode(x, y, text = 'New Node', color = COLORS.DEFAULT_NODE) {
        const node = {
            id: generateId('node_'),
            text: text.trim(),
            x: Math.round(x),
            y: Math.round(y),
            color,
            created: Date.now(),
            updated: Date.now()
        };

        const errors = validateNodeData(node);
        if (errors.length > 0) {
            this.emit(EVENTS.ERROR_OCCURRED, new Error(errors[0]));
            return null;
        }

        this.nodes.set(node.id, node);
        this.db.saveNode(node);
        this.emit(EVENTS.NODE_CREATED, node);
        return node;
    }

    updateNode(nodeId, updates) {
        const node = this.nodes.get(nodeId);
        if (!node) return false;

        const updatedNode = {
            ...node,
            ...updates,
            id: nodeId,
            updated: Date.now()
        };

        if (updates.x !== undefined) {
            updatedNode.x = clamp(updates.x, UI.CANVAS_PADDING, window.innerWidth - UI.CANVAS_PADDING);
        }
        
        if (updates.y !== undefined) {
            updatedNode.y = clamp(updates.y, UI.CANVAS_PADDING, window.innerHeight - UI.CANVAS_PADDING);
        }

        const errors = validateNodeData(updatedNode);
        if (errors.length > 0) {
            this.emit(EVENTS.ERROR_OCCURRED, new Error(errors[0]));
            return false;
        }

        this.nodes.set(nodeId, updatedNode);
        this.db.saveNode(updatedNode);
        this.emit(EVENTS.NODE_UPDATED, updatedNode);
        return true;
    }

    deleteNode(nodeId) {
        const node = this.nodes.get(nodeId);
        if (!node) return false;

        this.nodes.delete(nodeId);
        this.selectedNodes.delete(nodeId);
        this.db.deleteNode(nodeId);
        this.emit(EVENTS.NODE_DELETED, { id: nodeId, node });
        return true;
    }

    selectNode(nodeId, multiSelect = false) {
        if (!multiSelect) {
            this.clearSelection();
        }

        if (this.nodes.has(nodeId)) {
            this.selectedNodes.add(nodeId);
            this.emit(EVENTS.NODE_SELECTED, { nodeId, selected: true });
            return true;
        }
        return false;
    }

    deselectNode(nodeId) {
        if (this.selectedNodes.has(nodeId)) {
            this.selectedNodes.delete(nodeId);
            this.emit(EVENTS.NODE_SELECTED, { nodeId, selected: false });
            return true;
        }
        return false;
    }

    clearSelection() {
        const previouslySelected = Array.from(this.selectedNodes);
        this.selectedNodes.clear();
        
        previouslySelected.forEach(nodeId => {
            this.emit(EVENTS.NODE_SELECTED, { nodeId, selected: false });
        });
    }

    getSelectedNodes() {
        return Array.from(this.selectedNodes)
            .map(nodeId => this.nodes.get(nodeId))
            .filter(Boolean);
    }

    moveSelectedNodes(deltaX, deltaY) {
        const moved = [];
        
        this.selectedNodes.forEach(nodeId => {
            const node = this.nodes.get(nodeId);
            if (node) {
                const newX = clamp(node.x + deltaX, UI.CANVAS_PADDING, window.innerWidth - UI.CANVAS_PADDING);
                const newY = clamp(node.y + deltaY, UI.CANVAS_PADDING, window.innerHeight - UI.CANVAS_PADDING);
                
                if (this.updateNode(nodeId, { x: newX, y: newY })) {
                    moved.push(nodeId);
                }
            }
        });

        return moved;
    }

    getNodeAt(x, y) {
        for (const node of this.nodes.values()) {
            const distance = Math.sqrt(
                Math.pow(x - node.x, 2) + Math.pow(y - node.y, 2)
            );
            
            if (distance <= UI.NODE_RADIUS) {
                return node;
            }
        }
        return null;
    }

    getNodesInRect(startX, startY, endX, endY) {
        const left = Math.min(startX, endX);
        const right = Math.max(startX, endX);
        const top = Math.min(startY, endY);
        const bottom = Math.max(startY, endY);

        return Array.from(this.nodes.values()).filter(node =>
            node.x >= left && node.x <= right &&
            node.y >= top && node.y <= bottom
        );
    }

    deleteSelectedNodes() {
        const deleted = [];
        
        this.selectedNodes.forEach(nodeId => {
            if (this.deleteNode(nodeId)) {
                deleted.push(nodeId);
            }
        });

        return deleted;
    }

    duplicateSelectedNodes(offsetX = 50, offsetY = 50) {
        const duplicated = [];
        
        this.getSelectedNodes().forEach(node => {
            const newNode = this.createNode(
                node.x + offsetX,
                node.y + offsetY,
                node.text,
                node.color
            );
            
            if (newNode) {
                duplicated.push(newNode);
            }
        });

        return duplicated;
    }

    handleNodesUpdate(data) {
        if (!data) return;

        Object.values(data).forEach(nodeData => {
            if (nodeData && nodeData.id) {
                const existingNode = this.nodes.get(nodeData.id);
                
                if (!existingNode || existingNode.updated < nodeData.updated) {
                    this.nodes.set(nodeData.id, nodeData);
                    this.emit(EVENTS.NODE_SYNCED, nodeData);
                }
            }
        });
    }

    loadNodes(nodesMap) {
        this.nodes.clear();
        this.selectedNodes.clear();
        
        nodesMap.forEach((node, nodeId) => {
            this.nodes.set(nodeId, node);
        });

        this.emit(EVENTS.NODES_LOADED, this.nodes);
    }

    getStats() {
        return {
            totalNodes: this.nodes.size,
            selectedNodes: this.selectedNodes.size,
            nodesByColor: this.getNodesByColor()
        };
    }

    getNodesByColor() {
        const colorStats = {};
        
        this.nodes.forEach(node => {
            const color = node.color || COLORS.DEFAULT_NODE;
            colorStats[color] = (colorStats[color] || 0) + 1;
        });

        return colorStats;
    }

    exportNodes() {
        return Array.from(this.nodes.values());
    }

    importNodes(nodesData) {
        try {
            const imported = [];
            
            nodesData.forEach(nodeData => {
                const errors = validateNodeData(nodeData);
                if (errors.length === 0) {
                    const nodeId = nodeData.id || generateId('node_');
                    const node = {
                        ...nodeData,
                        id: nodeId,
                        updated: Date.now()
                    };
                    
                    this.nodes.set(nodeId, node);
                    this.db.saveNode(node);
                    imported.push(node);
                }
            });

            this.emit(EVENTS.NODES_IMPORTED, imported);
            return imported;
        } catch (error) {
            this.emit(EVENTS.ERROR_OCCURRED, error);
            return [];
        }
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