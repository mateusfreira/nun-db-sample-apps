class World {
    constructor(scene) {
        this.scene = scene;
        this.blockManager = new BlockManager();
        this.chunks = new Map();
        this.group = new THREE.Group();
        this.scene.add(this.group);
    }

    generateTerrain(centerX, centerZ, radius) {
        const startX = Math.floor(centerX - radius);
        const endX = Math.floor(centerX + radius);
        const startZ = Math.floor(centerZ - radius);
        const endZ = Math.floor(centerZ + radius);

        for (let x = startX; x <= endX; x++) {
            for (let z = startZ; z <= endZ; z++) {
                const height = this.getTerrainHeight(x, z);
                
                // Generate terrain layers
                for (let y = 0; y <= height; y++) {
                    let blockType = BLOCK_TYPES.STONE;
                    
                    if (y === height) {
                        blockType = height > WATER_LEVEL + 2 ? BLOCK_TYPES.GRASS : BLOCK_TYPES.SAND;
                    } else if (y > height - 3) {
                        blockType = height > WATER_LEVEL + 2 ? BLOCK_TYPES.DIRT : BLOCK_TYPES.SAND;
                    }
                    
                    this.addBlock(x, y, z, blockType);
                }
                
                // Add water at sea level
                if (height < WATER_LEVEL) {
                    for (let y = height + 1; y <= WATER_LEVEL; y++) {
                        this.addBlock(x, y, z, BLOCK_TYPES.WATER);
                    }
                }
            }
        }

        // Add some trees
        this.generateTrees(centerX, centerZ, radius);
    }

    getTerrainHeight(x, z) {
        // Simple noise-based terrain generation
        const scale = 0.05;
        const octaves = 3;
        let height = 0;
        let amplitude = 1;
        let frequency = 1;

        for (let i = 0; i < octaves; i++) {
            height += Math.sin(x * scale * frequency) * Math.cos(z * scale * frequency) * amplitude;
            amplitude *= 0.5;
            frequency *= 2;
        }

        return Math.floor(WATER_LEVEL + height * 10);
    }

    generateTrees(centerX, centerZ, radius) {
        const treeCount = Math.floor(radius * radius * 0.02);
        
        for (let i = 0; i < treeCount; i++) {
            const x = Math.floor(centerX + (Math.random() - 0.5) * radius * 2);
            const z = Math.floor(centerZ + (Math.random() - 0.5) * radius * 2);
            const y = this.getGroundHeight(x, z);
            
            if (y > WATER_LEVEL + 2 && Math.random() > 0.3) {
                this.generateTree(x, y + 1, z);
            }
        }
    }

    generateTree(x, y, z) {
        const trunkHeight = 4 + Math.floor(Math.random() * 3);
        
        // Trunk
        for (let i = 0; i < trunkHeight; i++) {
            this.addBlock(x, y + i, z, BLOCK_TYPES.WOOD);
        }
        
        // Leaves
        const leafStart = y + trunkHeight - 2;
        const leafRadius = 2;
        
        for (let dy = 0; dy < 4; dy++) {
            const currentRadius = leafRadius - Math.floor(dy / 2);
            for (let dx = -currentRadius; dx <= currentRadius; dx++) {
                for (let dz = -currentRadius; dz <= currentRadius; dz++) {
                    if (dx === 0 && dz === 0 && dy < 2) continue; // Skip trunk positions
                    if (Math.abs(dx) + Math.abs(dz) <= currentRadius + 1) {
                        this.addBlock(x + dx, leafStart + dy, z + dz, BLOCK_TYPES.LEAVES);
                    }
                }
            }
        }
    }

    getGroundHeight(x, z) {
        for (let y = WORLD_HEIGHT; y >= 0; y--) {
            const block = this.blockManager.getBlock(x, y, z);
            if (block && BLOCK_PROPERTIES[block.type].solid) {
                return y;
            }
        }
        return 0;
    }

    addBlock(x, y, z, type) {
        if (type === BLOCK_TYPES.AIR) {
            this.removeBlock(x, y, z);
            return;
        }

        const block = this.blockManager.addBlock(x, y, z, type);
        const mesh = block.createMesh();
        
        if (mesh) {
            this.group.add(mesh);
            this.blockManager.meshes.set(block.getKey(), mesh);
        }

        return block;
    }

    removeBlock(x, y, z) {
        const key = `${x},${y},${z}`;
        const mesh = this.blockManager.meshes.get(key);
        
        if (mesh) {
            this.group.remove(mesh);
        }
        
        this.blockManager.removeBlock(x, y, z);
    }

    getBlock(x, y, z) {
        return this.blockManager.getBlock(
            Math.floor(x),
            Math.floor(y),
            Math.floor(z)
        );
    }

    raycast(origin, direction, maxDistance) {
        const step = 0.1;
        const steps = Math.floor(maxDistance / step);
        
        let previousX, previousY, previousZ;
        
        for (let i = 0; i < steps; i++) {
            const distance = i * step;
            const x = Math.floor(origin.x + direction.x * distance);
            const y = Math.floor(origin.y + direction.y * distance);
            const z = Math.floor(origin.z + direction.z * distance);
            
            if (x !== previousX || y !== previousY || z !== previousZ) {
                const block = this.getBlock(x, y, z);
                if (block && block.type !== BLOCK_TYPES.AIR) {
                    return {
                        block: block,
                        position: { x, y, z },
                        face: this.getRaycastFace(
                            { x: previousX, y: previousY, z: previousZ },
                            { x, y, z }
                        )
                    };
                }
                
                previousX = x;
                previousY = y;
                previousZ = z;
            }
        }
        
        return null;
    }

    getRaycastFace(previous, current) {
        if (!previous) return { x: 0, y: 1, z: 0 };
        
        const dx = current.x - previous.x;
        const dy = current.y - previous.y;
        const dz = current.z - previous.z;
        
        if (dx !== 0) return { x: -dx, y: 0, z: 0 };
        if (dy !== 0) return { x: 0, y: -dy, z: 0 };
        if (dz !== 0) return { x: 0, y: 0, z: -dz };
        
        return { x: 0, y: 1, z: 0 };
    }

    clear() {
        this.group.clear();
        this.blockManager.clear();
        this.chunks.clear();
    }
}