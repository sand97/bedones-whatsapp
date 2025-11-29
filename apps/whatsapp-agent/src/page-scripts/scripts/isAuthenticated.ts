/**
 * Check if the WhatsApp Web client is authenticated
 * No variables required
 */

// @ts-nocheck
/* eslint-disable */

(async () => {
  try {
    const isAuthenticated = await WPP.conn.isAuthenticated();

    return {
      success: true,
      isAuthenticated,
    };
  } catch (error: any) {
    return {
      success: false,
      isAuthenticated: false,
      error: error.message,
    };
  }
})();
