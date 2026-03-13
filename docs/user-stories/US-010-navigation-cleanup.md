# US-010 - Nettoyage de la navigation configuration

Statut: Implementee
Priorite: Moyenne
Zone: `apps/frontend`

## Suivi superviseur

- 2026-03-07: Navigation dashboard auditee et nettoyee dans `apps/frontend`: ajout des routes
  manquantes, suppression du lien invalide `/help`, `Support` regroupe dans `Aides` et `Forfaits`
  ajoute dans `General`

## User story

En tant qu'utilisateur, je veux une navigation claire et sans entrees redondantes afin de comprendre immediatement ou configurer mon compte.

## Contexte

Le besoin exprime est de supprimer le menu `Configuration` situe dans la zone des configurations. Le code actuel expose deja un groupe `Configuration` dans la sidebar, sans route explicite associee a un item `Configuration`. Cette US sert a nettoyer ce point lors de la mise a jour de navigation.

## Taches

- Auditer la navigation visible apres ajout des nouvelles pages
- Supprimer toute entree redondante `Configuration` si elle apparait dans la navigation ou dans les sous-menus
- Garantir que seules les entrees utiles restent visibles
- Verifier que tous les liens du menu pointent vers une route existante

## Criteres d'acceptation

- Aucune entree de menu `Configuration` redondante ne subsiste
- Les groupes et items du dashboard restent coherents apres ajout des nouvelles pages
- Aucun item de navigation ne pointe vers une route inexistante

## Notes techniques

- Cette US devra etre revalidee visuellement au moment de l'implementation car le besoin d'origine est plus fonctionnel que technique

## Dependances

- Recommande apres ajout des pages `Support`, `FAQ`, `Commandes` et `Forfaits`
