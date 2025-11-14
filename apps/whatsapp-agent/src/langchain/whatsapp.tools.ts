import { tool } from '@langchain/core/tools';
import { z } from 'zod';

import { ConnectorClientService } from '../connector/connector-client.service';

/**
 * Crée les tools WhatsApp pour LangChain
 */
export function createWhatsAppTools(connectorClient: ConnectorClientService) {
  const sendMessageTool = tool(
    async ({ chatId, message }) => {
      try {
        const result = await connectorClient.sendMessage(chatId, message);
        return JSON.stringify({
          success: true,
          message: 'Message sent successfully',
          result,
        });
      } catch (error: any) {
        return JSON.stringify({
          success: false,
          error: error.message,
        });
      }
    },
    {
      name: 'send_whatsapp_message',
      description:
        'Send a WhatsApp message to a specific chat. Use this when you need to reply to a user or send a message.',
      schema: z.object({
        chatId: z
          .string()
          .describe('The WhatsApp chat ID (format: number@c.us or group@g.us)'),
        message: z.string().describe('The message content to send'),
      }),
    },
  );

  const getChatInfoTool = tool(
    async ({ chatId }) => {
      try {
        const chat = await connectorClient.getChatById(chatId);
        return JSON.stringify({
          success: true,
          chat: {
            id: chat.id,
            name: chat.name,
            isGroup: chat.isGroup,
            timestamp: chat.timestamp,
            unreadCount: chat.unreadCount,
            archived: chat.archived,
            pinned: chat.pinned,
            isMuted: chat.isMuted,
          },
        });
      } catch (error: any) {
        return JSON.stringify({
          success: false,
          error: error.message,
        });
      }
    },
    {
      name: 'get_chat_info',
      description:
        'Get information about a specific WhatsApp chat. Use this to check chat details, unread messages, etc.',
      schema: z.object({
        chatId: z
          .string()
          .describe('The WhatsApp chat ID (format: number@c.us or group@g.us)'),
      }),
    },
  );

  const getContactInfoTool = tool(
    async ({ contactId }) => {
      try {
        const contact = await connectorClient.getContactById(contactId);
        return JSON.stringify({
          success: true,
          contact: {
            id: contact.id,
            number: contact.number,
            name: contact.name,
            pushname: contact.pushname,
            shortName: contact.shortName,
            isMe: contact.isMe,
            isUser: contact.isUser,
            isGroup: contact.isGroup,
            isWAContact: contact.isWAContact,
            isMyContact: contact.isMyContact,
          },
        });
      } catch (error: any) {
        return JSON.stringify({
          success: false,
          error: error.message,
        });
      }
    },
    {
      name: 'get_contact_info',
      description:
        'Get information about a specific WhatsApp contact. Use this to check user details, phone number, etc.',
      schema: z.object({
        contactId: z
          .string()
          .describe('The WhatsApp contact ID (format: number@c.us)'),
      }),
    },
  );

  const getAllChatsTool = tool(
    async () => {
      try {
        const chats = await connectorClient.getChats();
        const simplifiedChats = chats.slice(0, 20).map((chat: any) => ({
          id: chat.id,
          name: chat.name,
          isGroup: chat.isGroup,
          unreadCount: chat.unreadCount,
          timestamp: chat.timestamp,
        }));

        return JSON.stringify({
          success: true,
          totalChats: chats.length,
          chats: simplifiedChats,
          note: 'Showing first 20 chats only',
        });
      } catch (error: any) {
        return JSON.stringify({
          success: false,
          error: error.message,
        });
      }
    },
    {
      name: 'get_all_chats',
      description:
        'Get a list of all WhatsApp chats. Returns the first 20 chats. Use this to see recent conversations.',
      schema: z.object({}),
    },
  );

  const getAllContactsTool = tool(
    async () => {
      try {
        const contacts = await connectorClient.getContacts();
        const simplifiedContacts = contacts
          .slice(0, 50)
          .map((contact: any) => ({
            id: contact.id,
            number: contact.number,
            name: contact.name,
            pushname: contact.pushname,
            isMyContact: contact.isMyContact,
          }));

        return JSON.stringify({
          success: true,
          totalContacts: contacts.length,
          contacts: simplifiedContacts,
          note: 'Showing first 50 contacts only',
        });
      } catch (error: any) {
        return JSON.stringify({
          success: false,
          error: error.message,
        });
      }
    },
    {
      name: 'get_all_contacts',
      description:
        'Get a list of all WhatsApp contacts. Returns the first 50 contacts. Use this to find contact information.',
      schema: z.object({}),
    },
  );

  return [
    sendMessageTool,
    getChatInfoTool,
    getContactInfoTool,
    getAllChatsTool,
    getAllContactsTool,
  ];
}
