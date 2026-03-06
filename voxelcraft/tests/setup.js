// Mock Three.js
global.THREE = {
    Vector3: class Vector3 {
        constructor(x = 0, y = 0, z = 0) {
            this.x = x;
            this.y = y;
            this.z = z;
        }
        
        set(x, y, z) {
            this.x = x;
            this.y = y;
            this.z = z;
            return this;
        }
        
        copy(v) {
            this.x = v.x;
            this.y = v.y;
            this.z = v.z;
            return this;
        }
        
        clone() {
            return new Vector3(this.x, this.y, this.z);
        }
        
        add(v) {
            this.x += v.x;
            this.y += v.y;
            this.z += v.z;
            return this;
        }
        
        multiplyScalar(s) {
            this.x *= s;
            this.y *= s;
            this.z *= s;
            return this;
        }
    },
    
    Euler: class Euler {
        constructor(x = 0, y = 0, z = 0) {
            this.x = x;
            this.y = y;
            this.z = z;
        }
        
        set(x, y, z) {
            this.x = x;
            this.y = y;
            this.z = z;
            return this;
        }
        
        copy(e) {
            this.x = e.x;
            this.y = e.y;
            this.z = e.z;
            return this;
        }
    },
    
    BoxGeometry: class BoxGeometry {
        constructor() {}
        dispose() {}
    },
    
    MeshLambertMaterial: class MeshLambertMaterial {
        constructor(options = {}) {
            this.color = options.color;
            this.transparent = options.transparent || false;
            this.opacity = options.opacity !== undefined ? options.opacity : 1;
        }
        dispose() {}
    },
    
    Mesh: class Mesh {
        constructor(geometry, material) {
            this.geometry = geometry;
            this.material = material;
            this.position = new global.THREE.Vector3();
            this.rotation = new global.THREE.Euler();
            this.userData = {};
        }
    },
    
    Group: class Group {
        constructor() {
            this.children = [];
            this.position = new global.THREE.Vector3();
            this.rotation = new global.THREE.Euler();
        }
        add(child) {
            this.children.push(child);
            child.parent = this;
        }
        remove(child) {
            const index = this.children.indexOf(child);
            if (index !== -1) {
                this.children.splice(index, 1);
                child.parent = null;
            }
        }
        clear() {
            this.children = [];
        }
        traverse(callback) {
            callback(this);
            this.children.forEach(child => {
                if (child.traverse) child.traverse(callback);
                else callback(child);
            });
        }
    },
    
    Scene: class Scene {
        constructor() {
            this.children = [];
            this.position = new global.THREE.Vector3();
            this.rotation = new global.THREE.Euler();
            this.fog = null;
            this.background = null;
        }
        add(child) {
            this.children.push(child);
            child.parent = this;
        }
        remove(child) {
            const index = this.children.indexOf(child);
            if (index !== -1) {
                this.children.splice(index, 1);
                child.parent = null;
            }
        }
        clear() {
            this.children = [];
        }
        traverse(callback) {
            callback(this);
            this.children.forEach(child => {
                if (child.traverse) child.traverse(callback);
                else callback(child);
            });
        }
    },
    
    Sprite: class Sprite {
        constructor() {
            this.position = new global.THREE.Vector3();
            this.scale = new global.THREE.Vector3(1, 1, 1);
        }
    },
    
    SpriteMaterial: class SpriteMaterial {
        constructor() {}
        dispose() {}
    },
    
    CanvasTexture: class CanvasTexture {
        constructor() {}
        dispose() {}
    },
    
    Color: class Color {
        constructor(hex) {
            this.hex = hex;
        }
    },
    
    Fog: class Fog {
        constructor(color, near, far) {
            this.color = color;
            this.near = near;
            this.far = far;
        }
    },
    
    PerspectiveCamera: class PerspectiveCamera {
        constructor(fov, aspect, near, far) {
            this.fov = fov;
            this.aspect = aspect;
            this.near = near;
            this.far = far;
            this.position = new global.THREE.Vector3();
            this.rotation = new global.THREE.Euler();
        }
        updateProjectionMatrix() {}
    },
    
    WebGLRenderer: class WebGLRenderer {
        constructor(options) {
            this.domElement = {
                addEventListener: () => {},
                requestPointerLock: () => {}
            };
            this.shadowMap = {
                enabled: false,
                type: null
            };
        }
        setSize() {}
        render() {}
        dispose() {}
    },
    
    AmbientLight: class AmbientLight {
        constructor(color, intensity) {
            this.color = color;
            this.intensity = intensity;
        }
    },
    
    DirectionalLight: class DirectionalLight {
        constructor(color, intensity) {
            this.color = color;
            this.intensity = intensity;
            this.position = new global.THREE.Vector3();
            this.castShadow = false;
            this.shadow = {
                camera: {
                    left: 0,
                    right: 0,
                    top: 0,
                    bottom: 0
                }
            };
        }
    },
    
    PCFSoftShadowMap: 1,
    
    Raycaster: class Raycaster {
        constructor() {}
    }
};

// Mock NunDB
global.NunDb = class NunDb {
    constructor(config) {
        this.config = config;
        this._connectionPromise = Promise.resolve();
        this.data = new Map();
        this.watchers = new Map();
    }
    
    async set(key, value) {
        this.data.set(key, value);
        this.triggerWatchers(key, value);
    }
    
    async getValue(key) {
        return this.data.get(key);
    }
    
    async remove(key) {
        this.data.delete(key);
        this.triggerWatchers(key, null);
    }
    
    async keys(prefix) {
        return Array.from(this.data.keys()).filter(k => k.startsWith(prefix));
    }
    
    watch(prefix, callback) {
        if (!this.watchers.has(prefix)) {
            this.watchers.set(prefix, []);
        }
        this.watchers.get(prefix).push(callback);
    }
    
    triggerWatchers(key, value) {
        this.watchers.forEach((callbacks, prefix) => {
            if (key.startsWith(prefix)) {
                callbacks.forEach(cb => cb({ key, value }));
            }
        });
    }
};

// Mock DOM elements
global.document = {
    getElementById: (id) => {
        return {
            textContent: '',
            innerHTML: '',
            value: '',
            focus: () => {},
            blur: () => {},
            click: () => {},
            appendChild: () => {},
            removeChild: () => {},
            addEventListener: () => {},
            removeEventListener: () => {},
            requestPointerLock: () => {},
            style: { display: 'block' },
            children: [],
            classList: {
                add: () => {},
                remove: () => {},
                contains: () => false
            }
        };
    },
    createElement: (tag) => {
        return {
            getContext: () => ({
                fillStyle: '',
                fillRect: () => {},
                font: '',
                textAlign: '',
                textBaseline: '',
                fillText: () => {}
            }),
            width: 0,
            height: 0,
            addEventListener: () => {},
            style: {}
        };
    },
    querySelectorAll: () => [],
    addEventListener: () => {},
    removeEventListener: () => {},
    pointerLockElement: null,
    exitPointerLock: () => {}
};

global.window = {
    innerWidth: 1024,
    innerHeight: 768,
    addEventListener: () => {},
    removeEventListener: () => {}
};

global.performance = {
    now: () => Date.now()
};

global.requestAnimationFrame = (callback) => {
    setTimeout(callback, 16);
};