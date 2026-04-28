import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import type { UserProgress } from '../../progress/entities/user-progress.entity';
import type { QuizAttempt } from '../../quiz/entities/quiz-attempt.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 50 })
  username: string;

  @Exclude()
  @Column({ name: 'pin_hash', nullable: true, type: 'varchar' })
  pinHash: string | null;

  // Add pin property for backward compatibility with tests
  get pin(): string | null {
    return this.pinHash;
  }

  set pin(value: string | null) {
    this.pinHash = value;
  }

  @Column({ default: 'rw', length: 5 })
  language: string;

  @Column({ name: 'day_streak', default: 0 })
  dayStreak: number;

  @Column({ name: 'last_active_date', type: 'timestamptz', nullable: true })
  lastActiveDate: Date | null;

  @Column({ name: 'avatar_seed', default: '01', length: 10 })
  avatarSeed: string;

  @Column({ name: 'is_private', default: false })
  isPrivate: boolean;

  @Column({ name: 'is_educator', default: false })
  isEducator: boolean;

  @Column({ type: 'jsonb', default: [] })
  earnedBadges: string[];

  @Column({ type: 'jsonb', default: [] })
  journeyEvents: any[];

  @Column({ name: 'total_questions', default: 0 })
  totalQuestions: number;

  @Column({ name: 'correct_answers', default: 0 })
  correctAnswers: number;

  @OneToMany('UserProgress', 'user', { cascade: true })
  progressRecords: UserProgress[];

  @OneToMany('QuizAttempt', 'user')
  quizAttempts: QuizAttempt[];

  @CreateDateColumn({ name: 'joined_date' })
  joinedDate: Date;

  // Add createdAt property for backward compatibility with tests
  get createdAt(): Date {
    return this.joinedDate;
  }

  set createdAt(value: Date) {
    this.joinedDate = value;
  }

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Add progress property for backward compatibility with tests
  get progress(): UserProgress[] {
    return this.progressRecords;
  }

  set progress(value: UserProgress[]) {
    this.progressRecords = value;
  }
}
