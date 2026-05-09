# Attendease Deployment & Ops Log

> Living document — append every infra/deploy decision, fix, or open task here.
> Newest entries on top. Keep entries terse but complete enough to rebuild context.

---

## 🌐 Production URLs (canonical)

| Service | URL | Source repo | Branch |
|---|---|---|---|
| **API** | https://attendease-api-4h45.onrender.com | `Kanan2005/attendease-web-app-deployed` | `main` |
| **Web** | https://attendease-anurag.netlify.app | `Kanan2005/attendease-web-app-deployed` | `main` |
| **DB** | Neon project `fragrant-recipe-73514410` (`ap-southeast-1`) | n/a | n/a |
| **GitHub** | https://github.com/Kanan2005/attendease-web-app-deployed | — | — |

### Netlify projects in the team
- `attendease-anurag` (b43ae689-...) — **active**, repo updated
- `attendease-web-app` (c5a338c3-...) — secondary; verify if needed

### Old / abandoned
- ~~`anurag203/AttendEase-Web-App`~~ — old repo, no longer connected to Render or Netlify

---

## 🔐 Test credentials (seeded)

| Role | Email | Password |
|---|---|---|
| Admin | `admin@attendease.dev` | `AdminPass123!` |
| Teacher | `teacher@attendease.dev` | `TeacherPass123!` |
| Student | `student.one@attendease.dev` | `StudentOnePass123!` |

---

## 🛠️ Deployment behavior

### Render (API)
- **Runtime**: Docker (`apps/api/Dockerfile`)
- **Auto-deploy**: ON (pushes to `main` of `Kanan2005/attendease-web-app-deployed`)
- **Container CMD**: `pnpm run start:prod`
  - Step 1: `prisma migrate deploy` (auto-applies pending migrations to Neon)
  - Step 2: `tsx dist/apps/api/src/main.js`
- Migrations are **idempotent** — already-applied ones are skipped on restart.
- If a migration fails, the API does NOT start (fail-fast — better than a broken schema in prod).

### Netlify (Web)
- **Project to deploy**: `apps/web`
- **Build command**: `pnpm turbo build --filter=@attendease/web` (from `apps/web/netlify.toml`)
- **Publish directory**: `apps/web/.next`
- **Plugin**: `@netlify/plugin-nextjs` (auto-activated)
- Env vars come from `apps/web/netlify.toml`, no dashboard config needed.

### Neon (DB)
- No GitHub link. Driven entirely by `prisma migrate deploy` from the API container.
- DATABASE_URL stored only in Render env vars.

---

## 📜 Session History

### 2026-05-09 — Repo migration & migration auto-apply

**Context**: Render and Netlify were both watching the old GitHub repo `anurag203/AttendEase-Web-App`. Local pushes go to `Kanan2005/attendease-web-app-deployed`. Result: latest commits never reached prod.

**Fixes applied:**

1. **Render → repointed to new repo** (manual via Render dashboard).
   - Verified by hitting new endpoints (`/admin/dashboard/stats`, `/admin/teachers`) — got 200.
2. **Netlify → repointed `attendease-anurag` to new repo** (manual via Netlify dashboard).
   - Project: `apps/web`, Build cmd from `netlify.toml`, no env vars needed.
3. **Neon DB → manually applied missing migration** `20260403054537_add_parent_email`.
   - Symptom: `/admin/students` & `/admin/device-bindings` returned 500.
   - Root cause: `parentEmail` column was added in source but never deployed.
   - Applied via `mcp1_run_sql_transaction` (DropIndex×3, AddColumn, RenameIndex, insert into `_prisma_migrations`).
4. **Auto-migrate on every API container start** (commit `b839235`).
   - `apps/api/package.json` → added `start:prod` script.
   - `apps/api/Dockerfile` → `CMD` changed from `pnpm start` → `pnpm run start:prod`.
   - Prevents future drift between repo migrations and Neon DB.
5. **Web typecheck blockers fixed** (commit `4ff223e`).
   - `teacher-classroom-lectures-workspace.tsx`: `lecture.createdAt ?? null` (after making `createdAt` optional in contract).
   - `teacher-reports-workspace.tsx`: conditional spread of `metrics` prop for `exactOptionalPropertyTypes`.
6. **Repo hygiene** (commit `1c1844e`).
   - Untracked `Admin Panel Requirements.docx` and `apps/mobile/.env.local.bak`.
   - Added `*.bak` and `*.docx` to `.gitignore`.

**Earlier this session:**
- Made `lectureSummarySchema.createdAt` optional + null-guarded mobile UI (`packages/contracts/src/academic.sessions-enrollments.ts`, `apps/mobile/src/teacher-foundation/teacher-classroom-lectures-screen.tsx`) to allow mobile to tolerate older API responses during the deploy gap.
- Fixed assorted lint/type errors blocking GitHub Actions:
  - `apps/api/src/modules/admin/admin-dashboard.service.ts` — type predicate to narrow `event.user`.
  - `apps/api/src/modules/reports/reports.models.test.ts` — added missing `email_sent_count`.
  - `apps/mobile/src/teacher-foundation/teacher-reports-screen-content.tsx` — stable keys for chart points.
  - `apps/mobile/src/teacher-schedule-calendar.ts` — replaced non-null assertion.
  - `apps/mobile/src/student-foundation/student-qr-attendance-screen.tsx` — moved `biome-ignore` directive.

---

## ✅ Verified working (as of 2026-05-09 12:55 IST)

- All admin endpoints returning 200 with valid JWT:
  - `/admin/dashboard/stats` (NEW)
  - `/admin/teachers` (NEW)
  - `/admin/students`
  - `/admin/classrooms`
  - `/admin/semesters`
  - `/admin/device-bindings`
- Lecture endpoint includes `createdAt` field
- Auth login (admin/teacher/student) works against hosted API
- QR attendance flow code reviewed — GPS validator (haversine, accuracy threshold) confirmed correct

---

## ⏳ Open / pending

- [ ] **Decide fate of secondary Netlify project** `attendease-web-app` — repo update needed or delete?
- [ ] **Mobile QR attendance E2E** on emulator — re-test after API stabilizes.
- [ ] **Confirm next API deploy** auto-applies migrations correctly (next time we add a migration).
- [ ] **Optional**: bump `@netlify/plugin-nextjs` 5.15.9 → 5.15.11 (Netlify shows outdated warning).

## 🆕 Recently completed

- [x] 2026-05-09 — **Admin Panel Phase 1: Records explorer**. Backend (`76e6f87`) added migration `20260509073000_admin_panel_action_log_enum_extensions` extending `AdminActionType` enum (pre-staged for all 6 phases), `packages/contracts/src/admin-records.ts` with Zod schemas, `apps/api/src/modules/admin/admin-records.{service,controller,integration.test}.ts` with 5 GET endpoints (departments, teachers in dept, courses by teacher, students in course, course-code search) + 2 POST mutations (archive/unarchive with `AdminActionLog` rows, idempotent). Frontend pending in next commit. See `/Users/anuagar2/.windsurf/plans/admin-panel-buildout-3503b3.md`.
- [x] 2026-05-09 — **Render cold-start UX fix**. Symptom: login form stuck on "Signing in..." for ~50s on first sign-in. Root cause: Render free tier suspends container after ~15 min idle; cold start ~50s. Fixes:
  1. `.github/workflows/keep-alive.yml` — pings `/health` every 13 min via cron + `workflow_dispatch`. Free, runs on GitHub-hosted runner.
  2. `apps/web/src/unified-login-form.tsx` — fires `fetch(/health)` on mount to warm the API while user types creds. Adds delayed UI hint ("Server is warming up...") if submit takes >5s.
- [x] 2026-05-09 — Netlify build succeeds at commit `8b61628`. All routes including `/admin/teachers`, `/admin/dashboard`, `/admin/students` return 200. Web app on new repo confirmed serving latest code.

---

## 🧰 Useful one-liners

```bash
# Check all admin endpoints
ADMIN=$(curl -s -X POST https://attendease-api-4h45.onrender.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@attendease.dev","password":"AdminPass123!","platform":"WEB"}' \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['tokens']['accessToken'])")

for ep in /admin/dashboard/stats /admin/teachers /admin/students /admin/classrooms /admin/semesters /admin/device-bindings; do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://attendease-api-4h45.onrender.com$ep" -H "Authorization: Bearer $ADMIN")
  printf "  %-32s %s\n" "$ep" "$CODE"
done

# Verify Netlify web app deployed latest code
curl -s -o /dev/null -w "%{http_code}\n" https://attendease-anurag.netlify.app/admin/teachers

# Check Neon migrations applied
# (use mcp1_run_sql with sql='SELECT migration_name, finished_at FROM _prisma_migrations ORDER BY started_at DESC LIMIT 10')
```

---

## 📌 Conventions for this log

- **Append at top** (newest first), but keep "Production URLs" and "Open / pending" sections at top.
- For each fix: include **commit SHA**, **symptom**, **root cause**, **files changed**.
- Mark items in "Open / pending" with `[x]` when complete and move to "Session History".
