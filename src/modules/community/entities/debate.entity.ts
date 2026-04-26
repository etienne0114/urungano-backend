import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { DebateVote } from './debate-vote.entity';

@Entity('debates')
export class Debate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  question: string;

  @Column({ length: 60 })
  tag: string;

  @Column({ name: 'heat_color', length: 20 })
  heatColor: string;

  @OneToMany('DebateVote', 'debate', { cascade: true })
  votes: DebateVote[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
