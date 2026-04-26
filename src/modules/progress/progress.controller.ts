import { Body, Controller, Get, Param, Patch, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ProgressService } from './progress.service';
import { UpdateProgressDto } from './dto/progress.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { User } from '../users/entities/user.entity';

@ApiTags('Progress')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('progress')
export class ProgressController {
  constructor(private readonly progressService: ProgressService) {}

  @Get()
  @ApiOperation({ summary: 'Get progress for all lessons of current user' })
  getAll(@CurrentUser() user: User) {
    return this.progressService.getAll(user.id);
  }

  @Get(':lessonId')
  @ApiOperation({ summary: 'Get progress for a specific lesson' })
  getForLesson(@CurrentUser() user: User, @Param('lessonId') lessonId: string) {
    return this.progressService.getForLesson(user.id, lessonId);
  }

  @Put(':lessonId')
  @ApiOperation({ summary: 'Create or update lesson progress' })
  upsert(
    @CurrentUser() user: User,
    @Param('lessonId') lessonId: string,
    @Body() dto: UpdateProgressDto,
  ) {
    return this.progressService.upsert(user.id, lessonId, dto);
  }
}
