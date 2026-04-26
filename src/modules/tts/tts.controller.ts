import {
  Controller,
  Get,
  Query,
  BadRequestException,
  ServiceUnavailableException,
  Res,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { TtsService, TtsLang } from './tts.service';

const ALLOWED_LANGS: TtsLang[] = ['en', 'fr', 'rw'];
const MAX_TEXT_LEN = 4_000;

@Controller('tts')
export class TtsController {
  private readonly logger = new Logger(TtsController.name);

  constructor(private readonly tts: TtsService) {}

  @Get('voices')
  getVoices() {
    return this.tts.getVoiceCapabilities();
  }

  /**
   * GET /tts/synthesize?text=Hello&lang=en
   * Returns JSON { url: '/static/audio/<hash>.mp3', lang }
   * Returns 204 (no content) when synthesis unavailable — client falls back to on-device TTS
   */
  @Get('synthesize')
  async synthesize(
    @Query('text') text: string,
    @Query('lang') lang = 'en',
    @Res() res: Response,
  ) {
    if (!text?.trim()) {
      throw new BadRequestException('text query param is required');
    }
    if (text.length > MAX_TEXT_LEN) {
      throw new BadRequestException(`text exceeds ${MAX_TEXT_LEN} chars`);
    }

    const resolvedLang: TtsLang = ALLOWED_LANGS.includes(lang as TtsLang)
      ? (lang as TtsLang)
      : 'en';

    try {
      const url = await this.tts.synthesize(text.trim(), resolvedLang);
      res.json({ url, lang: resolvedLang });
    } catch (err: any) {
      // Synthesis failed — return 204 so client silently falls back to flutter_tts
      this.logger.warn(`TTS unavailable, returning 204: ${err.message}`);
      res.status(204).send();
    }
  }
}
