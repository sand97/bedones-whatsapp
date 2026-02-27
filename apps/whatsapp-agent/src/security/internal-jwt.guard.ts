import { createHmac, timingSafeEqual } from 'crypto';

import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

interface AgentInternalJwtPayload {
  sub: string;
  type: 'agent-internal';
  iat?: number;
  exp?: number;
}

@Injectable()
export class InternalJwtGuard implements CanActivate {
  private readonly logger = new Logger(InternalJwtGuard.name);

  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<Request & { internalAgentId?: string }>();

    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      this.logger.error('Missing or invalid authorization header');
      throw new UnauthorizedException('Missing or invalid token');
    }

    const token = authHeader.substring(7);
    const secret = this.configService.get<string>('AGENT_INTERNAL_JWT_SECRET');

    if (!secret) {
      this.logger.error('AGENT_INTERNAL_JWT_SECRET not configured');
      throw new UnauthorizedException('Internal auth is not configured');
    }

    try {
      const payload = this.verifyHs256Jwt(token, secret);

      if (payload.type !== 'agent-internal' || !payload.sub) {
        this.logger.error(
          `Invalid token type or missing sub: type=${payload.type}, sub=${payload.sub}`,
        );
        throw new UnauthorizedException('Invalid token type');
      }

      const expectedAgentId = this.configService.get<string>('AGENT_ID');
      if (expectedAgentId && payload.sub !== expectedAgentId) {
        this.logger.warn(
          `Rejected token for agent ${payload.sub}: expected ${expectedAgentId}`,
        );
        throw new UnauthorizedException('Token does not match this agent');
      }

      this.logger.debug(`✅ Internal JWT verified for agent: ${payload.sub}`);
      request.internalAgentId = payload.sub;
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error(`JWT verification failed: ${error.message}`);
      throw new UnauthorizedException(
        `Token verification failed: ${error.message}`,
      );
    }
  }

  private verifyHs256Jwt(
    token: string,
    secret: string,
  ): AgentInternalJwtPayload {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new UnauthorizedException('Invalid token format');
    }

    const [headerPart, payloadPart, signaturePart] = parts;

    const header = this.decodeJson<{ alg?: string; typ?: string }>(headerPart);
    if (header.alg !== 'HS256') {
      throw new UnauthorizedException('Unsupported token algorithm');
    }

    const expectedSignature = createHmac('sha256', secret)
      .update(`${headerPart}.${payloadPart}`)
      .digest('base64url');

    const signatureBuffer = Buffer.from(signaturePart);
    const expectedBuffer = Buffer.from(expectedSignature);

    if (
      signatureBuffer.length !== expectedBuffer.length ||
      !timingSafeEqual(signatureBuffer, expectedBuffer)
    ) {
      throw new UnauthorizedException('Invalid token signature');
    }

    const payload = this.decodeJson<AgentInternalJwtPayload>(payloadPart);
    const now = Math.floor(Date.now() / 1000);

    if (typeof payload.exp === 'number' && payload.exp < now) {
      throw new UnauthorizedException('Token expired');
    }

    return payload;
  }

  private decodeJson<T>(base64Url: string): T {
    try {
      return JSON.parse(
        Buffer.from(base64Url, 'base64url').toString('utf8'),
      ) as T;
    } catch {
      throw new UnauthorizedException('Invalid token payload');
    }
  }
}
