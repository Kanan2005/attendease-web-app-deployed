# Local dev: API + Web + login

Copy-paste these commands one block at a time (no comments with apostrophes).

## 1. Node 22 and env

```bash
cd /Users/anuagar2/Desktop/practice/Attendease
nvm use 22
export DATABASE_URL="postgresql://attendease:attendease@localhost:55432/attendease"
```

## 2. Seed DB (creates teacher and admin users)

```bash
pnpm --filter @attendease/db seed:dev
```

## 3. Start API (leave this terminal open)

```bash
export DATABASE_URL="postgresql://attendease:attendease@localhost:55432/attendease"
pnpm --filter @attendease/api dev
```

## 4. In a second terminal: start web

```bash
cd /Users/anuagar2/Desktop/practice/Attendease
pnpm --filter @attendease/web dev
```

## 5. Login

- Open http://localhost:3000
- Teacher mode
- Email: `teacher@attendease.dev`
- Password: `TeacherPass123!`

## If infra is not running

From repo root:

```bash
pnpm infra:up
```

Then run migrations once:

```bash
export DATABASE_URL="postgresql://attendease:attendease@localhost:55432/attendease"
pnpm --filter @attendease/db migrate:deploy
```
