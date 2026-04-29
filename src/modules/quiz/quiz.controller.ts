import { Body, Controller, Get, Param, Post, UseGuards, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiQuery } from '@nestjs/swagger';
import { QuizService } from './quiz.service';
import { SubmitQuizDto } from './dto/quiz.dto';
import { QuizHistoryQueryDto } from './dto/quiz-history.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { User } from '../users/entities/user.entity';

@ApiTags('Quiz')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('quiz')
export class QuizController {
  constructor(private readonly quizService: QuizService) {}

  @Get(':lessonId')
  @ApiOperation({ summary: 'Get quiz questions for a lesson (no correct index exposed)' })
  getQuestions(@Param('lessonId') lessonId: string) {
    return this.quizService.getQuestionsForLesson(lessonId);
  }

  @Post(':lessonId/submit')
  @ApiOperation({ summary: 'Submit quiz answers and get scored result' })
  submit(
    @Param('lessonId') lessonId: string,
    @CurrentUser() user: User,
    @Body() dto: SubmitQuizDto,
  ) {
    return this.quizService.submitQuiz(lessonId, user.id, dto);
  }

  @Get('history/me')
  @ApiOperation({ summary: 'Get current user comprehensive quiz history with pagination and filtering' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 10, max: 100)' })
  @ApiQuery({ name: 'lessonId', required: false, type: String, description: 'Filter by lesson ID or slug' })
  @ApiQuery({ name: 'fromDate', required: false, type: String, description: 'Filter from date (ISO string)' })
  @ApiQuery({ name: 'toDate', required: false, type: String, description: 'Filter to date (ISO string)' })
  @ApiQuery({ name: 'minAccuracy', required: false, type: Number, description: 'Minimum accuracy percentage (0-100)' })
  @ApiQuery({ name: 'maxAccuracy', required: false, type: Number, description: 'Maximum accuracy percentage (0-100)' })
  history(@CurrentUser() user: User, @Query() query: QuizHistoryQueryDto) {
    return this.quizService.getQuizHistory(user.id, query);
  }

  @Get('history/me/simple')
  @ApiOperation({ summary: 'Get current user simple quiz attempt history (legacy endpoint)' })
  simpleHistory(@CurrentUser() user: User) {
    return this.quizService.getAttemptHistory(user.id);
  }

  @Get('history/me/statistics')
  @ApiOperation({ summary: 'Get current user quiz statistics' })
  statistics(@CurrentUser() user: User) {
    return this.quizService.getQuizStatistics(user.id);
  }

  @Get('history/me/metrics')
  @ApiOperation({ summary: 'Get current user performance metrics and trends' })
  metrics(@CurrentUser() user: User) {
    return this.quizService.getPerformanceMetrics(user.id);
  }

  @Get('history/:userId')
  @ApiOperation({ summary: 'Get quiz history for a specific user with pagination and filtering' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'lessonId', required: false, type: String })
  @ApiQuery({ name: 'fromDate', required: false, type: String })
  @ApiQuery({ name: 'toDate', required: false, type: String })
  @ApiQuery({ name: 'minAccuracy', required: false, type: Number })
  @ApiQuery({ name: 'maxAccuracy', required: false, type: Number })
  getUserHistory(@Param('userId') userId: string, @Query() query: QuizHistoryQueryDto) {
    return this.quizService.getQuizHistory(userId, query);
  }

  @Get('history/:userId/simple')
  @ApiOperation({ summary: 'Get simple quiz attempt history for a specific user (legacy endpoint)' })
  getUserSimpleHistory(@Param('userId') userId: string) {
    return this.quizService.getAttemptHistory(userId);
  }
}
