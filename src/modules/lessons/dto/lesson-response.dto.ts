import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { LessonCategory } from '../entities/lesson.entity';

export class HotspotResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() number: number;
  @ApiProperty() title: string;
  @ApiProperty() localizedTitle: Record<string, string>;
  @ApiProperty() description: string;
  @ApiProperty() localizedDescription: Record<string, string>;
}

export class ChapterResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() orderIndex: number;
  @ApiProperty() title: string;
  @ApiProperty() localizedTitle: Record<string, string>;
  @ApiProperty() narrationText: string;
  @ApiProperty() localizedNarration: Record<string, string>;
  @ApiPropertyOptional() modelUrl: string | null;
  @ApiProperty() modelReady: boolean;
  @ApiPropertyOptional() audioUrl: string | null;
  @ApiProperty({ type: [HotspotResponseDto] }) hotspots: HotspotResponseDto[];
}

export class LessonResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() slug: string;
  @ApiProperty() title: string;
  @ApiProperty() localizedTitle: Record<string, string>;
  @ApiProperty() category: LessonCategory;
  @ApiProperty() durationMinutes: number;
  @ApiProperty({ type: [ChapterResponseDto] }) chapters: ChapterResponseDto[];
  @ApiProperty() createdAt: Date;
}

export class PaginatedLessonsResponseDto {
  @ApiProperty({ type: [LessonResponseDto] }) data: LessonResponseDto[];
  @ApiProperty() meta: {
    totalItems:   number;
    itemCount:    number;
    itemsPerPage: number;
    totalPages:   number;
    currentPage:  number;
  };
}
