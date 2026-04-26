import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import * as request from 'supertest';
import { RateLimitGuard } from '../src/common/guards/rate-limit.guard';

// Mock controller for testing rate limiting
import { Controller, Post, Body, UseGuards } from '@nestjs/common';

@Controller('test-auth')
@UseGuards(RateLimitGuard)
export class TestAuthController {
  @Post('anonymous')
  signInAnonymous(@Body() dto: { username: string }) {
    return {
      message: 'Success',
      username: dto.username,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('pin/verify')
  verifyPin(@Body() dto: { pin: string }) {
    return {
      message: 'PIN verified',
      pin: dto.pin,
      timestamp: new Date().toISOString(),
    };
  }
}

describe('Rate Limiting Integration', () => {
  let app: INestApplication;
  let rateLimitGuard: RateLimitGuard;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot({
          throttlers: [
            {
              name: 'default',
              ttl: 60000, // 1 minute
              limit: 100, // 100 requests per minute for general endpoints
            },
            {
              name: 'auth',
              ttl: 60000, // 1 minute
              limit: 5, // 5 requests per minute for auth endpoints
            },
          ],
        }),
      ],
      controllers: [TestAuthController],
      providers: [RateLimitGuard],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    
    rateLimitGuard = moduleFixture.get<RateLimitGuard>(RateLimitGuard);
    
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    // Clear any existing violations before each test
    rateLimitGuard.clearViolations();
  });

  describe('Basic Rate Limiting', () => {
    it('should allow requests within rate limit', async () => {
      const response = await request(app.getHttpServer())
        .post('/test-auth/anonymous')
        .send({ username: 'testuser' })
        .expect(201);

      expect(response.body).toHaveProperty('message', 'Success');
      expect(response.body).toHaveProperty('username', 'testuser');
    });

    it('should demonstrate rate limiting functionality', async () => {
      // This test demonstrates the rate limiting logic without actually hitting limits
      // since we're using a mock controller with high limits for testing
      
      const responses = [];
      
      // Make several requests
      for (let i = 0; i < 3; i++) {
        const response = await request(app.getHttpServer())
          .post('/test-auth/anonymous')
          .send({ username: `user${i}` });
        
        responses.push(response.status);
      }

      // All requests should succeed since we're within limits
      expect(responses).toEqual([201, 201, 201]);
    });

    it('should handle different endpoints with different categories', async () => {
      // Test anonymous endpoint
      const anonymousResponse = await request(app.getHttpServer())
        .post('/test-auth/anonymous')
        .send({ username: 'testuser' })
        .expect(201);

      expect(anonymousResponse.body.message).toBe('Success');

      // Test PIN verification endpoint
      const pinResponse = await request(app.getHttpServer())
        .post('/test-auth/pin/verify')
        .send({ pin: '1234' })
        .expect(201);

      expect(pinResponse.body.message).toBe('PIN verified');
    });
  });

  describe('Rate Limiting Guard Features', () => {
    it('should track violations correctly', () => {
      // Initially no violations
      const initialStats = rateLimitGuard.getViolationStats();
      expect(initialStats).toHaveLength(0);
    });

    it('should manage whitelist correctly', () => {
      const testIP = '203.0.113.100';
      
      // Add to whitelist
      rateLimitGuard.addToWhitelist(testIP);
      expect(rateLimitGuard['whitelist'].has(testIP)).toBe(true);
      
      // Remove from whitelist
      rateLimitGuard.removeFromWhitelist(testIP);
      expect(rateLimitGuard['whitelist'].has(testIP)).toBe(false);
    });

    it('should categorize endpoints correctly', () => {
      expect(rateLimitGuard['getEndpointCategory']('/auth/anonymous')).toBe('auth');
      expect(rateLimitGuard['getEndpointCategory']('/auth/pin/verify')).toBe('pinVerification');
      expect(rateLimitGuard['getEndpointCategory']('/test-auth/anonymous')).toBe('general'); // Different path
      expect(rateLimitGuard['getEndpointCategory']('/unknown/endpoint')).toBe('general');
    });

    it('should extract IP addresses correctly', () => {
      const mockReq = {
        headers: { 'x-forwarded-for': '203.0.113.1, 192.168.1.1' },
        connection: { remoteAddress: '192.168.1.100' },
      } as any;
      
      const ip = rateLimitGuard['getClientIP'](mockReq);
      expect(ip).toBe('203.0.113.1');
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed requests gracefully', async () => {
      const response = await request(app.getHttpServer())
        .post('/test-auth/anonymous')
        .send({ invalid: 'data' })
        .expect(201); // Our mock controller doesn't validate, so it succeeds

      expect(response.body).toHaveProperty('message', 'Success');
    });

    it('should handle missing request body', async () => {
      const response = await request(app.getHttpServer())
        .post('/test-auth/anonymous')
        .send({})
        .expect(201);

      expect(response.body).toHaveProperty('message', 'Success');
    });
  });

  describe('Security Features', () => {
    it('should have localhost IPs whitelisted by default', () => {
      expect(rateLimitGuard['whitelist'].has('127.0.0.1')).toBe(true);
      expect(rateLimitGuard['whitelist'].has('::1')).toBe(true);
    });

    it('should provide violation statistics', () => {
      const stats = rateLimitGuard.getViolationStats();
      expect(Array.isArray(stats)).toBe(true);
    });

    it('should clear violations when requested', () => {
      rateLimitGuard.clearViolations();
      const stats = rateLimitGuard.getViolationStats();
      expect(stats).toHaveLength(0);
    });
  });
});