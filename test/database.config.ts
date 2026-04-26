import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { DataSource, DataSourceOptions } from 'typeorm';
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

/**
 * Test database configuration with proper isolation
 * Each test run gets a fresh database schema
 */
export const getTestDatabaseConfig = (): TypeOrmModuleOptions => {
  const baseConfig = {
    type: 'postgres' as const,
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'Etienne2025',
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
    ],
    synchronize: true, // Only for testing - creates schema automatically
    dropSchema: true, // Clean database for each test run
    logging: process.env.NODE_ENV === 'test' ? false : ['error'] as any, // Minimal logging in tests
    maxQueryExecutionTime: 1000, // Log slow queries in tests
  };

  // Use separate test database to avoid conflicts
  const testDbName = process.env.NODE_ENV === 'test'
    ? `${process.env.DB_NAME || 'urungano'}_test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    : process.env.DB_NAME || 'urungano_test';

  return {
    ...baseConfig,
    database: testDbName,
  };
};

/**
 * Create isolated test database connection
 * Each test suite gets its own database instance
 */
export const createTestDataSource = async (): Promise<DataSource> => {
  const config = getTestDatabaseConfig() as DataSourceOptions;
  const dataSource = new DataSource(config);

  try {
    await dataSource.initialize();
    return dataSource;
  } catch (error) {
    console.error('Failed to create test database connection:', error);
    throw error;
  }
};

/**
 * Clean up test database and close connection
 */
export const cleanupTestDataSource = async (dataSource: DataSource): Promise<void> => {
  if (dataSource && dataSource.isInitialized) {
    try {
      // Drop the test database schema
      await dataSource.dropDatabase();
      await dataSource.destroy();
    } catch (error) {
      console.error('Failed to cleanup test database:', error);
      // Don't throw - cleanup should be best effort
    }
  }
};

/**
 * Clear all data from test database tables
 * Useful for cleaning between individual tests
 */
export const clearTestDatabase = async (dataSource: DataSource): Promise<void> => {
  if (!dataSource || !dataSource.isInitialized) {
    return;
  }

  try {
    // Get all entity metadata
    const entities = dataSource.entityMetadatas;

    // Disable foreign key checks temporarily
    await dataSource.query('SET session_replication_role = replica;');

    // Clear all tables
    for (const entity of entities) {
      const repository = dataSource.getRepository(entity.name);
      await repository.clear();
    }

    // Re-enable foreign key checks
    await dataSource.query('SET session_replication_role = DEFAULT;');
  } catch (error) {
    console.error('Failed to clear test database:', error);
    throw error;
  }
};

/**
 * Test database utilities for seeding test data
 */
export class TestDatabaseUtils {
  constructor(private dataSource: DataSource) { }

  /**
   * Create test user with optional overrides
   */
  async createTestUser(overrides: Partial<User> = {}): Promise<User> {
    const userRepository = this.dataSource.getRepository(User);
    const user = userRepository.create({
      username: `testuser_${Date.now()}`,
      language: 'rw',
      dayStreak: 0,
      avatarSeed: '01',
      isPrivate: false,
      joinedDate: new Date(),
      ...overrides,
    });
    return await userRepository.save(user);
  }

  /**
   * Create test lesson with optional overrides
   */
  async createTestLesson(overrides: Partial<Lesson> = {}): Promise<Lesson> {
    const lessonRepository = this.dataSource.getRepository(Lesson);
    const lesson = lessonRepository.create({
      slug: `test-lesson-${Date.now()}`,
      title: 'Test Lesson',
      category: 'menstrual_health',
      durationMinutes: 30,
      isActive: true,
      createdAt: new Date(),
      ...overrides,
    });
    return await lessonRepository.save(lesson);
  }

  /**
   * Create test quiz question with optional overrides
   */
  async createTestQuizQuestion(overrides: Partial<QuizQuestion> = {}): Promise<QuizQuestion> {
    const questionRepository = this.dataSource.getRepository(QuizQuestion);

    // First create a test lesson if not provided
    let lesson = overrides.lesson;
    if (!lesson) {
      const lessonRepository = this.dataSource.getRepository(Lesson);
      lesson = await lessonRepository.save(lessonRepository.create({
        title: 'Test Lesson',
        slug: 'test-lesson',
        category: 'menstrual_health',
        durationMinutes: 10,
        isActive: true,
      }));
    }

    const question = questionRepository.create({
      lesson,
      questionText: 'Test question?',
      options: ['Option A', 'Option B', 'Option C'],
      correctIndex: 0,
      explanation: 'Test explanation',
      ...overrides,
    });

    return await questionRepository.save(question);
  }

  /**
   * Get repository for entity
   */
  getRepository<T>(entity: new () => T) {
    return this.dataSource.getRepository(entity);
  }
}

/**
 * Database transaction utilities for testing
 */
export class TestTransactionUtils {
  constructor(private dataSource: DataSource) { }

  /**
   * Run test within a transaction that gets rolled back
   * Useful for testing database operations without affecting other tests
   */
  async runInTransaction<T>(callback: (manager: any) => Promise<T>): Promise<T> {
    return await this.dataSource.transaction(async (manager) => {
      return await callback(manager);
    });
  }

  /**
   * Test transaction rollback behavior
   */
  async testTransactionRollback<T>(
    callback: (manager: any) => Promise<T>,
    shouldFail: boolean = true
  ): Promise<{ success: boolean; error?: Error; result?: T }> {
    try {
      const result = await this.dataSource.transaction(async (manager) => {
        const result = await callback(manager);
        if (shouldFail) {
          throw new Error('Intentional rollback for testing');
        }
        return result;
      });
      return { success: true, result };
    } catch (error) {
      return { success: false, error: error as Error };
    }
  }
}