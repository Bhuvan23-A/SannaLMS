import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { mkdirSync } from 'fs';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Global validation pipe with class-validator
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,            // Strip unknown properties
    forbidNonWhitelisted: false, // Don't throw on extra props (for backward compat)
    transform: true,            // Auto-transform types
    transformOptions: { enableImplicitConversion: true },
  }));

  app.enableCors();

  // Serve uploaded files as static assets
  const uploadsDir = join(process.cwd(), 'uploads');
  mkdirSync(uploadsDir, { recursive: true });
  app.useStaticAssets(uploadsDir, { prefix: '/uploads/' });

  await app.listen(3001);
}
void bootstrap();
