#!/usr/bin/env bash
# Runs the BugTrack backend locally with the credentials from .env.
# Must be started from backend/ — application.yml loads ../database/schema.sql.
set -euo pipefail

cd "$(dirname "$0")"

if [[ ! -f .env ]]; then
  echo "Error: no se encontró backend/.env." >&2
  echo "Copiá el ejemplo y completalo con tu contraseña:" >&2
  echo "  cp .env.example .env" >&2
  exit 1
fi

# Maven may not be on PATH in macOS shells.
export PATH="$HOME/apps/apache-maven-3.9.9/bin:$PATH"

set -a
# shellcheck disable=SC1091
source .env
set +a

exec mvn spring-boot:run
