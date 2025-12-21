/**
 * Get the quoted/replied message
 * Useful for understanding context in conversations
 * Executed in WhatsApp Web context
 *
 * Variables:
 * - MESSAGE_ID: ID of the message that has a quoted message
 *
 * Returns the original message that was quoted/replied to
 */

// @ts-nocheck
/* eslint-disable */

(async () => {
  try {
    const messageId = '{{MESSAGE_ID}}';

    if (!messageId || messageId.includes('{{')) {
      throw new Error('MESSAGE_ID is required');
    }

    console.log(`Getting quoted message for ${messageId}`);

    const quotedMsg = await window.WPP.chat.getQuotedMsg(messageId);

    if (!quotedMsg) {
      return {
        success: true,
        hasQuote: false,
        message: null,
      };
    }

    console.log('Quoted message retrieved successfully');

    return {
      success: true,
      hasQuote: true,
      message: {
        id: quotedMsg.id ? String(quotedMsg.id) : null,
        body: quotedMsg.body ? String(quotedMsg.body) : '',
        from: quotedMsg.from ? String(quotedMsg.from) : null,
        to: quotedMsg.to ? String(quotedMsg.to) : null,
        timestamp: quotedMsg.t ? Number(quotedMsg.t) : null,
        type: quotedMsg.type ? String(quotedMsg.type) : null,
        fromMe: Boolean(quotedMsg.fromMe),
      },
    };
  } catch (error) {
    console.error('Failed to get quoted message:', error);
    return {
      success: false,
      error: error.message,
    };
  }
})();
