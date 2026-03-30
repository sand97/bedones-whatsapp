import { ConnectorClientService } from '@app/connector-client/connector-client.service';
import {
  WhatsAppAgent,
  WhatsAppAgentStatus,
  ConnectionStatus,
  StatusScheduleContentType,
} from '@app/generated/client';
import {
  PageScriptService,
  ScriptVariables,
} from '@app/page-scripts/page-script.service';
import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import axios from 'axios';

import {
  createHttpsAgentFromConfig,
  resolveServiceProtocol,
} from '../common/utils/mtls.util';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class WhatsAppAgentService {
  private readonly logger = new Logger(WhatsAppAgentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly connectorClientService: ConnectorClientService,
    private readonly pageScriptService: PageScriptService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Get the WhatsApp agent for a user
   */
  async getAgentForUser(userId: string): Promise<WhatsAppAgent | null> {
    return this.prisma.whatsAppAgent.findUnique({
      where: { userId },
    });
  }

  /**
   * Get the full URL for a user's agent
   */
  async getAgentUrl(userId: string): Promise<string> {
    const agent = await this.getAgentForUser(userId);

    if (!agent) {
      throw new NotFoundException('WhatsApp agent not found for this user');
    }

    const protocol = resolveServiceProtocol(agent.ipAddress);
    return `${protocol}://${agent.ipAddress}:${agent.port}`;
  }

  /**
   * Get the full URL for a user's WhatsApp connector
   */
  async getConnectorUrl(agent: WhatsAppAgent): Promise<string> {
    if (!agent) {
      throw new NotFoundException('WhatsApp agent not found for this user');
    }

    const protocol = resolveServiceProtocol(agent.ipAddress);
    return `${protocol}://${agent.ipAddress}:${agent.connectorPort}`;
  }

  /**
   * Update agent status
   */
  async updateAgentStatus(
    agentId: string,
    status: WhatsAppAgentStatus,
    connectionStatus?: ConnectionStatus,
  ): Promise<WhatsAppAgent> {
    const agent = await this.prisma.whatsAppAgent.findUnique({
      where: { id: agentId },
    });

    if (!agent) {
      throw new NotFoundException('WhatsApp agent not found');
    }

    const updateData: any = { status };

    if (connectionStatus !== undefined) {
      updateData.connectionStatus = connectionStatus;
    }

    return this.prisma.whatsAppAgent.update({
      where: { id: agentId },
      data: updateData,
    });
  }

  /**
   * Check agent health by calling /health endpoint
   */
  async checkAgentHealth(agentId: string): Promise<{
    healthy: boolean;
    status?: string;
    error?: string;
  }> {
    const agent = await this.prisma.whatsAppAgent.findUnique({
      where: { id: agentId },
    });

    if (!agent) {
      throw new NotFoundException('WhatsApp agent not found');
    }

    const protocol = resolveServiceProtocol(agent.ipAddress);
    const url = `${protocol}://${agent.ipAddress}:${agent.port}/health`;

    try {
      const httpsAgent =
        protocol === 'https'
          ? createHttpsAgentFromConfig(this.configService, {
              caEnv: 'STEP_CA_ROOT_CERT',
              certEnv: 'BACKEND_MTLS_CLIENT_CERT',
              keyEnv: 'BACKEND_MTLS_CLIENT_KEY',
            })
          : undefined;
      const response = await axios.get(url, {
        httpsAgent,
        timeout: 5000,
      });

      const healthy = response.status >= 200 && response.status < 300;

      // Update last health check timestamp
      await this.prisma.whatsAppAgent.update({
        where: { id: agentId },
        data: { lastHealthCheckAt: new Date() },
      });

      return {
        healthy,
        status: response.status.toString(),
      };
    } catch (error) {
      this.logger.error(`Health check failed for agent ${agentId}`, error);
      return {
        healthy: false,
        error: error.message,
      };
    }
  }

  /**
   * Soft delete an agent
   */
  async deleteAgent(agentId: string): Promise<WhatsAppAgent> {
    const agent = await this.prisma.whatsAppAgent.findUnique({
      where: { id: agentId },
    });

    if (!agent) {
      throw new NotFoundException('WhatsApp agent not found');
    }

    // Soft delete by setting status to DELETED
    return this.prisma.whatsAppAgent.update({
      where: { id: agentId },
      data: {
        status: WhatsAppAgentStatus.DELETED,
      },
    });
  }

  /**
   * Execute a script on the user's WhatsApp connector
   */
  private async executeScript(
    userId: string,
    scriptPath: string,
    variables: ScriptVariables = {},
  ): Promise<unknown> {
    const agent = await this.prisma.whatsAppAgent.findFirst({
      where: { userId },
    });

    if (!agent) {
      throw new NotFoundException('WhatsApp agent not found for user');
    }

    const connectorUrl = await this.getConnectorUrl(agent);
    const script = this.pageScriptService.getScript(scriptPath, variables);

    return await this.connectorClientService.executeScript(
      connectorUrl,
      script,
      { targetInstanceId: agent.stackLabel || agent.id },
    );
  }

  /**
   * Get all WhatsApp labels for a user
   */
  async getLabels(userId: string): Promise<
    Array<{
      id: string;
      name: string;
      hexColor: string;
      colorIndex: number;
      count: number;
    }>
  > {
    const result = await this.executeScript(userId, 'labels/getAllLabels');
    return result as Array<{
      id: string;
      name: string;
      hexColor: string;
      colorIndex: number;
      count: number;
    }>;
  }

  /**
   * Create a new label or return existing one with the same name
   */
  async createLabel(
    userId: string,
    labelName: string,
  ): Promise<{
    id: string;
    name: string;
    hexColor: string;
    colorIndex: number;
    alreadyExists?: boolean;
  }> {
    const result = await this.executeScript(userId, 'labels/addNewLabel', {
      LABEL_NAME: labelName,
    });
    return result as {
      id: string;
      name: string;
      hexColor: string;
      colorIndex: number;
      alreadyExists?: boolean;
    };
  }

  /**
   * Validate if a phone number exists on WhatsApp
   */
  async validateContact(
    userId: string,
    phoneNumber: string,
  ): Promise<{
    exists: boolean;
    phoneNumber: string;
    contactId?: string;
  }> {
    const result = await this.executeScript(
      userId,
      'contact/queryContactExists',
      { PHONE_NUMBER: phoneNumber },
    );
    return result as {
      exists: boolean;
      phoneNumber: string;
      contactId?: string;
    };
  }

  /**
   * Update agent configuration (test mode, production mode, labels)
   */
  async updateAgentConfig(
    userId: string,
    config: {
      testPhoneNumbers?: string[];
      testLabels?: string[];
      labelsToNotReply?: string[];
      productionEnabled?: boolean;
    },
  ): Promise<WhatsAppAgent> {
    const agent = await this.prisma.whatsAppAgent.findFirst({
      where: { userId },
    });

    if (!agent) {
      throw new NotFoundException('WhatsApp agent not found for user');
    }

    const updateData: Partial<{
      testPhoneNumbers: string[];
      testLabels: string[];
      labelsToNotReply: string[];
      productionEnabled: boolean;
    }> = {};

    if (config.testPhoneNumbers !== undefined) {
      updateData.testPhoneNumbers = config.testPhoneNumbers;
    }
    if (config.testLabels !== undefined) {
      // Create labels if they don't exist
      for (const labelName of config.testLabels) {
        if (labelName && labelName.trim()) {
          try {
            await this.createLabel(userId, labelName.trim());
            this.logger.log(
              `Label "${labelName}" created or verified for user ${userId}`,
            );
          } catch (error) {
            this.logger.error(
              `Failed to create label "${labelName}" for user ${userId}`,
              error,
            );
            // Continue even if label creation fails
          }
        }
      }
      updateData.testLabels = config.testLabels;
    }
    if (config.labelsToNotReply !== undefined) {
      // Create labels if they don't exist
      for (const labelName of config.labelsToNotReply) {
        if (labelName && labelName.trim()) {
          try {
            await this.createLabel(userId, labelName.trim());
            this.logger.log(
              `Label "${labelName}" created or verified for user ${userId}`,
            );
          } catch (error) {
            this.logger.error(
              `Failed to create label "${labelName}" for user ${userId}`,
              error,
            );
            // Continue even if label creation fails
          }
        }
      }
      updateData.labelsToNotReply = config.labelsToNotReply;
    }
    if (config.productionEnabled !== undefined) {
      // When enabling production mode, ensure labelsToNotReply exist
      if (config.productionEnabled && agent.labelsToNotReply?.length > 0) {
        for (const labelName of agent.labelsToNotReply) {
          if (labelName && labelName.trim()) {
            try {
              await this.createLabel(userId, labelName.trim());
              this.logger.log(
                `Label "${labelName}" created or verified for production mode`,
              );
            } catch (error) {
              this.logger.error(
                `Failed to create label "${labelName}" for user ${userId}`,
                error,
              );
              // Continue even if label creation fails
            }
          }
        }
      }
      updateData.productionEnabled = config.productionEnabled;
    }

    return this.prisma.whatsAppAgent.update({
      where: { id: agent.id },
      data: updateData,
    });
  }

  async publishStatus(
    userId: string,
    payload: {
      contentType: StatusScheduleContentType;
      textContent?: string | null;
      caption?: string | null;
      mediaUrl?: string | null;
    },
  ): Promise<{
    success: boolean;
    statusId?: string;
    messageId?: string;
    contentType?: string;
    error?: string;
  }> {
    const result = await this.executeScript(userId, 'status/sendStatus', {
      STATUS_TYPE: payload.contentType,
      TEXT_CONTENT: payload.textContent ?? '',
      CAPTION: payload.caption ?? '',
      MEDIA_URL: payload.mediaUrl ?? '',
    });

    return result as {
      success: boolean;
      statusId?: string;
      messageId?: string;
      contentType?: string;
      error?: string;
    };
  }

  /**
   * Check if the agent can process a message from a chat
   * Returns agent configuration, context, and authorized groups
   * @param userId - ID of the connected WhatsApp account (e.g., "237657888690@c.us")
   * @param chatId - ID of the chat where the message was received
   * @param message - The message content
   * @param contactLabels - Labels of the contact sending the message
   */
  async canProcess(
    userId: string,
    chatId: string,
    message: string,
    contactLabels?: Array<{ id: string; name: string; hexColor: string }>,
  ): Promise<{
    allowed: boolean;
    reason?: string;
    agentContext?: string;
    managementGroupId?: string;
    agentId?: string;
    authorizedGroups?: Array<{ whatsappGroupId: string; usage: string }>;
  }> {
    // Extract phone number from userId (format: "237657888690@c.us")
    const phoneMatch = userId.match(/^(\d+)@c\.us$/);

    if (!phoneMatch) {
      return {
        allowed: false,
        reason: 'Invalid userId format',
      };
    }

    const phoneNumber = '+' + phoneMatch[1];

    // Find user by phone number
    const user = await this.prisma.user.findUnique({
      where: { phoneNumber },
      include: {
        whatsappAgent: true,
        groups: true,
        onboardingThread: true,
      },
    });

    if (!user) {
      return {
        allowed: false,
        reason: 'User not found',
      };
    }

    const agent = user.whatsappAgent;

    if (!agent) {
      return {
        allowed: false,
        reason: 'Agent not configured for this user',
      };
    }

    // Check if agent is running
    if (agent.status !== WhatsAppAgentStatus.RUNNING) {
      return {
        allowed: false,
        reason: `Agent is not running (status: ${agent.status})`,
      };
    }

    // Check if contact has a label in labelsToNotReply (applies in both modes)
    if (agent.labelsToNotReply && agent.labelsToNotReply.length > 0) {
      const hasBlockedLabel =
        contactLabels?.some((label) =>
          agent.labelsToNotReply.includes(label.name),
        ) || false;

      if (hasBlockedLabel) {
        const blockedLabel = contactLabels?.find((label) =>
          agent.labelsToNotReply.includes(label.name),
        );
        this.logger.debug(
          `Contact has blocked label: ${blockedLabel?.name}, not replying`,
        );
        return {
          allowed: false,
          reason: `Contact has label "${blockedLabel?.name}" which is in the do-not-reply list`,
        };
      }
    }

    // Check production mode vs test mode
    if (agent.productionEnabled) {
      // Production mode: process all messages
      this.logger.log(`Production mode enabled for user ${phoneNumber}`);
    } else {
      // Test mode: only process messages from contacts with testLabels
      if (!agent.testLabels || agent.testLabels.length === 0) {
        return {
          allowed: false,
          reason:
            'Test mode active but no test labels configured. Please configure test labels.',
        };
      }

      // Check if contact has at least one label in testLabels
      const hasTestLabel =
        contactLabels?.some((label) => agent.testLabels.includes(label.name)) ||
        false;

      if (!hasTestLabel) {
        const contactLabelNames =
          contactLabels?.map((l) => l.name).join(', ') || 'none';
        this.logger.debug(
          `Contact labels: [${contactLabelNames}] - Test labels: [${agent.testLabels.join(', ')}]`,
        );
        return {
          allowed: false,
          reason: `Test mode active. Contact must have one of these labels: ${agent.testLabels.join(', ')}`,
        };
      }

      this.logger.log(
        `Test mode: Contact has valid test label, processing message`,
      );
    }

    // Get agent context from onboarding thread
    const agentContext = user.onboardingThread?.context || '';

    // Get all authorized groups
    const authorizedGroups = user.groups.map((g) => ({
      whatsappGroupId: g.whatsappGroupId,
      usage: g.usage,
    }));

    // Find management group
    const managementGroup = user.groups.find((g) =>
      g.usage.toLowerCase().includes('gestion'),
    );

    return {
      allowed: true,
      agentContext,
      managementGroupId: managementGroup?.whatsappGroupId,
      agentId: agent.id,
      authorizedGroups,
    };
  }

  /**
   * Log an agent operation with full metrics (tokens, tools, duration)
   */
  async logOperation(data: {
    // Context
    chatId: string;
    agentId?: string;
    userId?: string;

    // Messages
    userMessage: string;
    agentResponse: string;
    systemPrompt: string;

    // Metrics
    totalTokens?: number;
    promptTokens?: number;
    completionTokens?: number;
    durationMs: number;
    modelName?: string;

    // Tools
    toolsUsed?: Array<{
      name: string;
      args: any;
      result?: any;
      error?: string;
      durationMs?: number;
    }>;

    // Status
    status: 'success' | 'error' | 'rate_limited';
    error?: string;

    // Metadata
    metadata?: any;
  }): Promise<{ success: boolean; operationId?: string }> {
    try {
      // Prefer ownership inference from the agent, because chatId points to the contact conversation.
      let userId = data.userId;

      if (!userId && data.agentId) {
        const agent = await this.prisma.whatsAppAgent.findUnique({
          where: { id: data.agentId },
          select: { userId: true },
        });
        userId = agent?.userId ?? undefined;
      }

      // Fallback for legacy payloads without agentId.
      if (!userId) {
        const phoneMatch = data.chatId.match(/^(\d+)@c\.us$/);
        if (phoneMatch) {
          const phoneNumber = `+${phoneMatch[1]}`;
          const user = await this.prisma.user.findUnique({
            where: { phoneNumber },
            select: { id: true },
          });
          userId = user?.id;
        }
      }

      // Create operation log in database
      const operation = await this.prisma.agentOperation.create({
        data: {
          // Context
          agentId: data.agentId,
          chatId: data.chatId,
          userId,

          // Messages
          userMessage: data.userMessage,
          agentResponse: data.agentResponse,
          systemPrompt: data.systemPrompt,

          // Metrics
          totalTokens: data.totalTokens,
          promptTokens: data.promptTokens,
          completionTokens: data.completionTokens,
          durationMs: data.durationMs,
          modelName: data.modelName,

          // Tools (stored as JSON)
          toolsUsed: data.toolsUsed || [],

          // Status
          status: data.status,
          error: data.error,

          // Metadata
          metadata: data.metadata || {},
        },
      });

      this.logger.log(
        `✅ Operation logged: ${operation.id} | Chat: ${data.chatId} | Duration: ${data.durationMs}ms | Tokens: ${data.totalTokens || 'N/A'} | Tools: ${data.toolsUsed?.length || 0}`,
      );

      return {
        success: true,
        operationId: operation.id,
      };
    } catch (error: any) {
      this.logger.error(
        `Failed to log operation for ${data.chatId}: ${error.message}`,
        error.stack,
      );

      return { success: false };
    }
  }
}
