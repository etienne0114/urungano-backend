import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  ParseIntPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { NotificationsService } from './notifications.service';
import {
  CreateNotificationDto,
  NotificationResponseDto,
  UpdateNotificationPreferenceDto,
} from './dto/notification.dto';
import { NotificationChannel } from './entities/notification-preference.entity';
import { NotificationType } from './entities/notification.entity';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post()
  async createNotification(
    @Body() createNotificationDto: CreateNotificationDto,
  ): Promise<{ id: string; message: string }> {
    const notification = await this.notificationsService.createNotification(createNotificationDto);
    return {
      id: notification.id,
      message: 'Notification created successfully',
    };
  }

  @Get()
  async getUserNotifications(
    @CurrentUser('id') userId: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 50,
    @Query('offset', new ParseIntPipe({ optional: true })) offset = 0,
  ): Promise<NotificationResponseDto[]> {
    return this.notificationsService.getUserNotifications(userId, limit, offset);
  }

  @Get('unread-count')
  async getUnreadCount(
    @CurrentUser('id') userId: string,
  ): Promise<{ count: number }> {
    const count = await this.notificationsService.getUnreadCount(userId);
    return { count };
  }

  @Put(':id/read')
  async markAsRead(
    @Param('id', ParseUUIDPipe) notificationId: string,
    @CurrentUser('id') userId: string,
  ): Promise<{ message: string }> {
    await this.notificationsService.markAsRead(notificationId, userId);
    return { message: 'Notification marked as read' };
  }

  @Put('mark-all-read')
  async markAllAsRead(
    @CurrentUser('id') userId: string,
  ): Promise<{ message: string }> {
    await this.notificationsService.markAllAsRead(userId);
    return { message: 'All notifications marked as read' };
  }

  @Delete(':id')
  async deleteNotification(
    @Param('id', ParseUUIDPipe) notificationId: string,
    @CurrentUser('id') userId: string,
  ): Promise<{ message: string }> {
    await this.notificationsService.deleteNotification(notificationId, userId);
    return { message: 'Notification deleted successfully' };
  }

  @Get('preferences')
  async getUserPreferences(
    @CurrentUser('id') userId: string,
    @Query('type') type?: NotificationType,
  ) {
    return this.notificationsService.getUserPreferences(userId, type);
  }

  @Put('preferences')
  async updatePreference(
    @CurrentUser('id') userId: string,
    @Body() updateDto: UpdateNotificationPreferenceDto,
  ): Promise<{ message: string }> {
    await this.notificationsService.updatePreference(
      userId,
      updateDto.type,
      updateDto.channel as NotificationChannel,
      updateDto.enabled ?? true,
    );
    return { message: 'Notification preference updated successfully' };
  }

  // Convenience endpoints for common notification types
  @Post('lesson-reminder')
  async sendLessonReminder(
    @CurrentUser('id') userId: string,
    @Body() body: { lessonTitle: string },
  ): Promise<{ message: string }> {
    await this.notificationsService.sendLessonReminder(userId, body.lessonTitle);
    return { message: 'Lesson reminder sent' };
  }

  @Post('quiz-completed')
  async sendQuizCompletedNotification(
    @CurrentUser('id') userId: string,
    @Body() body: { lessonTitle: string; score: number },
  ): Promise<{ message: string }> {
    await this.notificationsService.sendQuizCompletedNotification(
      userId,
      body.lessonTitle,
      body.score,
    );
    return { message: 'Quiz completion notification sent' };
  }

  @Post('streak-milestone')
  async sendStreakMilestone(
    @CurrentUser('id') userId: string,
    @Body() body: { streakDays: number },
  ): Promise<{ message: string }> {
    await this.notificationsService.sendStreakMilestone(userId, body.streakDays);
    return { message: 'Streak milestone notification sent' };
  }

  @Post('community-message')
  async sendCommunityMessage(
    @CurrentUser('id') userId: string,
    @Body() body: { senderName: string; circleName: string },
  ): Promise<{ message: string }> {
    await this.notificationsService.sendCommunityMessage(
      userId,
      body.senderName,
      body.circleName,
    );
    return { message: 'Community message notification sent' };
  }

  @Post('question-answered')
  async sendQuestionAnswered(
    @CurrentUser('id') userId: string,
    @Body() body: { questionPreview: string },
  ): Promise<{ message: string }> {
    await this.notificationsService.sendQuestionAnswered(userId, body.questionPreview);
    return { message: 'Question answered notification sent' };
  }
}