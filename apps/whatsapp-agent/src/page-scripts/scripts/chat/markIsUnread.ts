/**
 * Mark a chat as unread
 * Useful for flagging conversations that need human review
 * Executed in WhatsApp Web context
 *
 * Variables:
 * - CHAT_ID: Chat identifier to mark as unread
 */

// @ts-nocheck
/* eslint-disable */

(async () => {
  try {
    const chatId = '{{CHAT_ID}}';

    if (!chatId || chatId.includes('{{')) {
      throw new Error('CHAT_ID is required');
    }

    console.log(`Marking chat ${chatId} as unread`);

    const result = await window.WPP.chat.markIsUnread(chatId);

    console.log('Chat marked as unread successfully');

    return {
      success: true,
      wid: result.wid ? String(result.wid) : null,
    };
  } catch (error) {
    console.error('Failed to mark chat as unread:', error);
    return {
      success: false,
      error: error.message,
    };
  }
})();
