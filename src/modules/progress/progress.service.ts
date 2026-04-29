import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { UserProgress } from './entities/user-progress.entity';
import { LessonsService } from '../lessons/lessons.service';
import { UsersService } from '../users/users.service';
import { BaseService } from '../../common/services/base.service';
import { Transactional, TransactionalOptions } from '../../common/decorators/transactional.decorator';
import type { UpdateProgressDto, ProgressResponseDto } from './dto/progress.dto';

@Injectable()
export class ProgressService extends BaseService<UserProgress> {
  constructor(
    @InjectRepository(UserProgress)
    private readonly progressRepo: Repository<UserProgress>,
    private readonly lessonsService: LessonsService,
    private readonly usersService: UsersService,
    protected readonly dataSource: DataSource,
  ) {
    super(progressRepo, dataSource);
  }

  async getAll(userId: string): Promise<ProgressResponseDto[]> {
    const records = await this.repository.find({
      where: { user: { id: userId } },
      relations: ['lesson'],
      order: { updatedAt: 'DESC' },
    });
    return records.map(this.toDto);
  }

  async getForLesson(
    userId: string,
    lessonIdOrSlug: string,
  ): Promise<ProgressResponseDto | null> {
    const lesson = await this.lessonsService.findOne(lessonIdOrSlug);
    const record = await this.repository.findOne({
      where: { user: { id: userId }, lesson: { id: lesson.id } },
      relations: ['lesson'],
    });
    return record ? this.toDto(record) : null;
  }

  @Transactional({ 
    isolationLevel: 'READ_COMMITTED',
    timeout: 10000,
    retryAttempts: 2 
  })
  async upsert(
    userId: string,
    lessonIdOrSlug: string,
    dto: UpdateProgressDto,
  ): Promise<ProgressResponseDto> {
    const [user, lesson] = await Promise.all([
      this.usersService.findOneOrThrow({ where: { id: userId as any } }),
      this.lessonsService.findOne(lessonIdOrSlug),
    ]);

    return this.runInTransaction(async (queryRunner) => {
      let record = await queryRunner.manager.findOne(UserProgress, {
        where: { user: { id: userId }, lesson: { id: lesson.id } },
      });

      if (record) {
        // Only allow progress to increase, never decrease
        record.progress = Math.max(record.progress, dto.progress);
        record.currentChapter = Math.max(record.currentChapter, dto.currentChapter);
        if (dto.isCompleted !== undefined) record.isCompleted = dto.isCompleted;
      } else {
        record = queryRunner.manager.create(UserProgress, {
          user,
          lesson,
          progress: dto.progress,
          currentChapter: dto.currentChapter,
          isCompleted: dto.isCompleted ?? false,
        });
      }

      const saved = await queryRunner.manager.save(record);

      // Update streak whenever progress is recorded - this is also transactional
      await this.updateUserStreakInTransaction(queryRunner, userId);

      const withRelation = await queryRunner.manager.findOne(UserProgress, {
        where: { id: saved.id },
        relations: ['lesson'],
      });

      return this.toDto(withRelation!);
    }, {
      isolationLevel: 'READ_COMMITTED',
      timeout: 10000,
      retryAttempts: 2
    });
  }

  private toDto(record: UserProgress): ProgressResponseDto {
    return {
      id:             record.id,
      lessonId:       record.lesson.slug,   // use slug so frontend can match
      lessonTitle:    record.lesson.title,
      progress:       record.progress,
      currentChapter: record.currentChapter,
      isCompleted:    record.isCompleted,
      updatedAt:      record.updatedAt,
    };
  }

  /**
   * Update user streak within an existing transaction
   */
  private async updateUserStreakInTransaction(queryRunner: any, userId: string): Promise<void> {
    const user = await queryRunner.manager.findOne('User', { where: { id: userId } });
    if (!user) return;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const lastActive = user.lastActiveDate ? new Date(user.lastActiveDate) : null;
    const lastActiveDay = lastActive ? new Date(lastActive.getFullYear(), lastActive.getMonth(), lastActive.getDate()) : null;

    let streak = user.dayStreak || 0;

    if (!lastActiveDay) {
      // First time user
      streak = 1;
    } else {
      const daysDiff = Math.floor((today.getTime() - lastActiveDay.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff === 0) {
        // Same day, no change to streak
        return;
      } else if (daysDiff === 1) {
        // Consecutive day
        streak += 1;
      } else {
        // Streak broken
        streak = 1;
      }
    }

    await queryRunner.manager.update('User', userId, { 
      dayStreak: streak, 
      lastActiveDate: now 
    });
  }

  /**
   * Batch update multiple progress records in a single transaction
   */
  @Transactional({ 
    isolationLevel: 'REPEATABLE_READ',
    timeout: 15000,
    retryAttempts: 3 
  })
  async batchUpdateProgress(
    userId: string,
    updates: Array<{ lessonIdOrSlug: string; dto: UpdateProgressDto }>
  ): Promise<ProgressResponseDto[]> {
    const user = await this.usersService.findOneOrThrow({ where: { id: userId as any } });
    
    return this.runInTransaction(async (queryRunner) => {
      const results: ProgressResponseDto[] = [];
      
      for (const update of updates) {
        const lesson = await this.lessonsService.findOne(update.lessonIdOrSlug);
        
        let record = await queryRunner.manager.findOne(UserProgress, {
          where: { user: { id: userId }, lesson: { id: lesson.id } },
        });

        if (record) {
          record.progress = Math.max(record.progress, update.dto.progress);
          record.currentChapter = Math.max(record.currentChapter, update.dto.currentChapter);
          if (update.dto.isCompleted !== undefined) record.isCompleted = update.dto.isCompleted;
        } else {
          record = queryRunner.manager.create(UserProgress, {
            user,
            lesson,
            progress: update.dto.progress,
            currentChapter: update.dto.currentChapter,
            isCompleted: update.dto.isCompleted ?? false,
          });
        }

        const saved = await queryRunner.manager.save(record);
        const withRelation = await queryRunner.manager.findOne(UserProgress, {
          where: { id: saved.id },
          relations: ['lesson'],
        });
        
        results.push(this.toDto(withRelation!));
      }

      // Update streak once after all progress updates
      await this.updateUserStreakInTransaction(queryRunner, userId);
      
      return results;
    }, {
      isolationLevel: 'REPEATABLE_READ',
      timeout: 15000,
      retryAttempts: 3
    });
  }

  /**
   * Reset user progress for a lesson with proper transaction management
   */
  @Transactional({ 
    isolationLevel: 'READ_COMMITTED',
    timeout: 5000 
  })
  async resetLessonProgress(userId: string, lessonIdOrSlug: string): Promise<void> {
    const lesson = await this.lessonsService.findOne(lessonIdOrSlug);
    
    return this.runInTransaction(async (queryRunner) => {
      await queryRunner.manager.delete(UserProgress, {
        user: { id: userId },
        lesson: { id: lesson.id }
      });
    }, {
      isolationLevel: 'READ_COMMITTED',
      timeout: 5000
    });
  }
}
