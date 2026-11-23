#!/bin/sh
set -e
cd "$(dirname "$0")/.."
if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
  docker compose up -d --build
  echo "Ifa Boru is starting in Docker."
else
  echo "Docker was not found. Using the Postgres database in DATABASE_URL."
  npx prisma migrate deploy
  node --env-file=.env --import tsx prisma/seed.ts
  npm run build
  npm start
fi
echo
echo "On this computer: http://localhost:43123"
echo "On phones joined to the same Wi-Fi, use one of these addresses:"
ip -4 addr show 2>/dev/null | awk '/inet / && $2 !~ /^127\./ { print "http://" $2 }' | cut -d/ -f1 | sed 's/$/:43123/'
