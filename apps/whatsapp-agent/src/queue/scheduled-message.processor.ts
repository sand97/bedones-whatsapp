import { WhatsAppAgentService } from '@app/langchain/whatsapp-agent.service';
import { PrismaService } from '@app/prisma/prisma.service';
import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import type { Job } from 'bull';

/**
 * Processor for scheduled messages and intentions
 * This will be called when a scheduled message is due to be sent
 *
 * Flow:
 * 1. Récupère l'intention associée au message programmé
 * 2. Appelle l'agent LangChain avec le contexte de l'intention
 * 3. L'agent vérifie la condition (via ses tools)
 * 4. L'agent exécute l'action appropriée (actionIfTrue ou actionIfFalse)
 * 5. Marque l'intention comme COMPLETED ou OBSOLETE
 */
@Processor('scheduled-messages')
export class ScheduledMessageProcessor {
  private readonly logger = new Logger(ScheduledMessageProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly agentService: WhatsAppAgentService,
  ) {}

  @Process('send-reminder')
  async handleScheduledMessage(job: Job) {
    const { chatId, scheduledFor, intentionId } = job.data;

    try {
      this.logger.log(
        `⏰ Processing scheduled message for ${chatId} (scheduled for ${scheduledFor})`,
      );

      // Get scheduled message
      const scheduled = await this.prisma.scheduledMessage.findFirst({
        where: {
          chatId,
          jobId: job.id.toString(),
          status: 'pending',
        },
        include: {
          intention: true,
        },
      });

      if (!scheduled) {
        this.logger.warn(
          `Scheduled message not found or already processed: ${job.id}`,
        );
        return;
      }

      if (!scheduled.intention) {
        this.logger.warn(
          `No intention linked to scheduled message: ${scheduled.id}`,
        );
        return;
      }

      const intention = scheduled.intention;

      // Mark intention as TRIGGERED
      await this.prisma.intention.update({
        where: { id: intention.id },
        data: {
          status: 'TRIGGERED',
          triggeredAt: new Date(),
        },
      });

      // Build context message for the agent
      const intentionContext = this.buildIntentionContext(intention);

      this.logger.log(`🤖 Invoking agent to handle intention: ${intention.type}`);

      // Invoke the agent with intention context
      // The agent will use its tools to:
      // 1. Check if the condition is still valid (conditionToCheck)
      // 2. Execute the appropriate action (actionIfTrue or actionIfFalse)
      // 3. Send messages if needed
      await this.agentService.processIncomingMessage([
        {
          fromMe: false,
          from: chatId,
          body: intentionContext,
        },
      ]);

      // Mark scheduled message as sent
      await this.prisma.scheduledMessage.update({
        where: { id: scheduled.id },
        data: {
          status: 'sent',
          sentAt: new Date(),
        },
      });

      // Mark intention as COMPLETED
      await this.prisma.intention.update({
        where: { id: intention.id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      });

      this.logger.log(`✅ Intention completed for ${chatId}: ${intention.type}`);
    } catch (error: any) {
      this.logger.error(
        `Failed to process scheduled message for ${chatId}:`,
        error.message,
      );

      // Mark intention as failed if exists
      if (job.data.intentionId) {
        await this.prisma.intention
          .update({
            where: { id: job.data.intentionId },
            data: {
              status: 'PENDING', // Reset to pending for retry
            },
          })
          .catch((err) =>
            this.logger.error('Failed to reset intention status', err),
          );
      }

      throw error; // This will trigger retry
    }
  }

  /**
   * Build a context message for the agent to process the intention
   * The agent will understand this special format and handle it appropriately
   */
  private buildIntentionContext(intention: any): string {
    return `[INTENTION_CHECK]
Type: ${intention.type}
Raison: ${intention.reason}

Condition à vérifier: ${intention.conditionToCheck}

Actions:
- Si la condition est VRAIE: ${intention.actionIfTrue || 'Marquer comme complété'}
- Si la condition est FAUSSE: ${intention.actionIfFalse}

Métadonnées: ${JSON.stringify(intention.metadata || {})}

Instructions: Vérifie la condition avec tes outils disponibles (get_older_messages, retrieve_persistent_memory, etc.) et exécute l'action appropriée.`;
  }
}
