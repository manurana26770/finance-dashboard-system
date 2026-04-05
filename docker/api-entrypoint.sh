#!/bin/sh
set -e

echo "Preparing database schema..."
npx prisma migrate deploy

if [ "${SEED_ON_BOOT:-false}" = "true" ]; then
  echo "Seeding database..."
  npx prisma db seed
fi

echo "Starting API..."
exec node dist/main
