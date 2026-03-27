# Plan Herzner pour Bedones WhatsApp

## Objectif

Préparer un provisioning piloté par le backend pour des VPS Hetzner qui hébergent des stacks `connector + whatsapp-agent`, pendant que le backend central reste déployé séparément. Le backend ne parle pas directement à Hetzner dans cette itération: il déclenche des `workflow_dispatch` GitHub sur un self-hosted runner, puis reçoit un callback de fin de déploiement.

## Découpage cible

- `backend` central:
  - onboarding
  - facturation
  - orchestration des stacks
  - suivi d’état des agents
- `connector node`:
  - `whatsapp-connector`
  - `whatsapp-agent`
  - `redis`
  - `qdrant`
  - une `DATABASE_URL` dédiée par stack, portée par un Postgres externe ou mutualisé

## Contrainte Hetzner à retenir

- Un serveur Hetzner sans IP publique doit impérativement être sur un réseau privé, mais il n’a alors plus de sortie Internet publique.
- Pour cette phase, le chemin réaliste est:
  - VPS avec IP publique pour bootstrap, `docker pull` et SSH
  - attachement simultané au réseau privé Hetzner pour les communications backend ↔ connector
  - exposition des ports applicatifs uniquement sur le réseau privé ou derrière des règles de firewall strictes

## Variables backend à prévoir

Ces variables vivent dans le backend central pour piloter la capacité et les dispatchs GitHub.

```env
STACK_POOL_PROVISION_ON_BOOT=true
STACK_POOL_BOOTSTRAP_VPS_COUNT=2
STACK_POOL_MIN_FREE_STACKS=4
STACK_POOL_DEFAULT_STACKS_PER_VPS=2
STACK_POOL_DEFAULT_SERVER_TYPE=CPX21
STACK_POOL_DEFAULT_LOCATION=fsn1
STACK_POOL_SERVER_NAME_PREFIX=bedones-wa
GITHUB_ACTIONS_REPOSITORY=owner/whatsapp-agent
GITHUB_ACTIONS_TOKEN=
GITHUB_ACTIONS_REF=main
GITHUB_PROVISION_WORKFLOW_FILE=provision-bedones-whatsapp-agent.yml
GITHUB_RELEASE_WORKFLOW_FILE=release-bedones-whatsapp-agent.yml
STACK_INFRA_CALLBACK_SECRET=
```

## Secrets runner / workflows

Ces valeurs vivent côté GitHub Actions / self-hosted runner:

```env
HERZNET_API_KEY=
HERZNET_PRIVATE_NETWORK_ID=
HERZNET_SSH_KEY_NAMES=
STACK_INFRA_CALLBACK_SECRET=
WHATSAPP_AGENT_DATABASE_URL_TEMPLATE=postgresql://.../whatsapp_agent?schema=__STACK_SCHEMA__
WHATSAPP_AGENT_IMAGE=ghcr.io/.../bedones-whatsapp-agent:main
WHATSAPP_CONNECTOR_IMAGE=ghcr.io/.../bedones-whatsapp-connector:main
```

## Modèle de données retenu

Le modèle `WhatsAppAgent` reste le point d’entrée applicatif, mais il sert aussi d’inventaire de stack réservable. On ajoute:

- `ProvisioningServer`
  - état du VPS Hetzner
  - IP publique / privée
  - type, location, nombre de stacks planifiées
- `ProvisioningWorkflowRun`
  - type `PROVISION_CAPACITY` ou `RELEASE_CAPACITY`
  - mapping avec le `workflow_dispatch` GitHub
  - progression, étape courante, callback vers le backend
- `WhatsAppAgent`
  - champs `serverId`, `stackSlot`, `stackLabel`
  - `assignmentStatus` (`FREE`, `RESERVED`, `ALLOCATED`, ...)
  - `reservationExpiresAt`, `allocatedAt`, `releasedAt`

## Workflow backend retenu

1. Le backend démarre et vérifie le stock libre.
2. Si le stock libre est sous le seuil, il déclenche `provision-bedones-whatsapp-agent.yml`.
3. Le workflow crée un VPS Hetzner, l’attache au réseau privé, rend la stack depuis `.github/stack-templates/bedones-whatsapp-agent/stack.template.yml` et la déploie.
4. Le workflow appelle `POST /stack-pool/workflows/callback`.
5. Le backend enregistre le VPS, crée les stacks libres, puis vérifie `/health` sur `whatsapp-agent` et `whatsapp-connector`.
6. Si un utilisateur attendait déjà, le backend lui affecte la première stack disponible et démarre explicitement le connector.

## Réseau privé

- Le backend central doit parler au `connector` et au `whatsapp-agent` via l’IP privée Hetzner.
- Seuls les ports `connector` et `agent` doivent être publiés côté hôte.
- `redis` et `qdrant` restent internes à la stack.
- Les firewalls Hetzner doivent limiter les entrées au réseau privé et aux IPs d’admin.

## Politique de placement

- Un VPS = plusieurs stacks clients.
- Le backend réserve une stack libre existante au moment où l’utilisateur clique sur suivant.
- Juste après une réservation, le backend déclenche de nouveau le provisioning si le stock libre redescend sous `STACK_POOL_MIN_FREE_STACKS`.
- Garder le type de machine configurable via `STACK_POOL_DEFAULT_SERVER_TYPE`.

## Mise à jour des connectors plus tard

Le point sensible est la session WhatsApp. La stratégie la plus sûre:

1. Stocker les sessions sur volume persistant dédié par stack.
2. Déployer une nouvelle image sur la stack existante, jamais sur un nouveau volume.
3. Faire une mise à jour progressive service par service.
4. Vérifier `/health` puis l’état `ready` avant de considérer la mise à jour réussie.
5. Prévoir un rollback immédiat sur le tag précédent si la session n’est pas restaurée.

## Étapes suivantes

1. Ajouter la page pricing auth-friendly si `existing user && crédits épuisés`.
2. Remplacer la diffusion QR “fallback broadcast” par un routage strict par `connectorInstanceId` pour toutes les stacks.
3. Ajouter un release intelligent qui supprime aussi le VPS si toutes ses stacks sont libres.
4. Brancher la télémétrie GitHub Actions plus finement si on veut afficher plus que 3 étapes métier côté frontend.
5. Ajouter la rotation de tags d’images côté backend pour les mises à jour contrôlées.
