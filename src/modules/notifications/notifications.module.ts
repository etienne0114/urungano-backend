import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { Notification } from './entities/notification.entity';
import { NotificationPreference } from './entities/notification-preference.entity';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { PushNotificationService } from './services/push-notification.service';
import { EmailNotificationService } from './services/email-notification.service';
import { NotificationGateway } from './gateways/notification.gateway';
import { UsersModule } from '../users/users.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Notification,
      NotificationPreference,
    ]),
    ConfigModule,
    UsersModule,
    AuthModule,
  ],
  providers: [
    NotificationsService,
    PushNotificationService,
    EmailNotificationService,
    NotificationGateway,
  ],
  controllers: [NotificationsController],
  exports: [NotificationsService, PushNotificationService, EmailNotificationService],
})
export class NotificationsModule {}