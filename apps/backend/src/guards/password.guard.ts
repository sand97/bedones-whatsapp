import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  mixin,
} from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';

export default function PasswordGuard(passwordEnvKey = 'MIGRATION_TOKEN') {
  @Injectable()
  class PasswordGuardClass implements CanActivate {
    constructor(readonly i18n: I18nService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
      const request = context.switchToHttp().getRequest();
      const password: string = request.body.token ?? request.query.token;
      if (password === process.env[passwordEnvKey]) {
        return true;
      }
      throw new HttpException(
        await this.i18n.translate('auth.INCORRECT_PASSWORD'),
        HttpStatus.BAD_REQUEST,
      );
    }
  }
  return mixin(PasswordGuardClass);
}
