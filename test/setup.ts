import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load test environment variables
dotenv.config({ path: path.join(__dirname, '../.env.test') });
import * as request from 'supertest';
import { DataSource, Repository, ObjectLiteral } from 'typeorm';
import { User } from '../src/modules/users/entities/user.entity';
import { Lesson } from '../src/modules/lessons/entities/lesson.entity';
import { Chapter } from '../src/modules/lessons/entities/chapter.entity';
import { Hotspot } from '../src/modules/lessons/entities/hotspot.entity';
import { QuizQuestion } from '../src/modules/quiz/entities/quiz-question.entity';
import { QuizAttempt } from '../src/modules/quiz/entities/quiz-attempt.entity';
import { UserProgress } from '../src/modules/progress/entities/user-progress.entity';
import { Circle } from '../src/modules/community/entities/circle.entity';
import { ChatMessage } from '../src/modules/community/entities/chat-message.entity';
import { Debate } from '../src/modules/community/entities/debate.entity';
import { DebateVote } from '../src/modules/community/entities/debate-vote.entity';
import { AnonQuestion } from '../src/modules/community/entities/anon-question.entity';
import { Notification } from '../src/modules/notifications/entities/notification.entity';
import { NotificationPreference } from '../src/modules/notifications/entities/notification-preference.entity';

// Global test database connection
let testDataSource: DataSource;

// Test database configuration
export const getTestDatabaseConfig = () => ({
  type: 'postgres' as const,
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'urungano_test',
  entities: [
    User,
    Lesson,
    Chapter,
    Hotspot,
    QuizQuestion,
    QuizAttempt,
    UserProgress,
    Circle,
    ChatMessage,
    Debate,
    DebateVote,
    AnonQuestion,
    Notification,
    NotificationPreference,
  ],
  synchronize: true, // Only for testing
  dropSchema: true, // Clean database for each test run
  logging: false, // Disable logging in tests
});

// Create test database connection
export const createTestDatabase = async (): Promise<DataSource> => {
  if (testDataSource && testDataSource.isInitialized) {
    return testDataSource;
  }

  testDataSource = new DataSource(getTestDatabaseConfig());
  await testDataSource.initialize();
  return testDataSource;
};

// Clean up test database
export const cleanupTestDatabase = async (): Promise<void> => {
  if (testDataSource && testDataSource.isInitialized) {
    await testDataSource.destroy();
  }
};

// Create test module with database
export const createTestModule = async (imports: any[] = []): Promise<TestingModule> => {
  return Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        envFilePath: '.env.test',
      }),
      TypeOrmModule.forRootAsync({
        imports: [ConfigModule],
        useFactory: () => getTestDatabaseConfig(),
        inject: [ConfigService],
      }),
      ...imports,
    ],
  }).compile();
};

// Test utilities for mocking
export const createMockRepository = <T extends ObjectLiteral>(): jest.Mocked<Repository<T>> => ({
  find: jest.fn(),
  findOne: jest.fn(),
  findOneBy: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  remove: jest.fn(),
  count: jest.fn(),
  createQueryBuilder: jest.fn(() => ({
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
    getOne: jest.fn(),
    getCount: jest.fn(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    innerJoinAndSelect: jest.fn().mockReturnThis(),
  })),
} as unknown as jest.Mocked<Repository<T>>);

// Mock JWT service
export const createMockJwtService = () => ({
  sign: jest.fn(),
  verify: jest.fn(),
  decode: jest.fn(),
});

// Mock users service
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
});

// Test data factories
export const createTestUser = (overrides: Partial<User> = {}): User => {
  const user = new User();
  Object.assign(user, {
    id: 'test-user-id',
    username: 'testuser',
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
  });
  return user;
};

export const createTestLesson = (overrides: Partial<Lesson> = {}): Lesson => ({
  id: 'test-lesson-id',
  slug: 'test-lesson',
  title: 'Test Lesson',
  localizedTitle: { en: 'Test Lesson', fr: 'Leçon test', rw: 'Isomo ry\' igerageza' },
  category: 'menstrual_health',
  durationMinutes: 30,
  isActive: true,
  chapters: [],
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

// Global test setup
beforeAll(async () => {
  // Set test environment
  process.env.NODE_ENV = 'test';
  
  // Create test database connection
  await createTestDatabase();
});

afterAll(async () => {
  // Close database connection
  if (testDataSource && testDataSource.isInitialized) {
    await testDataSource.destroy();
  }
});

beforeEach(async () => {
  // Clear all tables before each test
  if (testDataSource && testDataSource.isInitialized) {
    const entities = testDataSource.entityMetadatas;
    for (const entity of entities) {
      const repository = testDataSource.getRepository(entity.name);
      await repository.query(`DELETE FROM "${entity.tableName}" CASCADE`);
    }
  }
});

// Increase test timeout for database operations
jest.setTimeout(30000);