// Validation utilities for the Mind Map application
import { CONFIG } from '../config.js';

export class ValidationError extends Error {
    constructor(message, field, code) {
        super(message);
        this.name = 'ValidationError';
        this.field = field;
        this.code = code;
    }
}

export class Validators {
    /**
     * Validate workspace name
     * @param {string} name - Workspace name to validate
     * @returns {string|null} Error message or null if valid
     */
    static validateWorkspaceName(name) {
        const trimmed = name?.trim();
        
        if (!trimmed) {
            return 'Workspace name is required';
        }
        
        if (trimmed.length < CONFIG.VALIDATION.WORKSPACE_NAME.MIN_LENGTH) {
            return `Workspace name must be at least ${CONFIG.VALIDATION.WORKSPACE_NAME.MIN_LENGTH} characters`;
        }
        
        if (trimmed.length > CONFIG.VALIDATION.WORKSPACE_NAME.MAX_LENGTH) {
            return `Workspace name must be no more than ${CONFIG.VALIDATION.WORKSPACE_NAME.MAX_LENGTH} characters`;
        }
        
        if (!CONFIG.VALIDATION.WORKSPACE_NAME.PATTERN.test(trimmed)) {
            return 'Workspace name can only contain letters, numbers, hyphens, and underscores';
        }
        
        return null;
    }

    /**
     * Validate node data
     * @param {Object} node - Node object to validate
     * @returns {string[]} Array of error messages
     */
    static validateNodeData(node) {
        const errors = [];
        
        if (!node) {
            errors.push('Node data is required');
            return errors;
        }
        
        // Validate text
        if (CONFIG.VALIDATION.NODE_TEXT.REQUIRED && !node.text?.trim()) {
            errors.push('Node text is required');
        }
        
        if (node.text && node.text.length > CONFIG.VALIDATION.NODE_TEXT.MAX_LENGTH) {
            errors.push(`Node text must be no more than ${CONFIG.VALIDATION.NODE_TEXT.MAX_LENGTH} characters`);
        }
        
        // Validate position
        if (!this.isValidPosition(node.x, node.y)) {
            errors.push('Invalid node position');
        }
        
        // Validate color
        if (node.color && !this.isValidColor(node.color)) {
            errors.push('Invalid node color');
        }
        
        // Validate ID
        if (node.id && typeof node.id !== 'string') {
            errors.push('Node ID must be a string');
        }
        
        return errors;
    }

    /**
     * Validate coordinates
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @returns {boolean} True if valid
     */
    static isValidPosition(x, y) {
        const coords = CONFIG.VALIDATION.COORDINATES;
        return (
            typeof x === 'number' && 
            typeof y === 'number' &&
            !isNaN(x) && 
            !isNaN(y) &&
            x >= coords.MIN_X && 
            x <= coords.MAX_X &&
            y >= coords.MIN_Y && 
            y <= coords.MAX_Y
        );
    }

    /**
     * Validate color value
     * @param {string} color - Color to validate
     * @returns {boolean} True if valid
     */
    static isValidColor(color) {
        if (!color || typeof color !== 'string') {
            return false;
        }
        
        // Check if it's one of our predefined colors
        if (CONFIG.COLORS.VALID_COLORS.includes(color)) {
            return true;
        }
        
        // Check if it's a valid hex color
        const hexPattern = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
        return hexPattern.test(color);
    }

    /**
     * Validate connection data
     * @param {Object} connection - Connection object to validate
     * @param {Map} nodes - Existing nodes map
     * @returns {string[]} Array of error messages
     */
    static validateConnection(connection, nodes) {
        const errors = [];
        
        if (!connection) {
            errors.push('Connection data is required');
            return errors;
        }
        
        // Validate source and target exist
        if (!connection.source || !nodes.has(connection.source)) {
            errors.push('Invalid connection source node');
        }
        
        if (!connection.target || !nodes.has(connection.target)) {
            errors.push('Invalid connection target node');
        }
        
        // Prevent self-connections
        if (connection.source === connection.target) {
            errors.push('Cannot connect a node to itself');
        }
        
        // Validate ID
        if (connection.id && typeof connection.id !== 'string') {
            errors.push('Connection ID must be a string');
        }
        
        return errors;
    }

    /**
     * Sanitize user input to prevent XSS
     * @param {string} input - User input string
     * @returns {string} Sanitized string
     */
    static sanitizeInput(input) {
        if (typeof input !== 'string') {
            return '';
        }
        
        return input
            .replace(/[<>]/g, '') // Remove HTML tags
            .replace(/javascript:/gi, '') // Remove javascript: protocol
            .replace(/on\w+=/gi, '') // Remove event handlers
            .trim();
    }

    /**
     * Validate bulk operation data
     * @param {Array} items - Array of items to validate
     * @param {Function} itemValidator - Validator function for individual items
     * @returns {Object} Validation result with valid items and errors
     */
    static validateBulk(items, itemValidator) {
        const result = {
            valid: [],
            invalid: [],
            errors: []
        };
        
        if (!Array.isArray(items)) {
            result.errors.push('Items must be an array');
            return result;
        }
        
        items.forEach((item, index) => {
            try {
                const errors = itemValidator(item);
                if (errors.length === 0) {
                    result.valid.push(item);
                } else {
                    result.invalid.push({ item, index, errors });
                    result.errors.push(`Item ${index}: ${errors.join(', ')}`);
                }
            } catch (error) {
                result.invalid.push({ item, index, errors: [error.message] });
                result.errors.push(`Item ${index}: ${error.message}`);
            }
        });
        
        return result;
    }
}

export default Validators;