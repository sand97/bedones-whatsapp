/**
 * Send a catalog collection to a chat
 * Variables: TO (required), COLLECTION_ID (required)
 */

// @ts-nocheck
/* eslint-disable */

(async () => {
  try {
    const to = '{{TO}}';
    const collectionId = '{{COLLECTION_ID}}';

    if (!to || to.includes('{{')) {
      throw new Error('TO is required');
    }

    if (!collectionId || collectionId.includes('{{')) {
      throw new Error('COLLECTION_ID is required');
    }

    const result = await window.WPP.catalog.sendCatalog(to, collectionId);
    return result;
  } catch (error) {
    console.error('Failed to send collection:', error);
    throw error;
  }
})();
