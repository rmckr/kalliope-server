#!/usr/bin/env bash
set -euo pipefail

# Deploys the latest committed version of KalliopeServer on the host.
# Invoked by the Deploy workflow over SSH, or run manually from anywhere
# inside a checkout: ./scripts/deploy.sh
#
# Anything deployment-specific (checkout path, SSH host) lives in the
# caller (CI variables), not here.

cd "$(dirname "${BASH_SOURCE[0]}")/.."

if [[ ! -f .env ]]; then
  echo "deploy: no .env found in $(pwd) — copy .env.example and fill it in first." >&2
  exit 1
fi

echo "deploy: pulling latest changes in $(pwd)..."
git pull --ff-only

echo "deploy: rebuilding containers..."
docker compose up -d --build

echo "deploy: done."
