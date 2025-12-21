/**
 * Get all products from all collections for synchronization
 * No variables required
 */

// @ts-nocheck
/* eslint-disable */

(async () => {
  try {
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

    let allProducts = [];

    for (const collection of collections) {
      const products = collection.products || [];

      allProducts = allProducts.concat(
        products.map((p) => ({
          id: p.id,
          name: p.name,
          description: p.description,
          price: p.price,
          currency: p.currency,
          availability: p.availability,
          retailerId: p.retailerId,
          maxAvailable: p.maxAvailable,
          isHidden: p.isHidden,
          imageUrl: p.imageUrl,
          imageHashesForWhatsapp: p.imageHashesForWhatsapp || [],
          collectionId: collection.id,
          collectionName: collection.name,
        })),
      );
    }

    return allProducts;
  } catch (error) {
    console.error('Failed to get all products for sync:', error);
    throw error;
  }
})();
