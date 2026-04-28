import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { join } from 'path';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from '@common/filters/http-exception.filter';
import { ResponseTransformInterceptor } from '@common/interceptors/response-transform.interceptor';
import { SanitizationPipe } from '@common/pipes/sanitization.pipe';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  // ── Static file serving for 3D model assets ───────────────
  // Place GLB/GLTF files in backend/public/models/
  // Accessible at http://localhost:4000/static/models/{file}.glb
  app.useStaticAssets(join(__dirname, '..', 'public'), { prefix: '/static' });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 4000);
  const apiPrefix = configService.get<string>('API_PREFIX', 'api/v1');
  const corsOrigin = configService.get<string>('CORS_ORIGIN', '*');

  // ── Global prefix ─────────────────────────────────────────
  app.setGlobalPrefix(apiPrefix);

  // ── CORS ──────────────────────────────────────────────────
  app.enableCors({ origin: true, credentials: true });

  // ── Security middleware ───────────────────────────────────
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false, // Allow for development
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  }));

  // ── Global pipes / filters / interceptors ─────────────────
  app.useGlobalPipes(
    new SanitizationPipe(), // Apply sanitization first
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      disableErrorMessages: false,
      validationError: { target: false, value: false },
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new ResponseTransformInterceptor());

  // ── Swagger / OpenAPI ─────────────────────────────────────
  const swaggerConfig = new DocumentBuilder()
    .setTitle('URUNGANO API')
    .setDescription(
      'ReproHealth 3D — REST API for lessons, quiz, progress tracking, and user management.',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup(`${apiPrefix}/docs`, app, document);

  await app.listen(port);
  console.log(`🚀 URUNGANO API running on http://localhost:${port}/${apiPrefix}`);
  console.log(`📚 Swagger docs: http://localhost:${port}/${apiPrefix}/docs`);
}

bootstrap();
