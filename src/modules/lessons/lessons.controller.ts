import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { LessonsService } from './lessons.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
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
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(
    @Query('category') category?: LessonCategory,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.lessonsService.findAll(category).then((lessons) => {
      const currentPage = Math.max(1, Number(page) || 1);
      const itemsPerPage = Math.max(1, Number(limit) || 10);
      const start = (currentPage - 1) * itemsPerPage;
      const items = lessons.slice(start, start + itemsPerPage);

      return {
        items,
        meta: {
          totalItems: lessons.length,
          itemCount: items.length,
          itemsPerPage,
          totalPages: Math.max(1, Math.ceil(lessons.length / itemsPerPage)),
          currentPage,
        },
      };
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single lesson with all chapters and hotspots' })
  findOne(@Param('id') id: string) {
    return this.lessonsService.findOne(id);
  }
}
