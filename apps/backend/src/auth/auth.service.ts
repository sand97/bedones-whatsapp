import { CryptoService } from '@app/common/crypto.service';
import { ConnectorClientService } from '@app/connector-client';
import { UserStatus, ConnectionStatus } from '@app/generated/client';
import { PrismaService } from '@app/prisma/prisma.service';
import { StackPoolService } from '@app/stack-pool/stack-pool.service';
import { UserSyncService } from '@app/whatsapp-agent/user-sync.service';
import { WhatsAppAgentService } from '@app/whatsapp-agent/whatsapp-agent.service';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as Sentry from '@sentry/nestjs';

import { OnboardingService } from '../onboarding/onboarding.service';

import { AuthenticatedUser } from './types/authenticated-user.type';

type RequestPairingCodeResult = {
  code?: string;
  pairingToken?: string;
  pricingUrl?: string;
  qrSessionToken?: string;
  message: string;
  scenario:
    | 'pairing'
    | 'otp'
    | 'qr'
    | 'provisioning'
    | 'payment_required';
};

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly cryptoService: CryptoService,
    private readonly configService: ConfigService,
    private readonly whatsappAgentService: WhatsAppAgentService,
    private readonly stackPoolService: StackPoolService,
    private readonly connectorClientService: ConnectorClientService,
    private readonly userSyncService: UserSyncService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    @Inject(forwardRef(() => OnboardingService))
    private readonly onboardingService: OnboardingService,
  ) {}

  private captureAuthException(
    operation: string,
    error: unknown,
    context: Record<string, unknown> = {},
  ) {
    const userId =
      typeof context.userId === 'string' ? context.userId : undefined;

    Sentry.captureException(error, {
      tags: {
        domain: 'auth',
        operation,
      },
      user: userId ? { id: userId } : undefined,
      contexts: {
        auth: context,
      },
    });
  }

  /**
   * Request a pairing code for WhatsApp authentication
   * Handles OTP, pairing, QR, provisioning and payment-required scenarios.
   */
  async requestPairingCode(
    phoneNumber: string,
    deviceType: 'mobile' | 'desktop' = 'mobile',
  ): Promise<RequestPairingCodeResult> {
    try {
      // Check if user exists
      let user = await this.prisma.user.findUnique({
        where: { phoneNumber },
      });

      // Provision WhatsApp agent if user exists
      let agent = user
        ? await this.whatsappAgentService.getAgentForUser(user.id)
        : null;

      // Check if agent is already authenticated
      let isAuthenticated = false;
      if (agent) {
        const connectorUrl =
          await this.whatsappAgentService.getConnectorUrl(agent);

        try {
          const authResult =
            await this.connectorClientService.isAuthenticated(connectorUrl, {
              targetInstanceId: agent.stackLabel || agent.id,
            });
          // authResult = { success: true, result: { success: true, isAuthenticated: true } }
          isAuthenticated = !!(
            authResult.success &&
            authResult.result?.success &&
            authResult.result?.isAuthenticated
          );
          this.logger.log(
            `Agent authentication status for ${phoneNumber}: ${isAuthenticated}`,
            authResult,
          );
        } catch (error) {
          this.logger.warn(
            `Failed to check authentication status for ${phoneNumber}`,
            error,
          );
          this.captureAuthException(
            'request_pairing_code.check_authentication',
            error,
            {
              connectorUrl,
              phoneNumber,
              userId: user?.id,
            },
          );
        }
      }

      // Scenario 1: User exists AND agent is authenticated -> Send OTP
      if (user && isAuthenticated) {
        this.logger.log(
          `User ${phoneNumber} is already authenticated, sending OTP`,
        );
        return await this.sendOTPScenario(user);
      }

      // Scenario 2: New user OR not authenticated -> Pairing or QR
      this.logger.log(
        `User ${phoneNumber} needs pairing (new user or not authenticated)`,
      );

      if (user) {
        const subscription = await this.prisma.subscription.findUnique({
          where: { userId: user.id },
        });

        if (this.shouldRequirePaidReconnect({ ...user, subscription })) {
          this.logger.log(
            `User ${phoneNumber} must recharge credits before a new stack allocation`,
          );

          return {
            message:
              'Votre session WhatsApp nest plus active. Rechargez vos crédits avant de reconnecter votre agent.',
            pricingUrl: '/pricing',
            scenario: 'payment_required',
          };
        }
      }

      // Create user if doesn't exist
      if (!user) {
        user = await this.prisma.user.create({
          data: {
            phoneNumber,
            status: UserStatus.PENDING_PAIRING,
          },
        });
        this.logger.log(`Created new user with phone number: ${phoneNumber}`);
      }

      // Generate unique pairing token (valid for 5 minutes)
      const pairingToken = this.cryptoService.generateRandomToken(32);
      const pairingTokenExpiresAt = new Date(Date.now() + 5 * 60 * 1000);

      // Update user with pairing token and change status to PAIRING
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          pairingToken,
          pairingTokenExpiresAt,
          status: UserStatus.PAIRING,
        },
      });

      let qrSessionToken: string | undefined;

      if (deviceType === 'desktop') {
        qrSessionToken = await this.generateQrSessionToken(
          phoneNumber,
          pairingToken,
        );
      }

      if (!agent) {
        const reservation = await this.stackPoolService.reserveStackForLogin({
          deviceType,
          pairingToken,
          phoneNumber,
          userId: user.id,
        });

        if (reservation.state === 'provisioning') {
          if (deviceType === 'desktop') {
            await this.storeQrSessionMapping(phoneNumber, pairingToken);
          }

          return {
            message:
              deviceType === 'desktop'
                ? 'Nous préparons votre serveur et récupérerons le code QR dès que la stack sera prête.'
                : 'Nous préparons votre serveur avant de générer le code de pairing.',
            pairingToken,
            qrSessionToken,
            scenario: 'provisioning',
          };
        }

        agent = reservation.agent;
      } else {
        await this.stackPoolService.reserveStackForLogin({
          deviceType,
          pairingToken,
          phoneNumber,
          userId: user.id,
        });
      }

      // Scenario 2a: Desktop device -> Return QR scenario (don't request pairing code)
      if (deviceType === 'desktop') {
        if (agent) {
          await this.storeQrSessionMapping(
            phoneNumber,
            pairingToken,
            agent.stackLabel || agent.id,
          );
        }

        this.logger.log(
          `Desktop device detected, returning QR scenario for: ${phoneNumber}`,
        );
        return {
          pairingToken,
          qrSessionToken,
          message: 'Veuillez scanner le code QR avec WhatsApp',
          scenario: 'qr',
        };
      }

      // Scenario 2b: Mobile device -> Request pairing code
      // Get connector URL
      const connectorUrl =
        await this.whatsappAgentService.getConnectorUrl(agent);

      await this.connectorClientService.startClient(connectorUrl, {
        targetInstanceId: agent.stackLabel || agent.id,
      });

      // Clean and restart connector to ensure fresh state
      // This removes .wwebjs_cache and data directories and restarts the client
      this.logger.log(
        `Cleaning and restarting connector for fresh authentication: ${connectorUrl}`,
      );

      try {
        await this.connectorClientService.cleanAndRestartClient(connectorUrl, {
          targetInstanceId: agent.stackLabel || agent.id,
        });
        this.logger.log(`Connector cleaned and restarted successfully`);

        // Wait for connector to be ready after restart
        await new Promise((resolve) => setTimeout(resolve, 3000));
      } catch (error) {
        this.logger.error(
          `Failed to clean and restart connector, continuing anyway`,
          error,
        );
        this.captureAuthException(
          'request_pairing_code.clean_restart_connector',
          error,
          {
            connectorUrl,
            phoneNumber,
            userId: user.id,
          },
        );
      }

      this.logger.log(`Pairing code request on: ${connectorUrl}`);

      // Request pairing code from connector
      const result = await this.connectorClientService.requestPairingCode(
        connectorUrl,
        phoneNumber,
        { targetInstanceId: agent.stackLabel || agent.id },
      );

      this.logger.log(
        `Pairing code requested successfully for: ${phoneNumber}`,
      );

      return {
        code: result.code,
        pairingToken,
        message: result.message || 'Pairing code sent successfully',
        scenario: 'pairing',
      };
    } catch (error) {
      this.logger.error(
        `Error requesting pairing code for ${phoneNumber}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Private method to handle OTP scenario when user is already authenticated
   */
  private async sendOTPScenario(user: any): Promise<{
    pairingToken: string;
    message: string;
    scenario: 'otp';
  }> {
    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Generate pairing token for this session (valid for 5 minutes)
    const pairingToken = this.cryptoService.generateRandomToken(32);
    const pairingTokenExpiresAt = new Date(Date.now() + 5 * 60 * 1000);

    // Store OTP in Redis with 5 minutes TTL
    const cacheKey = `otp:${user.phoneNumber}`;
    await this.cacheManager.set(cacheKey, otpCode, 300000); // 5 minutes

    // Update user with pairing token
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        pairingToken,
        pairingTokenExpiresAt,
      },
    });

    this.logger.log(`OTP generated for ${user.phoneNumber}: ${otpCode}`);

    // Get agent and connector URL
    const agent = await this.whatsappAgentService.getAgentForUser(user.id);
    if (!agent) {
      throw new Error('Agent not found for user');
    }

    const connectorUrl = await this.whatsappAgentService.getConnectorUrl(agent);

    // Format phone number for WhatsApp (remove + and add @c.us)
    const formattedPhoneNumber = user.phoneNumber.replace('+', '') + '@c.us';

    // Send OTP via WhatsApp (queryExists is now integrated in sendTextMessage)
    const message = `Votre code de connexion est: ${otpCode}\n\nCe code expire dans 5 minutes.`;
    const sendResult = await this.connectorClientService.sendTextMessage(
      connectorUrl,
      formattedPhoneNumber,
      message,
      { targetInstanceId: agent.stackLabel || agent.id },
    );

    // sendResult = { success: true, result: { success: true, messageId: "...", wid: "..." } }
    if (!sendResult.success || !sendResult.result?.success) {
      throw new Error(
        `Failed to send OTP: ${sendResult.result?.error || sendResult.error || 'Unknown error'}`,
      );
    }

    this.logger.log(
      `OTP sent successfully to ${user.phoneNumber} (WID: ${sendResult.result.wid})`,
    );

    return {
      pairingToken,
      message: 'Un code de vérification a été envoyé à votre numéro WhatsApp',
      scenario: 'otp',
    };
  }

  private shouldRequirePaidReconnect(user: {
    credits: number;
    lastLoginAt: Date | null;
    status: UserStatus;
    subscription?: {
      creditsIncluded: number;
      creditsUsed: number;
      endDate: Date;
      isActive: boolean;
    } | null;
  }): boolean {
    const isReturningUser =
      Boolean(user.lastLoginAt) ||
      user.status === UserStatus.ACTIVE ||
      user.status === UserStatus.ONBOARDING;

    if (!isReturningUser) {
      return false;
    }

    return !this.hasAvailableCredits(user);
  }

  private hasAvailableCredits(user: {
    credits: number;
    subscription?: {
      creditsIncluded: number;
      creditsUsed: number;
      endDate: Date;
      isActive: boolean;
    } | null;
  }): boolean {
    if (user.credits > 0) {
      return true;
    }

    if (!user.subscription) {
      return false;
    }

    return (
      user.subscription.isActive &&
      user.subscription.endDate > new Date() &&
      user.subscription.creditsIncluded - user.subscription.creditsUsed > 0
    );
  }

  /**
   * Verify pairing success and complete user setup
   */
  async verifyPairingSuccess(
    phoneNumber: string,
    whatsappProfile: any,
  ): Promise<{
    accessToken: string;
    user: any;
  }> {
    try {
      // Find user by phone number
      const user = await this.prisma.user.findUnique({
        where: { phoneNumber },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Update user status to PAIRED and save WhatsApp profile
      const updatedUser = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          status: UserStatus.PAIRED,
          whatsappProfile: whatsappProfile,
        },
      });

      // Update WhatsApp agent connection status
      const agent = await this.whatsappAgentService.getAgentForUser(user.id);
      if (agent) {
        await this.prisma.whatsAppAgent.update({
          where: { id: agent.id },
          data: {
            connectionStatus: ConnectionStatus.CONNECTED,
          },
        });

        await this.stackPoolService.markUserStackConnected(user.id);
      }

      // Generate JWT token
      const accessToken = this.generateJwtToken(user.id);

      this.logger.log(`Pairing verified successfully for user: ${user.id}`);

      // Synchronize user data (profile, business, catalog) in the background
      // We don't await this to avoid blocking the response
      this.userSyncService.synchronizeUserData(phoneNumber).catch((error) => {
        this.logger.error(
          `Background sync failed for user ${user.id}: ${error.message}`,
          error.stack,
        );
      });

      return {
        accessToken,
        user: {
          id: updatedUser.id,
          phoneNumber: updatedUser.phoneNumber,
          status: updatedUser.status,
          whatsappProfile: updatedUser.whatsappProfile,
        },
      };
    } catch (error) {
      this.logger.error(`Error verifying pairing for ${phoneNumber}`, error);
      throw error;
    }
  }

  /**
   * Confirm pairing OR OTP based on pairingToken
   * Automatically detects the scenario and handles accordingly
   */
  async confirmPairing(
    pairingToken: string,
    otpCode?: string,
  ): Promise<{
    accessToken: string;
    isFirstLogin: boolean;
    redirectTo: string;
    user: any;
  }> {
    try {
      // Find user by pairing token
      const user = await this.prisma.user.findFirst({
        where: { pairingToken },
      });

      if (!user) {
        throw new UnauthorizedException('Invalid pairing token');
      }

      const isFirstLogin = !user.lastLoginAt;

      // Check if token is expired
      if (
        !user.pairingTokenExpiresAt ||
        user.pairingTokenExpiresAt < new Date()
      ) {
        // Clear expired token
        await this.prisma.user.update({
          where: { id: user.id },
          data: {
            pairingToken: null,
            pairingTokenExpiresAt: null,
          },
        });
        throw new UnauthorizedException('Token expired');
      }

      // Check if this is an OTP scenario (OTP exists in cache)
      const cacheKey = `otp:${user.phoneNumber}`;
      const storedOtp = await this.cacheManager.get<string>(cacheKey);

      // Scenario 1: OTP Login (user already authenticated)
      if (storedOtp) {
        this.logger.log(`OTP scenario detected for user: ${user.id}`);

        if (!otpCode) {
          throw new BadRequestException('OTP code is required');
        }

        // Verify OTP
        if (storedOtp !== otpCode) {
          throw new UnauthorizedException('Invalid OTP code');
        }

        // Delete OTP from cache
        await this.cacheManager.del(cacheKey);

        // Check onboarding status
        const thread = await this.onboardingService.getThreadWithMessages(
          user.id,
        );
        const onboardingComplete = thread && thread.score >= 80;

        // Determine redirect path and user status
        let redirectTo = '/context';
        let userStatus: UserStatus = UserStatus.ONBOARDING;

        if (onboardingComplete) {
          redirectTo = '/dashboard';
          userStatus = UserStatus.ACTIVE;
        }

        // Update user status and clear pairing token
        const updatedUser = await this.prisma.user.update({
          where: { id: user.id },
          data: {
            status: userStatus,
            lastLoginAt: new Date(),
            pairingToken: null,
            pairingTokenExpiresAt: null,
          },
        });

        // Generate JWT token
        const accessToken = this.generateJwtToken(user.id);

        this.logger.log(
          `User logged in successfully via OTP: ${user.id}, redirect to: ${redirectTo}`,
        );

        return {
          accessToken,
          isFirstLogin,
          redirectTo,
          user: {
            id: updatedUser.id,
            phoneNumber: updatedUser.phoneNumber,
            status: updatedUser.status,
            whatsappProfile: updatedUser.whatsappProfile,
            lastLoginAt: updatedUser.lastLoginAt,
          },
        };
      }

      // Scenario 2: Pairing (new device)
      this.logger.log(`Pairing scenario detected for user: ${user.id}`);

      // Check if user is actually paired (connector should have called webhook)
      if (user.status !== UserStatus.PAIRED) {
        throw new BadRequestException(
          'WhatsApp connection not yet confirmed. Please complete the pairing process on your phone.',
        );
      }

      // Update user status to ONBOARDING and clear pairing token
      const updatedUser = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          status: UserStatus.ONBOARDING,
          pairingToken: null,
          pairingTokenExpiresAt: null,
        },
        include: {
          whatsappAgent: true,
        },
      });

      // Generate JWT token for onboarding
      const accessToken = this.generateJwtToken(user.id);

      this.logger.log(
        `Pairing confirmed successfully for user: ${user.id}, redirect to: /context`,
      );

      // New users always go through onboarding
      return {
        accessToken,
        isFirstLogin,
        redirectTo: '/context',
        user: {
          id: updatedUser.id,
          phoneNumber: updatedUser.phoneNumber,
          status: updatedUser.status,
          whatsappProfile: updatedUser.whatsappProfile,
        },
      };
    } catch (error) {
      this.logger.error(`Error confirming pairing/OTP with token`, error);
      throw error;
    }
  }

  /**
   * @deprecated Use confirmPairing with otpCode parameter instead
   * Verify OTP and complete login
   */
  async verifyOTP(
    phoneNumber: string,
    code: string,
  ): Promise<{
    accessToken: string;
    user: any;
  }> {
    try {
      // Get OTP from Redis
      const cacheKey = `otp:${phoneNumber}`;
      const storedOtp = await this.cacheManager.get<string>(cacheKey);

      if (!storedOtp) {
        throw new UnauthorizedException('OTP expired or not found');
      }

      // Compare codes
      if (storedOtp !== code) {
        throw new UnauthorizedException('Invalid OTP code');
      }

      // Delete OTP from cache
      await this.cacheManager.del(cacheKey);

      // Find user
      const user = await this.prisma.user.findUnique({
        where: { phoneNumber },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Update user status to ACTIVE and lastLoginAt
      const updatedUser = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          status: UserStatus.ACTIVE,
          lastLoginAt: new Date(),
        },
      });

      // Generate JWT token
      const accessToken = this.generateJwtToken(user.id);

      this.logger.log(`User logged in successfully: ${user.id}`);

      return {
        accessToken,
        user: {
          id: updatedUser.id,
          phoneNumber: updatedUser.phoneNumber,
          status: updatedUser.status,
          whatsappProfile: updatedUser.whatsappProfile,
          lastLoginAt: updatedUser.lastLoginAt,
        },
      };
    } catch (error) {
      this.logger.error(`Error verifying OTP for ${phoneNumber}`, error);
      throw error;
    }
  }

  /**
   * Validate user by ID (used by JWT strategy)
   */
  async validateUser(userId: string): Promise<AuthenticatedUser | null> {
    const [user, contactsCount] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          businessInfo: true,
          onboardingThread: {
            select: {
              score: true,
            },
          },
          whatsappAgent: {
            select: {
              testPhoneNumbers: true,
              testLabels: true,
              labelsToNotReply: true,
              productionEnabled: true,
              encryptedGoogleContactsToken: true,
            },
          },
          subscription: true,
        },
      }),
      this.prisma.customerContact.count({
        where: { userId },
      }),
    ]);

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      phoneNumber: user.phoneNumber,
      status: user.status,
      credits: user.credits,
      whatsappProfile: user.whatsappProfile,
      businessInfo: user.businessInfo,
      contextScore: user.onboardingThread?.score ?? 0,
      agentConfig: user.whatsappAgent
        ? {
            testPhoneNumbers: user.whatsappAgent.testPhoneNumbers,
            testLabels: user.whatsappAgent.testLabels,
            labelsToNotReply: user.whatsappAgent.labelsToNotReply,
            productionEnabled: user.whatsappAgent.productionEnabled,
          }
        : null,
      googleContacts: {
        connected: Boolean(
          user.whatsappAgent?.encryptedGoogleContactsToken,
        ),
        contactsCount,
      },
      subscription: user.subscription,
    };
  }

  /**
   * Cleanup expired pairing sessions
   * Should be called periodically (e.g., every 5 minutes)
   */
  async cleanupExpiredPairingSessions(): Promise<{
    cleanedCount: number;
  }> {
    try {
      const now = new Date();

      // Find users with expired pairing tokens
      const expiredUsers = await this.prisma.user.findMany({
        where: {
          pairingToken: { not: null },
          pairingTokenExpiresAt: { lt: now },
          status: UserStatus.PAIRING,
        },
      });

      if (expiredUsers.length === 0) {
        return { cleanedCount: 0 };
      }

      // Clear pairing tokens and reset status
      await this.prisma.user.updateMany({
        where: {
          id: { in: expiredUsers.map((u) => u.id) },
        },
        data: {
          pairingToken: null,
          pairingTokenExpiresAt: null,
          status: UserStatus.PENDING_PAIRING,
        },
      });

      await Promise.all(
        expiredUsers.map((expiredUser) =>
          this.stackPoolService.releaseCapacity({
            reason: 'pairing-expired',
            userId: expiredUser.id,
          }),
        ),
      );

      this.logger.log(
        `Cleaned up ${expiredUsers.length} expired pairing sessions`,
      );

      return { cleanedCount: expiredUsers.length };
    } catch (error) {
      this.logger.error('Error cleaning up expired pairing sessions', error);
      throw error;
    }
  }

  /**
   * Generate JWT token
   */
  generateJwtToken(userId: string): string {
    const payload = { sub: userId };
    return this.jwtService.sign(payload);
  }

  /**
   * Request a QR code for WhatsApp authentication (desktop only)
   * This method provisions an agent for the user and returns the QR code
   */
  async requestCodeQR(phoneNumber: string): Promise<{
    qrCode?: string;
    pairingToken: string;
    qrSessionToken?: string;
    message: string;
    scenario?: 'connected';
    accessToken?: string;
    redirectTo?: string;
    user?: any;
  }> {
    try {
      let user = await this.prisma.user.findUnique({
        where: { phoneNumber },
      });

      if (!user) {
        user = await this.prisma.user.create({
          data: {
            phoneNumber,
            status: UserStatus.PENDING_PAIRING,
          },
        });
        this.logger.log(`Created new user for QR code auth: ${phoneNumber}`);
      }

      const hasValidExistingToken =
        user.pairingToken &&
        user.pairingTokenExpiresAt &&
        user.pairingTokenExpiresAt > new Date() &&
        user.status === UserStatus.PAIRING;
      const pairingToken =
        user.pairingToken || this.cryptoService.generateRandomToken(32);
      const pairingTokenExpiresAt = hasValidExistingToken
        ? user.pairingTokenExpiresAt!
        : new Date(Date.now() + 5 * 60 * 1000);

      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          pairingToken,
          pairingTokenExpiresAt,
          status: UserStatus.PAIRING,
        },
      });

      let agent = await this.whatsappAgentService.getAgentForUser(user.id);
      if (!agent) {
        const reservation = await this.stackPoolService.reserveStackForLogin({
          deviceType: 'desktop',
          pairingToken,
          phoneNumber,
          userId: user.id,
        });

        if (reservation.state === 'provisioning') {
          const qrSessionToken = await this.generateQrSessionToken(
            phoneNumber,
            pairingToken,
          );
          await this.storeQrSessionMapping(phoneNumber, pairingToken);

          return {
            message:
              'Nous préparons votre stack. Le code QR sera poussé dès que le connector sera prêt.',
            pairingToken,
            qrSessionToken,
          };
        }

        agent = reservation.agent;
      }

      await this.storeQrSessionMapping(
        phoneNumber,
        pairingToken,
        agent.stackLabel || agent.id,
      );

      // Get connector URL
      const connectorUrl =
        await this.whatsappAgentService.getConnectorUrl(agent);

      await this.connectorClientService.startClient(connectorUrl, {
        targetInstanceId: agent.stackLabel || agent.id,
      });

      // Clean and restart connector to ensure fresh state
      // This removes .wwebjs_cache and data directories and restarts the client
      this.logger.log(
        `Cleaning and restarting connector for fresh authentication: ${connectorUrl}`,
      );

      try {
        await this.connectorClientService.cleanAndRestartClient(connectorUrl, {
          targetInstanceId: agent.stackLabel || agent.id,
        });
        this.logger.log(`Connector cleaned and restarted successfully`);

        // Wait for connector to be ready after restart
        await new Promise((resolve) => setTimeout(resolve, 3000));
      } catch (error) {
        this.logger.error(
          `Failed to clean and restart connector, continuing anyway`,
          error,
        );
        this.captureAuthException('request_qr.clean_restart_connector', error, {
          connectorUrl,
          phoneNumber,
          userId: user.id,
        });
      }

      this.logger.log(`Requesting QR code from: ${connectorUrl}`);

      // Request QR code from connector with retry logic
      let qrCode: string | null = null;
      const maxRetries = 10; // Wait up to 10 seconds for QR code
      const retryDelay = 1000; // 1 second between retries

      for (let i = 0; i < maxRetries; i++) {
        try {
          const result =
            await this.connectorClientService.getQRCode(connectorUrl, {
              targetInstanceId: agent.stackLabel || agent.id,
            });

          if (result.success && result.qrCode) {
            qrCode = result.qrCode;
            break;
          }
        } catch {
          // QR code not ready yet, wait and retry
          if (i < maxRetries - 1) {
            await new Promise((resolve) => setTimeout(resolve, retryDelay));
          }
        }
      }

      if (!qrCode) {
        throw new Error(
          'QR code not available. The connector may already be authenticated.',
        );
      }

      this.logger.log(`QR code retrieved successfully for: ${phoneNumber}`);

      const qrSessionToken = await this.generateQrSessionToken(
        phoneNumber,
        pairingToken,
      );

      // Schedule cleanup after 5 minutes if user hasn't connected
      // The cleanup will check if user is still in PAIRING status
      setTimeout(
        async () => {
          try {
            const userCheck = await this.prisma.user.findUnique({
              where: { id: user.id },
            });

            // If user is still in PAIRING status after 5 minutes, reset
            if (userCheck && userCheck.status === UserStatus.PAIRING) {
              await this.prisma.user.update({
                where: { id: user.id },
                data: {
                  status: UserStatus.PENDING_PAIRING,
                  pairingToken: null,
                  pairingTokenExpiresAt: null,
                },
              });
              await this.stackPoolService.releaseCapacity({
                reason: 'qr-session-expired',
                userId: user.id,
              });
              this.logger.log(`QR code session expired for user: ${user.id}`);
            }
          } catch (error) {
            this.logger.error(
              `Error during QR code session cleanup for user ${user.id}`,
              error,
            );
            this.captureAuthException('request_qr.session_cleanup', error, {
              phoneNumber,
              userId: user.id,
            });
          }
        },
        5 * 60 * 1000,
      ); // 5 minutes

      return {
        qrCode,
        pairingToken,
        qrSessionToken,
        message: 'Scannez le code QR avec WhatsApp',
      };
    } catch (error) {
      this.logger.error(`Error requesting QR code for ${phoneNumber}`, error);
      throw error;
    }
  }

  /**
   * Check authentication status during QR code flow
   * This endpoint is polled by the frontend to detect when user scans QR and authenticates
   * It does NOT generate new QR codes - that's done by requestCodeQR
   *
   * Returns:
   * - scenario: 'connected' with JWT if user is authenticated and paired
   * - message only if still waiting for authentication
   */
  async refreshCodeQR(
    pairingToken: string,
    qrSessionToken: string,
  ): Promise<{
    isFirstLogin?: boolean;
    qrCode?: string;
    pairingToken?: string;
    qrSessionToken?: string;
    message: string;
    scenario?: 'connected';
    accessToken?: string;
    redirectTo?: string;
    user?: any;
  }> {
    try {
      // Find user with this pairing token
      const user = await this.prisma.user.findFirst({
        where: {
          pairingToken,
          pairingTokenExpiresAt: { gte: new Date() }, // Token must not be expired
        },
      });

      if (!user) {
        throw new UnauthorizedException(
          'Invalid or expired pairing token. Please request a new QR code.',
        );
      }

      // Validate QR session token to ensure it was issued for this user/token
      await this.verifyQrSessionToken(
        qrSessionToken,
        pairingToken,
        user.phoneNumber,
      );

      this.logger.log(
        `Checking authentication status for user: ${user.phoneNumber}`,
      );

      // Get the WhatsApp agent for this user
      const agent = await this.whatsappAgentService.getAgentForUser(user.id);
      if (!agent) {
        throw new Error('No WhatsApp agent found for this user');
      }

      // Get connector URL
      const connectorUrl =
        await this.whatsappAgentService.getConnectorUrl(agent);

      // Check if connector is already authenticated
      const authResult =
        await this.connectorClientService.isAuthenticated(connectorUrl, {
          targetInstanceId: agent.stackLabel || agent.id,
        });
      const isAuthenticated = !!(
        authResult.success &&
        authResult.result?.success &&
        authResult.result?.isAuthenticated
      );

      if (isAuthenticated) {
        this.logger.log(
          `Connector already authenticated for ${user.phoneNumber}, checking pairing status`,
        );

        const isFirstLogin = !user.lastLoginAt;

        // Check if user is PAIRED (webhook was called)
        if (
          user.status === UserStatus.PAIRED ||
          user.status === UserStatus.ACTIVE ||
          user.status === UserStatus.ONBOARDING
        ) {
          this.logger.log(
            `User ${user.phoneNumber} is already paired, connecting directly`,
          );

          // Check onboarding status to determine redirect
          const thread = await this.onboardingService.getThreadWithMessages(
            user.id,
          );
          const onboardingComplete = thread && thread.score >= 80;

          // Determine redirect path and user status
          let redirectTo = '/context';
          let userStatus: UserStatus = UserStatus.ONBOARDING;

          if (onboardingComplete) {
            redirectTo = '/dashboard';
            userStatus = UserStatus.ACTIVE;
          } else if (user.status === UserStatus.PAIRED) {
            // First login after pairing -> onboarding
            userStatus = UserStatus.ONBOARDING;
          } else {
            // Keep existing status
            userStatus = user.status;
          }

          // Update user status and clear pairing token
          const updatedUser = await this.prisma.user.update({
            where: { id: user.id },
            data: {
              status: userStatus,
              lastLoginAt: new Date(),
              pairingToken: null,
              pairingTokenExpiresAt: null,
            },
          });

          // Update agent connection status
          await this.prisma.whatsAppAgent.update({
            where: { id: agent.id },
            data: {
              connectionStatus: ConnectionStatus.CONNECTED,
            },
          });

          // Generate JWT token
          const accessToken = this.generateJwtToken(user.id);

          this.logger.log(
            `User ${user.phoneNumber} connected successfully, redirect to: ${redirectTo}`,
          );

          return {
            scenario: 'connected',
            accessToken,
            isFirstLogin,
            redirectTo,
            message: 'Connexion réussie',
            user: {
              id: updatedUser.id,
              phoneNumber: updatedUser.phoneNumber,
              status: updatedUser.status,
              whatsappProfile: updatedUser.whatsappProfile,
              lastLoginAt: updatedUser.lastLoginAt,
            },
          };
        } else {
          // User is authenticated but not yet PAIRED (webhook not called yet)
          // This is normal during the pairing flow - we wait for webhook
          this.logger.log(
            `User ${user.phoneNumber} is authenticated but status is ${user.status}, waiting for webhook`,
          );
          // Return waiting message - frontend keeps displaying the QR code
          return {
            message: 'En attente de la confirmation de connexion...',
          };
        }
      }

      // User is not authenticated yet - waiting for QR scan
      // Get the current QR code (which may be a new one if the previous expired)
      // WhatsApp Web JS automatically generates new QR codes without restarting
      this.logger.log(
        `User ${user.phoneNumber} not yet authenticated, fetching current QR code`,
      );

      try {
        const qrResult =
          await this.connectorClientService.getQRCode(connectorUrl, {
            targetInstanceId: agent.stackLabel || agent.id,
          });

        if (qrResult.success && qrResult.qrCode) {
          this.logger.log(
            `Current QR code retrieved for user: ${user.phoneNumber}`,
          );

          return {
            qrCode: qrResult.qrCode,
            message: 'En attente du scan du code QR...',
          };
        }
      } catch (error) {
        this.logger.warn(
          `Failed to get QR code for ${user.phoneNumber}, may be connecting`,
          error,
        );
        this.captureAuthException('refresh_qr.fetch_current_qr', error, {
          connectorUrl,
          phoneNumber: user.phoneNumber,
          userId: user.id,
        });
      }

      // If QR code is not available (e.g., during connection process)
      return {
        message: 'En attente du scan du code QR...',
      };
    } catch (error) {
      this.logger.error(`Error refreshing QR code`, error);
      throw error;
    }
  }

  /**
   * Generate a short-lived JWT used only for QR refresh validation
   */
  private async storeQrSessionMapping(
    phoneNumber: string,
    pairingToken: string,
    connectorInstanceId?: string,
  ) {
    await this.cacheManager.set(`qr-session:${phoneNumber}`, pairingToken, 300000);

    if (connectorInstanceId) {
      await this.cacheManager.set(
        `connector-session:${connectorInstanceId}`,
        pairingToken,
        300000,
      );
    }
  }

  /**
   * Generate a short-lived JWT used only for QR refresh validation
   */
  private async generateQrSessionToken(
    phoneNumber: string,
    pairingToken: string,
  ): Promise<string> {
    const secret =
      this.configService.get<string>('QR_JWT_SECRET') ||
      this.configService.get<string>('JWT_SECRET');
    return this.jwtService.sign(
      { phoneNumber, pairingToken },
      { secret, expiresIn: '10m' },
    );
  }

  /**
   * Verify QR session token and ensure it matches the current user + pairingToken
   */
  private async verifyQrSessionToken(
    token: string,
    pairingToken: string,
    phoneNumber: string,
  ): Promise<void> {
    try {
      const secret =
        this.configService.get<string>('QR_JWT_SECRET') ||
        this.configService.get<string>('JWT_SECRET');
      const payload = this.jwtService.verify(token, { secret }) as {
        phoneNumber: string;
        pairingToken: string;
      };

      if (
        payload.phoneNumber !== phoneNumber ||
        payload.pairingToken !== pairingToken
      ) {
        throw new UnauthorizedException('QR session token mismatch');
      }
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid QR session token');
    }
  }
}
