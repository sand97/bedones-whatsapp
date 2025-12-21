/**
 * Set internal notes for a chat
 * ⚠️ Only available with WhatsApp Business accounts
 * Executed in WhatsApp Web context
 *
 * Variables:
 * - CHAT_ID: Chat identifier
 * - CONTENT: Note text content
 *
 * Use cases:
 * - Store customer preferences
 * - Track conversation history
 * - Internal agent memory
 */

// @ts-nocheck
/* eslint-disable */

(async () => {
  try {
    const chatId = '{{CHAT_ID}}';
    const content = '{{CONTENT}}';

    if (!chatId || chatId.includes('{{')) {
      throw new Error('CHAT_ID is required');
    }

    if (!content || content.includes('{{')) {
      throw new Error('CONTENT is required');
    }

    console.log(`Setting notes for chat ${chatId}`);

    const result = await window.WPP.chat.setNotes(chatId, content);

    if (!result) {
      throw new Error(
        'Failed to set notes. This feature requires WhatsApp Business account.',
      );
    }

    console.log('Notes set successfully');

    return {
      success: true,
      noteId: result.id ? String(result.id) : null,
      content: result.body ? String(result.body) : '',
    };
  } catch (error) {
    console.error('Failed to set notes:', error);
    return {
      success: false,
      error: error.message,
    };
  }
})();
