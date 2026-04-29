import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { QueryFailedError } from 'typeorm';

/**
 * Standardized error response format
 */
export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
    timestamp: string;
    path: string;
    method: string;
    requestId?: string;
    stack?: string;
  };
}

/**
 * Error categories for consistent handling
 */
export enum ErrorCategory {
  VALIDATION = 'VALIDATION_ERROR',
  AUTHENTICATION = 'AUTHENTICATION_ERROR',
  AUTHORIZATION = 'AUTHORIZATION_ERROR',
  NOT_FOUND = 'NOT_FOUND_ERROR',
  CONFLICT = 'CONFLICT_ERROR',
  RATE_LIMIT = 'RATE_LIMIT_ERROR',
  DATABASE = 'DATABASE_ERROR',
  EXTERNAL_SERVICE = 'EXTERNAL_SERVICE_ERROR',
  INTERNAL = 'INTERNAL_SERVER_ERROR',
  BAD_REQUEST = 'BAD_REQUEST_ERROR',
}

/**
 * User-friendly error messages with internationalization support
 */
const ERROR_MESSAGES = {
  [ErrorCategory.VALIDATION]: {
    en: 'The provided data is invalid. Please check your input and try again.',
    fr: 'Les données fournies sont invalides. Veuillez vérifier votre saisie et réessayer.',
    rw: 'Amakuru watanze ntabwo ari yo. Nyamuneka reba icyo wanditse ugerageze ukundi.',
  },
  [ErrorCategory.AUTHENTICATION]: {
    en: 'Authentication failed. Please check your credentials.',
    fr: 'Échec de l\'authentification. Veuillez vérifier vos identifiants.',
    rw: 'Kwinjira ntibyakunze. Nyamuneka reba amazina yawe.',
  },
  [ErrorCategory.AUTHORIZATION]: {
    en: 'You do not have permission to access this resource.',
    fr: 'Vous n\'avez pas la permission d\'accéder à cette ressource.',
    rw: 'Ntufite uburenganzira bwo kubona ibi.',
  },
  [ErrorCategory.NOT_FOUND]: {
    en: 'The requested resource was not found.',
    fr: 'La ressource demandée n\'a pas été trouvée.',
    rw: 'Icyo usaba ntigibonetse.',
  },
  [ErrorCategory.CONFLICT]: {
    en: 'The request conflicts with the current state of the resource.',
    fr: 'La demande entre en conflit avec l\'état actuel de la ressource.',
    rw: 'Icyo usaba kirangirana n\'uko ibintu bimeze ubu.',
  },
  [ErrorCategory.RATE_LIMIT]: {
    en: 'Too many requests. Please wait before trying again.',
    fr: 'Trop de demandes. Veuillez attendre avant de réessayer.',
    rw: 'Wasabye kenshi cyane. Nyamuneka tegereza mbere yo kugerageza ukundi.',
  },
  [ErrorCategory.DATABASE]: {
    en: 'A database error occurred. Please try again later.',
    fr: 'Une erreur de base de données s\'est produite. Veuillez réessayer plus tard.',
    rw: 'Habaye ikosa mu bubiko bw\'amakuru. Nyamuneka gerageza nyuma.',
  },
  [ErrorCategory.EXTERNAL_SERVICE]: {
    en: 'An external service is temporarily unavailable. Please try again later.',
    fr: 'Un service externe est temporairement indisponible. Veuillez réessayer plus tard.',
    rw: 'Serivisi yo hanze ntiboneka ubu. Nyamuneka gerageza nyuma.',
  },
  [ErrorCategory.INTERNAL]: {
    en: 'An internal server error occurred. Please try again later.',
    fr: 'Une erreur interne du serveur s\'est produite. Veuillez réessayer plus tard.',
    rw: 'Habaye ikosa ry\'imbere mu seriveri. Nyamuneka gerageza nyuma.',
  },
  [ErrorCategory.BAD_REQUEST]: {
    en: 'The request is invalid. Please check your input.',
    fr: 'La demande est invalide. Veuillez vérifier votre saisie.',
    rw: 'Icyo usaba ntabwo ari cyo. Nyamuneka reba icyo wanditse.',
  },
};

/**
 * Global exception filter for standardized error handling
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const errorResponse = this.buildErrorResponse(exception, request);
    
    // Log error with appropriate level
    this.logError(exception, request, errorResponse);

    // Send standardized error response
    response.status(errorResponse.error.code === 'INTERNAL_SERVER_ERROR' ? 500 : this.getHttpStatus(exception))
      .json(errorResponse);
  }

  /**
   * Build standardized error response
   */
  private buildErrorResponse(exception: unknown, request: Request): ErrorResponse {
    const timestamp = new Date().toISOString();
    const path = request.url;
    const method = request.method;
    const requestId = request.headers['x-request-id'] as string;
    const acceptLanguage = request.headers['accept-language'] as string;
    const language = this.extractLanguage(acceptLanguage);

    let errorCategory: ErrorCategory;
    let message: string;
    let details: any;
    let stack: string | undefined;

    if (exception instanceof HttpException) {
      errorCategory = this.categorizeHttpException(exception);
      message = this.getUserFriendlyMessage(errorCategory, language);
      
      const exceptionResponse = exception.getResponse();
      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        details = exceptionResponse;
      }
      
      // Include stack trace in development
      if (process.env.NODE_ENV === 'development') {
        stack = exception.stack;
      }
    } else if (exception instanceof QueryFailedError) {
      errorCategory = ErrorCategory.DATABASE;
      message = this.getUserFriendlyMessage(errorCategory, language);
      
      // Sanitize database error details
      details = {
        constraint: (exception as any).constraint,
        table: (exception as any).table,
      };
      
      if (process.env.NODE_ENV === 'development') {
        stack = exception.stack;
      }
    } else if (exception instanceof Error) {
      errorCategory = ErrorCategory.INTERNAL;
      message = this.getUserFriendlyMessage(errorCategory, language);
      
      if (process.env.NODE_ENV === 'development') {
        details = { originalMessage: exception.message };
        stack = exception.stack;
      }
    } else {
      errorCategory = ErrorCategory.INTERNAL;
      message = this.getUserFriendlyMessage(errorCategory, language);
      
      if (process.env.NODE_ENV === 'development') {
        details = { exception: String(exception) };
      }
    }

    return {
      success: false,
      error: {
        code: errorCategory,
        message,
        details,
        timestamp,
        path,
        method,
        requestId,
        stack,
      },
    };
  }

  /**
   * Categorize HTTP exceptions
   */
  private categorizeHttpException(exception: HttpException): ErrorCategory {
    const status = exception.getStatus();
    
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return ErrorCategory.BAD_REQUEST;
      case HttpStatus.UNAUTHORIZED:
        return ErrorCategory.AUTHENTICATION;
      case HttpStatus.FORBIDDEN:
        return ErrorCategory.AUTHORIZATION;
      case HttpStatus.NOT_FOUND:
        return ErrorCategory.NOT_FOUND;
      case HttpStatus.CONFLICT:
        return ErrorCategory.CONFLICT;
      case HttpStatus.UNPROCESSABLE_ENTITY:
        return ErrorCategory.VALIDATION;
      case HttpStatus.TOO_MANY_REQUESTS:
        return ErrorCategory.RATE_LIMIT;
      case HttpStatus.INTERNAL_SERVER_ERROR:
        return ErrorCategory.INTERNAL;
      case HttpStatus.BAD_GATEWAY:
      case HttpStatus.SERVICE_UNAVAILABLE:
      case HttpStatus.GATEWAY_TIMEOUT:
        return ErrorCategory.EXTERNAL_SERVICE;
      default:
        return ErrorCategory.INTERNAL;
    }
  }

  /**
   * Get HTTP status code from exception
   */
  private getHttpStatus(exception: unknown): number {
    if (exception instanceof HttpException) {
      return exception.getStatus();
    }
    
    if (exception instanceof QueryFailedError) {
      // Check for specific database constraint violations
      const error = exception as any;
      if (error.code === '23505') { // Unique constraint violation
        return HttpStatus.CONFLICT;
      }
      if (error.code === '23503') { // Foreign key constraint violation
        return HttpStatus.BAD_REQUEST;
      }
      if (error.code === '23502') { // Not null constraint violation
        return HttpStatus.BAD_REQUEST;
      }
      return HttpStatus.INTERNAL_SERVER_ERROR;
    }
    
    return HttpStatus.INTERNAL_SERVER_ERROR;
  }

  /**
   * Extract language from Accept-Language header
   */
  private extractLanguage(acceptLanguage?: string): 'en' | 'fr' | 'rw' {
    if (!acceptLanguage) return 'en';
    
    const languages = acceptLanguage.toLowerCase().split(',');
    
    for (const lang of languages) {
      const code = lang.split(';')[0].trim();
      if (code.startsWith('rw')) return 'rw';
      if (code.startsWith('fr')) return 'fr';
      if (code.startsWith('en')) return 'en';
    }
    
    return 'en';
  }

  /**
   * Get user-friendly message in appropriate language
   */
  private getUserFriendlyMessage(category: ErrorCategory, language: 'en' | 'fr' | 'rw'): string {
    return ERROR_MESSAGES[category]?.[language] || ERROR_MESSAGES[category]?.en || 'An error occurred.';
  }

  /**
   * Log error with appropriate level and context
   */
  private logError(exception: unknown, request: Request, errorResponse: ErrorResponse): void {
    const { error } = errorResponse;
    const userId = (request as any).user?.id || 'anonymous';
    const userAgent = request.headers['user-agent'];
    const ip = request.ip || request.connection.remoteAddress;
    
    const logContext = {
      requestId: error.requestId,
      userId,
      ip,
      userAgent,
      path: error.path,
      method: error.method,
      errorCode: error.code,
    };

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      
      if (status >= 500) {
        this.logger.error(
          `${error.code}: ${exception.message}`,
          exception.stack,
          JSON.stringify(logContext),
        );
      } else if (status >= 400) {
        this.logger.warn(
          `${error.code}: ${exception.message}`,
          JSON.stringify(logContext),
        );
      }
    } else if (exception instanceof QueryFailedError) {
      this.logger.error(
        `Database Error: ${exception.message}`,
        exception.stack,
        JSON.stringify(logContext),
      );
    } else {
      this.logger.error(
        `Unhandled Exception: ${String(exception)}`,
        exception instanceof Error ? exception.stack : undefined,
        JSON.stringify(logContext),
      );
    }
  }
}

/**
 * Custom exception classes for specific error scenarios
 */
export class ValidationException extends HttpException {
  constructor(message: string, details?: any) {
    super(
      {
        message,
        details,
        category: ErrorCategory.VALIDATION,
      },
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }
}

export class BusinessLogicException extends HttpException {
  constructor(message: string, details?: any) {
    super(
      {
        message,
        details,
        category: ErrorCategory.BAD_REQUEST,
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}

export class ExternalServiceException extends HttpException {
  constructor(service: string, message: string, details?: any) {
    super(
      {
        message: `External service error: ${service}`,
        details: { service, originalMessage: message, ...details },
        category: ErrorCategory.EXTERNAL_SERVICE,
      },
      HttpStatus.BAD_GATEWAY,
    );
  }
}

export class RateLimitException extends HttpException {
  constructor(limit: number, windowMs: number, details?: any) {
    super(
      {
        message: 'Rate limit exceeded',
        details: { limit, windowMs, ...details },
        category: ErrorCategory.RATE_LIMIT,
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}

/**
 * Error tracking and analytics integration
 */
export class ErrorTracker {
  private static instance: ErrorTracker;
  private readonly logger = new Logger(ErrorTracker.name);

  static getInstance(): ErrorTracker {
    if (!ErrorTracker.instance) {
      ErrorTracker.instance = new ErrorTracker();
    }
    return ErrorTracker.instance;
  }

  /**
   * Track error for analytics and monitoring
   */
  trackError(error: ErrorResponse, context?: any): void {
    // In a real application, this would integrate with services like:
    // - Sentry for error tracking
    // - DataDog for monitoring
    // - Custom analytics service
    
    const errorData = {
      ...error.error,
      context,
      environment: process.env.NODE_ENV,
      timestamp: new Date(),
    };

    // Log for now, replace with actual tracking service
    this.logger.log(`Error tracked: ${JSON.stringify(errorData)}`);
    
    // Example integration points:
    // await this.sentryService.captureException(errorData);
    // await this.analyticsService.trackError(errorData);
    // await this.monitoringService.incrementErrorCounter(error.error.code);
  }

  /**
   * Get error statistics for monitoring dashboard
   */
  async getErrorStatistics(timeRange: { start: Date; end: Date }): Promise<any> {
    // This would typically query a monitoring database or service
    return {
      totalErrors: 0,
      errorsByCategory: {},
      errorsByEndpoint: {},
      errorTrends: [],
    };
  }
}