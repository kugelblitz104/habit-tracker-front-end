import DOMPurify from 'dompurify';

/**
 * Sanitization utilities for form inputs
 */

/**
 * Sanitizes HTML content to prevent XSS attacks
 */
export const sanitizeHtml = (input: string): string => {
    return DOMPurify.sanitize(input, {
        ALLOWED_TAGS: [], // No HTML tags allowed
        ALLOWED_ATTR: []
    });
};

/**
 * Trims whitespace and sanitizes basic text input
 */
export const sanitizeText = (input: string): string => {
    return sanitizeHtml(input.trim());
};

/**
 * Sanitizes and validates email format
 */
export const sanitizeEmail = (input: string): string => {
    const sanitized = sanitizeText(input.toLowerCase());
    return sanitized;
};

/**
 * Sanitizes username - allows only alphanumeric, underscore, hyphen
 */
export const sanitizeUsername = (input: string): string => {
    const sanitized = sanitizeText(input);
    return sanitized.replace(/[^a-zA-Z0-9_-]/g, '');
};

/**
 * Sanitizes multiline text (like notes/descriptions)
 */
export const sanitizeMultilineText = (input: string): string => {
    // Trim each line and remove excessive whitespace
    const lines = input.split('\n').map((line) => line.trim());
    return sanitizeHtml(lines.join('\n'));
};

/**
 * Validation patterns for react-hook-form
 */
export const validationPatterns = {
    username: {
        pattern: {
            value: /^[a-zA-Z0-9_-]{3,20}$/,
            message: 'Username must be 3-20 characters (letters, numbers, _, -)'
        }
    },
    name: {
        pattern: {
            value: /^[a-zA-Z\s'-]{1,50}$/,
            message: "Name must be 1-50 characters (letters, spaces, ', -)"
        }
    },
    email: {
        pattern: {
            value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
            message: 'Please enter a valid email address'
        }
    },
    habitName: {
        minLength: {
            value: 1,
            message: 'Habit name is required'
        },
        maxLength: {
            value: 100,
            message: 'Habit name must be less than 100 characters'
        }
    },
    question: {
        maxLength: {
            value: 200,
            message: 'Question must be less than 200 characters'
        }
    },
    notes: {
        maxLength: {
            value: 1000,
            message: 'Notes must be less than 1000 characters'
        }
    },
    password: {
        validate: {
            hasCapital: (value: string) => /[A-Z]/.test(value) || 'Must have uppercase',
            hasLower: (value: string) => /[a-z]/.test(value) || 'Must have lowercase',
            hasNumber: (value: string) => /\d/.test(value) || 'Must have a number',
            minLength: (value: string) => value.length >= 8 || 'Must be at least 8 characters'
        }
    }
};

/**
 * Sanitize form data object
 */
export const sanitizeFormData = <T extends Record<string, any>>(
    data: T,
    sanitizers: Partial<Record<keyof T, (value: any) => any>>
): T => {
    const sanitized = { ...data };

    Object.keys(sanitizers).forEach((key) => {
        const sanitizer = sanitizers[key as keyof T];
        if (sanitizer && sanitized[key as keyof T] !== undefined) {
            sanitized[key as keyof T] = sanitizer(sanitized[key as keyof T]);
        }
    });

    return sanitized;
};
