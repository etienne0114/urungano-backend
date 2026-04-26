import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { Lesson, type LessonCategory } from './entities/lesson.entity';
import { BaseService } from '../../common/services/base.service';

@Injectable()
export class LessonsService extends BaseService<Lesson> {
  private readonly modelDir = path.join(process.cwd(), 'public', 'models');

  constructor(
    @InjectRepository(Lesson)
    private readonly lessonRepo: Repository<Lesson>,
    protected readonly dataSource: DataSource,
  ) {
    super(lessonRepo, dataSource);
  }

  async findAll(category?: LessonCategory): Promise<Lesson[]> {
    const qb = this.repository
      .createQueryBuilder('lesson')
      .leftJoinAndSelect('lesson.chapters', 'chapter')
      .leftJoinAndSelect('chapter.hotspots', 'hotspot')
      .where('lesson.isActive = :active', { active: true })
      .orderBy('lesson.createdAt', 'ASC')
      .addOrderBy('chapter.orderIndex', 'ASC')
      .addOrderBy('hotspot.number', 'ASC');

    if (category) {
      qb.andWhere('lesson.category = :category', { category });
    }

    const lessons = await qb.getMany();
    return this.withModelAvailability(lessons);
  }

  /** Accepts either a UUID or a slug (e.g. 'your_cycle'). */
  async findOne(idOrSlug: string): Promise<Lesson> {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);

    const qb = this.repository
      .createQueryBuilder('lesson')
      .leftJoinAndSelect('lesson.chapters', 'chapter')
      .leftJoinAndSelect('chapter.hotspots', 'hotspot')
      .where(
        isUuid ? 'lesson.id = :val' : 'lesson.slug = :val',
        { val: idOrSlug },
      )
      .andWhere('lesson.isActive = :active', { active: true })
      .orderBy('chapter.orderIndex', 'ASC')
      .addOrderBy('hotspot.number', 'ASC');

    const lesson = await qb.getOne();
    if (!lesson) throw new NotFoundException(`Lesson "${idOrSlug}" not found`);
    return this.withModelAvailability([lesson])[0];
  }

  async deactivate(idOrSlug: string): Promise<void> {
    const lesson = await this.findOne(idOrSlug);
    await this.repository.update(lesson.id, { isActive: false });
  }

  private withModelAvailability(lessons: Lesson[]): Lesson[] {
    for (const lesson of lessons) {
      for (const chapter of lesson.chapters ?? []) {
        const modelFile = chapter.modelUrl ? path.basename(chapter.modelUrl) : null;
        const modelPath = modelFile ? path.join(this.modelDir, modelFile) : null;
        (chapter as any).modelReady = Boolean(modelPath && fs.existsSync(modelPath));
      }
    }
    return lessons;
  }
}
