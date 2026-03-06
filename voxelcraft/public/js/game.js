class Game {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.world = null;
        this.localPlayer = null;
        this.remotePlayers = new Map();
        this.controls = null;
        this.networkManager = null;
        this.chatManager = null;
        
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        
        this.lastTime = performance.now();
        this.fpsCounter = 0;
        this.fpsTime = 0;
        
        this.isRunning = false;
    }

    async init(username, roomId) {
        try {
            console.log('Game.init - Starting initialization');
            
            // Generate player ID
            const playerId = `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            // Initialize Three.js
            console.log('Game.init - Initializing Three.js');
            this.initThree();
            
            // Create world
            console.log('Game.init - Creating world');
            this.world = new World(this.scene);
            
            // Create local player
            console.log('Game.init - Creating local player');
            this.localPlayer = new Player(playerId, username, true);
            
            // Initialize controls
            console.log('Game.init - Initializing controls');
            this.controls = new Controls(this.localPlayer, this.camera, this.renderer.domElement);
            
            // Initialize network
            console.log('Game.init - Initializing network manager');
            this.networkManager = new NetworkManager(roomId, username, playerId);
            this.setupNetworkCallbacks();
            
            // Initialize chat
            console.log('Game.init - Initializing chat');
            this.chatManager = new ChatManager(this.networkManager);
            
            // Connect to network
            console.log('Game.init - Connecting to network');
            const connected = await this.networkManager.connect();
            if (!connected) {
                this.chatManager.addSystemMessage('Failed to connect to server. Playing offline.');
            } else {
                this.chatManager.addSystemMessage(`Connected to room: ${roomId}`);
            }
            
            // Generate initial terrain
            console.log('Game.init - Generating terrain');
            this.world.generateTerrain(0, 0, 32);
            
            // Set up event listeners
            console.log('Game.init - Setting up event listeners');
            this.setupEventListeners();
            
            // Update UI
            console.log('Game.init - Updating UI');
            this.updatePlayerList();
            
            // Start game loop
            console.log('Game.init - Starting game loop');
            this.isRunning = true;
            this.animate();
            
            // Start periodic tasks
            console.log('Game.init - Starting periodic tasks');
            this.startPeriodicTasks();
            
            console.log('Game.init - Initialization complete');
        } catch (error) {
            console.error('Game.init - Error during initialization:', error);
            throw error;
        }
    }

    initThree() {
        // Scene
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.Fog(0x87CEEB, 10, 100);
        this.scene.background = new THREE.Color(0x87CEEB);
        
        // Camera
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        
        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        document.getElementById('game').appendChild(this.renderer.domElement);
        
        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(50, 100, 50);
        directionalLight.castShadow = true;
        directionalLight.shadow.camera.left = -50;
        directionalLight.shadow.camera.right = 50;
        directionalLight.shadow.camera.top = 50;
        directionalLight.shadow.camera.bottom = -50;
        this.scene.add(directionalLight);
    }

    setupNetworkCallbacks() {
        this.networkManager.onPlayerJoin = (playerId, playerData) => {
            if (playerId === this.localPlayer.id) return;
            
            let remotePlayer = this.remotePlayers.get(playerId);
            if (!remotePlayer) {
                remotePlayer = new Player(playerId, playerData.username, false);
                this.remotePlayers.set(playerId, remotePlayer);
                this.scene.add(remotePlayer.mesh);
                this.chatManager.addSystemMessage(`${playerData.username} joined`);
            }
            
            remotePlayer.fromData(playerData);
            this.updatePlayerList();
        };

        this.networkManager.onPlayerUpdate = (playerId, playerData) => {
            if (playerId === this.localPlayer.id) return;
            
            let remotePlayer = this.remotePlayers.get(playerId);
            if (!remotePlayer) {
                remotePlayer = new Player(playerId, playerData.username, false);
                this.remotePlayers.set(playerId, remotePlayer);
                this.scene.add(remotePlayer.mesh);
            }
            
            remotePlayer.fromData(playerData);
        };

        this.networkManager.onPlayerLeave = (playerId) => {
            const remotePlayer = this.remotePlayers.get(playerId);
            if (remotePlayer) {
                this.chatManager.addSystemMessage(`${remotePlayer.username} left`);
                remotePlayer.destroy();
                this.remotePlayers.delete(playerId);
                this.updatePlayerList();
            }
        };

        this.networkManager.onBlockPlace = (x, y, z, type) => {
            this.world.addBlock(x, y, z, type);
            this.updateBlockCount();
        };

        this.networkManager.onBlockBreak = (x, y, z) => {
            this.world.removeBlock(x, y, z);
            this.updateBlockCount();
        };
    }

    setupEventListeners() {
        // Mouse events for block interaction
        this.renderer.domElement.addEventListener('mousedown', (e) => this.onMouseDown(e));
        
        // Window resize
        window.addEventListener('resize', () => this.onWindowResize());
        
        // Before unload
        window.addEventListener('beforeunload', () => {
            this.networkManager.disconnect();
        });
    }

    onMouseDown(event) {
        if (!document.pointerLockElement) return;
        
        event.preventDefault();
        
        const origin = this.camera.position.clone();
        const direction = new THREE.Vector3(0, 0, -1);
        direction.applyEuler(this.camera.rotation);
        
        const hit = this.world.raycast(origin, direction, MAX_REACH_DISTANCE);
        
        if (event.button === 0) {
            // Left click - break block
            if (hit) {
                this.world.removeBlock(hit.position.x, hit.position.y, hit.position.z);
                this.networkManager.breakBlock(hit.position.x, hit.position.y, hit.position.z);
                this.updateBlockCount();
            }
        } else if (event.button === 2) {
            // Right click - place block
            if (hit) {
                const placeX = hit.position.x + hit.face.x;
                const placeY = hit.position.y + hit.face.y;
                const placeZ = hit.position.z + hit.face.z;
                
                // Check if placement would collide with player
                const playerBounds = this.localPlayer.getBounds();
                const blockMin = { x: placeX - 0.5, y: placeY - 0.5, z: placeZ - 0.5 };
                const blockMax = { x: placeX + 0.5, y: placeY + 0.5, z: placeZ + 0.5 };
                
                const collision = !(
                    blockMax.x < playerBounds.minX || blockMin.x > playerBounds.maxX ||
                    blockMax.y < playerBounds.minY || blockMin.y > playerBounds.maxY ||
                    blockMax.z < playerBounds.minZ || blockMin.z > playerBounds.maxZ
                );
                
                if (!collision) {
                    this.world.addBlock(placeX, placeY, placeZ, this.localPlayer.selectedBlock);
                    this.networkManager.placeBlock(placeX, placeY, placeZ, this.localPlayer.selectedBlock);
                    this.updateBlockCount();
                }
            }
        }
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    animate() {
        if (!this.isRunning) return;
        
        requestAnimationFrame(() => this.animate());
        
        const currentTime = performance.now();
        const deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;
        
        // Update FPS counter
        this.fpsCounter++;
        this.fpsTime += deltaTime;
        if (this.fpsTime >= 1.0) {
            document.getElementById('fps').textContent = Math.round(this.fpsCounter / this.fpsTime);
            this.fpsCounter = 0;
            this.fpsTime = 0;
        }
        
        // Update game logic
        this.update(deltaTime);
        
        // Render
        this.renderer.render(this.scene, this.camera);
    }

    update(deltaTime) {
        // Update controls
        this.controls.update();
        
        // Update local player
        this.localPlayer.update(deltaTime, this.world);
        
        // Update remote players
        this.remotePlayers.forEach(player => {
            player.update(deltaTime, this.world);
        });
        
        // Update position display
        const pos = this.localPlayer.position;
        document.getElementById('position').textContent = 
            `${Math.floor(pos.x)},${Math.floor(pos.y)},${Math.floor(pos.z)}`;
        
        // Sync player position to network
        this.networkManager.updatePlayer(this.localPlayer.toData());
    }

    startPeriodicTasks() {
        // Load nearby players
        setInterval(() => {
            this.networkManager.getActivePlayers().then(players => {
                players.forEach(playerData => {
                    if (playerData.id !== this.localPlayer.id) {
                        this.networkManager.onPlayerJoin(playerData.id, playerData);
                    }
                });
            });
        }, 5000);
        
        // Cleanup old data
        setInterval(() => {
            this.networkManager.cleanupOldData();
        }, 30000);
    }

    updatePlayerList() {
        const playersList = document.getElementById('players');
        playersList.innerHTML = '';
        
        // Add local player
        const localItem = document.createElement('li');
        localItem.textContent = `${this.localPlayer.username} (You)`;
        playersList.appendChild(localItem);
        
        // Add remote players
        this.remotePlayers.forEach(player => {
            const item = document.createElement('li');
            item.textContent = player.username;
            playersList.appendChild(item);
        });
    }

    updateBlockCount() {
        document.getElementById('blockCount').textContent = this.world.blockManager.blocks.size;
    }

    destroy() {
        this.isRunning = false;
        
        if (this.networkManager) {
            this.networkManager.disconnect();
        }
        
        if (this.controls) {
            this.controls.destroy();
        }
        
        if (this.renderer) {
            this.renderer.dispose();
        }
        
        if (this.world) {
            this.world.clear();
        }
        
        this.remotePlayers.forEach(player => player.destroy());
        this.remotePlayers.clear();
    }
}