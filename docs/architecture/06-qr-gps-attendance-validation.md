# QR + GPS Attendance Validation

This companion note keeps the validation and rollout details for the main QR + GPS architecture doc.

## Testing Strategy

The current backend core now has dedicated automated coverage for:

- rolling QR issuance and slice-window validation
- tamper detection and session mismatch rejection
- GPS anchor resolution
- GPS radius and accuracy rejection
- QR session creation with roster snapshot records
- successful attendance mark with counter updates, audit rows, outbox rows, and realtime seam calls
- duplicate mark rejection
- expired token rejection
- future-slice rejection
- low-accuracy GPS rejection
- out-of-radius rejection
- suspicious-location `security_events` without counter corruption
- auto-expiry during student mark attempts with session-state publish
- session-end rejection after the session closes

Current test files:

- `apps/api/src/modules/attendance/qr-token.service.test.ts`
- `apps/api/src/modules/attendance/gps-validator.service.test.ts`
- `apps/api/src/modules/attendance/location-anchor.service.test.ts`
- `apps/api/src/modules/attendance/qr-attendance.integration.test.ts`
- `apps/mobile/src/student-attendance.test.ts`
- `apps/web/src/web-workflows.test.ts`

Current automated coverage is unit plus integration coverage only; browser and device verification are still manual until later E2E phases land.

## Implementation Outcome

When this architecture is complete:

- teachers can run rolling QR projector sessions
- students can only mark while within the valid time and location window
- live count updates correctly on teacher web
