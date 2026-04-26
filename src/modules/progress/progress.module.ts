import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserProgress } from './entities/user-progress.entity';
import { ProgressService } from './progress.service';
import { ProgressController } from './progress.controller';
import { LessonsModule } from '../lessons/lessons.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserProgress]),
    LessonsModule,
    UsersModule,
  ],
  providers: [ProgressService],
  controllers: [ProgressController],
  exports: [ProgressService],
})
export class ProgressModule {}
