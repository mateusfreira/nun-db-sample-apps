export const DATABASE = {
    url: 'wss://ws-staging.nundb.org/',
    db: 'mind-map-demo',
    token: 'demo-token',
    connectionTimeout: 10000,
    retryAttempts: 3
};

export const UI = {
    NODE_RADIUS: 500,
    MIN_MOVEMENT: 1,
    ANIMATION_DELAY: 50,
    CANVAS_PADDING: 50,
    ZOOM_MIN: 0.5,
    ZOOM_MAX: 3.0,
    ZOOM_STEP: 0.1,
    DEBOUNCE_DELAY: 16,
    AUTO_SAVE_INTERVAL: 5000
};

export const VALIDATION = {
    WORKSPACE_NAME: {
        MIN_LENGTH: 3,
        MAX_LENGTH: 50,
        PATTERN: /^[a-zA-Z0-9_-]+$/
    },
    NODE_TEXT: {
        MAX_LENGTH: 100,
        REQUIRED: true
    },
    COORDINATES: {
        MIN_X: -10000,
        MIN_Y: -10000,
        MAX_X: 10000,
        MAX_Y: 10000
    }
};

export const COLORS = {
    DEFAULT_NODE: '#667eea',
    SELECTED_NODE: '#ef4444',
    CONNECTION_LINE: '#6b7280',
    BACKGROUND: '#f8fafc',
    TEXT: '#1f2937',
    VALID_COLORS: [
        '#667eea', '#ef4444', '#10b981', '#f59e0b',
        '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'
    ]
};

export const TOOLS = {
    SELECT: 'select',
    NODE: 'node', 
    CONNECTION: 'connection',
    DELETE: 'delete'
};

export const EVENTS = {
    NODE_CREATED: 'node:created',
    NODE_UPDATED: 'node:updated',
    NODE_DELETED: 'node:deleted',
    NODE_SELECTED: 'node:selected',
    NODE_SYNCED: 'node:synced',
    NODES_LOADED: 'nodes:loaded',
    NODES_IMPORTED: 'nodes:imported',
    CONNECTION_CREATED: 'connection:created',
    CONNECTION_DELETED: 'connection:deleted',
    CONNECTION_SELECTED: 'connection:selected',
    CONNECTION_SYNCED: 'connection:synced',
    CONNECTIONS_LOADED: 'connections:loaded',
    CONNECTIONS_IMPORTED: 'connections:imported',
    CONNECTION_ESTABLISHED: 'connection:established',
    CONNECTION_LOST: 'connection:lost',
    NODES_UPDATED: 'nodes:updated',
    CONNECTIONS_UPDATED: 'connections:updated',
    WORKSPACE_JOINED: 'workspace:joined',
    WORKSPACE_LEFT: 'workspace:left',
    ZOOM_CHANGED: 'zoom:changed',
    CONTEXT_MENU: 'context:menu',
    ERROR_OCCURRED: 'error:occurred'
};