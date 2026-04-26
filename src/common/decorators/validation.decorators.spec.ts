import { validate } from 'class-validator';
import { 
  IsValidUsername, 
  IsValidPin, 
  IsSafeText, 
  IsValidLanguage, 
  IsValidAvatarSeed 
} from './validation.decorators';

class TestUsernameDto {
  @IsValidUsername()
  username: string;
}

class TestPinDto {
  @IsValidPin()
  pin: string;
}

class TestTextDto {
  @IsSafeText()
  text: string;
}

class TestLanguageDto {
  @IsValidLanguage()
  language: string;
}

class TestAvatarSeedDto {
  @IsValidAvatarSeed()
  seed: string;
}

describe('Custom Validation Decorators', () => {
  describe('IsValidUsername', () => {
    it('should accept valid usernames', async () => {
      const validUsernames = [
        'John Doe',
        'Marie Claire',
        'User123',
        'Test_User',
        'Jean-Pierre',
        'Amélie',
      ];

      for (const username of validUsernames) {
        const dto = new TestUsernameDto();
        dto.username = username;
        const errors = await validate(dto);
        expect(errors).toHaveLength(0);
      }
    });

    it('should reject invalid usernames', async () => {
      const invalidUsernames = [
        'a', // too short
        'a'.repeat(51), // too long
        'User  Name', // consecutive spaces
        ' UserName', // leading space
        'UserName ', // trailing space
        'User<script>', // invalid characters
      ];

      for (const username of invalidUsernames) {
        const dto = new TestUsernameDto();
        dto.username = username;
        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
      }
    });
  });

  describe('IsValidPin', () => {
    it('should accept valid PINs', async () => {
      const validPins = [
        '1357',
        '2468',
        '1029',
        '5739',
        '8264',
      ];

      for (const pin of validPins) {
        const dto = new TestPinDto();
        dto.pin = pin;
        const errors = await validate(dto);
        expect(errors).toHaveLength(0);
      }
    });

    it('should reject invalid PINs', async () => {
      const invalidPins = [
        '123', // too short
        '12345', // too long
        'abcd', // not numeric
        '1111', // repeated digits
        '1234', // sequential ascending
        '4321', // sequential descending
        '0000', // all zeros
      ];

      for (const pin of invalidPins) {
        const dto = new TestPinDto();
        dto.pin = pin;
        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
      }
    });
  });

  describe('IsSafeText', () => {
    it('should accept safe text', async () => {
      const safeTexts = [
        'Hello world',
        'This is a normal message',
        'Question about health',
        'Muraho! Amakuru?',
      ];

      for (const text of safeTexts) {
        const dto = new TestTextDto();
        dto.text = text;
        const errors = await validate(dto);
        expect(errors).toHaveLength(0);
      }
    });

    it('should reject unsafe text', async () => {
      const unsafeTexts = [
        '<script>alert("xss")</script>',
        'javascript:alert(1)',
        'onclick="alert(1)"',
        'eval("malicious code")',
        'document.cookie',
      ];

      for (const text of unsafeTexts) {
        const dto = new TestTextDto();
        dto.text = text;
        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
      }
    });
  });

  describe('IsValidLanguage', () => {
    it('should accept valid language codes', async () => {
      const validLanguages = ['rw', 'en', 'fr', 'RW', 'EN', 'FR'];

      for (const language of validLanguages) {
        const dto = new TestLanguageDto();
        dto.language = language;
        const errors = await validate(dto);
        expect(errors).toHaveLength(0);
      }
    });

    it('should reject invalid language codes', async () => {
      const invalidLanguages = ['es', 'de', 'zh', 'invalid', ''];

      for (const language of invalidLanguages) {
        const dto = new TestLanguageDto();
        dto.language = language;
        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
      }
    });
  });

  describe('IsValidAvatarSeed', () => {
    it('should accept valid avatar seeds', async () => {
      const validSeeds = ['01', 'abc', 'ABC123', '999', 'a1b2c3'];

      for (const seed of validSeeds) {
        const dto = new TestAvatarSeedDto();
        dto.seed = seed;
        const errors = await validate(dto);
        expect(errors).toHaveLength(0);
      }
    });

    it('should reject invalid avatar seeds', async () => {
      const invalidSeeds = [
        '', // empty
        'a'.repeat(11), // too long
        'abc-def', // invalid characters
        'abc def', // spaces
        'abc@123', // special characters
      ];

      for (const seed of invalidSeeds) {
        const dto = new TestAvatarSeedDto();
        dto.seed = seed;
        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
      }
    });
  });
});