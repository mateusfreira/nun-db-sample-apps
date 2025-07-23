import { VALIDATION, COLORS } from '../config/constants.js';

export class ValidationError extends Error {
    constructor(message, field, code) {
        super(message);
        this.name = 'ValidationError';
        this.field = field;
        this.code = code;
    }
}

export const validateWorkspaceName = (name) => {
    const trimmed = name?.trim();
    
    if (!trimmed) return 'Workspace name is required';
    if (trimmed.length < VALIDATION.WORKSPACE_NAME.MIN_LENGTH) {
        return `Workspace name must be at least ${VALIDATION.WORKSPACE_NAME.MIN_LENGTH} characters`;
    }
    if (trimmed.length > VALIDATION.WORKSPACE_NAME.MAX_LENGTH) {
        return `Workspace name must be no more than ${VALIDATION.WORKSPACE_NAME.MAX_LENGTH} characters`;
    }
    if (!VALIDATION.WORKSPACE_NAME.PATTERN.test(trimmed)) {
        return 'Workspace name can only contain letters, numbers, hyphens, and underscores';
    }
    
    return null;
};

export const validateNodeData = (node) => {
    const errors = [];
    
    if (!node) {
        errors.push('Node data is required');
        return errors;
    }
    
    if (VALIDATION.NODE_TEXT.REQUIRED && !node.text?.trim()) {
        errors.push('Node text is required');
    }
    
    if (node.text && node.text.length > VALIDATION.NODE_TEXT.MAX_LENGTH) {
        errors.push(`Node text must be no more than ${VALIDATION.NODE_TEXT.MAX_LENGTH} characters`);
    }
    
    if (!isValidPosition(node.x, node.y)) {
        errors.push('Invalid node position');
    }
    
    if (node.color && !isValidColor(node.color)) {
        errors.push('Invalid node color');
    }
    
    if (node.id && typeof node.id !== 'string') {
        errors.push('Node ID must be a string');
    }
    
    return errors;
};

export const isValidPosition = (x, y) => {
    const coords = VALIDATION.COORDINATES;
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
};

export const isValidColor = (color) => {
    if (!color || typeof color !== 'string') return false;
    if (COLORS.VALID_COLORS.includes(color)) return true;
    return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
};

export const validateConnection = (connection, nodes) => {
    const errors = [];
    
    if (!connection) {
        errors.push('Connection data is required');
        return errors;
    }
    
    if (!connection.source || !nodes.has(connection.source)) {
        errors.push('Invalid connection source node');
    }
    
    if (!connection.target || !nodes.has(connection.target)) {
        errors.push('Invalid connection target node');
    }
    
    if (connection.source === connection.target) {
        errors.push('Cannot connect a node to itself');
    }
    
    if (connection.id && typeof connection.id !== 'string') {
        errors.push('Connection ID must be a string');
    }
    
    return errors;
};

export const sanitizeInput = (input) => {
    if (typeof input !== 'string') return '';
    
    return input
        .replace(/[<>]/g, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+=/gi, '')
        .trim();
};

export const validateBulk = (items, itemValidator) => {
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
};