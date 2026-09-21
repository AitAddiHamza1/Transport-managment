import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  const nodeEnv = config.get<string>('env', 'development');
  const apiPrefix = config.get<string>('apiPrefix', 'api');
  const swaggerPath = config.get<string>('swaggerPath', 'docs');
  const port = config.get<number>('port', 3000);
  const corsOrigin = config.get<string>('corsOrigin', '*');

  // Trust Proxy (nécessaire derrière un reverse proxy Nginx pour conserver l'IP réelle et le protocole)
  const expressInstance = app.getHttpAdapter().getInstance();
  if (expressInstance && typeof expressInstance.set === 'function') {
    expressInstance.set('trust proxy', 1);
  }

  // Préfixe global : /api/...
  app.setGlobalPrefix(apiPrefix);

  // CORS : Gestion sécurisée des origines
  const allowedOrigins =
    corsOrigin === '*'
      ? nodeEnv === 'production'
        ? false
        : true
      : corsOrigin.split(',').map((o) => o.trim());

  app.enableCors({ origin: allowedOrigins, credentials: true });

  // Validation globale des DTO
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Swagger / OpenAPI (exposé uniquement hors environnement de production)
  if (nodeEnv !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('API Gestion de Transport & Logistique')
      .setDescription('Documentation de l’API backend (NestJS + Prisma)')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup(swaggerPath, app, document);
    Logger.log(`Swagger disponible sur http://localhost:${port}/${swaggerPath}`, 'Bootstrap');
  }

  await app.listen(port);
  Logger.log(`API disponible sur le port ${port} (environnement : ${nodeEnv})`, 'Bootstrap');
}

bootstrap();
