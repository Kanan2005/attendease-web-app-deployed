# AttendEase Requirements Document

## 1. Document Purpose

This document defines the top-level product requirements for **AttendEase**, a hybrid smart
attendance system for colleges. It is the root requirement baseline for product design,
architecture, data modeling, and implementation planning.

Use this file as the starting point, then move into the focused requirement files under
[`Structure/requirements`](./Structure/requirements/README.md).

## 2. Product Summary

AttendEase is a role-based attendance platform with:

- a **Student Mobile App** for attendance marking, classroom participation, history, and self-reports
- a **Teacher Mobile App** inside the same mobile binary for Bluetooth attendance, classroom operations, history, reports, and exports
- a **Teacher Web App** for QR + GPS attendance, richer classroom management, history, reports, exports, analytics, and low-attendance email tools
- an **Admin Web App** for support, device recovery, imports, and semester/classroom governance

The system must ensure that attendance can only be marked by eligible students who are physically
present within the allowed attendance boundary for the selected attendance mode.

## 3. Problem Statement

Traditional college attendance systems are vulnerable to proxy attendance, delayed updates, and weak
reporting. Teachers need a faster and more trustworthy way to run attendance, and institutions need
better visibility into attendance health and low-attendance follow-up.

AttendEase addresses this by combining:

- rolling QR codes
- GPS validation
- Bluetooth proximity
- manual correction with auditability
- cross-platform reporting and exports
- analytics and low-attendance automation on web

## 4. Product Goals

- Prevent or significantly reduce proxy attendance
- Support both classroom/projector attendance and on-the-go teaching situations
- Give students a short, reliable attendance-marking flow
- Give teachers a unified record of sessions, reports, and exports
- Give admins clear support and governance tools
- Keep manual correction possible, but controlled and time-bounded

## 5. Platform Model

AttendEase uses a shared TypeScript monorepo with:

- **Mobile app:** React Native
- **Web app:** Next.js / React
- **Backend API:** shared service layer for attendance truth, reports, exports, and governance

The product model is role-separated:

- student and teacher share one mobile binary but not one blended product experience
- teacher mobile owns Bluetooth attendance creation
- teacher web owns QR + GPS attendance creation
- admin remains login-only and web-only

## 6. Platform Scope

### 6.1 Student Mobile App

Students must be able to:

- register and sign in
- access enrolled classrooms
- mark attendance using QR + GPS sessions
- mark attendance using Bluetooth sessions
- view personal attendance history
- view personal attendance reports and percentages
- understand device-registration status in plain product language

### 6.2 Teacher Mobile App

Teachers must be able to:

- sign in and access a teacher-owned mobile experience
- start and end Bluetooth attendance sessions
- manage classrooms and classroom rosters
- review session history and session detail
- make manual attendance corrections within the allowed window
- access reports and practical exports

### 6.3 Teacher Web App

Teachers must be able to:

- sign in and register through dedicated teacher-web auth flows
- start and manage QR + GPS attendance sessions
- manage classrooms, schedules, rosters, announcements, and imports
- review history, reports, exports, analytics, and low-attendance email tools

### 6.4 Admin Web App

Admins must be able to:

- sign in through a dedicated admin-only login flow
- search student accounts
- review device state and support context
- perform guarded device recovery actions
- manage imports and semester/classroom governance

## 7. User Roles

### 7.1 Student

Students can:

- access only their own attendance information
- mark attendance only for eligible sessions
- view their own attendance history and report summaries

### 7.2 Teacher

Teachers can:

- manage attendance sessions for classrooms inside their assignment scope
- manage classroom and roster workflows where policy allows
- review reports and exports
- perform manual corrections inside the edit window

### 7.3 Admin

Admins can:

- support student account recovery and governance
- manage device recovery
- oversee imports and academic lifecycle actions
- preserve audit safety for high-risk actions

## 8. Core Functional Areas

The first release must cover:

- auth, roles, and enrollment mapping
- QR + GPS attendance
- Bluetooth attendance
- student attendance history and self-reports
- teacher history and manual corrections
- teacher reports and exports
- web analytics and low-attendance email automation
- device registration, one-device enforcement, and admin recovery

Detailed requirements for each area live in:

- [01-system-overview.md](./Structure/requirements/01-system-overview.md)
- [02-auth-roles-enrollment.md](./Structure/requirements/02-auth-roles-enrollment.md)
- [03-student-mobile-app.md](./Structure/requirements/03-student-mobile-app.md)
- [04-teacher-mobile-app.md](./Structure/requirements/04-teacher-mobile-app.md)
- [05-teacher-web-app.md](./Structure/requirements/05-teacher-web-app.md)
- [06-qr-gps-attendance.md](./Structure/requirements/06-qr-gps-attendance.md)
- [07-bluetooth-attendance.md](./Structure/requirements/07-bluetooth-attendance.md)
- [08-session-history-manual-edits.md](./Structure/requirements/08-session-history-manual-edits.md)
- [09-reports-exports.md](./Structure/requirements/09-reports-exports.md)
- [10-analytics-email-automation.md](./Structure/requirements/10-analytics-email-automation.md)
- [11-data-rules-audit.md](./Structure/requirements/11-data-rules-audit.md)
- [12-non-functional-requirements.md](./Structure/requirements/12-non-functional-requirements.md)

## 9. Required End-to-End Flows

The first release must support these flows end to end:

1. Teacher starts a QR + GPS attendance session on web, students mark on mobile, session appears in history and reports.
2. Teacher starts a Bluetooth attendance session on mobile, students mark on mobile, session appears in history and reports.
3. Student opens the app, signs in or registers, marks attendance, and sees updated personal history/report truth.
4. Teacher reviews a completed session and applies manual corrections inside the allowed edit window.
5. Admin reviews a student support case and, when needed, performs audited device recovery.

## 10. Core Business Rules

- A student can have at most one attendance record per session.
- QR + GPS sessions are created on teacher web.
- Bluetooth sessions are created on teacher mobile.
- Manual edits are allowed only until 24 hours after session end.
- Manual edits count the same as automatic attendance in user-facing reports.
- The low-attendance threshold for the current baseline is **75%**.
- One-device attendance enforcement must not regress to MAC-address-only identity.

## 11. Logical Data Entities

At minimum, the product requires:

- User
- Student Profile
- Teacher Profile
- Class / Section / Subject / Semester
- Classroom
- Enrollment / Roster Membership
- Attendance Session
- Attendance Record
- Manual Edit Audit Log
- Device Registration / Device Binding
- Email Automation Rule
- Email Log

These names are logical requirement entities and may map to different implementation records.

## 12. Acceptance Criteria Summary

The first release is functionally aligned when all of the following are true:

- a teacher can run a QR + GPS session from the web app
- a student can mark attendance only with a valid active QR and valid GPS position
- a teacher can run a Bluetooth session from the mobile app
- a student can mark attendance only when a valid nearby Bluetooth session is detected
- duplicate attendance for the same student/session is blocked
- teachers can manually add or remove attendance for up to 24 hours after session end
- teacher history, reports, and exports reflect corrected final truth
- students can view personal attendance history and report summaries
- admin support and device recovery flows are available through guarded admin web routes

## 13. Detailed Baseline Reference

The longer baseline catalog, including detailed mode requirements, non-functional requirements,
out-of-scope notes, and the original acceptance wording, now lives in
[requirement-baseline-reference.md](./requirement-baseline-reference.md).
