import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { SanitizationPipe } from './sanitization.pipe';
import { Controller, Post, Body } from '@nestjs/common';
import { IsString } from 'class-validator';
import request from 'supertest';

class TestDto {
  @IsString()
  text: string;
}

@Controller('test')
class TestController {
  @Post()
  test(@Body() dto: TestDto) {
    return { received: dto.text };
  }
}

describe('SanitizationPipe Integration', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [TestController],
    }).compile();

    app = moduleFixture.createNestApplication();
    
    // Apply the sanitization pipe globally
    app.useGlobalPipes(
      new SanitizationPipe(),
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      })
    );

    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('should block XSS attempts', async () => {
    const response = await request(app.getHttpServer())
      .post('/test')
      .send({ text: '<script>alert("xss")</script>' })
      .expect(400);

    expect(response.body.message).toContain('malicious XSS patterns');
  });

  it('should block SQL injection attempts', async () => {
    const response = await request(app.getHttpServer())
      .post('/test')
      .send({ text: "'; DROP TABLE users; --" })
      .expect(400);

    expect(response.body.message).toContain('malicious SQL patterns');
  });

  it('should allow safe text', async () => {
    const response = await request(app.getHttpServer())
      .post('/test')
      .send({ text: 'Hello world' })
      .expect(201);

    expect(response.body.received).toBe('Hello world');
  });

  it('should sanitize HTML tags', async () => {
    const response = await request(app.getHttpServer())
      .post('/test')
      .send({ text: '<p>Hello <b>world</b></p>' })
      .expect(201);

    expect(response.body.received).toBe('Hello world');
  });

  it('should trim whitespace', async () => {
    const response = await request(app.getHttpServer())
      .post('/test')
      .send({ text: '  Hello world  ' })
      .expect(201);

    expect(response.body.received).toBe('Hello world');
  });
});