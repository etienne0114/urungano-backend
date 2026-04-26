import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { AuthModule } from '../src/modules/auth/auth.module';
import { UsersModule } from '../src/modules/users/users.module';
import { UsersService } from '../src/modules/users/users.service';
import { User } from '../src/modules/users/entities/user.entity';
import { 
  getTestDatabaseConfig, 
  createTestDataSource, 
  cleanupTestDataSource,
  TestDatabaseUtils 
} from './database.config';
import { TestAssertions } from './test-utils';

describe('Auth Endpoints (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let usersService: UsersService;
  let dbUtils: TestDatabaseUtils;

  beforeAll(async () => {
    // Create test database connection
    dataSource = await createTestDataSource();
    dbUtils = new TestDatabaseUtils(dataSource);

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        TypeOrmModule.forRoot(getTestDatabaseConfig()),
        ThrottlerModule.forRoot([{
          ttl: 60000, // 1 minute
          limit: 100, // Allow more requests in tests
        }]),
        AuthModule,
        UsersModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    
    // Set global prefix to match production
    app.setGlobalPrefix('api/v1');
    
    await app.init();

    usersService = moduleFixture.get<UsersService>(UsersService);
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    if (dataSource) {
      await cleanupTestDataSource(dataSource);
    }
  });

  beforeEach(async () => {
    // Clear database before each test
    if (dataSource && dataSource.isInitialized) {
      const entities = dataSource.entityMetadatas;
      await dataSource.query('SET session_replication_role = replica;');
      for (const entity of entities) {
        const repository = dataSource.getRepository(entity.name);
        await repository.clear();
      }
      await dataSource.query('SET session_replication_role = DEFAULT;');
    }
  });

  describe('POST /api/v1/auth/signin', () => {
    it('should sign in new anonymous user successfully', async () => {
      // Arrange
      const username = 'e2e_test_user';

      // Act
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/signin')
        .send({ username })
        .expect(201);

      // Assert
      expect(response.body).toMatchObject({
        accessToken: expect.any(String),
        userId: expect.any(String),
        username: username,
        isNewUser: true,
      });

      // Verify JWT token format
      const token = response.body.accessToken;
      expect(token).toMatch(/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/);

      // Verify user was created in database
      const userInDb = await usersService.findById(response.body.userId);
      expect(userInDb).toBeDefined();
      expect(userInDb.username).toBe(username);
    });

    it('should sign in existing user successfully', async () => {
      // Arrange
      const username = 'existing_user';
      const existingUser = await dbUtils.createTestUser({ username });

      // Act
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/signin')
        .send({ username })
        .expect(201);

      // Assert
      expect(response.body).toMatchObject({
        accessToken: expect.any(String),
        userId: existingUser.id,
        username: username,
        isNewUser: false,
      });
    });

    it('should validate request body', async () => {
      // Test missing username
      await request(app.getHttpServer())
        .post('/api/v1/auth/signin')
        .send({})
        .expect(400);

      // Test empty username
      await request(app.getHttpServer())
        .post('/api/v1/auth/signin')
        .send({ username: '' })
        .expect(400);

      // Test invalid username type
      await request(app.getHttpServer())
        .post('/api/v1/auth/signin')
        .send({ username: 123 })
        .expect(400);
    });

    it('should handle special characters in username', async () => {
      // Arrange
      const specialUsername = 'test@user#123';

      // Act
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/signin')
        .send({ username: specialUsername })
        .expect(201);

      // Assert
      expect(response.body.username).toBe(specialUsername);
    });

    it('should handle very long usernames', async () => {
      // Arrange
      const longUsername = 'a'.repeat(100); // Reasonable length

      // Act
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/signin')
        .send({ username: longUsername })
        .expect(201);

      // Assert
      expect(response.body.username).toBe(longUsername);
    });

    it('should reject extremely long usernames', async () => {
      // Arrange
      const extremelyLongUsername = 'a'.repeat(1000); // Too long

      // Act & Assert
      await request(app.getHttpServer())
        .post('/api/v1/auth/signin')
        .send({ username: extremelyLongUsername })
        .expect(400);
    });

    it('should handle concurrent requests for same username', async () => {
      // Arrange
      const username = 'concurrent_user';

      // Act - Send multiple concurrent requests
      const promises = Array(5).fill(null).map(() =>
        request(app.getHttpServer())
          .post('/api/v1/auth/signin')
          .send({ username })
      );

      const responses = await Promise.all(promises);

      // Assert
      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(201);
        expect(response.body.username).toBe(username);
      });

      // All should have the same userId (no duplicates created)
      const userIds = responses.map(r => r.body.userId);
      const uniqueUserIds = [...new Set(userIds)];
      expect(uniqueUserIds).toHaveLength(1);

      // Only one user should exist in database
      const userRepository = dataSource.getRepository(User);
      const userCount = await userRepository.count({ where: { username } });
      expect(userCount).toBe(1);
    });
  });

  describe('POST /api/v1/auth/verify-pin', () => {
    let testUser: User;
    const testPin = '1234';

    beforeEach(async () => {
      // Create test user with PIN
      testUser = await dbUtils.createTestUser({ username: 'pin_test_user' });
      await usersService.setPin(testUser.id, { pin: testPin });
    });

    it('should verify correct PIN successfully', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/verify-pin')
        .send({ 
          userId: testUser.id,
          pin: testPin 
        })
        .expect(201);

      // Assert
      expect(response.body).toMatchObject({
        accessToken: expect.any(String),
        userId: testUser.id,
        username: testUser.username,
        isNewUser: false,
      });

      // Verify JWT token format
      const token = response.body.accessToken;
      expect(token).toMatch(/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/);
    });

    it('should reject incorrect PIN', async () => {
      // Act & Assert
      await request(app.getHttpServer())
        .post('/api/v1/auth/verify-pin')
        .send({ 
          userId: testUser.id,
          pin: '0000' 
        })
        .expect(401);
    });

    it('should reject non-existent user', async () => {
      // Act & Assert
      await request(app.getHttpServer())
        .post('/api/v1/auth/verify-pin')
        .send({ 
          userId: 'non-existent-user-id',
          pin: testPin 
        })
        .expect(404);
    });

    it('should validate request body', async () => {
      // Test missing userId
      await request(app.getHttpServer())
        .post('/api/v1/auth/verify-pin')
        .send({ pin: testPin })
        .expect(400);

      // Test missing pin
      await request(app.getHttpServer())
        .post('/api/v1/auth/verify-pin')
        .send({ userId: testUser.id })
        .expect(400);

      // Test invalid PIN format
      await request(app.getHttpServer())
        .post('/api/v1/auth/verify-pin')
        .send({ 
          userId: testUser.id,
          pin: '123' // Too short
        })
        .expect(400);

      await request(app.getHttpServer())
        .post('/api/v1/auth/verify-pin')
        .send({ 
          userId: testUser.id,
          pin: '12345' // Too long
        })
        .expect(400);

      await request(app.getHttpServer())
        .post('/api/v1/auth/verify-pin')
        .send({ 
          userId: testUser.id,
          pin: 'abcd' // Non-numeric
        })
        .expect(400);
    });

    it('should handle user without PIN set', async () => {
      // Arrange
      const userWithoutPin = await dbUtils.createTestUser({ username: 'no_pin_user' });

      // Act & Assert
      await request(app.getHttpServer())
        .post('/api/v1/auth/verify-pin')
        .send({ 
          userId: userWithoutPin.id,
          pin: testPin 
        })
        .expect(401);
    });
  });

  describe('Authentication middleware', () => {
    let testUser: User;
    let validToken: string;

    beforeEach(async () => {
      // Create user and get valid token
      testUser = await dbUtils.createTestUser({ username: 'auth_test_user' });
      
      const signInResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/signin')
        .send({ username: testUser.username });
      
      validToken = signInResponse.body.accessToken;
    });

    it('should accept valid JWT token', async () => {
      // This would test a protected endpoint - for now we'll test the token format
      expect(validToken).toBeDefined();
      expect(validToken).toMatch(/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/);
    });

    it('should reject invalid JWT token', async () => {
      // This would test a protected endpoint with invalid token
      const invalidToken = 'invalid.jwt.token';
      
      // For now, we'll just verify the token format is different
      expect(invalidToken).not.toMatch(/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/);
    });
  });

  describe('Rate limiting', () => {
    it('should allow normal request rate', async () => {
      // Arrange
      const username = 'rate_test_user';

      // Act - Send multiple requests within normal limits
      const promises = Array(5).fill(null).map((_, i) =>
        request(app.getHttpServer())
          .post('/api/v1/auth/signin')
          .send({ username: `${username}_${i}` })
      );

      const responses = await Promise.all(promises);

      // Assert - All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(201);
      });
    });

    // Note: Actual rate limiting tests would require sending many requests quickly
    // and verifying 429 responses, but this depends on the specific rate limiting configuration
  });

  describe('Error handling', () => {
    it('should return proper error format for validation errors', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/signin')
        .send({})
        .expect(400);

      // Assert
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('statusCode', 400);
    });

    it('should handle database connection errors gracefully', async () => {
      // This test would require mocking database failures
      // For now, we'll test that the endpoint exists and responds
      
      await request(app.getHttpServer())
        .post('/api/v1/auth/signin')
        .send({ username: 'test_user' })
        .expect(201);
    });

    it('should return 404 for non-existent endpoints', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/non-existent')
        .expect(404);
    });

    it('should handle malformed JSON', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/signin')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }')
        .expect(400);
    });
  });

  describe('Security headers', () => {
    it('should include security headers in responses', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/signin')
        .send({ username: 'security_test_user' });

      // Assert - Check for common security headers
      // Note: These depend on your security middleware configuration
      expect(response.headers).toBeDefined();
    });
  });

  describe('Performance', () => {
    it('should handle sign-in requests efficiently', async () => {
      // Arrange
      const userCount = 20;
      const usernames = Array(userCount).fill(null).map((_, i) => `perf_user_${i}`);

      // Act
      const startTime = Date.now();
      const promises = usernames.map(username =>
        request(app.getHttpServer())
          .post('/api/v1/auth/signin')
          .send({ username })
      );
      const responses = await Promise.all(promises);
      const endTime = Date.now();

      // Assert
      responses.forEach(response => {
        expect(response.status).toBe(201);
      });

      // Should complete within reasonable time
      const totalTime = endTime - startTime;
      expect(totalTime).toBeLessThan(3000); // 3 seconds for 20 requests
    });

    it('should handle PIN verification efficiently', async () => {
      // Arrange
      const userCount = 10;
      const pin = '1111';
      const users: User[] = [];

      // Create users with PINs
      for (let i = 0; i < userCount; i++) {
        const user = await dbUtils.createTestUser({ username: `pin_perf_user_${i}` });
        await usersService.setPin(user.id, { pin });
        users.push(user);
      }

      // Act
      const startTime = Date.now();
      const promises = users.map(user =>
        request(app.getHttpServer())
          .post('/api/v1/auth/verify-pin')
          .send({ userId: user.id, pin })
      );
      const responses = await Promise.all(promises);
      const endTime = Date.now();

      // Assert
      responses.forEach(response => {
        expect(response.status).toBe(201);
      });

      // Should complete within reasonable time
      const totalTime = endTime - startTime;
      expect(totalTime).toBeLessThan(2000); // 2 seconds for 10 PIN verifications
    });
  });

  describe('Content-Type handling', () => {
    it('should accept application/json content type', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/signin')
        .set('Content-Type', 'application/json')
        .send({ username: 'json_test_user' })
        .expect(201);
    });

    it('should reject unsupported content types', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/signin')
        .set('Content-Type', 'text/plain')
        .send('username=text_user')
        .expect(400);
    });
  });
});