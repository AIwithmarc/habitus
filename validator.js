/**
 * Robust Data Validation Module for Habitus
 * Provides comprehensive validation for all data types and user inputs
 */

const HabitusValidator = (() => {
    'use strict';

    // Validation rules and constraints
    const CONSTRAINTS = {
        task: {
            description: {
                minLength: 1,
                maxLength: 500,
                required: true
            },
            role: {
                minLength: 1,
                maxLength: 100,
                required: true
            },
            goal: {
                minLength: 1,
                maxLength: 100,
                required: true
            },
            quadrant: {
                validValues: ['1', '2', '3', '4'],
                required: true
            },
            id: {
                pattern: /^[a-zA-Z0-9_-]+$/,
                required: true
            }
        },
        goal: {
            name: {
                minLength: 1,
                maxLength: 100,
                required: true
            },
            role: {
                minLength: 1,
                maxLength: 100,
                required: true
            },
            description: {
                maxLength: 500,
                required: false
            }
        },
        role: {
            name: {
                minLength: 1,
                maxLength: 50,
                pattern: /^[a-zA-Z0-9\sáéíóúñÁÉÍÓÚÑ_-]+$/,
                required: true
            }
        },
        review: {
            text: {
                maxLength: 2000,
                required: false
            }
        },
        metrics: {
            timestamp: {
                type: 'number',
                min: 0,
                required: true
            },
            totalTasks: {
                type: 'number',
                min: 0,
                max: 10000,
                required: true
            },
            completedTasks: {
                type: 'number',
                min: 0,
                max: 10000,
                required: true
            },
            quadrants: {
                type: 'array',
                length: 4,
                itemType: 'number',
                itemMin: 0,
                required: true
            }
        }
    };

    // Error messages
    const ERROR_MESSAGES = {
        es: {
            required: 'Este campo es obligatorio',
            minLength: 'Debe tener al menos {min} caracteres',
            maxLength: 'No puede tener más de {max} caracteres',
            pattern: 'El formato no es válido',
            type: 'El tipo de dato no es válido',
            min: 'El valor debe ser mayor o igual a {min}',
            max: 'El valor debe ser menor o igual a {max}',
            validValues: 'Debe ser uno de los siguientes valores: {values}',
            length: 'Debe tener exactamente {length} elementos',
            itemType: 'Todos los elementos deben ser de tipo {type}',
            itemMin: 'Todos los elementos deben ser mayores o iguales a {min}',
            duplicate: 'Este valor ya existe',
            invalid: 'El valor no es válido'
        },
        en: {
            required: 'This field is required',
            minLength: 'Must be at least {min} characters',
            maxLength: 'Cannot be more than {max} characters',
            pattern: 'Invalid format',
            type: 'Invalid data type',
            min: 'Value must be greater than or equal to {min}',
            max: 'Value must be less than or equal to {max}',
            validValues: 'Must be one of: {values}',
            length: 'Must have exactly {length} elements',
            itemType: 'All elements must be of type {type}',
            itemMin: 'All elements must be greater than or equal to {min}',
            duplicate: 'This value already exists',
            invalid: 'Invalid value'
        }
    };

    // Utility functions
    function getCurrentLanguage() {
        return (typeof Translations !== 'undefined' && Translations.getCurrentLanguage) ? 
               Translations.getCurrentLanguage() : 
               (localStorage.getItem('habitus_lang') || 'es');
    }

    function getMessage(key, params = {}) {
        const lang = getCurrentLanguage();
        let message = ERROR_MESSAGES[lang]?.[key] || ERROR_MESSAGES.es[key] || key;
        
        // Replace parameters
        Object.keys(params).forEach(param => {
            message = message.replace(`{${param}}`, params[param]);
        });
        
        return message;
    }

    // Core validation functions
    function validateRequired(value, fieldName) {
        if (value === null || value === undefined || value === '') {
            return {
                valid: false,
                error: getMessage('required'),
                field: fieldName
            };
        }
        return { valid: true };
    }

    function validateLength(value, min, max, fieldName) {
        const length = String(value).length;
        
        if (min !== undefined && length < min) {
            return {
                valid: false,
                error: getMessage('minLength', { min }),
                field: fieldName
            };
        }
        
        if (max !== undefined && length > max) {
            return {
                valid: false,
                error: getMessage('maxLength', { max }),
                field: fieldName
            };
        }
        
        return { valid: true };
    }

    function validatePattern(value, pattern, fieldName) {
        if (pattern && !pattern.test(String(value))) {
            return {
                valid: false,
                error: getMessage('pattern'),
                field: fieldName
            };
        }
        return { valid: true };
    }

    function validateType(value, expectedType, fieldName) {
        let actualType = typeof value;
        
        if (expectedType === 'array') {
            actualType = Array.isArray(value) ? 'array' : actualType;
        }
        
        if (actualType !== expectedType) {
            return {
                valid: false,
                error: getMessage('type'),
                field: fieldName
            };
        }
        
        return { valid: true };
    }

    function validateRange(value, min, max, fieldName) {
        const numValue = Number(value);
        
        if (isNaN(numValue)) {
            return {
                valid: false,
                error: getMessage('type'),
                field: fieldName
            };
        }
        
        if (min !== undefined && numValue < min) {
            return {
                valid: false,
                error: getMessage('min', { min }),
                field: fieldName
            };
        }
        
        if (max !== undefined && numValue > max) {
            return {
                valid: false,
                error: getMessage('max', { max }),
                field: fieldName
            };
        }
        
        return { valid: true };
    }

    function validateArray(value, constraints, fieldName) {
        if (!Array.isArray(value)) {
            return {
                valid: false,
                error: getMessage('type'),
                field: fieldName
            };
        }
        
        if (constraints.length !== undefined && value.length !== constraints.length) {
            return {
                valid: false,
                error: getMessage('length', { length: constraints.length }),
                field: fieldName
            };
        }
        
        if (constraints.itemType) {
            for (let i = 0; i < value.length; i++) {
                const itemValidation = validateType(value[i], constraints.itemType, `${fieldName}[${i}]`);
                if (!itemValidation.valid) {
                    return {
                        valid: false,
                        error: getMessage('itemType', { type: constraints.itemType }),
                        field: fieldName
                    };
                }
            }
        }
        
        if (constraints.itemMin !== undefined) {
            for (let i = 0; i < value.length; i++) {
                if (Number(value[i]) < constraints.itemMin) {
                    return {
                        valid: false,
                        error: getMessage('itemMin', { min: constraints.itemMin }),
                        field: fieldName
                    };
                }
            }
        }
        
        return { valid: true };
    }

    function validateValidValues(value, validValues, fieldName) {
        if (validValues && !validValues.includes(value)) {
            return {
                valid: false,
                error: getMessage('validValues', { values: validValues.join(', ') }),
                field: fieldName
            };
        }
        return { valid: true };
    }

    // Generic field validator
    function validateField(value, constraints, fieldName) {
        const errors = [];
        
        // Required validation
        if (constraints.required) {
            const requiredResult = validateRequired(value, fieldName);
            if (!requiredResult.valid) {
                return requiredResult;
            }
        }
        
        // Skip other validations if value is empty and not required
        if (!constraints.required && (value === null || value === undefined || value === '')) {
            return { valid: true };
        }
        
        // Type validation
        if (constraints.type) {
            const typeResult = validateType(value, constraints.type, fieldName);
            if (!typeResult.valid) {
                return typeResult;
            }
        }
        
        // Length validation
        if (constraints.minLength !== undefined || constraints.maxLength !== undefined) {
            const lengthResult = validateLength(value, constraints.minLength, constraints.maxLength, fieldName);
            if (!lengthResult.valid) {
                return lengthResult;
            }
        }
        
        // Pattern validation
        if (constraints.pattern) {
            const patternResult = validatePattern(value, constraints.pattern, fieldName);
            if (!patternResult.valid) {
                return patternResult;
            }
        }
        
        // Range validation
        if (constraints.min !== undefined || constraints.max !== undefined) {
            const rangeResult = validateRange(value, constraints.min, constraints.max, fieldName);
            if (!rangeResult.valid) {
                return rangeResult;
            }
        }
        
        // Valid values validation
        if (constraints.validValues) {
            const validValuesResult = validateValidValues(value, constraints.validValues, fieldName);
            if (!validValuesResult.valid) {
                return validValuesResult;
            }
        }
        
        // Array validation
        if (constraints.type === 'array') {
            const arrayResult = validateArray(value, constraints, fieldName);
            if (!arrayResult.valid) {
                return arrayResult;
            }
        }
        
        return { valid: true };
    }

    // Object validator
    function validateObject(obj, schema, objectName = 'object') {
        const errors = [];
        
        Object.keys(schema).forEach(fieldName => {
            const value = obj[fieldName];
            const constraints = schema[fieldName];
            const result = validateField(value, constraints, fieldName);
            
            if (!result.valid) {
                errors.push(result);
            }
        });
        
        return {
            valid: errors.length === 0,
            errors,
            object: objectName
        };
    }

    // Sanitization functions
    function sanitizeString(str, maxLength = 1000) {
        if (typeof str !== 'string') return '';
        
        return str
            .trim()
            .slice(0, maxLength)
            .replace(/[<>]/g, '') // Remove potential HTML tags
            .replace(/\n{3,}/g, '\n\n'); // Limit consecutive newlines
    }

    function sanitizeHtml(str) {
        if (typeof str !== 'string') return '';
        
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function generateSecureId() {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substr(2, 9);
        return `${timestamp}_${random}`;
    }

    // Public validation methods
    const validators = {
        // Task validation
        validateTask(task) {
            // Ensure task has proper structure
            const taskData = {
                id: task.id || generateSecureId(),
                description: sanitizeString(task.description, 500),
                role: sanitizeString(task.role, 100),
                goal: sanitizeString(task.goal, 100),
                quadrant: String(task.quadrant),
                completed: Boolean(task.completed),
                createdAt: task.createdAt || new Date().toISOString()
            };
            
            const validation = validateObject(taskData, CONSTRAINTS.task, 'task');
            
            return {
                ...validation,
                data: taskData
            };
        },

        // Goal validation
        validateGoal(goal) {
            // Ensure goal has proper structure
            const goalData = {
                name: sanitizeString(goal.name, 100),
                role: sanitizeString(goal.role, 100),
                description: sanitizeString(goal.description || '', 500)
            };
            
            const validation = validateObject(goalData, CONSTRAINTS.goal, 'goal');
            
            return {
                ...validation,
                data: goalData
            };
        },

        // Role validation
        validateRole(roleName, existingRoles = []) {
            const sanitizedName = sanitizeString(roleName, 50);
            const validation = validateField(sanitizedName, CONSTRAINTS.role.name, 'role');
            
            if (!validation.valid) {
                return validation;
            }
            
            // Check for duplicates
            if (existingRoles.includes(sanitizedName)) {
                return {
                    valid: false,
                    error: getMessage('duplicate'),
                    field: 'role'
                };
            }
            
            return {
                valid: true,
                data: sanitizedName
            };
        },

        // Review validation
        validateReview(reviewText) {
            const sanitizedText = sanitizeString(reviewText, 2000);
            const validation = validateField(sanitizedText, CONSTRAINTS.review.text, 'review');
            
            return {
                ...validation,
                data: sanitizedText
            };
        },

        // Metrics validation
        validateMetrics(metrics) {
            const metricsData = {
                timestamp: Number(metrics.timestamp) || Date.now(),
                totalTasks: Number(metrics.totalTasks) || 0,
                completedTasks: Number(metrics.completedTasks) || 0,
                activeRoles: Number(metrics.activeRoles) || 0,
                quadrants: Array.isArray(metrics.quadrants) ? 
                          metrics.quadrants.map(q => Number(q) || 0) : 
                          [0, 0, 0, 0],
                review: sanitizeString(metrics.review || '', 2000)
            };
            
            const validation = validateObject(metricsData, CONSTRAINTS.metrics, 'metrics');
            
            return {
                ...validation,
                data: metricsData
            };
        },

        // General input validation for forms
        validateInput(value, type = 'text') {
            if (typeof value !== 'string') {
                return {
                    valid: false,
                    error: getMessage('type'),
                    data: ''
                };
            }
            
            let sanitized = sanitizeString(value);
            
            switch (type) {
                case 'task-description':
                    return this.validateField(sanitized, CONSTRAINTS.task.description, 'description');
                    
                case 'role-name':
                    return this.validateField(sanitized, CONSTRAINTS.role.name, 'role');
                    
                case 'review':
                    return this.validateReview(sanitized);
                    
                default:
                    return {
                        valid: true,
                        data: sanitized
                    };
            }
        },

        // Email validation (for feedback)
        validateEmail(email) {
            const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            const sanitized = sanitizeString(email, 254);
            
            if (!emailPattern.test(sanitized)) {
                return {
                    valid: false,
                    error: getMessage('pattern'),
                    field: 'email'
                };
            }
            
            return {
                valid: true,
                data: sanitized
            };
        },

        // Batch validation
        validateBatch(items, validator) {
            const results = items.map((item, index) => {
                const result = validator(item);
                return {
                    ...result,
                    index
                };
            });
            
            const errors = results.filter(r => !r.valid);
            const validData = results
                .filter(r => r.valid)
                .map(r => r.data);
            
            return {
                valid: errors.length === 0,
                errors,
                data: validData,
                totalItems: items.length,
                validItems: validData.length
            };
        }
    };

    // Initialize validator
    function init() {
        if (window.HabitusConfig && window.HabitusConfig.logger) {
            window.HabitusConfig.logger.info('Validator module initialized');
        }
    }

    // Auto-initialize
    if (typeof document !== 'undefined') {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
        } else {
            init();
        }
    }

    return {
        ...validators,
        validateField,
        validateObject,
        sanitizeString,
        sanitizeHtml,
        generateSecureId,
        getMessage,
        CONSTRAINTS,
        init
    };
})();

// Make available globally
window.HabitusValidator = HabitusValidator;
