import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
} from '@nestjs/common';

@Injectable()
export class UsernameValidationPipe implements PipeTransform<string, string> {
  private readonly minLength = 2;
  private readonly maxLength = 50;
  private readonly allowedCharsRegex = /^[a-zA-Z0-9àáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿ\s\-_.]+$/;

  transform(value: string, metadata: ArgumentMetadata): string {
    if (!value || typeof value !== 'string') {
      throw new BadRequestException('Username must be a non-empty string');
    }

    // Trim whitespace
    const trimmed = value.trim();

    // Check length
    if (trimmed.length < this.minLength || trimmed.length > this.maxLength) {
      throw new BadRequestException(
        `Username must be between ${this.minLength} and ${this.maxLength} characters`
      );
    }

    // Check allowed characters
    if (!this.allowedCharsRegex.test(trimmed)) {
      throw new BadRequestException(
        'Username can only contain letters, numbers, spaces, hyphens, underscores, and periods'
      );
    }

    // Check for consecutive spaces
    if (/\s{2,}/.test(trimmed)) {
      throw new BadRequestException('Username cannot contain consecutive spaces');
    }

    // Check for profanity or inappropriate content
    if (this.containsInappropriateContent(trimmed)) {
      throw new BadRequestException('Username contains inappropriate content');
    }

    return trimmed;
  }

  private containsInappropriateContent(username: string): boolean {
    // Basic profanity filter - in production, use a more comprehensive solution
    const inappropriateWords = [
      'admin', 'administrator', 'root', 'system', 'null', 'undefined',
      'test', 'demo', 'guest', 'anonymous', 'user', 'default'
    ];

    const lowerUsername = username.toLowerCase();
    return inappropriateWords.some(word => lowerUsername.includes(word));
  }
}