import { BackendClientModule } from '@app/backend-client/backend-client.module';
import { CatalogModule } from '@app/catalog/catalog.module';
import { ConnectorModule } from '@app/connector/connector.module';
import { ImageProcessingModule } from '@app/image-processing/image-processing.module';
import { PageScriptModule } from '@app/page-scripts/page-script.module';
import { PrismaModule } from '@app/prisma/prisma.module';
import { QueueModule } from '@app/queue/queue.module';
import { Module, forwardRef } from '@nestjs/common';

import { CatalogTools } from './catalog/catalog.tools';
import { AdminGroupMessagingService } from './chat/admin-group-messaging.service';
import { ChatTools } from './chat/chat.tools';
import { CommunicationTools } from './communication/communication.tools';
import { CommunicationTestController } from './communication/communication-test.controller';
import { ProductSendService } from './communication/product-send.service';
import { ContactResolverService } from './contact/contact-resolver.service';
import { GroupTools } from './group/group.tools';
import { IntentTools } from './intent/intent.tools';
import { LabelsTools } from './labels/labels.tools';
import { MemoryTools } from './memory/memory.tools';
import { MessagesTools } from './messages/messages.tools';

@Module({
  imports: [
    BackendClientModule,
    PrismaModule,
    ConnectorModule,
    CatalogModule, // Provides semantic search and sync
    ImageProcessingModule, // Provides Qdrant vector search
    PageScriptModule, // Provides script loading from files
    forwardRef(() => QueueModule), // MessagesTools needs QueueService
  ],
  providers: [
    CommunicationTools,
    ProductSendService,
    ContactResolverService,
    AdminGroupMessagingService,
    CatalogTools,
    ChatTools,
    GroupTools,
    LabelsTools,
    MemoryTools,
    IntentTools,
    MessagesTools,
  ],
  controllers: [CommunicationTestController],
  exports: [
    CommunicationTools,
    ProductSendService,
    ContactResolverService,
    AdminGroupMessagingService,
    CatalogTools,
    ChatTools,
    GroupTools,
    LabelsTools,
    MemoryTools,
    IntentTools,
    MessagesTools,
  ],
})
export class ToolsModule {}
