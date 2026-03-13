# US-008 - Page Support avec Sentry User Feedback

Statut: Implementee
Priorite: Moyenne
Zone: `apps/frontend`

## Suivi superviseur

- 2026-03-07: Route `/support` ajoutee dans `apps/frontend` avec formulaire frontend, etat de
  confirmation, gestion d erreur et envoi Sentry User Feedback via configuration `VITE_SENTRY_DSN`

## User story

En tant qu'utilisateur, je veux contacter le support depuis une page dediee afin de transmettre facilement un retour ou un probleme.

## Contexte

Le menu `Support` existe dans la navigation mais aucune page frontend n'est branchee. Le canal souhaite est `Sentry User Feedback`.

## Taches

- Ajouter une route `support`
- Creer une page support dans le layout dashboard
- Integrer un formulaire branche a `Sentry User Feedback`
- Prevoir un etat de confirmation apres envoi

## Criteres d'acceptation

- Le clic sur `Support` ouvre une vraie page
- L'utilisateur peut soumettre un retour depuis un formulaire
- Le formulaire envoie bien les donnees vers Sentry User Feedback
- Un message de succes ou d'erreur est affiche apres soumission

## Notes techniques

- Verifier la presence de la configuration Sentry cote frontend
- Si la capture contextuelle est disponible, joindre les metadonnees utiles sans exposer d'information sensible

## Dependances

- Aucune dependance forte
