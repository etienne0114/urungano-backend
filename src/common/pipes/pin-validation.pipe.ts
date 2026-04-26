import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
} from '@nestjs/common';

@Injectable()
export class PinValidationPipe implements PipeTransform<string, string> {
  transform(value: string, metadata: ArgumentMetadata): string {
    if (!value || typeof value !== 'string') {
      throw new BadRequestException('PIN must be a non-empty string');
    }

    // Remove any whitespace
    const cleaned = value.replace(/\s/g, '');

    // Check if exactly 4 digits
    if (!/^\d{4}$/.test(cleaned)) {
      throw new BadRequestException('PIN must be exactly 4 digits');
    }

    // Check for weak PINs
    if (this.isWeakPin(cleaned)) {
      throw new BadRequestException(
        'PIN is too weak. Avoid sequential numbers (1234, 4321) or repeated digits (1111, 2222)'
      );
    }

    return cleaned;
  }

  private isWeakPin(pin: string): boolean {
    // Check for repeated digits (1111, 2222, etc.)
    if (new Set(pin).size === 1) {
      return true;
    }

    // Check for sequential ascending (1234, 2345, etc.)
    if (this.isSequential(pin, 1)) {
      return true;
    }

    // Check for sequential descending (4321, 5432, etc.)
    if (this.isSequential(pin, -1)) {
      return true;
    }

    // Check for common weak PINs
    const commonWeakPins = [
      '0000', '1111', '2222', '3333', '4444', '5555', '6666', '7777', '8888', '9999',
      '1234', '4321', '2468', '8642', '1357', '7531', '0123', '3210',
      '1122', '2211', '1212', '2121', '1221', '2112'
    ];

    return commonWeakPins.includes(pin);
  }

  private isSequential(pin: string, direction: number): boolean {
    const digits = pin.split('').map(Number);
    
    for (let i = 1; i < digits.length; i++) {
      if (digits[i] !== digits[i - 1] + direction) {
        return false;
      }
    }
    
    return true;
  }
}