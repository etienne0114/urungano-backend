import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Chapter } from './chapter.entity';

export type LessonCategory =
  | 'menstrual_health'
  | 'hiv_sti'
  | 'anatomy'
  | 'mental_health'
  | 'relationships';

@Entity('lessons')
export class Lesson {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 60 })
  slug: string;

  /** Default (English) title */
  @Column({ length: 120 })
  title: string;

  /** Trilingual titles: { en, fr, rw } */
  @Column({ name: 'localized_title', type: 'jsonb', default: '{}' })
  localizedTitle: Record<string, string>;

  @Column({
    type: 'enum',
    enum: ['menstrual_health', 'hiv_sti', 'anatomy', 'mental_health', 'relationships'],
  })
  category: LessonCategory;

  @Column({ name: 'duration_minutes' })
  durationMinutes: number;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @OneToMany(() => Chapter, (chapter) => chapter.lesson, {
    cascade: true,
    eager: true,
  })
  chapters: Chapter[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
