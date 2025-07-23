import { validateConnection } from '../utils/validation.js';
import { generateId } from '../utils/helpers.js';
import { EVENTS } from '../config/constants.js';

export class ConnectionService {
    constructor(databaseService, nodeService) {
        this.db = databaseService;
        this.nodeService = nodeService;
        this.connections = new Map();
        this.selectedConnections = new Set();
        this.eventListeners = new Map();
        
        this.db.on(EVENTS.CONNECTIONS_UPDATED, (data) => {
            this.handleConnectionsUpdate(data);
        });

        this.nodeService.on(EVENTS.NODE_DELETED, (data) => {
            this.handleNodeDeleted(data.id);
        });
    }

    createConnection(sourceNodeId, targetNodeId) {
        if (sourceNodeId === targetNodeId) {
            this.emit(EVENTS.ERROR_OCCURRED, new Error('Cannot connect a node to itself'));
            return null;
        }

        const existingConnection = this.findConnection(sourceNodeId, targetNodeId);
        if (existingConnection) {
            this.emit(EVENTS.ERROR_OCCURRED, new Error('Connection already exists'));
            return null;
        }

        const connection = {
            id: generateId('conn_'),
            source: sourceNodeId,
            target: targetNodeId,
            created: Date.now(),
            updated: Date.now()
        };

        const errors = validateConnection(connection, this.nodeService.nodes);
        if (errors.length > 0) {
            this.emit(EVENTS.ERROR_OCCURRED, new Error(errors[0]));
            return null;
        }

        this.connections.set(connection.id, connection);
        this.db.saveConnection(connection);
        this.emit(EVENTS.CONNECTION_CREATED, connection);
        return connection;
    }

    deleteConnection(connectionId) {
        const connection = this.connections.get(connectionId);
        if (!connection) return false;

        this.connections.delete(connectionId);
        this.selectedConnections.delete(connectionId);
        this.db.deleteConnection(connectionId);
        this.emit(EVENTS.CONNECTION_DELETED, { id: connectionId, connection });
        return true;
    }

    findConnection(sourceId, targetId) {
        for (const connection of this.connections.values()) {
            if ((connection.source === sourceId && connection.target === targetId) ||
                (connection.source === targetId && connection.target === sourceId)) {
                return connection;
            }
        }
        return null;
    }

    getConnectionsForNode(nodeId) {
        return Array.from(this.connections.values()).filter(connection =>
            connection.source === nodeId || connection.target === nodeId
        );
    }

    selectConnection(connectionId, multiSelect = false) {
        if (!multiSelect) {
            this.clearSelection();
        }

        if (this.connections.has(connectionId)) {
            this.selectedConnections.add(connectionId);
            this.emit(EVENTS.CONNECTION_SELECTED, { connectionId, selected: true });
            return true;
        }
        return false;
    }

    deselectConnection(connectionId) {
        if (this.selectedConnections.has(connectionId)) {
            this.selectedConnections.delete(connectionId);
            this.emit(EVENTS.CONNECTION_SELECTED, { connectionId, selected: false });
            return true;
        }
        return false;
    }

    clearSelection() {
        const previouslySelected = Array.from(this.selectedConnections);
        this.selectedConnections.clear();
        
        previouslySelected.forEach(connectionId => {
            this.emit(EVENTS.CONNECTION_SELECTED, { connectionId, selected: false });
        });
    }

    getSelectedConnections() {
        return Array.from(this.selectedConnections)
            .map(connectionId => this.connections.get(connectionId))
            .filter(Boolean);
    }

    deleteSelectedConnections() {
        const deleted = [];
        
        this.selectedConnections.forEach(connectionId => {
            if (this.deleteConnection(connectionId)) {
                deleted.push(connectionId);
            }
        });

        return deleted;
    }

    handleNodeDeleted(nodeId) {
        const connectionsToDelete = this.getConnectionsForNode(nodeId);
        
        connectionsToDelete.forEach(connection => {
            this.deleteConnection(connection.id);
        });
    }

    handleConnectionsUpdate(data) {
        if (!data) return;

        Object.values(data).forEach(connectionData => {
            if (connectionData && connectionData.id) {
                const existingConnection = this.connections.get(connectionData.id);
                
                if (!existingConnection || existingConnection.updated < connectionData.updated) {
                    this.connections.set(connectionData.id, connectionData);
                    this.emit(EVENTS.CONNECTION_SYNCED, connectionData);
                }
            }
        });
    }

    loadConnections(connectionsMap) {
        this.connections.clear();
        this.selectedConnections.clear();
        
        connectionsMap.forEach((connection, connectionId) => {
            this.connections.set(connectionId, connection);
        });

        this.emit(EVENTS.CONNECTIONS_LOADED, this.connections);
    }

    getConnectionPath(connection) {
        const sourceNode = this.nodeService.nodes.get(connection.source);
        const targetNode = this.nodeService.nodes.get(connection.target);

        if (!sourceNode || !targetNode) {
            return null;
        }

        return {
            x1: sourceNode.x,
            y1: sourceNode.y,
            x2: targetNode.x,
            y2: targetNode.y
        };
    }

    getConnectionsNearPoint(x, y, threshold = 10) {
        const nearConnections = [];

        this.connections.forEach(connection => {
            const path = this.getConnectionPath(connection);
            if (!path) return;

            const distance = this.distanceFromPointToLine(
                x, y, path.x1, path.y1, path.x2, path.y2
            );

            if (distance <= threshold) {
                nearConnections.push({
                    connection,
                    distance
                });
            }
        });

        return nearConnections.sort((a, b) => a.distance - b.distance);
    }

    distanceFromPointToLine(px, py, x1, y1, x2, y2) {
        const A = px - x1;
        const B = py - y1;
        const C = x2 - x1;
        const D = y2 - y1;

        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        
        if (lenSq === 0) return Math.sqrt(A * A + B * B);

        let param = dot / lenSq;
        param = Math.max(0, Math.min(1, param));

        const xx = x1 + param * C;
        const yy = y1 + param * D;

        const dx = px - xx;
        const dy = py - yy;
        
        return Math.sqrt(dx * dx + dy * dy);
    }

    getStats() {
        return {
            totalConnections: this.connections.size,
            selectedConnections: this.selectedConnections.size,
            orphanedConnections: this.getOrphanedConnections().length
        };
    }

    getOrphanedConnections() {
        return Array.from(this.connections.values()).filter(connection => {
            const sourceExists = this.nodeService.nodes.has(connection.source);
            const targetExists = this.nodeService.nodes.has(connection.target);
            return !sourceExists || !targetExists;
        });
    }

    cleanupOrphanedConnections() {
        const orphaned = this.getOrphanedConnections();
        const cleaned = [];

        orphaned.forEach(connection => {
            if (this.deleteConnection(connection.id)) {
                cleaned.push(connection.id);
            }
        });

        return cleaned;
    }

    exportConnections() {
        return Array.from(this.connections.values());
    }

    importConnections(connectionsData) {
        try {
            const imported = [];
            
            connectionsData.forEach(connectionData => {
                const errors = validateConnection(connectionData, this.nodeService.nodes);
                if (errors.length === 0) {
                    const connectionId = connectionData.id || generateId('conn_');
                    const connection = {
                        ...connectionData,
                        id: connectionId,
                        updated: Date.now()
                    };
                    
                    this.connections.set(connectionId, connection);
                    this.db.saveConnection(connection);
                    imported.push(connection);
                }
            });

            this.emit(EVENTS.CONNECTIONS_IMPORTED, imported);
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