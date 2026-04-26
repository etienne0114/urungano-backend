import { ValidationPipeOptions } from '@nestjs/common';

export const validationConfig: ValidationPipeOptions = {
  // Transform incoming data to match DTO types
  transform: true,
  transformOptions: {
    enableImplicitConversion: true,
    excludeExtraneousValues: true,
  },

  // Validation behavior
  whitelist: true, // Strip properties that don't have decorators
  forbidNonWhitelisted: true, // Throw error if non-whitelisted properties are present
  skipMissingProperties: false, // Don't skip validation for missing properties
  skipNullProperties: false, // Don't skip validation for null properties
  skipUndefinedProperties: false, // Don't skip validation for undefined properties

  // Error handling
  disableErrorMessages: false, // Show detailed error messages
  validationError: {
    target: false, // Don't include the target object in error messages
    value: false, // Don't include the value in error messages (security)
  },

  // Stop at first error for better performance
  stopAtFirstError: false, // Show all validation errors, not just the first one

  // Groups and contexts
  groups: [], // No specific validation groups by default
  always: false, // Don't always validate (respect conditional validation)

  // Custom error factory for consistent error responses
  exceptionFactory: (errors) => {
    const messages = errors.map(error => {
      const constraints = error.constraints || {};
      const property = error.property;
      const value = error.value;
      
      // Create user-friendly error messages
      const errorMessages = Object.values(constraints).map(message => {
        // Sanitize error messages to avoid exposing sensitive information
        return message.replace(/\b\d{4}\b/g, '****'); // Hide PIN values in error messages
      });

      return {
        property,
        errors: errorMessages,
        // Don't include the actual value for security reasons
      };
    });

    return {
      statusCode: 400,
      message: 'Validation failed',
      errors: messages,
    };
  },
};

// Security-focused validation options for sensitive endpoints
export const secureValidationConfig: ValidationPipeOptions = {
  ...validationConfig,
  
  // More strict settings for sensitive data
  stopAtFirstError: true, // Stop at first error to avoid information leakage
  disableErrorMessages: false, // Keep error messages but sanitize them
  
  validationError: {
    target: false,
    value: false, // Never include values in error messages for security
  },

  exceptionFactory: (errors) => {
    // For sensitive endpoints, provide minimal error information
    return {
      statusCode: 400,
      message: 'Invalid input provided',
      // Don't provide detailed error information for security
    };
  },
};

// Rate limiting configuration for different endpoint types
export const rateLimitConfig = {
  // Authentication endpoints - very strict
  auth: {
    ttl: 60000, // 1 minute
    limit: 5, // 5 attempts per minute
  },
  
  // User management endpoints - moderate
  user: {
    ttl: 60000, // 1 minute
    limit: 20, // 20 requests per minute
  },
  
  // Content endpoints - more lenient
  content: {
    ttl: 60000, // 1 minute
    limit: 100, // 100 requests per minute
  },
  
  // Community endpoints - moderate (to prevent spam)
  community: {
    ttl: 60000, // 1 minute
    limit: 30, // 30 requests per minute
  },
  
  // Default for all other endpoints
  default: {
    ttl: 60000, // 1 minute
    limit: 60, // 60 requests per minute
  },
};