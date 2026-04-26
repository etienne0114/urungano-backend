import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { AuthService } from '../src/modules/auth/auth.service';
import { UsersService } from '../src/modules/users/users.service';
import { UsersModule } from '../src/modules/users/users.module';
import { User } from '../src/modules/users/entities/user.entity';
import { 
  getTestDatabaseConfig, 
  createTestDataSource, 
  cleanupTestDataSource,
  TestDatabaseUtils 
} from './database.config';
import { TestDataFactory, TestAssertions } from './test-utils';

describe('AuthService Integration Tests', () => {
  let module: TestingModule;
  let authService: AuthService;
  let usersService: UsersService;
  let dataSource: DataSource;
  let dbUtils: TestDatabaseUtils;

  beforeAll(async () => {
    // Create test database connection
    dataSource = await createTestDataSource();
    dbUtils = new TestDatabaseUtils(dataSource);

    // Create test module with real database
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        TypeOrmModule.forRoot(getTestDatabaseConfig()),
        TypeOrmModule.forFeature([User]),
        JwtModule.register({
          secret: 'test-secret-key',
          signOptions: { expiresIn: '1h' },
        }),
        UsersModule,
      ],
      providers: [AuthService],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
  });

  afterAll(async () => {
    if (module) {
      await module.close();
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

  describe('signInAnonymous with real database', () => {
    it('should create new user in database when user does not exist', async () => {
      // Arrange
      const username = 'integration_test_user';

      // Act
      const result = await authService.signInAnonymous(username);

      // Assert
      expect(result.isNewUser).toBe(true);
      expect(result.username).toBe(username);
      expect(result.accessToken).toBeDefined();
      TestAssertions.expectValidUuid(result.userId);

      // Verify user was actually created in database
      const userInDb = await usersService.findById(result.userId);
      expect(userInDb).toBeDefined();
      expect(userInDb.username).toBe(username);
      TestAssertions.expectRecentDate(userInDb.joinedDate);
    });

    it('should return existing user when user already exists in database', async () => {
      // Arrange
      const username = 'existing_user';
      const existingUser = await dbUtils.createTestUser({ username });

      // Act
      const result = await authService.signInAnonymous(username);

      // Assert
      expect(result.isNewUser).toBe(false);
      expect(result.username).toBe(username);
      expect(result.userId).toBe(existingUser.id);
      expect(result.accessToken).toBeDefined();

      // Verify no duplicate user was created
      const userRepository = dataSource.getRepository(User);
      const userCount = await userRepository.count({ where: { username } });
      expect(userCount).toBe(1);
    });

    it('should handle concurrent sign-in requests for same username', async () => {
      // Arrange
      const username = 'concurrent_user';

      // Act - Multiple concurrent requests
      const promises = Array(5).fill(null).map(() => 
        authService.signInAnonymous(username)
      );
      const results = await Promise.all(promises);

      // Assert
      // All requests should succeed
      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result.username).toBe(username);
        expect(result.accessToken).toBeDefined();
      });

      // Only one user should be created in database
      const userRepository = dataSource.getRepository(User);
      const userCount = await userRepository.count({ where: { username } });
      expect(userCount).toBe(1);

      // All results should have the same userId (existing user)
      const userIds = results.map(r => r.userId);
      const uniqueUserIds = [...new Set(userIds)];
      expect(uniqueUserIds).toHaveLength(1);
    });

    it('should handle different usernames concurrently', async () => {
      // Arrange
      const usernames = ['user1', 'user2', 'user3', 'user4', 'user5'];

      // Act
      const promises = usernames.map(username => 
        authService.signInAnonymous(username)
      );
      const results = await Promise.all(promises);

      // Assert
      expect(results).toHaveLength(5);
      
      // Each should create a new user
      results.forEach((result, index) => {
        expect(result.username).toBe(usernames[index]);
        expect(result.isNewUser).toBe(true);
        expect(result.accessToken).toBeDefined();
      });

      // Verify all users were created in database
      const userRepository = dataSource.getRepository(User);
      const totalUsers = await userRepository.count();
      expect(totalUsers).toBe(5);
    });

    it('should persist user data correctly', async () => {
      // Arrange
      const username = 'persistence_test_user';

      // Act
      const result = await authService.signInAnonymous(username);

      // Assert - Verify all user fields are set correctly
      const userInDb = await usersService.findById(result.userId);
      expect(userInDb.username).toBe(username);
      expect(userInDb.language).toBe('rw'); // Default language
      expect(userInDb.dayStreak).toBe(0);
      expect(userInDb.isPrivate).toBe(false);
      expect(userInDb.avatarSeed).toBeDefined();
      expect(userInDb.joinedDate).toBeInstanceOf(Date);
      expect(userInDb.updatedAt).toBeInstanceOf(Date);
      expect(userInDb.pinHash).toBeNull();
    });
  });

  describe('verifyPinAndIssueToken with real database', () => {
    let testUser: User;
    const testPin = '1234';

    beforeEach(async () => {
      // Create a test user with PIN
      testUser = await dbUtils.createTestUser({ username: 'pin_test_user' });
      await usersService.setPin(testUser.id, { pin: testPin });
    });

    it('should verify correct PIN and issue token', async () => {
      // Act
      const result = await authService.verifyPinAndIssueToken(testUser.id, testPin);

      // Assert
      expect(result.userId).toBe(testUser.id);
      expect(result.username).toBe(testUser.username);
      expect(result.isNewUser).toBe(false);
      expect(result.accessToken).toBeDefined();
    });

    it('should reject incorrect PIN', async () => {
      // Arrange
      const wrongPin = '0000';

      // Act & Assert
      await TestAssertions.expectToRejectWith(
        authService.verifyPinAndIssueToken(testUser.id, wrongPin),
        Error // UnauthorizedException
      );
    });

    it('should reject PIN for non-existent user', async () => {
      // Arrange
      const nonExistentUserId = 'non-existent-user-id';

      // Act & Assert
      await TestAssertions.expectToRejectWith(
        authService.verifyPinAndIssueToken(nonExistentUserId, testPin),
        Error // NotFoundException
      );
    });

    it('should handle user without PIN set', async () => {
      // Arrange
      const userWithoutPin = await dbUtils.createTestUser({ username: 'no_pin_user' });

      // Act & Assert
      await TestAssertions.expectToRejectWith(
        authService.verifyPinAndIssueToken(userWithoutPin.id, testPin),
        Error // Should fail PIN verification
      );
    });
  });

  describe('validatePayload with real database', () => {
    let testUser: User;

    beforeEach(async () => {
      testUser = await dbUtils.createTestUser({ username: 'validation_test_user' });
    });

    it('should validate payload and return user from database', async () => {
      // Arrange
      const payload = {
        sub: testUser.id,
        username: testUser.username,
      };

      // Act
      const result = await authService.validatePayload(payload);

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBe(testUser.id);
      expect(result.username).toBe(testUser.username);
    });

    it('should reject payload for non-existent user', async () => {
      // Arrange
      const payload = {
        sub: 'non-existent-user-id',
        username: 'non-existent-user',
      };

      // Act & Assert
      await TestAssertions.expectToRejectWith(
        authService.validatePayload(payload),
        Error // NotFoundException
      );
    });
  });

  describe('End-to-end authentication flow', () => {
    it('should complete full anonymous sign-in and PIN setup flow', async () => {
      // Step 1: Anonymous sign-in
      const username = 'e2e_test_user';
      const signInResult = await authService.signInAnonymous(username);
      
      expect(signInResult.isNewUser).toBe(true);
      expect(signInResult.username).toBe(username);

      // Step 2: Set PIN for the user
      const pin = '5678';
      await usersService.setPin(signInResult.userId, { pin });

      // Step 3: Verify PIN and get new token
      const pinResult = await authService.verifyPinAndIssueToken(signInResult.userId, pin);
      
      expect(pinResult.userId).toBe(signInResult.userId);
      expect(pinResult.username).toBe(username);
      expect(pinResult.isNewUser).toBe(false);

      // Step 4: Validate JWT payload
      const payload = {
        sub: pinResult.userId,
        username: pinResult.username,
      };
      const validatedUser = await authService.validatePayload(payload);
      
      expect(validatedUser.id).toBe(signInResult.userId);
      expect(validatedUser.username).toBe(username);
    });

    it('should handle returning user flow', async () => {
      // Step 1: Create existing user
      const username = 'returning_user';
      const existingUser = await dbUtils.createTestUser({ username });
      const pin = '9999';
      await usersService.setPin(existingUser.id, { pin });

      // Step 2: Sign in as existing user
      const signInResult = await authService.signInAnonymous(username);
      
      expect(signInResult.isNewUser).toBe(false);
      expect(signInResult.userId).toBe(existingUser.id);

      // Step 3: Verify PIN
      const pinResult = await authService.verifyPinAndIssueToken(existingUser.id, pin);
      
      expect(pinResult.userId).toBe(existingUser.id);
      expect(pinResult.username).toBe(username);
    });
  });

  describe('Database transaction behavior', () => {
    it('should handle database transaction rollback during user creation', async () => {
      // This test would require mocking the database to simulate transaction failures
      // For now, we'll test that the service handles database errors gracefully
      
      // Arrange - Close the database connection to simulate failure
      await dataSource.destroy();

      // Act & Assert
      await TestAssertions.expectToRejectWith(
        authService.signInAnonymous('test_user'),
        Error
      );

      // Restore connection for cleanup
      dataSource = await createTestDataSource();
    });
  });

  describe('Performance with real database', () => {
    it('should handle multiple users efficiently', async () => {
      // Arrange
      const userCount = 50;
      const usernames = Array(userCount).fill(null).map((_, i) => `perf_user_${i}`);

      // Act
      const startTime = Date.now();
      const promises = usernames.map(username => authService.signInAnonymous(username));
      const results = await Promise.all(promises);
      const endTime = Date.now();

      // Assert
      expect(results).toHaveLength(userCount);
      
      // Should complete within reasonable time (adjust based on your performance requirements)
      const totalTime = endTime - startTime;
      expect(totalTime).toBeLessThan(5000); // 5 seconds for 50 users

      // Verify all users were created
      const userRepository = dataSource.getRepository(User);
      const totalUsers = await userRepository.count();
      expect(totalUsers).toBe(userCount);
    });

    it('should handle PIN verification efficiently', async () => {
      // Arrange
      const userCount = 20;
      const users: User[] = [];
      const pin = '1111';

      // Create users with PINs
      for (let i = 0; i < userCount; i++) {
        const user = await dbUtils.createTestUser({ username: `pin_perf_user_${i}` });
        await usersService.setPin(user.id, { pin });
        users.push(user);
      }

      // Act
      const startTime = Date.now();
      const promises = users.map(user => authService.verifyPinAndIssueToken(user.id, pin));
      const results = await Promise.all(promises);
      const endTime = Date.now();

      // Assert
      expect(results).toHaveLength(userCount);
      
      // Should complete within reasonable time
      const totalTime = endTime - startTime;
      expect(totalTime).toBeLessThan(2000); // 2 seconds for 20 PIN verifications
    });
  });
});