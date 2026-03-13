# US-005 - Enrichir AgentOperation pour audit et stats

Statut: A faire
Priorite: Haute
Zone: `apps/backend`, `apps/whatsapp-agent`

## User story

En tant qu'equipe produit et support, je veux tracer le type de message traite et l'identifiant du message de reponse afin de fiabiliser les stats et de faciliter les audits.

## Contexte

Le modele `AgentOperation` stocke aujourd'hui le contenu du message, la reponse, les tokens et les outils utilises, mais pas le type de message entrant ni l'identifiant du message de reponse envoye.

## Taches

- Etendre le schema Prisma backend pour `AgentOperation`
- Ajouter au minimum un champ de type de message entrant
- Ajouter un champ optionnel pour l'ID du message de reponse envoye
- Propager ces nouvelles donnees dans le DTO `log-operation`
- Propager ces nouvelles donnees depuis `apps/whatsapp-agent`
- Couvrir les types cibles minimum: `text`, `image`, `link`, `voice`

## Criteres d'acceptation

- Chaque `AgentOperation` creee apres la mise en prod contient le type du message traite
- Si l'agent envoie une reponse, son identifiant WhatsApp est stocke
- Si aucune reponse n'est envoyee, le champ d'ID de reponse reste vide sans erreur
- Les stats futures peuvent differencier au moins texte et image
- Les audits peuvent retrouver quel message sortant a ete envoye par l'agent

## Notes techniques

- Prevoir une enum claire plutot qu'une string libre
- Si plusieurs messages de sortie peuvent etre emis dans certains cas, documenter si la V1 stocke le premier ID, le principal, ou une liste
- Cette US est un prealable utile au calcul fiable de certaines stats `handled`

## Dependances

- Peut etre developpee en parallele de `US-004`
