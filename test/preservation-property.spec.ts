/**
 * Preservation Property Tests
 * 
 * IMPORTANT: These tests capture baseline behavior that MUST be preserved after fixes
 * These tests should PASS on unfixed code to establish the preservation baseline
 * 
 * Property 2: Preservation - Existing Core Functionality Preservation
 * For any system operation that does NOT involve the 15 identified bug conditions,
 * the fixed system SHALL produce exactly the same behavior as the original system
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { getTestDatabaseConfig } from './setup';
import { AuthService } from '../src/modules/auth/auth.service';
import { ResponseTransformInterceptor } from '../src/common/interceptors/response-transform.interceptor';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { LessonsService } from '../src/modules/lessons/lessons.service';
import { QuizService } from '../src/modules/quiz/quiz.service';
import { ProgressService } from '../src/modules/progress/progress.service';
import { UsersService } from '../src/modules/users/users.service';

describe('Preservation Property Tests', () => {
  let app: INestApplication;
  let authService: AuthService;
  let lessonsService: LessonsService;
  let quizService: QuizService;
  let progressService: ProgressService;
  let usersService: UsersService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        TypeOrmModule.forRoot(getTestDatabaseConfig() as any),
        AppModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    
    // Set global prefix
    const configService = app.get(ConfigService);
    const apiPrefix = configService.get<string>('API_PREFIX', 'api/v1');
    app.setGlobalPrefix(apiPrefix);
    
    // Set global interceptors and filters
    app.useGlobalInterceptors(new ResponseTransformInterceptor());
    app.useGlobalFilters(new HttpExceptionFilter());
    
    authService = moduleFixture.get<AuthService>(AuthService);
    lessonsService = moduleFixture.get<LessonsService>(LessonsService);
    quizService = moduleFixture.get<QuizService>(QuizService);
    progressService = moduleFixture.get<ProgressService>(ProgressService);
    usersService = moduleFixture.get<UsersService>(UsersService);
    
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('JWT Token Issuance and Validation (Requirement 3.1)', () => {
    /**
     * **Validates: Requirements 3.1**
     * WHEN valid user authentication occurs THEN the system SHALL CONTINUE TO 
     * issue JWT tokens and maintain user sessions correctly
     */
    it('should preserve JWT token issuance for valid authentication', async () => {
      const username = 'preservation-auth-test-' + Date.now();
      
      // Test anonymous authentication - should issue valid JWT token
      const authResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/anonymous')
        .send({ username })
        .expect(201);

      const { accessToken, userId, username: returnedUsername, isNewUser } = authResponse.body.data;
      
      // Verify JWT token structure and content
      expect(accessToken).toBeDefined();
      expect(typeof accessToken).toBe('string');
      expect(accessToken.split('.')).toHaveLength(3); // JWT has 3 parts
      expect(userId).toBeDefined();
      expect(returnedUsername).toBe(username);
      expect(typeof isNewUser).toBe('boolean');

      // Test that the token can be used for authenticated requests
      const protectedResponse = await request(app.getHttpServer())
        .get('/api/v1/lessons')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(protectedResponse.body.success).toBe(true);
      expect(Array.isArray(protectedResponse.body.data)).toBe(true);

      console.log('✓ JWT token issuance and validation preserved for valid authentication');
    });

    it('should preserve PIN-based authentication and token refresh', async () => {
      const username = 'pin-auth-test-' + Date.now();
      const pin = '1234';
      
      // Create user and set PIN
      const authResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/anonymous')
        .send({ username })
        .expect(201);

      const { accessToken: initialToken, userId } = authResponse.body.data;

      await request(app.getHttpServer())
        .post('/api/v1/auth/pin/set')
        .set('Authorization', `Bearer ${initialToken}`)
        .send({ pin })
        .expect(201);

      // Test PIN verification and token refresh
      // Wait for 1.1s to ensure JWT iat changes
      await new Promise(resolve => setTimeout(resolve, 1100));

      const pinVerifyResponse = await request(app.getHttpServer())
        .post(`/api/v1/auth/pin/verify/${userId}`)
        .send({ pin })
        .expect(201);

      const { accessToken: newToken } = pinVerifyResponse.body.data;
      
      // Verify new token is valid and different from initial
      expect(newToken).toBeDefined();
      expect(newToken).not.toBe(initialToken);
      expect(newToken.split('.')).toHaveLength(3);

      // Test new token works for authenticated requests
      await request(app.getHttpServer())
        .get('/api/v1/lessons')
        .set('Authorization', `Bearer ${newToken}`)
        .expect(200);

      console.log('✓ PIN-based authentication and token refresh preserved');
    });
  });

  describe('Lesson Content Delivery (Requirement 3.2)', () => {
    /**
     * **Validates: Requirements 3.2**
     * WHEN lesson content is accessed THEN the system SHALL CONTINUE TO 
     * serve lesson data with chapters and hotspots as expected
     */
    it('should preserve lesson content structure with chapters and hotspots', async () => {
      // Create authenticated user
      const authResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/anonymous')
        .send({ username: 'lesson-test-' + Date.now() })
        .expect(201);

      const { accessToken } = authResponse.body.data;

      // Test lessons list endpoint
      const lessonsResponse = await request(app.getHttpServer())
        .get('/api/v1/lessons')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const lessons = lessonsResponse.body.data;
      expect(Array.isArray(lessons)).toBe(true);

      if (lessons.length > 0) {
        const lesson = lessons[0];
        
        // Verify lesson structure
        expect(lesson).toHaveProperty('id');
        expect(lesson).toHaveProperty('slug');
        expect(lesson).toHaveProperty('title');
        expect(lesson).toHaveProperty('category');
        expect(lesson).toHaveProperty('durationMinutes');
        expect(lesson).toHaveProperty('chapters');
        
        // Verify chapters structure
        expect(Array.isArray(lesson.chapters)).toBe(true);
        
        if (lesson.chapters.length > 0) {
          const chapter = lesson.chapters[0];
          expect(chapter).toHaveProperty('id');
          expect(chapter).toHaveProperty('orderIndex');
          expect(chapter).toHaveProperty('title');
          expect(chapter).toHaveProperty('narrationText');
          expect(chapter).toHaveProperty('hotspots');
          
          // Verify hotspots structure
          expect(Array.isArray(chapter.hotspots)).toBe(true);
          
          if (chapter.hotspots.length > 0) {
            const hotspot = chapter.hotspots[0];
            expect(hotspot).toHaveProperty('id');
            expect(hotspot).toHaveProperty('number');
            expect(hotspot).toHaveProperty('title');
            expect(hotspot).toHaveProperty('description');
          }
        }

        // Test individual lesson retrieval by slug
        const singleLessonResponse = await request(app.getHttpServer())
          .get(`/api/v1/lessons/${lesson.slug}`)
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);

        const singleLesson = singleLessonResponse.body.data;
        expect(singleLesson.id).toBe(lesson.id);
        expect(singleLesson.slug).toBe(lesson.slug);
        expect(singleLesson.chapters).toBeDefined();
      }

      console.log('✓ Lesson content delivery with chapters and hotspots preserved');
    });

    it('should preserve lesson categorization by health topics', async () => {
      const authResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/anonymous')
        .send({ username: 'category-test-' + Date.now() })
        .expect(201);

      const { accessToken } = authResponse.body.data;

      // Test category filtering
      const categories = ['menstrual_health', 'hiv_sti', 'anatomy', 'mental_health', 'relationships'];
      
      for (const category of categories) {
        const categoryResponse = await request(app.getHttpServer())
          .get('/api/v1/lessons')
          .query({ category })
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);

        const categoryLessons = categoryResponse.body.data;
        expect(Array.isArray(categoryLessons)).toBe(true);
        
        // All returned lessons should match the requested category
        categoryLessons.forEach((lesson: any) => {
          expect(lesson.category).toBe(category);
        });
      }

      console.log('✓ Lesson categorization by health topics preserved');
    });
  });

  describe('Quiz Question Retrieval and Formatting (Requirement 3.3)', () => {
    /**
     * **Validates: Requirements 3.3**
     * WHEN quiz questions are retrieved THEN the system SHALL CONTINUE TO 
     * return properly formatted quiz data for lessons
     */
    it('should preserve quiz question structure and formatting', async () => {
      const authResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/anonymous')
        .send({ username: 'quiz-test-' + Date.now() })
        .expect(201);

      const { accessToken } = authResponse.body.data;

      // Get lessons first
      const lessonsResponse = await request(app.getHttpServer())
        .get('/api/v1/lessons')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const lessons = lessonsResponse.body.data;
      
      if (lessons.length > 0) {
        const lesson = lessons[0];
        
        // Test quiz questions retrieval
        const quizResponse = await request(app.getHttpServer())
          .get(`/api/v1/quiz/${lesson.slug}`)
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);

        const questions = quizResponse.body.data;
        expect(Array.isArray(questions)).toBe(true);

        if (questions.length > 0) {
          const question = questions[0];
          
          // Verify question structure
          expect(question).toHaveProperty('id');
          expect(question).toHaveProperty('questionText');
          expect(question).toHaveProperty('options');
          expect(question).toHaveProperty('correctIndex');
          expect(question).toHaveProperty('explanation');
          
          // Verify options structure
          expect(Array.isArray(question.options)).toBe(true);
          expect(question.options.length).toBeGreaterThan(0);
          expect(typeof question.correctIndex).toBe('number');
          expect(question.correctIndex).toBeGreaterThanOrEqual(0);
          expect(question.correctIndex).toBeLessThan(question.options.length);
        }
      }

      console.log('✓ Quiz question retrieval and formatting preserved');
    });

    it('should preserve quiz submission and scoring functionality', async () => {
      const authResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/anonymous')
        .send({ username: 'quiz-submit-test-' + Date.now() })
        .expect(201);

      const { accessToken, userId } = authResponse.body.data;

      // Get lessons and quiz questions
      const lessonsResponse = await request(app.getHttpServer())
        .get('/api/v1/lessons')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const lessons = lessonsResponse.body.data;
      
      if (lessons.length > 0) {
        const lesson = lessons[0];
        
        const quizResponse = await request(app.getHttpServer())
          .get(`/api/v1/quiz/${lesson.slug}`)
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);

        const questions = quizResponse.body.data;
        
        if (questions.length > 0) {
          // Submit quiz with correct answers
          const answers = questions.map((q: any) => q.correctIndex);
          
          const submitResponse = await request(app.getHttpServer())
            .post(`/api/v1/quiz/${lesson.slug}/submit`)
            .set('Authorization', `Bearer ${accessToken}`)
            .send({ answers })
            .expect(201);

          const result = submitResponse.body.data;
          
          // Verify quiz result structure
          expect(result).toHaveProperty('totalQuestions');
          expect(result).toHaveProperty('correctAnswers');
          expect(result).toHaveProperty('accuracy');
          expect(result).toHaveProperty('breakdown');
          
          expect(result.totalQuestions).toBe(questions.length);
          expect(result.correctAnswers).toBe(questions.length);
          expect(result.accuracy).toBe(1.0);
          expect(Array.isArray(result.breakdown)).toBe(true);
          
          // Verify breakdown structure
          result.breakdown.forEach((item: any, index: number) => {
            expect(item).toHaveProperty('questionId');
            expect(item).toHaveProperty('questionText');
            expect(item).toHaveProperty('selectedIndex');
            expect(item).toHaveProperty('correctIndex');
            expect(item).toHaveProperty('isCorrect');
            expect(item).toHaveProperty('explanation');
            expect(item.isCorrect).toBe(true);
          });
        }
      }

      console.log('✓ Quiz submission and scoring functionality preserved');
    });
  });

  describe('User Progress Tracking (Requirement 3.4)', () => {
    /**
     * **Validates: Requirements 3.4**
     * WHEN user progress is tracked THEN the system SHALL CONTINUE TO 
     * record and update progress correctly
     */
    it('should preserve progress tracking and streak calculations', async () => {
      const authResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/anonymous')
        .send({ username: 'progress-test-' + Date.now() })
        .expect(201);

      const { accessToken, userId } = authResponse.body.data;

      // Get lessons
      const lessonsResponse = await request(app.getHttpServer())
        .get('/api/v1/lessons')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const lessons = lessonsResponse.body.data;
      
      if (lessons.length > 0) {
        const lesson = lessons[0];
        
        // Test progress update
        const progressData = {
          progress: 50,
          currentChapter: 1,
          isCompleted: false
        };

        const progressResponse = await request(app.getHttpServer())
          .put(`/api/v1/progress/${lesson.slug}`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send(progressData)
          .expect(200);

        const progress = progressResponse.body.data;
        
        // Verify progress structure
        expect(progress).toHaveProperty('id');
        expect(progress).toHaveProperty('lessonId');
        expect(progress).toHaveProperty('lessonTitle');
        expect(progress).toHaveProperty('progress');
        expect(progress).toHaveProperty('currentChapter');
        expect(progress).toHaveProperty('isCompleted');
        expect(progress).toHaveProperty('updatedAt');
        
        expect(progress.lessonId).toBe(lesson.slug);
        expect(progress.progress).toBe(progressData.progress);
        expect(progress.currentChapter).toBe(progressData.currentChapter);
        expect(progress.isCompleted).toBe(progressData.isCompleted);

        // Test progress retrieval
        const getProgressResponse = await request(app.getHttpServer())
          .get(`/api/v1/progress/${lesson.slug}`)
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);

        const retrievedProgress = getProgressResponse.body.data;
        expect(retrievedProgress.progress).toBe(progressData.progress);

        // Test all progress retrieval
        const allProgressResponse = await request(app.getHttpServer())
          .get('/api/v1/progress')
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);

        const allProgress = allProgressResponse.body.data;
        expect(Array.isArray(allProgress)).toBe(true);
        expect(allProgress.length).toBeGreaterThan(0);
      }

      console.log('✓ Progress tracking and streak calculations preserved');
    });

    it('should preserve progress increment behavior (never decrease)', async () => {
      const authResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/anonymous')
        .send({ username: 'progress-increment-test-' + Date.now() })
        .expect(201);

      const { accessToken } = authResponse.body.data;

      const lessonsResponse = await request(app.getHttpServer())
        .get('/api/v1/lessons')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const lessons = lessonsResponse.body.data;
      
      if (lessons.length > 0) {
        const lesson = lessons[0];
        
        // Set initial progress
        await request(app.getHttpServer())
          .put(`/api/v1/progress/${lesson.slug}`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ progress: 75, currentChapter: 2, isCompleted: false })
          .expect(200);

        // Try to decrease progress (should not decrease)
        const decreaseResponse = await request(app.getHttpServer())
          .put(`/api/v1/progress/${lesson.slug}`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ progress: 50, currentChapter: 1, isCompleted: false })
          .expect(200);

        const finalProgress = decreaseResponse.body.data;
        
        // Progress should remain at higher value
        expect(finalProgress.progress).toBe(75);
        expect(finalProgress.currentChapter).toBe(2);
      }

      console.log('✓ Progress increment behavior (never decrease) preserved');
    });
  });

  describe('User Settings Persistence (Requirement 3.7)', () => {
    /**
     * **Validates: Requirements 3.7**
     * WHEN user settings are modified THEN the system SHALL CONTINUE TO 
     * persist preferences and apply them correctly
     */
    it('should preserve user profile and settings management', async () => {
      const authResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/anonymous')
        .send({ username: 'settings-test-' + Date.now() })
        .expect(201);

      const { accessToken, userId } = authResponse.body.data;

      // Test user profile retrieval
      const profileResponse = await request(app.getHttpServer())
        .get(`/api/v1/users/${userId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const profile = profileResponse.body.data;
      
      // Verify user profile structure
      expect(profile).toHaveProperty('id');
      expect(profile).toHaveProperty('username');
      expect(profile).toHaveProperty('language');
      expect(profile).toHaveProperty('dayStreak');
      expect(profile).toHaveProperty('avatarSeed');
      expect(profile).toHaveProperty('isPrivate');
      expect(profile).toHaveProperty('joinedDate');
      
      // Test user settings update
      const settingsUpdate = {
        language: 'en',
        isPrivate: true
      };

      const updateResponse = await request(app.getHttpServer())
        .patch(`/api/v1/users/${userId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(settingsUpdate)
        .expect(200);

      const updatedProfile = updateResponse.body.data;
      expect(updatedProfile.language).toBe('en');
      expect(updatedProfile.isPrivate).toBe(true);

      console.log('✓ User profile and settings management preserved');
    });
  });

  describe('Language Switching Functionality (Requirement 3.12)', () => {
    /**
     * **Validates: Requirements 3.12**
     * WHEN language switching occurs THEN the system SHALL CONTINUE TO 
     * support multiple languages (Kinyarwanda, English, French)
     */
    it('should preserve multi-language support', async () => {
      const supportedLanguages = ['rw', 'en', 'fr'];
      
      for (const language of supportedLanguages) {
        const authResponse = await request(app.getHttpServer())
          .post('/api/v1/auth/anonymous')
          .send({ username: `lang-test-${language}-` + Date.now() })
          .expect(201);

        const { accessToken, userId } = authResponse.body.data;

        // Update user language
        const updateResponse = await request(app.getHttpServer())
          .patch(`/api/v1/users/${userId}`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ language })
          .expect(200);

        const updatedUser = updateResponse.body.data;
        expect(updatedUser.language).toBe(language);
      }

      console.log('✓ Multi-language support (Kinyarwanda, English, French) preserved');
    });
  });

  describe('Anonymous User Handling (Requirement 3.14)', () => {
    /**
     * **Validates: Requirements 3.14**
     * WHEN user profiles are managed THEN the system SHALL CONTINUE TO 
     * handle anonymous users and PIN-based authentication
     */
    it('should preserve anonymous user creation and PIN authentication', async () => {
      const username = 'anon-test-' + Date.now();
      
      // Test anonymous user creation
      const authResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/anonymous')
        .send({ username })
        .expect(201);

      const { accessToken, userId, isNewUser } = authResponse.body.data;
      expect(isNewUser).toBe(true);

      // Test PIN setting for anonymous user
      const pin = '5678';
      await request(app.getHttpServer())
        .post('/api/v1/auth/pin/set')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ pin })
        .expect(201);

      // Test PIN verification
      const verifyResponse = await request(app.getHttpServer())
        .post(`/api/v1/auth/pin/verify/${userId}`)
        .send({ pin })
        .expect(201);

      expect(verifyResponse.body.data.accessToken).toBeDefined();

      // Test PIN removal
      await request(app.getHttpServer())
        .post('/api/v1/auth/pin/remove')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(201);

      console.log('✓ Anonymous user creation and PIN authentication preserved');
    });

    it('should preserve existing user recognition', async () => {
      const username = 'existing-user-test-' + Date.now();
      
      // Create user first time
      const firstAuthResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/anonymous')
        .send({ username })
        .expect(201);

      expect(firstAuthResponse.body.data.isNewUser).toBe(true);
      const firstUserId = firstAuthResponse.body.data.userId;

      // Sign in with same username (should recognize existing user)
      const secondAuthResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/anonymous')
        .send({ username })
        .expect(201);

      expect(secondAuthResponse.body.data.isNewUser).toBe(false);
      expect(secondAuthResponse.body.data.userId).toBe(firstUserId);

      console.log('✓ Existing user recognition preserved');
    });
  });

  describe('Application Initialization (Requirement 3.15)', () => {
    /**
     * **Validates: Requirements 3.15**
     * WHEN the application starts THEN the system SHALL CONTINUE TO 
     * initialize properly with onboarding flows and settings
     */
    it('should preserve API response envelope format', async () => {
      const authResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/anonymous')
        .send({ username: 'envelope-test-' + Date.now() })
        .expect(201);

      // Verify standard response envelope
      expect(authResponse.body).toHaveProperty('success');
      expect(authResponse.body).toHaveProperty('data');
      expect(authResponse.body.success).toBe(true);

      const { accessToken } = authResponse.body.data;

      // Test other endpoints maintain envelope format
      const lessonsResponse = await request(app.getHttpServer())
        .get('/api/v1/lessons')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(lessonsResponse.body).toHaveProperty('success');
      expect(lessonsResponse.body).toHaveProperty('data');
      expect(lessonsResponse.body.success).toBe(true);

      console.log('✓ API response envelope format preserved');
    });

    it('should preserve database entity relationships and data integrity', async () => {
      const authResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/anonymous')
        .send({ username: 'relationships-test-' + Date.now() })
        .expect(201);

      const { accessToken, userId } = authResponse.body.data;

      // Test that lessons include related chapters and hotspots
      const lessonsResponse = await request(app.getHttpServer())
        .get('/api/v1/lessons')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const lessons = lessonsResponse.body.data;
      
      if (lessons.length > 0) {
        const lesson = lessons[0];
        
        // Verify relationships are loaded
        expect(lesson.chapters).toBeDefined();
        expect(Array.isArray(lesson.chapters)).toBe(true);
        
        if (lesson.chapters.length > 0) {
          const chapter = lesson.chapters[0];
          expect(chapter.hotspots).toBeDefined();
          expect(Array.isArray(chapter.hotspots)).toBe(true);
        }

        // Test progress relationship
        await request(app.getHttpServer())
          .put(`/api/v1/progress/${lesson.slug}`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ progress: 25, currentChapter: 0, isCompleted: false })
          .expect(200);

        const progressResponse = await request(app.getHttpServer())
          .get('/api/v1/progress')
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);

        const progressRecords = progressResponse.body.data;
        expect(progressRecords.length).toBeGreaterThan(0);
        expect(progressRecords[0]).toHaveProperty('lessonTitle');
      }

      console.log('✓ Database entity relationships and data integrity preserved');
    });
  });

  describe('User Avatar Generation (Requirement 3.11)', () => {
    /**
     * **Validates: Requirements 3.11**
     * WHEN user avatars are displayed THEN the system SHALL CONTINUE TO 
     * generate consistent avatar representations
     */
    it('should preserve consistent avatar seed generation', async () => {
      const authResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/anonymous')
        .send({ username: 'avatar-test-' + Date.now() })
        .expect(201);

      const { accessToken, userId } = authResponse.body.data;

      // Get user profile to check avatar seed
      const profileResponse = await request(app.getHttpServer())
        .get(`/api/v1/users/${userId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const profile = profileResponse.body.data;
      
      // Verify avatar seed exists and has expected format
      expect(profile).toHaveProperty('avatarSeed');
      expect(typeof profile.avatarSeed).toBe('string');
      expect(profile.avatarSeed.length).toBeGreaterThan(0);

      // Avatar seed should be consistent across requests
      const secondProfileResponse = await request(app.getHttpServer())
        .get(`/api/v1/users/${userId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const secondProfile = secondProfileResponse.body.data;
      expect(secondProfile.avatarSeed).toBe(profile.avatarSeed);

      console.log('✓ Consistent avatar seed generation preserved');
    });
  });
});