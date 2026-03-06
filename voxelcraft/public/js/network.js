class NetworkManager {
    constructor(roomId, username, playerId) {
        this.roomId = roomId;
        this.username = username;
        this.playerId = playerId;
        this.nundb = null;
        this.connected = false;
        this.lastSync = 0;
        this.syncInterval = 50; // ms
        
        this.onPlayerJoin = null;
        this.onPlayerLeave = null;
        this.onPlayerUpdate = null;
        this.onBlockPlace = null;
        this.onBlockBreak = null;
        this.onChatMessage = null;
        this.onWorldSync = null;
    }

    async connect() {
        try {
            // Check if NunDb is available
            if (typeof NunDb === 'undefined' && typeof window.NunDb === 'undefined') {
                throw new Error('NunDB library not loaded');
            }
            
            const NunDbClass = window.NunDb || NunDb;
            
            this.nundb = new NunDbClass({
                url: 'wss://ws-staging.nundb.org/',
                db: 'voxelcraft-demo',
                token: 'demo-token',
                //user: this.playerId
            });

            await this.nundb._connectionPromise;
            this.connected = true;
            
            // Set up watchers
            this.setupWatchers();
            
            // Announce player join
            await this.announceJoin();
            
            // Request world sync
            await this.requestWorldSync();
            
            return true;
        } catch (error) {
            console.error('Failed to connect to NunDB:', error);
            this.connected = false;
            return false;
        }
    }

    setupWatchers() {
        // Watch for player updates
        this.nundb.watch(`${this.roomId}:player:`, (data) => {
            if (data.key.includes(this.playerId)) return; // Skip own updates
            
            const playerId = data.key.split(':').pop();
            if (data.value === null) {
                if (this.onPlayerLeave) this.onPlayerLeave(playerId);
            } else {
                if (this.onPlayerUpdate) this.onPlayerUpdate(playerId, data.value);
            }
        });

        // Watch for block changes
        this.nundb.watch(`${this.roomId}:block:`, (data) => {
            const coords = data.key.split(':').pop();
            if (data.value === null) {
                const [x, y, z] = coords.split(',').map(Number);
                if (this.onBlockBreak) this.onBlockBreak(x, y, z);
            } else {
                const [x, y, z] = coords.split(',').map(Number);
                if (this.onBlockPlace) this.onBlockPlace(x, y, z, data.value);
            }
        });

        // Watch for chat messages
        this.nundb.watch(`${this.roomId}:chat:`, (data) => {
            if (this.onChatMessage && data.value) {
                this.onChatMessage(data.value);
            }
        });

        // Watch for world sync requests
        this.nundb.watch(`${this.roomId}:worldsync:`, (data) => {
            if (data.value && data.value.requester !== this.playerId) {
                this.sendWorldSync();
            }
        });
    }

    async announceJoin() {
        await this.nundb.set(`${this.roomId}:player:${this.playerId}`, {
            id: this.playerId,
            username: this.username,
            position: { x: 0, y: WATER_LEVEL + 10, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            joinedAt: Date.now()
        });

        // Send join message
        await this.sendChatMessage({
            type: 'system',
            message: `${this.username} joined the game`,
            timestamp: Date.now()
        });
    }

    async updatePlayer(playerData) {
        if (!this.connected) return;
        
        const now = Date.now();
        if (now - this.lastSync < this.syncInterval) return;
        
        this.lastSync = now;
        await this.nundb.set(`${this.roomId}:player:${this.playerId}`, {
            ...playerData,
            lastUpdate: now
        });
    }

    async placeBlock(x, y, z, type) {
        if (!this.connected) return;
        
        const key = `${this.roomId}:block:${x},${y},${z}`;
        await this.nundb.set(key, type);
    }

    async breakBlock(x, y, z) {
        if (!this.connected) return;
        
        const key = `${this.roomId}:block:${x},${y},${z}`;
        await this.nundb.remove(key);
    }

    async sendChatMessage(message) {
        if (!this.connected) return;
        
        const key = `${this.roomId}:chat:${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await this.nundb.set(key, message);
        
        // Clean up old messages after 5 minutes
        setTimeout(() => {
            this.nundb.remove(key).catch(() => {});
        }, 5 * 60 * 1000);
    }

    async requestWorldSync() {
        if (!this.connected) return;
        
        // First, load existing blocks
        const blockKeys = await this.nundb.keys(`${this.roomId}:block:`);
        for (const key of blockKeys) {
            const type = await this.nundb.getValue(key);
            const coords = key.split(':').pop();
            const [x, y, z] = coords.split(',').map(Number);
            if (this.onBlockPlace) this.onBlockPlace(x, y, z, type);
        }
        
        // Request full sync from other players
        await this.nundb.set(`${this.roomId}:worldsync:request`, {
            requester: this.playerId,
            timestamp: Date.now()
        });
    }

    async sendWorldSync() {
        // This would be implemented if we stored the full world state
        // For now, blocks are synced individually
    }

    async getActivePlayers() {
        if (!this.connected || !this.nundb) {
            return [];
        }
        
        try {
            const keys = await this.nundb.keys(`${this.roomId}:player:`);
            const players = [];
            
            for (const key of keys) {
                const playerData = await this.nundb.getValue(key);
                if (playerData) {
                    players.push(playerData);
                }
            }
            
            return players;
        } catch (error) {
            console.error('Error getting active players:', error);
            return [];
        }
    }

    async disconnect() {
        if (!this.connected || !this.nundb) return;
        
        try {
            // Remove player data
            await this.nundb.remove(`${this.roomId}:player:${this.playerId}`);
            
            // Send leave message
            await this.sendChatMessage({
                type: 'system',
                message: `${this.username} left the game`,
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Error during disconnect:', error);
        } finally {
            this.connected = false;
        }
    }

    async cleanupOldData() {
        if (!this.connected || !this.nundb) return;
        
        try {
            const now = Date.now();
            const timeout = 60000; // 1 minute timeout for players
            
            // Clean up inactive players
            const playerKeys = await this.nundb.keys(`${this.roomId}:player:`);
            for (const key of playerKeys) {
                const playerData = await this.nundb.getValue(key);
                if (playerData && playerData.lastUpdate && now - playerData.lastUpdate > timeout) {
                    await this.nundb.remove(key);
                }
            }
        } catch (error) {
            console.error('Error cleaning up old data:', error);
        }
    }
}
