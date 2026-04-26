import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { NotificationType } from './notification.entity';

export enum NotificationChannel {
  PUSH = 'push',
  EMAIL = 'email',
  IN_APP = 'in_app',
}

@Entity('notification_preferences')
@Unique(['user', 'type', 'channel'])
export class NotificationPreference {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;

  @Column({
    type: 'enum',
    enum: NotificationType,
  })
  type: NotificationType;

  @Column({
    type: 'enum',
    enum: NotificationChannel,
  })
  channel: NotificationChannel;

  @Column({ default: true })
  enabled: boolean;

  @Column({ name: 'quiet_hours_start', type: 'time', nullable: true })
  quietHoursStart: string | null;

  @Column({ name: 'quiet_hours_end', type: 'time', nullable: true })
  quietHoursEnd: string | null;

  @Column({ name: 'frequency_limit', type: 'integer', nullable: true })
  frequencyLimit: number | null; // Max notifications per day for this type

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}