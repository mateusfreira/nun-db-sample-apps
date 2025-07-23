// Configuration constants for the Mind Map application
export const CONFIG = {
    DATABASE: {
        url: 'wss://ws-staging.nundb.org/',
        db: 'mind-map-demo',
        token: 'demo-token',
        connectionTimeout: 10000,
        retryAttempts: 3
    },
    
    UI: {
        NODE_RADIUS: 30,
        MIN_MOVEMENT: 1,
        ANIMATION_DELAY: 50,
        CANVAS_PADDING: 50,
        ZOOM_MIN: 0.5,
        ZOOM_MAX: 3.0,
        ZOOM_STEP: 0.1,
        DEBOUNCE_DELAY: 16, // ~60fps
        AUTO_SAVE_INTERVAL: 5000
    },
    
    VALIDATION: {
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
            MIN_X: 0,
            MIN_Y: 0,
            MAX_X: 10000,
            MAX_Y: 10000
        }
    },
    
    COLORS: {
        DEFAULT_NODE: '#3b82f6',
        SELECTED_NODE: '#ef4444',
        CONNECTION_LINE: '#6b7280',
        BACKGROUND: '#f8fafc',
        TEXT: '#1f2937',
        VALID_COLORS: [
            '#3b82f6', '#ef4444', '#10b981', '#f59e0b',
            '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'
        ]
    },
    
    TOOLS: {
        SELECT: 'select',
        NODE: 'node', 
        CONNECTION: 'connection',
        DELETE: 'delete'
    },
    
    EVENTS: {
        NODE_CREATED: 'node:created',
        NODE_UPDATED: 'node:updated',
        NODE_DELETED: 'node:deleted',
        CONNECTION_CREATED: 'connection:created',
        CONNECTION_DELETED: 'connection:deleted',
        WORKSPACE_JOINED: 'workspace:joined',
        WORKSPACE_LEFT: 'workspace:left',
        ERROR_OCCURRED: 'error:occurred'
    }
};

export default CONFIG;