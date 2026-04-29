import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Between, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { QuizQuestion } from './entities/quiz-question.entity';
import { QuizAttempt } from './entities/quiz-attempt.entity';
import { LessonsService } from '../lessons/lessons.service';
import { UsersService } from '../users/users.service';
import { BaseService } from '../../common/services/base.service';
import { Transactional } from '../../common/decorators/transactional.decorator';
import type {
  SubmitQuizDto,
  QuizResultDto,
  QuestionBreakdownDto,
} from './dto/quiz.dto';
import type {
  QuizHistoryQueryDto,
  QuizHistoryResponseDto,
  QuizAttemptSummaryDto,
  QuizStatisticsDto,
  QuizPerformanceMetricsDto,
} from './dto/quiz-history.dto';

@Injectable()
export class QuizService extends BaseService<QuizAttempt> {
  constructor(
    @InjectRepository(QuizQuestion)
    private readonly questionRepo: Repository<QuizQuestion>,
    @InjectRepository(QuizAttempt)
    private readonly attemptRepo: Repository<QuizAttempt>,
    private readonly lessonsService: LessonsService,
    private readonly usersService: UsersService,
    protected readonly dataSource: DataSource,
  ) {
    super(attemptRepo, dataSource);
  }

  /** Return all active questions for a lesson (accepts UUID or slug). */
  async getQuestionsForLesson(lessonIdOrSlug: string): Promise<QuizQuestion[]> {
    // Resolve to UUID first so the relation filter works correctly
    const lesson = await this.lessonsService.findOne(lessonIdOrSlug);
    return this.questionRepo.find({
      where: { lesson: { id: lesson.id }, isActive: true },
      order: { createdAt: 'ASC' },
    });
  }

  @Transactional({ 
    isolationLevel: 'READ_COMMITTED',
    timeout: 10000 
  })
  async submitQuiz(
    lessonIdOrSlug: string,
    userId: string,
    dto: SubmitQuizDto,
  ): Promise<QuizResultDto> {
    const lesson = await this.lessonsService.findOne(lessonIdOrSlug);
    const [user, questions] = await Promise.all([
      this.usersService.findById(userId),
      this.getQuestionsForLesson(lesson.id),
    ]);

    if (dto.answers.length !== questions.length) {
      throw new NotFoundException(
        `Expected ${questions.length} answers, received ${dto.answers.length}`,
      );
    }

    const breakdown: QuestionBreakdownDto[] = questions.map((q: QuizQuestion, i: number) => ({
      questionId: q.id,
      questionText: q.questionText,
      selectedIndex: dto.answers[i],
      correctIndex: q.correctIndex,
      isCorrect: dto.answers[i] === q.correctIndex,
      explanation: q.explanation,
    }));

    const correctAnswers = breakdown.filter((b) => b.isCorrect).length;
    const totalQuestions = questions.length;
    const accuracy = totalQuestions > 0 ? correctAnswers / totalQuestions : 0;

    return this.runInTransaction(async (queryRunner) => {
      // Persist the attempt
      const attempt = queryRunner.manager.create(QuizAttempt, {
        user,
        lesson,
        totalQuestions,
        correctAnswers,
        accuracy,
      });
      await queryRunner.manager.save(attempt);

      // Update daily streak within the same transaction
      const userEntity = await queryRunner.manager.findOne('User', { where: { id: userId } }) as any;
      if (userEntity) {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const lastActive = userEntity.lastActiveDate ? new Date(userEntity.lastActiveDate) : null;
        const lastActiveDay = lastActive ? new Date(lastActive.getFullYear(), lastActive.getMonth(), lastActive.getDate()) : null;

        let streak = userEntity.dayStreak || 0;

        if (!lastActiveDay) {
          streak = 1;
        } else {
          const daysDiff = Math.floor((today.getTime() - lastActiveDay.getTime()) / (1000 * 60 * 60 * 24));
          
          if (daysDiff === 0) {
            // Same day, no change
          } else if (daysDiff === 1) {
            streak += 1;
          } else {
            streak = 1;
          }
        }

        await queryRunner.manager.update('User', userId, { 
          dayStreak: streak, 
          lastActiveDate: now 
        });
      }

      return { totalQuestions, correctAnswers, accuracy, breakdown };
    }, {
      isolationLevel: 'READ_COMMITTED',
      timeout: 10000
    });
  }

  async getAttemptHistory(userId: string): Promise<QuizAttempt[]> {
    return this.attemptRepo.find({
      where: { user: { id: userId } },
      relations: ['lesson'],
      order: { completedAt: 'DESC' },
    });
  }

  /**
   * Get comprehensive quiz history with pagination, filtering, and statistics
   */
  async getQuizHistory(
    userId: string, 
    query: QuizHistoryQueryDto = {}
  ): Promise<QuizHistoryResponseDto> {
    const { 
      page = 1, 
      limit = 10, 
      lessonId, 
      fromDate, 
      toDate, 
      minAccuracy, 
      maxAccuracy 
    } = query;

    // Build where conditions
    const whereConditions: any = { user: { id: userId } };
    
    if (lessonId) {
      // Handle both UUID and slug
      try {
        const lesson = await this.lessonsService.findOne(lessonId);
        whereConditions.lesson = { id: lesson.id };
      } catch {
        // If lesson not found, return empty results
        return this.createEmptyHistoryResponse(page, limit);
      }
    }

    if (fromDate && toDate) {
      whereConditions.completedAt = Between(new Date(fromDate), new Date(toDate));
    } else if (fromDate) {
      whereConditions.completedAt = MoreThanOrEqual(new Date(fromDate));
    } else if (toDate) {
      whereConditions.completedAt = LessThanOrEqual(new Date(toDate));
    }

    // Get paginated attempts
    const [attempts, total] = await this.attemptRepo.findAndCount({
      where: whereConditions,
      relations: ['lesson'],
      order: { completedAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    // Filter by accuracy if specified
    let filteredAttempts = attempts;
    if (minAccuracy !== undefined || maxAccuracy !== undefined) {
      filteredAttempts = attempts.filter(attempt => {
        const accuracyPercent = attempt.accuracy * 100;
        if (minAccuracy !== undefined && accuracyPercent < minAccuracy) return false;
        if (maxAccuracy !== undefined && accuracyPercent > maxAccuracy) return false;
        return true;
      });
    }

    // Convert to DTOs
    const attemptSummaries = filteredAttempts.map(this.toAttemptSummaryDto);

    // Get statistics
    const statistics = await this.getQuizStatistics(userId);

    // Build pagination metadata
    const totalPages = Math.ceil(total / limit);
    const pagination = {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1,
    };

    return {
      attempts: attemptSummaries,
      statistics,
      pagination,
    };
  }

  /**
   * Get comprehensive quiz statistics for a user
   */
  async getQuizStatistics(userId: string): Promise<QuizStatisticsDto> {
    const attempts = await this.attemptRepo.find({
      where: { user: { id: userId } },
      relations: ['lesson'],
      order: { completedAt: 'DESC' },
    });

    if (attempts.length === 0) {
      return this.createEmptyStatistics();
    }

    const totalAttempts = attempts.length;
    const uniqueLessons = new Set(attempts.map(a => a.lesson.id)).size;
    const averageAccuracy = attempts.reduce((sum, a) => sum + a.accuracy, 0) / totalAttempts;
    const bestAccuracy = Math.max(...attempts.map(a => a.accuracy));
    const lastAttemptDate = attempts[0].completedAt;
    const totalTimeSpent = attempts.reduce((sum, a) => sum + ((a as any).timeSpent || 0), 0);

    // Grade distribution
    const gradeDistribution = { A: 0, B: 0, C: 0, D: 0, F: 0 };
    attempts.forEach(attempt => {
      const grade = this.calculateGrade(attempt.accuracy);
      gradeDistribution[grade]++;
    });

    // Accuracy trend (last 10 attempts)
    const recentAttempts = attempts.slice(0, 10).reverse();
    const accuracyTrend = recentAttempts.map((attempt, index) => ({
      attemptNumber: index + 1,
      accuracy: attempt.accuracy,
      date: attempt.completedAt,
    }));

    // Performance by category
    const categoryMap = new Map<string, { attempts: number; totalAccuracy: number }>();
    attempts.forEach(attempt => {
      const category = attempt.lesson.category || 'General';
      const existing = categoryMap.get(category) || { attempts: 0, totalAccuracy: 0 };
      categoryMap.set(category, {
        attempts: existing.attempts + 1,
        totalAccuracy: existing.totalAccuracy + attempt.accuracy,
      });
    });

    const categoryPerformance = Array.from(categoryMap.entries()).map(([category, data]) => ({
      category,
      attempts: data.attempts,
      averageAccuracy: data.totalAccuracy / data.attempts,
    }));

    return {
      totalAttempts,
      uniqueLessons,
      averageAccuracy,
      bestAccuracy,
      lastAttemptDate,
      totalTimeSpent,
      gradeDistribution,
      accuracyTrend,
      categoryPerformance,
    };
  }

  /**
   * Get performance metrics with trend analysis
   */
  async getPerformanceMetrics(userId: string): Promise<QuizPerformanceMetricsDto> {
    const attempts = await this.attemptRepo.find({
      where: { user: { id: userId } },
      relations: ['lesson'],
      order: { completedAt: 'ASC' },
    });

    if (attempts.length === 0) {
      return this.createEmptyMetrics(userId);
    }

    // Group by time periods
    const daily = this.groupAttemptsByDay(attempts);
    const weekly = this.groupAttemptsByWeek(attempts);
    const monthly = this.groupAttemptsByMonth(attempts);

    // Calculate improvement indicators
    const improvement = this.calculateImprovement(attempts);

    return {
      userId,
      metrics: { daily, weekly, monthly },
      improvement,
    };
  }

  private toAttemptSummaryDto(attempt: QuizAttempt): QuizAttemptSummaryDto {
    const accuracyPercentage = Math.round(attempt.accuracy * 100);
    return {
      id: attempt.id,
      lesson: {
        id: attempt.lesson.id,
        slug: attempt.lesson.slug,
        title: attempt.lesson.title,
        category: attempt.lesson.category,
      },
      totalQuestions: attempt.totalQuestions,
      correctAnswers: attempt.correctAnswers,
      accuracy: attempt.accuracy,
      accuracyPercentage: `${accuracyPercentage}%`,
      completedAt: attempt.completedAt,
      timeSpent: (attempt as any).timeSpent,
      grade: this.calculateGrade(attempt.accuracy),
    };
  }

  private calculateGrade(accuracy: number): 'A' | 'B' | 'C' | 'D' | 'F' {
    const percentage = accuracy * 100;
    if (percentage >= 90) return 'A';
    if (percentage >= 80) return 'B';
    if (percentage >= 70) return 'C';
    if (percentage >= 60) return 'D';
    return 'F';
  }

  private createEmptyHistoryResponse(page: number, limit: number): QuizHistoryResponseDto {
    return {
      attempts: [],
      statistics: this.createEmptyStatistics(),
      pagination: {
        page,
        limit,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrevious: false,
      },
    };
  }

  private createEmptyStatistics(): QuizStatisticsDto {
    return {
      totalAttempts: 0,
      uniqueLessons: 0,
      averageAccuracy: 0,
      bestAccuracy: 0,
      totalTimeSpent: 0,
      gradeDistribution: { A: 0, B: 0, C: 0, D: 0, F: 0 },
      accuracyTrend: [],
      categoryPerformance: [],
    };
  }

  private createEmptyMetrics(userId: string): QuizPerformanceMetricsDto {
    return {
      userId,
      metrics: { daily: [], weekly: [], monthly: [] },
      improvement: {
        accuracyChange: 0,
        consistencyScore: 0,
        learningVelocity: 0,
      },
    };
  }

  private groupAttemptsByDay(attempts: QuizAttempt[]) {
    const groups = new Map<string, { attempts: number; totalAccuracy: number }>();
    
    attempts.forEach(attempt => {
      const date = attempt.completedAt.toISOString().split('T')[0];
      const existing = groups.get(date) || { attempts: 0, totalAccuracy: 0 };
      groups.set(date, {
        attempts: existing.attempts + 1,
        totalAccuracy: existing.totalAccuracy + attempt.accuracy,
      });
    });

    return Array.from(groups.entries()).map(([date, data]) => ({
      date,
      attempts: data.attempts,
      averageAccuracy: data.totalAccuracy / data.attempts,
    }));
  }

  private groupAttemptsByWeek(attempts: QuizAttempt[]) {
    const groups = new Map<string, { attempts: number; totalAccuracy: number }>();
    
    attempts.forEach(attempt => {
      const date = new Date(attempt.completedAt);
      const year = date.getFullYear();
      const week = this.getWeekNumber(date);
      const weekKey = `${year}-W${week.toString().padStart(2, '0')}`;
      
      const existing = groups.get(weekKey) || { attempts: 0, totalAccuracy: 0 };
      groups.set(weekKey, {
        attempts: existing.attempts + 1,
        totalAccuracy: existing.totalAccuracy + attempt.accuracy,
      });
    });

    return Array.from(groups.entries()).map(([week, data]) => ({
      week,
      attempts: data.attempts,
      averageAccuracy: data.totalAccuracy / data.attempts,
    }));
  }

  private groupAttemptsByMonth(attempts: QuizAttempt[]) {
    const groups = new Map<string, { attempts: number; totalAccuracy: number }>();
    
    attempts.forEach(attempt => {
      const date = new Date(attempt.completedAt);
      const month = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      
      const existing = groups.get(month) || { attempts: 0, totalAccuracy: 0 };
      groups.set(month, {
        attempts: existing.attempts + 1,
        totalAccuracy: existing.totalAccuracy + attempt.accuracy,
      });
    });

    return Array.from(groups.entries()).map(([month, data]) => ({
      month,
      attempts: data.attempts,
      averageAccuracy: data.totalAccuracy / data.attempts,
    }));
  }

  private getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  }

  private calculateImprovement(attempts: QuizAttempt[]) {
    if (attempts.length < 2) {
      return {
        accuracyChange: 0,
        consistencyScore: 0,
        learningVelocity: 0,
      };
    }

    // Calculate accuracy change (first 5 vs last 5 attempts)
    const firstFive = attempts.slice(0, Math.min(5, attempts.length));
    const lastFive = attempts.slice(-Math.min(5, attempts.length));
    
    const firstAvg = firstFive.reduce((sum, a) => sum + a.accuracy, 0) / firstFive.length;
    const lastAvg = lastFive.reduce((sum, a) => sum + a.accuracy, 0) / lastFive.length;
    const accuracyChange = lastAvg - firstAvg;

    // Calculate consistency (inverse of standard deviation)
    const accuracies = attempts.map(a => a.accuracy);
    const mean = accuracies.reduce((sum, acc) => sum + acc, 0) / accuracies.length;
    const variance = accuracies.reduce((sum, acc) => sum + Math.pow(acc - mean, 2), 0) / accuracies.length;
    const stdDev = Math.sqrt(variance);
    const consistencyScore = Math.max(0, 1 - stdDev);

    // Calculate learning velocity (improvement rate over time)
    const timeSpan = attempts[attempts.length - 1].completedAt.getTime() - attempts[0].completedAt.getTime();
    const timeSpanDays = timeSpan / (1000 * 60 * 60 * 24);
    const learningVelocity = timeSpanDays > 0 ? accuracyChange / timeSpanDays : 0;

    return {
      accuracyChange,
      consistencyScore,
      learningVelocity,
    };
  }
}
