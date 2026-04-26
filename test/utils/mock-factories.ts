import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { User } from '../../src/modules/users/entities/user.entity';
import { Lesson } from '../../src/modules/lessons/entities/lesson.entity';
import { QuizQuestion } from '../../src/modules/quiz/entities/quiz-question.entity';
import { QuizAttempt } from '../../src/modules/quiz/entities/quiz-attempt.entity';
import { UserProgress } from '../../src/modules/progress/entities/user-progress.entity';

/**
 * Factory for creating mock repositories with common methods
 */
export class MockRepositoryFactory {
  static create<T extends Record<string, any>>(): jest.Mocked<Repository<T>> {
    return {
      // Basic CRUD operations
      find: jest.fn(),
      findOne: jest.fn(),
      findOneBy: jest.fn(),
      findOneOrFail: jest.fn(),
      findBy: jest.fn(),
      findAndCount: jest.fn(),
      findAndCountBy: jest.fn(),
      count: jest.fn(),
      countBy: jest.fn(),
      sum: jest.fn(),
      average: jest.fn(),
      minimum: jest.fn(),
      maximum: jest.fn(),
      
      // Save operations
      save: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
      
      // Delete operations
      delete: jest.fn(),
      remove: jest.fn(),
      softDelete: jest.fn(),
      restore: jest.fn(),
      
      // Entity creation
      create: jest.fn(),
      merge: jest.fn(),
      preload: jest.fn(),
      
      // Query builder
      createQueryBuilder: jest.fn(() => ({
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
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        cache: jest.fn().mockReturnThis(),
        
        // Joins
        leftJoin: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        innerJoinAndSelect: jest.fn().mockReturnThis(),
        leftJoinAndMapOne: jest.fn().mockReturnThis(),
        leftJoinAndMapMany: jest.fn().mockReturnThis(),
        innerJoinAndMapOne: jest.fn().mockReturnThis(),
        innerJoinAndMapMany: jest.fn().mockReturnThis(),
        
        // Execution
        getOne: jest.fn(),
        getOneOrFail: jest.fn(),
        getMany: jest.fn(),
        getRawOne: jest.fn(),
        getRawMany: jest.fn(),
        getCount: jest.fn(),
        getManyAndCount: jest.fn(),
        getRawAndEntities: jest.fn(),
        
        // Subqueries
        subQuery: jest.fn().mockReturnThis(),
        
        // Parameters
        setParameter: jest.fn().mockReturnThis(),
        setParameters: jest.fn().mockReturnThis(),
        
        // Locking
        setLock: jest.fn().mockReturnThis(),
        
        // Other
        clone: jest.fn().mockReturnThis(),
        disableEscaping: jest.fn().mockReturnThis(),
        useTransaction: jest.fn().mockReturnThis(),
      })),
      
      // Metadata and other properties
      target: {} as any,
      manager: {} as any,
      metadata: {} as any,
      queryRunner: {} as any,
      
      // Additional methods that might be used
      clear: jest.fn(),
      increment: jest.fn(),
      decrement: jest.fn(),
      exist: jest.fn(),
      existsBy: jest.fn(),
    } as any;
  }

  /**
   * Create a mock repository with pre-configured common behaviors
   */
  static createWithDefaults<T extends Record<string, any>>(entity: new () => T): jest.Mocked<Repository<T>> {
    const mockRepo = this.create<T>();
    
    // Default behaviors
    mockRepo.create.mockImplementation((entityLike: any) => {
      const instance = new entity();
      return Object.assign(instance, entityLike);
    });
    
    mockRepo.save.mockImplementation(async (entity: any) => {
      if (!entity.id) {
        entity.id = `mock-id-${Date.now()}-${Math.random()}`;
      }
      if (!entity.createdAt) {
        entity.createdAt = new Date();
      }
      if (!entity.updatedAt) {
        entity.updatedAt = new Date();
      }
      return entity;
    });
    
    mockRepo.findOneBy.mockResolvedValue(null);
    mockRepo.find.mockResolvedValue([]);
    mockRepo.count.mockResolvedValue(0);
    
    return mockRepo;
  }
}

/**
 * Factory for creating mock services
 */
export class MockServiceFactory {
  static createJwtService(): jest.Mocked<JwtService> {
    return {
      sign: jest.fn().mockReturnValue('mock.jwt.token'),
      signAsync: jest.fn().mockResolvedValue('mock.jwt.token'),
      verify: jest.fn().mockReturnValue({ sub: 'user-id', username: 'user' }),
      verifyAsync: jest.fn().mockResolvedValue({ sub: 'user-id', username: 'user' }),
      decode: jest.fn().mockReturnValue({ sub: 'user-id', username: 'user' }),
    } as any;
  }

  static createUsersService() {
    return {
      findByUsername: jest.fn(),
      findById: jest.fn(),
      createAnonymous: jest.fn(),
      verifyPin: jest.fn(),
      setPin: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findAll: jest.fn(),
      findWithProgress: jest.fn(),
    };
  }

  static createLessonsService() {
    return {
      findAll: jest.fn(),
      findById: jest.fn(),
      findByCategory: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findWithChapters: jest.fn(),
      findPublished: jest.fn(),
    };
  }

  static createQuizService() {
    return {
      findByLessonId: jest.fn(),
      submitAnswer: jest.fn(),
      getAttempts: jest.fn(),
      getHistory: jest.fn(),
      calculateScore: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
  }

  static createProgressService() {
    return {
      getUserProgress: jest.fn(),
      updateProgress: jest.fn(),
      completeLesson: jest.fn(),
      getStreak: jest.fn(),
      getStatistics: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
  }
}

/**
 * Factory for creating test data entities
 */
export class TestEntityFactory {
  static createUser(overrides: Partial<User> = {}): User {
    const user = new User();
    user.id = `user-${Date.now()}-${Math.random()}`;
    user.username = `testuser-${Math.random().toString(36).substr(2, 9)}`;
    user.pinHash = null;
    user.joinedDate = new Date();
    user.updatedAt = new Date();
    user.progressRecords = [];
    user.quizAttempts = [];
    
    return Object.assign(user, overrides);
  }

  static createLesson(overrides: Partial<Lesson> = {}): Lesson {
    const lesson = new Lesson();
    lesson.id = `lesson-${Date.now()}-${Math.random()}`;
    lesson.slug = `test-lesson-${Math.random().toString(36).substr(2, 9)}`;
    lesson.title = `Test Lesson ${Math.random().toString(36).substr(2, 9)}`;
    lesson.category = 'menstrual_health';
    lesson.durationMinutes = 30;
    lesson.isActive = true;
    lesson.createdAt = new Date();
    lesson.updatedAt = new Date();
    lesson.chapters = [];
    
    return Object.assign(lesson, overrides);
  }

  static createQuizQuestion(overrides: Partial<QuizQuestion> = {}): QuizQuestion {
    const question = new QuizQuestion();
    question.id = `question-${Date.now()}-${Math.random()}`;
    // Create a mock lesson if not provided
    if (!overrides.lesson) {
      question.lesson = this.createLesson();
    }
    question.questionText = `Test question ${Math.random().toString(36).substr(2, 9)}?`;
    question.options = ['Option A', 'Option B', 'Option C', 'Option D'];
    question.correctIndex = 0;
    question.explanation = 'Test explanation';
    question.createdAt = new Date();
    
    return Object.assign(question, overrides);
  }

  static createQuizAttempt(overrides: Partial<QuizAttempt> = {}): QuizAttempt {
    const attempt = new QuizAttempt();
    attempt.id = `attempt-${Date.now()}-${Math.random()}`;
    // Create mock user and lesson if not provided
    if (!overrides.user) {
      attempt.user = this.createUser();
    }
    if (!overrides.lesson) {
      attempt.lesson = this.createLesson();
    }
    attempt.totalQuestions = 5;
    attempt.correctAnswers = 4;
    attempt.accuracy = 0.8;
    attempt.completedAt = new Date();
    
    return Object.assign(attempt, overrides);
  }

  static createUserProgress(overrides: Partial<UserProgress> = {}): UserProgress {
    const progress = new UserProgress();
    progress.id = `progress-${Date.now()}-${Math.random()}`;
    // Create mock user and lesson if not provided
    if (!overrides.user) {
      progress.user = this.createUser();
    }
    if (!overrides.lesson) {
      progress.lesson = this.createLesson();
    }
    progress.progress = 0.0;
    progress.currentChapter = 0;
    progress.isCompleted = false;
    progress.updatedAt = new Date();
    
    return Object.assign(progress, overrides);
  }

  /**
   * Create multiple entities of the same type
   */
  static createMultiple<T>(factory: () => T, count: number): T[] {
    return Array.from({ length: count }, factory);
  }

  /**
   * Create entities with relationships
   */
  static createUserWithProgress(userOverrides: Partial<User> = {}, progressCount: number = 3): User {
    const user = this.createUser(userOverrides);
    user.progressRecords = this.createMultiple(() => this.createUserProgress({ user }), progressCount);
    return user;
  }

  static createLessonWithQuestions(lessonOverrides: Partial<Lesson> = {}, questionCount: number = 5): Lesson {
    const lesson = this.createLesson(lessonOverrides);
    // Note: Lesson entity doesn't have quizQuestions property in the current schema
    // This method is kept for backward compatibility but doesn't set the property
    return lesson;
  }
}

/**
 * Utility for creating mock HTTP requests and responses
 */
export class MockHttpFactory {
  static createRequest(overrides: any = {}) {
    return {
      body: {},
      params: {},
      query: {},
      headers: {},
      user: null,
      ...overrides,
    };
  }

  static createResponse() {
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      cookie: jest.fn().mockReturnThis(),
      clearCookie: jest.fn().mockReturnThis(),
      redirect: jest.fn().mockReturnThis(),
      render: jest.fn().mockReturnThis(),
      end: jest.fn().mockReturnThis(),
    };
    return res;
  }

  static createAuthenticatedRequest(user: Partial<User> = {}) {
    return this.createRequest({
      user: {
        id: 'test-user-id',
        username: 'testuser',
        ...user,
      },
    });
  }
}

/**
 * Utility for creating test scenarios
 */
export class TestScenarioFactory {
  /**
   * Create a complete user authentication scenario
   */
  static createAuthScenario() {
    const user = TestEntityFactory.createUser();
    const token = 'test.jwt.token';
    const payload = { sub: user.id, username: user.username };
    
    return { user, token, payload };
  }

  /**
   * Create a lesson completion scenario
   */
  static createLessonCompletionScenario() {
    const user = TestEntityFactory.createUser();
    const lesson = TestEntityFactory.createLessonWithQuestions();
    const progress = TestEntityFactory.createUserProgress({
      user,
      lesson,
      isCompleted: true,
      progress: 1.0,
    });
    
    return { user, lesson, progress };
  }

  /**
   * Create a quiz attempt scenario
   */
  static createQuizAttemptScenario() {
    const user = TestEntityFactory.createUser();
    const lesson = TestEntityFactory.createLessonWithQuestions();
    const attempts = [TestEntityFactory.createQuizAttempt({
      user,
      lesson,
    })];
    
    return { user, lesson, attempts };
  }
}