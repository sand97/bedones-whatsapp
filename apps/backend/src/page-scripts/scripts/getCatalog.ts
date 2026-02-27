/**
 * Script de récupération du catalogue WhatsApp
 * Ce script est exécuté dans le contexte de la page WhatsApp Web
 *
 * Variables injectées :
 * - BACKEND_URL: URL du backend
 * - TOKEN: Token JWT d'authentification (contient le clientId signé)
 * - INITIAL_ORIGINALS_URLS: JSON stringifié contenant la liste des images existantes [{id, original_url}]
 *
 * IMPORTANT: Le clientId n'est PAS une variable car il est extrait du token
 * côté backend pour des raisons de sécurité. Cela empêche un attaquant avec
 * un token volé de se faire passer pour un autre client.
 *
 */

/* eslint-disable no-undef */
// @ts-nocheck - Ce code s'exécute dans le navigateur, pas dans Node.js

(async () => {
  const BACKEND_URL = '{{BACKEND_URL}}';
  const TOKEN = '{{TOKEN}}';
  const INITIAL_ORIGINALS_URLS_RAW = '{{INITIAL_ORIGINALS_URLS}}';

  console.log('🔍 Démarrage de la récupération du catalogue...');

  /**
   * Normalise une URL WhatsApp en extrayant la partie stable (avant les query params)
   * Exemple: https://media.whatsapp.net/v/t45.5328-4/image.jpg?stp=... -> https://media.whatsapp.net/v/t45.5328-4/image.jpg
   */
  function normalizeWhatsAppUrl(url) {
    if (!url) return null;
    // Extraire la partie avant le '?' (enlever les query params dynamiques)
    const baseUrl = url.split('?')[0];
    return baseUrl;
  }

  /**
   * Génère un ID unique intemporel pour les noms de fichiers
   * Basé uniquement sur l'URL normalisée pour être déterministe
   */
  function generateUniqueId(normalizedUrl) {
    if (!normalizedUrl) return 'unknown';
    // Simple hash function basé uniquement sur l'URL normalisée
    let hash = 0;
    for (let i = 0; i < normalizedUrl.length; i++) {
      const char = normalizedUrl.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  // Parser la liste des images existantes
  let initialOriginalsUrls = [];
  try {
    if (
      INITIAL_ORIGINALS_URLS_RAW &&
      INITIAL_ORIGINALS_URLS_RAW !== '[]' &&
      INITIAL_ORIGINALS_URLS_RAW !== ''
    ) {
      initialOriginalsUrls = JSON.parse(INITIAL_ORIGINALS_URLS_RAW);
      console.log(
        `📋 ${initialOriginalsUrls.length} images existantes détectées dans le cache`,
      );
      console.log('📋 URLs normalisées en cache:');
      initialOriginalsUrls.forEach((img, index) => {
        console.log(`   ${index + 1}. ${img.normalized_url}`);
      });
    } else {
      console.log('📋 Première synchronisation - aucune image existante');
    }
  } catch (e) {
    console.error('❌ Erreur parsing initialOriginalsUrls:', e);
    initialOriginalsUrls = [];
  }

  try {
    // Récupérer l'ID de l'utilisateur
    const userId = window.WPP.conn?.getMyUserId()?._serialized || '';

    if (!userId) {
      throw new Error('User ID not found');
    }

    console.log('📦 Récupération du catalogue complet...');

    // Récupérer le catalogue complet
    const catalog = await window.WPP.catalog.getMyCatalog();

    if (!catalog || !catalog.productCollection || !catalog.productCollection._index) {
      throw new Error('Catalogue non disponible');
    }

    // Extraire tous les produits depuis l'index
    const productIndex = catalog.productCollection._index;
    const productIds = Object.keys(productIndex);
    console.log(`✅ ${productIds.length} produits trouvés dans le catalogue`);

    // Récupérer les collections pour mapper les produits
    const collections = await window.WPP.catalog.getCollections(
      userId,
      50,
      100,
    );
    console.log(`✅ ${collections?.length || 0} collections récupérées`);

    // Créer un Map pour associer produit ID -> collection
    const productToCollectionMap = new Map();
    for (const collection of collections) {
      for (const product of collection.products || []) {
        productToCollectionMap.set(product.id, {
          id: collection.id,
          name: collection.name,
        });
      }
    }

    // Traiter tous les produits pour télécharger les images
    const processedCollections = [];
    const processedUncategorizedProducts = [];
    let totalImages = 0;
    let skippedImages = 0;

    // Collecter toutes les URLs du catalogue actuel
    const currentCatalogUrls = new Set();

    // Traiter chaque produit
    for (const productId of productIds) {
      try {
        const product = productIndex[productId].attributes;

        const imageUrls: Array<{
          url: string;
          normalizedUrl: string;
          type: string;
          index: number;
        }> = [];

        // 1. Image principale (imageCdnUrl) - TOUJOURS en premier (index 0)
        if (product.imageCdnUrl) {
          imageUrls.push({
            url: product.imageCdnUrl,
            normalizedUrl: normalizeWhatsAppUrl(product.imageCdnUrl),
            type: 'main',
            index: 0,
          });
        }

        // 2. Images additionnelles (additionalImageCdnUrl) - Commencent à l'index 1
        if (
          product.additionalImageCdnUrl &&
          Array.isArray(product.additionalImageCdnUrl)
        ) {
          product.additionalImageCdnUrl.forEach((url: string, index: number) => {
            imageUrls.push({
              url: url,
              normalizedUrl: normalizeWhatsAppUrl(url),
              type: 'additional',
              index: index + 1,
            });
          });
        }

        // Télécharger et envoyer chaque image au backend
        const uploadedImages = [];

        for (const imageInfo of imageUrls) {
          try {
            // Ajouter l'URL normalisée au catalogue actuel (pour la détection des images obsolètes)
            currentCatalogUrls.add(imageInfo.normalizedUrl);

            // Vérifier si l'image existe déjà en comparant les URLs normalisées
            const existingImage = initialOriginalsUrls.find(
              (img) => img.normalized_url === imageInfo.normalizedUrl,
            );

            if (existingImage) {
              // L'image existe déjà, on skip l'upload
              console.log(
                `⏭️ Image ${imageInfo.index} du produit ${product.id} déjà uploadée (skip)`,
              );
              console.log(`   URL Minio existante: ${existingImage.url}`);
              console.log(
                `   URL normalisée: ${existingImage.normalized_url}`,
              );

              uploadedImages.push({
                index: imageInfo.index,
                type: imageInfo.type,
                url: existingImage.url, // URL Minio existante
                originalUrl: imageInfo.url,
                normalizedUrl: imageInfo.normalizedUrl,
              });
              skippedImages++;
              continue;
            }

            // Télécharger l'image dans le navigateur
            console.log(
              `📥 Téléchargement image ${imageInfo.index} du produit ${product.id}`,
            );
            console.log(`   URL originale: ${imageInfo.url}`);
            console.log(`   URL normalisée: ${imageInfo.normalizedUrl}`);

            const response = await fetch(imageInfo.url, {
              method: 'GET',
              credentials: 'include',
              headers: {
                'User-Agent': navigator.userAgent,
                Referer: 'https://web.whatsapp.com/',
                Origin: 'https://web.whatsapp.com',
              },
            });

            if (!response.ok) {
              console.error(
                `❌ Erreur HTTP ${response.status} pour ${product.id} image ${imageInfo.index}`,
              );
              console.error(`   URL: ${imageInfo.url}`);
              continue;
            }

            const blob = await response.blob();

            if (blob.size === 0) {
              console.error(
                `❌ Blob vide pour ${product.id} image ${imageInfo.index}`,
              );
              continue;
            }

            // Convertir le blob en base64 pour l'envoyer via nodeFetch
            const reader = new FileReader();
            const base64Promise = new Promise((resolve) => {
              reader.onloadend = () => resolve(reader.result);
              reader.readAsDataURL(blob);
            });
            const base64Data = await base64Promise;

            // Générer un ID unique intemporel basé sur l'URL normalisée
            const uniqueId = generateUniqueId(imageInfo.normalizedUrl);

            // Déterminer l'ID de collection (peut être null)
            const collectionInfo = productToCollectionMap.get(product.id);
            const collectionId = collectionInfo
              ? collectionInfo.id
              : 'uncategorized';

            // Envoyer l'image au backend via nodeFetch (contourne la CSP)
            // Note: clientId n'est PAS envoyé pour des raisons de sécurité
            // Il est extrait du token JWT par le backend
            const uploadResponse = await window.nodeFetch(
              `${BACKEND_URL}/catalog/upload-image`,
              {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${TOKEN}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  image: base64Data,
                  filename: `${product.id}-${imageInfo.index}-${uniqueId}.jpg`,
                  productId: product.id,
                  collectionId: collectionId,
                  imageIndex: imageInfo.index.toString(),
                  imageType: imageInfo.type,
                  originalUrl: imageInfo.url,
                  normalizedUrl: imageInfo.normalizedUrl,
                }),
              },
            );

            if (uploadResponse.ok) {
              const uploadResult = await uploadResponse.json();
              const minioUrl = uploadResult.data?.url || uploadResult.url;

              uploadedImages.push({
                index: imageInfo.index,
                type: imageInfo.type,
                url: minioUrl, // URL Minio retournée par le backend
                originalUrl: imageInfo.url,
                normalizedUrl: imageInfo.normalizedUrl,
              });
              totalImages++;
              console.log(
                `✅ Image ${imageInfo.index} du produit ${product.id} uploadée`,
              );
              console.log(`   URL WhatsApp: ${imageInfo.url}`);
              console.log(`   URL Minio: ${minioUrl}`);
            } else {
              const errorText = await uploadResponse.text();
              console.error(
                `❌ Erreur upload image ${imageInfo.index} du produit ${product.id}`,
              );
              console.error(`   Status: ${uploadResponse.status}`);
              console.error(`   Erreur: ${errorText}`);
            }
          } catch (imgError: any) {
            console.error(
              `❌ Erreur traitement image ${imageInfo.index} du produit ${product.id}:`,
              imgError.message,
            );
          }
        }

        // Ajouter le produit avec ses images uploadées et convertir le prix
        const processedProduct = {
          id: product.id,
          name: product.name,
          description: product.description,
          price: product.priceAmount1000 ? product.priceAmount1000 / 1000 : null,
          currency: product.currency,
          availability: product.availability,
          retailer_id: product.retailerId,
          max_available: product.maxAvailable,
          is_hidden: product.isHidden || false,
          is_sanctioned: product.isSanctioned || false,
          checkmark: product.checkmark || false,
          url: product.url || null,
          whatsapp_product_can_appeal: product.canAppeal || false,
          image_hashes_for_whatsapp: [product.imageHash, ...(product.additionalImageHashes || [])],
          videos: product.videos || [],
          uploadedImages,
        };

        // Déterminer si le produit appartient à une collection
        const collectionInfo = productToCollectionMap.get(product.id);
        if (collectionInfo) {
          // Produit dans une collection
          // Trouver ou créer la collection dans processedCollections
          let collection = processedCollections.find(
            (c) => c.id === collectionInfo.id,
          );
          if (!collection) {
            collection = {
              id: collectionInfo.id,
              name: collectionInfo.name,
              products: [],
            };
            processedCollections.push(collection);
          }
          collection.products.push(processedProduct);
        } else {
          // Produit sans collection
          processedUncategorizedProducts.push(processedProduct);
        }
      } catch (productError: any) {
        console.error(
          `❌ Erreur traitement produit ${productId}:`,
          productError.message,
        );
        // Skip le produit en cas d'erreur
      }
    }

    console.log(
      `✅ Traitement terminé - ${totalImages} nouvelles images, ${skippedImages} images existantes`,
    );

    // Déterminer les images à supprimer (présentes dans initialOriginalsUrls mais pas dans currentCatalogUrls)
    // IMPORTANT: Ne supprimer que si initialOriginalsUrls n'est pas vide (sinon c'est l'initialisation)
    // Note: currentCatalogUrls contient maintenant les URLs normalisées
    const imagesToDelete = [];
    if (initialOriginalsUrls.length > 0) {
      for (const existingImage of initialOriginalsUrls) {
        // Comparer avec normalized_url (qui est maintenant dans currentCatalogUrls)
        if (!currentCatalogUrls.has(existingImage.normalized_url)) {
          imagesToDelete.push(existingImage.id);
        }
      }

      if (imagesToDelete.length > 0) {
        console.log(
          `🗑️ ${imagesToDelete.length} images obsolètes à supprimer...`,
        );

        // Appeler l'endpoint de suppression
        try {
          const deleteResponse = await window.nodeFetch(
            `${BACKEND_URL}/catalog/delete-images`,
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${TOKEN}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                imageIds: imagesToDelete,
              }),
            },
          );

          if (deleteResponse.ok) {
            const deleteResult = await deleteResponse.json();
            console.log(
              `✅ Images obsolètes supprimées:`,
              deleteResult.deletedCount,
            );
          } else {
            console.error(
              `❌ Erreur lors de la suppression des images obsolètes`,
            );
          }
        } catch (deleteError: any) {
          console.error(
            `❌ Erreur appel endpoint delete-images:`,
            deleteError.message,
          );
        }
      } else {
        console.log(`✅ Aucune image obsolète à supprimer`);
      }
    }

    // Envoyer les données complètes du catalogue au backend pour sauvegarde en BD (via nodeFetch)
    console.log('💾 Envoi des données du catalogue au backend...');
    console.log(
      `📊 ${processedCollections.length} collections, ${processedUncategorizedProducts.length} produits sans collection`,
    );

    const catalogSaveResponse = await window.nodeFetch(
      `${BACKEND_URL}/catalog/save-catalog`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          collections: processedCollections,
          uncategorizedProducts: processedUncategorizedProducts,
        }),
      },
    );

    if (catalogSaveResponse.ok) {
      const saveResult = await catalogSaveResponse.json();
      console.log(
        '✅ Catalogue sauvegardé en base de données:',
        saveResult.stats,
      );

      return {
        success: true,
        collections: processedCollections,
        stats: {
          collectionsCount: processedCollections.length,
          productsCount: processedCollections.reduce(
            (acc, col) => acc + (col.products?.length || 0),
            0,
          ),
          imagesCount: totalImages,
        },
        dbStats: saveResult.stats,
      };
    } else {
      console.error('❌ Erreur lors de la sauvegarde du catalogue en BD');
      return {
        success: true, // Les images sont uploadées même si la sauvegarde en BD échoue
        collections: processedCollections,
        stats: {
          collectionsCount: processedCollections.length,
          productsCount: processedCollections.reduce(
            (acc, col) => acc + (col.products?.length || 0),
            0,
          ),
          imagesCount: totalImages,
        },
        warning: 'Catalog data not saved to database',
      };
    }
  } catch (error: any) {
    console.error('❌ Erreur récupération catalogue:', error);
    return {
      success: false,
      error: error.message,
      stack: error.stack,
    };
  }
})();
