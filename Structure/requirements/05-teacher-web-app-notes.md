# Teacher Web App Notes

This companion note keeps detailed implementation and acceptance notes for the teacher/admin web requirements.

## Shared Visual And Copy Notes

- shared web typography, spacing, surface hierarchy, and CTA emphasis come from `packages/ui-web`
- teacher and admin sign-in surfaces explain role ownership clearly and avoid scaffold wording
- teacher portal chrome stays compact, with a left navigation rail and small account summary
- table, chart, and metric surfaces use concise product-facing labels
- product copy uses `Classroom`, `Course code`, `Roster`, `Students`, `Class session`, and `Attendance session`
- the screenshot-audit source of truth is `Structure/full-product-screenshot-audit.md` plus `Structure/artifacts/full-product-audit/web`

## Route-Level Workspace Notes

The current implementation already exposes these route-level workspace pages:

- `/login`
- `/register`
- `/admin/login`
- `/teacher/classrooms`
- `/teacher/classrooms/new`
- `/teacher/classrooms/:classroomId`
- `/teacher/classrooms/:classroomId/roster`
- `/teacher/classrooms/:classroomId/imports`
- `/teacher/classrooms/:classroomId/schedule`
- `/teacher/classrooms/:classroomId/stream`
- `/teacher/classrooms/:classroomId/lectures`
- `/teacher/sessions/start`
- `/teacher/sessions/active/:sessionId`
- `/teacher/sessions/active/:sessionId/projector`
- `/admin/semesters`
- `/admin/devices`
- `/admin/imports`

If a protected route is opened without a valid web session, the UI should render an explicit sign-in-required or role-required state instead of failing silently.

## Classroom Management Notes

- the teacher classroom list behaves like one classroom-management workspace
- cards keep `courseCode`, `classroomTitle`, teaching scope, attendance mode, join-code status, and route actions together
- the teacher create flow asks only for teaching scope, classroom title, course code, and attendance defaults
- classroom detail focuses on course settings, join-code reset, archive, QR handoff, and nearby classroom links
- the QR launch flow lives at `/teacher/sessions/start` and asks only for classroom, duration, allowed distance, and teacher browser location

## Session History And Correction Notes

- the teacher history route uses shared session, detail, and student-list data from the live attendance API
- corrections are saved through `PATCH /sessions/:sessionId/attendance`
- history filters stay on one page and support classroom, class, section, subject, status, mode, and date range
- session detail keeps present/absent lists, correction state, pending change count, and suspicious-attempt summary visible together
- manual corrections use grouped `Present students` and `Absent students` sections with `Mark present` and `Mark absent` actions

## Reporting Notes

- teacher web reports use one shared filter scope for course rollups, student follow-up rows, and day-wise trends
- the report page keeps `Open session review` and `Open exports` close to filtered output so teachers can move through review, correction, and export quickly

## Acceptance Expectations

This part of the app is successful when:

- the teacher and admin route groups are protected by auth-aware layout boundaries
- teacher-only sessions cannot open admin routes, and protected-route login handoff keeps next-path context intact
- login, teacher, and admin routes are stable and ready for later operational feature work
- dashboard, classroom, semester, session-history, reports, exports, analytics, email automation, devices, and imports routes bootstrap cleanly
- teacher classroom CRUD, semester management, roster, imports, schedule, stream, and admin device-support workflows are wired to the backend with explicit loading and error states
- the admin dashboard keeps student support, device recovery, imports, and semesters visibly separated
- the admin device area keeps student support and governance separate from guarded recovery actions
- the admin academic-governance area lets an admin search classrooms, review archive impact, and archive safely with a recorded reason
- active-session control and projector routes exist with stable boundaries for QR + GPS work
- a teacher can run a QR session from the browser and manage history, edits, reports, analytics, and email operations from the same web portal
