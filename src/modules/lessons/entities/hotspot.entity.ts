import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Chapter } from './chapter.entity';

@Entity('hotspots')
export class Hotspot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Chapter, (chapter) => chapter.hotspots, {
    onDelete: 'CASCADE',
  })
  chapter: Chapter;

  @Column()
  number: number;

  /** Default (English) hotspot label */
  @Column({ length: 80 })
  title: string;

  /** Trilingual labels: { en, fr, rw } */
  @Column({ name: 'localized_title', type: 'jsonb', default: '{}' })
  localizedTitle: Record<string, string>;

  /** Default (English) detailed description */
  @Column({ type: 'text' })
  description: string;

  /** Trilingual descriptions: { en, fr, rw } */
  @Column({ name: 'localized_description', type: 'jsonb', default: '{}' })
  localizedDescription: Record<string, string>;
}
