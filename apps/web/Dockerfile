# syntax=docker/dockerfile:1.7

FROM node:22-bookworm-slim AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV NEXT_TELEMETRY_DISABLED="1"

RUN corepack enable

WORKDIR /app

FROM base AS build

ARG NEXT_PUBLIC_APP_URL="http://localhost:3000"
ARG NEXT_PUBLIC_API_URL="http://localhost:4000"
ARG NEXT_PUBLIC_APP_ENV="production"
ARG NEXT_PUBLIC_FEATURE_BLUETOOTH_ATTENDANCE_ENABLED="true"
ARG NEXT_PUBLIC_FEATURE_EMAIL_AUTOMATION_ENABLED="true"
ARG NEXT_PUBLIC_GOOGLE_OIDC_CLIENT_ID

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY apps ./apps
COPY packages ./packages

RUN --mount=type=cache,id=attendease-pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile

RUN NEXT_PUBLIC_APP_URL="$NEXT_PUBLIC_APP_URL" \
    NEXT_PUBLIC_API_URL="$NEXT_PUBLIC_API_URL" \
    NEXT_PUBLIC_APP_ENV="$NEXT_PUBLIC_APP_ENV" \
    NEXT_PUBLIC_FEATURE_BLUETOOTH_ATTENDANCE_ENABLED="$NEXT_PUBLIC_FEATURE_BLUETOOTH_ATTENDANCE_ENABLED" \
    NEXT_PUBLIC_FEATURE_EMAIL_AUTOMATION_ENABLED="$NEXT_PUBLIC_FEATURE_EMAIL_AUTOMATION_ENABLED" \
    sh -c 'if [ -n "$NEXT_PUBLIC_GOOGLE_OIDC_CLIENT_ID" ]; then export NEXT_PUBLIC_GOOGLE_OIDC_CLIENT_ID; fi; pnpm --filter @attendease/web build'

FROM base AS runtime

ARG NEXT_PUBLIC_APP_URL="http://localhost:3000"
ARG NEXT_PUBLIC_API_URL="http://localhost:4000"
ARG NEXT_PUBLIC_APP_ENV="production"
ARG NEXT_PUBLIC_FEATURE_BLUETOOTH_ATTENDANCE_ENABLED="true"
ARG NEXT_PUBLIC_FEATURE_EMAIL_AUTOMATION_ENABLED="true"

ENV NODE_ENV="production"
ENV NEXT_TELEMETRY_DISABLED="1"
ENV NEXT_PUBLIC_APP_URL="$NEXT_PUBLIC_APP_URL"
ENV NEXT_PUBLIC_API_URL="$NEXT_PUBLIC_API_URL"
ENV NEXT_PUBLIC_APP_ENV="$NEXT_PUBLIC_APP_ENV"
ENV NEXT_PUBLIC_FEATURE_BLUETOOTH_ATTENDANCE_ENABLED="$NEXT_PUBLIC_FEATURE_BLUETOOTH_ATTENDANCE_ENABLED"
ENV NEXT_PUBLIC_FEATURE_EMAIL_AUTOMATION_ENABLED="$NEXT_PUBLIC_FEATURE_EMAIL_AUTOMATION_ENABLED"

COPY --from=build --chown=node:node /app/package.json /app/package.json
COPY --from=build --chown=node:node /app/pnpm-lock.yaml /app/pnpm-lock.yaml
COPY --from=build --chown=node:node /app/pnpm-workspace.yaml /app/pnpm-workspace.yaml
COPY --from=build --chown=node:node /app/node_modules /app/node_modules
COPY --from=build --chown=node:node /app/apps/web /app/apps/web
COPY --from=build --chown=node:node /app/packages /app/packages

USER node
WORKDIR /app/apps/web

EXPOSE 3000

CMD ["pnpm", "start"]
