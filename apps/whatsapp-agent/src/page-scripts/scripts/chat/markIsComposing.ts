/**
 * Show "typing..." indicator in a chat
 * Helper function for natural conversation simulation
 * Executed in WhatsApp Web context
 *
 * Variables:
 * - CHAT_ID: Chat identifier
 * - DURATION: Duration in milliseconds (optional, default: 2000)
 */

// @ts-nocheck
/* eslint-disable */

(async () => {
  try {
    const chatId = '{{CHAT_ID}}';
    const duration = parseInt('{{DURATION}}') || 2000;

    if (!chatId || chatId.includes('{{')) {
      throw new Error('CHAT_ID is required');
    }

    console.log(`Showing typing indicator for ${duration}ms in chat ${chatId}`);

    await window.WPP.chat.markIsComposing(chatId, duration);

    console.log('Typing indicator shown successfully');

    return {
      success: true,
      chatId,
      duration,
    };
  } catch (error) {
    console.error('Failed to show typing indicator:', error);
    return {
      success: false,
      error: error.message,
    };
  }
})();
