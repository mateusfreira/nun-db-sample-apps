import { DATABASE, EVENTS } from '../config/constants.js';

export class DatabaseService {
    constructor() {
        this.db = null;
        this.workspace = null;
        this.isConnected = false;
        this.eventListeners = new Map();
        this.reconnectTimer = null;
        this.reconnectAttempts = 0;
    }

    async connect() {
        try {
            this.db = new NunDb({
                url: DATABASE.url,
                db: DATABASE.db,
                token: DATABASE.token
            });
            
            // Wait a moment for connection to establish
            await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    this.isConnected = true;
                    this.reconnectAttempts = 0;
                    this.emit(EVENTS.CONNECTION_ESTABLISHED);
                    resolve();
                }, 1000);
            });

            return true;
        } catch (error) {
            console.error('Database connection error:', error);
            this.emit(EVENTS.ERROR_OCCURRED, error);
            return false;
        }
    }

    async joinWorkspace(workspaceName) {
        if (!this.db || !this.isConnected) {
            throw new Error('Database not connected');
        }

        try {
            this.workspace = workspaceName;
            
            const nodesKey = `mindmap_nodes_${workspaceName}`;
            const connectionsKey = `mindmap_connections_${workspaceName}`;

            await this.db.watch(nodesKey, (data) => {
                this.emit(EVENTS.NODES_UPDATED, data);
            }, true);

            await this.db.watch(connectionsKey, (data) => {
                this.emit(EVENTS.CONNECTIONS_UPDATED, data);
            }, true);

            this.emit(EVENTS.WORKSPACE_JOINED, workspaceName);
            return true;
        } catch (error) {
            this.emit(EVENTS.ERROR_OCCURRED, error);
            return false;
        }
    }

    async saveNode(node) {
        if (!this.workspace) return false;

        try {
            const nodesArray = await this.getAllNodes();
            const existingIndex = nodesArray.findIndex(n => n.id === node.id);
            
            if (existingIndex >= 0) {
                nodesArray[existingIndex] = node;
            } else {
                nodesArray.push(node);
            }
            
            await this.db.setValue(`mindmap_nodes_${this.workspace}`, nodesArray);
            return true;
        } catch (error) {
            this.emit(EVENTS.ERROR_OCCURRED, error);
            return false;
        }
    }

    async saveConnection(connection) {
        if (!this.workspace) return false;

        try {
            const connectionsArray = await this.getAllConnections();
            const existingIndex = connectionsArray.findIndex(c => c.id === connection.id);
            
            if (existingIndex >= 0) {
                connectionsArray[existingIndex] = connection;
            } else {
                connectionsArray.push(connection);
            }
            
            await this.db.setValue(`mindmap_connections_${this.workspace}`, connectionsArray);
            return true;
        } catch (error) {
            this.emit(EVENTS.ERROR_OCCURRED, error);
            return false;
        }
    }

    async deleteNode(nodeId) {
        if (!this.workspace) return false;

        try {
            const nodesArray = await this.getAllNodes();
            const filteredNodes = nodesArray.filter(n => n.id !== nodeId);
            await this.db.setValue(`mindmap_nodes_${this.workspace}`, filteredNodes);
            return true;
        } catch (error) {
            this.emit(EVENTS.ERROR_OCCURRED, error);
            return false;
        }
    }

    async deleteConnection(connectionId) {
        if (!this.workspace) return false;

        try {
            const connectionsArray = await this.getAllConnections();
            const filteredConnections = connectionsArray.filter(c => c.id !== connectionId);
            await this.db.setValue(`mindmap_connections_${this.workspace}`, filteredConnections);
            return true;
        } catch (error) {
            this.emit(EVENTS.ERROR_OCCURRED, error);
            return false;
        }
    }

    async loadWorkspaceData() {
        if (!this.workspace) return { nodes: new Map(), connections: new Map() };

        try {
            const [nodesData, connectionsData] = await Promise.all([
                this.getAllNodes(),
                this.getAllConnections()
            ]);

            const nodes = new Map();
            const connections = new Map();

            nodesData.forEach(node => {
                if (node && node.id) {
                    nodes.set(node.id, node);
                }
            });

            connectionsData.forEach(connection => {
                if (connection && connection.id) {
                    connections.set(connection.id, connection);
                }
            });

            return { nodes, connections };
        } catch (error) {
            this.emit(EVENTS.ERROR_OCCURRED, error);
            return { nodes: new Map(), connections: new Map() };
        }
    }

    async getAllNodes() {
        try {
            const nodesData = await this.db.getValue(`mindmap_nodes_${this.workspace}`);
            return Array.isArray(nodesData) ? nodesData : [];
        } catch (error) {
            return [];
        }
    }

    async getAllConnections() {
        try {
            const connectionsData = await this.db.getValue(`mindmap_connections_${this.workspace}`);
            return Array.isArray(connectionsData) ? connectionsData : [];
        } catch (error) {
            return [];
        }
    }

    scheduleReconnect() {
        if (this.reconnectTimer || this.reconnectAttempts >= DATABASE.retryAttempts) {
            return;
        }

        this.reconnectTimer = setTimeout(async () => {
            this.reconnectTimer = null;
            this.reconnectAttempts++;
            
            const success = await this.connect();
            if (success && this.workspace) {
                await this.joinWorkspace(this.workspace);
            }
        }, Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000));
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

    disconnect() {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }

        if (this.db) {
            this.db.disconnect();
            this.db = null;
        }

        this.isConnected = false;
        this.workspace = null;
        this.eventListeners.clear();
        this.reconnectAttempts = 0;
    }
}