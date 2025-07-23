import { UI } from '../config/constants.js';

export const debounce = (func, delay = UI.DEBOUNCE_DELAY) => {
    let timeoutId;
    return function debounced(...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
};

export const throttle = (func, delay = UI.DEBOUNCE_DELAY) => {
    let lastCall = 0;
    return function throttled(...args) {
        const now = Date.now();
        if (now - lastCall >= delay) {
            lastCall = now;
            func.apply(this, args);
        }
    };
};

export const distance = (point1, point2) => {
    const dx = point2.x - point1.x;
    const dy = point2.y - point1.y;
    return Math.sqrt(dx * dx + dy * dy);
};

export const pointInCircle = (point, circle) => {
    return distance(point, circle) <= circle.radius;
};

export const clamp = (value, min, max) => {
    return Math.min(Math.max(value, min), max);
};

export const lerp = (start, end, factor) => {
    return start + (end - start) * factor;
};

export const generateId = (prefix = '') => {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 11);
    return `${prefix}${timestamp}_${random}`;
};

export const deepClone = (obj) => {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (obj instanceof Array) return obj.map(item => deepClone(item));
    
    if (typeof obj === 'object') {
        const cloned = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                cloned[key] = deepClone(obj[key]);
            }
        }
        return cloned;
    }
    
    return obj;
};

export const safeGet = (obj, path, defaultValue = undefined) => {
    const keys = path.split('.');
    let current = obj;
    
    for (const key of keys) {
        if (current == null || typeof current !== 'object') {
            return defaultValue;
        }
        current = current[key];
    }
    
    return current !== undefined ? current : defaultValue;
};

export const isEmpty = (obj) => {
    if (obj == null) return true;
    if (Array.isArray(obj)) return obj.length === 0;
    if (typeof obj === 'object') return Object.keys(obj).length === 0;
    return false;
};

export const findNodeElement = (element) => {
    while (element && element !== document.body) {
        if (element.classList?.contains('mind-map-node')) {
            return element;
        }
        element = element.parentElement;
    }
    return null;
};

export const createElement = (tag, options = {}) => {
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
};

export const batchDOMUpdates = (container, updater) => {
    const fragment = document.createDocumentFragment();
    updater(fragment);
    container.appendChild(fragment);
};

export const getElementPosition = (element) => {
    const rect = element.getBoundingClientRect();
    return {
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height,
        centerX: rect.left + rect.width / 2,
        centerY: rect.top + rect.height / 2
    };
};

export const addEventListenerWithCleanup = (element, event, handler, options = {}) => {
    element.addEventListener(event, handler, options);
    return () => element.removeEventListener(event, handler, options);
};

export const getEventCoordinates = (event, container = null) => {
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
};

export const saveToLocalStorage = (key, data) => {
    try {
        const serialized = JSON.stringify(data);
        localStorage.setItem(key, serialized);
        return true;
    } catch {
        return false;
    }
};

export const loadFromLocalStorage = (key, defaultValue = null) => {
    try {
        const serialized = localStorage.getItem(key);
        if (serialized === null) return defaultValue;
        return JSON.parse(serialized);
    } catch {
        return defaultValue;
    }
};

export const clearFromLocalStorage = (key) => {
    try {
        localStorage.removeItem(key);
        return true;
    } catch {
        return false;
    }
};

export const mapToObject = (map) => {
    const obj = {};
    map.forEach((value, key) => {
        obj[key] = value;
    });
    return obj;
};

export const objectToMap = (obj) => {
    const map = new Map();
    Object.entries(obj).forEach(([key, value]) => {
        map.set(key, value);
    });
    return map;
};