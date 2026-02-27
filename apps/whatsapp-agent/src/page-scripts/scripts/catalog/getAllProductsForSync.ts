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

    // Get the complete catalog
    const catalog = await window.WPP.catalog.getMyCatalog();

    if (!catalog || !catalog.productCollection || !catalog.productCollection._index) {
      throw new Error('Catalogue non disponible');
    }

    // Extract all products from the index
    const productIndex = catalog.productCollection._index;
    const productIds = Object.keys(productIndex);

    // Get all collections to map products
    const collections = await window.WPP.catalog.getCollections(
      userId,
      50,
      100,
    );

    // Create a Map for product ID -> collection
    const productToCollectionMap = new Map();
    for (const collection of collections) {
      for (const product of collection.products || []) {
        productToCollectionMap.set(product.id, {
          id: collection.id,
          name: collection.name,
        });
      }
    }

    // Build the products array with proper mapping
    const allProducts = productIds.map((productId) => {
      const product = productIndex[productId].attributes;
      const collectionInfo = productToCollectionMap.get(productId);

      return {
        id: product.id,
        name: product.name,
        description: product.description,
        price: product.priceAmount1000 ? product.priceAmount1000 / 1000 : null,
        currency: product.currency,
        availability: product.availability,
        retailerId: product.retailerId,
        maxAvailable: product.maxAvailable,
        isHidden: product.isHidden || false,
        imageUrl: product.imageCdnUrl,
        imageHashesForWhatsapp: [product.imageHash, ...(product.additionalImageHashes || [])],
        collectionId: collectionInfo ? collectionInfo.id : null,
        collectionName: collectionInfo ? collectionInfo.name : null,
      };
    });

    return allProducts;
  } catch (error) {
    console.error('Failed to get all products for sync:', error);
    throw error;
  }
})();
