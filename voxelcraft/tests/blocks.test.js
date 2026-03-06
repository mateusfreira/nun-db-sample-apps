const { describe, it, expect, beforeEach } = require('@jest/globals');

// Load constants first
global.BLOCK_SIZE = 1;
global.BLOCK_TYPES = {
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

global.BLOCK_PROPERTIES = {
    0: { name: 'Air', solid: false, transparent: true },
    1: { name: 'Grass', solid: true, transparent: false, color: 0x7ec850 },
    2: { name: 'Dirt', solid: true, transparent: false, color: 0x8b6914 },
    3: { name: 'Stone', solid: true, transparent: false, color: 0x8b8b8b },
    4: { name: 'Wood', solid: true, transparent: false, color: 0x8b6914 },
    5: { name: 'Leaves', solid: true, transparent: false, color: 0x228b22 },
    6: { name: 'Sand', solid: true, transparent: false, color: 0xf4e4c1 },
    7: { name: 'Water', solid: false, transparent: true, color: 0x0077be },
    8: { name: 'Brick', solid: true, transparent: false, color: 0xb22222 },
    9: { name: 'Glass', solid: true, transparent: true, color: 0xffffff }
};

// Define Block class
class Block {
    constructor(x, y, z, type) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.type = type;
        this.mesh = null;
    }

    getKey() {
        return `${this.x},${this.y},${this.z}`;
    }

    static fromKey(key, type) {
        const [x, y, z] = key.split(',').map(Number);
        return new Block(x, y, z, type);
    }

    createMesh() {
        const properties = BLOCK_PROPERTIES[this.type];
        if (!properties || this.type === BLOCK_TYPES.AIR) return null;

        const geometry = new THREE.BoxGeometry(BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
        const material = new THREE.MeshLambertMaterial({
            color: properties.color,
            transparent: properties.transparent,
            opacity: properties.transparent ? 0.6 : 1
        });

        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.set(this.x, this.y, this.z);
        this.mesh.userData = { block: this };

        return this.mesh;
    }

    destroy() {
        if (this.mesh) {
            if (this.mesh.geometry) this.mesh.geometry.dispose();
            if (this.mesh.material) this.mesh.material.dispose();
            this.mesh = null;
        }
    }
}

class BlockManager {
    constructor() {
        this.blocks = new Map();
        this.meshes = new Map();
    }

    addBlock(x, y, z, type) {
        const block = new Block(x, y, z, type);
        const key = block.getKey();
        
        if (this.blocks.has(key)) {
            this.removeBlock(x, y, z);
        }

        this.blocks.set(key, block);
        return block;
    }

    removeBlock(x, y, z) {
        const key = `${x},${y},${z}`;
        const block = this.blocks.get(key);
        
        if (block) {
            block.destroy();
            this.blocks.delete(key);
            this.meshes.delete(key);
        }
    }

    getBlock(x, y, z) {
        return this.blocks.get(`${x},${y},${z}`);
    }

    hasBlock(x, y, z) {
        return this.blocks.has(`${x},${y},${z}`);
    }

    isSolidBlock(x, y, z) {
        const block = this.getBlock(x, y, z);
        if (!block) return false;
        const properties = BLOCK_PROPERTIES[block.type];
        return properties && properties.solid;
    }

    getAllBlocks() {
        return Array.from(this.blocks.values());
    }

    clear() {
        this.blocks.forEach(block => block.destroy());
        this.blocks.clear();
        this.meshes.clear();
    }
}

describe('Block', () => {
    describe('constructor', () => {
        it('should create a block with correct properties', () => {
            const block = new Block(1, 2, 3, BLOCK_TYPES.GRASS);
            expect(block.x).toBe(1);
            expect(block.y).toBe(2);
            expect(block.z).toBe(3);
            expect(block.type).toBe(BLOCK_TYPES.GRASS);
            expect(block.mesh).toBeNull();
        });
    });

    describe('getKey', () => {
        it('should return correct key format', () => {
            const block = new Block(10, -5, 3, BLOCK_TYPES.STONE);
            expect(block.getKey()).toBe('10,-5,3');
        });
    });

    describe('fromKey', () => {
        it('should create block from key string', () => {
            const block = Block.fromKey('5,10,-3', BLOCK_TYPES.DIRT);
            expect(block.x).toBe(5);
            expect(block.y).toBe(10);
            expect(block.z).toBe(-3);
            expect(block.type).toBe(BLOCK_TYPES.DIRT);
        });
    });

    describe('createMesh', () => {
        it('should create mesh for solid blocks', () => {
            const block = new Block(0, 0, 0, BLOCK_TYPES.STONE);
            const mesh = block.createMesh();
            expect(mesh).toBeTruthy();
            expect(mesh.position.x).toBe(0);
            expect(mesh.position.y).toBe(0);
            expect(mesh.position.z).toBe(0);
            expect(mesh.userData.block).toBe(block);
        });

        it('should not create mesh for air blocks', () => {
            const block = new Block(0, 0, 0, BLOCK_TYPES.AIR);
            const mesh = block.createMesh();
            expect(mesh).toBeNull();
        });

        it('should create transparent mesh for water', () => {
            const block = new Block(0, 0, 0, BLOCK_TYPES.WATER);
            const mesh = block.createMesh();
            expect(mesh).toBeTruthy();
            expect(mesh.material.transparent).toBe(true);
            expect(mesh.material.opacity).toBe(0.6);
        });
    });

    describe('destroy', () => {
        it('should clean up mesh resources', () => {
            const block = new Block(0, 0, 0, BLOCK_TYPES.STONE);
            block.createMesh();
            
            const geometry = block.mesh.geometry;
            const material = block.mesh.material;
            const geometryDispose = jest.spyOn(geometry, 'dispose');
            const materialDispose = jest.spyOn(material, 'dispose');
            
            block.destroy();
            
            expect(geometryDispose).toHaveBeenCalled();
            expect(materialDispose).toHaveBeenCalled();
            expect(block.mesh).toBeNull();
        });
    });
});

describe('BlockManager', () => {
    let manager;

    beforeEach(() => {
        manager = new BlockManager();
    });

    describe('addBlock', () => {
        it('should add a new block', () => {
            const block = manager.addBlock(1, 2, 3, BLOCK_TYPES.GRASS);
            expect(block).toBeTruthy();
            expect(manager.blocks.size).toBe(1);
            expect(manager.getBlock(1, 2, 3)).toBe(block);
        });

        it('should replace existing block at same position', () => {
            const block1 = manager.addBlock(1, 2, 3, BLOCK_TYPES.GRASS);
            const block2 = manager.addBlock(1, 2, 3, BLOCK_TYPES.STONE);
            
            expect(manager.blocks.size).toBe(1);
            expect(manager.getBlock(1, 2, 3)).toBe(block2);
            expect(manager.getBlock(1, 2, 3).type).toBe(BLOCK_TYPES.STONE);
        });
    });

    describe('removeBlock', () => {
        it('should remove an existing block', () => {
            manager.addBlock(1, 2, 3, BLOCK_TYPES.GRASS);
            manager.removeBlock(1, 2, 3);
            
            expect(manager.blocks.size).toBe(0);
            expect(manager.getBlock(1, 2, 3)).toBeUndefined();
        });

        it('should handle removing non-existent block', () => {
            expect(() => manager.removeBlock(1, 2, 3)).not.toThrow();
        });
    });

    describe('getBlock', () => {
        it('should return block at position', () => {
            const block = manager.addBlock(5, 10, 15, BLOCK_TYPES.WOOD);
            expect(manager.getBlock(5, 10, 15)).toBe(block);
        });

        it('should return undefined for non-existent block', () => {
            expect(manager.getBlock(0, 0, 0)).toBeUndefined();
        });
    });

    describe('hasBlock', () => {
        it('should return true for existing block', () => {
            manager.addBlock(1, 1, 1, BLOCK_TYPES.BRICK);
            expect(manager.hasBlock(1, 1, 1)).toBe(true);
        });

        it('should return false for non-existent block', () => {
            expect(manager.hasBlock(1, 1, 1)).toBe(false);
        });
    });

    describe('isSolidBlock', () => {
        it('should return true for solid blocks', () => {
            manager.addBlock(0, 0, 0, BLOCK_TYPES.STONE);
            expect(manager.isSolidBlock(0, 0, 0)).toBe(true);
        });

        it('should return false for non-solid blocks', () => {
            manager.addBlock(0, 0, 0, BLOCK_TYPES.WATER);
            expect(manager.isSolidBlock(0, 0, 0)).toBe(false);
        });

        it('should return false for air blocks', () => {
            manager.addBlock(0, 0, 0, BLOCK_TYPES.AIR);
            expect(manager.isSolidBlock(0, 0, 0)).toBe(false);
        });

        it('should return false for non-existent blocks', () => {
            expect(manager.isSolidBlock(0, 0, 0)).toBe(false);
        });
    });

    describe('getAllBlocks', () => {
        it('should return all blocks as array', () => {
            manager.addBlock(0, 0, 0, BLOCK_TYPES.GRASS);
            manager.addBlock(1, 0, 0, BLOCK_TYPES.DIRT);
            manager.addBlock(2, 0, 0, BLOCK_TYPES.STONE);
            
            const blocks = manager.getAllBlocks();
            expect(blocks.length).toBe(3);
            expect(blocks[0]).toBeInstanceOf(Block);
        });
    });

    describe('clear', () => {
        it('should remove all blocks', () => {
            manager.addBlock(0, 0, 0, BLOCK_TYPES.GRASS);
            manager.addBlock(1, 0, 0, BLOCK_TYPES.DIRT);
            manager.addBlock(2, 0, 0, BLOCK_TYPES.STONE);
            
            manager.clear();
            
            expect(manager.blocks.size).toBe(0);
            expect(manager.meshes.size).toBe(0);
        });
    });
});