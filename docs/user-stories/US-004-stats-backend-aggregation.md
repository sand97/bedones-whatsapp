# US-004 - Backend de stats journalieres agregees

Statut: En cours
Priorite: Haute
Zone: `apps/backend`

## User story

En tant que frontend stats, je veux recuperer des donnees journalieres pre-agregees afin d'afficher rapidement les volumes de messages et conversations sans recalculer tout l'historique a chaque chargement.

## Contexte

L'endpoint `GET /users/me/stats` actuel ne couvre que commandes, credits et produits. Il faut introduire une vraie brique analytics pour la page `stats`.

## Proposition fonctionnelle

- Stocker une ligne de stats par utilisateur et par jour
- Calculer la journee closee via un job planifie chaque nuit
- Calculer la journee courante dynamiquement au moment de la requete
- Retourner par defaut toute la serie de l'annee en cours
- Supporter un mode de refresh incremental avec `startDate` et `endDate`

## Modele de donnees cible

Le besoin exprime couvre les champs suivants:

- `day`
- `messages`
- `messagesHandled`
- `imageMessages`
- `imageMessagesHandled`
- `textMessages`
- `textMessagesHandled`
- `conversations`
- `tokens`

## Recommandation technique

- Stocker `day` en ISO `YYYY-MM-DD` ou en date normalisee en base, pas en `DD-MM-YYYY`
- Placer la table stats dans la base backend, au plus pres de `AgentOperation`
- Utiliser Prisma uniquement pour les lectures/ecritures
- Preferer un job planifie robuste avec retry. Si Bull est retenu pour la recurrence quotidienne, il est preferable a un cron purement process-local

## Taches

- Definir un nouveau modele Prisma de stats journalieres
- Ajouter les migrations via Prisma CLI uniquement
- Exposer un endpoint dedie stats analytics pour le frontend
- Gerer le mode `sans date` pour renvoyer l'annee courante
- Gerer le mode `startDate/endDate` pour rafraichissement incremental
- Calculer dynamiquement les stats du jour courant sans attendre le job de nuit
- Mettre en cache la reponse si necessaire, sans rendre les donnees du jour incoherentes

## Criteres d'acceptation

- Un appel sans `startDate` ni `endDate` renvoie la serie complete de l'annee en cours
- Un appel avec `startDate` et `endDate` renvoie uniquement l'intervalle demande
- Les donnees du jour courant sont toujours a jour meme avant le job de minuit
- Le systeme ne recalcule pas inutilement les jours deja snapshots
- Le contrat d'API distingue clairement les metriques `messages` et `conversations`
- Les lectures restent compatibles avec un affichage frontend rapide

## Dependances

- Peut etre livre avant `US-003`
- Beneficie fortement de `US-005`

## Progression superviseur

- 2026-03-07: ajout du modele Prisma `UserDailyStat` pour stocker les snapshots journaliers
- 2026-03-07: ajout de l'endpoint `GET /users/me/stats/analytics` avec support `sans date` et `startDate/endDate`
- 2026-03-07: calcul des jours clos via snapshots et calcul dynamique du jour courant implementes
- 2026-03-07: job quotidien Bull avec retry ajoute pour snapshotter la veille quand `REDIS_URL` est disponible
- 2026-03-07: enrichissement du logging `AgentOperation` pour remonter `messageType` / `mediaKind` et mieux distinguer `messages` / `conversations`
- 2026-03-07: verification OK avec `pnpm --filter backend prisma:generate`
- 2026-03-07: verification OK avec `pnpm --filter backend type-check`
- 2026-03-07: verification OK avec `pnpm --filter backend exec jest stats.utils.spec.ts --runInBand --watchman=false`
- Blocage: la commande officielle `pnpm --filter backend prisma:migrate --name add_user_daily_stats_analytics` echoue avec `P1002` sur un timeout `pg_advisory_lock`
- Contrainte respectee: aucune migration Prisma manuelle n'a ete creee pour contourner ce blocage
