# syntax=docker/dockerfile:1.7

FROM node:22-bookworm-slim AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

FROM base AS build

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json .npmrc ./
COPY patches ./patches
COPY apps ./apps
COPY packages ./packages

RUN --mount=type=cache,id=attendease-pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile

RUN pnpm --filter @attendease/db prisma:generate
RUN pnpm --filter @attendease/worker build

FROM base AS runtime

ENV NODE_ENV="production"

COPY --from=build --chown=node:node /app/package.json /app/package.json
COPY --from=build --chown=node:node /app/pnpm-lock.yaml /app/pnpm-lock.yaml
COPY --from=build --chown=node:node /app/pnpm-workspace.yaml /app/pnpm-workspace.yaml
COPY --from=build --chown=node:node /app/node_modules /app/node_modules
COPY --from=build --chown=node:node /app/apps/worker /app/apps/worker
COPY --from=build --chown=node:node /app/packages /app/packages

USER node
WORKDIR /app/apps/worker

CMD ["pnpm", "start"]
