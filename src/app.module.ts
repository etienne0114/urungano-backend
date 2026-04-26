import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD } from '@nestjs/core';
import { LessonsModule } from './modules/lessons/lessons.module';
import { QuizModule } from './modules/quiz/quiz.module';
import { ProgressModule } from './modules/progress/progress.module';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { CommunityModule } from './modules/community/community.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { SyncModule } from './modules/sync/sync.module';
import { TtsModule } from './modules/tts/tts.module';
import { RateLimitGuard } from './common/guards/rate-limit.guard';

@Module({
  imports: [
    // ── Config ──────────────────────────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // ── Scheduling ──────────────────────────────────────────
    ScheduleModule.forRoot(),

    // ── Rate Limiting ───────────────────────────────────────
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        throttlers: [
          {
            name: 'default',
            ttl: 60000, // 1 minute
            limit: 1000, // 1000 requests per minute for general endpoints
          },
          {
            name: 'auth',
            ttl: 60000, // 1 minute
            limit: 5, // 5 requests per minute for auth endpoints
          },
          {
            name: 'pinVerification',
            ttl: 60000, // 1 minute
            limit: 3, // 3 requests per minute for PIN verification (more restrictive)
          },
        ],
      }),
    }),

    // ── Database ────────────────────────────────────────────
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => {
        const dbUrl = cfg.get<string>('DATABASE_URL');
        if (dbUrl) {
          return {
            type: 'postgres',
            url: dbUrl,
            ssl: { rejectUnauthorized: false }, // Required for Supabase/Vercel
            entities: [__dirname + '/**/*.entity{.ts,.js}'],
            synchronize: cfg.get('NODE_ENV') !== 'production',
            logging: false,
          } as any;
        }
        return {
          type: cfg.get<any>('DB_TYPE', 'postgres'),
          host: cfg.get<string>('DB_HOST', 'localhost'),
          port: cfg.get<number>('DB_PORT', 5432),
          username: cfg.get<string>('DB_USERNAME', 'postgres'),
          password: cfg.get<string>('DB_PASSWORD', 'postgres'),
          database: cfg.get<string>('DB_NAME', 'urungano'),
          entities: [__dirname + '/**/*.entity{.ts,.js}'],
          synchronize: cfg.get('NODE_ENV') !== 'production',
          logging: false,
        } as any;
      },
    }),

    // ── Feature modules ─────────────────────────────────────
    AuthModule,
    UsersModule,
    LessonsModule,
    QuizModule,
    ProgressModule,
    CommunityModule,
    NotificationsModule,
    SyncModule,
    TtsModule,
  ],
  providers: [
    // Global custom rate limiting guard with advanced features
    {
      provide: APP_GUARD,
      useClass: RateLimitGuard,
    },
  ],
})
export class AppModule {}
