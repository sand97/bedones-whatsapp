/**
 * Send a scheduled call message
 * Schedule voice/video calls with customers
 * Executed in WhatsApp Web context
 *
 * Variables:
 * - TO: Recipient chat ID
 * - TITLE: Event title
 * - DESCRIPTION: Call description
 * - CALL_TYPE: Type of call (default: 'voice')
 * - TIMESTAMP_MS: Scheduled time in milliseconds since epoch
 *
 * Example:
 * - TITLE: "Support Call"
 * - DESCRIPTION: "Follow-up call regarding your order"
 * - CALL_TYPE: "voice"
 * - TIMESTAMP_MS: 1696084222000
 */

// @ts-nocheck
/* eslint-disable */

(async () => {
  try {
    const to = '{{TO}}';
    const title = '{{TITLE}}';
    const description = '{{DESCRIPTION}}';
    const callType = '{{CALL_TYPE}}' || 'voice';
    const timestampMs = parseInt('{{TIMESTAMP_MS}}');

    if (!to || to.includes('{{')) {
      throw new Error('TO is required');
    }

    if (!title || title.includes('{{')) {
      throw new Error('TITLE is required');
    }

    if (!timestampMs || isNaN(timestampMs)) {
      throw new Error('TIMESTAMP_MS is required and must be a valid number');
    }

    // Determine if TO is already a full contact ID
    const isContactId = to.includes('@');
    const chatId = isContactId ? to : `${to}@c.us`;

    console.log(`Sending scheduled call message to ${chatId}`);

    const options = {
      title,
      callType,
      scheduledTimestampMs: timestampMs,
    };

    if (description && !description.includes('{{')) {
      options.description = description;
    }

    const result = await window.WPP.chat.sendScheduledCallMessage(
      chatId,
      options,
    );

    console.log('Scheduled call message sent successfully');

    return {
      success: true,
      messageId: result.id ? String(result.id) : null,
      timestamp: result.t ? Number(result.t) : null,
      to: chatId,
      scheduledTime: timestampMs,
    };
  } catch (error) {
    console.error('Failed to send scheduled call message:', error);
    return {
      success: false,
      error: error.message,
    };
  }
})();
