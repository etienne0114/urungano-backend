import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ThrottlerModuleOptions, ThrottlerStorage } from '@nestjs/throttler';
import { RateLimitGuard } from '../src/common/guards/rate-limit.guard';

describe('RateLimitGuard - Core Functionality', () => {
  let guard: RateLimitGuard;
  let mockStorage: ThrottlerStorage;
  let mockReflector: Reflector;

  beforeEach(async () => {
    const mockOptions: ThrottlerModuleOptions = {
      throttlers: [
        {
          name: 'default',
          ttl: 60000,
          limit: 100,
        },
      ],
    };
    
    mockStorage = {
      getRecord: jest.fn().mockResolvedValue([]),
      addRecord: jest.fn().mockResolvedValue(undefined),
    } as any;
    
    mockReflector = {
      getAllAndOverride: jest.fn(),
      get: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: RateLimitGuard,
          useFactory: () => new RateLimitGuard(mockOptions, mockStorage, mockReflector),
        },
      ],
    }).compile();

    guard = module.get<RateLimitGuard>(RateLimitGuard);
  });

  describe('IP Address Extraction', () => {
    it('should extract IP from x-forwarded-for header', () => {
      const mockReq = {
        headers: { 'x-forwarded-for': '203.0.113.1, 192.168.1.1' },
        connection: {},
      } as any;
      
      const ip = guard['getClientIP'](mockReq);
      expect(ip).toBe('203.0.113.1');
    });

    it('should extract IP from x-real-ip header', () => {
      const mockReq = {
        headers: { 'x-real-ip': '203.0.113.2' },
        connection: {},
      } as any;
      
      const ip = guard['getClientIP'](mockReq);
      expect(ip).toBe('203.0.113.2');
    });

    it('should fall back to connection.remoteAddress', () => {
      const mockReq = {
        headers: {},
        connection: { remoteAddress: '192.168.1.100' },
      } as any;
      
      const ip = guard['getClientIP'](mockReq);
      expect(ip).toBe('192.168.1.100');
    });

    it('should return default IP when no address is available', () => {
      const mockReq = {
        headers: {},
        connection: {},
      } as any;
      
      const ip = guard['getClientIP'](mockReq);
      expect(ip).toBe('0.0.0.0');
    });
  });

  describe('Whitelist Management', () => {
    it('should add IP to whitelist', () => {
      const testIP = '203.0.113.100';
      guard.addToWhitelist(testIP);
      expect(guard['whitelist'].has(testIP)).toBe(true);
    });

    it('should remove IP from whitelist', () => {
      const testIP = '203.0.113.101';
      guard.addToWhitelist(testIP);
      expect(guard['whitelist'].has(testIP)).toBe(true);
      
      guard.removeFromWhitelist(testIP);
      expect(guard['whitelist'].has(testIP)).toBe(false);
    });

    it('should have localhost IPs whitelisted by default', () => {
      expect(guard['whitelist'].has('127.0.0.1')).toBe(true);
      expect(guard['whitelist'].has('::1')).toBe(true);
    });
  });

  describe('Tracker Generation', () => {
    it('should use IP address for unauthenticated requests', async () => {
      const mockReq = {
        headers: {},
        connection: { remoteAddress: '192.168.1.100' },
        user: undefined,
      } as any;
      
      const tracker = await guard['getTracker'](mockReq);
      expect(tracker).toBe('192.168.1.100');
    });

    it('should combine IP and user ID for authenticated requests', async () => {
      const mockReq = {
        headers: {},
        connection: { remoteAddress: '192.168.1.100' },
        user: { id: 'user-123' },
      } as any;
      
      const tracker = await guard['getTracker'](mockReq);
      expect(tracker).toBe('192.168.1.100:user-123');
    });
  });

  describe('Endpoint Categorization', () => {
    it('should categorize authentication endpoints', () => {
      const category = guard['getEndpointCategory']('/auth/anonymous');
      expect(category).toBe('auth');
    });

    it('should categorize PIN verification endpoints specifically', () => {
      const category = guard['getEndpointCategory']('/auth/pin/verify');
      expect(category).toBe('pinVerification');
    });

    it('should categorize quiz endpoints', () => {
      const category = guard['getEndpointCategory']('/quiz/start');
      expect(category).toBe('quiz');
    });

    it('should categorize lesson endpoints', () => {
      const category = guard['getEndpointCategory']('/lessons/123');
      expect(category).toBe('lessons');
    });

    it('should default to general category for unknown endpoints', () => {
      const category = guard['getEndpointCategory']('/unknown/endpoint');
      expect(category).toBe('general');
    });
  });

  describe('Violation Tracking', () => {
    it('should track violations correctly', async () => {
      const mockReq = {
        headers: {},
        connection: { remoteAddress: '192.168.1.100' },
        route: { path: '/auth/anonymous' },
        url: '/auth/anonymous',
      } as any;

      // Simulate a violation
      try {
        await guard['handleViolation'](mockReq);
      } catch (error) {
        // Expected to throw
        expect(error).toBeInstanceOf(HttpException);
      }

      const stats = guard.getViolationStats();
      expect(stats).toHaveLength(1);
      expect(stats[0].count).toBe(1);
      expect(stats[0].penaltyMultiplier).toBe(1);
    });

    it('should clear violations', async () => {
      const mockReq = {
        headers: {},
        connection: { remoteAddress: '192.168.1.100' },
        route: { path: '/auth/anonymous' },
        url: '/auth/anonymous',
      } as any;

      // Create a violation
      try {
        await guard['handleViolation'](mockReq);
      } catch (error) {
        // Expected
      }

      // Clear violations
      guard.clearViolations();
      
      const stats = guard.getViolationStats();
      expect(stats).toHaveLength(0);
    });

    it('should increase penalty for repeated violations', async () => {
      const mockReq = {
        headers: {},
        connection: { remoteAddress: '192.168.1.100' },
        route: { path: '/auth/anonymous' },
        url: '/auth/anonymous',
      } as any;

      // First violation
      try {
        await guard['handleViolation'](mockReq);
      } catch (error) {
        // Expected
        expect(error).toBeInstanceOf(HttpException);
      }

      // Second violation should have higher penalty
      try {
        await guard['handleViolation'](mockReq);
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        const response = (error as HttpException).getResponse() as any;
        expect(response.violations).toBe(2);
        expect(response.retryAfter).toBe(120); // 60 * 2
      }
    });
  });

  describe('Key Generation', () => {
    it('should generate unique keys for different endpoints', () => {
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            route: { path: '/auth/anonymous' },
            method: 'POST',
          }),
        }),
      } as ExecutionContext;

      const key = guard['generateKey'](mockContext, 'test-suffix');
      expect(key).toBe('POST:/auth/anonymous:test-suffix');
    });

    it('should handle missing route information', () => {
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            route: undefined,
            url: '/fallback/url',
            method: 'GET',
          }),
        }),
      } as ExecutionContext;

      const key = guard['generateKey'](mockContext, 'test-suffix');
      expect(key).toBe('GET:/fallback/url:test-suffix');
    });
  });

  describe('Error Response Format', () => {
    it('should return proper error response format', async () => {
      const mockReq = {
        headers: {},
        connection: { remoteAddress: '192.168.1.100' },
        route: { path: '/auth/anonymous' },
        url: '/auth/anonymous',
      } as any;

      try {
        await guard['handleViolation'](mockReq);
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        expect((error as HttpException).getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
        
        const response = (error as HttpException).getResponse() as any;
        expect(response).toHaveProperty('message', 'Too many requests');
        expect(response).toHaveProperty('error', 'Rate limit exceeded');
        expect(response).toHaveProperty('retryAfter');
        expect(response).toHaveProperty('violations');
        expect(response).toHaveProperty('category');
      }
    });

    it('should include correct endpoint category in error response', async () => {
      const mockReq = {
        headers: {},
        connection: { remoteAddress: '192.168.1.100' },
        route: { path: '/auth/pin/verify' },
        url: '/auth/pin/verify',
      } as any;

      try {
        await guard['handleViolation'](mockReq);
      } catch (error) {
        const response = (error as HttpException).getResponse() as any;
        expect(response.category).toBe('pinVerification');
      }
    });
  });
});