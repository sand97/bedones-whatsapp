jest.mock(
  '@app/generated/client',
  () => {
    const StatusScheduleContentType = {
      TEXT: 'TEXT',
      IMAGE: 'IMAGE',
      VIDEO: 'VIDEO',
    };
    const StatusScheduleState = {
      PENDING: 'PENDING',
      PROCESSING: 'PROCESSING',
      SENT: 'SENT',
      FAILED: 'FAILED',
      CANCELLED: 'CANCELLED',
    };

    return {
      PrismaClient: class PrismaClient {},
      StatusScheduleContentType,
      StatusScheduleState,
    };
  },
  { virtual: true },
);

jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

jest.mock('../minio/minio.service', () => ({
  MinioService: class MinioService {},
}));

jest.mock('../whatsapp-agent/whatsapp-agent.service', () => ({
  WhatsAppAgentService: class WhatsAppAgentService {},
}));

import {
  StatusScheduleContentType,
  StatusScheduleState,
} from '@app/generated/client';

import { StatusSchedulerService } from './status-scheduler.service';

describe('StatusSchedulerService', () => {
  const userId = 'user-123';
  const agentId = 'agent-123';

  const prisma = {
    statusSchedule: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  };
  const minioService = {
    uploadBuffer: jest.fn(),
  };
  const whatsAppAgentService = {
    publishStatus: jest.fn(),
  };

  let service: StatusSchedulerService;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.user.findUnique.mockResolvedValue({
      id: userId,
      whatsappAgent: {
        id: agentId,
      },
    });

    service = new StatusSchedulerService(
      prisma as any,
      minioService as any,
      whatsAppAgentService as any,
    );
  });

  it('uploads inline media to MinIO before creating a schedule', async () => {
    minioService.uploadBuffer.mockResolvedValue({
      success: true,
      url: 'https://minio.example/statuses/image.png',
    });
    prisma.statusSchedule.create.mockImplementation(async ({ data }) => data);
    prisma.statusSchedule.findMany.mockResolvedValue([
      {
        id: 'schedule-1',
        userId,
        contentType: StatusScheduleContentType.IMAGE,
        mediaUrl: 'https://minio.example/statuses/image.png',
        scheduledDay: '2099-03-17',
      },
    ]);

    const result = await service.createForUser(userId, {
      caption: 'Arrivage du jour',
      contentType: StatusScheduleContentType.IMAGE,
      mediaUrl: 'data:image/png;base64,aGVsbG8=',
      scheduledFor: '2099-03-17T10:00:00.000Z',
      timezone: 'Europe/Paris',
    });

    expect(minioService.uploadBuffer).toHaveBeenCalledWith(
      expect.any(Buffer),
      expect.stringMatching(
        new RegExp(
          `^${agentId}/status-schedules/image/${userId}-.*\\.png$`,
        ),
      ),
      'image/png',
    );
    expect(prisma.statusSchedule.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId,
        contentType: StatusScheduleContentType.IMAGE,
        mediaUrl: 'https://minio.example/statuses/image.png',
      }),
    });
    expect(result.schedule.mediaUrl).toBe(
      'https://minio.example/statuses/image.png',
    );
    expect(result.affectedDays).toEqual([
      {
        day: '2099-03-17',
        schedules: [
          expect.objectContaining({
            mediaUrl: 'https://minio.example/statuses/image.png',
          }),
        ],
      },
    ]);
  });

  it('normalizes legacy base64 media before dispatching a due schedule', async () => {
    prisma.statusSchedule.findMany.mockResolvedValue([
      {
        id: 'schedule-1',
        userId,
        contentType: StatusScheduleContentType.IMAGE,
        textContent: null,
        caption: 'Promo',
        mediaUrl: 'data:image/jpeg;base64,aGVsbG8=',
        status: StatusScheduleState.PENDING,
      },
    ]);
    prisma.statusSchedule.updateMany.mockResolvedValue({ count: 1 });
    minioService.uploadBuffer.mockResolvedValue({
      success: true,
      url: 'https://minio.example/statuses/normalized.jpg',
    });
    whatsAppAgentService.publishStatus.mockResolvedValue({
      success: true,
      statusId: 'status-1',
    });
    prisma.statusSchedule.update.mockResolvedValue({});

    const result = await service.dispatchDueSchedules();

    expect(minioService.uploadBuffer).toHaveBeenCalledWith(
      expect.any(Buffer),
      expect.stringMatching(
        new RegExp(
          `^${agentId}/status-schedules/image/${userId}-.*\\.jpg$`,
        ),
      ),
      'image/jpeg',
    );
    expect(prisma.statusSchedule.update).toHaveBeenNthCalledWith(1, {
      where: { id: 'schedule-1' },
      data: {
        mediaUrl: 'https://minio.example/statuses/normalized.jpg',
      },
    });
    expect(whatsAppAgentService.publishStatus).toHaveBeenCalledWith(userId, {
      contentType: StatusScheduleContentType.IMAGE,
      textContent: null,
      caption: 'Promo',
      mediaUrl: 'https://minio.example/statuses/normalized.jpg',
    });
    expect(prisma.statusSchedule.update).toHaveBeenNthCalledWith(2, {
      where: { id: 'schedule-1' },
      data: expect.objectContaining({
        status: StatusScheduleState.SENT,
      }),
    });
    expect(result).toEqual({
      queued: 1,
      sent: 1,
      failed: 0,
    });
  });
});
