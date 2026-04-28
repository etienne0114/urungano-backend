import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { seedLessons } from './lesson.seed';
import { seedCommunity } from './community.seed';

dotenv.config();

// synchronize: false — never auto-alter schema on seed runs.
// Schema changes belong in migrations, not seeds.
// Using synchronize:true on Supabase can drop/recreate tables and wipe all users.
const dataSource = process.env.DATABASE_URL
  ? new DataSource({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      entities: [__dirname + '/../../**/*.entity{.ts,.js}'],
      synchronize: false,
      ssl: { rejectUnauthorized: false },
    })
  : new DataSource({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'urungano',
      entities: [__dirname + '/../../**/*.entity{.ts,.js}'],
      synchronize: false,
    });

async function run(): Promise<void> {
  await dataSource.initialize();
  console.log('🌱 Running seeds...');
  await seedLessons(dataSource);
  await seedCommunity(dataSource);
  console.log('✅ Seeding complete.');
  await dataSource.destroy();
}

run().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
