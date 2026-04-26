import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Debate } from './debate.entity';
import { User } from '../../users/entities/user.entity';

@Entity('debate_votes')
@Unique(['user', 'debate'])
export class DebateVote {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;

  @ManyToOne(() => Debate, (d) => d.votes, { onDelete: 'CASCADE' })
  debate: Debate;

  /** true = yes, false = no */
  @Column()
  vote: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
