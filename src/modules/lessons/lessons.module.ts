import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Lesson } from './entities/lesson.entity';
import { Chapter } from './entities/chapter.entity';
import { Hotspot } from './entities/hotspot.entity';
import { LessonsService } from './lessons.service';
import { LessonsController } from './lessons.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Lesson, Chapter, Hotspot])],
  providers: [LessonsService],
  controllers: [LessonsController],
  exports: [LessonsService],
})
export class LessonsModule {}
