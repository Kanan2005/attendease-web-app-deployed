#!/usr/bin/env bash
# Production start script with retry logic for Neon cold-start.
# Neon serverless computes can take 3–7s to wake from suspension;
# prisma migrate deploy may fail with P1001 on the first attempt.

set -euo pipefail

MAX_RETRIES=4
RETRY_DELAY=5

echo "[start-prod] Running migrations with up to $MAX_RETRIES attempts..."

for i in $(seq 1 "$MAX_RETRIES"); do
  if pnpm --filter @attendease/db migrate:deploy; then
    echo "[start-prod] Migrations applied successfully."
    break
  fi

  if [ "$i" -eq "$MAX_RETRIES" ]; then
    echo "[start-prod] ERROR: Migrations failed after $MAX_RETRIES attempts. Aborting."
    exit 1
  fi

  echo "[start-prod] Migration attempt $i/$MAX_RETRIES failed. Retrying in ${RETRY_DELAY}s..."
  sleep "$RETRY_DELAY"
done

echo "[start-prod] Starting API server..."
exec tsx dist/apps/api/src/main.js
