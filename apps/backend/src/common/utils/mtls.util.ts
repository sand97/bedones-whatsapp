import { existsSync, readFileSync } from 'fs';
import { Agent as HttpsAgent } from 'https';

import { ConfigService } from '@nestjs/config';

type MtlsAgentEnvOptions = {
  caEnv: string;
  certEnv?: string;
  keyEnv?: string;
  rejectUnauthorized?: boolean;
};

export function readPemValue(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }

  if (value.includes('-----BEGIN')) {
    return value.replace(/\\n/g, '\n');
  }

  if (existsSync(value)) {
    return readFileSync(value, 'utf8');
  }

  return value.replace(/\\n/g, '\n');
}

export function createHttpsAgentFromConfig(
  configService: ConfigService,
  options: MtlsAgentEnvOptions,
): HttpsAgent | undefined {
  const ca = readPemValue(configService.get<string>(options.caEnv));

  if (!ca) {
    return undefined;
  }

  const cert = options.certEnv
    ? readPemValue(configService.get<string>(options.certEnv))
    : undefined;
  const key = options.keyEnv
    ? readPemValue(configService.get<string>(options.keyEnv))
    : undefined;

  return new HttpsAgent({
    ca,
    cert,
    keepAlive: true,
    key,
    rejectUnauthorized: options.rejectUnauthorized ?? true,
  });
}

export function isHttpsUrl(url: string): boolean {
  return /^https:\/\//i.test(url);
}

export function resolveServiceProtocol(hostname: string): 'http' | 'https' {
  return hostname === 'localhost' || hostname === '127.0.0.1'
    ? 'http'
    : 'https';
}
