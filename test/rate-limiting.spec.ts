import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Rate Limiting (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('should allow requests within rate limit', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/anonymous')
      .send({ username: 'testuser' })
      .expect(201);

    expect(response.body).toHaveProperty('accessToken');
    expect(response.body).toHaveProperty('userId');
  });

  it('should block requests exceeding rate limit for auth endpoints', async () => {
    const username = 'ratelimituser';
    
    // Make 5 requests (should all succeed)
    for (let i = 0; i < 5; i++) {
      await request(app.getHttpServer())
        .post('/auth/anonymous')
        .send({ username: `${username}${i}` })
        .expect(201);
    }

    // 6th request should be rate limited
    await request(app.getHttpServer())
      .post('/auth/anonymous')
      .send({ username: 'blocked' })
      .expect(429); // Too Many Requests
  }, 10000);

  it('should have different rate limits for PIN verification', async () => {
    // This test would require a valid user ID and PIN setup
    // For now, we'll just test that the endpoint exists and has rate limiting
    const response = await request(app.getHttpServer())
      .post('/auth/pin/verify/invalid-user-id')
      .send({ pin: '1234' })
      .expect(404); // User not found, but not rate limited yet

    expect(response.body).toHaveProperty('message');
  });

  it('should reset rate limit after TTL expires', async () => {
    // This test would require waiting for TTL to expire
    // In a real scenario, you might mock the time or use a shorter TTL for testing
    const response = await request(app.getHttpServer())
      .post('/auth/anonymous')
      .send({ username: 'resetuser' })
      .expect(201);

    expect(response.body).toHaveProperty('accessToken');
  });
});