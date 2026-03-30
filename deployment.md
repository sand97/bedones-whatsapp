# Deployment Recap

## Objectif

Ce document résume l’état actuel du déploiement `bedones-whatsapp` pour pouvoir reprendre plus tard sans repartir de zéro.

## Architecture actuelle

- `backend` central:
  - déployé séparément sur un VPS
  - orchestre le stock de stacks
  - crée les VPS Hetzner via API
  - suit l’état de création Hetzner
  - déclenche GitHub Actions uniquement pour l’installation de la stack sur un VPS déjà prêt
- `frontend`:
  - déployé sur Cloudflare Workers
- `VPS dynamiques Hetzner`:
  - 1 VPS = plusieurs stacks
  - 1 stack = `postgres + redis + qdrant + cropper + whatsapp-agent + whatsapp-connector + caddy`
  - 2 ports TLS exposés par stack:
    - port agent
    - port connector
- `step-ca`:
  - déployé sur le VPS backend
  - utilisé pour les certificats mTLS backend <-> agent/connector

## Flux de provisioning actuel

### 1. Demande de capacité

- Le backend appelle `StackPoolService.provisionCapacity()`
- Il crée:
  - un `ProvisioningServer`
  - un `ProvisioningWorkflowRun`

### 2. Création du VPS Hetzner

- Le backend crée directement le VPS via `HetznerCloudService`
- Le backend stocke:
  - `providerServerId`
  - `hetznerActionId`
  - IPs si disponibles

### 3. Suivi de l’action Hetzner

- Le backend ne poll plus en mémoire avec un `setInterval`
- Le polling Hetzner passe maintenant par une queue Bull/Redis
- Service ajouté:
  - `apps/backend/src/stack-pool/stack-pool-hetzner-poll-scheduler.service.ts`
- Le traitement métier reste dans:
  - `apps/backend/src/stack-pool/stack-pool.service.ts`
  - méthode `processPendingHetznerInitializations()`

### 4. Déclenchement de la CI d’installation

- Quand le VPS Hetzner est prêt et qu’une `public_ipv4` est connue:
  - le backend déclenche `install-bedones-whatsapp-agent.yml`
- Le workflow GitHub n’achète plus le VPS
- Il installe seulement la stack sur un VPS existant

### 5. Fin du provisioning

- Le workflow GitHub appelle le callback backend:
  - `POST /stack-pool/workflows/callback`
- Le backend:
  - met à jour `ProvisioningWorkflowRun`
  - crée/met à jour les stacks
  - vérifie la connectivité
  - poursuit le flow de login/QR si nécessaire

## Workflows GitHub

### Installation

- Workflow principal:
  - `.github/workflows/install-bedones-whatsapp-agent.yml`
- Script principal:
  - `.github/scripts/install-bedones-whatsapp-agent-vps.sh`

Ce script:
- bootstrap `step-ca`
- émet les certificats
- rend la stack
- envoie les fichiers sur le VPS
- lance `docker compose up -d`
- fait les healthchecks
- appelle le backend en:
  - `running`
  - `success`
  - `failed` via `trap on_error`

### Compatibilité

- `.github/workflows/provision-bedones-whatsapp-agent.yml`
  - conservé comme alias de compatibilité
  - appelle le même script d’installation

### Release

- Workflow:
  - `.github/workflows/release-bedones-whatsapp-agent.yml`
- Script:
  - `.github/scripts/release-bedones-whatsapp-agent-vps.sh`

Le release continue à appeler le backend par callback.

## mTLS / step-ca

- `step-ca` est exposé actuellement en direct sur le serveur backend
- URL utilisée côté GitHub:
  - `STEP_CA_URL=https://<IP_BACKEND>:9898`
- `BACKEND_INTERNAL_URL`:
  - `https://<IP_BACKEND>:9443`

Le workflow d’installation:
- télécharge la racine `step-ca`
- émet les certs client/server
- prépare Caddy
- expose les ports TLS stack par stack

## Variables/backend importantes

### Backend `.env`

Variables clés:

- `HERZNET_API_KEY`
- `HERZNET_SSH_KEY_NAMES`
- `STACK_POOL_DEFAULT_SERVER_TYPE=cpx22`
- `STACK_POOL_DEFAULT_LOCATION=nbg1`
- `STACK_POOL_HETZNER_POLL_INTERVAL_MS=5000`
- `GITHUB_ACTIONS_REPOSITORY`
- `GITHUB_ACTIONS_TOKEN`
- `GITHUB_PROVISION_WORKFLOW_FILE=install-bedones-whatsapp-agent.yml`
- `GITHUB_RELEASE_WORKFLOW_FILE=release-bedones-whatsapp-agent.yml`
- `STACK_INFRA_CALLBACK_SECRET`
- `BACKEND_INTERNAL_URL`
- `BACKEND_MTLS_SERVER_CERT`
- `BACKEND_MTLS_SERVER_KEY`
- `BACKEND_MTLS_CLIENT_CERT`
- `BACKEND_MTLS_CLIENT_KEY`
- `STEP_CA_ROOT_CERT`

### GitHub secrets / vars

À garder:

- `STEP_CA_URL`
- `STEP_CA_FINGERPRINT`
- `STEP_CA_PROVISIONER_NAME`
- `STEP_CA_PROVISIONER_PASSWORD`
- `AGENT_INTERNAL_JWT_SECRET`
- `CONNECTOR_SECRET`
- `STACK_INFRA_CALLBACK_SECRET`
- `GHCR_READ_TOKEN`
- `WHATSAPP_AGENT_IMAGE`
- `WHATSAPP_CROPPER_IMAGE`
- `WHATSAPP_CONNECTOR_IMAGE`
- `BACKEND_URL`
- `BACKEND_INTERNAL_URL`

## Logs déjà ajoutés

Le backend log maintenant:

- création du record `ProvisioningServer`
- création du record `ProvisioningWorkflowRun`
- requête Hetzner brute
- réponse Hetzner brute
- état de polling Hetzner
- dispatch GitHub:
  - workflow
  - inputs envoyés
  - réponse GitHub

Le script d’installation log maintenant:

- URL callback backend
- URL backend interne
- URL `step-ca`
- payload des callbacks
- réponse HTTP du callback
- étapes de rendu, upload, `docker compose`, healthchecks

## Cas gérés

### VPS Hetzner supprimé manuellement

Un traitement a été ajouté localement pour ce cas:

- si Hetzner répond `404 resource_not_found` pendant l’initialisation
- le backend sort de la boucle
- le workflow est marqué en échec
- le serveur est marqué `RELEASED`

### Création Hetzner échouée

Un workflow sans `providerServerId` n’est plus repollé.

### Callback d’erreur CI

Le bug `jq --argjson` dans le script d’installation a été corrigé.

## Commits déjà poussés

Ces commits sont déjà sur `main`:

- `6b4e0d1` `Move Hetzner provisioning into backend`
- `ea90504` `Improve Hetzner provisioning diagnostics`
- `1d7b050` `Log Hetzner provisioning end to end`
- `69cb0e3` `Fix provisioning polling and install callback payload`

## Changements encore locaux au moment de l’écriture

Non commités/pas forcément poussés au moment où ce document est écrit:

- passage du polling Hetzner sur Bull/Redis
- arrêt propre si le VPS a été supprimé manuellement dans Hetzner
- réduction du bruit de log `pending_workflows=0`

Fichiers locaux concernés:

- `apps/backend/src/stack-pool/hetzner-cloud.service.ts`
- `apps/backend/src/stack-pool/stack-pool.module.ts`
- `apps/backend/src/stack-pool/stack-pool.service.ts`
- `apps/backend/src/stack-pool/stack-pool-hetzner-poll-scheduler.service.ts`

## Points à vérifier au redémarrage

### Backend

- vérifier que le backend tourne avec le bon commit
- vérifier que `REDIS_URL` est bien présent si on utilise la queue Bull
- vérifier que `HERZNET_API_KEY` est bien présent côté backend
- vérifier que `GITHUB_PROVISION_WORKFLOW_FILE=install-bedones-whatsapp-agent.yml`

### step-ca

- vérifier que `step-ca` répond
- vérifier que `STEP_CA_URL` côté GitHub pointe vers le bon port

### Provisioning

Sur un test manuel:

1. déclencher `/infra/stack-pool/provision`
2. vérifier les logs backend:
   - création record server/workflow
   - appel Hetzner
   - réponse Hetzner
   - polling de l’action
   - dispatch GitHub
3. vérifier le workflow GitHub d’installation
4. vérifier le callback de fin vers le backend

## Fichiers principaux à relire la prochaine fois

- [deployment.md](/Users/bruce/Documents/project/whatsapp-agent/deployment.md)
- [stack-pool.service.ts](/Users/bruce/Documents/project/whatsapp-agent/apps/backend/src/stack-pool/stack-pool.service.ts)
- [hetzner-cloud.service.ts](/Users/bruce/Documents/project/whatsapp-agent/apps/backend/src/stack-pool/hetzner-cloud.service.ts)
- [stack-pool-hetzner-poll-scheduler.service.ts](/Users/bruce/Documents/project/whatsapp-agent/apps/backend/src/stack-pool/stack-pool-hetzner-poll-scheduler.service.ts)
- [install-bedones-whatsapp-agent.yml](/Users/bruce/Documents/project/whatsapp-agent/.github/workflows/install-bedones-whatsapp-agent.yml)
- [install-bedones-whatsapp-agent-vps.sh](/Users/bruce/Documents/project/whatsapp-agent/.github/scripts/install-bedones-whatsapp-agent-vps.sh)

