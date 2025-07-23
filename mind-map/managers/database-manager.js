// Database management for the Mind Map application
import { CONFIG } from '../config.js';
import { Helpers } from '../utils/helpers.js';

export class DatabaseManager {
    constructor() {
        this.db = null;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = CONFIG.DATABASE.retryAttempts;
        this.connectionPromise = null;
        this.watcherCleanups = new Map();
        this.eventListeners = new Map();
    }

    /**
     * Connect to NunDB with retry logic
     * @param {Function} onStatusChange - Callback for connection status changes
     * @returns {Promise<boolean>} Connection success
     */
    async connect(onStatusChange = null) {
        if (this.connectionPromise) {
            return this.connectionPromise;
        }

        this.connectionPromise = this._attemptConnection(onStatusChange);
        return this.connectionPromise;
    }

    /**
     * Internal connection attempt with retry logic
     * @param {Function} onStatusChange - Status change callback
     * @returns {Promise<boolean>} Connection success
     */
    async _attemptConnection(onStatusChange) {
        const maxAttempts = this.maxReconnectAttempts;
        let lastError = null;

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                onStatusChange?.('connecting', `Connecting... (${attempt}/${maxAttempts})`);
                
                this.db = new NunDb({
                    url: CONFIG.DATABASE.url,
                    db: CONFIG.DATABASE.db,
                    token: CONFIG.DATABASE.token
                });

                this.db._logger = console;

                // Wait for connection with timeout
                await new Promise((resolve, reject) => {
                    const timeout = setTimeout(() => {
                        reject(new Error('Connection timeout'));
                    }, CONFIG.DATABASE.connectionTimeout);

                    this.db._connectionPromise.then(() => {
                        clearTimeout(timeout);
                        resolve();
                    }).catch(reject);
                });

                this.isConnected = true;
                this.reconnectAttempts = 0;
                this.connectionPromise = null;

                onStatusChange?.('connected', 'Connected to NunDB');
                this._setupConnectionEventHandlers(onStatusChange);
                
                return true;

            } catch (error) {
                lastError = error;
                console.warn(`Connection attempt ${attempt}/${maxAttempts} failed:`, error);
                
                if (attempt < maxAttempts) {
                    const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }

        this.isConnected = false;
        this.connectionPromise = null;
        onStatusChange?.('failed', `Connection failed: ${lastError?.message || 'Unknown error'}`);
        
        throw lastError || new Error('Failed to connect after maximum attempts');
    }

    /**
     * Setup connection event handlers
     * @param {Function} onStatusChange - Status change callback
     */
    _setupConnectionEventHandlers(onStatusChange) {
        if (!this.db) return;

        // Handle disconnection
        this.db.on?.('disconnect', () => {
            this.isConnected = false;
            onStatusChange?.('disconnected', 'Connection lost');
            this._scheduleReconnect(onStatusChange);
        });

        // Handle errors
        this.db.on?.('error', (error) => {
            console.error('Database error:', error);
            onStatusChange?.('error', `Database error: ${error.message}`);
        });
    }

    /**
     * Schedule reconnection attempt
     * @param {Function} onStatusChange - Status change callback
     */
    _scheduleReconnect(onStatusChange) {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            onStatusChange?.('failed', 'Max reconnection attempts reached');
            return;
        }

        const delay = Math.min(2000 * Math.pow(2, this.reconnectAttempts), 30000);
        this.reconnectAttempts++;

        setTimeout(() => {
            if (!this.isConnected) {
                this.connect(onStatusChange);
            }
        }, delay);
    }

    /**
     * Save data to database with error handling
     * @param {string} key - Database key
     * @param {any} data - Data to save
     * @returns {Promise<boolean>} Success status
     */
    async save(key, data) {
        if (!this.isConnected || !this.db) {
            throw new Error('Database not connected');
        }

        try {
            await this.db.setValue(key, data);
            return true;
        } catch (error) {
            console.error(`Failed to save ${key}:`, error);
            throw error;
        }
    }

    /**
     * Load data from database with error handling
     * @param {string} key - Database key
     * @returns {Promise<any>} Loaded data or null
     */
    async load(key) {
        if (!this.isConnected || !this.db) {
            throw new Error('Database not connected');
        }

        try {
            const result = await this.db.getValue(key);
            return result || null;
        } catch (error) {
            console.error(`Failed to load ${key}:`, error);
            throw error;
        }
    }

    /**
     * Watch for changes on a database key
     * @param {string} key - Database key to watch
     * @param {Function} callback - Change callback
     * @returns {Function} Cleanup function
     */
    async watch(key, callback) {
        if (!this.isConnected || !this.db) {
            throw new Error('Database not connected');
        }

        try {
            const cleanup = await this.db.watch(key, callback);
            
            // Store cleanup function for later use
            if (cleanup && typeof cleanup === 'function') {
                this.watcherCleanups.set(key, cleanup);
                return cleanup;
            }
            
            return () => {}; // No-op cleanup if not supported
        } catch (error) {
            console.error(`Failed to watch ${key}:`, error);
            throw error;
        }
    }

    /**
     * Stop watching a database key
     * @param {string} key - Database key
     */
    unwatch(key) {
        const cleanup = this.watcherCleanups.get(key);
        if (cleanup) {
            try {
                cleanup();
                this.watcherCleanups.delete(key);
            } catch (error) {
                console.error(`Failed to cleanup watcher for ${key}:`, error);
            }
        }
    }

    /**
     * Batch save multiple items
     * @param {Object} items - Key-value pairs to save
     * @returns {Promise<Object>} Results with success/failure counts
     */
    async batchSave(items) {
        if (!this.isConnected || !this.db) {
            throw new Error('Database not connected');
        }

        const results = {
            successful: [],
            failed: [],
            errors: []
        };

        const promises = Object.entries(items).map(async ([key, data]) => {
            try {
                await this.save(key, data);
                results.successful.push(key);
            } catch (error) {
                results.failed.push(key);
                results.errors.push({ key, error: error.message });
            }
        });

        await Promise.allSettled(promises);
        return results;
    }

    /**
     * Delete data from database
     * @param {string} key - Database key
     * @returns {Promise<boolean>} Success status
     */
    async delete(key) {
        if (!this.isConnected || !this.db) {
            throw new Error('Database not connected');
        }

        try {
            await this.db.deleteValue?.(key) || this.db.delete?.(key);
            return true;
        } catch (error) {
            console.error(`Failed to delete ${key}:`, error);
            throw error;
        }
    }

    /**
     * Check if database is connected and ready
     * @returns {boolean} Connection status
     */
    isReady() {
        return this.isConnected && this.db !== null;
    }

    /**
     * Get connection status information
     * @returns {Object} Status information
     */
    getStatus() {
        return {
            connected: this.isConnected,
            reconnectAttempts: this.reconnectAttempts,
            maxReconnectAttempts: this.maxReconnectAttempts,
            hasDatabase: this.db !== null
        };
    }

    /**
     * Disconnect from database and cleanup
     */
    async disconnect() {
        // Cleanup all watchers
        for (const [key, cleanup] of this.watcherCleanups) {
            try {
                cleanup();
            } catch (error) {
                console.error(`Failed to cleanup watcher for ${key}:`, error);
            }
        }
        this.watcherCleanups.clear();

        // Cleanup event listeners
        this.eventListeners.clear();

        // Close database connection
        if (this.db) {
            try {
                await this.db.close?.();
            } catch (error) {
                console.error('Failed to close database connection:', error);
            }
            this.db = null;
        }

        this.isConnected = false;
        this.connectionPromise = null;
        this.reconnectAttempts = 0;
    }

    /**
     * Add event listener for database events
     * @param {string} event - Event name
     * @param {Function} callback - Event callback
     * @returns {Function} Cleanup function
     */
    addEventListener(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, new Set());
        }
        
        this.eventListeners.get(event).add(callback);
        
        return () => {
            const listeners = this.eventListeners.get(event);
            if (listeners) {
                listeners.delete(callback);
                if (listeners.size === 0) {
                    this.eventListeners.delete(event);
                }
            }
        };
    }

    /**
     * Emit database event
     * @param {string} event - Event name
     * @param {any} data - Event data
     */
    emit(event, data) {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            listeners.forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in event listener for ${event}:`, error);
                }
            });
        }
    }
}

export default DatabaseManager;