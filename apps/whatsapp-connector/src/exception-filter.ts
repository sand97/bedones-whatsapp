import { Catch, type ArgumentsHost } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { SentryExceptionCaptured } from '@sentry/nestjs';

@Catch()
export class AllExceptionsFilter extends BaseExceptionFilter {
  @SentryExceptionCaptured()
  catch(exception: unknown, host: ArgumentsHost) {
    const name = exception?.constructor?.name;

    if (name === 'AxiosError') {
      console.log('AxiosError data', (exception as any)?.response?.data);
    }

    return super.catch(exception, host);
  }
}
