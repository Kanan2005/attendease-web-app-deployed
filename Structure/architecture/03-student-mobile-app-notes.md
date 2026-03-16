# Student Mobile App Implementation Notes

Companion to: [`03-student-mobile-app.md`](./03-student-mobile-app.md)

## Join Classroom Flow

Student classroom membership is not hardcoded only through admin provisioning.

Recommended flow:

1. student opens `Join Classroom`
2. enters class or join code
3. app calls `POST /classrooms/join`
4. API validates active join code, eligibility rules, semester status, and duplicate membership
5. classroom list refreshes and schedule or stream becomes visible

Current backend status:

- `POST /classrooms/join` is live for student self-join
- `GET /students/me/classrooms` refreshes membership
- the join screen uses a shared join-banner model for pending, success, and failure feedback
- duplicate joins, expired codes, blocked memberships, dropped memberships, closed semesters, and completed classrooms are rejected before local state updates

## Mark Attendance Flow Architecture

The mark-attendance screen is the entry point. It should:

- let the student choose QR or Bluetooth when both are available
- redirect into the required permission flow
- send the final validation request only after required device signals are available

Current implementation status:

- `apps/mobile/src/student-foundation.tsx` exposes a student attendance overview hook plus a mode-specific attendance controller
- `apps/mobile/src/student-attendance.ts` owns the reusable controller contracts
- the QR route attaches the real `POST /attendance/qr/mark` call, location capture, and QR-specific banner mapping
- the Bluetooth route attaches the BLE scanner boundary, `POST /attendance/bluetooth/mark`, readiness checks, and Bluetooth-specific error mapping

## Device Trust and Blocked Attendance Architecture

The mobile app has a dedicated trusted-device layer in `apps/mobile/src/device-trust.ts`.

Current responsibilities:

- build a device registration payload for the signed-in install
- expose placeholder attestation provider descriptions for Android and iOS
- call `POST /devices/register`
- call `GET /devices/trust/attendance-ready` before attendance-sensitive actions
- map blocked trust states into student-facing UX messages
- preserve the lifecycle-state labels returned by the backend

The dedicated device-status screen now shows both the coarse trust state and the student-specific lifecycle state, including `Trusted`, `Pending approval`, `Replaced`, `Blocked`, and `Unregistered`.

## QR Scan Flow

### Mobile Client Steps

1. choose the active attendance session
2. open the camera scanner or paste the live QR manually
3. decode or enter the QR payload
4. request current location only at the location step
5. build the request with QR payload, coordinates, accuracy, and timestamp
6. call `POST /attendance/qr/mark`
7. show concise success or failure state
8. invalidate student history, classroom, and summary queries

Current implementation status:

- the route is live and uses real trusted-device checks plus shared live-session candidates from `GET /sessions/live`
- Expo Camera is the scanner seam and Expo Location is the GPS seam
- expired QR, invalid QR, session-closed, duplicate, low-accuracy GPS, and out-of-range failures map to dedicated banners
- the web preview keeps manual QR payload entry so the route can still be exercised in exported builds

## Bluetooth Scan Flow

### Mobile Client Steps

1. open Bluetooth attendance
2. confirm Bluetooth is available
3. start foreground BLE scan
4. let the student choose the nearby teacher session if more than one is visible
5. submit the detected rotating identifier to `POST /attendance/bluetooth/mark`
6. show a concise result state
7. invalidate history and summary queries

Current implementation status:

- the Bluetooth route is live and uses the same trusted-device and live-session foundations as QR
- it shares the permission and result-banner controller contract with QR
- it surfaces explicit states for Bluetooth unavailable, Bluetooth off, scan in progress, nearby teacher found, and multi-session selection
- expired, invalid, session-closed, duplicate, and blocked-device outcomes stay in dedicated Bluetooth banners

## Permissions Architecture

Permissions are requested only when needed. The intended orchestration seam remains `services/permissions/permissionOrchestrator.ts`, with user-facing translation layered above camera, location, and Bluetooth permission results.

## Student Reports Architecture

Students need readable report surfaces, not raw history rows.

Current implementation status:

- the app uses `GET /students/me/reports/overview`, `GET /students/me/reports/subjects`, `GET /students/me/reports/subjects/:subjectId`, and `GET /students/me/history`
- the report overview leads with plain-language attendance insight plus totals
- subject detail surfaces classroom-level totals, present or absent counts, and last recorded session
- ready, loading, no-session, and no-history states are centralized in shared route helpers

## Classroom Stream and Schedule Views

Student classroom detail supports:

- announcement stream
- class schedule/calendar
- lecture or session list
- quick entry into attendance when applicable

Current implementation status:

- detail, schedule, and lecture reads use shared classroom endpoints with enrollment-scoped backend access
- active join codes are hidden from student detail responses

## Profile and Account Management

The student profile supports:

- safe profile display fields
- institutional identity visibility
- logout
- device binding status

Current implementation status:

- live auth identity plus safe local-only editable fields for display name and preferred short name
- institutional identifiers, role, email, and device-binding trust state remain read-only until the profile API expands
- the profile summary emphasizes joined classrooms and attendance-device trust

## Device Trust UX

Because attendance integrity depends on device binding, the app should make device state understandable.

Expected UX includes:

- first login may show that the device is being linked
- another-student login attempt on the same phone should block attendance
- students can see whether the device is trusted, pending review, or revoked
- support messaging explains how to request a device change

## Error Handling, Offline, and Security

The student app uses shared error mapping so session expiry, duplicate marks, permission denial, GPS failure, and Bluetooth failure stay consistent across screens.

Accepted offline behavior:

- cached history
- cached last-known summary
- cached classroom stream and schedule
- queued navigation into mark flow

Not accepted:

- offline attendance submission as final truth

Security expectations:

- refresh tokens only in secure storage
- no raw GPS logging
- no long-lived BLE identifier storage
- transient scan data cleared when a screen unmounts
- attendance actions blocked from untrusted or mismatched devices

## Testing Strategy

Current implementation status:

- mobile unit coverage explicitly covers route helpers, dashboard and join/report history state builders, attendance permission and banner helpers, query invalidation keys, attendance candidate selection, schedule shaping, and subject-report shaping

## Implementation Outcome

When this architecture is complete:

- students can mark attendance with either supported mode
- the app gives fast, clear feedback
- the app safely handles permissions and device capabilities
- students can join classrooms, view schedules, stream updates, and read reports
- untrusted-device attendance abuse is blocked in both the mobile UX and backend
