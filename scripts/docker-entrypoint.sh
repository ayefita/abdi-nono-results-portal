#!/bin/sh
set -e
npx prisma migrate deploy
npx tsx prisma/seed.ts
npx next start -p 43123 -H 0.0.0.0
