import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { QuizService } from './quiz.service';
import { SubmitQuizDto } from './dto/quiz.dto';
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
  @ApiOperation({ summary: 'Get current user quiz attempt history' })
  history(@CurrentUser() user: User) {
    return this.quizService.getAttemptHistory(user.id);
  }

  @Get('history/:userId')
  @ApiOperation({ summary: 'Get quiz attempt history for a specific user' })
  getUserHistory(@Param('userId') userId: string) {
    return this.quizService.getAttemptHistory(userId);
  }
}
