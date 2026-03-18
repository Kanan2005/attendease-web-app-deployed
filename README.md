# AttendEase

AttendEase is a smart attendance platform with:

- one shared mobile app for students and teachers
- one teacher/admin web app
- one backend API
- one background worker

## Current Product State

The reset-track product implementation is complete through Prompt 40.

Implemented:

- split student and teacher entry inside one mobile app
- student self-registration with one-device binding
- teacher self-registration on mobile and web
- teacher mobile Bluetooth attendance ownership
- teacher web QR + GPS attendance ownership
- admin device recovery and governance
- shared attendance truth across history, reports, exports, and corrections

Still pending outside reset implementation:

- real-device QR, GPS, and Bluetooth signoff
- production validation for Google OIDC, SES, Sentry, and OTEL

## Quality Status

- Typecheck: all 16 packages pass
- Lint: all packages pass (Biome)
- Tests: 222 API tests + 331 unit tests passing
- Workspace validation: passing

## Current Reset Product State

- separate student and teacher entry inside one shared mobile app
- student self-registration with one-device binding
- teacher self-registration on mobile and web
- teacher mobile Bluetooth ownership
- teacher web QR + GPS ownership
- admin device recovery and governance
- shared attendance truth across history, reports, exports, and corrections

## Production Deployment

### Live URLs

| Service | URL | Platform |
|---------|-----|----------|
| Web App | https://attendease-anurag.netlify.app | Netlify |
| API | https://attendease-api-4h45.onrender.com | Render (Docker) |
| Database | Neon PostgreSQL (ap-southeast-1) | Neon |
| Mobile APK | `~/Desktop/AttendEase.apk` | Android release build |

### Test Credentials

| Role | Email | Password |
|------|-------|----------|
| Teacher | teacher@attendease.dev | TeacherPass123! |
| Student | student.one@attendease.dev | StudentOnePass123! |
| Admin | admin@attendease.dev | AdminPass123! |

### Architecture

```
Browser/Mobile ──► Netlify (Next.js SSR) ──► Render (NestJS API) ──► Neon PostgreSQL
                   └── Static + Functions      └── Docker container     └── Prisma ORM
```

### Environment Variable Inlining

Both the web and mobile apps require a centralized env source file to work correctly in production:

- **Web**: `apps/web/src/web-env.ts` — explicit `process.env.NEXT_PUBLIC_*` references for Next.js bundler inlining
- **Mobile**: `apps/mobile/src/mobile-env.ts` — explicit `process.env.EXPO_PUBLIC_*` references for Expo babel inlining

**Root cause**: Passing `process.env` as a whole object to `loadWebEnv()` / `loadMobileEnv()` prevents the bundler from inlining individual keys. On the client side, unresolved keys fall back to Zod defaults (`http://localhost:4000`).

### Deploy Commands

**Web (Netlify)**:
```bash
cd /path/to/Attendease
rm -rf .turbo apps/web/.turbo apps/web/.next
pnpm turbo build --filter=@attendease/web --force
netlify deploy --prod --site=b43ae689-3812-465c-88eb-f8eea18b837b
# Select @attendease/web when prompted
```

**API (Render)**:
Deploys automatically on push to `main` via `render.yaml` blueprint. Manual deploy from Render dashboard if needed.

**Mobile APK**:
```bash
cd apps/mobile/android
./gradlew assembleRelease --no-daemon --no-build-cache
cp app/build/outputs/apk/release/app-release.apk ~/Desktop/AttendEase.apk
```

### Key Configuration Files

- `render.yaml` — Render blueprint (API service, env vars, Docker config)
- `apps/web/netlify.toml` — Netlify build config (build command, publish dir, env vars)
- `apps/web/.env.local` — Web production env vars (loaded at build + runtime)
- `apps/mobile/.env` / `.env.local` — Mobile production env vars (baked at build time)
- `apps/api/Dockerfile` — API Docker build (multi-stage, pnpm, patches)

### Render Free Tier Note

The Render free tier spins down the API after 15 minutes of inactivity. First request after sleep takes 30–60 seconds (cold start). Subsequent requests are fast (~0.5s).

## Start Here

- Runtime and command reference:
  - [README-runtime-and-commands.md](/Users/anuagar2/Desktop/practice/Attendease/README-runtime-and-commands.md)
- Validation and manual-check guide:
  - [README-validation-and-manual-checks.md](/Users/anuagar2/Desktop/practice/Attendease/README-validation-and-manual-checks.md)
- Manual testing guide:
  - [guide.md](/Users/anuagar2/Desktop/practice/Attendease/guide.md)
- Codebase layout:
  - [Structure/codebase-structure.md](/Users/anuagar2/Desktop/practice/Attendease/Structure/codebase-structure.md)
- Implementation handoff:
  - [Structure/context.md](/Users/anuagar2/Desktop/practice/Attendease/Structure/context.md)
- Repo-wide cleanup tracker:
  - [Structure/line-count-cleanup-plan.md](/Users/anuagar2/Desktop/practice/Attendease/Structure/line-count-cleanup-plan.md)
