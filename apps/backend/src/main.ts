// IMPORTANT: Make sure to import `instrument.ts` at the top of your file.
// If you're using CommonJS (CJS) syntax, use `require("./instrument.ts");`
import '@app/instrument';

import { mkdirSync, writeFileSync } from 'fs';
import { createServer as createHttpsServer } from 'https';
import { join } from 'path';
import { TLSSocket } from 'tls';

import { AppModule } from '@app/app.module';
import { readPemValue } from '@app/common/utils/mtls.util';
import { AllExceptionsFilter } from '@app/exception-filter';
import { ValidationPipe } from '@nestjs/common';
import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import * as express from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const internalRoutePrefixes = [
    '/agent-internal',
    '/webhooks/whatsapp/connected',
    '/webhooks/whatsapp/events',
  ];
  const internalPort =
    process.env.BACKEND_INTERNAL_URL &&
    process.env.BACKEND_INTERNAL_URL.startsWith('https://')
      ? Number(new URL(process.env.BACKEND_INTERNAL_URL).port || 9443)
      : 9443;
  const internalTlsCert = readPemValue(process.env.BACKEND_MTLS_SERVER_CERT);
  const internalTlsKey = readPemValue(process.env.BACKEND_MTLS_SERVER_KEY);
  const internalTlsCa = readPemValue(process.env.STEP_CA_ROOT_CERT);
  const hasInternalMtls =
    Boolean(internalTlsCert) &&
    Boolean(internalTlsKey) &&
    Boolean(internalTlsCa);

  if (hasInternalMtls) {
    app.use((req, res, next) => {
      const socket = req.socket as TLSSocket;
      const isInternalRequest =
        Boolean(socket.encrypted) || socket.localPort === internalPort;
      const requestPath = req.path || req.originalUrl || '/';
      const isInternalRoute = internalRoutePrefixes.some((prefix) =>
        requestPath.startsWith(prefix),
      );

      if (isInternalRequest && !isInternalRoute) {
        return res.status(404).json({
          message: 'Route not available on the internal interface',
          statusCode: 404,
        });
      }

      if (!isInternalRequest && isInternalRoute) {
        return res.status(404).json({
          message: 'Route not available on the public interface',
          statusCode: 404,
        });
      }

      return next();
    });
  }

  app.use(
    '/billing/webhooks/stripe',
    express.raw({ type: 'application/json' }),
  );
  app.use(
    '/billing/webhooks/notchpay',
    express.raw({ type: 'application/json' }),
  );

  // Limite étendue pour les stories planifiées avec media inline
  app.use(
    '/users/me/status-schedules',
    express.json({ limit: '30mb' }),
    express.urlencoded({ limit: '30mb', extended: true }),
  );

  // Limite standard
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));

  // Cookie parser for JWT cookie authentication
  app.use(cookieParser());
  // Limite étendue uniquement pour l'upload media
  app.use(
    '/message-metadata/upload-media',
    express.json({ limit: '30mb' }),
    express.urlencoded({ limit: '30mb', extended: true }),
  );

  // Enable CORS
  app.enableCors({
    origin: (
      process.env.CORS_ORIGIN ||
      process.env.CORS_ORIGINS ||
      'http://localhost:5173'
    ).split(','),
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
    .setTitle('Monorepo API')
    .setDescription('Interractive documentation for the Monorepo API')
    .setVersion('1.0')
    .addBearerAuth()
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

  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`🚀 Application is running on: http://localhost:${port}`);
  console.log(`📚 Swagger documentation: http://localhost:${port}/api`);

  if (hasInternalMtls) {
    const internalServer = createHttpsServer(
      {
        ca: internalTlsCa,
        cert: internalTlsCert,
        key: internalTlsKey,
        requestCert: true,
        rejectUnauthorized: true,
      },
      app.getHttpAdapter().getInstance(),
    );

    await new Promise<void>((resolve, reject) => {
      internalServer.once('error', reject);
      internalServer.listen(internalPort, () => resolve());
    });

    console.log(
      `🔐 Internal mTLS interface is running on: https://0.0.0.0:${internalPort}`,
    );
  } else {
    console.warn(
      '⚠️ Internal mTLS interface disabled: missing BACKEND_MTLS_SERVER_CERT, BACKEND_MTLS_SERVER_KEY or STEP_CA_ROOT_CERT.',
    );
  }
}
bootstrap();
