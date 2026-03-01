#!/bin/sh
set -e

# Run Prisma migrations before starting the server
echo "Running database migrations..."
npx prisma migrate deploy

echo "Migrations complete. Starting server..."
exec "$@"
