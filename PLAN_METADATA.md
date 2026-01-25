# Plan Metadata – Traitement image & audio via whatsapp-connector / whatsapp-agent

## Contexte & objectifs
- Ajouter une couche de métadonnées par message pour consigner les résultats des traitements media (OCR/vision, STT) côté backend.
- Déporter les traitements IA dans whatsapp-agent et stocker les résultats dans le backend (Prisma) afin d’enrichir les conversations et réduire les coûts tokens.
- Passer le traitement des conversations à un système de jobs annulables par conversation pour éviter les réponses inutiles.

## Portée
- whatsapp-connector (wweb.js) : détection des messages media (image, audio), téléchargement et envoi vers whatsapp-agent.
- whatsapp-agent : pipeline de traitement (audio -> STT, image -> OCR+Gemini), écriture des métadonnées dans le backend.
- Backend (Prisma) : nouvelle table `MessageMetadata`, exposition d’API/queue pour écrire les métadonnées et suivre l’état des jobs.

## Modèle de données (apps/backend/prisma/schema.prisma)
- Ajouter l’énumération `MessageMetadataType { AUDIO, IMAGE }`.
- Nouveau modèle `MessageMetadata` :
  - `id` (cuid), `messageId` (string, identifiant WhatsApp), `type` (enum), `metadata` (Json), `createdAt`, `updatedAt`.
  - Index recommandés : `(messageId, type)` unique, `(createdAt)`.
  - Relation éventuelle future : clé étrangère vers une table Message si elle existe/arrive ; sinon `messageId` reste libre (ID wwebjs `Message.id._serialized`).

## Flux cible (haut niveau)
1) `whatsapp-connector`
   - Écoute des événements `message_create` de `whatsapp-web.js` (types `Message`, `MessageMedia`).
   - Collecte l’historique local (selon la fenêtre disponible via wweb.js) pour le `chatId`.
   - Filtrage : `msg.hasMedia && msg.type === 'image' | 'ptt' | 'audio'`.
   - Téléchargement : `await msg.downloadMedia()`; upload du binaire via le backend (en réutilisant la connexion BACKEND_WEBHOOK_URL ou en passant par l’agent qui relaie vers le backend : `connector -> agent -> backend`) pour éviter de dupliquer le service d’upload. L’URL signée retournée est injectée dans la payload envoyée à whatsapp-agent.
   - Publication vers whatsapp-agent (HTTP ou queue) d’un job `ProcessMediaJob` avec : `messageId`, `chatId`, `from`, `timestamp`, `mediaUrl`/buffer, `mediaType`, `businessId` (userId), `connectorInstanceId`, `history` (résumé/dernier N messages).

2) `whatsapp-agent` – Orchestration des jobs
   - Reçoit message + historique + URL media; vérifie `canReply` avant de traiter.
   - File de jobs (BullMQ/NestJS queues cf. https://docs.nest-js.fr/techniques/queues) par conversation (`chatId`) avec clé de déduplication : un seul job actif par conversation.
   - Si un nouveau message arrive : annuler le job en cours (AbortController) et replanifier avec le dernier contexte; s’assurer que tous les appels LLM/IA en cours sont interrompus pour limiter les tokens.
   - État de job : `pending | running | cancelled | failed | done`, stocké en mémoire + journalisation vers backend si besoin.
   - Fournit un endpoint backend qui reçoit une liste d’IDs de messages et retourne les métadonnées correspondantes pour construire le contexte avant réponse; le job est créé après avoir annulé celui en cours pour ce contact.

3) Traitement AUDIO (phase 1 prioritaire)
   - Entrée : `mediaType in ['ptt','audio']`, media en `ogg/opus` (wwebjs) ou autre.
   - Étapes :
     a. Normaliser/convertir en `wav` (si requis) avec ffmpeg (pipeline existant ou à ajouter côté agent).
     b. Transcription STT (Gemini Audio API ou provider actuel) avec prompt léger pour contexte business (langue FR par défaut).
     c. Écriture `MessageMetadata` avec `{ transcript, language?, durationSec?, confidence? }`.
   - Gestion d’erreurs : si STT échoue, enregistrer metadata `{ error, stage: 'stt' }` et retourner état `failed` mais ne pas bloquer le flux message.

4) Traitement IMAGE (phase 2)
   - Étapes :
     a. OCR ciblé retailer :
        - OCR sur l’image (Tesseract/vision provider). S’inspirer de `/Users/bruce/Documents/project/hellio/plateforme-B2C-back/src/utils/ocr.service.ts` (Tesseract) pour structurer le service.
        - Extraire `retailer_id` / SKU via regex ou lookup catalogue du business.
        - Si trouvé, enrichir metadata : `{ whatsapp_product_id, name, retailer_id, price, collectionId }` (price = valeur brute / 100).
     b. Fallback description Gemini (sans LangChain) : prompt spécifique “décris précisément le produit, catégorie, matière, couleur, état, texte visible”.
        - Résultat stocké dans metadata `{ description, labels?, safety? }`.
   - Ajouter champ `ocrEngine` / `visionModel` pour traçabilité.

5) Persistance & interfaces Backend
   - Exposer un endpoint / message bus pour `upsertMessageMetadata({ messageId, type, metadata })`.
   - Assurer l’idempotence sur `(messageId, type)`.
   - Ajouter migrations Prisma pour `MessageMetadata` + enum. Prévoir seed ou script de migration.

6) Gouvernance & observabilité
   - Logs structurés par jobId et chatId (connector + agent).
   - Métriques : durée moyenne OCR/STT, taux de détection produit, taux de cancel job.
   - Stockage media : confirmer quota / politique de rétention (surtout audio bruts après transcription).

## Roadmap incrémentale
- Phase 0 (préparatifs) : Ajouter modèle Prisma + migrations ; définir contrat d’API/queue `ProcessMediaJob` ; mettre en place AbortController partagé dans whatsapp-agent.
- Phase 1 (audio) : Implémenter pipeline STT, écriture metadata, tests sur messages vocaux ; guardrails langue et durée max.
- Phase 2 (image) : Implémenter OCR ciblé retailer + fallback Gemini ; brancher lookup catalogue business ; tester sur cas avec et sans retailer_id.
- Phase 3 (scheduler jobs) : Enforcer un job actif par conversation, annulation sur nouveau message, handlers d’arrêt des appels IA.
- Phase 4 (fiabilisation) : Monitoring, retries idempotents, nettoyage media, documentation wweb.js (types `Message`, `MessageMedia`, `Client` events) et playbooks incidents.

## Points ouverts
- Choix provider STT (Gemini Audio vs existant) et coût unitaire.
- Où persister les blobs media (MinIO actuel ?), et durée de conservation.
- Format exact du catalogue produit pour le matching OCR (regex/lookup API backend).
- Besoin d’une table `Message` intermédiaire pour relier métadonnées et historique conversation.
