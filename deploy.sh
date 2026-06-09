#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$REPO_ROOT"

if [ -f .env.deploy ]; then
  set -a
  # shellcheck disable=SC1091
  source .env.deploy
  set +a
fi

: "${HOMELAB_HOST:?Set HOMELAB_HOST (e.g. user@192.168.1.10) in .env.deploy or env}"
: "${HOMELAB_PATH:?Set HOMELAB_PATH (e.g. /home/user/immich-cast) in .env.deploy or env}"

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

echo ">> Recreating container"
ssh "${HOMELAB_HOST}" "cd ${HOMELAB_PATH} && docker compose up -d --force-recreate"

echo ">> Done."
