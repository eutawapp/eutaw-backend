import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3000);


  // CORS — allow all origins (Flutter web runs on varying localhost ports)
  app.enableCors({
    origin: true,        // reflect the request origin — safe for an API that uses JWT auth
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

  // Global prefix — Vercel routes all traffic to this handler so
  // the prefix must match what the Flutter app sends (/api/v1/...)
  app.setGlobalPrefix('api/v1');

  await app.listen(port);
  console.log(`🚀 Eutaw Connect API running on port ${port}`);
  console.log(`📡 Environment: ${configService.get('NODE_ENV')}`);
}

bootstrap();
