/**
 * Search products by keywords
 * Variables: QUERY (required), LIMIT (optional, default 10)
 */

// @ts-nocheck
/* eslint-disable */

(async () => {
  try {
    const query = '{{QUERY}}';
    if (!query || query.includes('{{')) {
      throw new Error('QUERY is required');
    }

    const limit = parseInt('{{LIMIT}}') || 10;
    const searchQuery = query.toLowerCase();

    // Get user ID
    const userId = window.WPP.conn?.getMyUserId()?._serialized || '';

    if (!userId) {
      throw new Error('User ID not found');
    }

    // Get all collections
    const collections = await window.WPP.catalog.getCollections(
      userId,
      50,
      100,
    );

    let allProducts = [];

    for (const collection of collections) {
      const products = collection.products || [];

      // Filter by query
      const filtered = products.filter(
        (p) =>
          p.name?.toLowerCase().includes(searchQuery) ||
          p.description?.toLowerCase().includes(searchQuery) ||
          collection.name?.toLowerCase().includes(searchQuery),
      );

      allProducts = allProducts.concat(
        filtered.map((p) => ({
          id: p.id,
          name: p.name,
          description: p.description,
          price: p.price,
          currency: p.currency,
          availability: p.availability,
          isHidden: p.isHidden,
          imageUrl: p.imageUrl,
          collectionName: collection.name,
          collectionId: collection.id,
        })),
      );
    }

    return allProducts.slice(0, limit);
  } catch (error) {
    console.error('Failed to search products:', error);
    throw error;
  }
})();
