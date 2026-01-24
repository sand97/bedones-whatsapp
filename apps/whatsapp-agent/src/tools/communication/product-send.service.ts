import { ConnectorClientService } from '@app/connector/connector-client.service';
import { PageScriptService } from '@app/page-scripts/page-script.service';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class ProductSendService {
  private readonly logger = new Logger(ProductSendService.name);
  private readonly maxConcurrentConversations = 3;
  private activeConversations = 0;
  private waitQueue: Array<() => void> = [];
  private conversationChains = new Map<string, Promise<unknown>>();

  constructor(
    private readonly connectorClient: ConnectorClientService,
    private readonly scriptService: PageScriptService,
  ) {}

  async sendProduct(to: string, productId: string): Promise<any> {
    return this.sendProducts(to, [productId]);
  }

  async sendProducts(to: string, productIds: string[]): Promise<any> {
    if (!to) {
      throw new Error('TO is required');
    }

    if (!productIds || productIds.length === 0) {
      throw new Error('PRODUCT_IDS is required');
    }

    return this.enqueueConversationTask(to, async () => {
      const script = this.scriptService.getScript('chat/sendProductsMessage', {
        TO: to,
        PRODUCT_IDS: productIds.map((id) => String(id)).join(','),
      });

      return this.connectorClient.executeScript(script);
    });
  }

  async sendCollection(to: string, collectionId: string): Promise<any> {
    if (!to) {
      throw new Error('TO is required');
    }

    if (!collectionId) {
      throw new Error('COLLECTION_ID is required');
    }

    return this.enqueueConversationTask(to, async () => {
      const script = this.scriptService.getScript(
        'communication/sendCollection',
        {
          TO: to,
          COLLECTION_ID: collectionId,
        },
      );

      return this.connectorClient.executeScript(script);
    });
  }

  private enqueueConversationTask<T>(
    chatId: string,
    task: () => Promise<T>,
  ): Promise<T> {
    const previous = this.conversationChains.get(chatId) ?? Promise.resolve();
    const next = previous
      .catch(() => undefined)
      .then(() => this.withGlobalLimit(chatId, task));

    this.conversationChains.set(chatId, next);

    return next.finally(() => {
      if (this.conversationChains.get(chatId) === next) {
        this.conversationChains.delete(chatId);
      }
    });
  }

  private async withGlobalLimit<T>(
    chatId: string,
    task: () => Promise<T>,
  ): Promise<T> {
    await this.acquireSlot(chatId);
    try {
      return await task();
    } finally {
      this.releaseSlot(chatId);
    }
  }

  private async acquireSlot(chatId: string): Promise<void> {
    if (this.activeConversations < this.maxConcurrentConversations) {
      this.activeConversations += 1;
      this.logger.debug(
        `[PRODUCT_SEND] Slot acquired for ${chatId}. Active: ${this.activeConversations}/${this.maxConcurrentConversations}`,
      );
      return;
    }

    this.logger.debug(
      `[PRODUCT_SEND] Waiting for slot for ${chatId}. Active: ${this.activeConversations}/${this.maxConcurrentConversations}`,
    );

    await new Promise<void>((resolve) => {
      this.waitQueue.push(resolve);
    });

    this.logger.debug(
      `[PRODUCT_SEND] Slot acquired after wait for ${chatId}. Active: ${this.activeConversations}/${this.maxConcurrentConversations}`,
    );
  }

  private releaseSlot(chatId: string): void {
    if (this.waitQueue.length > 0) {
      const next = this.waitQueue.shift();
      if (next) {
        next();
      }
      return;
    }

    this.activeConversations = Math.max(0, this.activeConversations - 1);
    this.logger.debug(
      `[PRODUCT_SEND] Slot released for ${chatId}. Active: ${this.activeConversations}/${this.maxConcurrentConversations}`,
    );
  }
}
