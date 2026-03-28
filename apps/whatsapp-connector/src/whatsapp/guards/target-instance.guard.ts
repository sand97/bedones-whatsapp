import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class TargetInstanceGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const expectedInstanceId = this.configService.get<string>(
      'CONNECTOR_INSTANCE_ID',
    );

    if (!expectedInstanceId) {
      return true;
    }

    const receivedInstanceId = request.header('x-bedones-target-instance');

    if (!receivedInstanceId || receivedInstanceId !== expectedInstanceId) {
      throw new ForbiddenException('Invalid connector instance target');
    }

    return true;
  }
}
