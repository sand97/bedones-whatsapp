# ONBOARDING PLAN - WhatsApp Agent

---

## 📋 INSTRUCTIONS POUR CLAUDE

> **Ce fichier est le plan directeur pour l'implémentation du système d'onboarding avancé.**

### Règles de mise à jour

1. **À chaque session de travail**, tu DOIS:
   - Mettre à jour le statut des tâches (⬜ À faire / 🔄 En cours / ✅ Terminé)
   - Ajouter une entrée dans le CHANGELOG avec la date et ce qui a été fait
   - Mettre à jour la PROGRESSION GLOBALE
   - Noter les décisions techniques importantes
   - Documenter les blockers ou problèmes rencontrés

2. **Si l'utilisateur modifie les specs**, tu DOIS:
   - Mettre à jour les sections concernées
   - Noter le changement dans le CHANGELOG
   - Ajuster les checklists si nécessaire

3. **Symboles de statut**:
   - ⬜ À faire
   - 🔄 En cours
   - ✅ Terminé
   - ⚠️ Bloqué
   - ❌ Annulé

4. **Ce fichier doit toujours refléter l'état actuel du projet**

---

## 🎯 VUE D'ENSEMBLE

### Objectif

Créer un système d'onboarding intelligent qui:
- Analyse automatiquement le catalogue et le business de l'utilisateur
- Génère un contexte initial pour l'agent IA
- Améliore ce contexte via un chat conversationnel avec l'utilisateur
- Atteint un score minimum de **80%** avant activation (avec warning si < 80%)
- Permet différentes stratégies d'activation (test, tags, global)

### Expérience Utilisateur (3-4 étapes)

> **Important**: L'utilisateur ne voit que 3-4 étapes avec des animations. Les phases techniques (SYNC, ANALYSE) sont automatiques en arrière-plan.

```
1. Connexion WhatsApp    → Illustrations animées (sync + analyse en background)
2. Chat avec l'IA        → Amélioration du contexte
3. Sélection stratégie   → Choix du mode d'activation
4. Dashboard             → Système actif
```

### Distinction UserStatus vs OnboardingStatus

- **UserStatus** (enum existant): Gère le cycle de vie global de l'authentification
  - `PENDING_PAIRING → PAIRING → PAIRED → ONBOARDING → ACTIVE`
- **OnboardingStatus** (nouveau): Gère la progression dans l'onboarding une fois connecté
  - `SYNC_CATALOG → ANALYSE_PRODUCTS → ANALYSE_COMPANY → CONTEXT_IMPROVEMENT → STRATEGY_SELECTION → ACTIVE`

### Flux des statuts OnboardingStatus

```
SYNC_CATALOG → ANALYSE_PRODUCTS → ANALYSE_COMPANY → CONTEXT_IMPROVEMENT → STRATEGY_SELECTION → ACTIVE
```

### Diagramme de flux

```
┌─────────────────┐
│ User connecte   │
│ WhatsApp        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ SYNC_CATALOG    │ ← Upload catalogue + business info
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ ANALYSE_PRODUCTS│ ← IA analyse 4 images/produit (Grok/Gemini)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ ANALYSE_COMPANY │ ← Génération contexte initial + score
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ CONTEXT_        │ ← Chat IA avec tools pour améliorer
│ IMPROVEMENT     │   contexte jusqu'à score >= 90%
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ STRATEGY_       │ ← Choix: numéros test / tags / tous
│ SELECTION       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ ACTIVE          │ ← Système opérationnel
└─────────────────┘
```

---

## 📊 PROGRESSION GLOBALE

| Phase | Nom | Status | Progression | Notes |
|-------|-----|--------|-------------|-------|
| 1 | Connexion & Sync | ⬜ | 0% | Partiellement existant |
| 2 | Analyse Produits | ⬜ | 0% | |
| 3 | Analyse Entreprise | ⬜ | 0% | |
| 4 | Amélioration Contexte | ⬜ | 0% | |
| 5 | Sélection Stratégie | ⬜ | 0% | |
| 6 | Système Actif | ⬜ | 0% | |
| 7 | Dashboard | ⬜ | 0% | |

**Progression totale: 0%**

---

## 🗃️ MODIFICATIONS BASE DE DONNÉES

### Nouveau Enum: OnboardingStatus

```prisma
enum OnboardingStatus {
  SYNC_CATALOG        // Synchronisation catalogue en cours
  ANALYSE_PRODUCTS    // Analyse IA des images produits
  ANALYSE_COMPANY     // Analyse entreprise et génération contexte
  CONTEXT_IMPROVEMENT // Amélioration du contexte via chat IA
  STRATEGY_SELECTION  // Sélection stratégie d'activation
  ACTIVE              // Système activé
}
```

### Modifications model WhatsappAgent

```prisma
model WhatsAppAgent {
  // ... champs existants ...

  // Nouveaux champs
  onboardingStatus    OnboardingStatus    @default(SYNC_CATALOG)
  agentContext        String?             @db.Text    // Contexte en format MARKDOWN
  contextScore        Int                 @default(0) // Score du contexte (0-100)
  contextNeeds        String?             @db.Text    // Besoins en format MARKDOWN
  activationStrategy  Json?               // {type: 'test'|'tags'|'all', phoneNumbers?: [], tagIds?: []}

  // Relations
  contextVersions     AgentContextVersion[]
}
```

### Format Markdown pour Context et Needs

> **Important**: Le contexte et les besoins sont stockés en **Markdown** pour permettre:
> - Rendu formaté dans l'UI
> - Commentaires utilisateur sur sections (hover)
> - Sections pliables/dépliables
> - Meilleure lisibilité

#### Structure du `agentContext` (Markdown)

```markdown
# Contexte Agent - {business_name}

## 🏢 Entreprise

### Informations générales
- **Nom**: {name}
- **Secteur**: {sector}
- **Description**: {description}

### Contact
- **Téléphone support**: {phone}
- **Email**: {email}
- **Adresse**: {address}

### Horaires
{business_hours_table}

---

## 💰 Politique commerciale

### Prix
- **Type**: {Ferme | Négociable}
- **Réduction max**: {percentage}%

### Paiements acceptés
- {payment_methods_list}

### Livraison
| Ville | Frais |
|-------|-------|
| {city} | {price} FCFA |

### Retours
- **Acceptés**: {Oui | Non}
- **Délai max**: {days} jours

---

## 📦 Catalogue

### Collections
{collections_summary}

### Produits ({count} au total)

<details>
<summary>📁 {collection_name} ({product_count} produits)</summary>

#### {product_name}
- **Prix**: {price} FCFA
- **Description**: {description}
- **Analyse IA**: {ia_analysis_summary}

</details>

---

## 🏷️ Organisation

### Tags configurés
- 🟢 **Nouveau client**: {description}
- 🔵 **Client à relancer**: {description}
- 🔴 **Personnel**: Conversations à ignorer

### Groupes
- **Livraisons**: {members}
- **Équipe**: {members}

---

## ⚙️ Comportement agent

### Conversations à ignorer
- Contacts personnels: {list}
- Tags: Personnel

### Ton de communication
{communication_style}
```

#### Structure du `contextNeeds` (Markdown)

```markdown
# Besoins pour améliorer le contexte

**Score actuel**: {score}% | **Objectif**: 80%

---

## 🔴 Priorité haute ({count})

### Politique de prix
> Les prix sont-ils fermes ou négociables?

**Pourquoi c'est important**: Permet à l'agent de savoir s'il peut proposer des réductions.

- [ ] Non répondu

---

### Zones de livraison
> Dans quelles villes livrez-vous et à quel tarif?

**Pourquoi c'est important**: L'agent pourra informer les clients sur la disponibilité et les frais.

- [ ] Non répondu

---

## 🟡 Priorité moyenne ({count})

### Numéro support
> Quel numéro les clients doivent-ils appeler pour le support?

- [ ] Non répondu

---

## 🟢 Priorité basse ({count})

### Horaires détaillés
> Quels sont vos horaires d'ouverture par jour?

- [x] Répondu ✓

---

## ✅ Complétés ({count})

<details>
<summary>Voir les éléments complétés</summary>

- [x] Secteur d'activité
- [x] Description entreprise
- [x] Moyens de paiement

</details>
```

### Fonctionnalités UI pour le Markdown

L'UI frontend devra supporter:

1. **Rendu Markdown** avec bibliothèque (react-markdown, marked, etc.)
2. **Sections pliables** via `<details>/<summary>` ou composants custom
3. **Commentaires inline**: Hover sur une section → bouton "Commenter" → input
4. **Checkboxes interactives**: Clic sur `[ ]` → marque comme fait
5. **Highlighting**: Sections modifiées récemment
6. **Export**: Possibilité d'exporter le contexte en PDF/Markdown

---

## 🎨 DESIGN UI - Page "Contexte de l'IA"

> Basé sur les mockups Figma fournis

### Structure de la page

```
┌─────────────────────────────────────────────────────────────────┐
│ Sidebar                    │  Main Content                      │
│                            │                                     │
│ [Avatar] Mboa Fashion Free │  ⓘ Contexte              [Score•45%]│
│ +237 657 88 86 90          │                                     │
│                            │  Description du contexte...         │
│ ─────────────────          │                                     │
│ Compte                     │  [Déplier tout les contenus ↗]      │
│   🏠 Accueil               │                                     │
│   📊 Statistiques          │  ┌─────────────────────────────┐   │
│   📦 Commandes             │  │ Entreprise           [▼]    │   │
│                            │  │ Nom: Mboa Fashion...        │   │
│ ─────────────────          │  └─────────────────────────────┘   │
│ Configuration              │                                     │
│   ⚙️ Contexte de l'IA ←    │  ┌─────────────────────────────┐   │
│   🛒 Catalogue             │  │ Pickup               [▼]    │   │
│   📣 Marketing             │  │ Adresse pour les pickup...  │   │
│   🎧 Support               │  └─────────────────────────────┘   │
│                            │                                     │
│ ─────────────────          │  ┌─────────────────────────────┐   │
│ Aides                      │  │ Livraison            [▼]    │   │
│   ❓ FAQ                   │  │ Adresse pour les pickup...  │   │
│   ❓ Support               │  └─────────────────────────────┘   │
│                            │                                     │
│                            │  ┌─────────────────────────────────┐│
│                            │  │ 📎 Quels sont vos instructions? ⬆││
│                            │  │ [Support] [Stratégie de vente]  ││
│                            │  └─────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

### Composants clés

#### 1. Badge Score (en haut à droite)
- **Cliquable** → ouvre popup avec besoins manquants
- **Couleurs dynamiques**:
  - Rouge: < 50%
  - Orange: 50-79%
  - Vert: ≥ 80%
- Contour orange tant que non activable

#### 2. Sections pliables du contexte
- Titre + aperçu du contenu (tronqué)
- Icône d'état: ✓ (complet) ou ⚠️ (incomplet)
- Click → déplie le contenu Markdown complet

#### 3. Chat input (bas de page)
- Input: "Quels sont vos instructions?"
- Icône pièce jointe (pour screenshots, etc.)
- Bouton envoi
- **Quick actions**: Boutons pour actions fréquentes
  - "Support", "Stratégie de vente", etc.
  - = les `potentialReplies` de notre plan

#### 4. Vue Conversation (quand chat actif)
```
┌─────────────────────────────────────┐
│ ⓘ Conversation d'initialization    │
│                                     │
│ Description...                      │
│                                     │
│ ┌─────────────────────────────┐    │
│ │ ⓘ Est-ce que vous proposez │    │
│ │    la livraison?            │    │
│ │                             │    │
│ │ Si oui veuillez nous        │    │
│ │ indiquer dans quelles       │    │
│ │ villes...                   │    │
│ └─────────────────────────────┘    │
│                                     │
│ [Input + Quick actions]             │
└─────────────────────────────────────┘
```

### Popup "Besoins manquants" (clic sur score)

```
┌─────────────────────────────────────┐
│ ❌  Informations manquantes         │
│                                     │
│ Pour atteindre 80%, il manque:      │
│                                     │
│ 🔴 Priorité haute                   │
│   • Politique de prix               │
│   • Zones de livraison              │
│                                     │
│ 🟡 Priorité moyenne                 │
│   • Numéro support                  │
│   • Politique retours               │
│                                     │
│ Score actuel: 45% → Objectif: 80%   │
│                                     │
│ [Continuer la conversation]         │
└─────────────────────────────────────┘
```

### Navigation sidebar

| Section | Pages | Description |
|---------|-------|-------------|
| **Compte** | Accueil, Statistiques, Commandes | Gestion quotidienne |
| **Configuration** | Contexte de l'IA, Catalogue, Marketing, Support | Setup du système |
| **Aides** | FAQ, Support | Assistance |

### Comportement UX

1. **Blocage activation**: L'utilisateur ne peut PAS activer l'IA si score < 80%
2. **Score cliquable**: Affiche popup avec détails des manques
3. **Chat persistant**: Le chat reste en bas, messages visibles au-dessus
4. **Historique**: Scroll pour voir les messages précédents
5. **Auto-save**: Le contexte est sauvegardé automatiquement après chaque réponse

### Avantages du format Markdown

Le format Markdown pour `contextNeeds` permet:
- **Transparence du score**: L'utilisateur voit exactement ce qui manque avec priorités visuelles
- **Progression visible**: À chaque réponse, les besoins se déplacent vers "Complétés"
- **Flexibilité**: L'IA peut ajouter des sections si elle découvre un problème
- **Interactivité**: L'utilisateur peut commenter et interagir directement
- **Lisibilité**: Format humain, pas technique

### Versioning du Contexte

```prisma
model AgentContextVersion {
  id        String        @id @default(uuid())
  agentId   String
  agent     WhatsAppAgent @relation(fields: [agentId], references: [id])
  context   String        @db.Text
  score     Int
  reason    String?       // Pourquoi cette version a été créée
  createdAt DateTime      @default(now())

  @@index([agentId])
}
```

### Modification model ProductImage

```prisma
model ProductImage {
  // ... champs existants ...

  // Nouveau champ
  ia_analyse          String?             @db.Text    // Analyse IA de l'image
  analysed_at         DateTime?           // Date d'analyse
}
```

### Nouvelles tables: Thread & ThreadMessage

```prisma
model Thread {
  id          String          @id @default(uuid())
  userId      String
  user        User            @relation(fields: [userId], references: [id])
  agentId     String
  agent       WhatsAppAgent   @relation(fields: [agentId], references: [id])
  type        ThreadType      @default(ONBOARDING)
  title       String?
  isActive    Boolean         @default(true)
  messages    ThreadMessage[]
  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt

  @@index([userId])
  @@index([agentId])
}

enum ThreadType {
  ONBOARDING          // Thread d'onboarding initial
  CONTEXT_IMPROVEMENT // Amélioration continue
  SUPPORT             // Support utilisateur
  STRATEGY_CHANGE     // Changement de stratégie
}

model ThreadMessage {
  id              String    @id @default(uuid())
  threadId        String
  thread          Thread    @relation(fields: [threadId], references: [id])
  content         String    @db.Text
  source          MessageSource
  potentialReplies Json?    // [{title: string, action?: string}]
  tokensUsed      Int?
  createdAt       DateTime  @default(now())

  @@index([threadId])
}

enum MessageSource {
  USER
  AGENT
  SYSTEM
}
```

### Checklist Base de Données

- ⬜ Ajouter enum OnboardingStatus au schema Prisma
- ⬜ Ajouter enum ThreadType au schema Prisma
- ⬜ Ajouter enum MessageSource au schema Prisma
- ⬜ Modifier model WhatsAppAgent (nouveaux champs + relation)
- ⬜ Modifier model ProductImage (ia_analyse)
- ⬜ Créer model Thread
- ⬜ Créer model ThreadMessage
- ⬜ Créer model AgentContextVersion
- ⬜ Créer migration Prisma
- ⬜ Mettre à jour les types générés

---

## 📝 PHASES DÉTAILLÉES

### Phase 1: Connexion & Synchronisation (SYNC_CATALOG)

**Objectif**: L'utilisateur connecte son WhatsApp et on synchronise son catalogue.

**Comportement existant à modifier**:
- Quand l'user passe en `ready` → mettre `onboardingStatus = SYNC_CATALOG`
- Fin de l'upload catalogue + infos → passer à `ANALYSE_PRODUCTS`

#### Checklist Phase 1

- ⬜ Modifier `auth.service.ts` pour initialiser `onboardingStatus`
- ⬜ Modifier `catalog.service.ts` pour changer le status après sync
- ⬜ Ajouter endpoint `GET /onboarding/status` pour vérifier l'état
- ⬜ Frontend: redirection selon `onboardingStatus`

---

### Phase 2: Analyse des Produits (ANALYSE_PRODUCTS)

**Objectif**: Analyser les images de chaque produit avec une IA pour enrichir le contexte.

**Specs**:
- Utiliser LangChain sur le backend
- IA principale: Grok (thinking model)
- Backup: Gemini (fallback automatique via LangChain)
- **Analyser les 2 premières images de chaque produit** (optimisation coût/performance)
- Traitement en **batch** et en **arrière-plan**
- Stocker l'analyse dans `ProductImage.ia_analyse`
- Si les 2 images sont déjà analysées → skip le produit
- Calculer la progression en temps réel
- Erreurs signalées via **Sentry**

**Format de l'analyse**:
```json
{
  "description": "Description détaillée de ce qui est visible",
  "product_type": "Type de produit détecté",
  "colors": ["couleurs détectées"],
  "materials": ["matériaux visibles"],
  "quality_score": 85,
  "suggestions": ["suggestions d'amélioration de l'image"]
}
```

#### Checklist Phase 2

**Backend**:
- ⬜ Créer module `onboarding`
- ⬜ Créer `ProductAnalysisService`
- ⬜ Intégrer Grok API (xAI)
- ⬜ Intégrer Gemini API (backup)
- ⬜ Créer job d'analyse en arrière-plan
- ⬜ Endpoint `POST /onboarding/start-product-analysis`
- ⬜ Endpoint `GET /onboarding/analysis-progress`
- ⬜ Logique de calcul de progression
- ⬜ Gestion des erreurs et retry

**Frontend**:
- ⬜ Créer page `/onboarding/analysis`
- ⬜ Composant `AnalysisProgress` avec barre de progression
- ⬜ Affichage des produits analysés en temps réel
- ⬜ Polling ou WebSocket pour la progression

---

### Phase 3: Analyse Entreprise (ANALYSE_COMPANY)

**Objectif**: Générer le contexte initial de l'agent basé sur toutes les données disponibles.

**Données à collecter**:
- BusinessInfo (profile_name, description, categories, business_hours)
- User (phoneNumber, whatsappProfile)
- Products (name, description, price)
- ProductImages (ia_analyse des 2 premières)
- Collections (name, description)

**Output**:
1. `agentContext`: Contexte textuel complet pour l'agent
2. `contextScore`: Score initial (probablement bas, 20-40%)
3. `contextNeeds`: Liste structurée des besoins/questions pour améliorer le score

**Structure du contexte généré**:
```markdown
## Entreprise
- Nom: {business_name}
- Description: {description}
- Catégories: {categories}
- Horaires: {business_hours}

## Produits
{Pour chaque produit:}
- {name}: {description} - {price} FCFA
  Analyse visuelle: {ia_analyse summary}

## Informations manquantes
- Secteur d'activité précis
- Politique de prix
- Zones de livraison
- etc.
```

#### Checklist Phase 3

**Backend**:
- ⬜ Créer `CompanyAnalysisService`
- ⬜ Fonction de collecte des données
- ⬜ Prompt IA pour génération de contexte
- ⬜ Prompt IA pour calcul du score
- ⬜ Prompt IA pour suggestions d'amélioration
- ⬜ Endpoint `POST /onboarding/start-company-analysis`
- ⬜ Endpoint `GET /onboarding/context`
- ⬜ Sauvegarder contexte dans WhatsappAgent

**Frontend**:
- ⬜ Page de transition/loading pendant l'analyse
- ⬜ Affichage du score initial
- ⬜ Bouton pour continuer vers amélioration

---

### Phase 4: Amélioration du Contexte (CONTEXT_IMPROVEMENT)

**Objectif**: Chat conversationnel où l'IA pose des questions et améliore le contexte jusqu'à score >= 80%.

**Comportement**:
- L'utilisateur est redirigé vers un chat
- Communication en temps réel via **WebSocket**
- L'IA a accès à des tools pour:
  - Lire les données en BD
  - Exécuter des scripts via wa-js
  - Mettre à jour le contexte et le score
  - Créer/modifier des tags et groupes
  - Écrire et exécuter ses propres scripts
- L'IA pose des questions adaptées au business
- Chaque réponse améliore le contexte et diminue les besoins
- Score minimum requis: **80%** (avec warning si l'utilisateur veut activer avant)

**Tables utilisées**: Thread, ThreadMessage

**potentialReplies**: Boutons affichés sous le dernier message pour faciliter les réponses

**Test des réponses IA**: L'utilisateur peut ajouter un ami comme contact de test dans la stratégie pour tester les réponses directement via WhatsApp (pas besoin d'environnement de test séparé)

#### Questions par type de business

**E-commerce / Boutique**:
- Prix ferme ou négociable? (si négociable: % max de réduction)
- Avez-vous une boutique physique? (basé sur adresse business)
- Faites-vous des livraisons? (si oui: villes + frais)
- Politique de retour? (délai max)
- Numéro support client?
- Moyens de paiement acceptés?

**Services**:
- Type de service?
- Zone de couverture?
- Délai moyen de prestation?
- Tarification (horaire, forfait, devis)?

**Général (tous)**:
- Secteur d'activité précis
- **Conversations personnelles**: Proposer de créer un tag "Personnel" (compte business) ou d'ajouter les contacts perso dans le dashboard
- Tags à créer (Client à relancer, Nouveau client, Support, Personnel...)
- Groupes à créer (Livraisons, Équipe, etc.)

#### Système de Tools IA

L'IA dispose d'un ensemble complet de tools pour être **autonome** et pouvoir orchestrer ses propres actions.

##### Tools Base de Données

| Tool | Description | Paramètres |
|------|-------------|------------|
| `readUserInfo` | Lire infos utilisateur | userId |
| `readBusinessProfile` | Lire profil business | userId |
| `readProducts` | Lire produits | userId, limit?, offset? |
| `readProductAnalysis` | Lire analyses images | productId |
| `readTags` | Lire tags utilisateur (BD) | userId |
| `readGroups` | Lire groupes utilisateur (BD) | userId |
| `updateContext` | Mettre à jour contexte agent | newContext |
| `updateNeeds` | Mettre à jour besoins | needs[] |
| `getContextScore` | Obtenir score actuel | - |

##### Tools Labels/Tags (via wa-js WPP.labels)

| Tool | Description | Paramètres |
|------|-------------|------------|
| `getAllLabels` | Liste tous les labels WhatsApp | - |
| `getLabelById` | Obtenir un label spécifique | labelId |
| `addNewLabel` | Créer un nouveau label | name, color? |
| `editLabel` | Modifier un label | labelId, name?, color? |
| `deleteLabel` | Supprimer un label | labelId |
| `addOrRemoveLabels` | Ajouter/retirer labels d'un chat | chatId, labelIds[], action |
| `getLabelColorPalette` | Obtenir couleurs disponibles | - |

##### Tools Chat/Messages (via wa-js WPP.chat)

| Tool | Description | Paramètres |
|------|-------------|------------|
| `getChatList` | Liste des conversations | limit?, filters? |
| `getChat` | Obtenir détails d'un chat | chatId |
| `getMessages` | Lire messages d'une conversation | chatId, limit? |
| `getUnreadChats` | Liste chats non lus | - |
| `markIsRead` | Marquer comme lu | chatId |
| `archiveChat` | Archiver une conversation | chatId |
| `pinChat` | Épingler une conversation | chatId |
| `getNotes` | Lire notes d'un chat | chatId |
| `setNotes` | Définir notes d'un chat | chatId, notes |

##### Tools Contacts (via wa-js WPP.contact)

| Tool | Description | Paramètres |
|------|-------------|------------|
| `getContact` | Obtenir infos contact | contactId |
| `getContactList` | Liste tous les contacts | filters? |
| `getContactStatus` | Lire status d'un contact | contactId |
| `getCommonGroups` | Groupes en commun | contactId |
| `queryContactExists` | Vérifier si contact existe | phoneNumber |

##### Tools Groupes WhatsApp (via wa-js WPP.group)

| Tool | Description | Paramètres |
|------|-------------|------------|
| `getAllGroups` | Liste tous les groupes WA | - |
| `createGroup` | Créer un groupe WA | name, participants[] |
| `getGroupParticipants` | Liste membres d'un groupe | groupId |
| `addGroupParticipants` | Ajouter membres | groupId, participants[] |
| `removeGroupParticipants` | Retirer membres | groupId, participants[] |
| `setGroupSubject` | Changer nom du groupe | groupId, subject |
| `setGroupDescription` | Changer description | groupId, description |
| `getGroupInviteCode` | Obtenir lien d'invitation | groupId |

##### Tools Profil (via wa-js WPP.profile)

| Tool | Description | Paramètres |
|------|-------------|------------|
| `getMyProfileName` | Lire nom du profil | - |
| `getMyStatus` | Lire status WhatsApp | - |
| `setMyProfileName` | Modifier nom du profil | name |
| `setMyStatus` | Modifier status WhatsApp | status |
| `editBusinessProfile` | Modifier profil business | data |

##### Tools Catalogue (via wa-js WPP.catalog)

| Tool | Description | Paramètres |
|------|-------------|------------|
| `getProducts` | Liste produits catalogue | limit? |
| `getProductById` | Obtenir un produit | productId |
| `editProduct` | Modifier un produit | productId, data |
| `getCollections` | Liste collections | - |
| `editCollection` | Modifier collection | collectionId, data |
| `setProductVisibility` | Afficher/masquer produit | productId, visible |

##### Tools Avancés

| Tool | Description | Paramètres |
|------|-------------|------------|
| `executeScript` | Exécuter script wa-js personnalisé | script |
| `sendMessage` | Envoyer message (pour tests) | chatId, message |

#### Mécanisme d'Orchestration (ReAct Agent)

L'IA utilise le pattern **ReAct** (Reasoning + Acting) de LangChain pour orchestrer ses actions de manière autonome:

```typescript
// L'IA peut chaîner plusieurs tools automatiquement
const agent = createReactAgent({
  llm: grokClient,
  tools: allTools,
  prompt: orchestrationPrompt,
});

// Exemple de raisonnement de l'IA:
// 1. "Je dois vérifier si l'utilisateur a des labels"
// 2. Appel: getAllLabels()
// 3. "Il n'a pas de label 'Nouveau client', je vais le créer"
// 4. Appel: addNewLabel("Nouveau client", "#4CAF50")
// 5. "Je mets à jour le contexte avec cette info"
// 6. Appel: updateContext(newContext)
// 7. "Je recalcule le score"
// 8. Appel: updateNeeds(updatedNeeds)
```

**Capacités d'orchestration**:
- Chaîner plusieurs tools sans intervention utilisateur
- Utiliser le résultat d'un tool pour décider du prochain
- Sauvegarder automatiquement le contexte après modifications
- Détecter et corriger les erreurs (fautes d'orthographe dans produits, etc.)
- Proposer des améliorations proactives

**Sécurité**:
- Scripts personnalisés sandboxés avec timeout
- Whitelist des fonctions wa-js autorisées
- Logging de toutes les opérations
- Possibilité de review admin

#### Prompt système pour l'IA du chat

```markdown
Tu es un assistant d'onboarding pour WhatsApp Agent. Ton rôle est d'aider l'utilisateur à configurer son agent IA pour qu'il puisse répondre automatiquement à ses clients.

## Ton objectif
Améliorer le contexte de l'agent jusqu'à atteindre un score de 80% minimum. Le score actuel est de {score}%.

## Ce que tu sais déjà
{agentContext}

## Besoins restants
{contextNeeds}

## Règles
1. Pose UNE question à la fois
2. Adapte tes questions au type de business détecté
3. Utilise les tools disponibles pour obtenir plus d'infos si nécessaire
4. Tu peux chaîner plusieurs tools pour accomplir une tâche (ex: vérifier labels → créer si manquant → mettre à jour contexte)
5. Après chaque réponse utilisateur, mets à jour le contexte ET les besoins
6. Propose des boutons de réponse rapide (potentialReplies) quand c'est pertinent
7. Tu peux créer des tags et groupes si l'utilisateur le souhaite
8. Si tu détectes des erreurs (fautes d'orthographe, infos incohérentes), propose de les corriger
9. Si le score atteint 80%, félicite l'utilisateur et propose de passer à l'étape suivante
10. Tu peux ajouter des besoins si tu découvres qu'une info importante manque

## Format des réponses
- Sois concis et professionnel
- Utilise potentialReplies pour les choix simples
- Explique pourquoi chaque information est importante
- Montre la progression (ex: "Score: 65% → 72% (+7)")
```

#### Checklist Phase 4

**Backend**:
- ⬜ Créer module `threads`
- ⬜ Créer `ThreadService`
- ⬜ Créer `ContextImprovementService`
- ⬜ Implémenter tous les tools IA
- ⬜ Créer le prompt système détaillé
- ⬜ Endpoint `POST /threads` - Créer thread
- ⬜ Endpoint `GET /threads/:id` - Obtenir thread
- ⬜ Endpoint `GET /threads/:id/messages` - Liste messages
- ⬜ Endpoint `POST /threads/:id/messages` - Envoyer message
- ⬜ Logique de calcul de score dynamique
- ⬜ Intégration LangChain avec tools

**Frontend**:
- ⬜ Créer page `/onboarding/context-chat`
- ⬜ Composant `ChatInterface`
- ⬜ Affichage messages avec bulles
- ⬜ Boutons `potentialReplies` sous le dernier message
- ⬜ Indicateur de score en temps réel
- ⬜ Bouton "Passer à l'étape suivante" quand score >= 80%
- ⬜ Warning si activation avec score < 80%
- ⬜ Possibilité de continuer le chat même après 80%

---

### Phase 5: Sélection de Stratégie (STRATEGY_SELECTION)

**Objectif**: L'utilisateur choisit comment activer le système.

**Options (Cards)**:

#### Option 1: Mode Test
- Choisir un ou plusieurs numéros de téléphone
- Le système répond UNIQUEMENT aux messages de ces numéros
- Pour tester avant activation globale

#### Option 2: Tags Spécifiques
- Activer pour les conversations taguées
- Sélectionner les tags concernés (autocomplete)
- Utile pour cibler certains clients

#### Option 3: Tous les Contacts
- Activation globale
- Désactive les options 1 et 2
- Le système répond à tous les messages

**Stockage**:
```typescript
// WhatsappAgent.activationStrategy
{
  type: 'test' | 'tags' | 'all',
  phoneNumbers?: string[],  // Pour type 'test'
  tagIds?: string[]         // Pour type 'tags'
}
```

#### Checklist Phase 5

**Backend**:
- ⬜ Endpoint `GET /onboarding/tags` - Liste tags pour autocomplete
- ⬜ Endpoint `POST /onboarding/strategy` - Sauvegarder stratégie
- ⬜ Endpoint `GET /onboarding/strategy` - Obtenir stratégie actuelle
- ⬜ Validation des données (numéros valides, tags existants)

**Frontend**:
- ⬜ Créer page `/onboarding/activation`
- ⬜ Card "Mode Test" avec input numéros
- ⬜ Card "Tags Spécifiques" avec autocomplete
- ⬜ Card "Tous les Contacts" avec confirmation
- ⬜ Indication visuelle de l'option sélectionnée
- ⬜ Bouton "Activer le système"

---

### Phase 6: Système Actif (ACTIVE)

**Objectif**: Le système est opérationnel et traite les messages selon la stratégie.

**Flux de traitement des messages**:

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  Connector  │────>│   Backend    │────>│    Agent    │
│  (message)  │     │  (webhook)   │     │  (process)  │
└─────────────┘     └──────────────┘     └─────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │  Vérifier    │
                    │  stratégie   │
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
         ┌────────┐  ┌──────────┐  ┌────────┐
         │  Test  │  │   Tags   │  │  All   │
         │ phones │  │ matching │  │        │
         └────┬───┘  └────┬─────┘  └───┬────┘
              │           │            │
              └───────────┼────────────┘
                          ▼
                   ┌──────────────┐
                   │  Autoriser?  │
                   └──────┬───────┘
                          │
                    ┌─────┴─────┐
                    ▼           ▼
               ┌────────┐  ┌────────┐
               │  Oui   │  │  Non   │
               │Process │  │ Ignore │
               └────────┘  └────────┘
```

**Logging des opérations**:
Chaque opération IA doit logger:
- Message initial
- Message final (réponse générée)
- Tokens utilisés
- Coût en crédits

**Table Credit existante** sera utilisée pour tracker l'usage.

#### Checklist Phase 6

**Backend**:
- ⬜ Modifier webhook message pour vérifier stratégie
- ⬜ Endpoint `POST /agent/can-process` - Vérifier autorisation
- ⬜ Service de vérification stratégie
- ⬜ Logging des opérations IA
- ⬜ Calcul et déduction des crédits
- ⬜ Endpoint `GET /usage/stats` - Statistiques d'utilisation

**Agent (whatsapp-agent)**:
- ⬜ Appel backend avant traitement
- ⬜ Utiliser le contexte de l'agent
- ⬜ Logger l'opération après réponse

---

### Phase 7: Dashboard Utilisateur

**Objectif**: Interface post-onboarding pour gérer le système.

#### Page d'accueil

**Cards d'activation de scénarios**:
- Activer/désactiver le système
- Changer de stratégie
- Mode maintenance

**Cards utilitaires**:
- "Signaler un problème" → ouvre thread support
- "Changer la stratégie de vente" → thread amélioration
- "Améliorer le contexte" → thread contexte

**Status**:
- Conversations traitées (total)
- Messages traités (total)
- Crédits utilisés
- Crédits restants
- Bouton "Upgrade"

#### Liste des conversations

- Liste de tous les threads (onboarding inclus)
- Possibilité d'en démarrer un nouveau
- Filtres par type (ONBOARDING, SUPPORT, etc.)

#### Paramètres

- Profil utilisateur
- Informations business
- Configuration avancée

#### Checklist Phase 7

**Backend**:
- ⬜ Endpoint `GET /dashboard/stats` - Statistiques
- ⬜ Endpoint `GET /threads` - Liste threads utilisateur
- ⬜ Endpoint `POST /threads/start/:type` - Démarrer thread

**Frontend**:
- ⬜ Créer page `/dashboard`
- ⬜ Composant `StatsCards`
- ⬜ Composant `ActionCards`
- ⬜ Créer page `/conversations`
- ⬜ Liste des threads avec preview
- ⬜ Créer page `/settings`
- ⬜ Navigation bottom bar

---

## 🔧 STRUCTURE BACKEND

### Nouveaux modules à créer

```
src/
├── onboarding/
│   ├── onboarding.module.ts
│   ├── onboarding.controller.ts
│   ├── onboarding.service.ts
│   ├── product-analysis.service.ts
│   ├── company-analysis.service.ts
│   └── dto/
│       ├── start-analysis.dto.ts
│       └── set-strategy.dto.ts
├── threads/
│   ├── threads.module.ts
│   ├── threads.controller.ts
│   ├── threads.service.ts
│   ├── context-improvement.service.ts
│   ├── tools/
│   │   ├── index.ts
│   │   ├── read-user.tool.ts
│   │   ├── read-products.tool.ts
│   │   ├── create-tag.tool.ts
│   │   ├── execute-script.tool.ts
│   │   └── update-context.tool.ts
│   └── dto/
│       ├── create-thread.dto.ts
│       └── send-message.dto.ts
└── dashboard/
    ├── dashboard.module.ts
    ├── dashboard.controller.ts
    └── dashboard.service.ts
```

---

## 🎨 STRUCTURE FRONTEND

### Nouvelles routes

```typescript
// routes.ts
export default [
  // ... routes existantes ...

  // Onboarding étendu
  { path: '/onboarding/analysis', component: OnboardingAnalysis },
  { path: '/onboarding/context-chat', component: ContextChat },
  { path: '/onboarding/activation', component: ActivationStrategy },

  // Dashboard
  { path: '/dashboard', component: Dashboard },
  { path: '/conversations', component: Conversations },
  { path: '/conversations/:threadId', component: ThreadDetail },
  { path: '/settings', component: Settings },
]
```

### Nouveaux composants

```
app/
├── components/
│   ├── onboarding/
│   │   ├── AnalysisProgress.tsx
│   │   └── ScoreIndicator.tsx
│   ├── chat/
│   │   ├── ChatInterface.tsx
│   │   ├── MessageBubble.tsx
│   │   ├── PotentialReplies.tsx
│   │   └── ChatInput.tsx
│   ├── dashboard/
│   │   ├── StatsCards.tsx
│   │   ├── ActionCards.tsx
│   │   └── QuickActions.tsx
│   └── strategy/
│       ├── TestModeCard.tsx
│       ├── TagsCard.tsx
│       └── AllContactsCard.tsx
```

---

## 🔌 INTÉGRATION IA

### Providers à configurer

**Grok (xAI)** - Principal pour analyse:
```typescript
// Thinking model pour analyse approfondie
const grokClient = new XAI({
  apiKey: process.env.XAI_API_KEY,
  model: 'grok-2-vision-1212', // ou thinking model
});
```

**Gemini** - Backup:
```typescript
const geminiClient = new GoogleGenerativeAI({
  apiKey: process.env.GOOGLE_AI_API_KEY,
  model: 'gemini-1.5-flash',
});
```

### Configuration LangChain

```typescript
// Pour le chat d'amélioration
const agent = createReactAgent({
  llm: grokClient, // ou gemini en fallback
  tools: [
    readUserInfoTool,
    readProductsTool,
    createTagTool,
    updateContextTool,
    // ... autres tools
  ],
  prompt: contextImprovementPrompt,
});
```

---

## 📡 NOUVEAUX ENDPOINTS API

### Onboarding

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/onboarding/status` | Obtenir status onboarding actuel |
| POST | `/onboarding/start-product-analysis` | Lancer analyse produits |
| GET | `/onboarding/analysis-progress` | Progression de l'analyse |
| POST | `/onboarding/start-company-analysis` | Lancer analyse entreprise |
| GET | `/onboarding/context` | Obtenir contexte généré |
| POST | `/onboarding/strategy` | Définir stratégie d'activation |
| GET | `/onboarding/strategy` | Obtenir stratégie actuelle |

### Threads

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/threads` | Liste des threads utilisateur |
| POST | `/threads` | Créer nouveau thread |
| GET | `/threads/:id` | Détails d'un thread |
| GET | `/threads/:id/messages` | Messages d'un thread |
| POST | `/threads/:id/messages` | Envoyer message |

### Dashboard

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/dashboard/stats` | Statistiques utilisateur |
| GET | `/usage/history` | Historique d'utilisation |

### Agent

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/agent/can-process` | Vérifier si peut traiter message |
| POST | `/agent/log-operation` | Logger opération IA |

---

## 📝 CHANGELOG

### [2025-11-20] - Révision majeure du plan
- Clarification UX: 3-4 étapes utilisateur (pas 6+)
- Score minimum changé de 90% à **80%** avec warning
- Analyse images: 2 par produit (au lieu de 4) en batch
- **Format Markdown** pour agentContext et contextNeeds
  - Permet rendu riche dans l'UI
  - Commentaires inline sur sections (hover)
  - Sections pliables/dépliables
  - Checkboxes interactives
- Ajout **versioning du contexte** (AgentContextVersion)
- Expansion massive des tools IA (50+ tools basés sur wa-js)
- Documentation du mécanisme d'**orchestration ReAct**
- Ajout détection conversations personnelles via tags
- Communication chat via **WebSocket**
- Clarification UserStatus vs OnboardingStatus
- Test des réponses via WhatsApp (pas d'env de test séparé)
- Ajout Sentry pour monitoring des erreurs
- Fallback Grok → Gemini via LangChain
- **Design UI documenté** basé sur mockups Figma:
  - Structure page "Contexte de l'IA"
  - Badge score cliquable → popup besoins manquants
  - Sections pliables avec aperçu
  - Chat input persistant avec quick actions
  - Navigation sidebar (Compte/Configuration/Aides)

### [2025-11-20] - Création du plan
- Création initiale du fichier ONBOARDING_PLAN.md
- Documentation complète de toutes les phases
- Définition des structures de données
- Listing des endpoints API
- Checklists pour chaque phase

---

## 🗒️ NOTES DE SESSION

### Décisions techniques

**[2025-11-20]**:
- Score 80% choisi pour équilibrer qualité et friction utilisateur
- 2 images par produit pour optimiser coût/performance
- contextNeeds comme JSON pour flexibilité et transparence
- ReAct agent pattern pour permettre orchestration autonome
- WebSocket pour chat temps réel
- Test via WhatsApp direct (pas de simulateur)
- Tags pour conversations personnelles (plus fiable que détection auto)

### Blockers rencontrés

*(À compléter au fur et à mesure)*

### Prochaines étapes immédiates

1. Modifier le schema Prisma avec les nouveaux enums et tables
2. Créer la migration
3. Commencer par le module `onboarding` backend
4. Implémenter l'analyse des produits avec Grok/Gemini
5. Configurer WebSocket pour le chat
6. Créer les scripts wa-js pour les nouveaux tools

---

## 📚 RESSOURCES

- [wa-js Documentation](https://wppconnect.io/wa-js/) - Pour les scripts WhatsApp
- [LangChain Tools](https://js.langchain.com/docs/modules/agents/tools/) - Pour les tools IA
- [Grok API](https://docs.x.ai/) - Documentation xAI
- [Gemini API](https://ai.google.dev/docs) - Documentation Google AI
