# US-001 - Dashboard responsive shell

Statut: Termine
Priorite: Haute
Zone: `apps/frontend`

## User story

En tant qu'utilisateur mobile ou tablette, je veux naviguer dans le dashboard sans casse visuelle afin de pouvoir utiliser l'application hors desktop.

## Contexte

Le shell actuel du dashboard repose sur un `Sider` fixe desktop-first avec un `margin-left` constant. Il n'est pas responsive. La reference de comportement attendue est le layout `/Users/bruce/Documents/project/portail-captif/src/components/layout/app-shell.tsx`, surtout pour les transitions et le comportement mobile. Le design interne de nos cartes et composants ne doit pas etre refait.

## Taches

- Ajouter une gestion mobile/tablette/desktop dans `dashboard-layout.tsx`
- Transformer la sidebar en panneau off-canvas sur mobile
- Conserver le mode collapse sur desktop
- Adapter `DashboardHeader.tsx` pour piloter ouverture mobile et collapse desktop
- Revoir les marges du contenu principal pour supprimer le `margin-left` fixe sur petit ecran
- Reprendre les transitions du projet de reference sans recopier son design

## Criteres d'acceptation

- Sur mobile, la sidebar est fermee par defaut et s'ouvre via le bouton du header
- Sur mobile, l'ouverture/fermeture utilise une transition fluide de type slide
- Sur desktop, le comportement collapse existant reste disponible
- Le contenu principal reste lisible entre `320px` et desktop large
- Les cartes internes conservent leur design actuel
- Aucun debordement horizontal ne subsiste sur le dashboard et les pages filles du layout

## Notes techniques

- Reutiliser le `LayoutContext` existant si possible, sinon l'etendre avec un etat `mobileMenuOpen`
- Eviter de dupliquer les composants de navigation
- Prevoir la fermeture automatique du menu mobile lors d'un changement de route

## Dependances

- Aucune
- Cette US doit preceder les ajustements visuels du dashboard

## Suivi superviseur

- Date: 2026-03-07
- Etat: Shell dashboard responsive implemente
- Resultat: sidebar off-canvas mobile, collapse desktop conserve, fermeture auto du menu mobile au changement de route
- Complements livres: header adapte au contexte mobile/desktop et suppression du `margin-left` fixe sur petit ecran
- Verification: `pnpm --filter frontend build` OK
