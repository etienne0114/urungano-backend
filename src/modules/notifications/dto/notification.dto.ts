import { IsString, IsOptional, IsEnum, IsDateString, IsObject, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { NotificationType, NotificationStatus } from '../entities/notification.entity';

export class CreateNotificationDto {
  @IsUUID()
  recipientId: string;

  @IsEnum(NotificationType)
  type: NotificationType;

  @IsString()
  title: string;

  @IsString()
  message: string;

  @IsOptional()
  @IsObject()
  data?: Record<string, any>;

  @IsOptional()
  @IsDateString()
  scheduledFor?: Date;

  @IsOptional()
  @IsDateString()
  expiresAt?: Date;
}

export class NotificationResponseDto {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  status: NotificationStatus;
  data: Record<string, any>;
  isRead: boolean;
  createdAt: Date;
  readAt?: Date;
}

export class UpdateNotificationPreferenceDto {
  @IsEnum(NotificationType)
  type: NotificationType;

  @IsString()
  channel: string;

  @IsOptional()
  enabled?: boolean;

  @IsOptional()
  @IsString()
  quietHoursStart?: string;

  @IsOptional()
  @IsString()
  quietHoursEnd?: string;

  @IsOptional()
  frequencyLimit?: number;
}