import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { ChatMessage } from './chat-message.entity';

@Entity('circles')
export class Circle {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 50 })
  slug: string;

  @Column({ length: 80 })
  name: string;

  @Column({ length: 120 })
  topic: string;

  @Column({ length: 10 })
  emoji: string;

  @Column({ length: 20 })
  color: string;

  @Column({ name: 'bg_color', length: 20 })
  bgColor: string;

  @Column({ length: 80 })
  moderator: string;

  @OneToMany('ChatMessage', 'circle', { cascade: true })
  messages: ChatMessage[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
