import NunDb from 'nun-db';

/**
 * Database configuration and connection management
 */
export class DatabaseManager {
    constructor(config = {}) {
        this.config = {
            url: config.url || 'wss://ws-staging.nundb.org/',
            db: config.db || 'personal-finance-demo',
            token: config.token || 'demo-token',
            user: config.user || null,
            retryAttempts: config.retryAttempts || 3,
            retryDelay: config.retryDelay || 2000,
            mockMode: config.mockMode || false
        };
        console.log('Database configuration:', this.config);
        
        this.nundb = null;
        this.isConnected = false;
        this.connectionPromise = null;
        this.listeners = new Map();
    }

    async connect() {
        if (this.connectionPromise) {
            return this.connectionPromise;
        }

        this.connectionPromise = this._doConnect();
        return this.connectionPromise;
    }

    async _doConnect() {
        if (this.config.mockMode) {
            console.log('Initializing mock database connection');
            this._initMockConnection();
            return;
        }

        for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
            try {
                console.log(`Connecting to NunDB (attempt ${attempt}/${this.config.retryAttempts})`);
                
                this.nundb = new NunDb({
                    url: this.config.url,
                    db: this.config.db,
                    token: this.config.token,
                    user: this.config.user
                });

                // Wait for connection with timeout
                await new Promise((resolve, reject) => {
                    const timeout = setTimeout(() => {
                        reject(new Error('Connection timeout'));
                    }, 15000);

                    this.nundb._connectionPromise.then(() => {
                        clearTimeout(timeout);
                        this.isConnected = true;
                        console.log('Successfully connected to NunDB');
                        resolve();
                    }).catch((error) => {
                        clearTimeout(timeout);
                        reject(error);
                    });
                });

                return;

            } catch (error) {
                console.error(`Connection attempt ${attempt} failed:`, error);
                
                if (attempt < this.config.retryAttempts) {
                    console.log(`Retrying in ${this.config.retryDelay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, this.config.retryDelay));
                } else {
                    throw new Error(`Failed to connect after ${this.config.retryAttempts} attempts: ${error.message}`);
                }
            }
        }
    }

    _initMockConnection() {
        this.nundb = {
            _mockStorage: new Map(),
            _mockWatchers: new Map(),
            
            async get(key, subKey = null) {
                const fullKey = subKey ? `${key}:${subKey}` : key;
                const value = this._mockStorage.get(fullKey);
                return value ? { value } : null;
            },
            
            async set(key, subKeyOrValue, valueOrUndefined = undefined) {
                let fullKey, value;
                if (valueOrUndefined === undefined) {
                    fullKey = key;
                    value = subKeyOrValue;
                } else {
                    fullKey = `${key}:${subKeyOrValue}`;
                    value = valueOrUndefined;
                }
                
                this._mockStorage.set(fullKey, value);
                
                // Trigger watchers
                const watchers = this._mockWatchers.get(key) || [];
                for (const callback of watchers) {
                    setTimeout(() => callback({ value }), 0);
                }
                
                return { success: true };
            },
            
            async watch(key, callback) {
                if (!this._mockWatchers.has(key)) {
                    this._mockWatchers.set(key, []);
                }
                this._mockWatchers.get(key).push(callback);
            },

            async delete(key, subKey = null) {
                const fullKey = subKey ? `${key}:${subKey}` : key;
                const existed = this._mockStorage.has(fullKey);
                this._mockStorage.delete(fullKey);
                return { success: true, existed };
            }
        };
        
        this.isConnected = true;
        console.log('Mock database connection initialized');
    }

    async get(key, subKey = null) {
        await this.connect();
        return this.nundb.get(key, subKey);
    }

    async set(key, subKeyOrValue, valueOrUndefined = undefined) {
        await this.connect();
        return this.nundb.set(key, subKeyOrValue, valueOrUndefined);
    }

    async watch(key, callback) {
        await this.connect();
        return this.nundb.watch(key, callback);
    }

    async delete(key, subKey = null) {
        await this.connect();
        return this.nundb.delete(key, subKey);
    }

    disconnect() {
        if (this.nundb && !this.config.mockMode) {
            // Close connection if available
            if (this.nundb.close) {
                this.nundb.close();
            }
        }
        this.isConnected = false;
        this.connectionPromise = null;
        this.listeners.clear();
    }

    getConnectionStatus() {
        return {
            isConnected: this.isConnected,
            isMock: this.config.mockMode,
            config: {
                url: this.config.url,
                db: this.config.db,
                user: this.config.user
            }
        };
    }
}

// Singleton instance for the application
let dbInstance = null;

export function getDatabase(config = {}) {
    if (!dbInstance) {
        dbInstance = new DatabaseManager(config);
    }
    return dbInstance;
}

export function resetDatabase() {
    if (dbInstance) {
        dbInstance.disconnect();
        dbInstance = null;
    }
}
