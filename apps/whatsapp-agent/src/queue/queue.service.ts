import { PrismaService } from '@app/prisma/prisma.service';
import { InjectQueue } from '@nestjs/bull';
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import type { Queue } from 'bull';

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);

  constructor(
    @InjectQueue('scheduled-messages') private scheduledMessagesQueue: Queue,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Schedule an intention with message for later
   * @param chatId - WhatsApp chat ID
   * @param scheduledFor - When to check the intention
   * @param intention - Intention details
   */
  async scheduleIntention(
    chatId: string,
    scheduledFor: Date,
    intention: {
      type: string;
      reason: string;
      conditionToCheck: string;
      actionIfTrue?: string;
      actionIfFalse: string;
      metadata?: any;
      createdByRole?: string;
    },
  ) {
    try {
      // Calculate delay
      const delay = scheduledFor.getTime() - Date.now();

      if (delay <= 0) {
        throw new Error('Scheduled time must be in the future');
      }

      // Create intention first
      const intentionRecord = await this.prisma.intention.create({
        data: {
          chatId,
          type: intention.type as any,
          reason: intention.reason,
          conditionToCheck: intention.conditionToCheck,
          actionIfTrue: intention.actionIfTrue,
          actionIfFalse: intention.actionIfFalse,
          scheduledFor,
          metadata: intention.metadata || {},
          createdByRole: intention.createdByRole || 'agent',
          status: 'PENDING',
        },
      });

      // Add job to queue
      const job = await this.scheduledMessagesQueue.add(
        'send-reminder',
        {
          chatId,
          scheduledFor: scheduledFor.toISOString(),
          intentionId: intentionRecord.id,
        },
        {
          delay,
          jobId: `intention-${chatId}-${scheduledFor.getTime()}`,
        },
      );

      // Create scheduled message linked to intention
      const scheduled = await this.prisma.scheduledMessage.create({
        data: {
          chatId,
          scheduledFor,
          context: {
            reason: intention.reason,
            type: intention.type,
          },
          jobId: job.id.toString(),
          status: 'pending',
        },
      });

      // Link intention to scheduled message
      await this.prisma.intention.update({
        where: { id: intentionRecord.id },
        data: {
          scheduledMessageId: scheduled.id,
        },
      });

      this.logger.log(
        `✅ Scheduled intention ${intention.type} for ${chatId} at ${scheduledFor.toISOString()}`,
      );

      return {
        success: true,
        intentionId: intentionRecord.id,
        scheduledId: scheduled.id,
        jobId: job.id.toString(),
      };
    } catch (error: any) {
      this.logger.error('Failed to schedule intention:', error.message);
      throw error;
    }
  }

  /**
   * Cancel an intention
   * @param intentionId - ID of the intention
   * @param cancelledByRole - Role of who cancelled (for permission check)
   */
  async cancelIntention(intentionId: string, cancelledByRole?: string) {
    try {
      const intention = await this.prisma.intention.findUnique({
        where: { id: intentionId },
        include: { scheduledMessage: true },
      });

      if (!intention) {
        throw new Error('Intention not found');
      }

      if (intention.status !== 'PENDING') {
        throw new Error(
          `Cannot cancel intention with status: ${intention.status}`,
        );
      }

      // Permission check: admin can cancel any, agent can only cancel own
      if (cancelledByRole === 'agent' && intention.createdByRole === 'admin') {
        throw new Error('Agent cannot cancel admin-created intentions');
      }

      // Remove job from queue if exists
      if (intention.scheduledMessage?.jobId) {
        const job = await this.scheduledMessagesQueue.getJob(
          intention.scheduledMessage.jobId,
        );
        if (job) {
          await job.remove();
        }
      }

      // Update scheduled message status
      if (intention.scheduledMessage) {
        await this.prisma.scheduledMessage.update({
          where: { id: intention.scheduledMessage.id },
          data: { status: 'cancelled' },
        });
      }

      // Update intention status
      await this.prisma.intention.update({
        where: { id: intentionId },
        data: {
          status: 'CANCELLED',
          completedAt: new Date(),
        },
      });

      this.logger.log(`✅ Cancelled intention: ${intentionId}`);

      return {
        success: true,
        intentionId,
      };
    } catch (error: any) {
      this.logger.error('Failed to cancel intention:', error.message);
      throw error;
    }
  }

  /**
   * Get pending intentions for a chat
   * @param chatId - WhatsApp chat ID
   */
  async getPendingIntentions(chatId: string) {
    return this.prisma.intention.findMany({
      where: {
        chatId,
        status: 'PENDING',
        scheduledFor: {
          gt: new Date(),
        },
      },
      orderBy: {
        scheduledFor: 'asc',
      },
    });
  }

  /**
   * Clean old completed scheduled messages (older than 90 days)
   * Runs automatically every Sunday at midnight
   */
  @Cron(CronExpression.EVERY_WEEK)
  async cleanOldScheduledMessages() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 90);

    const result = await this.prisma.scheduledMessage.deleteMany({
      where: {
        status: {
          in: ['sent', 'cancelled'],
        },
        updatedAt: {
          lt: thirtyDaysAgo,
        },
      },
    });

    this.logger.log(`🗑️ Cleaned ${result.count} old scheduled messages`);

    return result.count;
  }
}
