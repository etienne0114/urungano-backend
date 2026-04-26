import 'reflect-metadata';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';
import { Lesson } from '../../modules/lessons/entities/lesson.entity';

dotenv.config();

const SUPPORTED_LANGS = ['en', 'fr', 'rw'] as const;
type Lang = (typeof SUPPORTED_LANGS)[number];

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'urungano',
  entities: [__dirname + '/../../**/*.entity{.ts,.js}'],
  synchronize: false,
});

function getLocalized(
  localized: Record<string, string> | undefined,
  fallback: string,
  lang: Lang,
): string {
  const val = localized?.[lang]?.trim();
  return val && val.length > 0 ? val : fallback;
}

function line(payload: object): string {
  return `${JSON.stringify(payload)}\n`;
}

async function run(): Promise<void> {
  await dataSource.initialize();
  const repo = dataSource.getRepository(Lesson);

  const lessons = await repo
    .createQueryBuilder('lesson')
    .leftJoinAndSelect('lesson.chapters', 'chapter')
    .leftJoinAndSelect('chapter.hotspots', 'hotspot')
    .where('lesson.isActive = :active', { active: true })
    .orderBy('lesson.slug', 'ASC')
    .addOrderBy('chapter.orderIndex', 'ASC')
    .addOrderBy('hotspot.number', 'ASC')
    .getMany();

  const outDir = path.join(process.cwd(), 'public', 'finetune');
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'lessons_multilingual.jsonl');

  let rows = 0;
  const chunks: string[] = [];

  for (const lesson of lessons) {
    for (const lang of SUPPORTED_LANGS) {
      const lessonTitle = getLocalized(lesson.localizedTitle, lesson.title, lang);
      chunks.push(
        line({
          task: 'lesson_summary',
          language: lang,
          input: {
            lesson_slug: lesson.slug,
            lesson_title: lessonTitle,
          },
          output: {
            lesson_title: lessonTitle,
            chapters: lesson.chapters.length,
            duration_minutes: lesson.durationMinutes,
            category: lesson.category,
          },
        }),
      );
      rows++;
    }

    for (const chapter of lesson.chapters) {
      for (const lang of SUPPORTED_LANGS) {
        const chapterTitle = getLocalized(chapter.localizedTitle, chapter.title, lang);
        const narration = getLocalized(
          chapter.localizedNarration,
          chapter.narrationText,
          lang,
        );
        const hotspotPayload = chapter.hotspots.map((h) => ({
          number: h.number,
          title: getLocalized(h.localizedTitle, h.title, lang),
          description: getLocalized(
            h.localizedDescription,
            h.description,
            lang,
          ),
        }));

        chunks.push(
          line({
            task: 'chapter_narration_and_hotspots',
            language: lang,
            input: {
              lesson_slug: lesson.slug,
              lesson_title: getLocalized(lesson.localizedTitle, lesson.title, lang),
              chapter_order: chapter.orderIndex,
              chapter_title: chapterTitle,
            },
            output: {
              narration,
              hotspots: hotspotPayload,
            },
          }),
        );
        rows++;
      }
    }
  }

  fs.writeFileSync(outPath, chunks.join(''), 'utf8');
  await dataSource.destroy();
  console.log(`✅ Exported ${rows} rows to ${outPath}`);
}

run().catch(async (err) => {
  console.error('❌ Failed to export fine-tune dataset:', err);
  if (dataSource.isInitialized) {
    await dataSource.destroy();
  }
  process.exit(1);
});
