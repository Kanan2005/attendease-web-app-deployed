# Attendease — Local Development to Production Guide

This document tracks every dev-setup decision made during v2.0 development.
When it's time to deploy to production, use this as a checklist to reverse local overrides.

---

## 1. Environment Files — What Changed & How to Restore

### apps/web/.env.local

| Variable | Local Dev Value | Production Value |
|----------|----------------|-----------------|
| `NEXT_PUBLIC_APP_URL` | `http://127.0.0.1:3000` | `https://attendease-anurag.netlify.app` (or your production domain) |
| `NEXT_PUBLIC_API_URL` | `http://localhost:4000` | `https://attendease-api-4h45.onrender.com` (or your production API) |
| `WEB_INTERNAL_API_URL` | `http://localhost:4000` | `https://attendease-api-4h45.onrender.com` (or internal API URL) |
| `NEXT_PUBLIC_APP_ENV` | `development` | `production` |

### apps/mobile/.env.local

| Variable | Local Dev Value | Production Value |
|----------|----------------|-----------------|
| `EXPO_PUBLIC_API_URL` | `http://<YOUR_LAN_IP>:4000` (e.g. `192.168.29.11`) | `https://attendease-api-4h45.onrender.com` |
| `EXPO_PUBLIC_APP_ENV` | `development` | `production` |
| `EXPO_PUBLIC_STUDENT_DEV_EMAIL` | `student.one@attendease.dev` | Remove or leave empty (no dev prefill in prod) |
| `EXPO_PUBLIC_STUDENT_DEV_PASSWORD` | `StudentOnePass123!` | Remove or leave empty |
| `EXPO_PUBLIC_STUDENT_DEV_INSTALL_ID` | `seed-install-student-one` | Remove or leave empty |
| `EXPO_PUBLIC_STUDENT_DEV_PUBLIC_KEY` | `seed-public-key-student-one` | Remove or leave empty |
| `EXPO_PUBLIC_TEACHER_DEV_EMAIL` | `teacher@attendease.dev` | Remove or leave empty |
| `EXPO_PUBLIC_TEACHER_DEV_PASSWORD` | `TeacherPass123!` | Remove or leave empty |
| `EXPO_PUBLIC_ADMIN_DEV_EMAIL` | `admin@attendease.dev` | Remove or leave empty |
| `EXPO_PUBLIC_ADMIN_DEV_PASSWORD` | `AdminPass123!` | Remove or leave empty |

> **IMPORTANT**: All `*_DEV_*` env vars must be removed or emptied for production builds.
> They pre-fill login forms and bypass device identity resolution — only for local dev convenience.

### apps/api/.env.local

| Variable | Local Dev Value | Production Value |
|----------|----------------|-----------------|
| `DATABASE_URL` | `postgresql://attendease:attendease@localhost:5432/attendease` | Neon/managed Postgres connection string |
| `REDIS_URL` | `redis://localhost:6379` | Managed Redis URL (or `redis://placeholder:6379` if not used) |
| `API_CORS_ALLOWED_ORIGINS` | `http://localhost:3000,http://127.0.0.1:3000,http://192.168.29.11:3000` | `https://attendease-anurag.netlify.app,http://localhost:3000` |
| `STORAGE_ENDPOINT` | `http://localhost:9000` (MinIO) | AWS S3 or production object storage endpoint |
| `STORAGE_ACCESS_KEY` | `minioadmin` | Production S3 access key |
| `STORAGE_SECRET_KEY` | `minioadmin` | Production S3 secret key |
| `EMAIL_PROVIDER_MODE` | `console` (logs emails to terminal) | `ses` or `smtp` (actual email delivery) |
| `MAILPIT_SMTP_HOST` | `localhost` | N/A in production (use SES/SMTP) |
| `AUTH_ACCESS_TOKEN_SECRET` | `attendease-dev-access-token-secret-attendease` | A strong, unique secret (generate with `openssl rand -base64 48`) |
| `FEATURE_STRICT_DEVICE_BINDING_MODE` | `ENFORCE` | `ENFORCE` or `DISABLED` depending on rollout |
| `NODE_ENV` | `development` | `production` |

### apps/worker/.env.local

Same DB/Redis/Storage/Email changes as the API above. Key differences:
- `WORKER_PORT` stays `4010`
- `WORKER_CYCLE_INTERVAL_MS` can be increased in production (e.g. `30000`) to reduce load

---

## 2. Infrastructure — Local vs Production

| Service | Local (Docker/Colima) | Production |
|---------|----------------------|------------|
| **Database** | Postgres 16 via `docker-compose.yml` on `localhost:5432` | Neon (serverless Postgres) — connection string in `DATABASE_URL` |
| **Redis** | Redis 7 via `docker-compose.yml` on `localhost:6379` | Managed Redis or disabled (set `RATE_LIMIT_STORE_MODE=memory`) |
| **Object Storage** | MinIO on `localhost:9000` | AWS S3 or compatible |
| **Email** | Mailpit on `localhost:1025` (SMTP), `localhost:8025` (UI) | AWS SES or SMTP provider |
| **API** | NestJS dev server on `localhost:4000` | Docker container on Render (see `render.yaml`) |
| **Web** | Next.js dev server on `localhost:3000` | Static export on Netlify |
| **Worker** | tsx watch on `localhost:4010` | Docker container or process manager |
| **Mobile** | Expo dev client via USB + Metro bundler | EAS Build (production APK/IPA) |

### Docker Setup (Local Only)

```bash
# Start infrastructure
colima start --cpu 4 --memory 4 --disk 20
docker compose up -d

# Verify all healthy
docker ps

# Run migrations
DATABASE_URL=postgresql://attendease:attendease@localhost:5432/attendease \
  pnpm --filter @attendease/db migrate:deploy

# Seed dev data
DATABASE_URL=postgresql://attendease:attendease@localhost:5432/attendease \
  pnpm --filter @attendease/db seed:dev

# Start all services
pnpm dev  # runs API, web, mobile, worker in parallel via Turborepo
```

### Stopping Local Stack

```bash
# Stop app servers: Ctrl+C in terminal running pnpm dev

# Stop Docker containers
docker compose down

# Stop Colima VM (frees resources)
colima stop
```

---

## 3. Database — Migrations & Seeding

### Local Dev
- 14 Prisma migrations auto-applied via `migrate:deploy`
- Seeded with `seed:dev` → 6 users, 2 classrooms, sample attendance sessions
- Seeded accounts:
  - **Teacher**: `teacher@attendease.dev` / `TeacherPass123!`
  - **Student**: `student.one@attendease.dev` / `StudentOnePass123!`
  - **Admin**: `admin@attendease.dev` / `AdminPass123!`

### Production
- Run `pnpm --filter @attendease/db migrate:deploy` against production `DATABASE_URL`
- Do NOT run `seed:dev` in production
- Create real admin account via registration or direct DB insert

---

## 4. Mobile Device Connectivity (Local Dev)

Physical Android device connects to local API via Mac's LAN IP:
- Find your IP: `ipconfig getifaddr en0`
- Set `EXPO_PUBLIC_API_URL=http://<YOUR_IP>:4000` in `apps/mobile/.env.local`
- Ensure the API CORS includes this IP in `API_CORS_ALLOWED_ORIGINS`
- Phone must be on the **same Wi-Fi network** as the Mac

For Android emulator, use `http://10.0.2.2:4000` instead.

### Student Device Binding (Local Dev Gotcha)
The dev seed creates a device binding with `installId=seed-install-student-one`.
The mobile `.env.local` must use the **same** install ID, otherwise the API rejects
login with "waiting for admin approval as the replacement attendance device."

---

## 5. Production Deployment Checklist

Before deploying v2.0:

- [ ] Remove all `*_DEV_*` env vars from mobile build config
- [ ] Set all `*_APP_ENV` vars to `production`
- [ ] Update `NEXT_PUBLIC_APP_URL` to production domain
- [ ] Update `NEXT_PUBLIC_API_URL` and `EXPO_PUBLIC_API_URL` to production API URL
- [ ] Set `AUTH_ACCESS_TOKEN_SECRET` to a strong unique secret
- [ ] Configure real `DATABASE_URL` (Neon or managed Postgres)
- [ ] Configure real `REDIS_URL` or set `RATE_LIMIT_STORE_MODE=memory`
- [ ] Configure real S3 storage (`STORAGE_ENDPOINT`, keys, bucket)
- [ ] Configure real email provider (`EMAIL_PROVIDER_MODE=ses` + SES credentials)
- [ ] Set `API_CORS_ALLOWED_ORIGINS` to production frontend domain only
- [ ] Run `pnpm --filter @attendease/db migrate:deploy` against production DB
- [ ] Build production Docker images for API and worker
- [ ] Build production web export for Netlify
- [ ] Build production mobile APK/IPA via EAS Build
- [ ] Verify `render.yaml` env vars match production settings
- [ ] Test login flow end-to-end on production
