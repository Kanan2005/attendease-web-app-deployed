#!/usr/bin/env bash
# Run the given command with Node 22 active via nvm.
# Usage: ./scripts/with-node22.sh pnpm install
#        ./scripts/with-node22.sh pnpm --filter @attendease/web dev

set -e
if [ -n "${NVM_DIR}" ] && [ -s "${NVM_DIR}/nvm.sh" ]; then
  . "${NVM_DIR}/nvm.sh"
  nvm use 22 2>/dev/null || nvm use
fi
exec "$@"
