import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  mixin,
} from '@nestjs/common';

export default function PasswordGuard(passwordEnvKey = 'MIGRATION_TOKEN') {
  @Injectable()
  class PasswordGuardClass implements CanActivate {
    constructor() {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
      const request = context.switchToHttp().getRequest();
      const password: string = request.body.token ?? request.query.token;
      if (password === process.env[passwordEnvKey]) {
        return true;
      }
      throw new HttpException(
        'Unauthorized: Invalid token',
        HttpStatus.BAD_REQUEST,
      );
    }
  }
  return mixin(PasswordGuardClass);
}
