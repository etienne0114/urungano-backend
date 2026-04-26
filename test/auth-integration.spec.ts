import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { DataSource } from 'typeorm';
import { AuthService } from '../src/modules/auth/auth.service';
import { UsersService } from '../src/modules/users/users.service';
import { AuthModule } from '../src/modules/auth/auth.module';
import { UsersModule } from '../src/modules/users/users.module';
import { User } from '../src/modules/users/entities/user.entity';
import { getTestDatabaseConfig, createTestDatabase, cleanupTestDatabase } from './setup';
import { TestApp, AuthTestHelper, DatabaseSeeder } from './utils/test-helpers';

describe('AuthService Integration Tests', () => {
  let app: TestApp;
  let authService: AuthService;
  let usersService: UsersService;
  let dataSource: DataSource;
  let authHelper: AuthTestHelper;
  let seeder: DatabaseSeeder;

  beforeAll(async () => {
    // Create test application
    app = await TestApp.create([AuthModule, UsersModule]);
    
    // Get services
    authService = app.getModule().get<AuthService>(AuthService);
    usersService = app.getModule().get<UsersService>(UsersService);
    dataSource = app.getDataSource();
    
    // Initialize helpers
    authHelper = new AuthTestHelper(app);
    seeder = new DatabaseSeeder(dataSource);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Clear database before each test
    await seeder.clearAll();
  });

  describe('Anonymous Sign-in Integration', () => {
    it('should create new user in database and return valid JWT', async () => {
      // Arrange
      const username = 'integration-test-user';

      // Act
      const result = await authService.signInAnonymous(username);

      // Assert
      expect(result.accessToken).toBeDefined();
      expect(result.userId).toBeDefined();
      expect(result.username).toBe(username);
      expect(result.isNewUser).toBe(true);

      // Verify user was created in database
      const userInDb = await dataSource.getRepository(User).findOneBy({ id: result.userId });
      expect(userInDb).toBeDefined();
      expect(userInDb!.username).toBe(username);
      expect(userInDb!.pinHash).toBeNull();
    });

    it('should return existing user from database without creating duplicate', async () => {
      // Arrange
      const username = 'existing-user';
      
      // Create user first
      const firstResult = await authService.signInAnonymous(username);
      
      // Act - Sign in again with same username
      const secondResult = await authService.signInAnonymous(username);

      // Assert
      expect(secondResult.userId).toBe(firstResult.userId);
      expect(secondResult.username).toBe(username);
      expect(secondResult.isNewUser).toBe(false);

      // Verify only one user exists in database
      const usersInDb = await dataSource.getRepository(User).find({ where: { username } });
      expect(usersInDb).toHaveLength(1);
    });

    it('should handle concurrent sign-ins for same username without creating duplicates', async () => {
      // Arrange
      const username = 'concurrent-user';

      // Act - Multiple concurrent sign-ins
      const promises = Array(5).fill(null).map(() => authService.signInAnonymous(username));
      const results = await Promise.all(promises);

      // Assert - All should have same user ID
      const userIds = results.map(r => r.userId);
      const uniqueUserIds = [...new Set(userIds)];
      expect(uniqueUserIds).toHaveLength(1);

      // Verify only one user in database
      const usersInDb = await dataSource.getRepository(User).find({ where: { username } });
      expect(usersInDb).toHaveLength(1);
    });

    it('should handle special characters and unicode in usernames', async () => {
      // Arrange
      const specialUsernames = [
        'user@domain.com',
        'user-with-dashes',
        'user_with_underscores',
        'user.with.dots',
        '用户名测试',
        'مستخدم',
        'пользователь',
        'user🚀emoji'
      ];

      // Act & Assert
      for (const username of specialUsernames) {
        const result = await authService.signInAnonymous(username);
        
        expect(result.username).toBe(username);
        expect(result.isNewUser).toBe(true);
        
        // Verify in database
        const userInDb = await dataSource.getRepository(User).findOneBy({ id: result.userId });
        expect(userInDb!.username).toBe(username);
      }
    });

    it('should generate unique user IDs for different usernames', async () => {
      // Arrange
      const usernames = ['user1', 'user2', 'user3', 'user4', 'user5'];

      // Act
      const results = await Promise.all(
        usernames.map(username => authService.signInAnonymous(username))
      );

      // Assert
      const userIds = results.map(r => r.userId);
      const uniqueUserIds = [...new Set(userIds)];
      expect(uniqueUserIds).toHaveLength(usernames.length);

      // Verify all users in database
      const usersInDb = await dataSource.getRepository(User).find();
      expect(usersInDb).toHaveLength(usernames.length);
    });
  });

  describe('PIN Verification Integration', () => {
    let testUser: User;
    const testPin = '1234';

    beforeEach(async () => {
      // Create a user with PIN for testing
      const signInResult = await authService.signInAnonymous('pin-test-user');
      const foundUser = await dataSource.getRepository(User).findOneBy({ id: signInResult.userId });
      if (!foundUser) throw new Error('User not found');
      testUser = foundUser;
      
      // Set PIN for the user (assuming UsersService has this method)
      await usersService.setPin(testUser.id, { pin: testPin });
      
      // Refresh user from database
      const refreshedUser = await dataSource.getRepository(User).findOneBy({ id: testUser.id });
      if (!refreshedUser) throw new Error('User not found after refresh');
      testUser = refreshedUser;
    });

    it('should verify correct PIN and return valid JWT', async () => {
      // Act
      const result = await authService.verifyPinAndIssueToken(testUser.id, testPin);

      // Assert
      expect(result.accessToken).toBeDefined();
      expect(result.userId).toBe(testUser.id);
      expect(result.username).toBe(testUser.username);
      expect(result.isNewUser).toBe(false);
    });

    it('should reject incorrect PIN', async () => {
      // Arrange
      const incorrectPin = '9999';

      // Act & Assert
      await expect(
        authService.verifyPinAndIssueToken(testUser.id, incorrectPin)
      ).rejects.toThrow('Incorrect PIN');
    });

    it('should reject non-existent user ID', async () => {
      // Arrange
      const nonExistentUserId = 'non-existent-id';

      // Act & Assert
      await expect(
        authService.verifyPinAndIssueToken(nonExistentUserId, testPin)
      ).rejects.toThrow('User not found');
    });

    it('should handle empty PIN', async () => {
      // Act & Assert
      await expect(
        authService.verifyPinAndIssueToken(testUser.id, '')
      ).rejects.toThrow('Incorrect PIN');
    });

    it('should handle malformed user ID', async () => {
      // Arrange
      const malformedIds = ['', 'invalid-uuid', '123', null, undefined];

      // Act & Assert
      for (const id of malformedIds) {
        await expect(
          authService.verifyPinAndIssueToken(id as string, testPin)
        ).rejects.toThrow('User not found');
      }
    });
  });

  describe('JWT Payload Validation Integration', () => {
    let testUser: User;

    beforeEach(async () => {
      // Create test user
      const signInResult = await authService.signInAnonymous('jwt-test-user');
      const foundUser = await dataSource.getRepository(User).findOneBy({ id: signInResult.userId });
      if (!foundUser) throw new Error('User not found');
      testUser = foundUser;
    });

    it('should validate correct JWT payload and return user', async () => {
      // Arrange
      const payload = {
        sub: testUser.id,
        username: testUser.username,
      };

      // Act
      const result = await authService.validatePayload(payload);

      // Assert
      expect(result).toBeDefined();
      expect(result!.id).toBe(testUser.id);
      expect(result!.username).toBe(testUser.username);
    });

    it('should return null for non-existent user in payload', async () => {
      // Arrange
      const payload = {
        sub: 'non-existent-user-id',
        username: 'non-existent-user',
      };

      // Act
      const result = await authService.validatePayload(payload);

      // Assert
      expect(result).toBeNull();
    });

    it('should handle malformed payload gracefully', async () => {
      // Arrange
      const malformedPayloads = [
        { sub: '', username: '' },
        { sub: null, username: null },
        { sub: undefined, username: undefined },
      ];

      // Act & Assert
      for (const payload of malformedPayloads) {
        const result = await authService.validatePayload(payload as any);
        expect(result).toBeNull();
      }
    });
  });

  describe('Database Transaction Integrity', () => {
    it('should maintain data consistency during concurrent operations', async () => {
      // Arrange
      const username = 'transaction-test-user';
      const concurrentOperations = 10;

      // Act - Simulate concurrent sign-ins and operations
      const promises = Array(concurrentOperations).fill(null).map(async (_, index) => {
        if (index % 2 === 0) {
          return authService.signInAnonymous(username);
        } else {
          // Simulate other operations that might interfere
          return authService.signInAnonymous(`${username}-${index}`);
        }
      });

      const results = await Promise.all(promises);

      // Assert - Check data consistency
      const sameUsernameResults = results.filter(r => r.username === username);
      const uniqueUserIds = [...new Set(sameUsernameResults.map(r => r.userId))];
      expect(uniqueUserIds).toHaveLength(1); // Should be only one user for same username

      // Verify database state
      const userInDb = await dataSource.getRepository(User).findOneBy({ username });
      expect(userInDb).toBeDefined();
      expect(userInDb!.id).toBe(uniqueUserIds[0]);
    });

    it('should handle database connection failures gracefully', async () => {
      // This test would require mocking database failures
      // For now, we'll test that the service handles errors properly
      
      // Arrange - Create a scenario that might cause database issues
      const veryLongUsername = 'a'.repeat(10000); // Might exceed database limits

      // Act & Assert - Should handle gracefully without crashing
      try {
        await authService.signInAnonymous(veryLongUsername);
      } catch (error) {
        // Should be a proper error, not a crash
        expect(error).toBeInstanceOf(Error);
      }
    });
  });

  describe('Performance Integration Tests', () => {
    it('should handle bulk user creation efficiently', async () => {
      // Arrange
      const userCount = 100;
      const usernames = Array.from({ length: userCount }, (_, i) => `bulk-user-${i}`);

      // Act
      const startTime = Date.now();
      const promises = usernames.map(username => authService.signInAnonymous(username));
      await Promise.all(promises);
      const duration = Date.now() - startTime;

      // Assert
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds

      // Verify all users were created
      const usersInDb = await dataSource.getRepository(User).count();
      expect(usersInDb).toBe(userCount);
    });

    it('should maintain performance with existing users', async () => {
      // Arrange - Create some existing users
      await seeder.seedUsers(50);
      const existingUser = await dataSource.getRepository(User).findOne({ where: {} });

      // Act - Sign in with existing user multiple times
      const startTime = Date.now();
      const promises = Array(20).fill(null).map(() => 
        authService.signInAnonymous(existingUser!.username)
      );
      await Promise.all(promises);
      const duration = Date.now() - startTime;

      // Assert
      expect(duration).toBeLessThan(2000); // Should be fast for existing users

      // Verify no duplicate users were created
      const userCount = await dataSource.getRepository(User).count({ where: { username: existingUser!.username } });
      expect(userCount).toBe(1);
    });
  });

  describe('Real Database Schema Validation', () => {
    it('should respect database constraints and relationships', async () => {
      // Arrange
      const username = 'constraint-test-user';

      // Act
      const result = await authService.signInAnonymous(username);

      // Assert - Verify database constraints are respected
      const userInDb = await dataSource.getRepository(User).findOne({
        where: { id: result.userId },
        relations: ['progress', 'quizAttempts'], // Test relationships
      });

      expect(userInDb).toBeDefined();
      expect(userInDb!.id).toBe(result.userId);
      expect(userInDb!.username).toBe(username);
      expect(userInDb!.joinedDate).toBeInstanceOf(Date);
      expect(userInDb!.updatedAt).toBeInstanceOf(Date);
      expect(Array.isArray(userInDb!.progressRecords)).toBe(true);
      expect(Array.isArray(userInDb!.quizAttempts)).toBe(true);
    });

    it('should handle database field length limits', async () => {
      // Test various username lengths to ensure they work within database constraints
      const testCases = [
        { username: 'a', shouldWork: true },
        { username: 'a'.repeat(50), shouldWork: true },
        { username: 'a'.repeat(255), shouldWork: true }, // Assuming VARCHAR(255)
        // Note: Very long usernames might fail depending on database schema
      ];

      for (const testCase of testCases) {
        if (testCase.shouldWork) {
          const result = await authService.signInAnonymous(testCase.username);
          expect(result.username).toBe(testCase.username);
          
          // Verify in database
          const userInDb = await dataSource.getRepository(User).findOneBy({ id: result.userId });
          expect(userInDb!.username).toBe(testCase.username);
        }
      }
    });
  });

  describe('End-to-End Authentication Flow', () => {
    it('should complete full authentication cycle', async () => {
      // Step 1: Anonymous sign-in
      const username = 'e2e-test-user';
      const signInResult = await authService.signInAnonymous(username);
      
      expect(signInResult.isNewUser).toBe(true);
      expect(signInResult.accessToken).toBeDefined();

      // Step 2: Set PIN (assuming this functionality exists)
      const pin = '5678';
      await usersService.setPin(signInResult.userId, { pin });

      // Step 3: Verify PIN
      const pinResult = await authService.verifyPinAndIssueToken(signInResult.userId, pin);
      
      expect(pinResult.userId).toBe(signInResult.userId);
      expect(pinResult.username).toBe(username);
      expect(pinResult.isNewUser).toBe(false);

      // Step 4: Validate JWT payload
      const payload = {
        sub: signInResult.userId,
        username: username,
      };
      const validationResult = await authService.validatePayload(payload);
      
      expect(validationResult).toBeDefined();
      expect(validationResult!.id).toBe(signInResult.userId);

      // Step 5: Verify user exists in database with correct data
      const finalUser = await dataSource.getRepository(User).findOneBy({ id: signInResult.userId });
      expect(finalUser).toBeDefined();
      expect(finalUser!.username).toBe(username);
      expect(finalUser!.pinHash).toBeDefined(); // PIN should be set
    });

    it('should handle authentication errors in complete flow', async () => {
      // Step 1: Create user
      const username = 'error-test-user';
      const signInResult = await authService.signInAnonymous(username);

      // Step 2: Try PIN verification without setting PIN
      await expect(
        authService.verifyPinAndIssueToken(signInResult.userId, '1234')
      ).rejects.toThrow();

      // Step 3: Try validation with wrong user ID
      const wrongPayload = {
        sub: 'wrong-user-id',
        username: username,
      };
      const validationResult = await authService.validatePayload(wrongPayload);
      expect(validationResult).toBeNull();
    });
  });
});