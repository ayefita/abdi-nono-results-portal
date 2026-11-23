#!/bin/sh
set -e
cd "$(dirname "$0")/.."
mkdir -p backups
stamp=$(date +%Y%m%d-%H%M%S)
out="backups/abdinono-$stamp.sql"
if command -v docker >/dev/null 2>&1 && docker compose ps db >/dev/null 2>&1; then
  docker compose exec -T db pg_dump -U abdinono abdinono > "$out"
else
  pg_dump "$DATABASE_URL" > "$out"
fi
echo "Wrote $out"
