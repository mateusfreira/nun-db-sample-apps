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