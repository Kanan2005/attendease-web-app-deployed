# AttendEase Website UI Rectification Spec

Reference: `UIi prompt website (1).docx` (extracted 2026-03-16).

## Design Principles

- One primary action per screen
- Maximum 3–4 cards per section
- Avoid nested panels
- Avoid instructional paragraphs; prefer visual hierarchy
- Remove enterprise dashboard clutter
- Style: Linear-like, airy spacing, large cards, blue accent, minimal filters

## Implemented Changes

### 1. Profile and top navigation

- Profile moved to top-right (no profile card in sidebar)
- Top nav: Left = [AttendEase logo], Dashboard; Right = Profile dropdown, Log out
- Profile dropdown: Profile name, Email, Role, Dashboard, Settings, Sign out

### 2. Sidebar removed

- No left sidebar; dashboard is the default view with classroom cards

### 3. Classrooms and course details

- Dashboard shows classroom cards (open, edit, delete)
- Course details: tabs for Overview, Lectures, Students, Announcements, Schedule, Reports
- Lectures tab: list of lecture session cards, “Create lecture”, “Start attendance” within 2 hours of lecture time

### 4. Lecture session and QR flow

- Session start: classroom (and optional lecture) preselected; duration and GPS radius in form
- After start: full-page projector view with large QR (max 720px), timer, stop button
- QR rotates every 2 seconds (backend-driven; front end polls)

### 5. Attendance sessions page simplified

- Removed: Refine/Review/Watch/Compare metrics, “Sessions In View”, “Correction State”, “Current Filter Scope”, “Keep in Mind” copy, red error banners
- Kept: simple “Attendance sessions” heading, compact filters, session list, session detail with present/absent and save corrections

### 6. Attendance records (per lecture/session)

- Session detail: list of attendance records, unmark/mark manual per student, search (handled in session history workspace)

### 7. Reports

- Reports tab on course details page; classroom-scoped reports with export
- Global reports still at `/teacher/reports`

### 8. Copy and clutter

- Overview and tools cards: shorter descriptions, less instructional text
- Session start and session history: no heavy WebPortalPage wrapper or metric grids

## Files Touched (summary)

- `apps/web/app/(teacher)/teacher/sessions/history/page.tsx` – direct workspace, no page model
- `apps/web/app/(teacher)/teacher/sessions/start/page.tsx` – direct workspace, `lectureId` support
- `apps/web/app/(teacher)/teacher/classrooms/[classroomId]/layout.tsx` – Reports tab
- `apps/web/app/(teacher)/teacher/classrooms/[classroomId]/reports/page.tsx` – new
- `apps/web/app/(teacher)/teacher/classrooms/[classroomId]/lectures/page.tsx` – lectures workspace
- `apps/web/src/web-shell.tsx` – Log out in top nav
- `apps/web/src/web-nav.tsx` – Settings in profile dropdown
- `apps/web/src/teacher-workflows-client/*` – session history header/filters, reports `initialClassroomId`, lectures workspace, overview/tools copy, session start `initialLectureId`
- `apps/web/src/teacher-qr-session-management.ts` – `lectureId` in draft and request
- `apps/web/src/qr-session-shell-styles.ts` – larger projector QR
