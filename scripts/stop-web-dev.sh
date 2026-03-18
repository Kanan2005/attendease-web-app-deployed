#!/usr/bin/env bash
# Stop any running Next.js web dev server and clear its lock file.
# Run from repo root: ./scripts/stop-web-dev.sh

set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WEB_APP="${ROOT}/apps/web"

# Kill processes on port 3000 and 3001 (common dev ports)
for port in 3000 3001; do
  if command -v lsof >/dev/null 2>&1; then
    pid=$(lsof -ti ":$port" 2>/dev/null) || true
    if [ -n "$pid" ]; then
      echo "Stopping process $pid on port $port"
      kill -9 $pid 2>/dev/null || true
    fi
  fi
done

# Remove Next.js dev lock so a new instance can start
LOCK_FILE="${WEB_APP}/.next/dev/lock"
if [ -f "$LOCK_FILE" ]; then
  echo "Removing dev lock: $LOCK_FILE"
  rm -f "$LOCK_FILE"
fi

echo "Done. You can run: pnpm --filter @attendease/web dev"
