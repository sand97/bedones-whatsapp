/**
 * Get detailed information about a specific product
 * Variables: PRODUCT_ID (required)
 */

// @ts-nocheck
/* eslint-disable */

(async () => {
  try {
    const productId = '{{PRODUCT_ID}}';
    if (!productId || productId.includes('{{')) {
      throw new Error('PRODUCT_ID is required');
    }

    // Get user ID
    const userId = window.WPP.conn?.getMyUserId()?._serialized || '';

    if (!userId) {
      throw new Error('User ID not found');
    }

    // Get all collections with products
    const collections = await window.WPP.catalog.getCollections(
      userId,
      50,
      100,
    );

    // Find the product in all collections
    for (const collection of collections) {
      const products = collection.products || [];
      const product = products.find((p) => p.id === productId);

      if (product) {
        return {
          id: product.id,
          name: product.name,
          description: product.description,
          price: product.price,
          currency: product.currency,
          availability: product.availability,
          maxAvailable: product.maxAvailable,
          isHidden: product.isHidden,
          url: product.url,
          imageUrl: product.imageUrl,
          retailerId: product.retailerId,
          collectionName: collection.name,
          collectionId: collection.id,
          imageHashes: product.imageHashesForWhatsapp || [],
        };
      }
    }

    return null;
  } catch (error) {
    console.error('Failed to get product details:', error);
    throw error;
  }
})();
