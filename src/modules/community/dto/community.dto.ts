import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { IsSafeText, IsValidLanguage } from '../../../common/decorators';

// ── Send message ──────────────────────────────────────────────────────────────

export class SendMessageDto {
  @ApiProperty({ description: 'Message body (1–500 chars)', example: 'Muraho!' })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(500)
  @IsSafeText()
  text: string;

  @ApiPropertyOptional({
    description: 'Message language code',
    example: 'rw',
    default: 'rw',
  })
  @IsString()
  @IsValidLanguage()
  lang?: string;
}

// ── Cast vote ─────────────────────────────────────────────────────────────────

export class CastVoteDto {
  @ApiProperty({ description: 'true = yes, false = no' })
  @IsBoolean()
  vote: boolean;
}

// ── Submit anonymous question ─────────────────────────────────────────────────

export class SubmitQuestionDto {
  @ApiProperty({
    description: 'Anonymous question (10–400 chars)',
    example: 'Is spotting between periods normal?',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(400)
  @IsSafeText()
  text: string;
}

// ── Response DTOs ─────────────────────────────────────────────────────────────

export class CircleResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() slug: string;
  @ApiProperty() name: string;
  @ApiProperty() topic: string;
  @ApiProperty() emoji: string;
  @ApiProperty() color: string;
  @ApiProperty() bgColor: string;
  @ApiProperty() moderator: string;
  @ApiProperty() onlineCount: number;
  @ApiProperty() messageCount: number;
}

export class MessageResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() who: string;
  @ApiProperty() avatarSeed: string;
  @ApiProperty() text: string;
  @ApiProperty() isYou: boolean;
  @ApiProperty() isEducator: boolean;
  @ApiProperty() lang: string;
  @ApiProperty() createdAt: Date;
}

export class DebateResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() question: string;
  @ApiProperty() tag: string;
  @ApiProperty() heatColor: string;
  @ApiProperty() yesPercent: number;
  @ApiProperty() noPercent: number;
  @ApiProperty() totalVotes: number;
  @ApiProperty({ nullable: true }) myVote: boolean | null;
}

export class AnonQuestionResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() text: string;
  @ApiProperty() answered: boolean;
  @ApiProperty({ nullable: true }) reply: string | null;
  @ApiProperty({ nullable: true }) answeredBy: string | null;
  @ApiProperty() createdAt: Date;
}
