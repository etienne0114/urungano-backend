import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsInt,
  Min,
  Max,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';

export class SubmitQuizDto {
  /** Array of selected option indices (0-based) for each question in order */
  @ApiProperty({
    description: 'Selected answer index (0–3) for each question, in order',
    type: [Number],
    example: [1, 2, 0, 3],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(3, { each: true })
  answers: number[];
}

export class QuizQuestionResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() questionText: string;
  @ApiProperty({ type: [String] }) options: string[];
  // correctIndex is NOT exposed in the response — only after submission
}

export class QuizResultDto {
  @ApiProperty() totalQuestions: number;
  @ApiProperty() correctAnswers: number;
  @ApiProperty() accuracy: number;
  @ApiProperty({ description: 'Per-question breakdown' })
  breakdown: QuestionBreakdownDto[];
}

export class QuestionBreakdownDto {
  @ApiProperty() questionId: string;
  @ApiProperty() questionText: string;
  @ApiProperty() selectedIndex: number;
  @ApiProperty() correctIndex: number;
  @ApiProperty() isCorrect: boolean;
  @ApiProperty() explanation: string;
}
