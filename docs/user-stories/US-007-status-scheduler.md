# US-007 - Status scheduler

Statut: Implementee cote code, migration Prisma bloquee Priorite: Moyenne Zone: `apps/frontend`,
`apps/backend` ou `apps/whatsapp-agent`

## User story

En tant qu'utilisateur, je veux planifier un ou plusieurs statuts WhatsApp par jour afin d'organiser
ma presence marketing sans intervention manuelle quotidienne.

## Contexte

Le menu `Marketing` doit etre remplace par `Status scheduler`. La page cible doit proposer un
calendrier de planification avec edition par jour. Le module cible mentionne est:
`https://wppconnect.io/wa-js/modules/status.html`

## Taches

- Renommer le menu `Marketing` en `Status scheduler`
- Ajouter une page calendrier de planification
- Permettre de cliquer sur une journee pour ajouter un ou plusieurs statuts
- Pour chaque statut, collecter au minimum l'heure et le type de contenu
- Brancher l'envoi/programmation sur le module WPPConnect adequat
- Definir le stockage des publications planifiees et de leur statut

## Criteres d'acceptation

- Le menu affiche `Status scheduler`
- Une route fonctionnelle existe pour cette page
- L'utilisateur peut creer plusieurs statuts sur une meme journee
- Chaque statut planifie contient au moins une date, une heure et un type de contenu
- L'interface permet de distinguer les contenus deja planifies des jours vides

## Notes techniques

- A preciser pendant l'implementation: route finale `/marketing` conservee temporairement ou
  remplacee par `/status-scheduler`
- Si la programmation native n'existe pas cote WPPConnect, prevoir un job backend/agent qui execute
  les envois a l'heure voulue

## Avancement agent

- 2026-03-07: menu `Marketing` renomme en `Status scheduler` dans le shell dashboard
- 2026-03-07: nouvelle route frontend `/status-scheduler` ajoutee avec alias temporaire `/marketing`
- 2026-03-07: page calendrier ajoutee avec `Calendar` AntD, modale de journee, creation multiple par
  date, edition et suppression
- 2026-03-07: API backend `users/me/status-schedules` ajoutee pour lister, creer, modifier et
  annuler les statuts planifies
- 2026-03-07: stockage Prisma prepare avec le modele `StatusSchedule` et les enums associes
- 2026-03-07: script WPPConnect ajoute pour publier les statuts `TEXT`, `IMAGE` et `VIDEO`
- 2026-03-07: dispatcher backend ajoute pour envoyer automatiquement les statuts arrives a echeance

## Decision implementation

- Route retenue: `/status-scheduler`
- Compatibilite temporaire conservee: `/marketing` redirige vers `/status-scheduler`
- Stockage retenu: base backend principale (`apps/backend/prisma/schema.prisma`)
- Execution retenue: polling backend periodique qui publie les statuts `PENDING` via `WPP.status`

## Verification

- `pnpm --filter backend prisma:generate` OK
- `pnpm --filter backend type-check` OK
- `pnpm --filter frontend type-check` OK
- `pnpm --filter frontend build` OK

## Blocages

- `pnpm --filter backend prisma:migrate --name add_status_scheduler` KO
- Erreur observee: `P1002` lors de l'acquisition du lock advisory Postgres
  `pg_advisory_lock(72707369)`
- Contrainte respectee: aucune migration Prisma manuelle n'a ete creee
- `pnpm --filter backend build` reste bloque par l'erreur d'environnement
  `EMFILE: too many open files, watch`, deja observee sur d'autres US

## Dependances

- Peut reutiliser l'infra queue/job deja presente dans le projet
