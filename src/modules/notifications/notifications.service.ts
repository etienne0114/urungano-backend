import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, In, IsNull, MoreThanOrEqual } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Notification, NotificationType, NotificationStatus } from './entities/notification.entity';
import { NotificationPreference, NotificationChannel } from './entities/notification-preference.entity';
import { PushNotificationService } from './services/push-notification.service';
import { EmailNotificationService } from './services/email-notification.service';
import { NotificationGateway } from './gateways/notification.gateway';
import { UsersService } from '../users/users.service';
import { CreateNotificationDto, NotificationResponseDto } from './dto/notification.dto';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
    
    @InjectRepository(NotificationPreference)
    private readonly preferenceRepo: Repository<NotificationPreference>,
    
    private readonly pushService: PushNotificationService,
    private readonly emailService: EmailNotificationService,
    private readonly notificationGateway: NotificationGateway,
    private readonly usersService: UsersService,
  ) {}

  // ── Create and Send Notifications ─────────────────────────────────────────

  async createNotification(dto: CreateNotificationDto): Promise<Notification> {
    const user = await this.usersService.findById(dto.recipientId);
    
    const notification = this.notificationRepo.create({
      recipient: user,
      type: dto.type,
      title: dto.title,
      message: dto.message,
      data: dto.data || {},
      scheduledFor: dto.scheduledFor,
      expiresAt: dto.expiresAt,
    });

    const saved = await this.notificationRepo.save(notification);
    
    // Send immediately if not scheduled
    if (!dto.scheduledFor || dto.scheduledFor <= new Date()) {
      await this.sendNotification(saved.id);
    }

    return saved;
  }

  async sendNotification(notificationId: string): Promise<void> {
    const notification = await this.notificationRepo.findOne({
      where: { id: notificationId },
      relations: ['recipient'],
    });

    if (!notification) {
      this.logger.error(`Notification ${notificationId} not found`);
      return;
    }

    if (notification.status !== NotificationStatus.PENDING) {
      this.logger.warn(`Notification ${notificationId} already processed`);
      return;
    }

    // Check if notification has expired
    if (notification.expiresAt && notification.expiresAt < new Date()) {
      await this.markNotificationFailed(notification, 'Notification expired');
      return;
    }

    try {
      // Get user preferences for this notification type
      const preferences = await this.getUserPreferences(
        notification.recipient.id,
        notification.type,
      );

      // Send via enabled channels
      const sendPromises: Promise<void>[] = [];

      for (const preference of preferences) {
        if (!preference.enabled) continue;

        // Check quiet hours
        if (this.isInQuietHours(preference)) continue;

        // Check frequency limits
        if (await this.exceedsFrequencyLimit(preference, notification.recipient.id)) continue;

        switch (preference.channel) {
          case NotificationChannel.PUSH:
            sendPromises.push(this.sendPushNotification(notification));
            break;
          case NotificationChannel.EMAIL:
            sendPromises.push(this.sendEmailNotification(notification));
            break;
          case NotificationChannel.IN_APP:
            sendPromises.push(this.sendInAppNotification(notification));
            break;
        }
      }

      // Wait for all channels to complete
      await Promise.allSettled(sendPromises);

      // Mark as sent
      await this.notificationRepo.update(notification.id, {
        status: NotificationStatus.SENT,
        sentAt: new Date(),
      });

      this.logger.log(`Notification ${notification.id} sent successfully`);

    } catch (error) {
      await this.handleNotificationError(notification, error);
    }
  }

  private async sendPushNotification(notification: Notification): Promise<void> {
    try {
      await this.pushService.sendPushNotification({
        userId: notification.recipient.id,
        title: notification.title,
        message: notification.message,
        data: notification.data,
      });
    } catch (error) {
      this.logger.error(`Push notification failed for ${notification.id}:`, error);
      throw error;
    }
  }

  private async sendEmailNotification(notification: Notification): Promise<void> {
    try {
      await this.emailService.sendEmail({
        to: notification.recipient.username, // Assuming username is email
        subject: notification.title,
        body: notification.message,
        data: notification.data,
      });
    } catch (error) {
      this.logger.error(`Email notification failed for ${notification.id}:`, error);
      throw error;
    }
  }

  private async sendInAppNotification(notification: Notification): Promise<void> {
    try {
      await this.notificationGateway.sendNotificationToUser(
        notification.recipient.id,
        {
          id: notification.id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          data: notification.data,
          createdAt: notification.createdAt,
        }
      );
    } catch (error) {
      this.logger.error(`In-app notification failed for ${notification.id}:`, error);
      throw error;
    }
  }

  // ── User Notifications Management ─────────────────────────────────────────

  async getUserNotifications(
    userId: string,
    limit = 50,
    offset = 0,
  ): Promise<NotificationResponseDto[]> {
    const notifications = await this.notificationRepo.find({
      where: { recipient: { id: userId } },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });

    return notifications.map(this.toResponseDto);
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationRepo.count({
      where: {
        recipient: { id: userId },
        status: In([NotificationStatus.SENT, NotificationStatus.DELIVERED]),
        readAt: IsNull(),
      },
    });
  }

  async markAsRead(notificationId: string, userId: string): Promise<void> {
    await this.notificationRepo.update(
      {
        id: notificationId,
        recipient: { id: userId },
      },
      {
        status: NotificationStatus.READ,
        readAt: new Date(),
      }
    );
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.notificationRepo.update(
      {
        recipient: { id: userId },
        readAt: IsNull(),
      },
      {
        status: NotificationStatus.READ,
        readAt: new Date(),
      }
    );
  }

  async deleteNotification(notificationId: string, userId: string): Promise<void> {
    await this.notificationRepo.delete({
      id: notificationId,
      recipient: { id: userId },
    });
  }

  // ── Preferences Management ────────────────────────────────────────────────

  async getUserPreferences(
    userId: string,
    type?: NotificationType,
  ): Promise<NotificationPreference[]> {
    const where: any = { user: { id: userId } };
    if (type) {
      where.type = type;
    }

    return this.preferenceRepo.find({ where });
  }

  async updatePreference(
    userId: string,
    type: NotificationType,
    channel: NotificationChannel,
    enabled: boolean,
  ): Promise<void> {
    await this.preferenceRepo.upsert(
      {
        user: { id: userId },
        type,
        channel,
        enabled,
      },
      ['user', 'type', 'channel']
    );
  }

  // ── Scheduled Jobs ────────────────────────────────────────────────────────

  @Cron(CronExpression.EVERY_MINUTE)
  async processScheduledNotifications(): Promise<void> {
    const scheduledNotifications = await this.notificationRepo.find({
      where: {
        status: NotificationStatus.PENDING,
        scheduledFor: LessThan(new Date()),
      },
      take: 100, // Process in batches
    });

    for (const notification of scheduledNotifications) {
      await this.sendNotification(notification.id);
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async retryFailedNotifications(): Promise<void> {
    const failedNotifications = await this.notificationRepo.find({
      where: {
        status: NotificationStatus.FAILED,
        retryCount: LessThan(3), // Max 3 retries
      },
      take: 50,
    });

    for (const notification of failedNotifications) {
      await this.retryNotification(notification);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanupExpiredNotifications(): Promise<void> {
    const expiredCount = await this.notificationRepo.delete({
      expiresAt: LessThan(new Date()),
    });

    this.logger.log(`Cleaned up ${expiredCount.affected} expired notifications`);
  }

  // ── Helper Methods ────────────────────────────────────────────────────────

  private async handleNotificationError(
    notification: Notification,
    error: any,
  ): Promise<void> {
    const retryCount = notification.retryCount + 1;
    
    if (retryCount >= notification.maxRetries) {
      await this.markNotificationFailed(notification, error.message);
    } else {
      await this.notificationRepo.update(notification.id, {
        retryCount,
        errorMessage: error.message,
      });
    }
  }

  private async markNotificationFailed(
    notification: Notification,
    errorMessage: string,
  ): Promise<void> {
    await this.notificationRepo.update(notification.id, {
      status: NotificationStatus.FAILED,
      errorMessage,
    });

    this.logger.error(`Notification ${notification.id} failed: ${errorMessage}`);
  }

  private async retryNotification(notification: Notification): Promise<void> {
    await this.notificationRepo.update(notification.id, {
      status: NotificationStatus.PENDING,
      retryCount: notification.retryCount + 1,
    });

    await this.sendNotification(notification.id);
  }

  private isInQuietHours(preference: NotificationPreference): boolean {
    if (!preference.quietHoursStart || !preference.quietHoursEnd) {
      return false;
    }

    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM format
    
    return currentTime >= preference.quietHoursStart && 
           currentTime <= preference.quietHoursEnd;
  }

  private async exceedsFrequencyLimit(
    preference: NotificationPreference,
    userId: string,
  ): Promise<boolean> {
    if (!preference.frequencyLimit) {
      return false;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayCount = await this.notificationRepo.count({
      where: {
        recipient: { id: userId },
        type: preference.type,
        sentAt: MoreThanOrEqual(today),
      },
    });

    return todayCount >= preference.frequencyLimit;
  }

  private toResponseDto(notification: Notification): NotificationResponseDto {
    return {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      status: notification.status,
      data: notification.data,
      isRead: !!notification.readAt,
      createdAt: notification.createdAt,
      readAt: notification.readAt ?? undefined,
    };
  }

  // ── Convenience Methods for Common Notifications ──────────────────────────

  async sendLessonReminder(userId: string, lessonTitle: string): Promise<void> {
    await this.createNotification({
      recipientId: userId,
      type: NotificationType.LESSON_REMINDER,
      title: 'Time for your lesson!',
      message: `Don't forget to complete "${lessonTitle}" today.`,
      data: { lessonTitle },
    });
  }

  async sendQuizCompletedNotification(
    userId: string,
    lessonTitle: string,
    score: number,
  ): Promise<void> {
    await this.createNotification({
      recipientId: userId,
      type: NotificationType.QUIZ_COMPLETED,
      title: 'Quiz completed!',
      message: `You scored ${score}% on "${lessonTitle}". Great job!`,
      data: { lessonTitle, score },
    });
  }

  async sendStreakMilestone(userId: string, streakDays: number): Promise<void> {
    await this.createNotification({
      recipientId: userId,
      type: NotificationType.STREAK_MILESTONE,
      title: `${streakDays} day streak! 🔥`,
      message: `Congratulations! You've maintained a ${streakDays} day learning streak.`,
      data: { streakDays },
    });
  }

  async sendCommunityMessage(
    userId: string,
    senderName: string,
    circleName: string,
  ): Promise<void> {
    await this.createNotification({
      recipientId: userId,
      type: NotificationType.COMMUNITY_MESSAGE,
      title: `New message in ${circleName}`,
      message: `${senderName} sent a message in ${circleName}.`,
      data: { senderName, circleName },
    });
  }

  async sendQuestionAnswered(
    userId: string,
    questionPreview: string,
  ): Promise<void> {
    await this.createNotification({
      recipientId: userId,
      type: NotificationType.QUESTION_ANSWERED,
      title: 'Your question was answered!',
      message: `A health educator answered your question: "${questionPreview}..."`,
      data: { questionPreview },
    });
  }
}