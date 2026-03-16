# AttendEase Requirement Baseline Reference

This companion note keeps the long-form baseline requirement catalog that previously lived in the root requirement document.

## Recommended Platform Approach

### Recommendation

- **Mobile app:** React Native with TypeScript
- **Teacher web app:** Next.js / React with TypeScript
- **Project structure:** a monorepo with shared types, validation, API client, and business rules

### Why this is the best fit

- one language ecosystem across mobile and web
- strong support for camera/QR scanning, GPS/location, and BLE integrations
- faster sharing of business logic between platforms
- better fit for a teacher-facing dashboard and export-heavy web application than a web-only mobile compromise

### Alternative

Flutter is also valid for mobile, but the current baseline prefers React Native + Next.js because teacher web is a core product surface.

## Detailed Attendance Mode Requirements

### QR + GPS

Teacher web must allow the teacher to:

- select class, section, and subject scope
- configure a GPS validation radius
- configure session duration
- start and end a session
- display a rolling QR suitable for projector use
- show a live attendance counter

Student mobile must allow the student to:

- open Mark Attendance
- scan the active QR code
- submit GPS location for validation
- receive immediate success or failure feedback

Validation rules:

- session must be active
- QR token must be valid and unexpired
- student must be eligible for that class session
- student must be inside the allowed GPS radius
- student must not already have attendance recorded for that session

Anti-proxy controls:

- rolling QR codes that expire quickly
- time-limited attendance sessions
- GPS validation against the configured radius
- duplicate-submission rejection

### Bluetooth

Teacher mobile must allow the teacher to:

- select class/section/subject
- start a Bluetooth attendance session
- use BLE broadcasting only while the session is active
- end the session manually or automatically if duration is configured

Student mobile must allow the student to:

- open Mark Attendance in Bluetooth mode
- detect a valid nearby teacher BLE broadcast
- submit attendance when a valid session is detected
- receive immediate success or failure feedback

Validation rules:

- session must be active
- student must detect a valid teacher broadcast
- student must be eligible for that class session
- student must not already have attendance recorded for that session

Anti-proxy controls:

- physical proximity to the teacher device
- rotating BLE identifiers
- duplicate-submission rejection

## Student Attendance Experience

The student attendance experience must:

- stay short and easy to complete
- clearly separate QR + GPS and Bluetooth flows when needed
- request only the permissions required for the chosen mode
- show actionable error states for expiry, out-of-range, permission denial, invalid QR, Bluetooth unavailability, and duplicate marking

The student record area must show:

- attendance history by date
- subject/class context
- present/absent totals
- attendance percentage

## Manual Editing, History, Reports, And Exports

Teachers must be able to:

- manually add a student to attendance
- manually remove attendance
- browse session history
- open session detail and see full student status

Rules:

- manual edits are allowed only up to 24 hours after session end
- no edit reason is required in the teacher UX
- after 24 hours, the session is read-only
- reports and percentages treat manual edits as normal attendance

Basic reporting must include:

- day-wise rollups
- subject-wise rollups
- per-student attendance percentage

Basic exports must include:

- session-wise PDF
- session-wise CSV
- student-percentage CSV

## Web-Only Analytics And Email Tools

Teacher web analytics must provide:

- weekly and monthly trends
- attendance percentage distribution buckets
- class-wise and subject-wise comparisons
- student and session drill-downs
- attendance-mode usage analysis

Low-attendance email automation must support:

- manual send
- daily automatic mode
- preview and log visibility
- a fixed threshold of **75%** for the current baseline

Comprehensive web CSV export must include:

- student details
- session-wise attendance matrix
- totals
- attendance percentages
- subject-wise breakup

## Non-Functional Baseline

### Security

- authenticated access for student and teacher actions
- role-based authorization
- duplicate-submission protection
- secure transport for sensitive data

### Reliability

- no duplicate attendance records for the same student/session
- preserved session history and edit history
- reports and exports based on finalized attendance truth

### Performance

- attendance marking should complete quickly under normal conditions
- live teacher counters should update with minimal delay
- history, reports, and analytics should remain usable in real classroom conditions

### Usability

- mobile support on iOS and Android
- web support on modern desktop browsers
- short student attendance flow
- clear permission prompts and recovery guidance

### Auditability

The system should maintain internal logs for:

- session creation and end
- attendance submissions
- manual edits
- email sends and failures

## Out Of Scope

The current baseline does not define:

- biometric attendance
- parent-facing portal
- institution-wide admin workflows beyond current governance/support scope
- payroll integration
- timetable management
- fee management
- LMS integration

## Open Product Decisions In The Original Baseline

The original baseline left these open:

- exact enrollment/join mechanism
- whether the 75% threshold becomes configurable later
- exact GPS anchor definition
- exact QR rotation interval
- exact BLE broadcast/scanning strategy by platform
- whether session duration is always mandatory
- whether attendance can be cached offline temporarily
- whether roster changes after session creation affect historical absent counts

## Original Acceptance Summary

The baseline is aligned when:

- a teacher can run a QR + GPS session from the web app
- a student can mark attendance only with valid QR and valid GPS position
- a teacher can run a Bluetooth session from the mobile app
- a student can mark attendance only with a valid nearby Bluetooth session
- duplicate attendance is blocked
- teachers can manually add or remove attendance for up to 24 hours after session end
- past sessions, counts, and student statuses are visible on teacher web and teacher mobile
- basic exports work on teacher web and teacher mobile
- advanced analytics, email automation, and comprehensive CSV export work on teacher web
- students can view personal attendance history and percentage
