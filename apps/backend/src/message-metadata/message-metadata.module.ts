import { Module } from '@nestjs/common';

import { MinioModule } from '../minio/minio.module';
import { PrismaModule } from '../prisma/prisma.module';

import { MessageMetadataController } from './message-metadata.controller';
import { MessageMetadataService } from './message-metadata.service';

@Module({
  imports: [PrismaModule, MinioModule],
  controllers: [MessageMetadataController],
  providers: [MessageMetadataService],
  exports: [MessageMetadataService],
})
export class MessageMetadataModule {}
