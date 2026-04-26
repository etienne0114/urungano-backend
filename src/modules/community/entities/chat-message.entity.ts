import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Circle } from './circle.entity';
import { User } from '../../users/entities/user.entity';

@Entity('chat_messages')
export class ChatMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Circle, (c) => c.messages, { onDelete: 'CASCADE' })
  circle: Circle;

  @ManyToOne(() => User, { onDelete: 'CASCADE', eager: true })
  user: User;

  @Column({ type: 'text' })
  text: string;

  @Column({ name: 'is_educator', default: false })
  isEducator: boolean;

  /** Kinyarwanda, English, or French message language hint */
  @Column({ length: 5, default: 'rw' })
  lang: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
