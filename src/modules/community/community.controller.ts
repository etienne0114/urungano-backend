import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CommunityService } from './community.service';
import {
  CastVoteDto,
  SendMessageDto,
  SubmitQuestionDto,
  AnswerQuestionDto,
  SendDirectMessageDto,
} from './dto/community.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { EducatorGuard } from '../../common/guards/educator.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { User } from '../users/entities/user.entity';

@ApiTags('Community')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('community')
export class CommunityController {
  constructor(private readonly communityService: CommunityService) {}

  // ── Circles ───────────────────────────────────────────────────────────────

  @Get('circles')
  @ApiOperation({ summary: 'List all peer circles with metadata' })
  getCircles() {
    return this.communityService.getCircles();
  }

  @Get('circles/:circleSlug/messages')
  @ApiOperation({ summary: 'Get recent messages for a circle' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getMessages(
    @CurrentUser() user: User,
    @Param('circleSlug') circleSlug: string,
    @Query('limit') limit?: string,
  ) {
    return this.communityService.getMessages(
      circleSlug,
      user.id,
      limit ? parseInt(limit, 10) : 50,
    );
  }

  @Post('circles/:circleSlug/messages')
  @ApiOperation({ summary: 'Send a message to a circle' })
  sendMessage(
    @CurrentUser() user: User,
    @Param('circleSlug') circleSlug: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.communityService.sendMessage(circleSlug, user.id, dto);
  }

  // ── Debates ───────────────────────────────────────────────────────────────

  @Get('debates')
  @ApiOperation({ summary: 'List all open debates with live vote counts' })
  getDebates(@CurrentUser() user: User) {
    return this.communityService.getDebates(user.id);
  }

  @Post('debates/:debateId/vote')
  @ApiOperation({ summary: 'Cast a yes/no vote on a debate (once per user)' })
  castVote(
    @CurrentUser() user: User,
    @Param('debateId') debateId: string,
    @Body() dto: CastVoteDto,
  ) {
    return this.communityService.castVote(debateId, user.id, dto);
  }

  // ── Anonymous questions ───────────────────────────────────────────────────

  @Get('questions')
  @ApiOperation({ summary: 'List anonymous questions (answered shown first)' })
  getQuestions() {
    return this.communityService.getQuestions();
  }

  @Post('questions')
  @ApiOperation({ summary: 'Submit an anonymous question to health educators' })
  submitQuestion(
    @CurrentUser() user: User,
    @Body() dto: SubmitQuestionDto,
  ) {
    return this.communityService.submitQuestion(user.id, dto);
  }

  @Patch('questions/:id/answer')
  @UseGuards(EducatorGuard)
  @ApiOperation({ summary: 'Answer an anonymous question (Educators only)' })
  answerQuestion(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: AnswerQuestionDto,
  ) {
    return this.communityService.answerQuestion(id, user.id, dto);
  }

  // ── Direct messages ───────────────────────────────────────────────────────

  @Get('direct/:otherUserId')
  @ApiOperation({ summary: 'Get direct messages with another user' })
  getDirectMessages(
    @CurrentUser() user: User,
    @Param('otherUserId') otherUserId: string,
  ) {
    return this.communityService.getDirectMessages(user.id, otherUserId);
  }

  @Post('direct')
  @ApiOperation({ summary: 'Send a direct message' })
  sendDirectMessage(
    @CurrentUser() user: User,
    @Body() dto: SendDirectMessageDto,
  ) {
    return this.communityService.sendDirectMessage(user.id, dto);
  }

  // ── Featured ──────────────────────────────────────────────────────────────

  @Get('weekly-circle')
  @ApiOperation({ summary: 'Get the featured circle of the week' })
  getWeeklyCircle() {
    return this.communityService.getWeeklyCircle();
  }
}
