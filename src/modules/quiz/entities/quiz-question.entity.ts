import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Lesson } from '../../lessons/entities/lesson.entity';

@Entity('quiz_questions')
export class QuizQuestion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Lesson, { onDelete: 'CASCADE', eager: true })
  lesson: Lesson;

  @Column({ name: 'question_text', type: 'text' })
  questionText: string;

  @Column('simple-array')
  options: string[];

  @Column({ name: 'correct_index' })
  correctIndex: number;

  @Column({ type: 'text' })
  explanation: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
