import {
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Lesson } from './lesson.entity';
import { Hotspot } from './hotspot.entity';

@Entity('chapters')
export class Chapter {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Lesson, (lesson) => lesson.chapters, { onDelete: 'CASCADE' })
  lesson: Lesson;

  @Column({ name: 'order_index' })
  orderIndex: number;

  /** Default (English) chapter title */
  @Column({ length: 120 })
  title: string;

  /** Trilingual chapter titles: { en, fr, rw } */
  @Column({ name: 'localized_title', type: 'jsonb', default: '{}' })
  localizedTitle: Record<string, string>;

  /** Default (English) narration text — used as TTS source */
  @Column({ name: 'narration_text', type: 'text' })
  narrationText: string;

  /** Trilingual narration texts: { en, fr, rw } */
  @Column({ name: 'localized_narration', type: 'jsonb', default: '{}' })
  localizedNarration: Record<string, string>;

  /** URL to a GLB/GLTF 3D model asset; null when not yet available */
  @Column({ name: 'model_url', type: 'text', nullable: true })
  modelUrl: string | null;

  /** Optional pre-recorded audio file URL (MP3/AAC) */
  @Column({ name: 'audio_url', type: 'text', nullable: true })
  audioUrl: string | null;

  @OneToMany(() => Hotspot, (hotspot) => hotspot.chapter, {
    cascade: true,
    eager: true,
  })
  hotspots: Hotspot[];
}
