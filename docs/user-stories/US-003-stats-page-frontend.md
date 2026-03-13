# US-003 - Refonte frontend de la page stats

Statut: En cours
Priorite: Haute
Zone: `apps/frontend`

## User story

En tant qu'utilisateur, je veux une page `stats` claire et moderne pour consulter les volumes de conversations et de messages sur les vues semaine, mois et annee.

## Contexte

La page `apps/frontend/app/routes/stats.tsx` actuelle est un placeholder et doit etre reprise depuis zero. La reference visuelle cible est le node Figma `355:536`, accessible via MCP, mais le contenu fonctionnel doit etre adapte pour afficher deux statistiques: `Conversations` et `Messages`.

Reference design:
`https://www.figma.com/design/VSRt39Ru23MEysYcvct3F6/Whatsapp-Manager-Agent--Copy-?node-id=355-536&t=xQg5h90B6A3KH96M-4`

## Taches

- Refaire la page `stats` sur une base propre
- Creer un bloc de visualisation pour `Messages`
- Creer un bloc de visualisation pour `Conversations`
- Ajouter un select de periode et un switch de granularite `Semaine / Mois / Annee`
- Utiliser `Recharts` avec un chart custom pour se rapprocher du design cible
- Prevoir les etats `loading`, `empty` et `error`
- Brancher la page sur l'API stats une fois `US-004` livree

## Criteres d'acceptation

- La page n'affiche plus les cartes placeholder actuelles
- Les deux statistiques `Messages` et `Conversations` sont visibles sans ambiguite
- Le design reprend la structure Figma: titre, switch, select, valeur principale, delta et chart principal
- Le composant chart est responsive
- Le rendu mobile reste lisible sans couper les axes ni les tooltips
- La page supporte au minimum les etats `loading`, `empty`, `error`, `success`

## Notes techniques

- La reference Figma sert de base visuelle; les labels de periode doivent suivre le besoin fonctionnel reel: `Semaine`, `Mois`, `Annee`
- La page doit etre pensee pour exploiter des series journalieres renvoyees par le backend
- Les aggregations semaine/mois/annee peuvent etre calculees cote frontend a partir des donnees journalieres de l'annee en cours

## Dependances

- Dependance forte sur `US-004`
- Dependance partielle sur `US-005` pour fiabiliser certaines metriques futures

## Progression superviseur

- 2026-03-07: la route `apps/frontend/app/routes/stats.tsx` a ete reimplementee completement
- 2026-03-07: la page affiche des blocs distincts `Messages` et `Conversations`
- 2026-03-07: le switch `Semaine / Mois / Annee` et le select de periode sont implementes
- 2026-03-07: les charts `Recharts` custom et responsives sont branches sur l'API `GET /users/me/stats/analytics`
- 2026-03-07: les etats `loading`, `empty`, `error` et `success` sont geres
- 2026-03-07: verification OK avec `pnpm --filter frontend build`
- Reste a clore: validation fonctionnelle de bout en bout apres application de la migration backend de `US-004`
