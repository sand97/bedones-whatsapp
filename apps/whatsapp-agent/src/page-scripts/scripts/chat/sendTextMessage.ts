/**
 * Send text message with natural typing simulation
 * Executed in WhatsApp Web context
 *
 * Variables:
 * - TO: Recipient phone number (international format) or chat ID
 * - MESSAGE: Text content to send
 * - USE_TYPING: Whether to simulate typing (default: true)
 * - QUOTED_MESSAGE_ID: Message ID to reply to (optional)
 *
 * Features:
 * - Verifies contact exists using queryExists
 * - Natural typing delay based on message length (80 WPM)
 * - Uses WPP sendTextMessage delay option to simulate typing
 * - Delay capped between 500ms and 5000ms
 */

// @ts-nocheck
/* eslint-disable */

(async () => {
  try {
    const to = '{{TO}}';
    const rawMessage = '{{MESSAGE}}';
    const message = rawMessage
      .replace(/\\r\\n/g, '\n')
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '\r');
    const useTyping = '{{USE_TYPING}}' !== 'false';
    const quotedMessageId = '{{QUOTED_MESSAGE_ID}}';
    const quotedMsg =
      quotedMessageId && !quotedMessageId.includes('{{')
        ? quotedMessageId
        : null;

    if (!to || to.includes('{{')) {
      throw new Error('TO is required');
    }

    if (!message || message.includes('{{')) {
      throw new Error('MESSAGE is required');
    }

    console.log(`Sending text message to ${to}`);

    // Determine if TO is already a full contact ID or a phone number
    let chatId;
    if (to.includes('@')) {
      // Already a chat ID (e.g., "123456789@c.us")
      chatId = to;
    } else {
      // Phone number - verify it exists and get the proper WID
      console.log(`Verifying contact exists: ${to}`);
      const contact = await window.WPP.contact.get(to);

      if (!contact) {
        throw new Error(`Contact not found: ${to}`);
      }

      chatId = contact.id._serialized;
      console.log(`Contact verified: ${chatId}`);
    }

    // Simulate natural typing if enabled
    let typingDelay;
    if (useTyping) {
      // Calculate delay: 80 WPM = 75ms per character
      const baseDelay = message.length * 75;
      typingDelay = Math.max(500, Math.min(5000, baseDelay));

      console.log(`Simulating typing for ${typingDelay}ms...`);
    }

    const options = {};
    if (typingDelay) {
      options.delay = typingDelay;
    }
    if (quotedMsg) {
      options.quotedMsg = quotedMsg;
    }

    const hasOptions = Object.keys(options).length > 0;

    // Send the message (WPP handles typing delay when provided)
    const result = await window.WPP.chat.sendTextMessage(
      chatId,
      message,
      hasOptions ? options : undefined,
    );

    console.log('Message sent successfully');

    return {
      success: true,
      messageId: result.id ? String(result.id) : null,
      timestamp: result.t ? Number(result.t) : null,
      to: chatId,
    };
  } catch (error) {
    console.error('Failed to send text message:', error);
    return {
      success: false,
      error: error.message,
    };
  }
})();
