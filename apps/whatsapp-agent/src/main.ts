// IMPORTANT: Make sure to import `instrument.ts` at the top of your file.
// If you're using CommonJS (CJS) syntax, use `require("./instrument.ts");`
import '@app/instrument';

import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

import { AppModule } from '@app/app.module';
import { AllExceptionsFilter } from '@app/exception-filter';
import { ValidationPipe } from '@nestjs/common';
import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as express from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Limite standard
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));
  // Limite étendue pour le webhook message (audio base64)
  app.use(
    '/webhook/message',
    express.json({ limit: '30mb' }),
    express.urlencoded({ limit: '30mb', extended: true }),
  );

  // Enable CORS
  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const { httpAdapter } = app.get(HttpAdapterHost);

  app.useGlobalFilters(new AllExceptionsFilter(httpAdapter));

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('WhatsApp Agent API')
    .setDescription(
      'AI-powered WhatsApp agent using LangChain - Receives events and generates intelligent responses',
    )
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  // Generate swagger.json file
  const outputDir = join(__dirname, '..', 'swagger-output');
  mkdirSync(outputDir, { recursive: true });
  writeFileSync(
    join(outputDir, 'swagger.json'),
    JSON.stringify(document, null, 2),
  );

  console.log('✅ Swagger JSON generated at swagger-output/swagger.json');

  const port = process.env.PORT || 3002;
  await app.listen(port);

  console.log(`🤖 WhatsApp Agent is running on: http://localhost:${port}`);
  console.log(`📚 Swagger documentation: http://localhost:${port}/api`);
}
bootstrap();
