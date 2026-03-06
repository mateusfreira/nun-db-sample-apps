/**
 * FPS Arena Game - Real-time Multiplayer using NunDB
 * Implements a complete overhead 2D FPS with roles and real-time synchronization
 */

// Game Constants
const GAME_CONFIG = {
    CANVAS_WIDTH: 800,
    CANVAS_HEIGHT: 600,
    ROOM_ID: 'fps-arena-main',
    PLAYER_SIZE: 15,
    PROJECTILE_SIZE: 4,
    PROJECTILE_SPEED: 8,
    WALL_THICKNESS: 20,
    UPDATE_INTERVAL: 16, // ~60 FPS
    SYNC_INTERVAL: 100,  // 10 times per second
};

// Role Configuration
const ROLES = {
    assault: {
        name: 'Assault',
        icon: '⚔️',
        speed: 3,
        maxHealth: 100,
        maxAmmo: 30,
        damage: 25,
        fireRate: 300, // ms between shots
        reloadTime: 2000,
        color: '#4a9eff'
    },
    sniper: {
        name: 'Sniper',
        icon: '🎯',
        speed: 1.5,
        maxHealth: 75,
        maxAmmo: 10,
        damage: 60,
        fireRate: 800,
        reloadTime: 3000,
        color: '#ff6b35'
    },
    medic: {
        name: 'Medic',
        icon: '🏥',
        speed: 3.5,
        maxHealth: 120,
        maxAmmo: 20,
        damage: 15,
        fireRate: 400,
        reloadTime: 1500,
        color: '#44ff44'
    }
};

// Game Map (walls represented as rectangles)
const MAP_WALLS = [
    // Outer walls
    { x: 0, y: 0, width: GAME_CONFIG.CANVAS_WIDTH, height: GAME_CONFIG.WALL_THICKNESS },
    { x: 0, y: GAME_CONFIG.CANVAS_HEIGHT - GAME_CONFIG.WALL_THICKNESS, width: GAME_CONFIG.CANVAS_WIDTH, height: GAME_CONFIG.WALL_THICKNESS },
    { x: 0, y: 0, width: GAME_CONFIG.WALL_THICKNESS, height: GAME_CONFIG.CANVAS_HEIGHT },
    { x: GAME_CONFIG.CANVAS_WIDTH - GAME_CONFIG.WALL_THICKNESS, y: 0, width: GAME_CONFIG.WALL_THICKNESS, height: GAME_CONFIG.CANVAS_HEIGHT },
    
    // Inner obstacles
    { x: 200, y: 150, width: 100, height: 20 },
    { x: 500, y: 250, width: 20, height: 100 },
    { x: 300, y: 400, width: 200, height: 20 },
    { x: 150, y: 350, width: 20, height: 80 },
    { x: 600, y: 100, width: 80, height: 20 },
];

class FPSArenaGame {
    constructor() {
        this.nundb = null;
        this.playerId = null;
        this.playerName = '';
        this.currentRole = 'assault';
        
        // Game state
        this.players = new Map();
        this.projectiles = new Map();
        this.localPlayer = null;
        this.gameStarted = false;
        
        // Canvas and rendering
        this.canvas = null;
        this.ctx = null;
        
        // Input handling
        this.keys = {};
        this.lastShot = 0;
        this.isReloading = false;
        
        // Game loops
        this.gameLoop = null;
        this.syncLoop = null;
        
        // Test hooks for Playwright
        window._test = {
            getPlayerName: () => this.playerName,
            isModalVisible: () => !document.getElementById('nameModal').classList.contains('hidden'),
            isGameStarted: () => this.gameStarted,
            getPlayersCount: () => this.players.size,
            getCurrentRole: () => this.currentRole
        };
        
        this.init();
    }

    async init() {
        try {
            this.setupUI();
            this.setupEventListeners();
            console.log('FPS Arena initialized');
        } catch (error) {
            console.error('Failed to initialize game:', error);
            this.updateConnectionStatus('error', 'Initialization Error');
        }
    }

    setupUI() {
        // Show name modal on load
        document.getElementById('nameModal').classList.remove('hidden');
        
        // Focus on name input
        const nameInput = document.getElementById('playerName');
        nameInput.focus();
    }

    setupEventListeners() {
        // Name form submission
        const nameForm = document.getElementById('nameForm');
        nameForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleNameSubmission();
        });

        // Role selection
        document.querySelectorAll('.role-card').forEach(card => {
            card.addEventListener('click', () => {
                document.querySelectorAll('.role-card').forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
                this.currentRole = card.dataset.role;
            });
        });

        // Keyboard controls
        document.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            this.handleKeyPress(e);
        });

        document.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });

        // Prevent context menu on canvas
        document.addEventListener('contextmenu', (e) => {
            if (e.target.tagName === 'CANVAS') {
                e.preventDefault();
            }
        });
    }

    async handleNameSubmission() {
        const nameInput = document.getElementById('playerName');
        const errorElement = document.getElementById('nameError');
        const name = nameInput.value.trim();

        // Validate name
        if (!name) {
            errorElement.textContent = 'Please enter a name';
            return;
        }

        if (name.length < 2) {
            errorElement.textContent = 'Name must be at least 2 characters';
            return;
        }

        if (name.length > 20) {
            errorElement.textContent = 'Name must be less than 20 characters';
            return;
        }

        // Clear error and proceed
        errorElement.textContent = '';
        this.playerName = name;

        // Hide name modal and show role selection
        document.getElementById('nameModal').classList.add('hidden');
        document.getElementById('roleModal').classList.remove('hidden');

        // Auto-select assault role
        document.querySelector('[data-role="assault"]').classList.add('selected');

        // Start game after a short delay to allow role selection
        setTimeout(() => {
            this.connectGame(name);
        }, 2000);
    }

    async connectGame(playerName) {
        try {
            this.updateConnectionStatus('connecting', 'Connecting...');

            // Initialize NunDB connection
            this.nundb = new NunDb({
                url: 'wss://ws-staging.nundb.org/',
                db: 'fps-arena-game',
                token: 'demo-token'
            });

            await this.nundb._connectionPromise;
            console.log('Connected to NunDB');
            this.updateConnectionStatus('connected', 'Connected');

            // Generate unique player ID
            this.playerId = `player_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

            // Hide role modal and show game
            document.getElementById('roleModal').classList.add('hidden');
            document.getElementById('gameContainer').classList.remove('hidden');

            // Setup canvas
            this.setupCanvas();

            // Initialize player
            await this.initializePlayer(playerName);

            // Setup real-time subscriptions
            await this.setupSubscriptions();

            // Start game loops
            this.startGameLoops();

            this.gameStarted = true;
            console.log('Game started successfully');

        } catch (error) {
            console.error('Failed to connect to game:', error);
            this.updateConnectionStatus('error', 'Connection Error');
            alert('Failed to connect to game. Please refresh and try again.');
        }
    }

    setupCanvas() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Set canvas size
        this.canvas.width = GAME_CONFIG.CANVAS_WIDTH;
        this.canvas.height = GAME_CONFIG.CANVAS_HEIGHT;
    }

    async initializePlayer(playerName) {
        const role = ROLES[this.currentRole];
        
        // Create local player object
        this.localPlayer = {
            id: this.playerId,
            name: playerName,
            role: this.currentRole,
            x: Math.random() * (GAME_CONFIG.CANVAS_WIDTH - 100) + 50,
            y: Math.random() * (GAME_CONFIG.CANVAS_HEIGHT - 100) + 50,
            angle: 0,
            health: role.maxHealth,
            maxHealth: role.maxHealth,
            ammo: role.maxAmmo,
            maxAmmo: role.maxAmmo,
            lastShot: 0,
            isAlive: true,
            roomId: GAME_CONFIG.ROOM_ID
        };

        // Update HUD
        this.updateHUD();

        // Insert player into database
        await this.nundb.setValue(`player:${this.playerId}`, this.localPlayer);
        
        // Add to local players map
        this.players.set(this.playerId, this.localPlayer);
    }

    async setupSubscriptions() {
        // Track known players and projectiles to reduce redundant fetches
        this.knownPlayers = new Set();
        this.knownProjectiles = new Set();
        
        // Initial load of existing players
        await this.loadExistingPlayers();

        // Poll for player updates less frequently (every 1 second)
        setInterval(async () => {
            try {
                const playerKeys = await this.nundb.keys('player:');
                
                // Check for new players or updates
                for (const key of playerKeys) {
                    if (key.startsWith('player:') && !key.includes(this.playerId)) {
                        const player = await this.nundb.getValue(key);
                        if (player && player.roomId === GAME_CONFIG.ROOM_ID) {
                            const playerId = key.split(':')[1];
                            
                            // Only update if player data has changed
                            const existingPlayer = this.players.get(playerId);
                            if (!existingPlayer || this.hasPlayerChanged(existingPlayer, player)) {
                                this.players.set(playerId, player);
                                this.knownPlayers.add(playerId);
                                this.playerListChanged = true;
                                this.updatePlayerList();
                            }
                        }
                    }
                }
                
                // Remove disconnected players
                for (const playerId of this.knownPlayers) {
                    if (!playerKeys.includes(`player:${playerId}`)) {
                        this.players.delete(playerId);
                        this.knownPlayers.delete(playerId);
                        this.playerListChanged = true;
                        this.updatePlayerList();
                    }
                }
            } catch (error) {
                console.error('Error polling players:', error);
            }
        }, 1000); // Poll every 1 second instead of 500ms

        // Poll for projectiles with batch cleanup
        setInterval(async () => {
            try {
                const projectileKeys = await this.nundb.keys('projectile:');
                const now = Date.now();
                const keysToRemove = [];
                
                for (const key of projectileKeys) {
                    if (key.startsWith('projectile:')) {
                        const projectile = await this.nundb.getValue(key);
                        if (projectile && projectile.roomId === GAME_CONFIG.ROOM_ID) {
                            // Only keep projectiles less than 3 seconds old
                            if (now - projectile.createdAt < 3000) {
                                const projectileId = key.split(':')[1];
                                this.projectiles.set(projectileId, projectile);
                                this.knownProjectiles.add(projectileId);
                            } else {
                                // Mark for batch removal
                                keysToRemove.push(key);
                            }
                        }
                    }
                }
                
                // Batch remove old projectiles
                for (const key of keysToRemove) {
                    await this.nundb.remove(key);
                }
                
                // Clean up local projectiles that are too old
                for (const [id, projectile] of this.projectiles) {
                    if (now - projectile.createdAt > 3000) {
                        this.projectiles.delete(id);
                        this.knownProjectiles.delete(id);
                    }
                }
            } catch (error) {
                console.error('Error polling projectiles:', error);
            }
        }, 300); // Poll every 300ms for projectiles (even less frequent)

        // Poll for heal actions only when playing as medic
        if (this.localPlayer.role === 'medic') {
            setInterval(async () => {
                try {
                    const healKeys = await this.nundb.keys('heal:');
                    const now = Date.now();
                    
                    for (const key of healKeys) {
                        if (key.startsWith('heal:')) {
                            const healAction = await this.nundb.getValue(key);
                            if (healAction && healAction.roomId === GAME_CONFIG.ROOM_ID) {
                                // Only process recent heal actions (within 2 seconds)
                                if (now - healAction.timestamp < 2000) {
                                    this.handleHealAction(healAction);
                                }
                                // Always remove processed heal action
                                await this.nundb.remove(key);
                            }
                        }
                    }
                } catch (error) {
                    console.error('Error polling heal actions:', error);
                }
            }, 500); // Poll every 500ms for heal actions
        }
    }

    async loadExistingPlayers() {
        try {
            const playerKeys = await this.nundb.keys('player:');
            for (const key of playerKeys) {
                if (key.startsWith('player:')) {
                    const player = await this.nundb.getValue(key);
                    if (player && player.roomId === GAME_CONFIG.ROOM_ID) {
                        const playerId = key.split(':')[1];
                        if (playerId !== this.playerId) {
                            this.players.set(playerId, player);
                            this.knownPlayers.add(playerId);
                        }
                    }
                }
            }
            this.updatePlayerList();
        } catch (error) {
            console.error('Error loading existing players:', error);
        }
    }

    hasPlayerChanged(oldPlayer, newPlayer) {
        return (
            oldPlayer.x !== newPlayer.x ||
            oldPlayer.y !== newPlayer.y ||
            oldPlayer.angle !== newPlayer.angle ||
            oldPlayer.health !== newPlayer.health ||
            oldPlayer.isAlive !== newPlayer.isAlive
        );
    }

    startGameLoops() {
        // Main game loop (60 FPS)
        this.gameLoop = setInterval(() => {
            this.update();
            this.render();
        }, GAME_CONFIG.UPDATE_INTERVAL);

        // Sync loop - only update when player state actually changes
        this.lastSyncedState = null;
        this.syncLoop = setInterval(() => {
            if (this.localPlayer && this.nundb && this.hasPlayerStateChanged()) {
                this.nundb.setValue(`player:${this.playerId}`, this.localPlayer);
                this.lastSyncedState = this.clonePlayerState(this.localPlayer);
            }
        }, GAME_CONFIG.SYNC_INTERVAL);
    }

    update() {
        if (!this.localPlayer || !this.localPlayer.isAlive) return;

        this.handleMovement();
        this.updateProjectiles();
        this.checkCollisions();
    }

    handleMovement() {
        const role = ROLES[this.localPlayer.role];
        const speed = role.speed;
        
        let dx = 0;
        let dy = 0;

        // WASD movement
        if (this.keys['KeyW'] || this.keys['ArrowUp']) dy -= speed;
        if (this.keys['KeyS'] || this.keys['ArrowDown']) dy += speed;
        if (this.keys['KeyA'] || this.keys['ArrowLeft']) dx -= speed;
        if (this.keys['KeyD'] || this.keys['ArrowRight']) dx += speed;

        // Normalize diagonal movement
        if (dx !== 0 && dy !== 0) {
            dx *= 0.707;
            dy *= 0.707;
        }

        // Calculate new position
        const newX = this.localPlayer.x + dx;
        const newY = this.localPlayer.y + dy;

        // Check wall collisions
        if (!this.checkWallCollision(newX, this.localPlayer.y)) {
            this.localPlayer.x = newX;
        }
        if (!this.checkWallCollision(this.localPlayer.x, newY)) {
            this.localPlayer.y = newY;
        }

        // Update angle based on movement
        if (dx !== 0 || dy !== 0) {
            this.localPlayer.angle = Math.atan2(dy, dx);
        }
    }

    checkWallCollision(x, y) {
        const playerRadius = GAME_CONFIG.PLAYER_SIZE / 2;
        
        for (const wall of MAP_WALLS) {
            if (x - playerRadius < wall.x + wall.width &&
                x + playerRadius > wall.x &&
                y - playerRadius < wall.y + wall.height &&
                y + playerRadius > wall.y) {
                return true;
            }
        }
        return false;
    }

    handleKeyPress(e) {
        switch (e.code) {
        case 'Space':
            e.preventDefault();
            this.shoot();
            break;
        case 'KeyR':
            this.reload();
            break;
        case 'KeyH':
            if (this.localPlayer.role === 'medic') {
                this.heal();
            }
            break;
        }
    }

    async shoot() {
        if (!this.localPlayer || !this.localPlayer.isAlive || this.isReloading) return;
        
        const role = ROLES[this.localPlayer.role];
        const now = Date.now();
        
        // Check fire rate
        if (now - this.lastShot < role.fireRate) return;
        
        // Check ammo
        if (this.localPlayer.ammo <= 0) {
            this.reload();
            return;
        }

        // Create projectile
        const projectileId = `proj_${this.playerId}_${now}`;
        const projectile = {
            id: projectileId,
            x: this.localPlayer.x,
            y: this.localPlayer.y,
            angle: this.localPlayer.angle,
            speed: GAME_CONFIG.PROJECTILE_SPEED,
            damage: role.damage,
            ownerId: this.playerId,
            roomId: GAME_CONFIG.ROOM_ID,
            createdAt: now
        };

        // Add to local projectiles
        this.projectiles.set(projectileId, projectile);
        
        // Sync to database
        await this.nundb.setValue(`projectile:${projectileId}`, projectile);

        // Update local player state
        this.localPlayer.ammo--;
        this.lastShot = now;
        this.localPlayer.lastShot = now;
        
        this.updateHUD();
    }

    async reload() {
        if (this.isReloading || this.localPlayer.ammo === ROLES[this.localPlayer.role].maxAmmo) return;
        
        this.isReloading = true;
        const role = ROLES[this.localPlayer.role];
        
        // Update HUD to show reloading
        document.getElementById('ammoText').textContent = 'Reloading...';
        
        setTimeout(() => {
            this.localPlayer.ammo = role.maxAmmo;
            this.isReloading = false;
            this.updateHUD();
        }, role.reloadTime);
    }

    async heal() {
        if (this.localPlayer.role !== 'medic') return;
        
        // Find nearby teammates to heal
        const healRange = 80;
        const healAmount = 30;
        
        for (const [playerId, player] of this.players) {
            if (playerId === this.playerId) continue;
            
            const distance = Math.sqrt(
                Math.pow(player.x - this.localPlayer.x, 2) +
                Math.pow(player.y - this.localPlayer.y, 2)
            );
            
            if (distance <= healRange && player.health < player.maxHealth) {
                // Create heal action
                const healAction = {
                    healerId: this.playerId,
                    targetId: playerId,
                    amount: healAmount,
                    roomId: GAME_CONFIG.ROOM_ID,
                    timestamp: Date.now()
                };
                
                await this.nundb.setValue(`heal:${Date.now()}`, healAction);
                break; // Heal one player at a time
            }
        }
    }

    handleHealAction(healAction) {
        if (healAction.targetId === this.playerId) {
            // We're being healed
            this.localPlayer.health = Math.min(
                this.localPlayer.health + healAction.amount,
                this.localPlayer.maxHealth
            );
            this.updateHUD();
        }
    }

    updateProjectiles() {
        const now = Date.now();
        
        for (const [id, projectile] of this.projectiles) {
            // Remove old projectiles
            if (now - projectile.createdAt > 3000) {
                this.projectiles.delete(id);
                continue;
            }
            
            // Update position
            projectile.x += Math.cos(projectile.angle) * projectile.speed;
            projectile.y += Math.sin(projectile.angle) * projectile.speed;
            
            // Check wall collisions
            if (this.checkProjectileWallCollision(projectile)) {
                this.projectiles.delete(id);
                continue;
            }
            
            // Check player collisions (only check for our own projectiles)
            if (projectile.ownerId === this.playerId) {
                for (const [playerId, player] of this.players) {
                    if (playerId === projectile.ownerId) continue;
                    
                    const distance = Math.sqrt(
                        Math.pow(player.x - projectile.x, 2) +
                        Math.pow(player.y - projectile.y, 2)
                    );
                    
                    if (distance < GAME_CONFIG.PLAYER_SIZE / 2) {
                        // Hit detected - damage would be handled by the hit player's client
                        this.projectiles.delete(id);
                        break;
                    }
                }
            }
        }
    }

    checkProjectileWallCollision(projectile) {
        for (const wall of MAP_WALLS) {
            if (projectile.x >= wall.x &&
                projectile.x <= wall.x + wall.width &&
                projectile.y >= wall.y &&
                projectile.y <= wall.y + wall.height) {
                return true;
            }
        }
        return false;
    }

    checkCollisions() {
        // Check if we're hit by enemy projectiles
        for (const [id, projectile] of this.projectiles) {
            if (projectile.ownerId === this.playerId) continue;
            
            const distance = Math.sqrt(
                Math.pow(this.localPlayer.x - projectile.x, 2) +
                Math.pow(this.localPlayer.y - projectile.y, 2)
            );
            
            if (distance < GAME_CONFIG.PLAYER_SIZE / 2) {
                // We're hit
                this.localPlayer.health -= projectile.damage;
                this.projectiles.delete(id);
                
                if (this.localPlayer.health <= 0) {
                    this.localPlayer.isAlive = false;
                    this.localPlayer.health = 0;
                    // Respawn after 3 seconds
                    setTimeout(() => this.respawn(), 3000);
                }
                
                this.updateHUD();
                break;
            }
        }
    }

    async respawn() {
        const role = ROLES[this.localPlayer.role];
        
        this.localPlayer.x = Math.random() * (GAME_CONFIG.CANVAS_WIDTH - 100) + 50;
        this.localPlayer.y = Math.random() * (GAME_CONFIG.CANVAS_HEIGHT - 100) + 50;
        this.localPlayer.health = role.maxHealth;
        this.localPlayer.ammo = role.maxAmmo;
        this.localPlayer.isAlive = true;
        
        this.updateHUD();
    }

    render() {
        // Clear canvas
        this.ctx.fillStyle = '#0f0f0f';
        this.ctx.fillRect(0, 0, GAME_CONFIG.CANVAS_WIDTH, GAME_CONFIG.CANVAS_HEIGHT);
        
        // Draw map
        this.drawMap();
        
        // Draw players
        this.drawPlayers();
        
        // Draw projectiles
        this.drawProjectiles();
        
        // Draw effects
        this.drawEffects();
    }

    drawMap() {
        this.ctx.fillStyle = '#666';
        for (const wall of MAP_WALLS) {
            this.ctx.fillRect(wall.x, wall.y, wall.width, wall.height);
        }
    }

    drawPlayers() {
        for (const [playerId, player] of this.players) {
            if (!player.isAlive) continue;
            
            const isLocalPlayer = playerId === this.playerId;
            const role = ROLES[player.role];
            
            this.ctx.save();
            this.ctx.translate(player.x, player.y);
            this.ctx.rotate(player.angle);
            
            // Draw player triangle
            this.ctx.fillStyle = isLocalPlayer ? '#4a9eff' : role.color;
            this.ctx.beginPath();
            this.ctx.moveTo(GAME_CONFIG.PLAYER_SIZE / 2, 0);
            this.ctx.lineTo(-GAME_CONFIG.PLAYER_SIZE / 2, -GAME_CONFIG.PLAYER_SIZE / 3);
            this.ctx.lineTo(-GAME_CONFIG.PLAYER_SIZE / 2, GAME_CONFIG.PLAYER_SIZE / 3);
            this.ctx.closePath();
            this.ctx.fill();
            
            this.ctx.restore();
            
            // Draw health bar
            this.drawHealthBar(player);
            
            // Draw name and role
            this.drawPlayerInfo(player);
        }
    }

    drawHealthBar(player) {
        const barWidth = 30;
        const barHeight = 4;
        const x = player.x - barWidth / 2;
        const y = player.y - GAME_CONFIG.PLAYER_SIZE - 10;
        
        // Background
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.fillRect(x, y, barWidth, barHeight);
        
        // Health fill
        const healthPercent = player.health / player.maxHealth;
        const fillWidth = barWidth * healthPercent;
        
        if (healthPercent > 0.6) {
            this.ctx.fillStyle = '#44ff44';
        } else if (healthPercent > 0.3) {
            this.ctx.fillStyle = '#ffaa00';
        } else {
            this.ctx.fillStyle = '#ff4444';
        }
        
        this.ctx.fillRect(x, y, fillWidth, barHeight);
    }

    drawPlayerInfo(player) {
        const role = ROLES[player.role];
        
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '10px Arial';
        this.ctx.textAlign = 'center';
        
        // Name
        this.ctx.fillText(
            player.name,
            player.x,
            player.y - GAME_CONFIG.PLAYER_SIZE - 15
        );
        
        // Role icon
        this.ctx.font = '12px Arial';
        this.ctx.fillText(
            role.icon,
            player.x + 20,
            player.y
        );
    }

    drawProjectiles() {
        this.ctx.fillStyle = '#fff';
        
        for (const [, projectile] of this.projectiles) {
            // Draw projectile as circle
            this.ctx.beginPath();
            this.ctx.arc(
                projectile.x,
                projectile.y,
                GAME_CONFIG.PROJECTILE_SIZE,
                0,
                2 * Math.PI
            );
            this.ctx.fill();
            
            // Draw trail
            this.ctx.save();
            this.ctx.globalAlpha = 0.3;
            this.ctx.beginPath();
            this.ctx.moveTo(projectile.x, projectile.y);
            this.ctx.lineTo(
                projectile.x - Math.cos(projectile.angle) * 15,
                projectile.y - Math.sin(projectile.angle) * 15
            );
            this.ctx.strokeStyle = '#fff';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
            this.ctx.restore();
        }
    }

    drawEffects() {
        // Add visual effects like muzzle flashes, hit effects, etc.
        if (this.localPlayer && Date.now() - this.lastShot < 100) {
            // Muzzle flash
            this.ctx.save();
            this.ctx.translate(this.localPlayer.x, this.localPlayer.y);
            this.ctx.rotate(this.localPlayer.angle);
            
            this.ctx.fillStyle = '#ffff88';
            this.ctx.beginPath();
            this.ctx.arc(
                GAME_CONFIG.PLAYER_SIZE / 2 + 5,
                0,
                8,
                0,
                2 * Math.PI
            );
            this.ctx.fill();
            
            this.ctx.restore();
        }
    }

    updateHUD() {
        if (!this.localPlayer) return;
        
        const role = ROLES[this.localPlayer.role];
        
        // Update player info
        document.getElementById('playerName').textContent = this.localPlayer.name;
        document.getElementById('playerRole').textContent = `${role.icon} ${role.name}`;
        
        // Update health
        const healthPercent = (this.localPlayer.health / this.localPlayer.maxHealth) * 100;
        document.getElementById('healthFill').style.width = `${healthPercent}%`;
        document.getElementById('healthText').textContent = `${this.localPlayer.health}/${this.localPlayer.maxHealth}`;
        
        // Update ammo
        if (!this.isReloading) {
            document.getElementById('ammoText').textContent = `${this.localPlayer.ammo}/${role.maxAmmo}`;
        }
        
        // Update role actions
        this.updateRoleActions();
    }

    updateRoleActions() {
        const roleActions = document.getElementById('roleActions');
        
        if (this.localPlayer.role === 'medic') {
            roleActions.innerHTML = `
                <button class="role-action-btn" onclick="window.game.heal()">
                    🏥 Heal Nearby (H)
                </button>
            `;
        } else {
            roleActions.innerHTML = '';
        }
    }

    updatePlayerList() {
        // Only update if player count changed or players changed
        const currentPlayerCount = this.players.size;
        if (this.lastPlayerCount === currentPlayerCount && !this.playerListChanged) {
            return;
        }
        
        this.lastPlayerCount = currentPlayerCount;
        this.playerListChanged = false;
        
        const playersContainer = document.getElementById('players');
        const playersList = Array.from(this.players.values())
            .filter(player => player.isAlive)
            .sort((a, b) => a.name.localeCompare(b.name));
        
        playersContainer.innerHTML = playersList.map(player => `
            <div class="player-item">
                <span>${player.name}</span>
                <span class="player-role">${ROLES[player.role].icon}</span>
            </div>
        `).join('');
    }

    updateConnectionStatus(status, message) {
        const statusElement = document.getElementById('connectionStatus');
        const indicator = statusElement.querySelector('.status-indicator');
        const text = statusElement.querySelector('.status-text');
        
        indicator.className = `status-indicator ${status}`;
        text.textContent = message;
    }

    // Cleanup when page unloads
    hasPlayerStateChanged() {
        if (!this.lastSyncedState) return true;
        
        // Only sync if position changed significantly (more than 2 pixels)
        const positionChanged = 
            Math.abs(this.localPlayer.x - this.lastSyncedState.x) > 2 ||
            Math.abs(this.localPlayer.y - this.lastSyncedState.y) > 2;
        
        // Always sync if health, ammo, or alive status changed
        const statsChanged = 
            this.localPlayer.health !== this.lastSyncedState.health ||
            this.localPlayer.ammo !== this.lastSyncedState.ammo ||
            this.localPlayer.isAlive !== this.lastSyncedState.isAlive;
        
        // Only sync angle if position also changed (to avoid constant updates from mouse movement)
        const angleChanged = positionChanged && 
            Math.abs(this.localPlayer.angle - this.lastSyncedState.angle) > 0.1;
        
        return positionChanged || statsChanged || angleChanged;
    }

    clonePlayerState(player) {
        return {
            x: player.x,
            y: player.y,
            angle: player.angle,
            health: player.health,
            ammo: player.ammo,
            isAlive: player.isAlive
        };
    }

    cleanup() {
        if (this.gameLoop) clearInterval(this.gameLoop);
        if (this.syncLoop) clearInterval(this.syncLoop);
        
        if (this.nundb && this.playerId) {
            // Remove player from database
            this.nundb.remove(`player:${this.playerId}`);
        }
    }
}

// Initialize game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.game = new FPSArenaGame();
    
    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
        if (window.game) {
            window.game.cleanup();
        }
    });
});

export default FPSArenaGame;