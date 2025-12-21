/**
 * Mark a chat as read and send SEEN event
 * Executed in WhatsApp Web context
 *
 * Variables:
 * - CHAT_ID: Chat identifier to mark as read
 *
 * Returns unread count and chat wid
 */

// @ts-nocheck
/* eslint-disable */

(async () => {
  try {
    const chatId = '{{CHAT_ID}}';

    if (!chatId || chatId.includes('{{')) {
      throw new Error('CHAT_ID is required');
    }

    console.log(`Marking chat ${chatId} as read`);

    const result = await window.WPP.chat.markIsRead(chatId);

    console.log('Chat marked as read successfully');

    return {
      success: true,
      unreadCount: result.unreadCount ? Number(result.unreadCount) : 0,
      wid: result.wid ? String(result.wid) : null,
    };
  } catch (error) {
    console.error('Failed to mark chat as read:', error);
    return {
      success: false,
      error: error.message,
    };
  }
})();
