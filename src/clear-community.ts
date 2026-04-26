import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { Circle } from './modules/community/entities/circle.entity';
import { ChatMessage } from './modules/community/entities/chat-message.entity';
import { Debate } from './modules/community/entities/debate.entity';
import { DebateVote } from './modules/community/entities/debate-vote.entity';
import { AnonQuestion } from './modules/community/entities/anon-question.entity';
import { User } from './modules/users/entities/user.entity';

dotenv.config();

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'urungano',
  entities: [Circle, ChatMessage, Debate, DebateVote, AnonQuestion, User],
  synchronize: true,
});

async function run() {
  await dataSource.initialize();
  console.log('🗑 Clearing community tables...');
  
  // Order matters for FK constraints
  await dataSource.getRepository(ChatMessage).delete({});
  await dataSource.getRepository(DebateVote).delete({});
  await dataSource.getRepository(Debate).delete({});
  await dataSource.getRepository(AnonQuestion).delete({});
  await dataSource.getRepository(Circle).delete({});
  
  console.log('✅ Tables cleared.');
  await dataSource.destroy();
}

run().catch(console.error);
