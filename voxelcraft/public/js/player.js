class Player {
    constructor(id, username, isLocal = false) {
        this.id = id;
        this.username = username;
        this.isLocal = isLocal;
        
        this.position = new THREE.Vector3(0, WATER_LEVEL + 10, 0);
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.rotation = new THREE.Euler(0, 0, 0);
        
        this.onGround = false;
        this.selectedBlock = BLOCK_TYPES.GRASS;
        
        if (!isLocal) {
            this.createPlayerMesh();
        }
    }

    createPlayerMesh() {
        const group = new THREE.Group();
        
        // Body
        const bodyGeometry = new THREE.BoxGeometry(0.6, 1.0, 0.3);
        const bodyMaterial = new THREE.MeshLambertMaterial({ color: 0x0000ff });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 0.5;
        group.add(body);
        
        // Head
        const headGeometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
        const headMaterial = new THREE.MeshLambertMaterial({ color: 0xffdbac });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.y = 1.25;
        group.add(head);
        
        // Arms
        const armGeometry = new THREE.BoxGeometry(0.25, 0.75, 0.25);
        const armMaterial = new THREE.MeshLambertMaterial({ color: 0xffdbac });
        
        const leftArm = new THREE.Mesh(armGeometry, armMaterial);
        leftArm.position.set(-0.425, 0.625, 0);
        group.add(leftArm);
        
        const rightArm = new THREE.Mesh(armGeometry, armMaterial);
        rightArm.position.set(0.425, 0.625, 0);
        group.add(rightArm);
        
        // Username label
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 256;
        canvas.height = 64;
        
        context.fillStyle = 'rgba(0, 0, 0, 0.5)';
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        context.font = 'bold 32px Arial';
        context.fillStyle = 'white';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(this.username, canvas.width / 2, canvas.height / 2);
        
        const texture = new THREE.CanvasTexture(canvas);
        const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
        const sprite = new THREE.Sprite(spriteMaterial);
        sprite.scale.set(2, 0.5, 1);
        sprite.position.y = 2;
        group.add(sprite);
        
        this.mesh = group;
        return group;
    }

    update(deltaTime, world) {
        if (!this.isLocal) {
            if (this.mesh) {
                this.mesh.position.copy(this.position);
                this.mesh.rotation.y = this.rotation.y;
            }
            return;
        }

        // Apply gravity
        this.velocity.y += GRAVITY * deltaTime;
        
        // Update position
        const newPosition = this.position.clone();
        newPosition.add(this.velocity.clone().multiplyScalar(deltaTime));
        
        // Collision detection
        const bounds = this.getBounds(newPosition);
        let collision = false;
        
        // Check Y collision (ground/ceiling)
        const feetY = Math.floor(newPosition.y - PLAYER_HEIGHT / 2);
        const headY = Math.floor(newPosition.y + PLAYER_HEIGHT / 2);
        
        if (this.velocity.y < 0) {
            // Falling - check feet
            for (let x = Math.floor(bounds.minX); x <= Math.floor(bounds.maxX); x++) {
                for (let z = Math.floor(bounds.minZ); z <= Math.floor(bounds.maxZ); z++) {
                    if (world.blockManager.isSolidBlock(x, feetY, z)) {
                        newPosition.y = feetY + 1 + PLAYER_HEIGHT / 2;
                        this.velocity.y = 0;
                        this.onGround = true;
                        collision = true;
                        break;
                    }
                }
                if (collision) break;
            }
        } else if (this.velocity.y > 0) {
            // Jumping - check head
            for (let x = Math.floor(bounds.minX); x <= Math.floor(bounds.maxX); x++) {
                for (let z = Math.floor(bounds.minZ); z <= Math.floor(bounds.maxZ); z++) {
                    if (world.blockManager.isSolidBlock(x, headY, z)) {
                        newPosition.y = headY - PLAYER_HEIGHT / 2;
                        this.velocity.y = 0;
                        collision = true;
                        break;
                    }
                }
                if (collision) break;
            }
        }
        
        // Check X/Z collision
        const checkBounds = this.getBounds(newPosition);
        collision = false;
        
        for (let y = Math.floor(checkBounds.minY); y <= Math.floor(checkBounds.maxY); y++) {
            for (let x = Math.floor(checkBounds.minX); x <= Math.floor(checkBounds.maxX); x++) {
                for (let z = Math.floor(checkBounds.minZ); z <= Math.floor(checkBounds.maxZ); z++) {
                    if (world.blockManager.isSolidBlock(x, y, z)) {
                        collision = true;
                        break;
                    }
                }
                if (collision) break;
            }
            if (collision) break;
        }
        
        if (!collision) {
            this.position.copy(newPosition);
        } else {
            this.velocity.x = 0;
            this.velocity.z = 0;
        }
        
        // Check if still on ground
        if (this.onGround) {
            let stillOnGround = false;
            const checkY = Math.floor(this.position.y - PLAYER_HEIGHT / 2 - 0.1);
            
            for (let x = Math.floor(bounds.minX); x <= Math.floor(bounds.maxX); x++) {
                for (let z = Math.floor(bounds.minZ); z <= Math.floor(bounds.maxZ); z++) {
                    if (world.blockManager.isSolidBlock(x, checkY, z)) {
                        stillOnGround = true;
                        break;
                    }
                }
                if (stillOnGround) break;
            }
            
            this.onGround = stillOnGround;
        }
    }

    getBounds(position = this.position) {
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

    jump() {
        if (this.onGround) {
            this.velocity.y = JUMP_FORCE;
            this.onGround = false;
        }
    }

    move(forward, right) {
        const speed = PLAYER_SPEED;
        
        // Calculate movement direction based on rotation
        const moveX = Math.sin(this.rotation.y) * forward + Math.cos(this.rotation.y) * right;
        const moveZ = Math.cos(this.rotation.y) * forward - Math.sin(this.rotation.y) * right;
        
        this.velocity.x = moveX * speed;
        this.velocity.z = moveZ * speed;
    }

    rotate(deltaX, deltaY) {
        this.rotation.y -= deltaX;
        this.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.rotation.x - deltaY));
    }

    destroy() {
        if (this.mesh) {
            if (this.mesh.parent) {
                this.mesh.parent.remove(this.mesh);
            }
            
            this.mesh.traverse((child) => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (child.material.map) child.material.map.dispose();
                    child.material.dispose();
                }
            });
        }
    }

    toData() {
        return {
            id: this.id,
            username: this.username,
            position: {
                x: this.position.x,
                y: this.position.y,
                z: this.position.z
            },
            rotation: {
                x: this.rotation.x,
                y: this.rotation.y,
                z: this.rotation.z
            }
        };
    }

    fromData(data) {
        if (data.position) {
            this.position.set(data.position.x, data.position.y, data.position.z);
        }
        if (data.rotation) {
            this.rotation.set(data.rotation.x, data.rotation.y, data.rotation.z);
        }
    }
}