# Attendease Changelog — v2.0 Development

All notable changes during v2.0 development are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/).

---

## [Unreleased] — v2.0

### Added

#### Admin UI Overhaul — Full Rebuild (Phase 1–4)

##### Backend — New API Endpoints & Contracts (`packages/contracts/src/admin-dashboard.ts`, `apps/api/src/modules/admin/admin-dashboard.controller.ts`, `apps/api/src/modules/admin/admin-dashboard.service.ts`, `apps/api/src/modules/admin/admin-teachers.controller.ts`, `apps/api/src/modules/admin/admin-teachers.service.ts`, `apps/api/src/modules/admin/admin.module.ts`)

- **Admin Dashboard Stats endpoint** (`GET /admin/dashboard/stats`): Returns aggregate counts for students (total/active/blocked/pending), teachers (total/active), classrooms (total/active/archived), semesters (total/active), pending device requests, and recent security events.
- **Admin Teacher List endpoint** (`GET /admin/teachers`): Search/filter teachers by name, email, employee code, and status. Returns teacher profile, department, classroom count.
- **Admin Teacher Detail endpoint** (`GET /admin/teachers/:teacherId`): Returns full teacher profile with assigned classrooms, student counts, and course details.
- **Contract schemas** (`adminDashboardStatsSchema`, `adminTeacherSummarySchema`, `adminTeacherSearchQuerySchema`, `adminTeacherDetailSchema`, `adminTeacherClassroomSchema`) exported from `@attendease/contracts`.

##### Auth Client — New Admin Methods (`packages/auth/src/client.admin.ts`)

- `getAdminDashboardStats(token)` — fetches dashboard aggregate stats.
- `listAdminTeachers(token, filters)` — searches and lists teachers with optional status filter.
- `getAdminTeacher(token, teacherId)` — fetches detailed teacher profile with classrooms.

##### Frontend — New Admin Pages & Navigation (`apps/web/app/(admin)/admin/*/page.tsx`, `apps/web/src/admin-workflows-client/admin-dashboard.tsx`, `apps/web/src/admin-workflows-client/admin-teachers.tsx`)

- **Dashboard page** (`/admin/dashboard`): Live stat cards (students, teachers, classrooms, semesters, pending device requests), quick-action links, recent security events table. Auto-refreshes every 60s.
- **Students page** (`/admin/students`): Dedicated route for student search, detail view, status management. Previously embedded in the devices page.
- **Teachers page** (`/admin/teachers`): New page with search/filter, data table with click-to-expand detail panel showing profile info and classroom assignments.
- **Classrooms page** (`/admin/classrooms`): Separated from semesters page into its own dedicated route for classroom governance.

#### Admin Students — Enhanced Detail View with Search, Classrooms & Attendance (devices.ts, admin-device-support.service-management-queries.ts, student-management-content.tsx)

- **Search by name or ID**: Students list now searchable by display name, roll number, email, or device ID. Search submits on Enter key.
- **Registration details card**: Shows roll number, program, semester, registration date, last login, and last attendance in a clean grid layout.
- **Collapsible "Classrooms Joined (N)"**: Classroom memberships are hidden behind a collapsible toggle with a chevron arrow. Each classroom card shows course code, semester, membership status badge, and an attendance progress bar with color-coded percentage (green >= 75%, amber >= 50%, red < 50%).
- **Attendance percentage per classroom**: Backend now computes `attendedSessions`, `totalSessions`, and `attendancePercentage` per enrollment by querying `AttendanceRecord` (PRESENT) and `AttendanceSession` (ENDED/ACTIVE) counts.
- **Last active session**: Backend fetches the student's most recent PRESENT attendance record timestamp (`lastActiveSessionAt`).
- **Pending device requests section**: Displays any pending device replacement request with platform, model, install ID, and request date. Includes a "Review" link to the device recovery desk. Also shows the current active device.
- **Governance actions**: Simplified inline layout with action buttons and reason textarea in the same detail panel.

### Changed

#### Admin Navigation & Routing (`apps/web/src/web-portal-navigation.ts`, `apps/web/src/web-workflows-routes.ts`)

- Replaced verbose 5-item admin nav (Dashboard, Student Support, Device Recovery, Imports, Semesters) with clean 6-item nav: **Dashboard, Students, Teachers, Devices, Classrooms, Semesters**.
- Updated `adminWorkflowRoutes` to include `students`, `teachers`, `classrooms` routes.
- Added React Query keys: `adminDashboardStats`, `adminTeachers`, `adminTeacherDetail`.

#### Admin Page Simplification (`apps/web/app/(admin)/admin/devices/page.tsx`, `apps/web/app/(admin)/admin/semesters/page.tsx`, `apps/web/app/(admin)/admin/imports/page.tsx`, `apps/web/app/(admin)/admin/layout.tsx`)

- **Devices page**: Simplified to device recovery only (student support moved to `/admin/students`). Removed dual-view logic and `WebPortalPage` wrapper.
- **Semesters page**: Removed embedded classroom governance (now at `/admin/classrooms`). Removed `WebPortalPage` wrapper.
- **Imports page**: Removed `WebPortalPage` wrapper, simplified to direct workspace rendering.
- **Layout**: Updated scope description to match new navigation.

### Fixed

#### Teacher Mobile — Bluetooth Session Resilience on App Close/Reopen (bluetooth-attendance-hooks.ts, teacher-bluetooth-session-create-screen.tsx)

- **Problem**: If the teacher closed/swiped away the app, locked the phone, or the battery died while a Bluetooth attendance session was live, BLE advertising stopped. Reopening the app either failed with an "already active" error or ended the old session and created a new one — losing attendance data continuity and the session timer.
- **Fix — persistent runtime storage**: BLE advertiser config (service UUID, seed, payload) is now saved to `expo-file-system` on session creation and cleared on session end. This allows the app to resume the *same* session after being killed or restarted.
- **Fix — robust session resume on reopen**: Rewrote `runPreflight` as a clean async function with 5-step flow: (1) check BT permissions, (2) check BT availability, (3) try to resume from stored runtime (verify session still live on server), (4) clean up stale sessions, (5) create new session only as last resort. On network failure, resumes optimistically from stored runtime rather than falling through to create a new session.
- **Fix — elapsed timer continuity**: On resume, elapsed seconds are computed from the original `session.startedAt` timestamp rather than resetting to 0.
- **Fix — back button keeps session alive**: Changed the back button from "End & Leave" to a 3-option alert: "Stay Here", "Keep Running & Leave" (session stays live on server for students), and "End Session & Leave" (explicit end).
- **Fix — foreground resume**: Added `AppState` listener in `useTeacherBluetoothAdvertiser` that automatically restarts BLE advertising when the app returns to foreground (covers app-switch / phone-lock / notification-check scenarios).

#### Admin Login — Teacher Session Auto-Redirect & Missing `next` Param (page.tsx, admin/login/page.tsx)

- **Problem**: When a teacher was already logged in and navigated to `/admin/login`, the root page detected the existing teacher session and auto-redirected to `/teacher/dashboard` — preventing the user from ever reaching the admin login form.
- **Root cause**: The root page (`app/page.tsx`) unconditionally redirected any authenticated user to their dashboard, ignoring the `?mode=admin` query param that signals an explicit intent to switch accounts.
- **Fix**: When `mode=admin` is requested but the current session is non-admin, the login form is shown instead of auto-redirecting. Also forwarded the `next` query param from `/admin/login` (previously dropped, unlike `/login`).

#### Admin Dashboard API — Missing `@Inject()` Decorators (admin-dashboard.controller.ts, admin-teachers.controller.ts)

- **Problem**: The admin dashboard stats endpoint (`GET /admin/dashboard/stats`) returned 500 Internal Server Error for authenticated admin users.
- **Root cause**: New controllers were missing explicit `@Inject(ServiceClass)` decorators on constructor parameters. Since the API uses `tsx` (esbuild), TypeScript decorator metadata is not emitted, so NestJS could not resolve constructor dependencies by type alone — `this.adminDashboardService` was `undefined`.
- **Fix**: Added `@Inject(AdminDashboardService)` and `@Inject(AdminTeachersService)` to the respective controllers, matching the existing pattern used by `AdminDeviceSupportController`.

#### Teacher Web — Session Expiry: Inactivity-Based Sliding Window with Silent Refresh (middleware.ts, web-auth-session.ts, session-keep-alive.tsx, providers.tsx, api/auth/refresh/route.ts, logout/route.ts, web-portal-types.ts)

- **Problem**: All session cookies expired after a fixed 15 minutes (tied to `accessTokenExpiresAt`), signing the user out even while actively using the app. The API-issued `refreshToken` (30-day lifetime) was completely ignored by the web app.
- **Root cause**: `buildWebPortalCookieDefinitions` set every cookie's `expires` to `accessTokenExpiresAt`. No refresh token was stored, no middleware existed to renew tokens, and no client-side keep-alive tracked user activity.
- **Fix — sliding 15-minute inactivity window**:
  - All session cookies (access token, refresh token, role, display name, email) now expire together at `accessTokenExpiresAt` (15 min). If the user is inactive for 15 minutes, every cookie expires and they are signed out.
  - **Refresh token cookie** (`attendease_web_refresh_token`): Added to `webSessionCookieNames` and stored as an httpOnly cookie alongside the access token.
  - **Next.js middleware** (`middleware.ts`): Runs on `/teacher/*` and `/admin/*` routes. When the access token cookie is missing but the refresh token cookie is still present (user navigated within the window), it calls `POST /auth/refresh` on the API, obtains fresh tokens, and resets all cookies with a new 15-minute expiry — extending the session.
  - **Client-side keep-alive** (`session-keep-alive.tsx`): A `SessionKeepAlive` component mounted in `WebAppProviders` tracks user activity (`mousedown`, `keydown`, `scroll`, `touchstart`, `pointermove`). Every 60 seconds it checks whether 12 minutes have elapsed since the last refresh; if the user has been active within the last 30 seconds, it calls `POST /api/auth/refresh` to renew cookies before they expire. This covers single-page scenarios (reading content, filling forms) where no server navigation occurs.
  - **Server refresh route** (`app/api/auth/refresh/route.ts`): Reads the refresh token from cookies, calls the API's `/auth/refresh` endpoint, and sets fresh cookies. Returns 401 if the refresh token is missing or invalid.
  - **Logout** (`app/logout/route.ts`): Now passes the refresh token to the API's logout call so it is invalidated server-side. The refresh token cookie is cleared alongside all other session cookies.
- **Behaviour summary**: Active user → session stays alive indefinitely (renewed every ~12 min). Inactive user → signed out after 15 minutes. Logout invalidates both tokens server-side.
- **Tests**: Updated `web-auth-session.test.ts` to verify all 6 cookies use `accessTokenExpiresAt` expiry. All 70 web tests pass.

#### Teacher Web — Reports Email System: Stale Selection Bug & UI Overhaul (teacher-reports-workspace.tsx)

- **Bug fixed — stale student count after threshold change**: When the teacher changed the attendance threshold percentage, `selectedStudentIds` retained IDs of students no longer below the new threshold. The "Email N students" button displayed the old count instead of the correct number. Root cause: no pruning of selected IDs when the filtered list changed.
- **Fix**: Memoized `studentsBelowThreshold` with `useMemo` and added a `useEffect` that prunes `selectedStudentIds` whenever the below-threshold list changes — removing IDs that are no longer valid.
- **Bug fixed — Select All checkbox**: Previously used a size-based comparison (`selectedStudentIds.size === studentsBelowThreshold.length`) which could be misleadingly checked after a threshold change. Now uses `studentsBelowThreshold.every(r => selectedStudentIds.has(r.studentId))` for correct ID-set membership checking.
- **UI improvements — threshold section header**: Title and threshold input grouped on the left; selection indicator ("N of M selected" or "Select students to email") and email button on the right. Email button now always visible when students are below threshold (disabled when none selected, active when selection exists) — making the feature discoverable.
- **UI improvements — compose modal**: Redesigned with a header bar showing student count and threshold context plus a close (×) button. Recipient toggles replaced with styled pill buttons (`RecipientToggle` component) with custom checkmarks and count badges. Warning banners for missing parent emails and no-recipient-selected are now styled cards. Subject/body fields use consistent input styling. Template variable hints displayed in a tinted info bar. Preview is collapsible (hidden by default) to reduce visual noise. Send button shows total recipient count ("Send N emails"). All fields disabled during send.
- **Tests**: All 70 web tests pass — no regressions.

#### Teacher Web — Reports: Average Attendance Now Matches Mobile Exactly (teacher-reports-workspace.tsx)

- **Problem**: The web app's course-scoped "Average attendance" summary card showed a different percentage (e.g. 45%) than the mobile app (e.g. 41.18%) for the same classroom and data. Two root causes:
  1. **Different data source**: The web computed from attendance session history (`sessions` + `lectures`), while mobile computed from student percentage report rows (`studentRows`). These are fundamentally different aggregations.
  2. **Different rounding**: The web used `Math.round(x * 100)` (whole numbers), while mobile used `calculateAttendancePercentage` from `@attendease/domain` which rounds to 2 decimal places via `Math.round(x * 10_000) / 100`.
- **Fix**: Removed the course-scoped session-based override entirely. The web now uses `reportOverview.summaryCards` attendance value for all paths — which is computed by `buildTeacherWebReportOverviewModel` using the same `studentRows` data and `calculateAttendancePercentage` function as the mobile app. Both platforms now display identical numbers.
- **Tests**: All 70 web tests pass — no regressions.

#### Teacher Web — Reports: Threshold Table UI Improvements & Email Sent Count (reports.ts, reports.models.ts, reports.service.ts, teacher-review-workflows-types.ts, teacher-review-workflows-reports.ts, teacher-reports-workspace.tsx)

- **Attendance column**: Removed redundant "attendance" text after the percentage (column header already says "Attendance"). Percentage is now color-coded: **red** (<50%), **yellow/warning** (50–74%), **green** (≥75%) for quick visual scanning.
- **Follow-up column**: Replaced static labels ("Immediate follow-up" / "Needs follow-up") with the actual number of follow-up emails sent to each student (e.g. "2 sent" or "None"). Data sourced from the `email_logs` table via a new `emailSentCount` field.
- **Full-stack change**:
  - Contract: Added `emailSentCount: z.number().int().nonnegative()` to `teacherStudentAttendancePercentageReportRowSchema`.
  - API: Added `LEFT JOIN LATERAL` on `email_logs` to count `SENT` emails per student in the student percentage report SQL query.
  - API models: Added `email_sent_count` to `TeacherStudentPercentageRow` and mapped to `emailSentCount` in `toTeacherStudentAttendancePercentageReportRow`.
  - Web types: Added `emailSentCount` to `TeacherWebReportStudentRowModel`.
  - Web builder: Mapped `emailSentCount` from contract row to web model.
  - Web UI: Color-coded attendance percentage, replaced follow-up pill with email sent count display.
- **Tests**: All 70 web tests pass — no regressions. Contract and web test fixtures updated with `emailSentCount`.

### Changed

#### Student Mobile — Courses Screen: Cleaner Live Session Banner (student-classrooms-screen.tsx)

- **Removed** redundant "Tap the highlighted course below to mark attendance" subtitle from the live session banner. Banner now shows only the session count.

#### Student Mobile — Classroom Detail Screen Cleanup (student-classroom-detail-screen.tsx, animated-styles.ts, shared-ui.tsx)

- **Reduced top banner space**: Decreased `GradientHeader` padding from `xxxl` (48px) to `lg` (16px) top/bottom for a more compact header.
- **Removed Reports tab**: Reduced from 4 tabs to 3 (Attendance, Posts, Schedule). Removed the entire `ReportsTabContent` function and all related imports/variables.
- **Removed attendance percentage banner**: The colored "53% Attendance" row below the stat chips is removed since the percentage is already displayed in the info strip above tabs.
- **Removed duplicate course code badge**: The course code pill above the attendance progress bar is removed since it's already shown in the main gradient banner.
- **Removed "View Detailed Report" link** from the Attendance tab (no longer applicable without Reports tab).

#### Student Mobile — Classroom Schedule: Google Calendar-Style Weekly View (student-classroom-schedule-screen.tsx, student-classroom-detail-screen.tsx)

- **Redesigned** the Schedule tab and standalone schedule screen to a Google Calendar-inspired weekly layout.
- Each day shows as a row: abbreviated day name + date number on the left, lecture event cards on the right with time range and location.
- Today's date is highlighted with a filled primary-color circle.
- **Week navigation**: chevron arrows to go to previous/next weeks; tapping the week label or "Back to this week" pill returns to the current week.
- Event cards use a left-border accent style: blue for regular slots, accent color for one-off exceptions.
- Cancelled slots (via schedule exceptions) are automatically hidden for the affected date.
- **Removed**: old week-grid calendar, flat "Weekly Plan" list, "Exceptions" card, and "Upcoming Lectures" card — replaced by the unified weekly view.
- Extracted reusable `WeeklyScheduleView` component from the schedule screen, shared by both the standalone screen and the classroom detail Schedule tab.
- **"Back to this week" pill**: Changed from primary blue to warm orange/amber for better visual distinction from the week navigation.
- **Weekend rows hidden**: Saturday and Sunday rows are automatically hidden when they have no scheduled classes, keeping the view compact.
- **"Free day" label**: Days with no classes now show a sun icon with italic "Free day" text instead of plain "No classes".

#### Teacher Mobile — Reports: Send Email Tab Replaces Subjects Tab (teacher-reports-screen-content.tsx, queries-reports.ts, teacher-operational-types.ts, teacher-operational-reports.ts)

- **Replaced** the "Subjects" tab with a new "Send Email" tab in the mobile Reports screen.
- Teachers can set an attendance threshold (default 75%), see all students below it sorted ascending by attendance %, select individual students or "Select All", toggle sending to students and/or parents, and send follow-up emails with one tap.
- Email uses a fixed template (not editable) matching the web app's `sendThresholdEmails` API contract.
- Confirmation dialog before sending; success/error feedback via native `Alert`.
- Added `studentParentEmail` to `TeacherStudentReportRowModel` and the report overview model builder so the email feature has access to parent email data.
- Added `useTeacherSendThresholdEmailsMutation` hook in `queries-reports.ts` wrapping `authClient.sendThresholdEmails`.
- Requires a classroom to be selected; shows a prompt if none is chosen.

#### Teacher Mobile — Reports Students Tab: Show Only Below-75% Students (teacher-reports-screen-content.tsx)
- Students tab now filters to only display students with attendance below 75%, sorted in ascending order of attendance percentage (lowest first).
- Removed the "Healthy" section (≥75% students) — the tab now focuses exclusively on students needing attention.
- Empty state message updated: shows "All students are above 75% attendance" when no students fall below the threshold.
- Search still works within the filtered below-75% list.

#### Teacher Mobile — Reports Trends: Horizontal Bar Chart Layout (teacher-reports-screen-content.tsx)
- Converted the "Attendance % per session" chart on the Reports → Trends tab from a vertical column chart (bars pointing upward, horizontally scrollable) to a horizontal bar chart (bars extending left-to-right, sessions stacked vertically).
- Each session is now a row: date label on the left, color-coded bar in the middle, percentage on the right.
- Vertical grid lines at 0%, 25%, 50%, 75%, 100% for visual reference.
- Eliminates horizontal scrolling — the chart fits within the screen width and scrolls vertically with the page.
- Same color coding (green ≥75%, orange 50–74%, red <50%), animation, and empty state preserved.
- Reversed y-axis date order to descending (newest sessions at top, oldest at bottom) for a natural reading flow.
- Moved the color legend (≥75%, 50–74%, <50%) from below the chart to above, between the title and the x-axis, for immediate context before scanning data.
- No external chart library — pure React Native View components.

### Added

#### Data Model — `parentEmail` on StudentProfile
- Added nullable `parentEmail` field to `StudentProfile` Prisma model, enabling future parent email notifications.
- Migration: `20260403054537_add_parent_email`.
- Admin student detail view (`adminStudentIdentityDetailSchema`) now includes `parentEmail`.
- All admin Prisma select queries updated to fetch `parentEmail`.

#### Teacher Web — Threshold Email Notification System (Full Compose Modal)
- Teachers can now email selected students **and/or their parents** directly from the Reports tab when viewing a specific classroom.
- **Compose Modal** (`ThresholdEmailComposeModal`) replaces the old simple confirmation panel:
  - **Recipient toggles**: "Email Students (N)" and "Email Parents (N)" checkboxes with counts.
  - **Missing parent email note**: Shows how many students lack a parent email on file when parent toggle is active.
  - **Customizable subject & body**: Pre-filled with default low-attendance template, fully editable by the teacher.
  - **Template variable hints**: Shows available `{{variables}}` (studentName, classroomTitle, subjectTitle, attendancePercentage, thresholdPercent).
  - **Live preview**: Renders a sample email using the first selected student's data so the teacher can see the final email before sending.
  - **Send & Cancel actions**: Send button calls the API; Cancel closes the modal without action.
- **Checkbox selection**: "Select All" header checkbox and per-row checkboxes in the "Students below threshold" table.
- **Parent email default template**: Added `defaultParentEmailTemplateSubject` and `defaultParentEmailTemplateBody` in `packages/email/src/templates.ts`, addressing the parent/guardian with appropriate language.
- Each send is logged to `EmailLog` for audit trails.
- **Backend**: New `POST /reports/send-threshold-emails` endpoint in `ReportsController`, backed by `EmailReminderService`:
  - Validates teacher ownership of the classroom.
  - Supports `emailStudents` and `emailParents` toggles — sends to student email, parent email, or both.
  - Uses teacher-customized subject/body with `{{variable}}` substitution via the existing `renderLowAttendanceEmail` engine.
  - Tracks `sentCount`, `failedCount`, and `skippedNoParentEmail` in the response.
- **Contracts**: New `sendThresholdEmailsRequestSchema` / `sendThresholdEmailsResponseSchema` in `packages/contracts/src/reports.ts`:
  - Request includes `emailStudents`, `emailParents`, `subject`, `body`, `thresholdPercent`, and a refinement ensuring at least one recipient type is selected.
  - Response includes `queuedCount`, `sentCount`, `failedCount`, `skippedNoParentEmail`.
- **Report row**: `studentParentEmail` field added to `teacherStudentAttendancePercentageReportRowSchema` and piped through to the web report model (`TeacherWebReportStudentRowModel`).
- **Config**: Email provider env vars (`EMAIL_PROVIDER_MODE`, `EMAIL_FROM_ADDRESS`, SES credentials) in `apiEnvSchema`.
- **Auth client**: New `sendThresholdEmails` method in `packages/auth/src/client.reports.ts`.
- **Worker**: Verified existing `EmailAutomationProcessor` is rule-specific; ad-hoc sends use direct API dispatch with `EmailLog` audit entries.
- **Future-ready**: `parentEmail` field is in place for admin management; parent email toggle in compose modal works end-to-end when parent emails are populated.

### Fixed

#### Teacher Web — Lecture Creation Date/Time Now Read-Only
- The "Date & time" field in the new lecture form was editable. Teachers should not manually set the date — it is auto-captured when the form opens.
- Replaced the editable `datetime-local` input with a read-only display styled in a muted/grey tone.

#### Teacher Web — Lecture Session Date Now Shows Session Time, Not Creation Time
- The sessions list previously displayed `lecture.createdAt` (when the lecture entry was created). Now shows `session.startedAt` (when attendance was actually taken), falling back to `createdAt` for lectures without a session.
- The lecture detail page now shows the creation timestamp ("Created ...") as supplementary info alongside the lecture date.
- The report chart x-axis also uses `startedAt` so dates in the chart match the sessions list.

#### Teacher Web — Reports "Attendance by Session" Chart Fixes
- **Incorrect data**: Lectures without an attendance session were plotted as 0%, skewing the graph. Now only sessions with actual attendance data appear.
- **Missing sessions**: Removed an overly aggressive filter that dropped sessions without both `startedAt` and `lectureDate`.
- **Date mismatch**: Chart was labeling points by `lectureDate` (scheduled date) instead of `startedAt` (when session ran), causing dates to not match the sessions tab.
- **Cluttered x-axis**: Removed year from labels, angled at -35°, all tick marks now visible.
- **Missing lecture names on hover**: Lectures without a title showed no name in the tooltip. Now falls back to "Session N · Date" so every point has a meaningful tooltip label.

#### Teacher Mobile — Reports: Replace Trends Session Cards with Bar Chart
- Removed the session-card list from the Trends tab in the Reports screen.
- Added a vertical bar chart showing attendance percentage per session, ordered chronologically (oldest to newest, left to right).
- Bars are color-coded by attendance tone (green ≥75%, yellow 50-74%, red <50%), with a legend below.
- Horizontally scrollable when many sessions exist; Y-axis gridlines at 0/25/50/75/100%.
- Built with pure React Native View components — no external chart library needed.

#### API — Schedule Slot Create: Handle Archived Slot Unique Constraint
- Adding a weekly slot that was previously archived (same day/time/duration) caused a 500 Internal Server Error due to a database unique constraint on `(courseOfferingId, weekday, startMinutes, endMinutes)`.
- The API now checks for an existing ARCHIVED slot with the same key and reactivates it instead of creating a duplicate row.

#### Teacher Mobile — Schedule: Checkbox Not Appearing in Edit Mode
- The "Apply changes to all instances" checkbox was not visible when editing an existing slot because React reused the same `SlotEditorModal` component instance when switching between add/edit modes. The `useState` initializers only ran on the first mount, so `existingSlot` was always `null`.
- Added a `key` prop to `SlotEditorModal` and `ExtraEditorModal` to force a full remount when the editor mode or target slot changes.

#### Teacher Mobile — Schedule: Replace Time Stepper with Scroll-Wheel Picker
- The +/- 15-minute stepper required 36 taps to go from 9 AM to 6 PM — extremely frustrating.
- Replaced with a dual-column scroll-wheel picker (hours 0-23 | minutes 0-59) with snap-to-item behavior, a center selection highlight band, and faded items above/below. Any time is now reachable by flicking the wheel — natural and fast.

#### Teacher Web — Reports Date Range Not Applied to Chart & Metrics
- The "Attendance by session" chart, average attendance, lecture count, and ring metrics ignored the From/To date filters because the `lecturesQuery` fetches all lectures without date params.
- Added client-side date filtering on the lectures array so the chart, summary cards, and ring metrics all respect the selected date range.

#### Teacher Mobile — Schedule: "Apply to All Instances" Checkbox for Slot Edit/Remove
- Added an "Apply changes to all instances" checkbox in the Weekly Slot editor modal (edit mode only, for server-persisted slots).
- **Checked (default)**: Save or Remove affects the recurring slot definition across every week — same as before.
- **Unchecked + Remove**: Creates a `CANCELLED` exception for that specific week's date only; the slot still appears on all other weeks.
- **Unchecked + Save**: Creates a `RESCHEDULED` exception for that specific week's date only; the recurring definition is untouched.
- Includes a scope hint text below the checkbox explaining the current selection's impact.
- Matches the web app's "Apply to all instances" behavior.

#### Teacher Web — Reports Layout: Remove Day-wise Trend & Fix Spacing
- Removed the "Day-wise trend" column from the Reports tab (redundant with the Sessions page).
- Removed the `twoColumn` wrapper that forced the students table into a narrow half-width with a large empty gap beside it.
- Students-below-threshold table now spans the full page width for a cleaner, tighter layout.

#### Teacher Web — Report Rings Reworked with Meaningful Metrics
- Ring charts were clipped and used fake denominators. Fixed by setting explicit widths per ring item.
- Replaced the three original rings with a meaningful three-ring layout:
  - **Average Attendance** (left) — percentage donut out of 100%.
  - **Session Modes** (center) — pie chart showing QR+GPS vs Bluetooth vs Manual session breakdown with a colour-coded legend beneath.
  - **Students below threshold** (right) — at-risk students out of total enrolled, dynamically labelled with the threshold value.
- Rings start from 12 o'clock (`startAngle: 90`) for a natural visual.
- Non-course-scoped views (global reports) fall back gracefully.

#### Teacher Web — Classroom Tab Content Bottom Spacing
- Added `paddingBottom: 48` to the children wrapper in the classroom detail layout so Sessions, Schedule, Announcements, and Reports tabs no longer feel cut off at the bottom.

#### Teacher Web — Classroom Cards Dark in Light Mode
- Classroom list cards had hardcoded dark-mode colors (`#1e1e2a`, `rgba(0,0,0,0.4)` shadows, etc.) that did not respect the light theme.
- Replaced all hardcoded values with CSS custom properties (`--ae-card-surface`, `--ae-card-border`, `--ae-card-shadow`, `--ae-card-glow`, `--ae-divider-gradient`) which are already defined for both light and dark themes in `globals.css`.

### Added

#### Teacher Web — "Reset to all-time" Button on Reports Date Filter
- When a From or To date is set in the Reports tab, a "Reset to all-time" button now appears inline, clearing both date fields back to the default unfiltered state.
- Applies to both the course-scoped (classroom-level) and global reports views.

#### Teacher Mobile — Schedule Calendar Overhaul (teacher-schedule-calendar.ts, teacher-classroom-schedule-screen-content.tsx, teacher-classroom-schedule-screen.tsx)
- Replaced the raw form-based schedule editor (minute-of-day TextInputs, manual "Save & Notify") with a Google Calendar-inspired week view.
- **New file `teacher-schedule-calendar.ts`**: Pure utility module with `WeekDate`/`CalendarEvent` types, `getWeekDates`, `getWeekRangeLabel`, `buildCalendarEvents`, `computeVisibleDays`, `computeVisibleHours`, `minutesToTimeLabel`, `durationLabel`, `DURATION_OPTIONS`, and calendar layout constants.
- **Week navigation bar**: Left/right arrows to browse weeks, a "Today" button (shown only when off-current-week), week range label (e.g. "31 Mar – 6 Apr 2026"), and live save status indicator (Saving…/Saved/Error).
- **Day header row**: Mon–Fri always visible; Sat/Sun appear only when events exist on those days. Today's column is highlighted with a circled date number.
- **Scrollable time grid**: Hour labels on the left gutter, horizontal grid lines, absolutely positioned event blocks in day columns, and a red current-time indicator line on the current week.
- **Three event styles**: Solid purple for weekly slots (shows time + venue), dashed purple border for extra lectures (shows "Extra" label), muted gray with strikethrough for cancelled instances.
- **FAB (+) button**: Opens a bottom-sheet type chooser — "Weekly Slot" or "Extra Lecture".
- **Full-screen editor modals**:
  - **Slot editor**: Multi-day circular toggle chips (add mode) / read-only day display (edit mode), TimeStepper (+/- 15 min), DurationChips (30min/45min/1hr/1.5hr/2hr), venue text input, time preview row, and two-step Remove confirmation.
  - **Extra lecture editor**: Date input, TimeStepper, DurationChips, venue input, reason input, preview row, and two-step Remove confirmation.
- **Auto-save pattern**: All editor actions (add/save/remove) immediately update the local draft and fire the save mutation — no manual "Save & Publish" step. Reuses existing `buildTeacherScheduleSaveRequest` for server-side diff computation.
- **Container restructured** (`teacher-classroom-schedule-screen.tsx`): Added `weekOffset`, `editorState` (union type), `saveStatus`, and `saveErrorText` state. Simplified callbacks (`onSlotSave`, `onSlotRemove`, `onExtraSave`, `onExtraRemove`) that handle draft mutation + auto-persist in a single step.

### Fixed

#### Teacher Web — Extra Lecture Slots Now Editable & Removable
- Extra (one-off) lecture slots on the calendar can now be edited by clicking the pencil icon, opening the same editor panel with pre-filled date, time, duration, venue, and reason.
- Added a Remove button with confirmation for extra lectures — performs a real server-side delete of the exception and its linked lecture (if no attendance data exists).
- No "Apply to all instances" checkbox for extra lectures since they are single-date events by nature.
- Added `exceptionDeletes` to the API contract (`SaveAndNotifyScheduleRequest`) and scheduling service to support deleting schedule exceptions.
- `buildScheduleSavePayload` now detects exceptions removed from the draft and emits `exceptionDeletes` operations.

#### Teacher Web — Schedule "Apply to All Instances" Scope Bug
- "Apply to all instances" when editing or removing a weekly slot was incorrectly matching **all days** that shared the same time (e.g. editing Wednesday 9 AM also changed Monday 9 AM).
- Now correctly scoped to the **same weekday only** — editing Wednesday's 9 AM slot with "all instances" checked updates every Wednesday 9 AM slot, leaving other weekdays untouched.
- Both save and remove paths in `handleSlotSave` / `handleSlotRemove` now include a `weekday` equality check alongside `startMinutes` and `endMinutes`.

#### Teacher Web — Schedule Single-Instance Remove Was Deleting From All Weeks
- Removing a slot without "Apply to all instances" was archiving the recurring slot entirely, deleting it from every week.
- Now creates a `CANCELLED` exception for only the currently viewed week's date, keeping the slot active on all other weeks.

#### Teacher Web — Schedule Auto-Save (Remove Draft/Publish Step)
- Removed the separate "Save & Publish" button from the schedule action bar.
- All schedule operations (add, edit, remove) now auto-save to the server immediately — no intermediate draft step.
- Refactored `SlotEditorPanel` to pass all new slots in a single batch call, eliminating the stale-closure bug with multi-weekday additions.
- A "Saving…" indicator appears in the action bar while the save is in progress.

### Added

#### Teacher Mobile — Profile Screen & Header Icon
- New `TeacherProfileScreen` accessible via a profile icon in the top-right corner of every teacher tab screen (Classrooms, Reports, Exports).
- Profile page displays the teacher's name, email, department, designation, and employee code with inline editing and save/reset controls.
- Sign-out button placed on the profile page — teachers can now sign out (previously impossible since the dashboard with sign-out was orphaned).
- `useTeacherUpdateProfileMutation` added to teacher queries for profile persistence.
- Profile route registered as a stack screen under `(teacher)/_layout.tsx` with a native back-arrow header.
- The 3-tab bar (Classrooms, Reports, Exports) is unchanged.

### Fixed

#### Teacher Mobile — Lecture Time Display & Default Date Fix (teacher-classroom-lectures-screen.tsx, shared-ui.tsx)
- **Problem 1**: Default "today" date used UTC (`new Date().toISOString().split("T")[0]`), which could be yesterday in IST between midnight and 5:30 AM.
- **Fix**: Compute local date using `getFullYear()`/`getMonth()`/`getDate()` instead of UTC-based ISO split.
- **Problem 2**: `lectureDate` was stored as `…T00:00:00.000Z` (midnight UTC). When displayed via `formatDateTime()` it showed "5:30 AM" in IST — a misleading time the teacher never set.
- **Fix**: Added `formatDateOnly()` helper; lectures without `actualStartAt`/`plannedStartAt` now display date-only (no time). `createdAt` is shown as a separate "Created …" line so the actual creation timestamp is always visible.
- **Problem 3**: Sorting used `lectureDate` which is the same for all lectures on the same day.
- **Fix**: Sort by `createdAt` descending so the newest lecture always appears first.

#### Teacher Mobile — Student List UI Overhaul (teacher-classroom-roster-screen-content.tsx)
- Removed status filter pills (All, Active, Pending, Blocked) — not relevant for teacher role.
- Removed Active/Paused status pill from each student row.
- Replaced action buttons with a compact circular trash icon per row.
- Each student is now a bordered card with avatar (alternating colors), name, identity, and remove icon.
- Moved "Add Student" toggle from inline button to a floating action button (FAB) at bottom-right.
- Simplified add form: removed Active/Pending status toggle (teachers always add as Active).
- Empty state shows contextual messaging based on whether a search is active.
- Animated student rows with staggered fade-in for a polished feel.

#### Teacher Mobile — Roster: Restrict Student Actions to Remove Only (teacher-roster-management.ts)
- Teachers on mobile can now only **Remove** students from a classroom.
- Status management actions (Mark Pending, Activate, Block) are reserved for admins only.

#### Teacher Mobile — Bluetooth Session Create Screen Infinite Loop (teacher-bluetooth-session-create-screen.tsx)
- **Root cause**: The `runPreflight` auto-start `useEffect` included `runPreflight` in its dependency array, but `runPreflight` was recreated every render because `createSession` (a dependency) depended on `createSessionMutation` which is a new object each render from `useMutation`. This caused an infinite loop of Bluetooth permission requests, freezing the "Starting Session" screen.
- **Fix**: Removed unstable dependencies (`createSessionMutation`, `queryClient`, `runPreflight`) from `useCallback`/`useEffect` dependency arrays. The `didCreate` ref already prevents re-entry, so the mount effect only needs `session` and `classroomId`.

#### Teacher Web — Schedule: Multi-Day Slot Only Saved for One Day (teacher-schedule-workspace.tsx)
- **Root cause**: `handleSlotSave` was called in a loop (once per selected weekday) by `SlotEditorPanel`, but it captured a stale React state closure. Each call did `setDraft({ ...draft, slots: [...draft.slots, slot] })` using the same old `draft`, so React's batched updates only kept the last weekday's slot.
- **Fix**: Switched all draft state updaters (`handleSlotSave`, `handleSlotArchive`, `handleExtraSave`) to use the functional form `setDraft(prev => ...)` so each sequential call in the loop sees the latest accumulated state.
- Selecting Mon+Tue+Wed now correctly adds all three slots to the draft.

### Changed

#### Teacher Web — Schedule Calendar: Date-Aware Week View with Navigation (teacher-schedule-workspace.tsx, weekly-slots-section.tsx)
- **Date-aware columns**: Day headers now show the actual date alongside the day name (e.g. "Mon / 31") with the current day highlighted. No longer a generic weekday template.
- **Week navigation**: Added `‹` / `›` arrow buttons in the calendar header to navigate between weeks, with a "Today" button that appears when viewing a non-current week. Displays the full week range (e.g. "31 Mar – 6 Apr 2025").
- **Removed "All Slots" summary list**: The redundant card below the calendar is gone — the calendar itself is the single interface for managing schedule entries.
- **Inline popover on click**: Clicking any calendar event opens an anchored popover with event details, "Edit" and "Remove" actions.
- **Correct removal semantics for weekly slots**:
  - "Only this week" → creates a CANCELLED exception for that specific date; the slot still repeats on all other weeks.
  - "All weeks (remove slot permanently)" → archives the weekly slot entirely so it no longer appears on any week.
  - One-off extra lectures remove directly without the two-option prompt.
- **Live draft calendar**: The calendar renders from draft state, so new/edited/cancelled/archived entries are reflected immediately before clicking "Save & Publish".

#### Teacher Web — Schedule Calendar: Smart Row/Column Hiding (weekly-slots-section.tsx)
- **Saturday & Sunday hidden by default**: The calendar only shows Mon–Fri unless there is a slot or event on Sat/Sun, then those columns appear automatically.
- **Time rows clipped to event range**: Empty hours above the earliest event and below the latest event are hidden. The calendar shows from 1 hour before the first slot to 1 hour after the last, keeping the view compact. When there are no events, a sensible 8 AM–6 PM default window is shown.

#### Teacher Web — Schedule: Edit Icon + Inline Editor Rework (weekly-slots-section.tsx, date-exceptions-section.tsx, teacher-schedule-workspace.tsx)
- **Removed the popover dialog**: Clicking a calendar event no longer opens a floating popover below it.
- **Pencil edit icon on events**: Each calendar event now shows a small pencil icon (top-right corner, appears on hover). Clicking it opens the full slot editor panel above the calendar.
- **"Apply to all instances" checkbox**: When editing a slot that has siblings (same time on other weekdays), a checkbox labeled "Apply to all instances" appears in the editor panel. When checked, saving or removing applies to all matching slots.
- **Remove confirmation**: The "Remove" button now requires a second click ("Confirm Remove") to prevent accidental deletions. A cancel option is also provided.
- **Save button in editor panel**: The Save button is directly in the editor panel — no separate save step needed for draft changes.
- **Simplified parent state**: Removed all popover-related state (`popoverEvent`, `popoverStage`) and callbacks from the parent workspace. The calendar grid now only emits `onEditEvent`.

#### Teacher Web — Announcements Tab UI Overhaul (teacher-stream-workspace.tsx)
- Removed the subtitle "Post an update visible to students or teachers only." from the compose card header — it was redundant.
- Compact compose card: smaller icon with accent gradient background, tighter header padding, single-row controls (visibility dropdown, notify checkbox, and post button all on one line).
- Improved empty state: shows "No announcements yet" heading with helpful subtitle instead of a large emoji.
- Cleaner announcement rows: title and body have better hierarchy; "Teachers only" visibility pill uses warning tone for contrast; author and date are spaced with separators.

#### Teacher Web — Classroom Detail Layout (layout.tsx)
- Merged the classroom header card and tab bar into a single visual block — removes the gap between them for a tighter, more cohesive look.
- Removed emoji icons from tab labels for a cleaner, more professional tab bar.
- Reduced heading size and spacing for a more compact header.
- Tab bar now sits inside the header card (separated by a subtle border) instead of floating separately.

#### Teacher Web — Sessions List Header (teacher-classroom-lectures-workspace.tsx)
- Tighter header: title and count on one line (count shown as subtle number beside "Sessions" heading).
- Smaller "New lecture" button for visual balance.

#### Teacher Web — Classrooms List Header (teacher-classroom-list-workspace.tsx)
- Tighter header: "Classrooms" title and count on one baseline, smaller "New classroom" button.
- Reduced top gap for a more compact page feel.

### Fixed

#### Teacher Web — Session Status Not Updating After Start/End (teacher-classroom-lectures-workspace.tsx, qr-session-shell.tsx)
- **Root cause 1 — Display logic**: The `hasSession` flag only recognized sessions that were either ACTIVE (live) or had `presentCount + absentCount > 0`. An ENDED session with zero attendance records was displayed as "Not taken" instead of "Completed".
  - Fix: `hasSession` now also checks for `status === "ENDED"`, so any completed session is recognized regardless of attendance count.
  - ENDED sessions with zero records now display a "Completed" pill alongside the attendance mode label.
- **Root cause 2 — Missing query invalidation**: After ending a session in the QR live view (`qr-session-shell.tsx`), only `sessionHistory()` was invalidated. The `classroomLectures(classroomId)` query was NOT invalidated, so the lecture's own status field remained stale.
  - Fix: The end mutation's `onSuccess` now also invalidates `classroomLectures(classroomId)` when the classroom ID is available, ensuring both session and lecture data refresh.

### Removed

#### Teacher Web — Session History Tab
- Removed the "Session History" tab from the teacher top navigation bar (`web-portal-navigation.ts`).
- Rationale: Per-classroom reports already exist under each classroom's "Reports" tab, making the standalone session history redundant and confusing.
- The `/teacher/sessions/history` route/page still exists for direct access but is no longer promoted in navigation.

### Changed

#### Teacher Web — Top Navigation Bar (web-shell.tsx)
- When a portal has only one nav item (now the case for the teacher portal), the top bar displays a clean "Teacher Portal" scope label instead of a nav links row with a single active pill.
- Provides a more focused, less cluttered header since Classrooms is the sole destination.
- Updated `web-portal.test.ts` to match the new single-item teacher navigation.

#### UI — Classroom Cards (teacher-classroom-list-workspace.tsx)
- Removed attendance mode labels (Bluetooth / QR + GPS) from teacher classroom list cards.
- Rationale: Attendance mode is a per-session property, not a classroom-level concern. Showing it on the card was misleading — a classroom can use different modes across sessions.

#### UI — Lecture Session Rows (teacher-classroom-lectures-workspace.tsx)
- Added attendance mode pill (QR + GPS / Bluetooth / Manual) to each lecture session row in the lectures tab.
- The pill appears alongside the attendance count and percentage for sessions that have been taken.
- Imported `formatTeacherWebAttendanceModeLabel` from `teacher-classroom-management.ts` to format the mode label consistently.

#### Mobile — QR + GPS Attendance Flow Rewrite (student-qr-attendance-screen.tsx, student-qr-attendance-screen-content.tsx)
- **Problem 1 — Race condition**: Camera was active while GPS was acquiring. Students could scan before GPS locked, and the QR token would expire during fallback GPS acquisition.
- **Problem 2 — Rolling QR codes**: QR tokens rotate every few seconds. An earlier approach (v2.0-alpha) stored the scanned QR payload and waited for GPS, but the token expired by the time GPS locked — making the store-and-wait pattern fundamentally broken for rolling codes.
- **Problem 3 — Stuck retry**: After a failure (e.g., distance too far), tapping "Retry" left the screen stuck on "Opening camera…" forever because the init effect had `[]` deps and never re-ran.
- **Problem 4 — Already marked**: If a student scanned QR for a session they already attended, the app showed a red error instead of a friendly confirmation.
- **Solution — GPS-gated scanning**:
  - Scanning is **completely blocked** until GPS is locked. `handleBarcodeScan` returns early if `preAcquiredLocation` is null — no QR data is stored or queued.
  - Camera is visible with a dark overlay ("Acquiring GPS… scanning will activate once locked") while GPS acquires, so students can aim but cannot process a scan.
  - Once GPS locks, the overlay disappears and scanning activates instantly.
  - GPS pre-acquisition retries up to 3 times (3s apart). Removed the old fallback GPS acquire path from the scan handler.
- **Solution — Retry fix**:
  - Replaced the `initStarted` ref with a `retryCount` state. Init effect depends on `[retryCount]`, so `setRetryCount(c => c + 1)` reliably re-triggers the full flow.
  - Added `cancelled` flag cleanup to prevent stale state updates during concurrent retries.
- **Solution — Already marked detection**:
  - `submitMark` detects HTTP 409 with "already been marked" message and sets `already_marked` phase instead of the generic error phase.
  - New `already_marked` UI: warning-tone checkmark icon, "Already Marked" heading, "Your attendance has already been recorded" message, and a "Done" button.
- **Navigation improvements**:
  - **Error screen**: "Scan Again" button (re-opens camera with fresh GPS) + "Go Back" button.
  - **Success screen**: "Done" button navigates back.
  - **Already Marked screen**: "Done" button navigates back.
  - **Permission-denied screens**: Added "Go Back" link below Retry/Settings buttons.
  - **`onGoBack` handler**: `router.canGoBack()` → `router.back()`, fallback to `studentRoutes.classrooms`.
- **Removed**: `pendingQrPayload` ref, `waiting_for_gps` phase, auto-submit effect, GPS timeout effect — all superseded by the GPS-gated approach.
- **Fix — GPS retries exhausted dead-end**: After all 3 GPS acquisition retries failed, the camera screen was left with a permanent dark overlay and no way out (no Go Back or Scan Again button). Now transitions to an error phase with "Could not acquire GPS" message + "Scan Again" and "Go Back" buttons + "Open Settings" shortcut (via `isLocationError` flag).
- **Fix — No exit from camera during GPS acquisition**: The camera screen had no "Go Back" link while GPS was acquiring. Students who opened the screen by mistake had to wait for retries to finish or use the hardware back button. Added a "Go Back" link below the camera.

#### Mobile — Classroom Detail Screen Redesign (student-classroom-detail-screen.tsx, shared-ui.tsx, student-workflow-models-helpers.ts)
- **Bug fix — Lecture time always showing "5:30 am"**: `lectureDate` is a date-only value (e.g. `"2026-03-27"`). `new Date("2026-03-27")` creates midnight UTC which renders as 5:30 AM in IST via `toLocaleString("en-IN")`. Added `formatDateOnly()` / `formatDateOnlyLabel()` helpers that use `dateStyle: "medium"` without `timeStyle`. Attendance records and lecture rows now use `startedAt`/`actualStartAt`/`plannedStartAt` for date+time display, falling back to `formatDateOnly(lectureDate)` when no time-component field is available.
- **Tab restructure — 6 options to 4 tabs**: The screen previously had 3 in-screen tabs (Overview, Posts, Attendance) plus 3 QuickNav tiles on the Overview tab (Schedule, Stream, Report) = 6 navigable destinations. Consolidated to 4 clean tabs: **Attendance** (default), **Posts**, **Schedule**, **Reports**. Removed the Overview tab, QuickNav tile row, and Stream link entirely.
- **Attendance tab (default)**: Live session banners (green "Attendance Marked" / red "N Live Session(s)"), stat chips (Total/Present/Absent), attendance percentage bar, scrollable record list with proper date formatting, and a "View Detailed Report" link that switches to the Reports tab.
- **Schedule tab (new inline)**: Weekly plan rows with day/time/location, schedule exceptions, and upcoming lectures — content extracted from the standalone schedule screen using `buildStudentScheduleOverviewModel` (data was already fetched).
- **Reports tab (new inline)**: Subject-level attendance report with large percentage display, progress bar, insight message, present/absent stat cards, and per-classroom breakdown cards. Uses `useStudentSubjectReportData` and `buildStudentAttendanceInsightModel`.
- **UI polish**: Tighter spacing throughout (12px padding → compact, 4px progress bars), smaller font sizes, `numberOfLines={1}` on all potentially long text, `flexShrink` for proper text wrapping, consistent use of `mobileTheme.spacing`/`mobileTheme.radius` tokens. Tab bar uses stacked icon+label layout with badge counts.

#### Mobile — "Attendance Marked" State for Live Sessions (student-classrooms-screen.tsx, student-classroom-detail-screen.tsx, + model/query layer)
- **Problem**: After a student successfully marked attendance via QR or Bluetooth, the app kept showing "ATTENDANCE LIVE — TAP TO MARK" (course list) and "Scan QR" / "Bluetooth" buttons (classroom detail). The live session API has no per-student `hasMarked` field, and the client never checked whether the student had already submitted.
- **Solution — Client-side join with attendance history**:
  - Added `isMarked: boolean` to `StudentAttendanceCandidate` and `hasMarkedAttendance` / `unmarkedCandidateCount` to `StudentCourseDiscoveryCardModel`.
  - `buildStudentAttendanceCandidates` now accepts an optional `markedSessionIds` Set and tags each candidate.
  - Added `useStudentGlobalHistoryQuery` to fetch unfiltered student history; `useStudentAttendanceOverview` builds a `markedSessionIds` Set from PRESENT records with `markedAt`.
  - **Course list**: Green "ATTENDANCE MARKED" banner strip on cards where all live sessions are marked; top summary banner shows "N sessions marked" instead of "N live sessions" when appropriate.
  - **Classroom detail**: Green "Attendance Marked" card (both Overview and Attendance tabs) replaces the red "Scan QR" card for marked sessions. Quick-info pill shows green "Marked" instead of red "N Live".
  - Both marked and unmarked cards can appear simultaneously if a classroom has multiple live sessions in different states.
- **Files**: `student-workflow-models-types.ts`, `student-workflow-models-attendance.ts`, `queries-core.ts`, `queries-attendance.ts`, `student-classrooms-screen.tsx`, `student-classroom-detail-screen.tsx`, `student-attendance.test-fixtures.ts`, `student-workflow-models.test.ts`.

### Fixed

#### Teacher Web — Expired Session Shows Stuck "Sign In" Page Instead of Redirecting (web-session.ts, shared.tsx, all page RSCs)
- **Problem**: When the session expired while the user was browsing, the web app would show "Sign in to load your classrooms." with the profile icon and shell still visible — a broken half-logged-out state. The user had to manually navigate to the login page.
- **Root cause**: During Next.js **soft navigation** (clicking between tabs), the **layout RSC is cached** and not re-executed. The layout's auth redirect only fires on full page loads. Meanwhile the page-level RSC re-runs, finds cookies expired, passes `accessToken: null` to the workspace, and the workspace shows a static "Sign in" card instead of redirecting.
- **Fix — two layers**:
  1. **Server-side (page RSC)**: Created `requireWebPortalSession(path)` in `web-session.ts` which reads the session and calls `redirect()` to the login page if it's null. Updated all 22+ teacher and admin page RSC files to use this instead of `getWebPortalSession()`. This catches both full page loads and soft navigation.
  2. **Client-side (safety net)**: Added `useAuthRedirect(accessToken)` hook in `shared.tsx` that does a hard `window.location.href` redirect to login if the token is null. Added to key workspace components (classrooms list, schedule) as defense-in-depth.
- Removed the dead "Sign in to load your classrooms" card from the classrooms workspace — if the token is missing, the user is redirected, not shown a stuck card.

#### Mobile — Expired Session Not Redirecting to Sign-In (student-session.tsx, teacher-session.tsx, admin-session.tsx)
- **Problem**: When a student/teacher/admin session token expired, the app showed a red error card ("Your student session expired. Sign in again…") on the current screen but stayed on the authenticated page. The navigation gate only checked whether a `session` object existed in memory, not whether the token was actually valid — so expired sessions were treated as "logged in."
- **Solution**: Added a **global query cache event listener** inside each session provider (`StudentSessionProvider`, `TeacherSessionProvider`, `AdminSessionProvider`) that subscribes to the React Query cache. When any query for that role fails with HTTP 401 (`AuthApiClientError` with `status === 401`), the listener automatically calls `signOut()` — clearing the session, removing cached queries, and resetting the draft. Because the session becomes `null`, the existing `resolveMobileRoleGate` in each `_layout.tsx` triggers a `<Redirect>` to the sign-in screen.
- **Why `useRef` for signOut**: The sign-out logic references current state (`bootstrap.defaultDraft`, `setSession`, etc.) which changes across renders. Using a mutable ref avoids stale closures in the long-lived cache subscription callback.
- **Scope**: Applies to all three roles (student, teacher, admin) consistently.

#### Mobile — Student Sign-in Device Binding Mismatch
- Fixed student login failure ("waiting for admin approval as replacement device") caused by mismatched device install ID between mobile `.env.local` and seeded DB data.
- Changed `EXPO_PUBLIC_STUDENT_DEV_INSTALL_ID` from `student-dev-install-01` to `seed-install-student-one`.
- Changed `EXPO_PUBLIC_STUDENT_DEV_PUBLIC_KEY` from `student-dev-public-key-01` to `seed-public-key-student-one`.
- These must match the values in `packages/db/src/scripts/seed-dev.ts` for local dev to work.

### Infrastructure — Local Development Stack
- Installed Colima + Docker CLI + Docker Compose via Homebrew for local container runtime (replacing Docker Desktop dependency).
- Configured `docker-compose.yml` services running locally:
  - **PostgreSQL 16** on `localhost:5432`
  - **Redis 7** on `localhost:6379`
  - **MinIO** (S3-compatible storage) on `localhost:9000` (console: `localhost:9001`)
  - **Mailpit** (email testing) SMTP on `localhost:1025`, UI on `localhost:8025`
- Ran all 14 Prisma migrations against local Postgres.
- Seeded development data (6 users, 2 classrooms, sample sessions, email rules, outbox events).
- Started NestJS API server on `localhost:4000`.
- Started BullMQ worker on `localhost:4010`.

### Configuration — Environment Files
- **apps/web/.env.local**: Changed `NEXT_PUBLIC_APP_URL` from Netlify production URL to `http://127.0.0.1:3000`. Changed `NEXT_PUBLIC_API_URL` and `WEB_INTERNAL_API_URL` from Render production to `http://localhost:4000`. Set `NEXT_PUBLIC_APP_ENV=development`.
- **apps/mobile/.env.local**: Changed `EXPO_PUBLIC_API_URL` from Render production to `http://192.168.29.11:4000` (Mac LAN IP for physical device access). Set `EXPO_PUBLIC_APP_ENV=development`. Fixed dev device credentials to match seeded DB.
- **apps/api/.env.local**: Added `http://192.168.29.11:3000` to `API_CORS_ALLOWED_ORIGINS` to allow mobile device connections during local dev.

### Documentation
- Created `CHANGELOG.md` — tracks all v2.0 changes with rationale.
- Created `docs/DEV_TO_PRODUCTION_GUIDE.md` — comprehensive guide documenting every local dev override, with exact values to restore for production deployment. Includes env variable tables (dev vs prod), infrastructure mapping, database notes, mobile connectivity setup, and a full production deployment checklist.

### Files Modified
- `apps/web/src/teacher-workflows-client/teacher-classroom-list-workspace.tsx` — removed mode label, added v2.0 comment
- `apps/web/src/teacher-workflows-client/teacher-classroom-lectures-workspace.tsx` — added mode pill per session row, added import and v2.0 comments
- `apps/mobile/src/student-foundation/student-qr-attendance-screen.tsx` — QR+GPS race condition fix: pendingQrPayload ref, waiting_for_gps phase, GPS retry loop (3x), auto-submit effect, 30s timeout safety net
- `apps/mobile/src/student-foundation/student-qr-attendance-screen-content.tsx` — waiting_for_gps UI, camera GPS overlay, contextual text, warning-level banner colors
- `apps/mobile/src/student-session.tsx` — global 401 auto-signout via query cache listener
- `apps/mobile/src/teacher-session.tsx` — global 401 auto-signout via query cache listener
- `apps/mobile/src/admin-session.tsx` — global 401 auto-signout via query cache listener
- `apps/mobile/src/student-workflow-models-types.ts` — added `isMarked` to candidate, `hasMarkedAttendance`/`unmarkedCandidateCount` to card model
- `apps/mobile/src/student-workflow-models-attendance.ts` — `markedSessionIds` param in candidate/card builders
- `apps/mobile/src/student-foundation/queries-core.ts` — added `useStudentGlobalHistoryQuery`
- `apps/mobile/src/student-foundation/queries-attendance.ts` — builds `markedSessionIds` Set in overview hook
- `apps/mobile/src/student-foundation/student-classrooms-screen.tsx` — green "ATTENDANCE MARKED" banner, partitioned live/marked counts
- `apps/mobile/src/student-foundation/student-classroom-detail-screen.tsx` — full redesign: 4-tab layout, inline Schedule/Reports, date format fix, removed Overview/QuickNav/Stream
- `apps/mobile/src/student-foundation/shared-ui.tsx` — added `formatDateOnly` helper
- `apps/mobile/src/student-workflow-models-helpers.ts` — added `formatDateOnlyLabel` helper
- `apps/mobile/src/student-attendance.test-fixtures.ts` — added `isMarked: false` to test candidates
- `apps/mobile/src/student-workflow-models.test.ts` — added `isMarked: false` to inline candidate fixtures
- `apps/web/.env.local` — switched to local API
- `apps/mobile/.env.local` — switched to local API (LAN IP), fixed device credentials
- `apps/api/.env.local` — added mobile CORS origin
- `CHANGELOG.md` — created and maintained
- `docs/DEV_TO_PRODUCTION_GUIDE.md` — created
