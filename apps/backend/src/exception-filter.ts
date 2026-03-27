import { Catch, ArgumentsHost } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import * as Sentry from '@sentry/nestjs';
import { AxiosError } from 'axios';

@Catch()
export class AllExceptionsFilter extends BaseExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    super.catch(exception, host);
    const name = exception?.constructor?.name;

    const dev = process.env.MODE === 'DEV';

    // if(dev) {
    // console.log(exception);
    // }
    if (name === 'AxiosError') {
      console.log('AxiosError data', (exception as any)?.response?.data);
    }

    if (name !== 'HttpException' && !dev) {
      console.log('Exception captured by Sentry:');
      Sentry.captureException(exception, {
        extra: {
          data:
            name === 'AxiosError'
              ? (exception as AxiosError)?.response?.data
              : undefined,
          error_data:
            name === 'AxiosError'
              ? (exception as any)?.response?.data?.error
              : undefined,
          host,
        },
      });
    }
  }
}
