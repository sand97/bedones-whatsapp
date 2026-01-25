import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { MinioModule } from '../minio/minio.module';
import { MessageMetadataService } from './message-metadata.service';
import { MessageMetadataController } from './message-metadata.controller';

@Module({
  imports: [PrismaModule, MinioModule],
  controllers: [MessageMetadataController],
  providers: [MessageMetadataService],
  exports: [MessageMetadataService],
})
export class MessageMetadataModule {}
