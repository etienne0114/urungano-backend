import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerModule } from '@nestjs/throttler';
import { DataSource } from 'typeorm';
import { getTestDatabaseConfig, createTestDataSource, TestDatabaseUtils } from './database.config';

/**
 * Comprehensive test utilities for consistent testing patterns
 */

/**
 * Create a test module with common dependencies
 */
export const createTestModuleBuilder = () => {
  return Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        envFilePath: '.env.test',
      }),
      TypeOrmModule.forRoot(getTestDatabaseConfig()),
      JwtModule.register({
        secret: 'test-secret',
        signOptions: { expiresIn: '1h' },
      }),
      ThrottlerModule.forRoot([{
        ttl: 60000,
        limit: 10,
      }]),
    ],
  });
};

/**
 * Create test module with specific imports
 */
export const createTestModule = async (
  imports: any[] = [],
  providers: any[] = []
): Promise<TestingModule> => {
  const moduleBuilder = createTestModuleBuilder();
  
  if (imports.length > 0) {
    moduleBuilder.overrideModule(imports[0]).useModule(imports[0]);
  }
  
  if (providers.length > 0) {
    providers.forEach(provider => {
      if (provider.provide && provider.useValue) {
        moduleBuilder.overrideProvider(provider.provide).useValue(provider.useValue);
      }
    });
  }
  
  return await moduleBuilder.compile();
};

/**
 * Mock factory for TypeORM repositories
 */
export const createMockRepository = <T = any>() => ({
  find: jest.fn<Promise<T[]>, any>(),
  findOne: jest.fn<Promise<T | null>, any>(),
  findOneBy: jest.fn<Promise<T | null>, any>(),
  findOneOrFail: jest.fn<Promise<T>, any>(),
  findBy: jest.fn<Promise<T[]>, any>(),
  save: jest.fn<Promise<T>, any>(),
  create: jest.fn<T, any>(),
  update: jest.fn<Promise<any>, any>(),
  delete: jest.fn<Promise<any>, any>(),
  remove: jest.fn<Promise<T>, any>(),
  count: jest.fn<Promise<number>, any>(),
  countBy: jest.fn<Promise<number>, any>(),
  exist: jest.fn<Promise<boolean>, any>(),
  existsBy: jest.fn<Promise<boolean>, any>(),
  clear: jest.fn<Promise<void>, any>(),
  createQueryBuilder: jest.fn(() => createMockQueryBuilder()),
  manager: {
    transaction: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
  },
});

/**
 * Mock factory for TypeORM query builder
 */
export const createMockQueryBuilder = () => ({
  select: jest.fn().mockReturnThis(),
  addSelect: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  orWhere: jest.fn().mockReturnThis(),
  whereInIds: jest.fn().mockReturnThis(),
  having: jest.fn().mockReturnThis(),
  andHaving: jest.fn().mockReturnThis(),
  orHaving: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  addOrderBy: jest.fn().mockReturnThis(),
  groupBy: jest.fn().mockReturnThis(),
  addGroupBy: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  offset: jest.fn().mockReturnThis(),
  take: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  innerJoin: jest.fn().mockReturnThis(),
  leftJoin: jest.fn().mockReturnThis(),
  rightJoin: jest.fn().mockReturnThis(),
  innerJoinAndSelect: jest.fn().mockReturnThis(),
  leftJoinAndSelect: jest.fn().mockReturnThis(),
  rightJoinAndSelect: jest.fn().mockReturnThis(),
  getMany: jest.fn(),
  getOne: jest.fn(),
  getOneOrFail: jest.fn(),
  getCount: jest.fn(),
  getRawMany: jest.fn(),
  getRawOne: jest.fn(),
  execute: jest.fn(),
  stream: jest.fn(),
  clone: jest.fn().mockReturnThis(),
  disableEscaping: jest.fn().mockReturnThis(),
  getQuery: jest.fn(),
  getParameters: jest.fn(),
  getSql: jest.fn(),
  printSql: jest.fn().mockReturnThis(),
  useTransaction: jest.fn().mockReturnThis(),
  setLock: jest.fn().mockReturnThis(),
  setOnLocked: jest.fn().mockReturnThis(),
  distinctOn: jest.fn().mockReturnThis(),
  getExists: jest.fn(),
});

/**
 * Mock factory for JWT service
 */
export const createMockJwtService = () => ({
  sign: jest.fn((payload: any) => `mock.jwt.token.${JSON.stringify(payload)}`),
  signAsync: jest.fn((payload: any) => Promise.resolve(`mock.jwt.token.${JSON.stringify(payload)}`)),
  verify: jest.fn((token: string) => ({ sub: 'test-user-id', username: 'testuser' })),
  verifyAsync: jest.fn((token: string) => Promise.resolve({ sub: 'test-user-id', username: 'testuser' })),
  decode: jest.fn((token: string) => ({ sub: 'test-user-id', username: 'testuser' })),
});

/**
 * Mock factory for configuration service
 */
export const createMockConfigService = (): any => ({
  get: jest.fn((key: string): any => {
    const config: Record<string, any> = {
      'JWT_SECRET': 'test-secret',
      'JWT_EXPIRES_IN': '1h',
      'DB_HOST': 'localhost',
      'DB_PORT': 5432,
      'DB_USERNAME': 'postgres',
      'DB_PASSWORD': 'postgres',
      'DB_NAME': 'urungano_test',
      'NODE_ENV': 'test',
    };
    return config[key];
  }),
  getOrThrow: jest.fn((key: string): any => {
    const value = createMockConfigService().get(key);
    if (value === undefined) {
      throw new Error(`Configuration key "${key}" not found`);
    }
    return value;
  }),
});

/**
 * Mock factory for users service
 */
export const createMockUsersService = () => ({
  findByUsername: jest.fn(),
  findById: jest.fn(),
  createAnonymous: jest.fn(),
  verifyPin: jest.fn(),
  setPin: jest.fn(),
  removePin: jest.fn(),
  update: jest.fn(),
  touchStreak: jest.fn(),
  toResponseDto: jest.fn(),
  findAll: jest.fn(),
  create: jest.fn(),
  remove: jest.fn(),
});

/**
 * Mock factory for lessons service
 */
export const createMockLessonsService = () => ({
  findAll: jest.fn(),
  findOne: jest.fn(),
  findBySlug: jest.fn(),
  findByCategory: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
  getChapters: jest.fn(),
  getHotspots: jest.fn(),
});

/**
 * Mock factory for quiz service
 */
export const createMockQuizService = () => ({
  getQuestions: jest.fn(),
  submitAnswers: jest.fn(),
  getHistory: jest.fn(),
  getStatistics: jest.fn(),
  createQuestion: jest.fn(),
  updateQuestion: jest.fn(),
  deleteQuestion: jest.fn(),
});

/**
 * Mock factory for progress service
 */
export const createMockProgressService = () => ({
  getUserProgress: jest.fn(),
  updateProgress: jest.fn(),
  completeLesson: jest.fn(),
  getStreak: jest.fn(),
  resetStreak: jest.fn(),
  getStatistics: jest.fn(),
});

/**
 * Mock factory for community service
 */
export const createMockCommunityService = () => ({
  getCircles: jest.fn(),
  joinCircle: jest.fn(),
  leaveCircle: jest.fn(),
  sendMessage: jest.fn(),
  getMessages: jest.fn(),
  createDebate: jest.fn(),
  voteOnDebate: jest.fn(),
  submitQuestion: jest.fn(),
  getQuestions: jest.fn(),
});

/**
 * Test data factories with realistic data
 */
export const TestDataFactory = {
  createUser: (overrides: any = {}) => ({
    id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    username: `testuser_${Date.now()}`,
    pinHash: null,
    language: 'rw',
    dayStreak: 0,
    lastActiveDate: null,
    avatarSeed: '01',
    isPrivate: false,
    progressRecords: [],
    quizAttempts: [],
    joinedDate: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }),

  createLesson: (overrides: any = {}) => ({
    id: `lesson-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    slug: `test-lesson-${Date.now()}`,
    title: 'Test Lesson',
    category: 'menstrual_health',
    durationMinutes: 30,
    isActive: true,
    chapters: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }),

  createQuizQuestion: (overrides: any = {}) => ({
    id: `question-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    lessonId: 'test-lesson-id',
    questionText: 'What is the correct answer?',
    options: ['Option A', 'Option B', 'Option C', 'Option D'],
    correctAnswer: 0,
    explanation: 'Option A is correct because...',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }),

  createQuizAttempt: (overrides: any = {}) => ({
    id: `attempt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    userId: 'test-user-id',
    lessonId: 'test-lesson-id',
    answers: [0, 1, 2],
    score: 2,
    totalQuestions: 3,
    completedAt: new Date(),
    ...overrides,
  }),

  createUserProgress: (overrides: any = {}) => ({
    id: `progress-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    userId: 'test-user-id',
    lessonId: 'test-lesson-id',
    isCompleted: false,
    completedAt: null,
    timeSpentMinutes: 15,
    lastAccessedAt: new Date(),
    ...overrides,
  }),
};

/**
 * Test assertion helpers
 */
export const TestAssertions = {
  /**
   * Assert that a mock was called with specific arguments
   */
  expectCalledWith: (mockFn: jest.Mock, ...args: any[]) => {
    expect(mockFn).toHaveBeenCalledWith(...args);
  },

  /**
   * Assert that a mock was called a specific number of times
   */
  expectCalledTimes: (mockFn: jest.Mock, times: number) => {
    expect(mockFn).toHaveBeenCalledTimes(times);
  },

  /**
   * Assert that an object matches a partial structure
   */
  expectObjectMatching: (actual: any, expected: any) => {
    expect(actual).toMatchObject(expected);
  },

  /**
   * Assert that an array contains specific items
   */
  expectArrayContaining: (actual: any[], expected: any[]) => {
    expect(actual).toEqual(expect.arrayContaining(expected));
  },

  /**
   * Assert that a promise rejects with specific error
   */
  expectToRejectWith: async (promise: Promise<any>, errorClass: any, message?: string) => {
    await expect(promise).rejects.toThrow(errorClass);
    if (message) {
      await expect(promise).rejects.toThrow(message);
    }
  },

  /**
   * Assert that a value is a valid UUID
   */
  expectValidUuid: (value: string) => {
    expect(value).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  },

  /**
   * Assert that a date is recent (within last minute)
   */
  expectRecentDate: (date: Date) => {
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60000);
    expect(date.getTime()).toBeGreaterThan(oneMinuteAgo.getTime());
    expect(date.getTime()).toBeLessThanOrEqual(now.getTime());
  },
};

/**
 * Performance testing utilities
 */
export const PerformanceUtils = {
  /**
   * Measure execution time of a function
   */
  measureExecutionTime: async <T>(fn: () => Promise<T>): Promise<{ result: T; duration: number }> => {
    const start = process.hrtime.bigint();
    const result = await fn();
    const end = process.hrtime.bigint();
    const duration = Number(end - start) / 1000000; // Convert to milliseconds
    return { result, duration };
  },

  /**
   * Assert that a function executes within a time limit
   */
  expectExecutionTimeUnder: async <T>(fn: () => Promise<T>, maxMs: number): Promise<T> => {
    const { result, duration } = await PerformanceUtils.measureExecutionTime(fn);
    expect(duration).toBeLessThan(maxMs);
    return result;
  },

  /**
   * Run a function multiple times and get average execution time
   */
  benchmarkFunction: async <T>(fn: () => Promise<T>, iterations: number = 10): Promise<{
    averageDuration: number;
    minDuration: number;
    maxDuration: number;
    results: T[];
  }> => {
    const durations: number[] = [];
    const results: T[] = [];

    for (let i = 0; i < iterations; i++) {
      const { result, duration } = await PerformanceUtils.measureExecutionTime(fn);
      durations.push(duration);
      results.push(result);
    }

    return {
      averageDuration: durations.reduce((sum, d) => sum + d, 0) / durations.length,
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      results,
    };
  },
};

/**
 * Database testing utilities
 */
export class DatabaseTestUtils {
  private dataSource: DataSource;
  private dbUtils: TestDatabaseUtils;

  constructor(dataSource: DataSource) {
    this.dataSource = dataSource;
    this.dbUtils = new TestDatabaseUtils(dataSource);
  }

  /**
   * Seed database with test data
   */
  async seedTestData() {
    // Create test users
    const users = await Promise.all([
      this.dbUtils.createTestUser({ username: 'testuser1', language: 'rw' }),
      this.dbUtils.createTestUser({ username: 'testuser2', language: 'en' }),
      this.dbUtils.createTestUser({ username: 'testuser3', language: 'fr' }),
    ]);

    // Create test lessons
    const lessons = await Promise.all([
      this.dbUtils.createTestLesson({ 
        slug: 'menstrual-health-basics',
        title: 'Menstrual Health Basics',
        category: 'menstrual_health',
      }),
      this.dbUtils.createTestLesson({ 
        slug: 'reproductive-anatomy',
        title: 'Reproductive Anatomy',
        category: 'anatomy',
      }),
    ]);

    return { users, lessons };
  }

  /**
   * Clear all test data
   */
  async clearTestData() {
    const entities = this.dataSource.entityMetadatas;
    
    // Disable foreign key checks
    await this.dataSource.query('SET session_replication_role = replica;');
    
    // Clear all tables
    for (const entity of entities) {
      const repository = this.dataSource.getRepository(entity.name);
      await repository.clear();
    }
    
    // Re-enable foreign key checks
    await this.dataSource.query('SET session_replication_role = DEFAULT;');
  }

  /**
   * Get database utils
   */
  getDbUtils() {
    return this.dbUtils;
  }
}

/**
 * Global test timeout configuration
 */
jest.setTimeout(30000);

/**
 * Global test setup for consistent environment
 */
beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();
  
  // Reset environment variables
  process.env.NODE_ENV = 'test';
});