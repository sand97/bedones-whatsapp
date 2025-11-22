/**
 * Script d'envoi de message texte WhatsApp
 * Ce script est exécuté dans le contexte de la page WhatsApp Web
 *
 * Variables injectées :
 * - PHONE_NUMBER: Numéro de téléphone au format international (ex: "+33612345678")
 * - MESSAGE: Message texte à envoyer
 *
 * Le script effectue les opérations suivantes :
 * 1. Vérifie si le numéro existe (queryExists)
 * 2. Récupère le WID (WhatsApp ID) du contact
 * 3. Envoie le message texte
 *
 * Cela évite un aller-retour supplémentaire entre backend et connector.
 */

/* eslint-disable no-undef */
// @ts-nocheck - Ce code s'exécute dans le navigateur, pas dans Node.js

(async () => {
  const PHONE_NUMBER = '{{PHONE_NUMBER}}';
  const MESSAGE = `{{MESSAGE}}`;

  try {
    // Étape 1: Vérifier si le contact existe et récupérer son WID
    console.log(`📞 Vérification de l'existence du numéro: ${PHONE_NUMBER}`);

    const contact = await WPP.contact.queryExists(PHONE_NUMBER);

    if (!contact) {
      return {
        success: false,
        error: 'Contact not found',
        phoneNumber: PHONE_NUMBER,
      };
    }

    const wid = contact.wid._serialized;
    console.log(`✅ Contact trouvé: ${wid}`);

    // Étape 2: Envoyer le message
    console.log(`📤 Envoi du message...`);

    const result = await WPP.chat.sendTextMessage(wid, MESSAGE);

    console.log(`✅ Message envoyé avec succès`);

    return {
      success: true,
      messageId: result.id,
      timestamp: result.t,
      ack: result.ack,
      wid: wid,
    };
  } catch (error: any) {
    console.error(`❌ Erreur lors de l'envoi du message:`, error.message);
    return {
      success: false,
      error: error.message,
      phoneNumber: PHONE_NUMBER,
    };
  }
})();
