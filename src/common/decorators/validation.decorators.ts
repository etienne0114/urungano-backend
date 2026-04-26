import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

// Username validation decorator
@ValidatorConstraint({ async: false })
export class IsValidUsernameConstraint implements ValidatorConstraintInterface {
  validate(username: any, args: ValidationArguments) {
    if (typeof username !== 'string') {
      return false;
    }

    // Username rules:
    // - 2-50 characters
    // - Only letters, numbers, spaces, and basic punctuation
    // - No consecutive spaces
    // - No leading/trailing spaces
    const usernameRegex = /^[a-zA-Z0-9àáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿ\s\-_.]{2,50}$/;
    const noConsecutiveSpaces = !/\s{2,}/.test(username);
    const noLeadingTrailingSpaces = username === username.trim();

    return usernameRegex.test(username) && noConsecutiveSpaces && noLeadingTrailingSpaces;
  }

  defaultMessage(args: ValidationArguments) {
    return 'Username must be 2-50 characters, contain only letters, numbers, spaces, and basic punctuation, with no consecutive or leading/trailing spaces';
  }
}

export function IsValidUsername(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsValidUsernameConstraint,
    });
  };
}

// PIN validation decorator
@ValidatorConstraint({ async: false })
export class IsValidPinConstraint implements ValidatorConstraintInterface {
  validate(pin: any, args: ValidationArguments) {
    if (typeof pin !== 'string') {
      return false;
    }

    // PIN rules:
    // - Exactly 4 digits
    // - Only numeric characters
    // - No sequential numbers (1234, 4321)
    // - No repeated numbers (1111, 2222)
    const pinRegex = /^\d{4}$/;
    const isSequential = this.isSequentialPin(pin);
    const isRepeated = this.isRepeatedPin(pin);

    return pinRegex.test(pin) && !isSequential && !isRepeated;
  }

  private isSequentialPin(pin: string): boolean {
    const digits = pin.split('').map(Number);
    
    // Check ascending sequence (1234, 2345, etc.)
    let isAscending = true;
    let isDescending = true;
    
    for (let i = 1; i < digits.length; i++) {
      if (digits[i] !== digits[i - 1] + 1) {
        isAscending = false;
      }
      if (digits[i] !== digits[i - 1] - 1) {
        isDescending = false;
      }
    }
    
    return isAscending || isDescending;
  }

  private isRepeatedPin(pin: string): boolean {
    return new Set(pin).size === 1;
  }

  defaultMessage(args: ValidationArguments) {
    return 'PIN must be exactly 4 digits, not sequential (1234, 4321), and not repeated (1111, 2222)';
  }
}

export function IsValidPin(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsValidPinConstraint,
    });
  };
}

// Safe text content validation (for messages, questions, etc.)
@ValidatorConstraint({ async: false })
export class IsSafeTextConstraint implements ValidatorConstraintInterface {
  validate(text: any, args: ValidationArguments) {
    if (typeof text !== 'string') {
      return false;
    }

    // Check for dangerous patterns
    const dangerousPatterns = [
      /<script/i,
      /javascript:/i,
      /vbscript:/i,
      /onload=/i,
      /onerror=/i,
      /onclick=/i,
      /eval\(/i,
      /setTimeout\(/i,
      /setInterval\(/i,
      /document\./i,
      /window\./i,
    ];

    return !dangerousPatterns.some(pattern => pattern.test(text));
  }

  defaultMessage(args: ValidationArguments) {
    return 'Text contains potentially unsafe content';
  }
}

export function IsSafeText(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsSafeTextConstraint,
    });
  };
}

// Language code validation
@ValidatorConstraint({ async: false })
export class IsValidLanguageConstraint implements ValidatorConstraintInterface {
  private readonly allowedLanguages = ['rw', 'en', 'fr'];

  validate(language: any, args: ValidationArguments) {
    if (typeof language !== 'string') {
      return false;
    }

    return this.allowedLanguages.includes(language.toLowerCase());
  }

  defaultMessage(args: ValidationArguments) {
    return 'Language must be one of: rw, en, fr';
  }
}

export function IsValidLanguage(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsValidLanguageConstraint,
    });
  };
}

// Avatar seed validation
@ValidatorConstraint({ async: false })
export class IsValidAvatarSeedConstraint implements ValidatorConstraintInterface {
  validate(seed: any, args: ValidationArguments) {
    if (typeof seed !== 'string') {
      return false;
    }

    // Avatar seed rules:
    // - 1-10 characters
    // - Only alphanumeric characters
    const seedRegex = /^[a-zA-Z0-9]{1,10}$/;
    return seedRegex.test(seed);
  }

  defaultMessage(args: ValidationArguments) {
    return 'Avatar seed must be 1-10 alphanumeric characters';
  }
}

export function IsValidAvatarSeed(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsValidAvatarSeedConstraint,
    });
  };
}