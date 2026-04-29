import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsDateString, IsNumber, Min, Max, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class QuizHistoryQueryDto {
  @ApiProperty({ 
    description: 'Page number for pagination', 
    required: false, 
    default: 1,
    minimum: 1 
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ 
    description: 'Number of items per page', 
    required: false, 
    default: 10,
    minimum: 1,
    maximum: 100 
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiProperty({ 
    description: 'Filter by lesson ID or slug', 
    required: false 
  })
  @IsOptional()
  @IsString()
  lessonId?: string;

  @ApiProperty({ 
    description: 'Filter attempts from this date (ISO string)', 
    required: false 
  })
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiProperty({ 
    description: 'Filter attempts to this date (ISO string)', 
    required: false 
  })
  @IsOptional()
  @IsDateString()
  toDate?: string;

  @ApiProperty({ 
    description: 'Minimum accuracy percentage (0-100)', 
    required: false,
    minimum: 0,
    maximum: 100 
  })
  @IsOptional()
  @Transform(({ value }) => parseFloat(value))
  @IsNumber()
  @Min(0)
  @Max(100)
  minAccuracy?: number;

  @ApiProperty({ 
    description: 'Maximum accuracy percentage (0-100)', 
    required: false,
    minimum: 0,
    maximum: 100 
  })
  @IsOptional()
  @Transform(({ value }) => parseFloat(value))
  @IsNumber()
  @Min(0)
  @Max(100)
  maxAccuracy?: number;
}

export class QuizAttemptSummaryDto {
  @ApiProperty({ description: 'Unique attempt ID' })
  id: string;

  @ApiProperty({ description: 'Lesson information' })
  lesson: {
    id: string;
    slug: string;
    title: string;
    category?: string;
  };

  @ApiProperty({ description: 'Total number of questions in the quiz' })
  totalQuestions: number;

  @ApiProperty({ description: 'Number of correct answers' })
  correctAnswers: number;

  @ApiProperty({ 
    description: 'Accuracy percentage (0-1)', 
    example: 0.85 
  })
  accuracy: number;

  @ApiProperty({ 
    description: 'Accuracy as percentage string', 
    example: '85%' 
  })
  accuracyPercentage: string;

  @ApiProperty({ description: 'When the quiz was completed' })
  completedAt: Date;

  @ApiProperty({ description: 'Time taken to complete (in seconds)', required: false })
  timeSpent?: number;

  @ApiProperty({ description: 'Performance grade based on accuracy' })
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
}

export class QuizStatisticsDto {
  @ApiProperty({ description: 'Total number of quiz attempts' })
  totalAttempts: number;

  @ApiProperty({ description: 'Number of unique lessons attempted' })
  uniqueLessons: number;

  @ApiProperty({ description: 'Overall average accuracy (0-1)' })
  averageAccuracy: number;

  @ApiProperty({ description: 'Best accuracy achieved (0-1)' })
  bestAccuracy: number;

  @ApiProperty({ description: 'Most recent attempt date' })
  lastAttemptDate?: Date;

  @ApiProperty({ description: 'Total time spent on quizzes (in seconds)' })
  totalTimeSpent: number;

  @ApiProperty({ description: 'Performance distribution by grade' })
  gradeDistribution: {
    A: number; // 90-100%
    B: number; // 80-89%
    C: number; // 70-79%
    D: number; // 60-69%
    F: number; // 0-59%
  };

  @ApiProperty({ description: 'Accuracy trend over time (last 10 attempts)' })
  accuracyTrend: Array<{
    attemptNumber: number;
    accuracy: number;
    date: Date;
  }>;

  @ApiProperty({ description: 'Performance by lesson category' })
  categoryPerformance: Array<{
    category: string;
    attempts: number;
    averageAccuracy: number;
  }>;
}

export class QuizHistoryResponseDto {
  @ApiProperty({ 
    description: 'Array of quiz attempt summaries',
    type: [QuizAttemptSummaryDto] 
  })
  attempts: QuizAttemptSummaryDto[];

  @ApiProperty({ description: 'Overall statistics for the user' })
  statistics: QuizStatisticsDto;

  @ApiProperty({ description: 'Pagination metadata' })
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

export class QuizPerformanceMetricsDto {
  @ApiProperty({ description: 'User ID' })
  userId: string;

  @ApiProperty({ description: 'Performance metrics by time period' })
  metrics: {
    daily: Array<{
      date: string;
      attempts: number;
      averageAccuracy: number;
    }>;
    weekly: Array<{
      week: string;
      attempts: number;
      averageAccuracy: number;
    }>;
    monthly: Array<{
      month: string;
      attempts: number;
      averageAccuracy: number;
    }>;
  };

  @ApiProperty({ description: 'Improvement indicators' })
  improvement: {
    accuracyChange: number; // Change from first to last 5 attempts
    consistencyScore: number; // How consistent performance is (0-1)
    learningVelocity: number; // Rate of improvement
  };
}