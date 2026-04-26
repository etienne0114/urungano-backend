import { Module } from '@nestjs/common';
import { TtsService } from './tts.service';
import { TtsController } from './tts.controller';

@Module({
  providers: [TtsService],
  controllers: [TtsController],
  exports: [TtsService],
})
export class TtsModule {}
