# AttendEase Dockerization Plan

## Purpose

This plan defines where Docker is useful in AttendEase, where it is not, and the recommended order for adopting it.

The goal is not to containerize everything blindly. The goal is to improve:

- reproducible local runtime setup
- deployment consistency
- CI and smoke-test reliability
- operational verification for API, web, worker, and infrastructure

## Recommendation Summary

Use Docker for:

- PostgreSQL
- Redis
- MinIO or S3-compatible storage
- Mailpit in local development
- API runtime
- worker runtime
- web runtime
- full-stack smoke-test environments
- deployment-style staging verification

Do not rely on Docker for:

- Expo native mobile development
- iOS BLE verification
- Android BLE verification
- QR camera testing
- real GPS permission behavior
- real device-trust lifecycle validation

## Current State

The repo already has useful Docker coverage in [docker-compose.yml](/Users/anuagar2/Desktop/practice/Attendease/docker-compose.yml) for PostgreSQL, Redis, MinIO, and Mailpit. What was missing at planning time was the application-runtime container layer and the deployment-oriented notes.

## What Should Be Dockerized

### 1. Infrastructure

Keep Docker for PostgreSQL, Redis, MinIO, and Mailpit.

### 2. API

Docker is strongly useful for the API because it depends on runtime consistency, Prisma generation, environment-managed secrets, and DB/Redis reachability.

### 3. Worker

Docker is strongly useful for the worker because it shares the same workspace graph as the API and needs reliable background-execution validation.

### 4. Web

Docker is useful for the Next.js web app because it gives a reproducible production runtime, consistent env injection, easy staging smoke tests, and simpler deployment packaging.

### 5. Mobile

Do not try to make Docker the main path for the mobile app. Containerized backend infrastructure is useful while the mobile app runs on the host, but BLE, camera, GPS, permissions, install IDs, and device trust still need real device workflows.

## What Should Not Be Dockerized First

Do not prioritize these early:

- full iOS build pipelines inside Docker
- Android emulator workflows inside Docker
- BLE device simulation as a Docker-first goal
- QR camera E2E inside Docker

## Recommended Dockerization Phases

## Phase A: Runtime Containers

First useful implementation step:

- add `Dockerfile` for `apps/api`
- add `Dockerfile` for `apps/worker`
- add `Dockerfile` for `apps/web`

Design rules:

- use multi-stage builds
- build from the monorepo root
- install dependencies once per image build stage
- run compiled output only in the final container
- do not use `tsx watch`, `next dev`, or Expo dev commands in runtime containers

## Phase B: Full Runtime Compose

After the three images exist:

- add a compose file for full runtime bring-up
- keep the current `docker-compose.yml` for infra
- add either `docker-compose.runtime.yml` or compose profiles in the same file

Current repo status:

- implemented in [docker-compose.runtime.yml](/Users/anuagar2/Desktop/practice/Attendease/docker-compose.runtime.yml)
- keeps [docker-compose.yml](/Users/anuagar2/Desktop/practice/Attendease/docker-compose.yml) infra-only
- verified locally with containerized `api`, `worker`, `web`, `postgres`, `redis`, `minio`, and `mailpit`

## Phase C: CI Image Validation

Once runtime containers exist:

- build API, worker, and web images in CI
- run smoke validation against the containers

Current repo status:

- implemented in [`.github/workflows/docker.yml`](/Users/anuagar2/Desktop/practice/Attendease/.github/workflows/docker.yml)
- CI validates the merged compose config, builds runtime images, boots the runtime stack, checks health, and tears the stack down

## Phase D: Deployment Packaging

After CI is stable:

- push versioned images to a registry
- add deployment docs for staging and production
- keep secrets out of images
- treat migrations as explicit deployment steps

Current repo status:

- not implemented yet
- local Docker runtime support and CI smoke validation exist
- registry publishing, deployment manifests, and rollout automation remain future work

Detailed build, health, logging, migration, and rollout notes now live in [`dockerization-plan-runtime-notes.md`](./dockerization-plan-runtime-notes.md).
