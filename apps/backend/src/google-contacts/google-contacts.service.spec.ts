import {
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';

jest.mock(
  '@app/generated/client',
  () => ({
    GoogleContactSyncStatus: {
      CREATED: 'CREATED',
      LINKED: 'LINKED',
    },
  }),
  { virtual: true },
);

jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { GoogleContactSyncStatus } from '@app/generated/client';

import { GoogleContactsService } from './google-contacts.service';

describe('GoogleContactsService', () => {
  let configValues: Record<string, string | undefined>;

  const prisma = {
    whatsAppAgent: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    customerContact: {
      count: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    businessInfo: {
      findUnique: jest.fn(),
    },
  };

  const configService = {
    get: jest.fn((key: string) => configValues[key]),
  };

  const cryptoService = {
    generateRandomToken: jest.fn(),
    encrypt: jest.fn((value: string) => `encrypted:${value}`),
    decrypt: jest.fn(),
  };

  const httpService = {
    axiosRef: {
      get: jest.fn(),
      post: jest.fn(),
    },
  };

  const cacheManager = {
    set: jest.fn(),
    get: jest.fn(),
    del: jest.fn(),
  };

  let service: GoogleContactsService;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();

    configValues = {
      GOOGLE_CONTACTS_REDIRECT_URI:
        'https://api-whatsapp.example.com/google/callback',
      GOOGLE_CONTACTS_POST_AUTH_REDIRECT_URL: 'https://whatsapp.example.com',
    };

    service = new GoogleContactsService(
      prisma as any,
      configService as any,
      cryptoService as any,
      httpService as any,
      cacheManager as any,
    );
  });

  it('builds an OAuth authorize URL with the configured redirect URI', async () => {
    cryptoService.generateRandomToken.mockReturnValue('oauth-state');
    jest.spyOn(service as any, 'getClientSecretConfig').mockReturnValue({
      client_id: 'google-client-id',
      client_secret: 'google-client-secret',
      redirect_uris: [configValues.GOOGLE_CONTACTS_REDIRECT_URI],
    });

    const result = await service.createAuthorizeUrl('user-1');
    const url = new URL(result.authorizeUrl);

    expect(cacheManager.set).toHaveBeenCalledWith(
      'google-contacts:oauth-state:oauth-state',
      JSON.stringify({ userId: 'user-1' }),
      10 * 60 * 1000,
    );
    expect(url.origin + url.pathname).toBe(
      'https://accounts.google.com/o/oauth2/v2/auth',
    );
    expect(url.searchParams.get('client_id')).toBe('google-client-id');
    expect(url.searchParams.get('redirect_uri')).toBe(
      configValues.GOOGLE_CONTACTS_REDIRECT_URI,
    );
    expect(url.searchParams.get('scope')).toBe(
      'https://www.googleapis.com/auth/contacts',
    );
    expect(url.searchParams.get('prompt')).toBe('consent');
    expect(url.searchParams.get('state')).toBe('oauth-state');
  });

  it('rejects a redirect URI that is not declared in the Google client secret', () => {
    jest.spyOn(service as any, 'getClientSecretConfig').mockReturnValue({
      client_id: 'google-client-id',
      client_secret: 'google-client-secret',
      redirect_uris: ['https://whatsapp.example.com/google/callback'],
    });

    expect(() => (service as any).getConfiguredRedirectUri()).toThrow(
      InternalServerErrorException,
    );
    expect(() => (service as any).getConfiguredRedirectUri()).toThrow(
      'GOOGLE_CONTACTS_REDIRECT_URI is not declared in the Google client secret file',
    );
  });

  it('rejects OAuth callbacks with an invalid state', async () => {
    cacheManager.get.mockResolvedValue(null);

    await expect(
      service.handleOAuthCallback('authorization-code', 'invalid-state'),
    ).rejects.toThrow(BadRequestException);
  });

  it('skips sync when the contact already exists locally', async () => {
    prisma.customerContact.findUnique.mockResolvedValue({
      id: 'contact-1',
      userId: 'user-1',
      phoneNumber: '+33612345678',
    });

    const result = await service.syncContactForAgent('agent-1', 'user-1', {
      phoneNumber: '+33 6 12 34 56 78',
      whatsappChatId: '33612345678@c.us',
      whatsappContactId: '33612345678@c.us',
      displayName: 'Client existant',
      whatsappPushName: 'Client existant',
    });

    expect(result).toEqual({
      success: true,
      skipped: true,
      reason: 'already_synced',
      contact: {
        id: 'contact-1',
        userId: 'user-1',
        phoneNumber: '+33612345678',
      },
    });
    expect(prisma.customerContact.create).not.toHaveBeenCalled();
  });

  it('links an existing Google contact without creating a new one', async () => {
    prisma.customerContact.findUnique.mockResolvedValue(null);
    prisma.whatsAppAgent.findUnique.mockResolvedValue({
      encryptedGoogleContactsToken: 'encrypted-token',
    });
    prisma.businessInfo.findUnique.mockResolvedValue({
      name: 'Bedones',
      profile_name: null,
    });
    prisma.customerContact.create.mockImplementation(async ({ data }: any) => ({
      id: 'customer-contact-1',
      ...data,
    }));
    cryptoService.decrypt.mockReturnValue(
      JSON.stringify({
        accessToken: 'access-token',
        expiryDate: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      }),
    );

    const findGoogleContactByPhone = jest
      .spyOn(service as any, 'findGoogleContactByPhone')
      .mockResolvedValue({
        resourceName: 'people/c123',
        displayName: 'Alice Example',
      });
    const createGoogleContact = jest
      .spyOn(service as any, 'createGoogleContact')
      .mockResolvedValue({
        resourceName: 'people/new-contact',
      });

    const result = await service.syncContactForAgent('agent-1', 'user-1', {
      phoneNumber: '+33 6 98 76 54 32',
      whatsappChatId: '33698765432@c.us',
      whatsappContactId: '33698765432@c.us',
      displayName: 'Alice Example',
      whatsappPushName: 'Alice',
    });

    expect(findGoogleContactByPhone).toHaveBeenCalledWith(
      'access-token',
      '+33698765432',
    );
    expect(createGoogleContact).not.toHaveBeenCalled();
    expect(prisma.customerContact.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user-1',
        phoneNumber: '+33698765432',
        organizationName: 'Bedones',
        googleResourceName: 'people/c123',
        googleSyncStatus: GoogleContactSyncStatus.LINKED,
      }),
    });
    expect(result).toEqual({
      success: true,
      contact: expect.objectContaining({
        id: 'customer-contact-1',
        googleResourceName: 'people/c123',
        googleSyncStatus: GoogleContactSyncStatus.LINKED,
      }),
    });
  });

  it('creates a Google contact when no Google match exists', async () => {
    prisma.customerContact.findUnique.mockResolvedValue(null);
    prisma.whatsAppAgent.findUnique.mockResolvedValue({
      encryptedGoogleContactsToken: 'encrypted-token',
    });
    prisma.businessInfo.findUnique.mockResolvedValue({
      name: null,
      profile_name: 'Bedones profile',
    });
    prisma.customerContact.create.mockImplementation(async ({ data }: any) => ({
      id: 'customer-contact-2',
      ...data,
    }));
    cryptoService.decrypt.mockReturnValue(
      JSON.stringify({
        accessToken: 'access-token',
        expiryDate: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      }),
    );

    jest
      .spyOn(service as any, 'findGoogleContactByPhone')
      .mockResolvedValue(null);
    const createGoogleContact = jest
      .spyOn(service as any, 'createGoogleContact')
      .mockResolvedValue({
        resourceName: 'people/new-contact',
      });

    const result = await service.syncContactForAgent('agent-1', 'user-1', {
      phoneNumber: '06 11 22 33 44',
      whatsappChatId: '33611223344@c.us',
      whatsappContactId: '33611223344@c.us',
      displayName: '',
      whatsappPushName: 'Prospect WhatsApp',
    });

    expect(createGoogleContact).toHaveBeenCalledWith(
      'access-token',
      expect.objectContaining({
        displayName: 'Prospect WhatsApp',
        organizationName: 'Bedones profile',
        phoneNumber: '+0611223344',
      }),
    );
    expect(prisma.customerContact.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        displayName: 'Prospect WhatsApp',
        organizationName: 'Bedones profile',
        googleResourceName: 'people/new-contact',
        googleSyncStatus: GoogleContactSyncStatus.CREATED,
      }),
    });
    expect(result).toEqual({
      success: true,
      contact: expect.objectContaining({
        id: 'customer-contact-2',
        googleResourceName: 'people/new-contact',
        googleSyncStatus: GoogleContactSyncStatus.CREATED,
      }),
    });
  });
});
