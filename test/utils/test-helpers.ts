import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import * as request from 'supertest';
import { DataSource, Repository, ObjectLiteral } from 'typeorm';
import { getTestDatabaseConfig } from '../setup';

/**
 * Test application factory for integration and e2e tests
 */
export class TestApp {
  private app: INestApplication;
  private moduleRef: TestingModule;

  static async create(modules: any[] = []): Promise<TestApp> {
    const testApp = new TestApp();
    await testApp.initialize(modules);
    return testApp;
  }

  private async initialize(modules: any[]): Promise<void> {
    this.moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        TypeOrmModule.forRoot(getTestDatabaseConfig()),
        PassportModule,
        JwtModule.register({
          secret: 'test_secret_key_for_testing',
          signOptions: { expiresIn: '1h' },
        }),
        ...modules,
      ],
    }).compile();

    this.app = this.moduleRef.createNestApplication();
    await this.app.init();
  }

  getApp(): INestApplication {
    return this.app;
  }

  getModule(): TestingModule {
    return this.moduleRef;
  }

  getDataSource(): DataSource {
    return this.moduleRef.get<DataSource>(DataSource);
  }

  getRepository<T extends Record<string, any>>(entity: any): Repository<T> {
    return this.getDataSource().getRepository(entity) as Repository<T>;
  }

  async request(): Promise<request.SuperTest<request.Test>> {
    return request(this.app.getHttpServer()) as any;
  }

  async close(): Promise<void> {
    await this.app.close();
    await this.moduleRef.close();
  }
}

/**
 * Authentication helper for tests
 */
export class AuthTestHelper {
  constructor(private testApp: TestApp) {}

  async createUser(username: string = 'testuser'): Promise<{ user: any; token: string }> {
    const req = await this.testApp.request();
    const response = await req
      .post('/api/v1/auth/signin/anonymous')
      .send({ username });

    expect(response.status).toBe(201);
    expect(response.body.accessToken).toBeDefined();

    return {
      user: {
        id: response.body.userId,
        username: response.body.username,
      },
      token: response.body.accessToken,
    };
  }

  async authenticatedRequest(): Promise<request.SuperTest<request.Test>> {
    return this.testApp.request();
  }
}

/**
 * Database seeding helper for tests
 */
export class DatabaseSeeder {
  constructor(private dataSource: DataSource) {}

  async seedUsers(count: number = 5): Promise<any[]> {
    const userRepository = this.dataSource.getRepository('User');
    const users = [];

    for (let i = 0; i < count; i++) {
      const user = userRepository.create({
        username: `testuser${i}`,
        pin: null,
      });
      users.push(await userRepository.save(user));
    }

    return users;
  }

  async seedLessons(count: number = 3): Promise<any[]> {
    const lessonRepository = this.dataSource.getRepository('Lesson');
    const lessons = [];

    for (let i = 0; i < count; i++) {
      const lesson = lessonRepository.create({
        title: `Test Lesson ${i}`,
        description: `Description for test lesson ${i}`,
        category: 'reproductive-health',
        difficulty: 'beginner',
        estimatedDuration: 30,
        isPublished: true,
      });
      lessons.push(await lessonRepository.save(lesson));
    }

    return lessons;
  }

  async seedQuizQuestions(lessonId: string, count: number = 5): Promise<any[]> {
    const quizRepository = this.dataSource.getRepository('QuizQuestion');
    const questions = [];

    for (let i = 0; i < count; i++) {
      const question = quizRepository.create({
        lessonId,
        question: `Test question ${i}?`,
        options: [`Option A${i}`, `Option B${i}`, `Option C${i}`, `Option D${i}`],
        correctAnswer: 0,
        explanation: `Explanation for question ${i}`,
      });
      questions.push(await quizRepository.save(question));
    }

    return questions;
  }

  async clearAll(): Promise<void> {
    const entities = this.dataSource.entityMetadatas;
    
    // Clear in reverse order to handle foreign key constraints
    for (const entity of entities.reverse()) {
      const repository = this.dataSource.getRepository(entity.name);
      await repository.clear();
    }
  }
}

/**
 * Performance testing utilities
 */
export class PerformanceTestHelper {
  private startTime: number;
  private endTime: number;

  startTimer(): void {
    this.startTime = Date.now();
  }

  stopTimer(): number {
    this.endTime = Date.now();
    return this.endTime - this.startTime;
  }

  expectResponseTime(maxMs: number): void {
    const duration = this.stopTimer();
    expect(duration).toBeLessThan(maxMs);
  }

  async measureAsyncOperation<T>(operation: () => Promise<T>): Promise<{ result: T; duration: number }> {
    this.startTimer();
    const result = await operation();
    const duration = this.stopTimer();
    return { result, duration };
  }
}

/**
 * Error testing utilities
 */
export class ErrorTestHelper {
  static expectValidationError(response: any, field?: string): void {
    expect(response.status).toBe(400);
    expect(response.body.message).toBeDefined();
    if (field) {
      expect(response.body.message).toContain(field);
    }
  }

  static expectUnauthorizedError(response: any): void {
    expect(response.status).toBe(401);
    expect(response.body.message).toBeDefined();
  }

  static expectNotFoundError(response: any): void {
    expect(response.status).toBe(404);
    expect(response.body.message).toBeDefined();
  }

  static expectRateLimitError(response: any): void {
    expect(response.status).toBe(429);
    expect(response.body.message).toContain('rate limit');
  }
}

/**
 * Mock factory utilities
 */
export class MockFactory {
  static createMockService<T>(methods: (keyof T)[]): jest.Mocked<T> {
    const mock = {} as jest.Mocked<T>;
    
    methods.forEach(method => {
      mock[method] = jest.fn() as any;
    });

    return mock;
  }

  static createMockRepository<T extends ObjectLiteral>(): jest.Mocked<Repository<T>> {
    return {
      find: jest.fn(),
      findOne: jest.fn(),
      findOneBy: jest.fn(),
      findAndCount: jest.fn(),
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
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn(),
        getOne: jest.fn(),
        getCount: jest.fn(),
        getManyAndCount: jest.fn(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        innerJoinAndSelect: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
      })),
    } as any;
  }
}

/**
 * Test data generators
 */
export class TestDataGenerator {
  static generateRandomString(length: number = 10): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  static generateRandomEmail(): string {
    return `${this.generateRandomString(8)}@test.com`;
  }

  static generateRandomUsername(): string {
    return `user_${this.generateRandomString(6)}`;
  }

  static generateRandomPin(): string {
    return Math.floor(1000 + Math.random() * 9000).toString();
  }

  static generateLargeDataset<T>(factory: () => T, count: number): T[] {
    return Array.from({ length: count }, factory);
  }
}

/**
 * Async testing utilities
 */
export class AsyncTestHelper {
  static async waitFor(condition: () => boolean | Promise<boolean>, timeout: number = 5000): Promise<void> {
    const start = Date.now();
    
    while (Date.now() - start < timeout) {
      if (await condition()) {
        return;
      }
      await this.sleep(100);
    }
    
    throw new Error(`Condition not met within ${timeout}ms`);
  }

  static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  static async expectEventually(
    assertion: () => void | Promise<void>,
    timeout: number = 5000,
    interval: number = 100
  ): Promise<void> {
    const start = Date.now();
    let lastError: Error = new Error(`Assertion failed within ${timeout}ms`);

    while (Date.now() - start < timeout) {
      try {
        await assertion();
        return;
      } catch (error) {
        lastError = error as Error;
        await this.sleep(interval);
      }
    }

    throw lastError || new Error(`Assertion failed within ${timeout}ms`);
  }
}