class Controls {
    constructor(player, camera, domElement) {
        this.player = player;
        this.camera = camera;
        this.domElement = domElement;
        
        this.keys = {};
        this.mouseX = 0;
        this.mouseY = 0;
        this.isPointerLocked = false;
        
        this.forward = 0;
        this.right = 0;
        
        this.init();
    }

    init() {
        // Keyboard events
        document.addEventListener('keydown', (e) => this.onKeyDown(e));
        document.addEventListener('keyup', (e) => this.onKeyUp(e));
        
        // Mouse events
        this.domElement.addEventListener('click', () => this.requestPointerLock());
        document.addEventListener('pointerlockchange', () => this.onPointerLockChange());
        document.addEventListener('mousemove', (e) => this.onMouseMove(e));
        
        // Prevent right-click context menu
        this.domElement.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    requestPointerLock() {
        if (!this.isPointerLocked) {
            this.domElement.requestPointerLock();
        }
    }

    onPointerLockChange() {
        this.isPointerLocked = document.pointerLockElement === this.domElement;
    }

    onKeyDown(event) {
        if (event.target.tagName === 'INPUT') return;
        
        this.keys[event.code] = true;
        
        // Handle special keys
        switch(event.code) {
            case 'Space':
                event.preventDefault();
                this.player.jump();
                break;
            case 'Digit1':
            case 'Digit2':
            case 'Digit3':
            case 'Digit4':
            case 'Digit5':
            case 'Digit6':
            case 'Digit7':
            case 'Digit8':
            case 'Digit9':
                const blockType = parseInt(event.code.replace('Digit', ''));
                this.player.selectedBlock = blockType;
                this.updateBlockSelector(blockType);
                break;
            case 'KeyT':
                if (!this.keys['KeyT']) { // Prevent repeat
                    event.preventDefault();
                    const chatInput = document.getElementById('chatInput');
                    chatInput.disabled = false;
                    chatInput.focus();
                }
                break;
        }
    }

    onKeyUp(event) {
        this.keys[event.code] = false;
    }

    onMouseMove(event) {
        if (!this.isPointerLocked) return;
        
        const deltaX = event.movementX * MOUSE_SENSITIVITY;
        const deltaY = event.movementY * MOUSE_SENSITIVITY;
        
        this.player.rotate(deltaX, deltaY);
    }

    update() {
        // Calculate movement direction
        this.forward = 0;
        this.right = 0;
        
        if (this.keys['KeyW']) this.forward += 1;
        if (this.keys['KeyS']) this.forward -= 1;
        if (this.keys['KeyA']) this.right -= 1;
        if (this.keys['KeyD']) this.right += 1;
        
        // Normalize diagonal movement
        const length = Math.sqrt(this.forward * this.forward + this.right * this.right);
        if (length > 0) {
            this.forward /= length;
            this.right /= length;
        }
        
        this.player.move(this.forward, this.right);
        
        // Update camera position and rotation
        if (this.player.isLocal) {
            this.camera.position.copy(this.player.position);
            this.camera.position.y += 0.6; // Eye level
            this.camera.rotation.copy(this.player.rotation);
        }
    }

    updateBlockSelector(blockType) {
        const items = document.querySelectorAll('.block-item');
        items.forEach(item => {
            if (parseInt(item.dataset.type) === blockType) {
                item.classList.add('selected');
            } else {
                item.classList.remove('selected');
            }
        });
    }

    destroy() {
        document.removeEventListener('keydown', this.onKeyDown);
        document.removeEventListener('keyup', this.onKeyUp);
        document.removeEventListener('pointerlockchange', this.onPointerLockChange);
        document.removeEventListener('mousemove', this.onMouseMove);
    }
}