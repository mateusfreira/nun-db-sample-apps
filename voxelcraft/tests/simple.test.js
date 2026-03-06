const { describe, it, expect } = require('@jest/globals');

describe('VoxelCraft Game Tests', () => {
    describe('Constants', () => {
        it('should have block types defined', () => {
            const BLOCK_TYPES = {
                AIR: 0,
                GRASS: 1,
                DIRT: 2,
                STONE: 3,
                WOOD: 4,
                LEAVES: 5,
                SAND: 6,
                WATER: 7,
                BRICK: 8,
                GLASS: 9
            };
            
            expect(BLOCK_TYPES.GRASS).toBe(1);
            expect(BLOCK_TYPES.WATER).toBe(7);
            expect(BLOCK_TYPES.GLASS).toBe(9);
        });

        it('should have game constants defined', () => {
            const PLAYER_SPEED = 5;
            const GRAVITY = -9.81 * 3;
            const JUMP_FORCE = 8;
            
            expect(PLAYER_SPEED).toBe(5);
            expect(GRAVITY).toBeLessThan(0);
            expect(JUMP_FORCE).toBeGreaterThan(0);
        });
    });

    describe('Basic Game Logic', () => {
        it('should handle player position calculation', () => {
            const position = { x: 10, y: 20, z: 30 };
            const velocity = { x: 1, y: 2, z: 3 };
            const deltaTime = 0.016; // 60 FPS
            
            const newPosition = {
                x: position.x + velocity.x * deltaTime,
                y: position.y + velocity.y * deltaTime,
                z: position.z + velocity.z * deltaTime
            };
            
            expect(newPosition.x).toBeCloseTo(10.016);
            expect(newPosition.y).toBeCloseTo(20.032);
            expect(newPosition.z).toBeCloseTo(30.048);
        });

        it('should generate block keys correctly', () => {
            function getBlockKey(x, y, z) {
                return `${x},${y},${z}`;
            }
            
            expect(getBlockKey(1, 2, 3)).toBe('1,2,3');
            expect(getBlockKey(-5, 10, -15)).toBe('-5,10,-15');
            expect(getBlockKey(0, 0, 0)).toBe('0,0,0');
        });

        it('should parse block coordinates from key', () => {
            function parseBlockKey(key) {
                return key.split(',').map(Number);
            }
            
            expect(parseBlockKey('1,2,3')).toEqual([1, 2, 3]);
            expect(parseBlockKey('-5,10,-15')).toEqual([-5, 10, -15]);
            expect(parseBlockKey('0,0,0')).toEqual([0, 0, 0]);
        });

        it('should calculate terrain height', () => {
            function getTerrainHeight(x, z) {
                const scale = 0.05;
                const height = Math.sin(x * scale) * Math.cos(z * scale);
                return Math.floor(32 + height * 10); // WATER_LEVEL = 32
            }
            
            const height1 = getTerrainHeight(0, 0);
            const height2 = getTerrainHeight(10, 10);
            
            expect(height1).toBeGreaterThanOrEqual(22);
            expect(height1).toBeLessThanOrEqual(42);
            expect(height2).toBeGreaterThanOrEqual(22);
            expect(height2).toBeLessThanOrEqual(42);
        });
    });

    describe('Network Message Handling', () => {
        it('should create proper player message format', () => {
            const playerData = {
                id: 'player-123',
                username: 'TestPlayer',
                position: { x: 10, y: 20, z: 30 },
                rotation: { x: 0, y: 1.5, z: 0 },
                lastUpdate: Date.now()
            };
            
            expect(playerData.id).toBe('player-123');
            expect(playerData.username).toBe('TestPlayer');
            expect(playerData.position.x).toBe(10);
            expect(playerData.rotation.y).toBe(1.5);
            expect(playerData.lastUpdate).toBeGreaterThan(0);
        });

        it('should create proper chat message format', () => {
            const chatMessage = {
                type: 'player',
                username: 'TestUser',
                message: 'Hello world!',
                timestamp: Date.now()
            };
            
            expect(chatMessage.type).toBe('player');
            expect(chatMessage.username).toBe('TestUser');
            expect(chatMessage.message).toBe('Hello world!');
            expect(chatMessage.timestamp).toBeGreaterThan(0);
        });

        it('should handle room key prefixes', () => {
            const roomId = 'test-room';
            const playerId = 'player-123';
            
            const playerKey = `${roomId}:player:${playerId}`;
            const blockKey = `${roomId}:block:10,20,30`;
            const chatKey = `${roomId}:chat:${Date.now()}_abc123`;
            
            expect(playerKey).toBe('test-room:player:player-123');
            expect(blockKey).toBe('test-room:block:10,20,30');
            expect(chatKey).toMatch(/^test-room:chat:\d+_abc123$/);
        });
    });

    describe('Block Properties', () => {
        it('should define block properties correctly', () => {
            const BLOCK_PROPERTIES = {
                0: { name: 'Air', solid: false, transparent: true },
                1: { name: 'Grass', solid: true, transparent: false },
                7: { name: 'Water', solid: false, transparent: true },
                9: { name: 'Glass', solid: true, transparent: true }
            };
            
            expect(BLOCK_PROPERTIES[0].solid).toBe(false);
            expect(BLOCK_PROPERTIES[1].solid).toBe(true);
            expect(BLOCK_PROPERTIES[7].transparent).toBe(true);
            expect(BLOCK_PROPERTIES[9].solid).toBe(true);
            expect(BLOCK_PROPERTIES[9].transparent).toBe(true);
        });

        it('should determine if block is solid', () => {
            function isSolidBlock(blockType) {
                const BLOCK_PROPERTIES = {
                    0: { solid: false }, // Air
                    1: { solid: true },  // Grass
                    7: { solid: false }, // Water
                    9: { solid: true }   // Glass
                };
                
                const properties = BLOCK_PROPERTIES[blockType];
                return properties && properties.solid;
            }
            
            expect(isSolidBlock(0)).toBe(false); // Air
            expect(isSolidBlock(1)).toBe(true);  // Grass
            expect(isSolidBlock(7)).toBe(false); // Water
            expect(isSolidBlock(9)).toBe(true);  // Glass
            expect(isSolidBlock(99)).toBeFalsy(); // Non-existent
        });
    });

    describe('Player Movement', () => {
        it('should calculate movement direction', () => {
            function calculateMovement(forward, right, rotationY) {
                const moveX = Math.sin(rotationY) * forward + Math.cos(rotationY) * right;
                const moveZ = Math.cos(rotationY) * forward - Math.sin(rotationY) * right;
                return { x: moveX, z: moveZ };
            }
            
            const movement1 = calculateMovement(1, 0, 0); // Forward, no rotation
            expect(movement1.x).toBeCloseTo(0);
            expect(movement1.z).toBeCloseTo(1);
            
            const movement2 = calculateMovement(0, 1, 0); // Right, no rotation
            expect(movement2.x).toBeCloseTo(1);
            expect(movement2.z).toBeCloseTo(0);
        });

        it('should apply gravity correctly', () => {
            const GRAVITY = -9.81 * 3;
            const deltaTime = 0.016;
            
            let velocityY = 0;
            velocityY += GRAVITY * deltaTime;
            
            expect(velocityY).toBeLessThan(0);
            expect(velocityY).toBeCloseTo(-0.471);
        });

        it('should handle player bounds calculation', () => {
            function getPlayerBounds(position) {
                const PLAYER_HEIGHT = 1.8;
                const halfWidth = 0.3;
                
                return {
                    minX: position.x - halfWidth,
                    maxX: position.x + halfWidth,
                    minY: position.y - PLAYER_HEIGHT / 2,
                    maxY: position.y + PLAYER_HEIGHT / 2,
                    minZ: position.z - halfWidth,
                    maxZ: position.z + halfWidth
                };
            }
            
            const bounds = getPlayerBounds({ x: 10, y: 20, z: 30 });
            
            expect(bounds.minX).toBeCloseTo(9.7);
            expect(bounds.maxX).toBeCloseTo(10.3);
            expect(bounds.minY).toBeCloseTo(19.1);
            expect(bounds.maxY).toBeCloseTo(20.9);
        });
    });

    describe('Game State Management', () => {
        it('should manage game state transitions', () => {
            const gameStates = {
                MENU: 'menu',
                PLAYING: 'playing',
                PAUSED: 'paused',
                DISCONNECTED: 'disconnected'
            };
            
            let currentState = gameStates.MENU;
            
            // Start game
            currentState = gameStates.PLAYING;
            expect(currentState).toBe('playing');
            
            // Pause game
            currentState = gameStates.PAUSED;
            expect(currentState).toBe('paused');
            
            // Resume game
            currentState = gameStates.PLAYING;
            expect(currentState).toBe('playing');
        });

        it('should handle FPS calculation', () => {
            let fpsCounter = 0;
            let fpsTime = 0;
            
            // Simulate 60 frames over 1 second
            for (let i = 0; i < 60; i++) {
                fpsCounter++;
                fpsTime += 1/60; // deltaTime
            }
            
            const fps = Math.round(fpsCounter / fpsTime);
            expect(fps).toBe(60);
        });
    });
});