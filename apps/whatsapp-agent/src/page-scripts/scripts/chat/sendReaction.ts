/**
 * Send reaction to a message
 * Executed in WhatsApp Web context
 *
 * Variables:
 * - MESSAGE_ID: ID of the message to react to
 * - REACTION: Emoji string (or 'false' to remove reaction)
 *
 * Examples:
 * - REACTION: '👍' (add thumbs up)
 * - REACTION: '❤️' (add heart)
 * - REACTION: 'false' (remove reaction)
 */

// @ts-nocheck
/* eslint-disable */

(async () => {
  try {
    const messageId = '{{MESSAGE_ID}}';
    let reaction = '{{REACTION}}';

    if (!messageId || messageId.includes('{{')) {
      throw new Error('MESSAGE_ID is required');
    }

    if (!reaction || reaction.includes('{{')) {
      throw new Error('REACTION is required');
    }

    // Handle reaction removal
    if (reaction === 'false' || reaction === 'null') {
      reaction = false;
    }

    console.log(`Sending reaction "${reaction}" to message ${messageId}`);

    const result = await window.WPP.chat.sendReactionToMessage(
      messageId,
      reaction,
    );

    console.log('Reaction sent successfully');

    return {
      success: true,
      sendMsgResult: result.sendMsgResult,
    };
  } catch (error) {
    console.error('Failed to send reaction:', error);
    return {
      success: false,
      error: error.message,
    };
  }
})();
