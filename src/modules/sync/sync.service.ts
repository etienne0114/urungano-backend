import { Injectable } from '@nestjs/common';
import { LessonsService } from '../lessons/lessons.service';
import { QuizService } from '../quiz/quiz.service';
import { UsersService } from '../users/users.service';
import { ProgressService } from '../progress/progress.service';

@Injectable()
export class SyncService {
  constructor(
    private readonly lessonsService: LessonsService,
    private readonly quizService: QuizService,
    private readonly usersService: UsersService,
    private readonly progressService: ProgressService,
  ) {}

  async getSyncData(userId: string) {
    const lessons = await this.lessonsService.findAll();
    const user = await this.usersService.findOneOrThrow({ where: { id: userId as any } });
    const progress = await this.progressService.getAll(userId);
    
    return {
      lessons,
      profile: this.usersService.toResponseDto(user),
      progress,
      lastSync: new Date().toISOString(),
      version: '1.0.0',
    };
  }
}
