import {
  Injectable,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ThrottlerGuard, ThrottlerException } from '@nestjs/throttler';
import { Request } from 'express';

@Injectable()
export class RateLimitGuard extends ThrottlerGuard {
  private readonly logger = new Logger(RateLimitGuard.name);

  // Whitelist of trusted IP addresses or ranges
  private readonly whitelist = new Set<string>([
    // Add trusted IPs as needed
    // Example: '192.168.1.0/24' for local network
  ]);

  // Track progressive penalties for repeated violations
  private readonly violationTracker = new Map<string, {
    count: number;
    lastViolation: Date;
    penaltyMultiplier: number;
  }>();

  // Different rate limit categories with their configurations
  private readonly endpointCategories = {
    auth: {
      patterns: ['/auth/anonymous', '/auth/pin/verify'],
      baseLimit: 5,
      ttl: 60000, // 1 minute
      description: 'Authentication endpoints'
    },
    pinVerification: {
      patterns: ['/auth/pin/verify'],
      baseLimit: 3,
      ttl: 60000, // 1 minute - more restrictive for PIN attempts
      description: 'PIN verification endpoints'
    },
    general: {
      patterns: ['*'],
      baseLimit: 100,
      ttl: 60000, // 1 minute
      description: 'General API endpoints'
    },
    quiz: {
      patterns: ['/quiz'],
      baseLimit: 50,
      ttl: 60000, // 1 minute
      description: 'Quiz endpoints'
    },
    lessons: {
      patterns: ['/lessons'],
      baseLimit: 200,
      ttl: 60000, // 1 minute - higher limit for content access
      description: 'Lesson content endpoints'
    }
  };

  protected async getTracker(req: Request): Promise<string> {
    // Use IP address as the primary tracker
    const ip = this.getClientIP(req);
    
    // If user is authenticated, also track by user ID
    const user = req.user as any;
    if (user?.id) {
      return `${ip}:${user.id}`;
    }
    
    return ip;
  }

  protected getClientIP(req: Request): string {
    return (
      req.headers['x-forwarded-for'] as string ||
      req.headers['x-real-ip'] as string ||
      req.connection?.remoteAddress ||
      req.socket?.remoteAddress ||
      '0.0.0.0'
    ).split(',')[0].trim();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const ip = this.getClientIP(request);
    const route = request.route?.path || request.url;
    const method = request.method;

    // Skip rate limiting for whitelisted IPs
    if (this.whitelist.has(ip)) {
      this.logger.debug(`Skipping rate limit for whitelisted IP: ${ip}`);
      return true;
    }

    // Log rate limiting attempt for monitoring
    this.logger.debug(`Rate limiting check for ${method} ${route} from IP: ${ip}`);

    try {
      const result = await super.canActivate(context);
      
      // If successful, reset violation count (optional, but good for UX after penalty)
      const tracker = await this.getTracker(request);
      this.violationTracker.delete(tracker);
      
      return result;
    } catch (error) {
      if (error instanceof ThrottlerException) {
        await this.handleViolation(request);
      }
      throw error;
    }
  }

  private async handleViolation(req: Request): Promise<never> {
    const tracker = await this.getTracker(req);
    const now = new Date();
    const route = req.route?.path || req.url;
    const ip = this.getClientIP(req);
    
    let violation = this.violationTracker.get(tracker);
    
    if (!violation) {
      violation = {
        count: 1,
        lastViolation: now,
        penaltyMultiplier: 1,
      };
    } else {
      // Reset count if last violation was more than 1 hour ago
      const timeDiff = now.getTime() - violation.lastViolation.getTime();
      if (timeDiff > 3600000) { // 1 hour in milliseconds
        violation.count = 1;
        violation.penaltyMultiplier = 1;
      } else {
        violation.count++;
        // Increase penalty multiplier for repeated violations, capped at 10
        violation.penaltyMultiplier = Math.min(violation.count, 10);
      }
      violation.lastViolation = now;
    }
    
    this.violationTracker.set(tracker, violation);
    
    // Calculate progressive penalty delay
    const baseDelay = 60; // 1 minute base delay
    const penaltyDelay = baseDelay * violation.penaltyMultiplier;
    
    // Log security event for monitoring
    this.logger.warn(
      `Rate limit violation #${violation.count} from ${ip} on ${route}. ` +
      `Penalty: ${penaltyDelay}s. Tracker: ${tracker}`
    );
    
    throw new HttpException(
      {
        message: 'Too many requests',
        error: 'Rate limit exceeded',
        retryAfter: penaltyDelay,
        violations: violation.count,
        category: this.getEndpointCategory(route),
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }

  /**
   * Determine the endpoint category for better rate limiting granularity
   */
  private getEndpointCategory(route: string): string {
    // Check most specific patterns first
    if (route.includes('/auth/pin/verify')) {
      return 'pinVerification';
    }
    
    for (const [category, config] of Object.entries(this.endpointCategories)) {
      if (category === 'pinVerification') continue; // Already checked above
      
      for (const pattern of config.patterns) {
        if (pattern === '*') continue; // Skip wildcard for now
        if (route.includes(pattern)) {
          return category;
        }
      }
    }
    return 'general';
  }

  /**
   * Add IP to whitelist (for runtime management)
   */
  public addToWhitelist(ip: string): void {
    this.whitelist.add(ip);
    this.logger.log(`Added IP ${ip} to whitelist`);
  }

  /**
   * Remove IP from whitelist
   */
  public removeFromWhitelist(ip: string): void {
    this.whitelist.delete(ip);
    this.logger.log(`Removed IP ${ip} from whitelist`);
  }

  /**
   * Get current violation statistics for monitoring
   */
  public getViolationStats(): Array<{
    tracker: string;
    count: number;
    lastViolation: Date;
    penaltyMultiplier: number;
  }> {
    return Array.from(this.violationTracker.entries()).map(([tracker, data]) => ({
      tracker,
      ...data,
    }));
  }

  /**
   * Clear violation history for a specific tracker
   */
  public clearViolations(tracker?: string): void {
    if (tracker) {
      this.violationTracker.delete(tracker);
      this.logger.log(`Cleared violations for tracker: ${tracker}`);
    } else {
      this.violationTracker.clear();
      this.logger.log('Cleared all violation history');
    }
  }

  protected generateKey(context: ExecutionContext, suffix: string): string {
    const request = context.switchToHttp().getRequest<Request>();
    const route = request.route?.path || request.url;
    const method = request.method;
    
    // Create different keys for different endpoint categories
    return `${method}:${route}:${suffix}`;
  }
}