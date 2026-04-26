import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('anon_questions')
export class AnonQuestion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Stored for moderation only — never exposed in API responses */
  @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: true })
  asker: User | null;

  @Column({ type: 'text' })
  text: string;

  @Column({ default: false })
  answered: boolean;

  @Column({ type: 'text', nullable: true })
  reply: string | null;

  @Column({ name: 'answered_by', type: 'varchar', nullable: true, length: 80 })
  answeredBy: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
