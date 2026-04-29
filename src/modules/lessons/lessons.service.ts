import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, SelectQueryBuilder } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { Lesson, type LessonCategory } from './entities/lesson.entity';
import { BaseService } from '../../common/services/base.service';
import { 
  PaginatedResponse, 
  PaginationQueryDto, 
  CursorPaginatedResponse,
  CursorPaginationQueryDto,
  PaginationQueryBuilder,
  CursorUtils 
} from '../../common/decorators/paginated.decorator';
import { Transactional } from '../../common/decorators/transactional.decorator';

@Injectable()
export class LessonsService extends BaseService<Lesson> {
  private readonly modelDir = path.join(process.cwd(), 'public', 'models');
  private readonly lessonCache = new Map<string, { lesson: Lesson; timestamp: number }>();
  private readonly cacheTimeout = 5 * 60 * 1000; // 5 minutes

  constructor(
    @InjectRepository(Lesson)
    private readonly lessonRepo: Repository<Lesson>,
    protected readonly dataSource: DataSource,
  ) {
    super(lessonRepo, dataSource);
  }

  /**
   * Find all lessons with optional pagination and filtering
   * Uses optimized queries with selective loading based on request needs
   */
  async findAll(
    category?: LessonCategory,
    pagination?: PaginationQueryDto,
    includeDetails = true,
  ): Promise<Lesson[] | PaginatedResponse<Lesson>> {
    const qb = this.createOptimizedQuery(includeDetails);

    // Apply category filter
    if (category) {
      qb.andWhere('lesson.category = :category', { category });
    }

    // Apply search if provided
    if (pagination?.search) {
      qb.andWhere(
        '(lesson.title ILIKE :search OR lesson.description ILIKE :search OR lesson.category ILIKE :search)',
        { search: `%${pagination.search}%` }
      );
    }

    // If pagination is requested, return paginated results
    if (pagination) {
      return this.getPaginatedResults(qb, pagination);
    }

    // Otherwise return all results
    qb.orderBy('lesson.created_at', 'ASC');
    if (includeDetails) {
      qb.addOrderBy('chapter.orderIndex', 'ASC')
        .addOrderBy('hotspot.number', 'ASC');
    }

    const lessons = await qb.getMany();
    return this.withModelAvailability(lessons);
  }

  /**
   * Find lessons with cursor-based pagination for better performance on large datasets
   */
  async findAllCursor(
    pagination: CursorPaginationQueryDto,
    category?: LessonCategory,
    includeDetails = false,
  ): Promise<CursorPaginatedResponse<Lesson>> {
    const qb = this.createOptimizedQuery(includeDetails);

    // Apply category filter
    if (category) {
      qb.andWhere('lesson.category = :category', { category });
    }

    // Apply cursor pagination
    PaginationQueryBuilder.applyCursorPagination(qb, {
      cursor: pagination.cursor ? CursorUtils.decode(pagination.cursor) : null,
      limit: pagination.limit || 10,
      direction: pagination.direction || 'forward',
    });

    const lessons = await qb.getMany();
    const hasMore = lessons.length > (pagination.limit || 10);
    
    // Remove extra item used for hasMore detection
    if (hasMore) {
      lessons.pop();
    }

    const processedLessons = this.withModelAvailability(lessons);
    const cursors = CursorUtils.createCursors(processedLessons);

    return CursorPaginatedResponse.create(
      processedLessons,
      pagination.limit || 10,
      hasMore ? cursors.nextCursor : undefined,
      cursors.previousCursor,
    );
  }

  /**
   * Get lessons by category with optimized loading
   */
  async findByCategory(
    category: LessonCategory,
    includeDetails = true,
  ): Promise<Lesson[]> {
    // Check cache first
    const cacheKey = `category_${category}_${includeDetails}`;
    const cached = this.lessonCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return [cached.lesson] as any; // Return cached result
    }

    const qb = this.createOptimizedQuery(includeDetails)
      .andWhere('lesson.category = :category', { category })
      .orderBy('lesson.created_at', 'ASC');

    if (includeDetails) {
      qb.addOrderBy('chapter.orderIndex', 'ASC')
        .addOrderBy('hotspot.number', 'ASC');
    }

    const lessons = await qb.getMany();
    const processedLessons = this.withModelAvailability(lessons);

    // Cache the result
    this.lessonCache.set(cacheKey, {
      lesson: processedLessons as any,
      timestamp: Date.now(),
    });

    return processedLessons;
  }

  /**
   * Find lesson summaries without detailed relations (for list views)
   */
  async findSummaries(category?: LessonCategory): Promise<Lesson[]> {
    const qb = this.repository
      .createQueryBuilder('lesson')
      .select([
        'lesson.id',
        'lesson.slug',
        'lesson.title',
        'lesson.description',
        'lesson.category',
        'lesson.duration',
        'lesson.difficulty',
        'lesson.createdAt',
        'lesson.updatedAt',
      ])
      .where('lesson.isActive = :active', { active: true });

    if (category) {
      qb.andWhere('lesson.category = :category', { category });
    }

    return qb.orderBy('lesson.created_at', 'ASC').getMany();
  }

  /** 
   * Accepts either a UUID or a slug (e.g. 'your_cycle').
   * Uses caching for frequently accessed lessons.
   */
  async findOne(idOrSlug: string, includeDetails = true): Promise<Lesson> {
    // Check cache first
    const cacheKey = `lesson_${idOrSlug}_${includeDetails}`;
    const cached = this.lessonCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.lesson;
    }

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);

    const qb = this.createOptimizedQuery(includeDetails)
      .where(
        isUuid ? 'lesson.id = :val' : 'lesson.slug = :val',
        { val: idOrSlug },
      )
      .andWhere('lesson.isActive = :active', { active: true });

    if (includeDetails) {
      qb.orderBy('chapter.orderIndex', 'ASC')
        .addOrderBy('hotspot.number', 'ASC');
    }

    const lesson = await qb.getOne();
    if (!lesson) throw new NotFoundException(`Lesson "${idOrSlug}" not found`);
    
    const processedLesson = this.withModelAvailability([lesson])[0];

    // Cache the result
    this.lessonCache.set(cacheKey, {
      lesson: processedLesson,
      timestamp: Date.now(),
    });

    return processedLesson;
  }

  /**
   * Get lesson without relations for quick access
   */
  async findOneBasic(idOrSlug: string): Promise<Lesson> {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);

    const lesson = await this.repository.findOne({
      where: isUuid 
        ? { id: idOrSlug, isActive: true }
        : { slug: idOrSlug, isActive: true },
    });

    if (!lesson) throw new NotFoundException(`Lesson "${idOrSlug}" not found`);
    return lesson;
  }

  /**
   * Batch load lessons by IDs with optimized query
   */
  async findByIds(ids: string[], includeDetails = false): Promise<Lesson[]> {
    if (ids.length === 0) return [];

    const qb = this.createOptimizedQuery(includeDetails)
      .whereInIds(ids)
      .andWhere('lesson.isActive = :active', { active: true })
      .orderBy('lesson.created_at', 'ASC');

    if (includeDetails) {
      qb.addOrderBy('chapter.orderIndex', 'ASC')
        .addOrderBy('hotspot.number', 'ASC');
    }

    const lessons = await qb.getMany();
    return this.withModelAvailability(lessons);
  }

  @Transactional()
  async deactivate(idOrSlug: string): Promise<void> {
    const lesson = await this.findOneBasic(idOrSlug);
    
    return this.runInTransaction(async (queryRunner) => {
      await queryRunner.manager.update(Lesson, lesson.id, { isActive: false });
      
      // Clear cache for this lesson
      this.clearLessonCache(lesson.id, lesson.slug);
    });
  }

  /**
   * Clear cache entries for a specific lesson
   */
  private clearLessonCache(id: string, slug: string): void {
    const keysToDelete = Array.from(this.lessonCache.keys()).filter(key => 
      key.includes(id) || key.includes(slug)
    );
    
    keysToDelete.forEach(key => this.lessonCache.delete(key));
  }

  /**
   * Clear all cached lessons (useful for cache invalidation)
   */
  clearCache(): void {
    this.lessonCache.clear();
  }

  /**
   * Create optimized query builder with selective loading
   */
  private createOptimizedQuery(includeDetails: boolean): SelectQueryBuilder<Lesson> {
    const qb = this.repository
      .createQueryBuilder('lesson')
      .where('lesson.isActive = :active', { active: true });

    if (includeDetails) {
      // Use LEFT JOIN for optional relations to avoid N+1 queries
      qb.leftJoinAndSelect('lesson.chapters', 'chapter')
        .leftJoinAndSelect('chapter.hotspots', 'hotspot');
    }

    return qb;
  }

  /**
   * Get paginated results with proper counting
   */
  private async getPaginatedResults(
    qb: SelectQueryBuilder<Lesson>,
    pagination: PaginationQueryDto,
  ): Promise<PaginatedResponse<Lesson>> {
    // Clone query builder for counting - use the existing joins from qb
    const countQb = qb.clone()
      .select('COUNT(DISTINCT lesson.id)', 'count');

    // Get total count
    const result = await countQb.getRawOne<{ count: string }>();
    const total = parseInt(result?.count || '0', 10);

    // Apply pagination to main query
    PaginationQueryBuilder.applyPagination(qb, {
      page: pagination.page || 1,
      limit: pagination.limit || 10,
      skip: ((pagination.page || 1) - 1) * (pagination.limit || 10),
      sortBy: pagination.sortBy || 'lesson.created_at',
      order: pagination.order || 'ASC',
      search: pagination.search,
    }, ['lesson.title', 'lesson.description']);

    // Execute query
    const lessons = await qb.getMany();
    const processedLessons = this.withModelAvailability(lessons);

    return PaginatedResponse.create(
      processedLessons,
      total,
      pagination.page || 1,
      pagination.limit || 10,
    );
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
