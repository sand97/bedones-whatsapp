import { TLSSocket } from 'tls';

import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

function getPeerCommonName(request: Request): string | undefined {
  const socket = request.socket as TLSSocket;
  const certificate = socket.getPeerCertificate();

  return certificate?.subject?.CN;
}

function isMtlsEnabled(configService: ConfigService): boolean {
  return (
    Boolean(configService.get<string>('STEP_CA_ROOT_CERT')) &&
    Boolean(configService.get<string>('BACKEND_MTLS_SERVER_CERT')) &&
    Boolean(configService.get<string>('BACKEND_MTLS_SERVER_KEY'))
  );
}

function assertAuthorizedTlsSocket(
  request: Request,
  logger: Logger,
  label: string,
): string {
  const socket = request.socket as TLSSocket;

  if (!socket.encrypted) {
    logger.error(`Rejected ${label} request on a non-TLS socket`);
    throw new UnauthorizedException('Mutual TLS is required');
  }

  if (!socket.authorized) {
    logger.error(
      `Rejected ${label} request with unauthorized certificate: ${socket.authorizationError || 'unknown'}`,
    );
    throw new UnauthorizedException('Invalid client certificate');
  }

  const commonName = getPeerCommonName(request);
  if (!commonName) {
    logger.error(`Rejected ${label} request without certificate subject`);
    throw new UnauthorizedException('Missing client certificate subject');
  }

  return commonName;
}

@Injectable()
export class AgentMtlsGuard implements CanActivate {
  private readonly logger = new Logger(AgentMtlsGuard.name);

  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    if (!isMtlsEnabled(this.configService)) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const commonName = assertAuthorizedTlsSocket(
      request,
      this.logger,
      'agent-internal',
    );

    if (!commonName.startsWith('agent:')) {
      this.logger.error(
        `Rejected agent-internal request from unexpected client CN "${commonName}"`,
      );
      throw new UnauthorizedException('Unexpected client certificate');
    }

    return true;
  }
}

@Injectable()
export class ConnectorMtlsGuard implements CanActivate {
  private readonly logger = new Logger(ConnectorMtlsGuard.name);

  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    if (!isMtlsEnabled(this.configService)) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const commonName = assertAuthorizedTlsSocket(
      request,
      this.logger,
      'connector-webhook',
    );

    if (!commonName.startsWith('connector:')) {
      this.logger.error(
        `Rejected webhook request from unexpected client CN "${commonName}"`,
      );
      throw new UnauthorizedException('Unexpected client certificate');
    }

    return true;
  }
}
