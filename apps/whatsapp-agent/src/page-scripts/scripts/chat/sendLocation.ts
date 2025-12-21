/**
 * Send location message
 * Executed in WhatsApp Web context
 *
 * Variables:
 * - TO: Recipient chat ID
 * - LAT: Latitude (required)
 * - LNG: Longitude (required)
 * - NAME: Location name (optional)
 * - ADDRESS: Location address (optional)
 * - URL: Associated URL (optional)
 *
 * Example:
 * - LAT: -22.95201
 * - LNG: -43.2102601
 * - NAME: Cristo Redentor
 * - ADDRESS: Parque Nacional da Tijuca - Alto da Boa Vista, Rio de Janeiro
 */

// @ts-nocheck
/* eslint-disable */

(async () => {
  try {
    const to = '{{TO}}';
    const lat = parseFloat('{{LAT}}');
    const lng = parseFloat('{{LNG}}');
    const name = '{{NAME}}';
    const address = '{{ADDRESS}}';
    const url = '{{URL}}';

    if (!to || to.includes('{{')) {
      throw new Error('TO is required');
    }

    if (isNaN(lat) || isNaN(lng)) {
      throw new Error('LAT and LNG are required and must be valid numbers');
    }

    // Determine if TO is already a full contact ID
    const isContactId = to.includes('@');
    const chatId = isContactId ? to : `${to}@c.us`;

    console.log(`Sending location to ${chatId}: ${lat}, ${lng}`);

    // Build options object
    const options = {
      lat,
      lng,
    };

    if (name && !name.includes('{{')) {
      options.name = name;
    }

    if (address && !address.includes('{{')) {
      options.address = address;
    }

    if (url && !url.includes('{{')) {
      options.url = url;
    }

    const result = await window.WPP.chat.sendLocationMessage(chatId, options);

    console.log('Location sent successfully');

    return {
      success: true,
      messageId: result.id ? String(result.id) : null,
      timestamp: result.t ? Number(result.t) : null,
      to: chatId,
      location: { lat, lng, name: options.name, address: options.address },
    };
  } catch (error) {
    console.error('Failed to send location:', error);
    return {
      success: false,
      error: error.message,
    };
  }
})();
