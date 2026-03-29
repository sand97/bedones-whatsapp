import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type HetznerActionStatus = 'running' | 'success' | 'error';

type HetznerAction = {
  id: number;
  command?: string;
  error?: {
    code?: string;
    message?: string;
  } | null;
  progress?: number;
  status: HetznerActionStatus;
};

type HetznerServerResponse = {
  id: number;
  name: string;
  public_net?: {
    ipv4?: { ip?: string | null } | null;
    ipv6?: { ip?: string | null } | null;
  } | null;
  private_net?: Array<{
    ip?: string | null;
  }> | null;
  server_type?: {
    name?: string | null;
  } | null;
  datacenter?: {
    location?: {
      name?: string | null;
    } | null;
  } | null;
};

type CreateHetznerServerInput = {
  location: string;
  name: string;
  serverType: string;
  sshKeyNames: string[];
};

type CreateHetznerServerResponse = {
  action: HetznerAction;
  server: HetznerServerResponse;
};

type GetHetznerActionResponse = {
  action: HetznerAction;
};

type GetHetznerServerResponse = {
  server: HetznerServerResponse;
};

@Injectable()
export class HetznerCloudService {
  private readonly logger = new Logger(HetznerCloudService.name);

  constructor(private readonly configService: ConfigService) {}

  async createServer(input: CreateHetznerServerInput) {
    const payload = {
      image: this.getImage(),
      labels: {
        app: 'bedones-whatsapp-agent',
        managed_by: 'backend',
      },
      location: input.location,
      name: input.name,
      public_net: {
        enable_ipv4: true,
        enable_ipv6: true,
      },
      server_type: input.serverType,
      ssh_keys: input.sshKeyNames,
    };

    this.logger.log(
      `[hetzner_create_server] name=${input.name} type=${input.serverType} location=${input.location} payload=${JSON.stringify(payload)}`,
    );

    return this.request<CreateHetznerServerResponse>('/servers', {
      body: JSON.stringify(payload),
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'POST',
    });
  }

  async getAction(actionId: number) {
    this.logger.log(`[hetzner_get_action] action_id=${actionId}`);
    return this.request<GetHetznerActionResponse>(`/actions/${actionId}`);
  }

  async getServer(serverId: number) {
    this.logger.log(`[hetzner_get_server] server_id=${serverId}`);
    return this.request<GetHetznerServerResponse>(`/servers/${serverId}`);
  }

  async deleteServer(serverId: number) {
    this.logger.warn(`[hetzner_delete_server] server_id=${serverId}`);
    return this.request(`/servers/${serverId}`, {
      method: 'DELETE',
    });
  }

  private getApiBaseUrl() {
    return this.configService.get<string>(
      'HERZNET_API_BASE_URL',
      'https://api.hetzner.cloud/v1',
    );
  }

  private getImage() {
    return this.configService.get<string>('STACK_POOL_HETZNER_IMAGE', 'docker-ce');
  }

  private getToken() {
    const token = this.configService.get<string>('HERZNET_API_KEY');
    if (!token) {
      throw new Error('HERZNET_API_KEY is required for Hetzner provisioning.');
    }

    return token;
  }

  private async request<T = unknown>(path: string, init?: RequestInit) {
    const url = `${this.getApiBaseUrl()}${path}`;
    const method = init?.method || 'GET';
    const requestBody = this.stringifyBody(init?.body);

    this.logger.log(
      `[hetzner_request] method=${method} url=${url} body=${requestBody}`,
    );

    const response = await fetch(url, {
      ...init,
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${this.getToken()}`,
        ...(init?.headers || {}),
      },
    });

    const responseText = await response.text();
    const responseBody = responseText ? this.safeParseJson(responseText) : null;

    this.logger.log(
      `[hetzner_response] method=${method} url=${url} status=${response.status} body=${responseText || '<empty>'}`,
    );

    if (!response.ok) {
      throw new Error(
        `Hetzner API ${method} ${path} failed (${response.status}): ${responseText}`,
      );
    }

    return responseBody as T;
  }

  private safeParseJson(text: string) {
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }

  private stringifyBody(body: RequestInit['body']) {
    if (!body) {
      return '<empty>';
    }

    if (typeof body === 'string') {
      return body;
    }

    return '<non-string-body>';
  }
}
