// Utility helper functions for the Mind Map application
import { CONFIG } from '../config.js';

export class DOMHelpers {
    /**
     * Find the closest node element from a given element
     * @param {Element} element - Starting element
     * @returns {Element|null} Node element or null
     */
    static findNodeElement(element) {
        while (element && element !== document.body) {
            if (element.classList?.contains('mind-map-node')) {
                return element;
            }
            element = element.parentElement;
        }
        return null;
    }

    /**
     * Create a DOM element with classes and attributes
     * @param {string} tag - HTML tag name
     * @param {Object} options - Options object
     * @returns {Element} Created element
     */
    static createElement(tag, options = {}) {
        const element = document.createElement(tag);
        
        if (options.className) {
            element.className = options.className;
        }
        
        if (options.attributes) {
            Object.entries(options.attributes).forEach(([key, value]) => {
                element.setAttribute(key, value);
            });
        }
        
        if (options.style) {
            Object.assign(element.style, options.style);
        }
        
        if (options.textContent) {
            element.textContent = options.textContent;
        }
        
        if (options.innerHTML) {
            element.innerHTML = options.innerHTML;
        }
        
        return element;
    }

    /**
     * Batch DOM updates using DocumentFragment
     * @param {Element} container - Container element
     * @param {Function} updater - Function that adds elements to fragment
     */
    static batchDOMUpdates(container, updater) {
        const fragment = document.createDocumentFragment();
        updater(fragment);
        container.appendChild(fragment);
    }

    /**
     * Get element position relative to viewport
     * @param {Element} element - Target element
     * @returns {Object} Position object with x, y, width, height
     */
    static getElementPosition(element) {
        const rect = element.getBoundingClientRect();
        return {
            x: rect.left,
            y: rect.top,
            width: rect.width,
            height: rect.height,
            centerX: rect.left + rect.width / 2,
            centerY: rect.top + rect.height / 2
        };
    }
}

export class EventHelpers {
    /**
     * Debounce function execution
     * @param {Function} func - Function to debounce
     * @param {number} delay - Delay in milliseconds
     * @returns {Function} Debounced function
     */
    static debounce(func, delay = CONFIG.UI.DEBOUNCE_DELAY) {
        let timeoutId;
        return function debounced(...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    }

    /**
     * Throttle function execution
     * @param {Function} func - Function to throttle
     * @param {number} delay - Delay in milliseconds
     * @returns {Function} Throttled function
     */
    static throttle(func, delay = CONFIG.UI.DEBOUNCE_DELAY) {
        let lastCall = 0;
        return function throttled(...args) {
            const now = Date.now();
            if (now - lastCall >= delay) {
                lastCall = now;
                func.apply(this, args);
            }
        };
    }

    /**
     * Add event listener with cleanup tracking
     * @param {Element} element - Target element
     * @param {string} event - Event name
     * @param {Function} handler - Event handler
     * @param {Object} options - Event options
     * @returns {Function} Cleanup function
     */
    static addEventListenerWithCleanup(element, event, handler, options = {}) {
        element.addEventListener(event, handler, options);
        return () => element.removeEventListener(event, handler, options);
    }

    /**
     * Get mouse/touch coordinates from event
     * @param {Event} event - Mouse or touch event
     * @param {Element} container - Container element for relative positioning
     * @returns {Object} Coordinates object
     */
    static getEventCoordinates(event, container = null) {
        let clientX, clientY;
        
        if (event.touches && event.touches.length > 0) {
            clientX = event.touches[0].clientX;
            clientY = event.touches[0].clientY;
        } else {
            clientX = event.clientX;
            clientY = event.clientY;
        }
        
        if (container) {
            const rect = container.getBoundingClientRect();
            return {
                x: clientX - rect.left,
                y: clientY - rect.top,
                clientX,
                clientY
            };
        }
        
        return { x: clientX, y: clientY, clientX, clientY };
    }
}

export class MathHelpers {
    /**
     * Calculate distance between two points
     * @param {Object} point1 - First point {x, y}
     * @param {Object} point2 - Second point {x, y}
     * @returns {number} Distance
     */
    static distance(point1, point2) {
        const dx = point2.x - point1.x;
        const dy = point2.y - point1.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Check if point is within circle
     * @param {Object} point - Point {x, y}
     * @param {Object} circle - Circle {x, y, radius}
     * @returns {boolean} True if point is inside circle
     */
    static pointInCircle(point, circle) {
        return this.distance(point, circle) <= circle.radius;
    }

    /**
     * Clamp a value between min and max
     * @param {number} value - Value to clamp
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     * @returns {number} Clamped value
     */
    static clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }

    /**
     * Linear interpolation between two values
     * @param {number} start - Start value
     * @param {number} end - End value
     * @param {number} factor - Interpolation factor (0-1)
     * @returns {number} Interpolated value
     */
    static lerp(start, end, factor) {
        return start + (end - start) * factor;
    }

    /**
     * Generate a unique ID
     * @param {string} prefix - Optional prefix
     * @returns {string} Unique ID
     */
    static generateId(prefix = '') {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 11);
        return `${prefix}${timestamp}_${random}`;
    }
}

export class DataHelpers {
    /**
     * Deep clone an object
     * @param {any} obj - Object to clone
     * @returns {any} Cloned object
     */
    static deepClone(obj) {
        if (obj === null || typeof obj !== 'object') {
            return obj;
        }
        
        if (obj instanceof Date) {
            return new Date(obj.getTime());
        }
        
        if (obj instanceof Array) {
            return obj.map(item => this.deepClone(item));
        }
        
        if (typeof obj === 'object') {
            const cloned = {};
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    cloned[key] = this.deepClone(obj[key]);
                }
            }
            return cloned;
        }
        
        return obj;
    }

    /**
     * Safely get nested property from object
     * @param {Object} obj - Source object
     * @param {string} path - Property path (e.g., 'user.profile.name')
     * @param {any} defaultValue - Default value if path doesn't exist
     * @returns {any} Property value or default
     */
    static safeGet(obj, path, defaultValue = undefined) {
        const keys = path.split('.');
        let current = obj;
        
        for (const key of keys) {
            if (current == null || typeof current !== 'object') {
                return defaultValue;
            }
            current = current[key];
        }
        
        return current !== undefined ? current : defaultValue;
    }

    /**
     * Check if object is empty
     * @param {Object} obj - Object to check
     * @returns {boolean} True if empty
     */
    static isEmpty(obj) {
        if (obj == null) return true;
        if (Array.isArray(obj)) return obj.length === 0;
        if (typeof obj === 'object') return Object.keys(obj).length === 0;
        return false;
    }

    /**
     * Convert Map to plain object
     * @param {Map} map - Map to convert
     * @returns {Object} Plain object
     */
    static mapToObject(map) {
        const obj = {};
        map.forEach((value, key) => {
            obj[key] = value;
        });
        return obj;
    }

    /**
     * Convert plain object to Map
     * @param {Object} obj - Object to convert
     * @returns {Map} Map object
     */
    static objectToMap(obj) {
        const map = new Map();
        Object.entries(obj).forEach(([key, value]) => {
            map.set(key, value);
        });
        return map;
    }
}

export class StorageHelpers {
    /**
     * Save data to localStorage with error handling
     * @param {string} key - Storage key
     * @param {any} data - Data to save
     * @returns {boolean} Success status
     */
    static saveToLocalStorage(key, data) {
        try {
            const serialized = JSON.stringify(data);
            localStorage.setItem(key, serialized);
            return true;
        } catch (error) {
            console.warn('Failed to save to localStorage:', error);
            return false;
        }
    }

    /**
     * Load data from localStorage with error handling
     * @param {string} key - Storage key
     * @param {any} defaultValue - Default value if not found
     * @returns {any} Loaded data or default
     */
    static loadFromLocalStorage(key, defaultValue = null) {
        try {
            const serialized = localStorage.getItem(key);
            if (serialized === null) return defaultValue;
            return JSON.parse(serialized);
        } catch (error) {
            console.warn('Failed to load from localStorage:', error);
            return defaultValue;
        }
    }

    /**
     * Clear localStorage item
     * @param {string} key - Storage key
     * @returns {boolean} Success status
     */
    static clearFromLocalStorage(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.warn('Failed to clear from localStorage:', error);
            return false;
        }
    }
}

export class NotificationHelpers {
    /**
     * Show a toast notification
     * @param {string} message - Notification message
     * @param {string} type - Notification type (success, error, warning, info)
     * @param {number} duration - Duration in milliseconds
     */
    static showToast(message, type = 'info', duration = 3000) {
        // Create toast element
        const toast = DOMHelpers.createElement('div', {
            className: `toast toast-${type}`,
            textContent: message,
            style: {
                position: 'fixed',
                top: '20px',
                right: '20px',
                padding: '12px 16px',
                borderRadius: '8px',
                color: 'white',
                zIndex: '10000',
                transform: 'translateX(100%)',
                transition: 'transform 0.3s ease',
                backgroundColor: this.getToastColor(type)
            }
        });

        document.body.appendChild(toast);

        // Animate in
        requestAnimationFrame(() => {
            toast.style.transform = 'translateX(0)';
        });

        // Remove after duration
        setTimeout(() => {
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, duration);
    }

    /**
     * Get toast background color based on type
     * @param {string} type - Toast type
     * @returns {string} CSS color
     */
    static getToastColor(type) {
        const colors = {
            success: '#10b981',
            error: '#ef4444',
            warning: '#f59e0b',
            info: '#3b82f6'
        };
        return colors[type] || colors.info;
    }
}

// Export all helpers as a single object for convenience
export const Helpers = {
    DOM: DOMHelpers,
    Event: EventHelpers,
    Math: MathHelpers,
    Data: DataHelpers,
    Storage: StorageHelpers,
    Notification: NotificationHelpers
};

export default Helpers;