import {
  StatusSchedule,
  StatusScheduleContentType,
  StatusScheduleState,
} from '@app/generated/client';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { WhatsAppAgentService } from '../whatsapp-agent/whatsapp-agent.service';

import { CreateStatusScheduleDto } from './dto/create-status-schedule.dto';
import { StatusScheduleQueryDto } from './dto/status-schedule-query.dto';
import { UpdateStatusScheduleDto } from './dto/update-status-schedule.dto';

type ScheduleInput = {
  scheduledFor: string;
  timezone: string;
  contentType: StatusScheduleContentType;
  textContent?: string | null;
  caption?: string | null;
  mediaUrl?: string | null;
};

@Injectable()
export class StatusSchedulerService {
  private readonly logger = new Logger(StatusSchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsAppAgentService: WhatsAppAgentService,
  ) {}

  async listForUser(userId: string, query: StatusScheduleQueryDto) {
    if (query.startDate && query.endDate && query.startDate > query.endDate) {
      throw new BadRequestException(
        'startDate must be before or equal to endDate',
      );
    }

    return this.prisma.statusSchedule.findMany({
      where: {
        userId,
        status: {
          not: StatusScheduleState.CANCELLED,
        },
        ...(query.startDate || query.endDate
          ? {
              scheduledDay: {
                ...(query.startDate ? { gte: query.startDate } : {}),
                ...(query.endDate ? { lte: query.endDate } : {}),
              },
            }
          : {}),
      },
      orderBy: [{ scheduledDay: 'asc' }, { scheduledFor: 'asc' }],
    });
  }

  async createForUser(
    userId: string,
    dto: CreateStatusScheduleDto,
  ): Promise<StatusSchedule> {
    await this.assertUserCanSchedule(userId);
    const data = this.buildScheduleData(dto);

    return this.prisma.statusSchedule.create({
      data: {
        userId,
        ...data,
      },
    });
  }

  async updateForUser(
    userId: string,
    scheduleId: string,
    dto: UpdateStatusScheduleDto,
  ): Promise<StatusSchedule> {
    const existing = await this.getOwnedSchedule(scheduleId, userId);

    if (
      existing.status === StatusScheduleState.SENT ||
      existing.status === StatusScheduleState.PROCESSING
    ) {
      throw new BadRequestException(
        'This scheduled status can no longer be edited',
      );
    }

    const data = this.buildScheduleData({
      scheduledFor: dto.scheduledFor ?? existing.scheduledFor.toISOString(),
      timezone: dto.timezone ?? existing.timezone,
      contentType: dto.contentType ?? existing.contentType,
      textContent:
        dto.textContent !== undefined ? dto.textContent : existing.textContent,
      caption: dto.caption !== undefined ? dto.caption : existing.caption,
      mediaUrl: dto.mediaUrl !== undefined ? dto.mediaUrl : existing.mediaUrl,
    });

    return this.prisma.statusSchedule.update({
      where: { id: scheduleId },
      data: {
        ...data,
        status: StatusScheduleState.PENDING,
        attempts: 0,
        sentAt: null,
        lastError: null,
      },
    });
  }

  async cancelForUser(
    userId: string,
    scheduleId: string,
  ): Promise<StatusSchedule> {
    const existing = await this.getOwnedSchedule(scheduleId, userId);

    if (
      existing.status === StatusScheduleState.SENT ||
      existing.status === StatusScheduleState.PROCESSING
    ) {
      throw new BadRequestException(
        'This scheduled status can no longer be cancelled',
      );
    }

    return this.prisma.statusSchedule.update({
      where: { id: scheduleId },
      data: {
        status: StatusScheduleState.CANCELLED,
        lastError: null,
      },
    });
  }

  async dispatchDueSchedules(batchSize = 10) {
    const dueSchedules = await this.prisma.statusSchedule.findMany({
      where: {
        status: StatusScheduleState.PENDING,
        scheduledFor: {
          lte: new Date(),
        },
      },
      orderBy: {
        scheduledFor: 'asc',
      },
      take: batchSize,
    });

    let sent = 0;
    let failed = 0;

    for (const schedule of dueSchedules) {
      const claimed = await this.prisma.statusSchedule.updateMany({
        where: {
          id: schedule.id,
          status: StatusScheduleState.PENDING,
        },
        data: {
          status: StatusScheduleState.PROCESSING,
        },
      });

      if (claimed.count !== 1) {
        continue;
      }

      try {
        const result = await this.whatsAppAgentService.publishStatus(
          schedule.userId,
          {
            contentType: schedule.contentType,
            textContent: schedule.textContent,
            caption: schedule.caption,
            mediaUrl: schedule.mediaUrl,
          },
        );

        if (!result.success) {
          throw new Error(result.error || 'Status publication failed');
        }

        await this.prisma.statusSchedule.update({
          where: { id: schedule.id },
          data: {
            status: StatusScheduleState.SENT,
            attempts: {
              increment: 1,
            },
            sentAt: new Date(),
            lastError: null,
          },
        });

        sent += 1;
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'Unknown error while publishing status';

        await this.prisma.statusSchedule.update({
          where: { id: schedule.id },
          data: {
            status: StatusScheduleState.FAILED,
            attempts: {
              increment: 1,
            },
            lastError: message,
          },
        });

        failed += 1;
        this.logger.error(
          `Failed to publish scheduled status ${schedule.id}: ${message}`,
        );
      }
    }

    return {
      queued: dueSchedules.length,
      sent,
      failed,
    };
  }

  private async assertUserCanSchedule(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        whatsappAgent: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.whatsappAgent) {
      throw new BadRequestException(
        'A WhatsApp agent is required before scheduling statuses',
      );
    }
  }

  private async getOwnedSchedule(scheduleId: string, userId: string) {
    const schedule = await this.prisma.statusSchedule.findUnique({
      where: { id: scheduleId },
    });

    if (!schedule || schedule.userId !== userId) {
      throw new NotFoundException('Scheduled status not found');
    }

    return schedule;
  }

  private buildScheduleData(input: ScheduleInput) {
    const scheduledFor = new Date(input.scheduledFor);

    if (Number.isNaN(scheduledFor.getTime())) {
      throw new BadRequestException(
        'scheduledFor must be a valid ISO datetime',
      );
    }

    if (scheduledFor.getTime() <= Date.now()) {
      throw new BadRequestException('scheduledFor must be in the future');
    }

    const timezone = this.normalizeTimezone(input.timezone);
    const textContent = this.normalizeOptional(input.textContent);
    const caption = this.normalizeOptional(input.caption);
    const mediaUrl = this.normalizeOptional(input.mediaUrl);

    if (input.contentType === StatusScheduleContentType.TEXT && !textContent) {
      throw new BadRequestException(
        'textContent is required for a text status',
      );
    }

    if (input.contentType !== StatusScheduleContentType.TEXT && !mediaUrl) {
      throw new BadRequestException(
        'mediaUrl is required for an image or video status',
      );
    }

    return {
      scheduledFor,
      scheduledDay: this.getDayInTimezone(scheduledFor, timezone),
      timezone,
      contentType: input.contentType,
      textContent:
        input.contentType === StatusScheduleContentType.TEXT
          ? textContent
          : null,
      caption:
        input.contentType === StatusScheduleContentType.TEXT ? null : caption,
      mediaUrl:
        input.contentType === StatusScheduleContentType.TEXT ? null : mediaUrl,
    };
  }

  private normalizeTimezone(timezone: string) {
    try {
      Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
      }).format(new Date());
      return timezone;
    } catch {
      throw new BadRequestException('timezone must be a valid IANA timezone');
    }
  }

  private normalizeOptional(value?: string | null) {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  }

  private getDayInTimezone(date: Date, timezone: string) {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const parts = formatter.formatToParts(date);
    const year = parts.find((part) => part.type === 'year')?.value;
    const month = parts.find((part) => part.type === 'month')?.value;
    const day = parts.find((part) => part.type === 'day')?.value;

    if (!year || !month || !day) {
      throw new BadRequestException('Unable to compute scheduled day');
    }

    return `${year}-${month}-${day}`;
  }
}
