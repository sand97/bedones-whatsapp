/**
 * Get message history for a chat
 * Executed in WhatsApp Web context
 *
 * Variables:
 * - CHAT_ID: Chat ID (required)
 * - MAX_TOTAL: Max messages to fetch (optional, default: 20)
 * - MESSAGE_ID: Reference message ID (optional)
 * - DIRECTION: 'before' or 'after' (optional, default: 'before')
 */

// @ts-nocheck
/* eslint-disable */

(async () => {
  try {
    const chatId = '{{CHAT_ID}}';
    const maxTotalRaw = '{{MAX_TOTAL}}';
    const messageIdRaw = '{{MESSAGE_ID}}';
    const directionRaw = '{{DIRECTION}}';

    if (!chatId || chatId.includes('{{')) {
      throw new Error('CHAT_ID is required');
    }

    const maxTotal = parseInt(maxTotalRaw, 10) || 20;
    const messageId =
      messageIdRaw && !messageIdRaw.includes('{{') ? messageIdRaw : null;
    const direction =
      directionRaw && !directionRaw.includes('{{') ? directionRaw : 'before';

    console.log('[MessageHistory] Fetching history', {
      chatId,
      maxTotal,
    });

    const options = {
      count: maxTotal,
    };

    if (messageId) {
      options.direction = direction === 'after' ? 'after' : 'before';
      options.id = messageId;
    }

    const rawMessages = await window.WPP.chat.getMessages(chatId, options);

    let hostMessageCount = 0;
    let ourMessageCount = 0;

    const messages = rawMessages.map((m) => {
      const messageFrom = m.from?._serialized || m.from;
      const isFromHost = messageFrom === chatId;
      const isFromUs = !isFromHost;

      if (isFromUs) {
        ourMessageCount += 1;
      } else {
        hostMessageCount += 1;
      }

      return {
        id: m.id?._serialized || m.id,
        body: m.body || '',
        from: messageFrom,
        fromMe: isFromUs,
        timestamp: m.timestamp || m.t,
        type: m.type,
        hasMedia: m.hasMedia || false,
        quotedMsg: m.quotedMsg
          ? {
              id: m.quotedMsg.id?._serialized || m.quotedMsg.id,
              body: m.quotedMsg.body,
            }
          : undefined,
      };
    });

    return {
      success: true,
      messages,
      hostMessageCount,
      ourMessageCount,
      totalFetched: messages.length,
      reachedLimit: messages.length >= maxTotal,
    };
  } catch (error) {
    console.error('[MessageHistory] Error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
})();
