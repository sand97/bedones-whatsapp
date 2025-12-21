/**
 * Edit a previously sent message
 * Executed in WhatsApp Web context
 *
 * Variables:
 * - MESSAGE_ID: ID of the message to edit
 * - NEW_TEXT: New message content
 * - LINK_PREVIEW: Enable link preview (optional, default: true)
 *
 * Note: Message ID format is typically 'true_[number]@c.us_[msgId]'
 */

// @ts-nocheck
/* eslint-disable */

(async () => {
  try {
    const messageId = '{{MESSAGE_ID}}';
    const newText = '{{NEW_TEXT}}';
    const linkPreview = '{{LINK_PREVIEW}}' !== 'false';

    if (!messageId || messageId.includes('{{')) {
      throw new Error('MESSAGE_ID is required');
    }

    if (!newText || newText.includes('{{')) {
      throw new Error('NEW_TEXT is required');
    }

    console.log(`Editing message ${messageId}`);

    const result = await window.WPP.chat.editMessage(messageId, newText, {
      linkPreview,
    });

    console.log('Message edited successfully');

    return {
      success: true,
      messageId: result.id ? String(result.id) : null,
      timestamp: result.t ? Number(result.t) : null,
    };
  } catch (error) {
    console.error('Failed to edit message:', error);
    return {
      success: false,
      error: error.message,
    };
  }
})();
