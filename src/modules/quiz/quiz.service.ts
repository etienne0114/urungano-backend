import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QuizQuestion } from './entities/quiz-question.entity';
import { QuizAttempt } from './entities/quiz-attempt.entity';
import { LessonsService } from '../lessons/lessons.service';
import { UsersService } from '../users/users.service';
import type {
  SubmitQuizDto,
  QuizResultDto,
  QuestionBreakdownDto,
} from './dto/quiz.dto';

@Injectable()
export class QuizService {
  constructor(
    @InjectRepository(QuizQuestion)
    private readonly questionRepo: Repository<QuizQuestion>,
    @InjectRepository(QuizAttempt)
    private readonly attemptRepo: Repository<QuizAttempt>,
    private readonly lessonsService: LessonsService,
    private readonly usersService: UsersService,
  ) {}

  /** Return all active questions for a lesson (accepts UUID or slug). */
  async getQuestionsForLesson(lessonIdOrSlug: string): Promise<QuizQuestion[]> {
    // Resolve to UUID first so the relation filter works correctly
    const lesson = await this.lessonsService.findOne(lessonIdOrSlug);
    return this.questionRepo.find({
      where: { lesson: { id: lesson.id }, isActive: true },
      order: { createdAt: 'ASC' },
    });
  }

  async submitQuiz(
    lessonIdOrSlug: string,
    userId: string,
    dto: SubmitQuizDto,
  ): Promise<QuizResultDto> {
    const lesson = await this.lessonsService.findOne(lessonIdOrSlug);
    const [user, questions] = await Promise.all([
      this.usersService.findById(userId),
      this.getQuestionsForLesson(lesson.id),
    ]);

    if (dto.answers.length !== questions.length) {
      throw new NotFoundException(
        `Expected ${questions.length} answers, received ${dto.answers.length}`,
      );
    }

    const breakdown: QuestionBreakdownDto[] = questions.map((q: QuizQuestion, i: number) => ({
      questionId: q.id,
      questionText: q.questionText,
      selectedIndex: dto.answers[i],
      correctIndex: q.correctIndex,
      isCorrect: dto.answers[i] === q.correctIndex,
      explanation: q.explanation,
    }));

    const correctAnswers = breakdown.filter((b) => b.isCorrect).length;
    const totalQuestions = questions.length;
    const accuracy = totalQuestions > 0 ? correctAnswers / totalQuestions : 0;

    // Persist the attempt
    const attempt = this.attemptRepo.create({
      user,
      lesson,
      totalQuestions,
      correctAnswers,
      accuracy,
    });
    await this.attemptRepo.save(attempt);

    // Update daily streak
    await this.usersService.touchStreak(userId);

    return { totalQuestions, correctAnswers, accuracy, breakdown };
  }

  async getAttemptHistory(userId: string): Promise<QuizAttempt[]> {
    return this.attemptRepo.find({
      where: { user: { id: userId } },
      relations: ['lesson'],
      order: { completedAt: 'DESC' },
    });
  }
}
