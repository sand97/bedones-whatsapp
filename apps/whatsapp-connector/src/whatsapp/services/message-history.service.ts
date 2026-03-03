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

          // Helper function to format a message (reused for both regular and quoted messages)
          type FormattedMessage = {
            id: any;
            from: string;
            fromMe: boolean;
            timestamp: any;
            type: any;
            hasMedia: boolean;
            body?: string;
            productId?: any;
            title?: any;
            description?: any;
            quotedStanzaID?: string;
            quotedMsg?: FormattedMessage;
          };

          const formatMessage = (
            msg: any,
            messageFrom: string,
            isFromUs: boolean,
          ): FormattedMessage => {
            const baseMessage = {
              id: msg.id?._serialized || msg.id,
              from: messageFrom,
              fromMe: isFromUs,
              timestamp: msg.timestamp || msg.t,
              type: msg.type,
              hasMedia: msg.hasMedia || false,
            };

            // Handle product messages - extract product info, skip base64 body
            if (msg.type === 'product') {
              return {
                ...baseMessage,
                productId: msg.productId,
                title: msg.title,
                description: msg.description,
                // Do NOT send body (base64) for products
              };
            }

            // Regular message - add body
            return {
              ...baseMessage,
              body: msg.body || '',
            };
          };

          // Count messages by sender
          let hostMessageCount = 0;
          let ourMessageCount = 0;

          // Map messages to a simpler format
          const messages = rawMessages.map((m: any) => {
            // Determine if message is from us by comparing sender with chatId
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

            // Format the main message
            const formattedMessage: FormattedMessage = formatMessage(
              m,
              messageFrom,
              isFromUs,
            );
            if (m.quotedStanzaID) {
              formattedMessage.quotedStanzaID = m.quotedStanzaID;
            }

            // Handle quoted messages - format with same function
            if (m.quotedMsg) {
              const quotedFrom =
                m.quotedMsg.from?._serialized ||
                m.quotedMsg.from ||
                messageFrom;
              const quotedIsFromUs = quotedFrom !== chatId;

              const formattedQuoted = formatMessage(
                m.quotedMsg,
                quotedFrom,
                quotedIsFromUs,
              );
              if (!formattedQuoted.id && m.quotedStanzaID) {
                formattedQuoted.id = m.quotedStanzaID;
              }
              formattedMessage.quotedMsg = formattedQuoted;
            }

            return formattedMessage;
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
