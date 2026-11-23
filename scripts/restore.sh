#!/bin/sh
set -e
cd "$(dirname "$0")/.."
file=$1
if [ -z "$file" ]; then
  echo "Usage: scripts/restore.sh backups/abdinono-YYYYMMDD.sql"
  exit 1
fi
if command -v docker >/dev/null 2>&1 && docker compose ps db >/dev/null 2>&1; then
  docker compose exec -T db psql -U abdinono -d abdinono < "$file"
else
  psql "$DATABASE_URL" < "$file"
fi
echo "Restored $file"
