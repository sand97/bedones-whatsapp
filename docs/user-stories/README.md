# Backlog User Stories

Ce dossier regroupe les user stories a implementer apres la finalisation du coeur applicatif (tools,
catalogue, contexte IA).

## Ordre recommande

1. `US-001-dashboard-responsive-shell.md`
2. `US-002-dashboard-polish-and-actions.md`
3. `US-004-stats-backend-aggregation.md`
4. `US-005-agent-operation-audit.md`
5. `US-003-stats-page-frontend.md`
6. `US-006-commandes-placeholder.md`
7. `US-007-status-scheduler.md`
8. `US-008-support-sentry-feedback.md`
9. `US-009-faq-collapsible.md`
10. `US-010-navigation-cleanup.md`
11. `US-011-forfaits-page.md`

## Suivi superviseur

- 2026-03-07: `US-001-dashboard-responsive-shell` implementee dans `apps/frontend`
- 2026-03-07: `US-002-dashboard-polish-and-actions` implementee dans `apps/frontend`
- 2026-03-07: `US-003-stats-page-frontend` codee dans `apps/frontend`, build OK, en attente de la
  finalisation backend `US-004`
- 2026-03-07: `US-004-stats-backend-aggregation` codee dans `apps/backend`, type-check OK, test
  unitaire stats OK, migration Prisma bloquee par un advisory lock Postgres
- 2026-03-07: `US-006-commandes-placeholder` implementee dans `apps/frontend` avec une vraie route
  utilisateur `/leads` (ancien `/orders` redirige), un placeholder produit simplifie et une
  orientation claire vers le futur suivi des `Leads`
- 2026-03-07: `US-007-status-scheduler` codee dans `apps/frontend` et `apps/backend`, frontend build
  OK, backend type-check OK, migration Prisma bloquee par le meme advisory lock Postgres (`P1002`)
- 2026-03-07: `US-008-support-sentry-feedback` implementee dans `apps/frontend` avec une route
  `/support`, un formulaire dashboard et un envoi frontend vers Sentry User Feedback via
  `VITE_SENTRY_DSN`
- 2026-03-07: `US-009-faq-collapsible` implementee dans `apps/frontend` avec une route `/faq` et un
  contenu structure via `Collapse` Ant Design
- 2026-03-07: `US-010-navigation-cleanup` implementee dans `apps/frontend` avec ajout des routes
  manquantes, suppression du lien invalide `/help` et navigation nettoyee (`Support` deplace dans
  `Aides`, `Forfaits` ajoute dans `General`)
- 2026-03-08: `US-011-forfaits-page` mise a jour dans `apps/frontend` avec une route anglaise
  `/pricing`, des cartes tarifaires revues, une duree selectable (1, 6, 12 mois) et integration
  des moyens de paiement visibles
- 2026-03-08: `US-011-forfaits-page` ajustee avec un header de paiement simplifie, un plan Free
  sans bouton d'action, la mention explicite de l'absence de notes vocales en Free et une promo
  affichee seulement sur les plans payants non actifs
- 2026-03-08: `US-011-forfaits-page` epuree une nouvelle fois avec suppression de la pastille
  `Plan actuel` dans le header de `/pricing`
- 2026-03-08: `US-011-forfaits-page` entierement redesignée dans `apps/frontend` avec une mise en
  page pricing type SaaS a l'interieur du shell dashboard standard, un hero sombre, des effets
  rectangulaires decoratifs et une comparaison des plans fondee sur les fonctions produit deja
  presentes dans `apps/whatsapp-agent`
- 2026-03-08: `US-011-forfaits-page` reprise de zero apres comparaison par captures MCP avec
  `vercel.com/pricing`, pour revenir a une composition plus simple: fond clair quadrille, hero
  centre, controle de duree compact, plans en 3 colonnes et suppression du header de page
- 2026-03-08: `US-011-forfaits-page` ajustee une nouvelle fois avec suppression du hero textuel,
  badge `Populaire`, Free harmonise en `0€ / 7 jours`, descriptions plus courtes et largeur utile
  etendue pour reduire l'effet de colonnes comprimees
- 2026-03-08: `US-011-forfaits-page` reprise encore sur la geometrie apres revue MCP, avec moins
  de padding lateral, davantage de largeur utile dans chaque colonne et un alignement vertical plus
  propre des descriptions et des prix
- 2026-03-08: `US-011-forfaits-page` finalisee visuellement avec une grille de fond plus calme, un
  plan `Pro` pose sur fond blanc et des features compactees pour limiter les retours a la ligne
- 2026-03-08: `US-011-forfaits-page` nettoyee une derniere fois avec suppression du quadrillage
  double, lignes decoratives bornees a la section des cartes et shell sans arrondi sur `/pricing`
- 2026-03-08: `US-011-forfaits-page` ajustee cote contenu avec suppression de la restriction
  "notes vocales" en `Free` et ajout de cette fonctionnalite au plan `Pro`
- 2026-03-08: `US-011-forfaits-page` polie une derniere fois avec hover du `Segmented` garde en
  forme de pilule et suppression de la ligne double en haut de la section des cartes
- 2026-03-08: `US-011-forfaits-page` finalisee sur le detail du badge `Populaire`, maintenant
  accroche en haut de la colonne `Pro` avec un arrondi inspire de la reference Vercel
- 2026-03-08: `US-011-forfaits-page` peaufinee sur le badge `Populaire` avec une taille reduite,
  plus proche de la reference Vercel
- 2026-03-08: `US-011-forfaits-page` corrigee encore sur le badge `Populaire`, maintenant place
  au-dessus de la carte `Pro` avec un seul arrondi superieur droit
- 2026-03-08: `US-011-forfaits-page` rapprochee du systeme de grille Vercel avec un bloc superieur
  quadrille et des cartes pricing laissees propres sans quadrillage interne
- 2026-03-08: `US-011-forfaits-page` corrigee encore sur la geometrie de grille apres revue MCP,
  avec un bloc superieur quadrille plus proche du champ Vercel et une zone cartes gardee propre
- 2026-03-08: `US-011-forfaits-page` ajustee une nouvelle fois avec un quadrillage a pas regulier
  sur le bloc superieur pour eliminer les espacements de lignes incoherents
- 2026-03-08: `US-011-forfaits-page` compacte encore `/pricing` avec le bloc paiements deplace en
  bas, moins d'espace perdu au-dessus des offres et un quadrillage reconstruit sans doubles
  bordures
- 2026-03-08: `US-011-forfaits-page` affine encore la hierarchie de `/pricing` avec des montants
  ramenes au meme gabarit que les titres de plan
- 2026-03-08: `US-011-forfaits-page` finalise encore `/pricing` avec la grille poussee jusqu'en
  haut, un `Segmented` recentre, des montants legerement agrandis et la suppression de l'ombre du
  bouton menu mobile
- 2026-03-08: `US-011-forfaits-page` ajuste aussi le shell desktop pour supprimer l'espace haut
  residuel sur `/pricing` et enlever le trait horizontal colle au sommet de l'ecran
- 2026-03-08: `US-011-forfaits-page` borne desormais la largeur utile de `/pricing` pour eviter
  que les cartes s'etirent excessivement sur les tres grands ecrans
- 2026-03-08: `US-011-forfaits-page` corrige la borne de largeur en ne limitant plus tout le
  conteneur `/pricing`, mais seulement la grille des cartes pour conserver le champ superieur
  pleine largeur
- 2026-03-08: `US-011-forfaits-page` revalidee aux largeurs desktop usuelles (1440-1500) et
  corrigee structurellement en grille pleine largeur avec `min-w-0` sur les cartes pour eviter
  qu'un contenu interne ne force un elargissement parasite des colonnes
- 2026-03-08: `US-011-forfaits-page` passe enfin sur une vraie logique responsive de grille
  `auto-fit/minmax`, validee visuellement sur 1024, 1200, 1440, 1500, 1680, 768 et mobile
- 2026-03-08: `US-011-forfaits-page` restauree apres regression avec retour au layout pricing
  valide par capture MCP: champ quadrille en tete, grille 3 colonnes sur desktop large, badge
  `Populaire` accroche au plan `Pro`, CTA payants verts/noirs et bloc paiements repoussé en bas
- 2026-03-08: `US-011-forfaits-page` alignee sur une nouvelle passe de finition visuelle avec
  suppression des doubles bordures, bloc quadrille fixe a `150px` et `Segmented` pricing
  rebranche sur le style de `stats`
- 2026-03-08: `US-011-forfaits-page` recalee encore sur `/pricing` avec badge `Populaire`
  remis sur l'arete haute du plan `Pro` et quadrillage du bloc superieur aligne pour ne plus
  produire de double trait visible a la jonction avec les cartes
- Verification associee: `pnpm --filter frontend build` OK
- Verification associee: `pnpm --filter frontend type-check` OK
- Verification associee: `pnpm --filter backend prisma:generate` OK
- Verification associee: `pnpm --filter backend type-check` OK
- Verification associee: `pnpm --filter frontend type-check` OK
- Verification associee:
  `pnpm --filter backend exec jest stats.utils.spec.ts --runInBand --watchman=false` OK
- Blocage en cours: `pnpm --filter backend prisma:migrate --name add_user_daily_stats_analytics`
  echoue avec `P1002` (timeout `pg_advisory_lock`)
- Blocage en cours: `pnpm --filter backend prisma:migrate --name add_status_scheduler` echoue avec
  `P1002` (timeout `pg_advisory_lock`)
- Note de suivi: `pnpm --filter frontend lint` reste en echec pour une dette existante hors scope,
  notamment `apps/frontend/app/routes/auth.login.tsx:55` (`NodeJS` non defini) et plusieurs warnings
  historiques
- Note de suivi: `pnpm --filter backend build` / `pnpm --filter backend exec nest build` tombent sur
  `EMFILE: too many open files, watch` dans cet environnement, mais le type-check passe

## Notes de cadrage

- La page `stats` sera reconstruite depuis zero avec une reference Figma accessible via MCP:
  `https://www.figma.com/design/VSRt39Ru23MEysYcvct3F6/Whatsapp-Manager-Agent--Copy-?node-id=355-536&t=xQg5h90B6A3KH96M-4`
- Le responsive du shell dashboard doit s'inspirer des transitions du layout de reference:
  `/Users/bruce/Documents/project/portail-captif/src/components/layout/app-shell.tsx`
- Recommandation pour les stats journalieres: stocker le jour en format ISO `YYYY-MM-DD` en base et
  laisser le frontend formater l'affichage. Cela evite les problemes de tri lies a `DD-MM-YYYY`.
- Les US backend stats et audit doivent preceder la version finale de la nouvelle page `stats`.
