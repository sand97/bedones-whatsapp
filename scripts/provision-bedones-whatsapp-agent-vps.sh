#!/usr/bin/env bash

set -euo pipefail

WORKFLOW_RECORD_ID="${WORKFLOW_RECORD_ID:?WORKFLOW_RECORD_ID is required}"
SERVER_RECORD_ID="${SERVER_RECORD_ID:?SERVER_RECORD_ID is required}"
SERVER_NAME="${SERVER_NAME:?SERVER_NAME is required}"
SERVER_TYPE="${SERVER_TYPE:-CPX21}"
SERVER_LOCATION="${SERVER_LOCATION:-fsn1}"
STACKS_PER_VPS="${STACKS_PER_VPS:-2}"
BACKEND_CALLBACK_URL="${BACKEND_CALLBACK_URL:?BACKEND_CALLBACK_URL is required}"
STACK_INFRA_CALLBACK_SECRET="${STACK_INFRA_CALLBACK_SECRET:-}"
HERZNET_API_KEY="${HERZNET_API_KEY:?HERZNET_API_KEY is required}"
HERZNET_PRIVATE_NETWORK_ID="${HERZNET_PRIVATE_NETWORK_ID:-}"
HERZNET_SSH_KEY_NAMES="${HERZNET_SSH_KEY_NAMES:-}"
WHATSAPP_AUTOSTART_TARGET_SLOT="${WHATSAPP_AUTOSTART_TARGET_SLOT:-0}"
PRIVATE_NETWORK_NAME="${PRIVATE_NETWORK_NAME:-bedones_private}"
RENDERED_STACK_FILE="${RUNNER_TEMP:-/tmp}/bedones-whatsapp-agent-stack.yml"
STACKS_JSON_FILE="${RUNNER_TEMP:-/tmp}/bedones-whatsapp-agent-stacks.json"

api_url="https://api.hetzner.cloud/v1"
job_total=3

callback() {
  local status="$1"
  local stage="$2"
  local completed_jobs="$3"
  local extra_json="${4:-{}}"

  jq -n \
    --arg workflowId "${WORKFLOW_RECORD_ID}" \
    --arg status "${status}" \
    --arg stage "${stage}" \
    --argjson totalJobs "${job_total}" \
    --argjson completedJobs "${completed_jobs}" \
    --argjson extra "${extra_json}" \
    '{
      workflowId: $workflowId,
      status: $status,
      stage: $stage,
      totalJobs: $totalJobs,
      completedJobs: $completedJobs
    } + $extra' \
    | curl -fsS -X POST "${BACKEND_CALLBACK_URL}" \
        -H "Content-Type: application/json" \
        -H "x-infra-callback-secret: ${STACK_INFRA_CALLBACK_SECRET}" \
        --data-binary @-
}

poll_action() {
  local action_id="$1"
  while true; do
    local action_json
    action_json="$(
      curl -fsS \
        -H "Authorization: Bearer ${HERZNET_API_KEY}" \
        "${api_url}/actions/${action_id}"
    )"
    local action_status
    action_status="$(echo "${action_json}" | jq -r '.action.status')"
    local progress
    progress="$(echo "${action_json}" | jq -r '.action.progress // 0')"

    if [[ "${action_status}" == "success" ]]; then
      break
    fi

    if [[ "${action_status}" == "error" ]]; then
      echo "${action_json}" >&2
      exit 1
    fi

    sleep 5
    echo "Waiting for Hetzner action ${action_id} (${progress}%)"
  done
}

extract_server_info() {
  local server_id="$1"
  curl -fsS \
    -H "Authorization: Bearer ${HERZNET_API_KEY}" \
    "${api_url}/servers/${server_id}"
}

create_payload="$(
  jq -n \
    --arg image "docker-ce" \
    --arg location "${SERVER_LOCATION}" \
    --arg name "${SERVER_NAME}" \
    --arg serverType "${SERVER_TYPE}" \
    --arg networkId "${HERZNET_PRIVATE_NETWORK_ID}" \
    --arg sshKeys "${HERZNET_SSH_KEY_NAMES}" \
    '{
      image: $image,
      location: $location,
      name: $name,
      server_type: $serverType,
      public_net: {
        enable_ipv4: true,
        enable_ipv6: true
      },
      labels: {
        app: "bedones-whatsapp-agent",
        managed_by: "github-actions"
      }
    }
    + (if $networkId != "" then { networks: [($networkId | tonumber)] } else {} end)
    + (if $sshKeys != "" then { ssh_keys: ($sshKeys | split(",") | map(select(length > 0))) } else {} end)'
)"

callback "running" "SERVER_INITIALIZING" 0

create_response="$(
  curl -fsS -X POST \
    -H "Authorization: Bearer ${HERZNET_API_KEY}" \
    -H "Content-Type: application/json" \
    "${api_url}/servers" \
    -d "${create_payload}"
)"

server_id="$(echo "${create_response}" | jq -r '.server.id')"
action_id="$(echo "${create_response}" | jq -r '.action.id')"

poll_action "${action_id}"

server_json="$(extract_server_info "${server_id}")"
public_ipv4="$(echo "${server_json}" | jq -r '.server.public_net.ipv4.ip')"
private_ipv4="$(echo "${server_json}" | jq -r '.server.private_net[0].ip // empty')"

callback "running" "SERVER_INITIALIZING" 1 "$(jq -n \
  --arg githubRunId "${GITHUB_RUN_ID:-}" \
  --arg githubRunUrl "${GITHUB_SERVER_URL:-https://github.com}/${GITHUB_REPOSITORY:-}/${GITHUB_RUN_ID:-}" \
  --arg providerServerId "${server_id}" \
  --arg publicIpv4 "${public_ipv4}" \
  --arg privateIpv4 "${private_ipv4}" \
  --arg name "${SERVER_NAME}" \
  --arg serverType "${SERVER_TYPE}" \
  --arg location "${SERVER_LOCATION}" \
  '{ githubRunId: $githubRunId, githubRunUrl: $githubRunUrl, server: { providerServerId: $providerServerId, publicIpv4: $publicIpv4, privateIpv4: $privateIpv4, name: $name, serverType: $serverType, location: $location } }')"

STACK_PREFIX="${SERVER_NAME}" OUTPUT_FILE="${RENDERED_STACK_FILE}" \
PRIVATE_NETWORK_NAME="${PRIVATE_NETWORK_NAME}" \
WHATSAPP_AUTOSTART_TARGET_SLOT="${WHATSAPP_AUTOSTART_TARGET_SLOT}" \
STACKS_PER_VPS="${STACKS_PER_VPS}" \
bash scripts/render-bedones-whatsapp-agent-stack.sh

callback "running" "STACK_INSTALLING" 1

mkdir -p "${HOME}/.ssh"
ssh_opts=(-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null)

scp "${ssh_opts[@]}" "${RENDERED_STACK_FILE}" "root@${public_ipv4}:/root/bedones-whatsapp-agent.stack.yml"

ssh "${ssh_opts[@]}" "root@${public_ipv4}" "
  set -euo pipefail
  mkdir -p /root/bedones-whatsapp-agent
  mv /root/bedones-whatsapp-agent.stack.yml /root/bedones-whatsapp-agent/stack.yml
  if command -v docker >/dev/null 2>&1; then
    docker network inspect ${PRIVATE_NETWORK_NAME} >/dev/null 2>&1 || docker network create ${PRIVATE_NETWORK_NAME}
  fi
  if [ -n \"${GHCR_USERNAME:-}\" ] && [ -n \"${GHCR_READ_TOKEN:-}\" ]; then
    echo \"${GHCR_READ_TOKEN}\" | docker login ghcr.io -u \"${GHCR_USERNAME}\" --password-stdin
  fi
  docker compose -f /root/bedones-whatsapp-agent/stack.yml up -d
"

callback "running" "STACK_STARTING" 2

stack_entries=()
for slot in $(seq 1 "${STACKS_PER_VPS}"); do
  agent_port=$((3100 + slot))
  connector_port=$((3200 + slot))

  ssh "${ssh_opts[@]}" "root@${public_ipv4}" "curl -fsS http://127.0.0.1:${agent_port}/health >/dev/null"
  ssh "${ssh_opts[@]}" "root@${public_ipv4}" "curl -fsS http://127.0.0.1:${connector_port}/health >/dev/null"

  stack_entries+=("{\"stackSlot\":${slot},\"stackLabel\":\"${SERVER_NAME}-slot-${slot}\",\"agentPort\":${agent_port},\"connectorPort\":${connector_port},\"privateIpv4\":\"${private_ipv4}\"}")
done

printf '[%s]\n' "$(IFS=,; echo "${stack_entries[*]}")" > "${STACKS_JSON_FILE}"

callback "success" "STACK_STARTING" 3 "$(jq -n \
  --arg githubRunId "${GITHUB_RUN_ID:-}" \
  --arg githubRunUrl "${GITHUB_SERVER_URL:-https://github.com}/${GITHUB_REPOSITORY:-}/${GITHUB_RUN_ID:-}" \
  --arg providerServerId "${server_id}" \
  --arg publicIpv4 "${public_ipv4}" \
  --arg privateIpv4 "${private_ipv4}" \
  --arg name "${SERVER_NAME}" \
  --arg serverType "${SERVER_TYPE}" \
  --arg location "${SERVER_LOCATION}" \
  --slurpfile stacks "${STACKS_JSON_FILE}" \
  '{ githubRunId: $githubRunId, githubRunUrl: $githubRunUrl, server: { providerServerId: $providerServerId, publicIpv4: $publicIpv4, privateIpv4: $privateIpv4, name: $name, serverType: $serverType, location: $location }, stacks: $stacks[0] }')"
