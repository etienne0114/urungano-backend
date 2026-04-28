import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, Matches } from 'class-validator';
import { IsValidUsername } from '../../../common/decorators';

export class AnonymousSignInDto {
  @ApiProperty({ example: 'Umuntu 04', description: 'Display username' })
  @IsString()
  @IsValidUsername()
  username: string;

  @ApiProperty({ example: '1234', description: '4-digit PIN for account security', required: false })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}$/, { message: 'PIN must be exactly 4 digits' })
  pin?: string;

  @ApiProperty({ example: true, description: 'Whether this is a new registration', required: false })
  @IsOptional()
  @IsBoolean()
  isRegistration?: boolean;
}

export class VerifyPinDto {
  @ApiProperty({ description: '4-digit PIN', minLength: 4, maxLength: 4 })
  @IsString()
  @Matches(/^\d{4}$/, { message: 'PIN must be exactly 4 digits' })
  pin: string;
}

export class AuthResponseDto {
  @ApiProperty() accessToken: string;
  @ApiProperty() userId: string;
  @ApiProperty() username: string;
  @ApiProperty() isNewUser: boolean;
}
