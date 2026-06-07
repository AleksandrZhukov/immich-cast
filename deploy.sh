#!/usr/bin/env bash
set -euo pipefail

HOMELAB_HOST="${HOMELAB_HOST:-homelab@192.168.1.93}"
HOMELAB_PATH="${HOMELAB_PATH:-/home/homelab/immich-cast}"

REPO_ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$REPO_ROOT"

echo ">> Syncing immich-cast to $HOMELAB_HOST:$HOMELAB_PATH"
ssh "${HOMELAB_HOST}" "mkdir -p ${HOMELAB_PATH}"

rsync -az --delete \
  --exclude='node_modules' \
  --exclude='dist' \
  --exclude='data' \
  --exclude='.git' \
  --exclude='.DS_Store' \
  --exclude='*.log' \
  --exclude='*.tar' \
  --exclude='.env' \
  --exclude='.idea' \
  --exclude='.vscode' \
  ./src ./package.json ./bun.lock \
  ./tsconfig.json ./tsconfig.app.json ./tsconfig.node.json \
  ./docker-compose.yml \
  "${HOMELAB_HOST}:${HOMELAB_PATH}/"

if ! ssh "${HOMELAB_HOST}" "test -f ${HOMELAB_PATH}/.env"; then
  echo "!! No .env on homelab at ${HOMELAB_PATH}/.env"
  echo "   Copy it once with:"
  echo "     scp .env ${HOMELAB_HOST}:${HOMELAB_PATH}/.env"
  exit 1
fi

echo ">> Done. Stack is managed by Dockhand — point it at ${HOMELAB_PATH}/docker-compose.yml"
