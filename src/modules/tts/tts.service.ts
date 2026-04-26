import {
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { execFile, exec } from 'child_process';

const execFileAsync = promisify(execFile);
const execAsync = promisify(exec);

export type TtsLang = 'en' | 'fr' | 'rw';

// Voice mapping for eSpeak-ng fallback (always available)
const ESPEAK_VOICES: Record<string, string> = {
  en:  'en-us+f3',
  fr:  'fr+f3',
  rw:  'en-us+f3', // no rw engine — fall back to English
};

@Injectable()
export class TtsService {
  private readonly logger = new Logger(TtsService.name);
  private readonly audioDir: string;
  private readonly scriptPath: string;
  private readonly pythonBin: string;
  private _piperAvailable: boolean | null = null;

  constructor(private readonly config: ConfigService) {
    this.audioDir = path.join(process.cwd(), 'public', 'audio');

    // Try persistent home location first, then tmp fallback
    const homePython = '/home/umwami/.piper_venv/bin/python';
    const tmpPython = '/tmp/piper_venv/bin/python';
    this.pythonBin = config.get<string>('PIPER_PYTHON_BIN')
      || (fs.existsSync(homePython) ? homePython : tmpPython);

    const directScript = path.join(process.cwd(), 'scripts', 'synthesize.py');
    const fallbackScript = path.join(process.cwd(), '..', 'backend', 'scripts', 'synthesize.py');
    this.scriptPath = fs.existsSync(directScript) ? directScript : fallbackScript;

    fs.mkdirSync(this.audioDir, { recursive: true });
  }

  // ── Piper availability probe (cached after first check) ─────────────────────

  private async isPiperAvailable(): Promise<boolean> {
    if (this._piperAvailable !== null) return this._piperAvailable;
    try {
      if (!fs.existsSync(this.pythonBin)) {
        this._piperAvailable = false;
        return false;
      }
      await execFileAsync(this.pythonBin, ['-c', 'import piper'], { timeout: 8_000 });
      this._piperAvailable = true;
      this.logger.log(`Piper TTS available at ${this.pythonBin}`);
    } catch {
      this._piperAvailable = false;
      this.logger.warn(`Piper unavailable at ${this.pythonBin} — using eSpeak-ng fallback`);
    }
    return this._piperAvailable;
  }

  // ── Public API ───────────────────────────────────────────────────────────────

  async synthesize(text: string, lang: TtsLang): Promise<string> {
    const resolvedLang = lang === 'rw' ? 'en' : lang;
    const hash = crypto
      .createHash('sha256')
      .update(`${resolvedLang}:${text}`)
      .digest('hex')
      .slice(0, 16);

    const mp3Path = path.join(this.audioDir, `${hash}.mp3`);
    const publicUrl = `/static/audio/${hash}.mp3`;

    // Cache hit
    if (fs.existsSync(mp3Path)) return publicUrl;

    const sanitized = text.replace(/"/g, "'").replace(/\n/g, ' ').trim();

    const usePiper = await this.isPiperAvailable();
    if (usePiper && fs.existsSync(this.scriptPath)) {
      try {
        await execFileAsync(
          this.pythonBin,
          [this.scriptPath, '--lang', resolvedLang, '--text', sanitized, '--out', mp3Path],
          { timeout: 60_000 },
        );
        if (fs.existsSync(mp3Path)) {
          this.logger.log(`[Piper] Synthesized ${hash}.mp3`);
          return publicUrl;
        }
      } catch (err: any) {
        this.logger.warn(`[Piper] Failed: ${err.message} — trying eSpeak-ng`);
        // Reset probe so next request tries piper again (might be transient)
        this._piperAvailable = null;
      }
    }

    // ── eSpeak-ng fallback (always available) ────────────────────────────────
    return this.synthesizeEspeak(sanitized, resolvedLang, mp3Path, publicUrl);
  }

  private async synthesizeEspeak(
    text: string,
    lang: string,
    mp3Path: string,
    publicUrl: string,
  ): Promise<string> {
    const wavPath = mp3Path.replace('.mp3', '.wav');
    const voice = ESPEAK_VOICES[lang] || ESPEAK_VOICES.en;

    try {
      // 1. Generate WAV via eSpeak-ng
      await execAsync(
        `espeak-ng -v ${voice} -s 135 -a 180 -g 4 -p 50 -w "${wavPath}" "${text.replace(/"/g, "'")}"`,
        { timeout: 30_000 },
      );

      if (!fs.existsSync(wavPath)) throw new Error('eSpeak-ng produced no output');

      // 2. Convert to MP3 via ffmpeg with voice-quality EQ
      await execAsync(
        `ffmpeg -y -i "${wavPath}" -ar 22050 -ac 1 -b:a 64k \
         -af "highpass=f=80,lowpass=f=8000,equalizer=f=3000:t=o:w=2:g=2,acompressor=threshold=-18dB:ratio=3:attack=5:release=50" \
         "${mp3Path}" 2>/dev/null`,
        { timeout: 20_000 },
      );

      // 3. Clean up WAV
      if (fs.existsSync(wavPath)) fs.unlinkSync(wavPath);

      if (!fs.existsSync(mp3Path)) throw new Error('ffmpeg produced no output');

      this.logger.log(`[eSpeak-ng] Synthesized ${path.basename(mp3Path)}`);
      return publicUrl;
    } catch (err: any) {
      // Clean up partial files
      [wavPath, mp3Path].forEach(f => { try { if (fs.existsSync(f)) fs.unlinkSync(f); } catch {} });
      this.logger.error(`[eSpeak-ng] Failed: ${err.message}`);
      // Return empty response — client falls back to on-device TTS
      throw err;
    }
  }

  async pregenerate(narrations: Record<string, string>): Promise<Record<string, string>> {
    const urls: Record<string, string> = {};
    for (const [lang, text] of Object.entries(narrations)) {
      try {
        urls[lang] = await this.synthesize(text, lang as TtsLang);
      } catch (e) {
        this.logger.warn(`Pregen failed lang=${lang}: ${(e as Error).message}`);
      }
    }
    return urls;
  }

  getVoiceCapabilities() {
    return {
      en:  { neural: this._piperAvailable ?? false, voice: 'en_US-lessac-high', fallback: 'espeak-ng/en-us+f3' },
      fr:  { neural: this._piperAvailable ?? false, voice: 'fr_FR-siwis-medium', fallback: 'espeak-ng/fr+f3' },
      rw:  { neural: false, voice: null, fallback: 'espeak-ng/en-us+f3 (no rw engine)' },
    };
  }
}
