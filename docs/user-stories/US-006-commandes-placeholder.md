# US-006 - Placeholder Commandes avant bascule Leads

Statut: Implementee
Priorite: Moyenne
Zone: `apps/frontend`

## Suivi superviseur

- 2026-03-07: Route `/orders` ajoutee dans `apps/frontend` avec un placeholder dashboard propre,
  puis renommee en route utilisateur `/leads` avec un message oriente usage et une mention de la
  future logique `Leads` basee sur les labels utilisateur

## User story

En tant qu'utilisateur, je veux une page `Commandes` explicite meme si la fonctionnalite n'est pas encore prete afin de comprendre ce qui arrive ensuite dans la roadmap.

## Contexte

Le menu `Commandes` existe dans la navigation mais aucune route frontend n'est encore branchee. La future evolution prevue est une page `Leads` basee sur les labels utilisateur.

## Taches

- Ajouter une vraie route `orders`
- Creer une page placeholder propre dans le layout dashboard
- Expliquer que la gestion des commandes/leads est en cours de developpement
- Mentionner la direction produit future: renommage en `Leads` et usage des labels utilisateur

## Criteres d'acceptation

- Le clic sur `Commandes` n'aboutit plus a une route inexistante
- La page affiche un message clair, assumant l'etat `en cours de dev`
- Le texte mentionne explicitement la future logique `Leads` basee sur les labels
- Le placeholder reste coherent avec le design dashboard

## Dependances

- Peut etre livre independamment
