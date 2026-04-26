import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Lesson } from '../../lessons/entities/lesson.entity';

@Entity('quiz_attempts')
export class QuizAttempt {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.quizAttempts, { onDelete: 'CASCADE' })
  user: User;

  @ManyToOne(() => Lesson, { onDelete: 'CASCADE', eager: true })
  lesson: Lesson;

  @Column({ name: 'total_questions' })
  totalQuestions: number;

  @Column({ name: 'correct_answers' })
  correctAnswers: number;

  @Column({ type: 'float' })
  accuracy: number;

  @CreateDateColumn({ name: 'completed_at' })
  completedAt: Date;
}
