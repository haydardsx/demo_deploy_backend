import 'reflect-metadata';
import { Module, HttpException, ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppController } from './app.controller';
import { DatabaseService } from './database.service';
import { corsOrigins } from './config';

@Module({ controllers: [AppController], providers: [DatabaseService] })
class AppModule {}

@Catch()
class SafeErrorFilter implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse();
    const status = error instanceof HttpException ? error.getStatus() : 500;
    const body = error instanceof HttpException ? error.getResponse() : undefined;
    const code = typeof body === 'object' && body !== null && 'errorCode' in body
      ? String(body.errorCode) : status === 404 ? 'NOT_FOUND' : 'REQUEST_FAILED';
    response.status(status).json({ errorCode: code, statusCode: status });
  }
}

export async function createApp() {
  const app = await NestFactory.create(AppModule, { logger: ['warn', 'error'] });
  app.useGlobalFilters(new SafeErrorFilter());
  app.enableCors({ origin: corsOrigins(), methods: ['GET', 'POST'], allowedHeaders: ['Content-Type', 'Accept'] });
  app.use((_request: unknown, response: { setHeader: (key: string, value: string) => void }, next: () => void) => {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    next();
  });
  app.enableShutdownHooks();
  return app;
}
