# AttendEase Requirements Document

## 1. Document Purpose

This document defines the product requirements for **AttendEase**, a hybrid smart attendance system for colleges. The goal is to reduce proxy attendance by combining short-lived QR check-ins, GPS validation, and optional Bluetooth-based attendance sessions.

This requirement baseline is intended to guide product design, architecture, database design, API design, and phased implementation from scratch.

## 2. Product Summary

AttendEase is a role-based attendance platform with:

- a **Student Mobile App** for marking and tracking attendance
- a **Teacher Mobile App** within the same mobile application for Bluetooth-based attendance sessions, history, reports, and exports
- a **Teacher Web App** for QR+GPS attendance sessions, history, reports, exports, advanced analytics, and automated low-attendance email alerts

The platform must ensure that attendance can only be marked by students who are physically present near the teacher or in the approved classroom/campus zone.

## 3. Problem Statement

Traditional college attendance systems are vulnerable to proxy attendance, delayed updates, and weak reporting. Teachers often need a faster way to run attendance in class, while institutions need a more trustworthy way to verify physical presence and a better way to monitor low attendance.

AttendEase addresses this by:

- using **rolling QR codes** to prevent screenshot sharing
- validating **student GPS location** for QR sessions
- using **Bluetooth proximity** for teacher-led mobile sessions
- allowing teachers to review attendance history and basic reports on both mobile and web
- providing advanced analytics, automation, and email alerts on the web

## 4. Product Goals

- Prevent or significantly reduce proxy attendance.
- Support attendance taking in both classroom/projector and on-the-go teaching situations.
- Give students a simple and reliable attendance marking flow.
- Give teachers a unified record of sessions, attendance counts, reports, and exports.
- Provide web-based analytics and automation for identifying low-attendance students.
- Keep manual correction possible, but controlled and time-bounded.

## 5. Recommended Platform Approach

### Recommendation

For this project, the strongest option is:

- **Mobile app:** React Native with TypeScript
- **Teacher web app:** Next.js / React with TypeScript
- **Project structure:** a monorepo with shared types, validation, API client, and business rules

### Why this is the best fit

- One language ecosystem across mobile and web
- Strong support for camera/QR scanning, GPS/location, and BLE integrations
- Faster sharing of business logic between platforms
- Better fit for a teacher-facing dashboard and export-heavy web application than trying to force everything into one mobile-first codebase

### Important note

A standard React web app alone is **not** enough for iOS and Android delivery. For mobile, this should be treated as a **React Native app**, not just a browser-based React app.

### Alternative

Flutter is also a valid option for mobile, but for this product a React Native + Next.js combination is likely the more practical choice because the teacher web portal is an important part of the product and will benefit from the React ecosystem.

## 6. Platform Scope

### 6.1 Student Mobile App

The student mobile app shall allow students to:

- authenticate and access their student account
- join or access their assigned classes/subjects
- mark attendance using QR+GPS sessions
- mark attendance using Bluetooth sessions
- view personal attendance history
- view personal attendance counts and percentages

### 6.2 Teacher Mobile App

The teacher mobile experience shall exist within the same mobile application under a teacher role and shall allow teachers to:

- authenticate and access their teacher account
- start and end Bluetooth attendance sessions
- view session history
- view session-level attendance details
- manually edit attendance within the allowed edit window
- view quick/basic reports
- download or share basic exports

### 6.3 Teacher Web App

The teacher web app shall allow teachers to:

- authenticate and access their teacher dashboard
- start and manage QR+GPS attendance sessions
- view everything available on teacher mobile except Bluetooth session creation
- manually edit attendance within the allowed edit window
- view advanced analytics dashboards
- configure and run low-attendance email notifications
- access comprehensive exports

## 7. User Roles

### 7.1 Student

Students can:

- access their own attendance data only
- mark attendance during active sessions for classes they are eligible to attend
- view their own attendance history, counts, and percentages

### 7.2 Teacher

Teachers can:

- manage attendance sessions for their assigned classes/sections/subjects
- view student attendance lists for their sessions
- perform manual edits within the allowed time window
- access reports and exports
- use analytics and automation on the web

## 8. Core Functional Requirements

### 8.1 Account, Access, and Enrollment

The system shall:

- support at minimum **Student** and **Teacher** roles
- use role-based access so that students and teachers see different functionality
- allow the same mobile app to present the correct experience based on the logged-in user role
- ensure students can mark attendance only for classes/subjects in which they are enrolled or otherwise authorized
- ensure teachers can create sessions only for classes/sections/subjects assigned to them

The exact enrollment workflow is not yet defined. The final product may use join codes, admin assignment, bulk import, or institutional sync, but the system must support a clear mapping of students to class/section/subject combinations.

### 8.2 Attendance Mode A: QR + GPS Session

#### Teacher Web Requirements

The teacher web app shall allow a teacher to:

- select **class**, **section**, and **subject**
- configure a **GPS validation radius**
- configure a **session duration**
- start a session manually
- display a **rolling QR code** suitable for projector display
- show a live attendance counter as **marked / total**
- end the session manually before the configured duration if needed
- allow the session to end automatically when duration expires

#### Student Mobile Requirements

The student mobile app shall allow a student to:

- open a **Mark Attendance** flow
- scan the active QR code
- submit current GPS location for validation
- receive success or failure feedback immediately

#### Validation Rules

For a QR+GPS attendance mark to succeed:

- the session must be active
- the QR token must be valid and unexpired
- the student must be enrolled/eligible for that class session
- the student must be within the configured GPS radius
- the student must not already have attendance recorded for that same session

#### Anti-Proxy Controls

The QR+GPS mode shall include the following anti-proxy measures:

- rolling QR codes that expire quickly
- a time-limited attendance session
- GPS validation against the teacher-configured radius
- rejection of duplicate attendance submissions for the same student in the same session

### 8.3 Attendance Mode B: Bluetooth Session

#### Teacher Mobile Requirements

The teacher mobile app shall allow a teacher to:

- select the class/section/subject
- start a **Bluetooth Attendance Session**
- use BLE broadcasting only while the session is active
- end the session manually
- allow the session to auto-end if a duration is configured

#### Student Mobile Requirements

The student mobile app shall allow a student to:

- open the **Mark Attendance** flow in Bluetooth mode
- scan for a valid nearby teacher BLE broadcast
- submit attendance when a valid session is detected
- receive success or failure feedback immediately

#### Validation Rules

For a Bluetooth attendance mark to succeed:

- the session must be active
- the student must detect a valid teacher broadcast for that session
- the student must be enrolled/eligible for that class session
- the student must not already have attendance recorded for that session

#### Anti-Proxy Controls

The Bluetooth mode shall include the following anti-proxy measures:

- attendance requires physical proximity to the teacher device
- rotating BLE identifiers should be used so that static identifiers are not reusable
- duplicate attendance submissions for the same student in the same session shall be blocked

#### Platform Constraint

The product requirement is that Bluetooth attendance must operate **only during an active session**. On mobile operating systems, the app may request the user to enable Bluetooth, but it should not assume that the app can directly switch the phone's Bluetooth radio on or off without user action.

### 8.4 Student Attendance Experience

The student attendance marking experience shall:

- be simple enough to complete in a few steps
- clearly separate QR+GPS mode and Bluetooth mode when needed
- request only the permissions required for the selected attendance mode
- show actionable error states such as session expired, out of range, permission denied, invalid QR, Bluetooth unavailable, or already marked

The student personal record area shall show:

- attendance history by date
- subject/class context
- present/absent totals
- attendance percentage

### 8.5 Manual Attendance Editing

Manual attendance editing shall be available on **Teacher Web** and **Teacher Mobile**.

Teachers shall be able to:

- add a student to the attendance list manually
- remove a student from the attendance list manually

The following rules shall apply:

- manual edits are allowed only up to **24 hours after session end**
- no edit reason is required in the user experience
- after 24 hours, the session becomes read-only
- reports and attendance percentages shall treat manual edits as normal attendance
- the user experience shall not show a manual-vs-automatic attendance distinction

The system may still maintain an internal audit log for administrative traceability.

### 8.6 Session History

Session history shall be available on **Teacher Web** and **Teacher Mobile**.

Each session record shall show at minimum:

- date and time
- class/section/subject
- present count
- absent count

The system may also show the attendance mode used, but it is optional in the history UI and is not required to be emphasized in standard reports.

Teachers shall be able to open any past session and view:

- the full student list
- each student's attendance status for that session

### 8.7 Basic Reports

Basic reports shall be available on **Teacher Web** and **Teacher Mobile**.

The system shall provide:

- day-wise attendance rollups
- subject-wise attendance rollups
- per-student attendance percentage in a basic report view

### 8.8 Basic Exports

Basic exports shall be available on **Teacher Web** and **Teacher Mobile**.

The system shall support:

- **session-wise PDF export**
- **session-wise CSV export**
- **student list with attendance percentage as basic CSV**

On mobile, export access may be implemented as download, file save, or share action depending on platform capabilities.

### 8.9 Advanced Analytics Dashboard (Web Only)

The teacher web app shall provide an advanced analytics dashboard with:

- attendance trend by week
- attendance trend by month
- attendance percentage distribution buckets for above 90%, 75% to 90%, and below 75%
- class-wise comparisons
- subject-wise comparisons

The dashboard shall support filters for:

- class
- section
- subject
- date range

The dashboard shall support drill-down behavior:

- clicking a student opens that student's attendance timeline
- clicking a session opens the session list and summary stats

### 8.10 Attendance Mode Analysis (Web Only)

The teacher web app shall provide analysis of attendance mode usage, including:

- total number of QR+GPS sessions
- total number of Bluetooth sessions
- usage trends over time by mode

### 8.11 Low-Attendance Email Notifications (Web Only)

The teacher web app shall support email notifications for students whose attendance is below **75%**.

#### Manual Send

The teacher shall be able to:

- select class and/or subject scope
- select a date range
- preview the email
- trigger email sending to students below 75% in that scope

#### Automatic Mode

The teacher shall be able to:

- enable or disable daily automatic email reminders per class/subject
- choose the daily send time
- preview the email template
- view email logs with sent and failed status

The system shall:

- run a daily check for enabled class/subject rules
- send reminder emails to students below 75%
- continue sending daily reminders while the student remains below 75%
- stop sending reminders automatically once the student reaches or exceeds 75%

### 8.12 Comprehensive CSV Export (Web Only)

The teacher web app shall support a comprehensive CSV export across a selected time range.

The export shall include:

- student details
- session-wise attendance matrix
- totals
- attendance percentages
- subject-wise breakup

The export shall be downloadable as a single file.

## 9. Required End-to-End User Flows

### 9.1 Teacher QR Session Flow

The flow shall be:

1. Teacher selects class/section/subject on web.
2. Teacher sets GPS radius and session duration.
3. Teacher starts the session.
4. Rolling QR is displayed on projector/screen.
5. Students scan and submit GPS validation from mobile.
6. Live attendance count updates on the teacher web app.
7. Session ends manually or automatically.
8. Teacher may perform manual edits within 24 hours.
9. Session appears in history, reports, and exports on web and mobile.
10. Session contributes to analytics and automation on web.

### 9.2 Teacher Bluetooth Session Flow

The flow shall be:

1. Teacher selects class/section/subject on mobile.
2. Teacher starts a Bluetooth attendance session.
3. Student mobile app detects the valid teacher BLE session.
4. Eligible students mark attendance.
5. Session ends manually or automatically.
6. Teacher may perform manual edits within 24 hours.
7. Session appears in history, reports, and exports on web and mobile.
8. Session contributes to analytics and automation on web.

### 9.3 Student Flow

The student flow shall be:

1. Student joins or accesses their assigned class/subject.
2. Student opens **Mark Attendance**.
3. Student chooses or is directed to the correct attendance mode.
4. Student completes attendance via QR+GPS or Bluetooth.
5. Student views updated personal attendance history and percentage.

## 10. Business Rules

- A student shall have at most one attendance record per session.
- A session shall belong to one class/section/subject combination.
- QR+GPS sessions shall be created from the teacher web app.
- Bluetooth sessions shall be created from the teacher mobile app.
- Manual edits shall be allowed only until 24 hours after session end.
- Manual edits shall count exactly the same as automatically marked attendance in all user-facing reports.
- Attendance mode is available for analytics, but it is not required to be highlighted in standard reports.
- Low-attendance email threshold for this version is fixed at **75%**.

## 11. Data Entities

The system will require, at minimum, the following logical entities:

- **User**
- **Student Profile**
- **Teacher Profile**
- **Class**
- **Section**
- **Subject**
- **Enrollment**
- **Attendance Session**
- **Attendance Record**
- **Manual Edit Audit Log**
- **Email Automation Rule**
- **Email Log**

These entity names are logical requirements and may later be refined during database design.

## 12. Reporting and Calculation Definitions

- **Present count**: total students marked present for a session
- **Absent count**: total eligible students for the session minus present count
- **Attendance percentage**: present sessions divided by total eligible sessions for the selected reporting scope

Manual attendance edits shall affect totals and percentages exactly as normal attendance.

## 13. Non-Functional Requirements

### 13.1 Security

The system shall:

- use authenticated access for all student and teacher actions
- enforce role-based authorization
- protect attendance APIs against duplicate submission and invalid session access
- transmit sensitive data over secure channels

### 13.2 Reliability

The system shall:

- prevent duplicate attendance records for the same student and session
- preserve session history and edit history accurately
- ensure exports and reports are generated from the latest finalized attendance data

### 13.3 Performance

The system should:

- allow attendance marking to complete quickly under normal network conditions
- update the teacher live count during active QR sessions with minimal delay
- render history, reports, and analytics in a practical time for real classroom use

### 13.4 Usability

The system shall:

- work on both iOS and Android for mobile users
- support modern desktop/laptop browsers for the teacher web app
- keep the student attendance flow short and easy to understand
- provide clear permission prompts and recovery guidance for camera, location, and Bluetooth access

### 13.5 Auditability

The system should maintain internal logs for:

- session creation and session end
- attendance submissions
- manual attendance edits
- email sends and failures

These logs are for system integrity and support; they do not need to be exposed as primary UX unless explicitly required later.

## 14. Out of Scope for This Requirement Baseline

The following items are not defined as part of the current baseline unless added later:

- biometric attendance
- parent-facing portal
- institution-wide admin workflows
- payroll integration
- timetable management
- fee management
- LMS integration

## 15. Assumptions and Open Product Decisions

The following points are not fully specified yet and should be finalized during product design:

- the exact enrollment/join-class mechanism
- whether teachers can configure the low-attendance threshold in the future or whether 75% remains fixed
- the exact GPS anchor definition for QR+GPS validation, such as fixed classroom coordinates, campus zone coordinates, or teacher-selected live location
- the exact QR rotation interval
- the exact BLE broadcast/scanning strategy by platform
- whether session duration is mandatory for every session or optional with manual end
- whether attendance can be cached offline temporarily if the network is unstable
- whether roster changes after session creation should affect absent-count calculations for historical sessions

## 16. Acceptance Criteria Summary

The first release shall be considered functionally aligned with this requirement document when all of the following are true:

- a teacher can run a QR+GPS session from the web app
- a student can successfully mark attendance only when scanning a valid active QR and being within the allowed GPS radius
- a teacher can run a Bluetooth session from the mobile app
- a student can successfully mark attendance only when detecting a valid nearby Bluetooth session
- duplicate attendance submission for the same student/session is blocked
- teachers can manually add or remove attendance for up to 24 hours after session end
- past sessions, counts, and student statuses are visible on teacher web and teacher mobile
- basic exports work on both teacher web and teacher mobile
- advanced analytics, email automation, and comprehensive CSV export work on teacher web
- students can view their personal attendance history and percentage

## 17. Conclusion

AttendEase is a multi-platform attendance system focused on trustworthy in-person verification, teacher efficiency, and actionable reporting. The product should be built with a strong shared mobile/web architecture, with QR+GPS as the primary mode, Bluetooth as the secondary proximity mode, and web as the analytics and automation center.
