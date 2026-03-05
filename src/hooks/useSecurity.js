/**
 * useSecurity Hook
 * Provides security utilities for form handling and input sanitization
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  sanitizeInput,
  sanitizeHTML,
  sanitizeURL,
  isValidEmail,
  isValidImageURL,
  escapeHTML,
  debounce,
  throttle,
} from '../utils/security';

/**
 * Form validation and sanitization hook
 * @returns {Object} Security utilities for form handling
 */
export const useSecurity = () => {
  // Sanitize text input
  const sanitizeText = useCallback((input) => {
    return sanitizeInput(input);
  }, []);

  // Validate and sanitize email
  const validateEmail = useCallback((email) => {
    const sanitized = sanitizeInput(email);
    const isValid = isValidEmail(sanitized);
    return {
      isValid,
      value: isValid ? sanitized : '',
      error: isValid ? null : 'Please enter a valid email address',
    };
  }, []);

  // Sanitize HTML content (for rich text)
  const sanitizeContent = useCallback((html) => {
    return sanitizeHTML(html);
  }, []);

  // Validate URL
  const validateURL = useCallback((url) => {
    const sanitized = sanitizeURL(url);
    return {
      isValid: !!sanitized,
      value: sanitized,
      error: sanitized ? null : 'Invalid or unsafe URL',
    };
  }, []);

  // Validate image URL
  const validateImageURL = useCallback((url) => {
    const isValid = isValidImageURL(url);
    return {
      isValid,
      value: isValid ? url : '',
      error: isValid ? null : 'Invalid or unsafe image URL',
    };
  }, []);

  // Escape text for safe display
  const escapeText = useCallback((text) => {
    return escapeHTML(text);
  }, []);

  // Debounced input handler (for search, etc.)
  const createDebouncedHandler = (callback, wait = 300) => {
    return debounce(callback, wait);
  };

  // Throttled event handler (for scroll, resize, etc.)
  const createThrottledHandler = (callback, limit = 100) => {
    return throttle(callback, limit);
  };

  // Form field validation
  const validateField = useCallback((value, type, options = {}) => {
    const { required = false, minLength = 0, maxLength = Infinity } = options;

    const sanitized = sanitizeInput(value);

    // Required check
    if (required && !sanitized) {
      return {
        isValid: false,
        value: '',
        error: 'This field is required',
      };
    }

    // Length checks
    if (sanitized.length < minLength) {
      return {
        isValid: false,
        value: sanitized,
        error: `Minimum ${minLength} characters required`,
      };
    }

    if (sanitized.length > maxLength) {
      return {
        isValid: false,
        value: sanitized.slice(0, maxLength),
        error: `Maximum ${maxLength} characters allowed`,
      };
    }

    // Type-specific validation
    if (type === 'email') {
      return validateEmail(sanitized);
    }

    if (type === 'url') {
      return validateURL(sanitized);
    }

    if (type === 'image') {
      return validateImageURL(sanitized);
    }

    // Default - text field
    return {
      isValid: true,
      value: sanitized,
      error: null,
    };
  }, [validateEmail, validateURL, validateImageURL]);

  return {
    sanitizeText,
    sanitizeContent,
    validateEmail,
    validateURL,
    validateImageURL,
    escapeText,
    validateField,
    createDebouncedHandler,
    createThrottledHandler,
  };
};

/**
 * useSecureForm Hook
 * Complete form handling with built-in security
 * @param {Object} initialState - Initial form state
 * @param {Object} validationRules - Validation rules for each field
 * @returns {Object} Form state and handlers
 */
export const useSecureForm = (initialState = {}, validationRules = {}) => {
  const {
    sanitizeText,
    validateField,
  } = useSecurity();

  const [values, setValues] = useState(initialState);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validate single field
  const validateField_wrapper = useCallback((name, value) => {
    const rules = validationRules[name] || {};
    const result = validateField(value, rules.type || 'text', rules);
    
    if (!result.isValid) {
      setErrors(prev => ({ ...prev, [name]: result.error }));
    } else {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
    
    return result.isValid;
  }, [validationRules, validateField]);

  // Handle field change
  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    const sanitized = sanitizeText(value);
    
    setValues(prev => ({ ...prev, [name]: sanitized }));
    validateField_wrapper(name, sanitized);
  }, [sanitizeText, validateField_wrapper]);

  // Handle field blur
  const handleBlur = useCallback((e) => {
    const { name } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
    validateField_wrapper(name, values[name]);
  }, [values, validateField_wrapper]);

  // Validate entire form
  const validateForm = useCallback(() => {
    const newErrors = {};
    let isValid = true;

    Object.keys(validationRules).forEach((fieldName) => {
      const rules = validationRules[fieldName];
      const value = values[fieldName] || '';
      const result = validateField(value, rules.type || 'text', rules);
      
      if (!result.isValid) {
        newErrors[fieldName] = result.error;
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  }, [values, validationRules, validateField]);

  // Handle form submission
  const handleSubmit = useCallback(async (onSubmit) => {
    setIsSubmitting(true);
    setTouched(
      Object.keys(values).reduce((acc, key) => ({ ...acc, [key]: true }), {})
    );

    if (!validateForm()) {
      setIsSubmitting(false);
      return false;
    }

    try {
      await onSubmit(values);
      setIsSubmitting(false);
      return true;
    } catch (error) {
      console.error('Form submission error:', error);
      setIsSubmitting(false);
      return false;
    }
  }, [values, validateForm]);

  // Reset form
  const resetForm = useCallback(() => {
    setValues(initialState);
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
  }, [initialState]);

  // Check if form is valid
  const isFormValid = useMemo(() => {
    return Object.keys(validationRules).every((fieldName) => {
      const value = values[fieldName] || '';
      const result = validateField(value, validationRules[fieldName].type || 'text', validationRules[fieldName]);
      return result.isValid;
    });
  }, [values, validationRules, validateField]);

  return {
    values,
    errors,
    touched,
    isSubmitting,
    isFormValid,
    handleChange,
    handleBlur,
    handleSubmit,
    resetForm,
    validateForm,
  };
};

export default useSecurity;
