import { Injectable, Logger } from '@nestjs/common';

export interface MessageHistoryResult {
  messages: any[];
  hostMessageCount: number;
  ourMessageCount: number;
  totalFetched: number;
  reachedLimit: boolean;
}

/**
 * Service to handle message history retrieval from WhatsApp Web
 * Uses direct Puppeteer page.evaluate() instead of script templates
 */
@Injectable()
export class MessageHistoryService {
  private readonly logger = new Logger(MessageHistoryService.name);

  /**
   * Get message history for a chat using WPP API
   * @param page - Puppeteer page instance
   * @param chatId - WhatsApp chat ID
   * @param maxTotal - Maximum number of messages to fetch
   */
  async getMessageHistory(
    page: any,
    chatId: string,
    maxTotal: number = 20,
  ): Promise<MessageHistoryResult> {
    this.logger.debug(
      `🔍 Fetching message history for chat: ${chatId}, maxTotal: ${maxTotal}`,
    );

    try {
      // Execute in browser context - pass parameters directly
      const result = await page.evaluate(
        async (chatId: string, maxTotal: number) => {
          console.log(
            '[MessageHistory] 🔍 Fetching history for chat:',
            chatId,
            'maxTotal:',
            maxTotal,
          );

          // Fetch messages using WPP API
          // eslint-disable-next-line no-undef
          const rawMessages = await window.WPP.chat.getMessages(chatId, {
            count: maxTotal,
          });

          console.log(
            '[MessageHistory] ✅ Fetched',
            rawMessages.length,
            'raw messages',
          );

          // Log first message for debugging
          if (rawMessages.length > 0) {
            console.log('[MessageHistory] 📄 First message sample:', {
              id: rawMessages[0].id,
              body: rawMessages[0].body?.substring(0, 50),
              from: rawMessages[0].from?._serialized,
              fromMe: rawMessages[0].fromMe,
              timestamp: rawMessages[0].timestamp,
            });
          }

          // Count messages by sender
          let hostMessageCount = 0;
          let ourMessageCount = 0;

          // Map messages to a simpler format
          const messages = rawMessages.map((m: any) => {
            // Determine if message is from us by comparing sender with chatId
            // If m.from._serialized === chatId, it's from the contact (host)
            // Otherwise, it's from us
            const messageFrom = m.from?._serialized || m.from;
            const isFromHost = messageFrom === chatId;
            const isFromUs = !isFromHost;

            if (isFromUs) {
              ourMessageCount++;
            } else {
              hostMessageCount++;
            }

            console.log(
              `[MessageHistory] Message: from=${messageFrom}, chatId=${chatId}, isFromHost=${isFromHost}, isFromUs=${isFromUs}`,
            );

            return {
              id: m.id?._serialized || m.id,
              body: m.body || '',
              from: messageFrom,
              fromMe: isFromUs, // Use our computed value, not m.fromMe
              timestamp: m.timestamp || m.t,
              type: m.type,
              hasMedia: m.hasMedia || false,
              quotedMsg: m.quotedMsg
                ? {
                    id: m.quotedMsg.id?._serialized || m.quotedMsg.id,
                    body: m.quotedMsg.body,
                  }
                : undefined,
            };
          });

          const result = {
            messages,
            hostMessageCount,
            ourMessageCount,
            totalFetched: messages.length,
            reachedLimit: messages.length >= maxTotal,
          };

          console.log('[MessageHistory] 📊 Result:', {
            totalFetched: result.totalFetched,
            hostMessages: hostMessageCount,
            ourMessages: ourMessageCount,
            reachedLimit: result.reachedLimit,
          });

          console.log(
            '[MessageHistory] 📤 Returning',
            result.messages.length,
            'formatted messages',
          );

          return result;
        },
        chatId,
        maxTotal,
      );

      this.logger.log(
        `✅ Retrieved ${result.totalFetched} messages (${result.hostMessageCount} from host, ${result.ourMessageCount} from us)`,
      );

      if (result.messages.length > 0) {
        this.logger.debug(
          `📋 First message: ${result.messages[0]?.body?.substring(0, 50) || 'N/A'}`,
        );
      }

      return result;
    } catch (error: any) {
      this.logger.error(`❌ Failed to fetch message history: ${error.message}`);
      throw error;
    }
  }
}
