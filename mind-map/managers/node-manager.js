// Node management for the Mind Map application
import { CONFIG } from '../config.js';
import { Validators } from '../utils/validators.js';
import { Helpers } from '../utils/helpers.js';

export class NodeManager {
    constructor(eventEmitter = null) {
        this.nodes = new Map();
        this.eventEmitter = eventEmitter;
        this.selectedNodes = new Set();
        this.clipboard = null;
        this.undoStack = [];
        this.redoStack = [];
        this.maxUndoSteps = 50;
    }

    /**
     * Create a new node
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {Object} options - Additional node options
     * @returns {Object} Created node
     */
    createNode(x, y, options = {}) {
        // Validate coordinates
        if (!Validators.isValidPosition(x, y)) {
            throw new Error('Invalid node position');
        }

        const node = {
            id: options.id || Helpers.Math.generateId('node_'),
            x: Math.round(x),
            y: Math.round(y),
            text: Helpers.Data.safeGet(options, 'text', 'New Node'),
            color: Helpers.Data.safeGet(options, 'color', CONFIG.COLORS.DEFAULT_NODE),
            width: Helpers.Data.safeGet(options, 'width', CONFIG.UI.NODE_RADIUS * 2),
            height: Helpers.Data.safeGet(options, 'height', CONFIG.UI.NODE_RADIUS * 2),
            created: Date.now(),
            modified: Date.now(),
            userId: Helpers.Data.safeGet(options, 'userId', null),
            metadata: Helpers.Data.safeGet(options, 'metadata', {})
        };

        // Validate node data
        const validationErrors = Validators.validateNodeData(node);
        if (validationErrors.length > 0) {
            throw new Error(`Invalid node data: ${validationErrors.join(', ')}`);
        }

        // Sanitize text input
        node.text = Validators.sanitizeInput(node.text);

        // Add to collection
        this.nodes.set(node.id, node);

        // Save state for undo
        this._saveState();

        // Emit event
        this._emit(CONFIG.EVENTS.NODE_CREATED, { node: Helpers.Data.deepClone(node) });

        return node;
    }

    /**
     * Update an existing node
     * @param {string} nodeId - Node ID
     * @param {Object} updates - Updates to apply
     * @returns {Object|null} Updated node or null if not found
     */
    updateNode(nodeId, updates) {
        const node = this.nodes.get(nodeId);
        if (!node) {
            console.warn(`Node ${nodeId} not found for update`);
            return null;
        }

        // Create updated node
        const updatedNode = {
            ...node,
            ...updates,
            id: nodeId, // Prevent ID changes
            modified: Date.now()
        };

        // Validate updates
        const validationErrors = Validators.validateNodeData(updatedNode);
        if (validationErrors.length > 0) {
            throw new Error(`Invalid node update: ${validationErrors.join(', ')}`);
        }

        // Sanitize text if updated
        if (updates.text !== undefined) {
            updatedNode.text = Validators.sanitizeInput(updatedNode.text);
        }

        // Apply updates
        this.nodes.set(nodeId, updatedNode);

        // Save state for undo
        this._saveState();

        // Emit event
        this._emit(CONFIG.EVENTS.NODE_UPDATED, { 
            nodeId, 
            node: Helpers.Data.deepClone(updatedNode),
            changes: updates 
        });

        return updatedNode;
    }

    /**
     * Delete a node
     * @param {string} nodeId - Node ID
     * @returns {boolean} Success status
     */
    deleteNode(nodeId) {
        const node = this.nodes.get(nodeId);
        if (!node) {
            console.warn(`Node ${nodeId} not found for deletion`);
            return false;
        }

        // Remove from collection
        this.nodes.delete(nodeId);

        // Remove from selections
        this.selectedNodes.delete(nodeId);

        // Save state for undo
        this._saveState();

        // Emit event
        this._emit(CONFIG.EVENTS.NODE_DELETED, { 
            nodeId, 
            node: Helpers.Data.deepClone(node) 
        });

        return true;
    }

    /**
     * Get node by ID
     * @param {string} nodeId - Node ID
     * @returns {Object|null} Node or null if not found
     */
    getNode(nodeId) {
        return this.nodes.get(nodeId) || null;
    }

    /**
     * Get all nodes
     * @returns {Array} Array of all nodes
     */
    getAllNodes() {
        return Array.from(this.nodes.values());
    }

    /**
     * Get nodes in a specific area
     * @param {Object} area - Area bounds {x, y, width, height}
     * @returns {Array} Nodes within the area
     */
    getNodesInArea(area) {
        return this.getAllNodes().filter(node => {
            return node.x >= area.x && 
                   node.x <= area.x + area.width &&
                   node.y >= area.y && 
                   node.y <= area.y + area.height;
        });
    }

    /**
     * Find node at coordinates
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {number} tolerance - Search tolerance
     * @returns {Object|null} Node at coordinates or null
     */
    findNodeAtPosition(x, y, tolerance = CONFIG.UI.NODE_RADIUS) {
        for (const node of this.nodes.values()) {
            const distance = Helpers.Math.distance({ x, y }, node);
            if (distance <= tolerance) {
                return node;
            }
        }
        return null;
    }

    /**
     * Move node to new position
     * @param {string} nodeId - Node ID
     * @param {number} x - New X coordinate
     * @param {number} y - New Y coordinate
     * @returns {Object|null} Updated node or null
     */
    moveNode(nodeId, x, y) {
        if (!Validators.isValidPosition(x, y)) {
            throw new Error('Invalid position for node move');
        }

        return this.updateNode(nodeId, { 
            x: Math.round(x), 
            y: Math.round(y) 
        });
    }

    /**
     * Batch move multiple nodes
     * @param {Array} moves - Array of {nodeId, x, y} objects
     * @returns {Array} Array of updated nodes
     */
    batchMoveNodes(moves) {
        const updated = [];
        
        // Validate all moves first
        for (const move of moves) {
            if (!this.nodes.has(move.nodeId)) {
                throw new Error(`Node ${move.nodeId} not found`);
            }
            if (!Validators.isValidPosition(move.x, move.y)) {
                throw new Error(`Invalid position for node ${move.nodeId}`);
            }
        }

        // Apply all moves
        for (const move of moves) {
            const updatedNode = this.updateNode(move.nodeId, { 
                x: Math.round(move.x), 
                y: Math.round(move.y) 
            });
            if (updatedNode) {
                updated.push(updatedNode);
            }
        }

        return updated;
    }

    /**
     * Select/deselect nodes
     * @param {string|Array} nodeIds - Node ID(s) to select
     * @param {boolean} selected - Selection state
     */
    setNodeSelection(nodeIds, selected = true) {
        const ids = Array.isArray(nodeIds) ? nodeIds : [nodeIds];
        
        for (const nodeId of ids) {
            if (this.nodes.has(nodeId)) {
                if (selected) {
                    this.selectedNodes.add(nodeId);
                } else {
                    this.selectedNodes.delete(nodeId);
                }
            }
        }
    }

    /**
     * Clear all selections
     */
    clearSelection() {
        this.selectedNodes.clear();
    }

    /**
     * Get selected nodes
     * @returns {Array} Array of selected nodes
     */
    getSelectedNodes() {
        return Array.from(this.selectedNodes)
            .map(id => this.nodes.get(id))
            .filter(Boolean);
    }

    /**
     * Copy selected nodes to clipboard
     * @returns {number} Number of copied nodes
     */
    copySelectedNodes() {
        const selectedNodes = this.getSelectedNodes();
        if (selectedNodes.length === 0) {
            return 0;
        }

        this.clipboard = {
            type: 'nodes',
            data: selectedNodes.map(node => Helpers.Data.deepClone(node)),
            timestamp: Date.now()
        };

        return selectedNodes.length;
    }

    /**
     * Paste nodes from clipboard
     * @param {number} offsetX - X offset for pasted nodes
     * @param {number} offsetY - Y offset for pasted nodes
     * @returns {Array} Pasted nodes
     */
    pasteNodes(offsetX = 20, offsetY = 20) {
        if (!this.clipboard || this.clipboard.type !== 'nodes') {
            return [];
        }

        const pastedNodes = [];
        
        for (const originalNode of this.clipboard.data) {
            try {
                const newNode = this.createNode(
                    originalNode.x + offsetX,
                    originalNode.y + offsetY,
                    {
                        text: originalNode.text,
                        color: originalNode.color,
                        width: originalNode.width,
                        height: originalNode.height,
                        metadata: Helpers.Data.deepClone(originalNode.metadata)
                    }
                );
                pastedNodes.push(newNode);
            } catch (error) {
                console.error('Failed to paste node:', error);
            }
        }

        return pastedNodes;
    }

    /**
     * Duplicate selected nodes
     * @param {number} offsetX - X offset for duplicated nodes
     * @param {number} offsetY - Y offset for duplicated nodes
     * @returns {Array} Duplicated nodes
     */
    duplicateSelectedNodes(offsetX = 20, offsetY = 20) {
        this.copySelectedNodes();
        const duplicated = this.pasteNodes(offsetX, offsetY);
        
        // Select the duplicated nodes
        this.clearSelection();
        this.setNodeSelection(duplicated.map(n => n.id), true);
        
        return duplicated;
    }

    /**
     * Delete selected nodes
     * @returns {number} Number of deleted nodes
     */
    deleteSelectedNodes() {
        const selectedIds = Array.from(this.selectedNodes);
        let deletedCount = 0;

        for (const nodeId of selectedIds) {
            if (this.deleteNode(nodeId)) {
                deletedCount++;
            }
        }

        this.clearSelection();
        return deletedCount;
    }

    /**
     * Clear all nodes
     */
    clearAllNodes() {
        const nodeIds = Array.from(this.nodes.keys());
        this.nodes.clear();
        this.selectedNodes.clear();
        
        // Save state for undo
        this._saveState();

        // Emit events for all deleted nodes
        for (const nodeId of nodeIds) {
            this._emit(CONFIG.EVENTS.NODE_DELETED, { nodeId });
        }
    }

    /**
     * Load nodes from data
     * @param {Array} nodesData - Array of node data
     * @returns {Object} Load results
     */
    loadNodes(nodesData) {
        if (!Array.isArray(nodesData)) {
            throw new Error('Nodes data must be an array');
        }

        // Validate all nodes before loading
        const validationResult = Validators.validateBulk(nodesData, Validators.validateNodeData);
        
        if (validationResult.errors.length > 0) {
            console.warn('Some nodes failed validation:', validationResult.errors);
        }

        // Clear existing nodes
        this.clearAllNodes();

        // Load valid nodes
        let loadedCount = 0;
        for (const nodeData of validationResult.valid) {
            try {
                // Sanitize text
                const sanitizedData = {
                    ...nodeData,
                    text: Validators.sanitizeInput(nodeData.text)
                };
                
                this.nodes.set(sanitizedData.id, sanitizedData);
                loadedCount++;
            } catch (error) {
                console.error('Failed to load node:', error);
            }
        }

        // Save state for undo
        this._saveState();

        return {
            total: nodesData.length,
            loaded: loadedCount,
            failed: nodesData.length - loadedCount,
            errors: validationResult.errors
        };
    }

    /**
     * Export nodes data
     * @returns {Array} Array of node data
     */
    exportNodes() {
        return this.getAllNodes().map(node => Helpers.Data.deepClone(node));
    }

    /**
     * Get node statistics
     * @returns {Object} Statistics object
     */
    getStatistics() {
        const nodes = this.getAllNodes();
        const colorCounts = {};
        
        for (const node of nodes) {
            colorCounts[node.color] = (colorCounts[node.color] || 0) + 1;
        }

        return {
            total: nodes.length,
            selected: this.selectedNodes.size,
            colors: colorCounts,
            bounds: this._calculateBounds(nodes),
            created: {
                today: nodes.filter(n => this._isToday(n.created)).length,
                thisWeek: nodes.filter(n => this._isThisWeek(n.created)).length
            }
        };
    }

    /**
     * Save current state for undo functionality
     */
    _saveState() {
        const state = {
            nodes: Helpers.Data.mapToObject(this.nodes),
            timestamp: Date.now()
        };

        this.undoStack.push(state);
        
        // Limit undo stack size
        if (this.undoStack.length > this.maxUndoSteps) {
            this.undoStack.shift();
        }

        // Clear redo stack when new action is performed
        this.redoStack.length = 0;
    }

    /**
     * Undo last action
     * @returns {boolean} Success status
     */
    undo() {
        if (this.undoStack.length < 2) {
            return false; // Need at least 2 states (current + previous)
        }

        // Move current state to redo stack
        const currentState = this.undoStack.pop();
        this.redoStack.push(currentState);

        // Restore previous state
        const previousState = this.undoStack[this.undoStack.length - 1];
        this.nodes = Helpers.Data.objectToMap(previousState.nodes);
        
        return true;
    }

    /**
     * Redo last undone action
     * @returns {boolean} Success status
     */
    redo() {
        if (this.redoStack.length === 0) {
            return false;
        }

        // Move state from redo to undo stack
        const stateToRestore = this.redoStack.pop();
        this.undoStack.push(stateToRestore);
        
        // Restore state
        this.nodes = Helpers.Data.objectToMap(stateToRestore.nodes);
        
        return true;
    }

    /**
     * Calculate bounds of all nodes
     * @param {Array} nodes - Nodes to calculate bounds for
     * @returns {Object} Bounds object
     */
    _calculateBounds(nodes) {
        if (nodes.length === 0) {
            return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
        }

        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;

        for (const node of nodes) {
            const radius = (node.width || CONFIG.UI.NODE_RADIUS * 2) / 2;
            minX = Math.min(minX, node.x - radius);
            minY = Math.min(minY, node.y - radius);
            maxX = Math.max(maxX, node.x + radius);
            maxY = Math.max(maxY, node.y + radius);
        }

        return {
            minX,
            minY,
            maxX,
            maxY,
            width: maxX - minX,
            height: maxY - minY
        };
    }

    /**
     * Check if timestamp is today
     * @param {number} timestamp - Timestamp to check
     * @returns {boolean} True if today
     */
    _isToday(timestamp) {
        const today = new Date();
        const date = new Date(timestamp);
        return date.toDateString() === today.toDateString();
    }

    /**
     * Check if timestamp is this week
     * @param {number} timestamp - Timestamp to check
     * @returns {boolean} True if this week
     */
    _isThisWeek(timestamp) {
        const now = Date.now();
        const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
        return timestamp >= weekAgo && timestamp <= now;
    }

    /**
     * Emit event if event emitter is available
     * @param {string} event - Event name
     * @param {any} data - Event data
     */
    _emit(event, data) {
        if (this.eventEmitter && typeof this.eventEmitter.emit === 'function') {
            this.eventEmitter.emit(event, data);
        }
    }
}

export default NodeManager;