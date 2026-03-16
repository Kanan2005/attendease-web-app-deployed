# AttendEase Final Tech Stack Appendix

Companion to: [`final-tech-stack-and-implementation.md`](./final-tech-stack-and-implementation.md)

## 11. QR + GPS Attendance Implementation

Detailed doc:

- `Structure/architecture/06-qr-gps-attendance.md`

Final decision:

- QR sessions are created only from teacher web
- rolling QR tokens are generated from session state plus signed time slices
- backend accepts current and previous slices to tolerate small clock drift
- GPS validation is server-side

## 12. Bluetooth Attendance Implementation

Detailed doc:

- `Structure/architecture/07-bluetooth-attendance.md`

Final decision:

- BLE attendance uses beacon-style advertising
- no pairing flow
- no classic Bluetooth dependency
- no JS-only BLE workaround as the core implementation

Native implementation uses Android `BluetoothLeAdvertiser` / `BluetoothLeScanner`, iOS `CBPeripheralManager` / `CBCentralManager`, and a shared React Native bridge in `apps/mobile/src/native/bluetooth`.

## 13. Attendance History and Manual Edit Implementation

Detailed doc:

- `Structure/architecture/08-session-history-manual-edits.md`

Final decision:

- snapshot the roster at session start
- create one attendance row per eligible student
- default all rows to `ABSENT`
- successful mark changes the row to `PRESENT`
- manual edits update final row state and create audit logs

## 14. Reports, Exports, and Student Self-Reports

Detailed doc:

- `Structure/architecture/09-reports-exports.md`

Final decision:

- backend owns report calculations
- student and teacher screens use different DTOs but the same underlying truth
- exports run only as async jobs

## 15. Analytics and Low-Attendance Email Automation

Detailed doc:

- `Structure/architecture/10-analytics-email-automation.md`

Final decision:

- analytics uses aggregate tables refreshed by worker
- charts are server-prepared, not browser-computed from raw rows
- low-attendance threshold starts at 75%
- manual email send and daily automation are both supported

## 16. Classroom Stream, Announcements, and Notifications

Detailed doc:

- `Structure/architecture/14-classroom-communications-and-roster.md`

Final decision:

- every classroom has a stream
- stream supports teacher announcements and generated schedule-update posts
- roster and schedule actions can optionally create notification events
- in-app notifications and email are baseline channels

## 17. Local Development Stack

Local environment uses:

- `pnpm`
- Docker Compose
- PostgreSQL container
- Redis container
- MinIO container
- Mailpit container

Mobile local workflow uses Expo dev builds, not Expo Go, for final native-sensitive validation.

## 18. Production Deployment

Final decision:

- containerize `web`, `api`, and `worker`
- deploy runtime services on AWS ECS Fargate
- use Amazon RDS PostgreSQL, ElastiCache Redis, S3, and SES

## 19. Testing Stack

Final decision:

- shared packages and pure domain logic: Vitest
- API integration and HTTP tests: Jest + Supertest
- React Native component tests: Jest + React Native Testing Library
- web E2E: Playwright
- mobile E2E: Detox

Phase-1 scaffold note:

- the current repo baseline implements the first layer only: Vitest-based package and app-shell tests plus workspace validation
- integration, component, and E2E harnesses are added in the phases that introduce the corresponding real surfaces

## 20. Observability and Support

Final decision:

- Sentry for app, web, and backend errors
- structured JSON logs
- OpenTelemetry-compatible traces
- queue metrics
- websocket metrics
- security-event metrics

## 21. Build Order

Implementation order:

1. monorepo setup with `pnpm` and `Turborepo`
2. shared config, contracts, and domain packages
3. auth, Google OIDC, and device registration foundation
4. semesters, classrooms, course offerings, and enrollments
5. schedule, lecture, roster, and announcement modules
6. QR + GPS attendance end-to-end
7. history, manual edits, and reports
8. Bluetooth attendance end-to-end
9. exports, analytics, and email automation
10. observability, hardening, and performance tuning

## 22. Explicitly Rejected Choices

The project intentionally rejects:

- plain React web app for iOS/Android delivery
- Flutter as the primary stack
- Firebase as the core system of record
- MAC-address-based account locking
- static QR tokens
- Bluetooth pairing as the attendance mechanism
- offline attendance as final truth
- Expo Go as the main development runtime

## 23. Source Basis

These decisions were aligned against official documentation and platform guidance:

- React Native environment guidance
- Expo prebuild, AuthSession, Camera, and Location docs
- Google OpenID Connect and OAuth guidance
- Next.js App Router docs
- NestJS auth and websocket docs
- Prisma PostgreSQL docs
- BullMQ and Socket.IO docs
- Android BLE advertiser docs
- Apple CoreBluetooth and DeviceCheck docs

## Final Note

This appendix holds the lower-level implementation and operations notes. The main stack decision file remains the short implementation baseline, the architecture folder holds domain detail, and the requirements folder holds the product expectations.
