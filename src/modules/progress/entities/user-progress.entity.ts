import {
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Lesson } from '../../lessons/entities/lesson.entity';

@Entity('user_progress')
@Unique(['user', 'lesson'])
export class UserProgress {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.progressRecords, {
    onDelete: 'CASCADE',
  })
  user: User;

  @ManyToOne(() => Lesson, { onDelete: 'CASCADE', eager: true })
  lesson: Lesson;

  /** 0.0 – 1.0 */
  @Column({ type: 'float', default: 0 })
  progress: number;

  @Column({ name: 'current_chapter', default: 0 })
  currentChapter: number;

  @Column({ name: 'is_completed', default: false })
  isCompleted: boolean;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
