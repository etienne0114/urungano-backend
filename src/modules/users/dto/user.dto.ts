import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  IsIn,
  IsBoolean,
  Length,
  Matches,
} from 'class-validator';
import {
  IsValidUsername,
  IsValidLanguage,
  IsValidAvatarSeed,
} from '../../../common/decorators';

export class CreateUserDto {
  @ApiProperty({ example: 'Muraho', maxLength: 50 })
  @IsString()
  @IsValidUsername()
  username: string;
}

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @ApiPropertyOptional({ example: 'rw', enum: ['rw', 'en', 'fr'] })
  @IsOptional()
  @IsValidLanguage()
  language?: string;

  @ApiPropertyOptional({ example: '01' })
  @IsOptional()
  @IsString()
  @IsValidAvatarSeed()
  avatarSeed?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPrivate?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString({ each: true })
  earnedBadges?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  journeyEvents?: any[];

  @ApiPropertyOptional()
  @IsOptional()
  totalQuestions?: number;

  @ApiPropertyOptional()
  @IsOptional()
  correctAnswers?: number;
}

export class SetPinDto {
  @ApiProperty({ description: '4-digit PIN', minLength: 4, maxLength: 4 })
  @IsString()
  @Matches(/^\d{4}$/, { message: 'PIN must be exactly 4 digits' })
  pin: string;
}

export class UserResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() username: string;
  @ApiProperty() language: string;
  @ApiProperty() dayStreak: number;
  @ApiProperty() avatarSeed: string;
  @ApiProperty() isPrivate: boolean;
  @ApiProperty() earnedBadges: string[];
  @ApiProperty() journeyEvents: any[];
  @ApiProperty() totalQuestions: number;
  @ApiProperty() correctAnswers: number;
  @ApiProperty() hasPIN: boolean;
  @ApiProperty() joinedDate: Date;
  @ApiProperty() lastActiveDate: Date | null;
}
