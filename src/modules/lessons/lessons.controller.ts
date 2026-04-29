import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { LessonsService } from './lessons.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { 
  Paginated, 
  Pagination, 
  PaginationQueryDto,
  CursorPagination,
  CursorPaginationQueryDto 
} from '../../common/decorators/paginated.decorator';
import type { LessonCategory } from './entities/lesson.entity';

@ApiTags('Lessons')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('lessons')
export class LessonsController {
  constructor(private readonly lessonsService: LessonsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all lessons with pagination and filtering' })
  @ApiQuery({ name: 'category', required: false, enum: ['menstrual_health', 'hiv_sti', 'anatomy', 'mental_health', 'relationships'] })
  @ApiQuery({ name: 'includeDetails', required: false, type: Boolean, description: 'Include chapters and hotspots' })
  @Paginated({ defaultLimit: 10, maxLimit: 50 })
  findAll(
    @Query('category') category?: LessonCategory,
    @Query('includeDetails') includeDetails: boolean = true,
    @Pagination() pagination?: any,
  ) {
    if (pagination) {
      return this.lessonsService.findAll(category, pagination, includeDetails);
    }
    return this.lessonsService.findAll(category, undefined, includeDetails);
  }

  @Get('cursor')
  @ApiOperation({ summary: 'Get lessons with cursor-based pagination (better performance for large datasets)' })
  @ApiQuery({ name: 'category', required: false, enum: ['menstrual_health', 'hiv_sti', 'anatomy', 'mental_health', 'relationships'] })
  @ApiQuery({ name: 'includeDetails', required: false, type: Boolean, description: 'Include chapters and hotspots' })
  findAllCursor(
    @Query('category') category?: LessonCategory,
    @Query('includeDetails') includeDetails: boolean = false,
    @CursorPagination() pagination?: any,
  ) {
    return this.lessonsService.findAllCursor(pagination, category, includeDetails);
  }

  @Get('summaries')
  @ApiOperation({ summary: 'Get lesson summaries without detailed relations (fast list view)' })
  @ApiQuery({ name: 'category', required: false, enum: ['menstrual_health', 'hiv_sti', 'anatomy', 'mental_health', 'relationships'] })
  findSummaries(@Query('category') category?: LessonCategory) {
    return this.lessonsService.findSummaries(category);
  }

  @Get('category/:category')
  @ApiOperation({ summary: 'Get lessons by category with caching' })
  @ApiQuery({ name: 'includeDetails', required: false, type: Boolean, description: 'Include chapters and hotspots' })
  findByCategory(
    @Param('category') category: LessonCategory,
    @Query('includeDetails') includeDetails: boolean = true,
  ) {
    return this.lessonsService.findByCategory(category, includeDetails);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single lesson with all chapters and hotspots' })
  @ApiQuery({ name: 'includeDetails', required: false, type: Boolean, description: 'Include chapters and hotspots' })
  findOne(
    @Param('id') id: string,
    @Query('includeDetails') includeDetails: boolean = true,
  ) {
    return this.lessonsService.findOne(id, includeDetails);
  }

  @Get(':id/basic')
  @ApiOperation({ summary: 'Get basic lesson info without relations (fast access)' })
  findOneBasic(@Param('id') id: string) {
    return this.lessonsService.findOneBasic(id);
  }
}
