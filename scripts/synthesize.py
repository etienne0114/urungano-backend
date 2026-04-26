#!/usr/bin/env python3
"""Piper TTS synthesis script — called by NestJS TtsService.

Voice priority:
  1. Piper neural TTS (en_US-lessac-high / fr_FR-siwis-medium)
  2. eSpeak-ng + ffmpeg fallback (always available)

Voice model search order:
  ~/.piper_voices/   ← persistent, survives reboots
  backend/public/voices/  ← legacy location
"""

import sys, os, argparse, shutil

# ── Voice model locations (searched in order) ─────────────────────────────────
_HOME_VOICES = os.path.expanduser('~/.piper_voices')
_BACKEND_VOICES = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    'public', 'voices'
)

def _find_voice(filename: str) -> str | None:
    for d in [_HOME_VOICES, _BACKEND_VOICES]:
        p = os.path.join(d, filename)
        if os.path.exists(p) and os.path.getsize(p) > 1_000_000:
            return p
    return None

VOICE_MAP = {
    'en': 'en_US-lessac-high.onnx',
    'fr': 'fr_FR-siwis-medium.onnx',
    'rw': 'en_US-lessac-high.onnx',  # no rw neural voice exists
}

ESPEAK_VOICE = {
    'en': 'en-us+f3',
    'fr': 'fr+f3',
    'rw': 'en-us+f3',
}

# ── Piper synthesis ────────────────────────────────────────────────────────────
def synthesize_piper(text: str, lang: str, wav_path: str) -> bool:
    model_file = VOICE_MAP.get(lang, VOICE_MAP['en'])
    model_path = _find_voice(model_file)
    if not model_path:
        print(f'[piper] voice file not found: {model_file}', file=sys.stderr)
        return False
    try:
        import wave
        from piper import PiperVoice
        voice = PiperVoice.load(model_path, use_cuda=False)
        with wave.open(wav_path, 'wb') as wf:
            voice.synthesize_wav(text, wf)
        return os.path.exists(wav_path) and os.path.getsize(wav_path) > 100
    except Exception as e:
        print(f'[piper] failed: {e}', file=sys.stderr)
        return False

# ── eSpeak-ng synthesis ────────────────────────────────────────────────────────
def synthesize_espeak(text: str, lang: str, wav_path: str) -> bool:
    voice = ESPEAK_VOICE.get(lang, 'en-us+f3')
    safe_text = text.replace('"', "'")
    ret = os.system(
        f'espeak-ng -v {voice} -s 135 -a 180 -g 4 -p 50 '
        f'-w "{wav_path}" "{safe_text}" 2>/dev/null'
    )
    return ret == 0 and os.path.exists(wav_path) and os.path.getsize(wav_path) > 100

# ── WAV → MP3 via ffmpeg ──────────────────────────────────────────────────────
def wav_to_mp3(wav_path: str, mp3_path: str) -> bool:
    if not shutil.which('ffmpeg'):
        # No ffmpeg — copy WAV as-is (NestJS will serve it)
        shutil.move(wav_path, mp3_path)
        return True
    ret = os.system(
        f'ffmpeg -y -i "{wav_path}" -ar 22050 -ac 1 -b:a 64k '
        f'-af "highpass=f=80,lowpass=f=8000,'
        f'equalizer=f=3000:t=o:w=2:g=2,'
        f'acompressor=threshold=-18dB:ratio=3:attack=5:release=50" '
        f'"{mp3_path}" 2>/dev/null'
    )
    if os.path.exists(wav_path):
        os.unlink(wav_path)
    return ret == 0 and os.path.exists(mp3_path) and os.path.getsize(mp3_path) > 100

# ── Entry point ────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--lang', default='en', choices=['en', 'fr', 'rw'])
    parser.add_argument('--text', default=None)
    parser.add_argument('--out', required=True)
    args = parser.parse_args()

    text = (args.text or sys.stdin.read()).strip()
    if not text:
        print('[synthesize] No text', file=sys.stderr)
        sys.exit(1)

    mp3_path = args.out
    wav_path = mp3_path.replace('.mp3', '.wav')

    # 1. Try Piper
    ok = synthesize_piper(text, args.lang, wav_path)
    if not ok:
        print('[synthesize] Piper unavailable → eSpeak-ng', file=sys.stderr)
        ok = synthesize_espeak(text, args.lang, wav_path)

    if not ok:
        print('[synthesize] All TTS engines failed', file=sys.stderr)
        sys.exit(1)

    # 2. WAV → MP3
    if not wav_to_mp3(wav_path, mp3_path):
        print('[synthesize] ffmpeg conversion failed', file=sys.stderr)
        sys.exit(1)

    print(f'[synthesize] OK → {mp3_path}', file=sys.stderr)

if __name__ == '__main__':
    main()
