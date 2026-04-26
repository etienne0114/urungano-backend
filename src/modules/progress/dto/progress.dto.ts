import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsInt, Min, Max, IsBoolean, IsOptional } from 'class-validator';

export class UpdateProgressDto {
  @ApiProperty({ description: 'Lesson completion ratio 0–1', example: 0.6 })
  @IsNumber()
  @Min(0)
  @Max(1)
  progress: number;

  @ApiProperty({ description: 'Current chapter index (0-based)', example: 2 })
  @IsInt()
  @Min(0)
  currentChapter: number;

  @ApiPropertyOptional({ description: 'Mark lesson as completed' })
  @IsOptional()
  @IsBoolean()
  isCompleted?: boolean;
}

export class ProgressResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() lessonId: string;
  @ApiProperty() lessonTitle: string;
  @ApiProperty() progress: number;
  @ApiProperty() currentChapter: number;
  @ApiProperty() isCompleted: boolean;
  @ApiProperty() updatedAt: Date;
}
