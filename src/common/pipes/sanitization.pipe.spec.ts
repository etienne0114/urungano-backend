import { BadRequestException } from '@nestjs/common';
import { SanitizationPipe } from './sanitization.pipe';
import { IsString, Length } from 'class-validator';

class TestDto {
  @IsString()
  @Length(1, 50)
  text: string;
}

describe('SanitizationPipe', () => {
  let pipe: SanitizationPipe;

  beforeEach(() => {
    pipe = new SanitizationPipe();
  });

  describe('SQL Injection Protection', () => {
    it('should block SQL injection attempts', async () => {
      const maliciousInputs = [
        "'; DROP TABLE users; --",
        "1' OR '1'='1",
        "UNION SELECT * FROM users",
        "admin'--",
        "' OR 1=1 --",
        "'; DELETE FROM users WHERE '1'='1",
      ];

      for (const input of maliciousInputs) {
        await expect(
          pipe.transform(input, { type: 'body' })
        ).rejects.toThrow(BadRequestException);
      }
    });

    it('should allow safe SQL-like text', async () => {
      const safeInputs = [
        'I like to select my favorite lessons',
        'Please insert your username here',
        'Delete this message if needed',
        'Update your profile information',
        'Create a new account',
      ];

      for (const input of safeInputs) {
        const result = await pipe.transform(input, { type: 'body' });
        expect(result).toBe(input.trim());
      }
    });
  });

  describe('XSS Protection', () => {
    it('should block XSS attempts', async () => {
      const xssInputs = [
        '<script>alert("xss")</script>',
        '<iframe src="javascript:alert(1)"></iframe>',
        '<img onerror="alert(1)" src="x">',
        '<div onclick="alert(1)">Click me</div>',
        'javascript:alert(1)',
        'vbscript:msgbox(1)',
      ];

      for (const input of xssInputs) {
        await expect(
          pipe.transform(input, { type: 'body' })
        ).rejects.toThrow(BadRequestException);
      }
    });

    it('should sanitize HTML tags', async () => {
      const input = '<p>Hello <b>world</b></p>';
      const result = await pipe.transform(input, { type: 'body' });
      expect(result).toBe('Hello world');
    });
  });

  describe('JavaScript Code Protection', () => {
    it('should block JavaScript code patterns', async () => {
      const jsInputs = [
        'eval("alert(1)")',
        'setTimeout(function(){alert(1)}, 1000)',
        'new Function("alert(1)")()',
        'document.cookie',
        'window.location',
        'alert("hello")',
      ];

      for (const input of jsInputs) {
        await expect(
          pipe.transform(input, { type: 'body' })
        ).rejects.toThrow(BadRequestException);
      }
    });
  });

  describe('Unicode Normalization', () => {
    it('should normalize unicode characters', async () => {
      const input = 'café'; // Contains composed character
      const result = await pipe.transform(input, { type: 'body' });
      expect(result).toBe('café'); // Should be normalized
    });
  });

  describe('Control Character Filtering', () => {
    it('should remove control characters', async () => {
      const input = 'Hello\x00\x01\x02World';
      const result = await pipe.transform(input, { type: 'body' });
      expect(result).toBe('HelloWorld');
    });

    it('should preserve common whitespace', async () => {
      const input = 'Hello\n\t World';
      const result = await pipe.transform(input, { type: 'body' });
      expect(result).toBe('Hello\n\t World');
    });
  });

  describe('Deep Object Sanitization', () => {
    it('should sanitize nested objects', async () => {
      const input = {
        user: {
          name: '<script>alert(1)</script>John',
          message: 'Hello world',
        },
        data: ['<b>test</b>', 'normal text'],
      };

      await expect(
        pipe.transform(input, { type: 'body' })
      ).rejects.toThrow(BadRequestException);
    });

    it('should sanitize array elements', async () => {
      const input = ['normal text', '<script>alert(1)</script>'];

      await expect(
        pipe.transform(input, { type: 'body' })
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('DTO Validation Integration', () => {
    it('should validate DTO after sanitization', async () => {
      const input = { text: 'Valid text' };
      const metadata = { 
        type: 'body' as const, 
        metatype: TestDto,
        data: undefined 
      };

      const result = await pipe.transform(input, metadata);
      expect(result).toBeInstanceOf(TestDto);
      expect(result.text).toBe('Valid text');
    });

    it('should fail validation for invalid DTO', async () => {
      const input = { text: '' }; // Too short
      const metadata = { 
        type: 'body' as const, 
        metatype: TestDto,
        data: undefined 
      };

      await expect(
        pipe.transform(input, metadata)
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Edge Cases', () => {
    it('should handle null and undefined', async () => {
      expect(await pipe.transform(null, { type: 'body' })).toBeNull();
      expect(await pipe.transform(undefined, { type: 'body' })).toBeUndefined();
    });

    it('should handle empty strings', async () => {
      const result = await pipe.transform('', { type: 'body' });
      expect(result).toBe('');
    });

    it('should handle numbers and booleans', async () => {
      expect(await pipe.transform(123, { type: 'body' })).toBe(123);
      expect(await pipe.transform(true, { type: 'body' })).toBe(true);
    });

    it('should trim whitespace', async () => {
      const result = await pipe.transform('  hello world  ', { type: 'body' });
      expect(result).toBe('hello world');
    });
  });
});