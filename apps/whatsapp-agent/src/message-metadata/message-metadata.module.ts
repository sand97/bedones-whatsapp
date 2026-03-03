import { Module } from '@nestjs/common';

import { MinioModule } from '../minio/minio.module';
import { PrismaModule } from '../prisma/prisma.module';
import { MessageMetadataService } from './message-metadata.service';

@Module({
  imports: [PrismaModule, MinioModule],
  providers: [MessageMetadataService],
  exports: [MessageMetadataService],
})
export class MessageMetadataModule {}
