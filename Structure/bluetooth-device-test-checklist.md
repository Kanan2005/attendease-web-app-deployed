# Bluetooth Device Test Checklist

Use this checklist before calling the Bluetooth attendance phase production-ready on mobile.

## Teacher Device Scenarios

- Android teacher: create a Bluetooth session, confirm advertiser starts, confirm present count can update while the screen stays foregrounded.
- Android teacher: turn Bluetooth off during an active session and verify recovery messaging appears without leaving the active-session route.
- Android teacher: force an advertiser start failure or deny the required permission and verify retry guidance is shown.
- Android teacher: stop the advertiser, retry broadcast, then end the session and confirm the backend session closes cleanly.
- Android teacher: simulate a temporary network problem during end-session and verify the route offers retry instead of silently abandoning the session.
- iOS teacher: create a Bluetooth session, confirm advertiser starts, and verify the active-session route shows the current payload and session status.
- iOS teacher: turn Bluetooth off during an active session and verify the app shows recovery guidance and does not pretend the session is still broadcasting.
- iOS teacher: end the session and verify the advertiser stops immediately plus the backend session is no longer markable.

## Student Device Scenarios

- Android student: open Bluetooth attendance, verify trusted-device readiness, scan nearby sessions, select one detection, and mark attendance successfully.
- Android student: verify duplicate mark attempts are blocked with a clear banner and do not increment counts again.
- Android student: verify Bluetooth-disabled state shows the correct guidance before scanning starts.
- Android student: verify invalid or expired BLE payload attempts map to the expected error banner and do not create a present mark.
- iOS student: open Bluetooth attendance, verify scan results appear while the app stays foregrounded, and mark attendance successfully.
- iOS student: verify detected-session selection still works when multiple nearby payloads are visible.
- iOS student: verify blocked-device or missing trusted-device state stops attendance before BLE submission.

## Cross-Device Validation

- Teacher and student should both stay in the foreground during the test because v1 Bluetooth attendance is foreground-only by design.
- Use a real local API and database stack so session counters, security events, and attendance history reflect the BLE test run.
- Confirm suspicious invalid or mismatched BLE attempts create `ATTENDANCE_BLUETOOTH_VALIDATION_FAILED` security events without changing attendance truth.
- Confirm ending a session blocks later BLE mark attempts even if a student still has an old payload cached.
