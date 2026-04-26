import { Module } from '@nestjs/common';
import { SyncController } from './sync.controller';
import { SyncService } from './sync.service';
import { LessonsModule } from '../lessons/lessons.module';
import { QuizModule } from '../quiz/quiz.module';
import { UsersModule } from '../users/users.module';
import { ProgressModule } from '../progress/progress.module';

@Module({
  imports: [LessonsModule, QuizModule, UsersModule, ProgressModule],
  controllers: [SyncController],
  providers: [SyncService],
})
export class SyncModule {}
