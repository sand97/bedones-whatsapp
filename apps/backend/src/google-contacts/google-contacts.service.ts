import { CACHE_MANAGER, type Cache } from '@nestjs/cache-manager';
import { HttpService } from '@nestjs/axios';
import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import {
  CustomerContact,
  GoogleContactSyncStatus,
} from '@app/generated/client';

import { CryptoService } from '../common/crypto.service';
import { PrismaService } from '../prisma/prisma.service';

import { SyncGoogleContactDto } from './dto/sync-google-contact.dto';

type GoogleClientSecretFile = {
  web?: GoogleClientSecretConfig;
  installed?: GoogleClientSecretConfig;
};

type GoogleClientSecretConfig = {
  client_id: string;
  client_secret: string;
  redirect_uris?: string[];
};

type StoredGoogleToken = {
  accessToken: string;
  refreshToken?: string;
  scope?: string;
  tokenType?: string;
  expiryDate?: string;
};

type GooglePeopleSearchResponse = {
  results?: Array<{
    person?: {
      resourceName?: string;
      names?: Array<{ displayName?: string }>;
      phoneNumbers?: Array<{ value?: string }>;
    };
  }>;
};

type GooglePersonResponse = {
  resourceName?: string;
};

const GOOGLE_CONTACTS_SCOPE = 'https://www.googleapis.com/auth/contacts';
const GOOGLE_OAUTH_BASE_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_PEOPLE_BASE_URL = 'https://people.googleapis.com/v1';
const GOOGLE_OAUTH_STATE_PREFIX = 'google-contacts:oauth-state:';
const GOOGLE_OAUTH_STATE_TTL_MS = 10 * 60 * 1000;
const GOOGLE_TOKEN_REFRESH_WINDOW_MS = 60 * 1000;

@Injectable()
export class GoogleContactsService {
  private readonly logger = new Logger(GoogleContactsService.name);
  private oauthClientConfig?: GoogleClientSecretConfig;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly cryptoService: CryptoService,
    private readonly httpService: HttpService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  async createAuthorizeUrl(userId: string): Promise<{ authorizeUrl: string }> {
    const { client_id: clientId } = this.getClientSecretConfig();
    const redirectUri = this.getConfiguredRedirectUri();
    const state = this.cryptoService.generateRandomToken(24);

    await this.cacheManager.set(
      `${GOOGLE_OAUTH_STATE_PREFIX}${state}`,
      JSON.stringify({ userId }),
      GOOGLE_OAUTH_STATE_TTL_MS,
    );

    const url = new URL(GOOGLE_OAUTH_BASE_URL);
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', GOOGLE_CONTACTS_SCOPE);
    url.searchParams.set('access_type', 'offline');
    url.searchParams.set('prompt', 'consent');
    url.searchParams.set('include_granted_scopes', 'true');
    url.searchParams.set('state', state);

    return { authorizeUrl: url.toString() };
  }

  async handleOAuthCallback(code: string, state: string): Promise<string> {
    if (!code || !state) {
      throw new BadRequestException('Missing OAuth code or state');
    }

    const userId = await this.consumeState(state);
    const tokens = await this.exchangeCodeForToken(code);

    await this.storeTokenForUser(userId, tokens);

    return this.buildFrontendRedirect('connected');
  }

  buildFrontendRedirect(
    status: 'connected' | 'error',
    message?: string,
  ): string {
    const baseUrl =
      this.configService.get<string>('GOOGLE_CONTACTS_POST_AUTH_REDIRECT_URL') ||
      this.configService.get<string>('FRONTEND_URL') ||
      'http://localhost:5173';

    const url = new URL('/dashboard', this.ensureTrailingSlash(baseUrl));
    url.searchParams.set('googleContacts', status);

    if (message) {
      url.searchParams.set('message', message);
    }

    return url.toString();
  }

  async getGoogleContactsSummary(userId: string): Promise<{
    connected: boolean;
    contactsCount: number;
  }> {
    const [agent, contactsCount] = await Promise.all([
      this.prisma.whatsAppAgent.findUnique({
        where: { userId },
        select: {
          encryptedGoogleContactsToken: true,
        },
      }),
      this.prisma.customerContact.count({
        where: { userId },
      }),
    ]);

    return {
      connected: Boolean(agent?.encryptedGoogleContactsToken),
      contactsCount,
    };
  }

  async syncContactForAgent(
    agentId: string,
    userId: string,
    dto: SyncGoogleContactDto,
  ): Promise<{
    success: boolean;
    skipped?: boolean;
    reason?: string;
    contact?: CustomerContact;
  }> {
    const normalizedPhoneNumber = this.normalizePhoneNumber(dto.phoneNumber);

    if (!normalizedPhoneNumber) {
      return {
        success: false,
        skipped: true,
        reason: 'invalid_phone_number',
      };
    }

    const existingContact = await this.prisma.customerContact.findUnique({
      where: {
        userId_phoneNumber: {
          userId,
          phoneNumber: normalizedPhoneNumber,
        },
      },
    });

    if (existingContact) {
      return {
        success: true,
        skipped: true,
        reason: 'already_synced',
        contact: existingContact,
      };
    }

    const [agent, businessInfo] = await Promise.all([
      this.prisma.whatsAppAgent.findUnique({
        where: { id: agentId },
        select: {
          encryptedGoogleContactsToken: true,
        },
      }),
      this.prisma.businessInfo.findUnique({
        where: { user_id: userId },
        select: {
          name: true,
          profile_name: true,
        },
      }),
    ]);

    if (!agent?.encryptedGoogleContactsToken) {
      return {
        success: false,
        skipped: true,
        reason: 'google_contacts_not_connected',
      };
    }

    const displayName =
      dto.displayName?.trim() ||
      dto.whatsappPushName?.trim() ||
      `Customer ${normalizedPhoneNumber}`;
    const organizationName =
      businessInfo?.name?.trim() || businessInfo?.profile_name?.trim() || null;

    try {
      const accessToken = await this.getValidAccessTokenForAgent(agentId, userId);
      const existingGoogleContact = await this.findGoogleContactByPhone(
        accessToken,
        normalizedPhoneNumber,
      );

      const contact = await this.prisma.customerContact.create({
        data: {
          userId,
          phoneNumber: normalizedPhoneNumber,
          whatsappChatId: dto.whatsappChatId,
          whatsappContactId: dto.whatsappContactId,
          displayName,
          whatsappPushName: dto.whatsappPushName?.trim() || null,
          organizationName,
          googleResourceName:
            existingGoogleContact?.resourceName ||
            (
              await this.createGoogleContact(accessToken, {
                displayName,
                organizationName,
                phoneNumber: normalizedPhoneNumber,
                whatsappChatId: dto.whatsappChatId,
                whatsappContactId: dto.whatsappContactId,
                whatsappPushName: dto.whatsappPushName?.trim() || null,
              })
            ).resourceName ||
            null,
          googleSyncStatus: existingGoogleContact
            ? GoogleContactSyncStatus.LINKED
            : GoogleContactSyncStatus.CREATED,
        },
      });

      return {
        success: true,
        contact,
      };
    } catch (error: any) {
      this.logger.warn(
        `Google contact sync failed for user ${userId}: ${error.message || error}`,
      );

      return {
        success: false,
        skipped: true,
        reason: error.message || 'google_sync_failed',
      };
    }
  }

  private getClientSecretConfig(): GoogleClientSecretConfig {
    if (this.oauthClientConfig) {
      return this.oauthClientConfig;
    }

    const filePath = this.resolveClientSecretFilePath();
    const fileContent = require(filePath) as GoogleClientSecretFile;
    const config = fileContent.web || fileContent.installed;

    if (!config?.client_id || !config?.client_secret) {
      throw new InternalServerErrorException(
        'Invalid Google OAuth client secret file',
      );
    }

    this.oauthClientConfig = config;
    return config;
  }

  private getConfiguredRedirectUri(): string {
    const redirectUri = this.configService.get<string>(
      'GOOGLE_CONTACTS_REDIRECT_URI',
    );

    if (!redirectUri) {
      throw new InternalServerErrorException(
        'Missing GOOGLE_CONTACTS_REDIRECT_URI',
      );
    }

    const clientConfig = this.getClientSecretConfig();
    if (!clientConfig.redirect_uris?.includes(redirectUri)) {
      throw new InternalServerErrorException(
        'GOOGLE_CONTACTS_REDIRECT_URI is not declared in the Google client secret file',
      );
    }

    return redirectUri;
  }

  private resolveClientSecretFilePath(): string {
    const configuredPath = this.configService.get<string>(
      'GOOGLE_OAUTH_CLIENT_SECRET_PATH',
    );
    const candidates = configuredPath
      ? [configuredPath]
      : ['google_client_secret.json', 'apps/backend/google_client_secret.json'];

    for (const candidate of candidates) {
      const resolved = this.resolvePossiblePath(candidate);
      if (resolved) {
        return resolved;
      }
    }

    throw new InternalServerErrorException(
      'Google OAuth client secret file not found',
    );
  }

  private resolvePossiblePath(candidate: string): string | null {
    const fs = require('fs');
    const path = require('path');

    const attemptedPaths = path.isAbsolute(candidate)
      ? [candidate]
      : [
          path.resolve(process.cwd(), candidate),
          path.resolve(process.cwd(), 'apps/backend', candidate),
        ];

    for (const attemptedPath of attemptedPaths) {
      if (fs.existsSync(attemptedPath)) {
        return attemptedPath;
      }
    }

    return null;
  }

  private async consumeState(state: string): Promise<string> {
    const cacheKey = `${GOOGLE_OAUTH_STATE_PREFIX}${state}`;
    const rawValue = await this.cacheManager.get<string>(cacheKey);

    if (!rawValue) {
      throw new BadRequestException('Invalid or expired OAuth state');
    }

    await this.cacheManager.del(cacheKey);

    const parsed = JSON.parse(rawValue) as { userId?: string };
    if (!parsed.userId) {
      throw new BadRequestException('OAuth state is missing the user id');
    }

    return parsed.userId;
  }

  private async exchangeCodeForToken(code: string): Promise<StoredGoogleToken> {
    const clientConfig = this.getClientSecretConfig();
    const redirectUri = this.getConfiguredRedirectUri();

    const params = new URLSearchParams({
      code,
      client_id: clientConfig.client_id,
      client_secret: clientConfig.client_secret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    });

    const response = await this.httpService.axiosRef.post(GOOGLE_TOKEN_URL, params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    const data = response.data as {
      access_token: string;
      refresh_token?: string;
      scope?: string;
      token_type?: string;
      expires_in?: number;
    };

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      scope: data.scope,
      tokenType: data.token_type,
      expiryDate: data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000).toISOString()
        : undefined,
    };
  }

  private async storeTokenForUser(
    userId: string,
    token: StoredGoogleToken,
  ): Promise<void> {
    const agent = await this.prisma.whatsAppAgent.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!agent) {
      throw new NotFoundException('WhatsApp agent not found for this user');
    }

    await this.prisma.whatsAppAgent.update({
      where: { id: agent.id },
      data: {
        encryptedGoogleContactsToken: this.cryptoService.encrypt(
          JSON.stringify(token),
        ),
        googleContactsConnectedAt: new Date(),
      },
    });
  }

  private async getValidAccessTokenForAgent(
    agentId: string,
    userId: string,
  ): Promise<string> {
    const agent = await this.prisma.whatsAppAgent.findUnique({
      where: { id: agentId },
      select: {
        encryptedGoogleContactsToken: true,
      },
    });

    if (!agent?.encryptedGoogleContactsToken) {
      throw new BadRequestException('Google Contacts is not connected');
    }

    const token = this.decryptStoredToken(agent.encryptedGoogleContactsToken);

    if (!token.expiryDate) {
      return token.accessToken;
    }

    const expiresAt = new Date(token.expiryDate).getTime();
    if (expiresAt - Date.now() > GOOGLE_TOKEN_REFRESH_WINDOW_MS) {
      return token.accessToken;
    }

    if (!token.refreshToken) {
      await this.markGoogleContactsDisconnected(agentId);
      throw new BadRequestException(
        'Missing Google refresh token, please reconnect Google Contacts',
      );
    }

    return this.refreshAccessToken(agentId, userId, token);
  }

  private decryptStoredToken(encryptedValue: string): StoredGoogleToken {
    const rawValue = this.cryptoService.decrypt(encryptedValue);
    return JSON.parse(rawValue) as StoredGoogleToken;
  }

  private async refreshAccessToken(
    agentId: string,
    userId: string,
    token: StoredGoogleToken,
  ): Promise<string> {
    const clientConfig = this.getClientSecretConfig();
    const params = new URLSearchParams({
      client_id: clientConfig.client_id,
      client_secret: clientConfig.client_secret,
      refresh_token: token.refreshToken || '',
      grant_type: 'refresh_token',
    });

    try {
      const response = await this.httpService.axiosRef.post(
        GOOGLE_TOKEN_URL,
        params,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );

      const data = response.data as {
        access_token: string;
        expires_in?: number;
        scope?: string;
        token_type?: string;
      };

      const refreshedToken: StoredGoogleToken = {
        accessToken: data.access_token,
        refreshToken: token.refreshToken,
        scope: data.scope || token.scope,
        tokenType: data.token_type || token.tokenType,
        expiryDate: data.expires_in
          ? new Date(Date.now() + data.expires_in * 1000).toISOString()
          : token.expiryDate,
      };

      await this.storeTokenForUser(userId, refreshedToken);

      return refreshedToken.accessToken;
    } catch (error: any) {
      await this.markGoogleContactsDisconnected(agentId);
      throw new BadRequestException(
        error?.response?.data?.error_description ||
          error?.response?.data?.error ||
          'Google refresh token is no longer valid',
      );
    }
  }

  private async markGoogleContactsDisconnected(agentId: string): Promise<void> {
    await this.prisma.whatsAppAgent.update({
      where: { id: agentId },
      data: {
        encryptedGoogleContactsToken: null,
        googleContactsConnectedAt: null,
      },
    });
  }

  private async findGoogleContactByPhone(
    accessToken: string,
    phoneNumber: string,
  ): Promise<{ resourceName?: string; displayName?: string } | null> {
    const normalizedDigits = this.normalizePhoneNumberDigits(phoneNumber);

    await this.httpService.axiosRef.get<GooglePeopleSearchResponse>(
      `${GOOGLE_PEOPLE_BASE_URL}/people:searchContacts`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        params: {
          query: '',
          readMask: 'names,phoneNumbers',
          pageSize: 1,
        },
      },
    );

    const response = await this.httpService.axiosRef.get<GooglePeopleSearchResponse>(
      `${GOOGLE_PEOPLE_BASE_URL}/people:searchContacts`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        params: {
          query: normalizedDigits,
          readMask: 'names,phoneNumbers',
          pageSize: 10,
        },
      },
    );

    const matchedPerson = response.data.results?.find((entry) =>
      entry.person?.phoneNumbers?.some(
        (candidate) =>
          this.normalizePhoneNumberDigits(candidate.value) === normalizedDigits,
      ),
    )?.person;

    if (!matchedPerson) {
      return null;
    }

    return {
      resourceName: matchedPerson.resourceName,
      displayName: matchedPerson.names?.[0]?.displayName,
    };
  }

  private async createGoogleContact(
    accessToken: string,
    input: {
      displayName: string;
      organizationName: string | null;
      phoneNumber: string;
      whatsappChatId: string;
      whatsappContactId: string;
      whatsappPushName: string | null;
    },
  ): Promise<{ resourceName?: string }> {
    const noteLines = [
      'Source: WhatsApp',
      `Pseudo WhatsApp: ${input.whatsappPushName || input.displayName}`,
      `Chat ID: ${input.whatsappChatId}`,
      `Contact ID: ${input.whatsappContactId}`,
    ];

    const payload: Record<string, unknown> = {
      names: [{ givenName: input.displayName }],
      phoneNumbers: [{ value: input.phoneNumber, type: 'mobile' }],
      biographies: [{ value: noteLines.join('\n') }],
    };

    if (input.organizationName) {
      payload.organizations = [{ name: input.organizationName }];
    }

    const response = await this.httpService.axiosRef.post<GooglePersonResponse>(
      `${GOOGLE_PEOPLE_BASE_URL}/people:createContact`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        params: {
          personFields: 'names,phoneNumbers,organizations,biographies',
        },
      },
    );

    return {
      resourceName: response.data.resourceName,
    };
  }

  private normalizePhoneNumber(value?: string | null): string {
    const digits = this.normalizePhoneNumberDigits(value);
    return digits ? `+${digits}` : '';
  }

  private normalizePhoneNumberDigits(value?: string | null): string {
    return String(value || '').replace(/\D/g, '');
  }

  private ensureTrailingSlash(url: string): string {
    return url.endsWith('/') ? url : `${url}/`;
  }
}
