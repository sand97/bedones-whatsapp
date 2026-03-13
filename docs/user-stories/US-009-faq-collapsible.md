# US-009 - Page FAQ avec Collapsible Ant Design

Statut: Implementee
Priorite: Moyenne
Zone: `apps/frontend`

## Suivi superviseur

- 2026-03-07: Route `/faq` ajoutee dans `apps/frontend` avec contenu structure via `Collapse` Ant
  Design pour un enrichissement simple et une lecture correcte sur mobile et desktop

## User story

En tant qu'utilisateur, je veux consulter une FAQ claire afin de trouver rapidement les reponses aux questions frequentes sans contacter le support.

## Contexte

Le menu `FAQ` existe mais aucune route frontend n'est branchee. Le composant souhaite pour la V1 est le `Collapsible` d'Ant Design.

## Taches

- Ajouter une route `faq`
- Creer la page FAQ
- Utiliser le composant `Collapse` ou equivalent Ant Design
- Structurer une premiere base de questions/reponses produit

## Criteres d'acceptation

- Le clic sur `FAQ` ouvre une vraie page
- Les questions sont presentees en sections repliables
- La page est lisible sur mobile et desktop
- Le contenu peut etre enrichi facilement sans refaire la structure

## Dependances

- Aucune dependance forte
