import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3000);

  // Security
  app.use(helmet());

  // CORS — allow Flutter web apps and admin dashboard
  app.enableCors({
    origin: [
      'http://localhost:3000',
      'http://localhost:5000',
      configService.get('FRONTEND_URL'),
    ].filter(Boolean),
    credentials: true,
  });

  // Global validation pipe — validates all DTOs automatically
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,           // strip unknown fields
      forbidNonWhitelisted: true,
      transform: true,           // auto-transform types
    }),
  );

  // Global prefix for all routes
  app.setGlobalPrefix('api/v1');

  await app.listen(port);
  console.log(`🚀 Eutaw Connect API running on port ${port}`);
  console.log(`📡 Environment: ${configService.get('NODE_ENV')}`);
}

bootstrap();
