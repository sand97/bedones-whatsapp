/**
 * Script de vérification de l'authentification WhatsApp
 * Ce script est exécuté dans le contexte de la page WhatsApp Web
 *
 * Vérifie si la connexion WhatsApp est authentifiée et active.
 *
 * Pas de variables injectées
 */

/* eslint-disable no-undef */
// @ts-nocheck - Ce code s'exécute dans le navigateur, pas dans Node.js

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
