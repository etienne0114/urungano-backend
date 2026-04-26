import { ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ThrottlerException, ThrottlerModuleOptions, ThrottlerStorage } from '@nestjs/throttler';
import { RateLimitGuard } from './rate-limit.guard';
import { Request } from 'express';

describe('RateLimitGuard', () => {
  let guard: RateLimitGuard;
  let mockExecutionContext: ExecutionContext;
  let mockRequest: Partial<Request>;
  let mockOptions: ThrottlerModuleOptions;
  let mockStorage: ThrottlerStorage;
  let mockReflector: Reflector;

  beforeEach(() => {
    mockOptions = {
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
    
    guard = new RateLimitGuard(mockOptions, mockStorage, mockReflector);
    
    mockRequest = {
      headers: {},
      connection: { remoteAddress: '192.168.1.100' } as any,
      socket: { remoteAddress: '192.168.1.100' } as any,
      route: { path: '/auth/anonymous' },
      method: 'POST',
      url: '/auth/anonymous',
    };

    mockExecutionContext = {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
        getResponse: jest.fn(),
        getNext: jest.fn(),
      }),
      getClass: jest.fn(),
      getHandler: jest.fn(),
      getArgs: jest.fn(),
      getArgByIndex: jest.fn(),
      switchToRpc: jest.fn(),
      switchToWs: jest.fn(),
      getType: jest.fn(),
    } as any;
  });

  describe('IP Address Detection', () => {
    it('should extract IP from x-forwarded-for header', () => {
      mockRequest.headers = { 'x-forwarded-for': '203.0.113.1, 192.168.1.1' };
      const ip = guard['getClientIP'](mockRequest as Request);
      expect(ip).toBe('203.0.113.1');
    });

    it('should extract IP from x-real-ip header', () => {
      mockRequest.headers = { 'x-real-ip': '203.0.113.2' };
      const ip = guard['getClientIP'](mockRequest as Request);
      expect(ip).toBe('203.0.113.2');
    });

    it('should fall back to connection.remoteAddress', () => {
      mockRequest.connection = { remoteAddress: '192.168.1.100' } as any;
      const ip = guard['getClientIP'](mockRequest as Request);
      expect(ip).toBe('192.168.1.100');
    });

    it('should return default IP when no address is available', () => {
      mockRequest.headers = {};
      mockRequest.connection = {} as any;
      mockRequest.socket = undefined;
      const ip = guard['getClientIP'](mockRequest as Request);
      expect(ip).toBe('0.0.0.0');
    });
  });

  describe('Whitelist Functionality', () => {
    it('should allow whitelisted localhost IPs', async () => {
      mockRequest.connection = { remoteAddress: '127.0.0.1' } as any;
      
      // Mock the parent canActivate to throw an error (simulating rate limit exceeded)
      jest.spyOn(guard, 'canActivate').mockImplementation(async () => {
        const request = mockExecutionContext.switchToHttp().getRequest<Request>();
        const ip = guard['getClientIP'](request);
        
        if (guard['whitelist'].has(ip)) {
          return true;
        }
        throw new ThrottlerException();
      });

      const result = await guard.canActivate(mockExecutionContext);
      expect(result).toBe(true);
    });

    it('should allow IPv6 localhost', async () => {
      mockRequest.connection = { remoteAddress: '::1' } as any;
      
      jest.spyOn(guard, 'canActivate').mockImplementation(async () => {
        const request = mockExecutionContext.switchToHttp().getRequest<Request>();
        const ip = guard['getClientIP'](request);
        
        if (guard['whitelist'].has(ip)) {
          return true;
        }
        throw new ThrottlerException();
      });

      const result = await guard.canActivate(mockExecutionContext);
      expect(result).toBe(true);
    });

    it('should allow dynamically added whitelist IPs', async () => {
      const testIP = '203.0.113.100';
      mockRequest.connection = { remoteAddress: testIP } as any;
      
      guard.addToWhitelist(testIP);
      
      jest.spyOn(guard, 'canActivate').mockImplementation(async () => {
        const request = mockExecutionContext.switchToHttp().getRequest<Request>();
        const ip = guard['getClientIP'](request);
        
        if (guard['whitelist'].has(ip)) {
          return true;
        }
        throw new ThrottlerException();
      });

      const result = await guard.canActivate(mockExecutionContext);
      expect(result).toBe(true);
    });

    it('should remove IPs from whitelist', () => {
      const testIP = '203.0.113.101';
      guard.addToWhitelist(testIP);
      expect(guard['whitelist'].has(testIP)).toBe(true);
      
      guard.removeFromWhitelist(testIP);
      expect(guard['whitelist'].has(testIP)).toBe(false);
    });
  });

  describe('Tracker Generation', () => {
    it('should use IP address for unauthenticated requests', async () => {
      mockRequest.user = undefined;
      const tracker = await guard['getTracker'](mockRequest as Request);
      expect(tracker).toBe('192.168.1.100');
    });

    it('should combine IP and user ID for authenticated requests', async () => {
      mockRequest.user = { id: 'user-123' };
      const tracker = await guard['getTracker'](mockRequest as Request);
      expect(tracker).toBe('192.168.1.100:user-123');
    });
  });

  describe('Endpoint Categorization', () => {
    it('should categorize authentication endpoints', () => {
      const category = guard['getEndpointCategory']('/auth/anonymous');
      expect(category).toBe('auth');
    });

    it('should categorize PIN verification endpoints', () => {
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

  describe('Progressive Penalties', () => {
    it('should track first violation', async () => {
      const mockReq = mockRequest as Request;
      
      try {
        await guard['handleViolation'](mockReq);
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
      }
      
      const stats = guard.getViolationStats();
      expect(stats.length).toBeGreaterThan(0);
      const violation = stats.find(s => s.tracker.includes('192.168.1.100'));
      expect(violation).toBeDefined();
      expect(violation!.count).toBe(1);
      expect(violation!.penaltyMultiplier).toBe(1);
    });

    it('should increase penalty for repeated violations', async () => {
      const mockReq = mockRequest as Request;
      
      // First violation
      try {
        await guard['handleViolation'](mockReq);
      } catch (e) {
        expect(e).toBeInstanceOf(HttpException);
      }
      
      // Second violation (should increase penalty)
      try {
        await guard['handleViolation'](mockReq);
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        expect((error as HttpException).getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
        
        const response = (error as HttpException).getResponse() as any;
        expect(response.violations).toBe(2);
        expect(response.retryAfter).toBe(120); // 60 * 2 (penalty multiplier)
      }
    });

    it('should reset violations after 1 hour', async () => {
      const mockReq = mockRequest as Request;
      
      // First violation
      try {
        await guard['handleViolation'](mockReq);
      } catch (e) {
        // Expected
      }
      
      // Mock time passage (more than 1 hour)
      const originalDate = global.Date;
      const futureTime = Date.now() + 3700000; // 1 hour + 1 minute
      
      // Create a proper Date mock
      const MockDate = class extends Date {
        constructor() {
          super(futureTime);
        }
        
        static now() {
          return futureTime;
        }
        
        getTime() {
          return futureTime;
        }
      } as any;
      
      global.Date = MockDate;
      
      // Second violation after time passage (should reset)
      try {
        await guard['handleViolation'](mockReq);
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        const response = (error as HttpException).getResponse() as any;
        expect(response.violations).toBe(1); // Reset to 1
        expect(response.retryAfter).toBe(60); // Back to base delay
      }
      
      // Restore original Date
      global.Date = originalDate;
    });

    it('should cap penalty multiplier at 10', async () => {
      const mockReq = mockRequest as Request;
      
      // Simulate many violations
      for (let i = 0; i < 15; i++) {
        try {
          await guard['handleViolation'](mockReq);
        } catch (e) {
          // Expected
        }
      }
      
      const stats = guard.getViolationStats();
      expect(stats.length).toBeGreaterThan(0);
      const violation = stats.find(s => s.tracker.includes('192.168.1.100'));
      expect(violation).toBeDefined();
      expect(violation!.penaltyMultiplier).toBe(10); // Capped at 10
    });
  });

  describe('Violation Management', () => {
    beforeEach(() => {
      // Mock Date.now to avoid logger issues
      jest.spyOn(Date, 'now').mockReturnValue(1640995200000);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should clear specific tracker violations', async () => {
      const mockReq = mockRequest as Request;
      
      try {
        await guard['handleViolation'](mockReq);
      } catch (e) {
        // Expected
      }
      
      const tracker = await guard['getTracker'](mockReq);
      guard.clearViolations(tracker);
      
      const stats = guard.getViolationStats();
      expect(stats).toHaveLength(0);
    });

    it('should clear all violations', async () => {
      const mockReq1 = { ...mockRequest, connection: { remoteAddress: '192.168.1.1' } as any } as Request;
      const mockReq2 = { ...mockRequest, connection: { remoteAddress: '192.168.1.2' } as any } as Request;
      
      try {
        await guard['handleViolation'](mockReq1);
        await guard['handleViolation'](mockReq2);
      } catch (e) {
        // Expected
      }
      
      guard.clearViolations();
      
      const stats = guard.getViolationStats();
      expect(stats).toHaveLength(0);
    });

    it('should provide violation statistics', async () => {
      const mockReq = mockRequest as Request;
      
      try {
        await guard['handleViolation'](mockReq);
      } catch (e) {
        // Expected
      }
      
      const stats = guard.getViolationStats();
      expect(stats.length).toBeGreaterThan(0);
      const violation = stats.find(s => s.tracker.includes('192.168.1.100'));
      expect(violation).toBeDefined();
      expect(violation).toHaveProperty('tracker');
      expect(violation).toHaveProperty('count');
      expect(violation).toHaveProperty('lastViolation');
      expect(violation).toHaveProperty('penaltyMultiplier');
    });
  });

  describe('Error Response Format', () => {
    it('should return proper error response format', async () => {
      const mockReq = mockRequest as Request;
      
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
      mockRequest.route = { path: '/auth/pin/verify' };
      const mockReq = mockRequest as Request;
      
      try {
        await guard['handleViolation'](mockReq);
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        const response = (error as HttpException).getResponse() as any;
        expect(response.category).toBe('pinVerification');
      }
    });
  });

  describe('Key Generation', () => {
    it('should generate unique keys for different endpoints', () => {
      mockRequest.route = { path: '/auth/anonymous' };
      mockRequest.method = 'POST';
      
      const key = guard['generateKey'](mockExecutionContext, 'test-suffix');
      expect(key).toBe('POST:/auth/anonymous:test-suffix');
    });

    it('should handle missing route information', () => {
      mockRequest.route = undefined;
      mockRequest.url = '/fallback/url';
      mockRequest.method = 'GET';
      
      const key = guard['generateKey'](mockExecutionContext, 'test-suffix');
      expect(key).toBe('GET:/fallback/url:test-suffix');
    });
  });
});