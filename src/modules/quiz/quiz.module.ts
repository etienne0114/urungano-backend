import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuizQuestion } from './entities/quiz-question.entity';
import { QuizAttempt } from './entities/quiz-attempt.entity';
import { QuizService } from './quiz.service';
import { QuizController } from './quiz.controller';
import { LessonsModule } from '../lessons/lessons.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([QuizQuestion, QuizAttempt]),
    LessonsModule,
    UsersModule,
  ],
  providers: [QuizService],
  controllers: [QuizController],
  exports: [QuizService],
})
export class QuizModule {}
