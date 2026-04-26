import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
} from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';

@Injectable()
export class SanitizationPipe implements PipeTransform<any> {
  // SQL injection patterns to detect and block
  private readonly sqlInjectionPatterns = [
    // Classic SQL injection with quotes and operators
    /('.*OR.*'.*=.*')|('.*AND.*'.*=.*')/gi,
    // OR/AND with numbers
    /('\s*OR\s+\d+\s*=\s*\d+)|('\s*AND\s+\d+\s*=\s*\d+)/gi,
    // Union-based injection
    /(UNION\s+(ALL\s+)?SELECT)/gi,
    // Comment-based injection - single quotes followed by comments
    /('--)|('\/\*)|('\s*#)/gi,
    // SQL comments
    /(--|\#|\/\*|\*\/)/gi,
    // Dangerous SQL with semicolon
    /(';\s*(DROP|DELETE|INSERT|UPDATE|CREATE|ALTER))/gi,
    // SQL injection with equals
    /('\s*(OR|AND)\s+'\d+'\s*=\s*'\d+')/gi,
    // Stored procedure execution
    /(EXEC\s*\(|EXECUTE\s*\()/gi,
    // DROP TABLE patterns
    /(DROP\s+TABLE)/gi,
  ];

  // XSS patterns to detect and block
  private readonly xssPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
    /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
    /<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi,
    /<link\b[^<]*(?:(?!<\/link>)<[^<]*)*<\/link>/gi,
    /javascript:/gi,
    /vbscript:/gi,
    /onload\s*=/gi,
    /onerror\s*=/gi,
    /onclick\s*=/gi,
    /onmouseover\s*=/gi,
  ];

  // JavaScript code patterns
  private readonly jsCodePatterns = [
    /eval\s*\(/gi,
    /setTimeout\s*\(/gi,
    /setInterval\s*\(/gi,
    /Function\s*\(/gi,
    /new\s+Function/gi,
    /document\./gi,
    /window\./gi,
    /alert\s*\(/gi,
    /confirm\s*\(/gi,
    /prompt\s*\(/gi,
  ];

  async transform(value: any, metadata: ArgumentMetadata): Promise<any> {
    if (!value || typeof value !== 'object') {
      return this.sanitizeValue(value);
    }

    // Deep sanitize object properties
    const sanitizedValue = this.deepSanitize(value);

    // If this is a DTO class, transform it (but don't validate, leave that to ValidationPipe)
    if (metadata.metatype && this.isValidationTarget(metadata.metatype)) {
      return plainToClass(metadata.metatype, sanitizedValue);
    }

    return sanitizedValue;
  }

  private deepSanitize(obj: any): any {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (typeof obj === 'string') {
      return this.sanitizeString(obj);
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.deepSanitize(item));
    }

    if (typeof obj === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        // Sanitize both key and value
        const sanitizedKey = this.sanitizeString(key);
        sanitized[sanitizedKey] = this.deepSanitize(value);
      }
      return sanitized;
    }

    return obj;
  }

  private sanitizeValue(value: any): any {
    if (typeof value === 'string') {
      return this.sanitizeString(value);
    }
    return value;
  }

  private sanitizeString(input: string): string {
    if (!input || typeof input !== 'string') {
      return input;
    }

    let sanitized = input;

    // 1. Unicode normalization
    sanitized = sanitized.normalize('NFC');

    // 2. Check for SQL injection patterns
    if (this.containsSqlInjection(sanitized)) {
      throw new BadRequestException('Input contains potentially malicious SQL patterns');
    }

    // 3. Check for XSS patterns
    if (this.containsXss(sanitized)) {
      throw new BadRequestException('Input contains potentially malicious XSS patterns');
    }

    // 4. Check for JavaScript code patterns
    if (this.containsJavaScript(sanitized)) {
      throw new BadRequestException('Input contains potentially malicious JavaScript code');
    }

    // 5. HTML sanitization - simple approach without DOMPurify
    sanitized = this.sanitizeHtml(sanitized);

    // 6. Remove any remaining script tags and dangerous content
    sanitized = this.removeScriptTags(sanitized);

    // 7. Character filtering - remove control characters except common ones
    sanitized = this.filterControlCharacters(sanitized);

    // 8. Trim whitespace
    sanitized = sanitized.trim();

    return sanitized;
  }

  private containsSqlInjection(input: string): boolean {
    return this.sqlInjectionPatterns.some(pattern => pattern.test(input));
  }

  private containsXss(input: string): boolean {
    return this.xssPatterns.some(pattern => pattern.test(input));
  }

  private containsJavaScript(input: string): boolean {
    return this.jsCodePatterns.some(pattern => pattern.test(input));
  }

  private sanitizeHtml(input: string): string {
    // Remove all HTML tags and keep only text content
    return input
      .replace(/<[^>]*>/g, '') // Remove all HTML tags
      .replace(/&lt;/g, '<')   // Decode HTML entities
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#x27;/g, "'")
      .replace(/&#x2F;/g, '/');
  }

  private removeScriptTags(input: string): string {
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<\/?\s*script\s*>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/vbscript:/gi, '')
      .replace(/data:text\/html/gi, '');
  }

  private filterControlCharacters(input: string): string {
    // Allow common whitespace characters but remove other control characters
    return input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  }

  private isValidationTarget(metatype: any): boolean {
    const types = [String, Boolean, Number, Array, Object];
    return !types.includes(metatype);
  }
}