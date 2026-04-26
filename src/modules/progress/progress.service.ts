import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { UserProgress } from './entities/user-progress.entity';
import { LessonsService } from '../lessons/lessons.service';
import { UsersService } from '../users/users.service';
import { BaseService } from '../../common/services/base.service';
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

      // Update streak whenever progress is recorded
      await this.usersService.touchStreak(userId);

      const withRelation = await queryRunner.manager.findOne(UserProgress, {
        where: { id: saved.id },
        relations: ['lesson'],
      });

      return this.toDto(withRelation!);
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
}
