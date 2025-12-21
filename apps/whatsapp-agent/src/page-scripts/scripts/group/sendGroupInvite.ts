/**
 * Send group invite message
 * Invite customers to WhatsApp groups (support, community, VIP, etc.)
 * Executed in WhatsApp Web context
 *
 * Variables:
 * - TO: Recipient chat ID
 * - INVITE_CODE: Group invite code
 * - GROUP_ID: Group identifier (format: xxxxx@g.us)
 * - EXPIRATION: Optional expiration timestamp in milliseconds
 *
 * Example:
 * - TO: "33765538022@c.us"
 * - INVITE_CODE: "abc123xyz"
 * - GROUP_ID: "120363123456789@g.us"
 */

// @ts-nocheck
/* eslint-disable */

(async () => {
  try {
    const to = '{{TO}}';
    const inviteCode = '{{INVITE_CODE}}';
    const groupId = '{{GROUP_ID}}';
    const expiration = '{{EXPIRATION}}';

    if (!to || to.includes('{{')) {
      throw new Error('TO is required');
    }

    if (!inviteCode || inviteCode.includes('{{')) {
      throw new Error('INVITE_CODE is required');
    }

    if (!groupId || groupId.includes('{{')) {
      throw new Error('GROUP_ID is required');
    }

    // Determine if TO is already a full contact ID
    const isContactId = to.includes('@');
    const chatId = isContactId ? to : `${to}@c.us`;

    console.log(`Sending group invite to ${chatId} for group ${groupId}`);

    const options = {
      inviteCode,
      groupId,
    };

    if (expiration && !expiration.includes('{{')) {
      options.inviteCodeExpiration = parseInt(expiration);
    }

    const result = await window.WPP.chat.sendGroupInviteMessage(
      chatId,
      options,
    );

    console.log('Group invite sent successfully');

    return {
      success: true,
      messageId: result.id ? String(result.id) : null,
      timestamp: result.t ? Number(result.t) : null,
      to: chatId,
      groupId,
    };
  } catch (error) {
    console.error('Failed to send group invite:', error);
    return {
      success: false,
      error: error.message,
    };
  }
})();
