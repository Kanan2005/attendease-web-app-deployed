# AttendEase Validation And Manual Checks

## Current Reset Product State

The repo currently implements:

- separate student and teacher entry inside one shared mobile app
- student self-registration with one-device binding
- teacher self-registration on mobile and web
- teacher mobile classroom, roster, Bluetooth attendance, history, reports, and export flows
- teacher web classroom, QR + GPS attendance, history, reports, exports, analytics, and email automation flows
- admin web student support, device recovery, imports, and semester/classroom governance flows
- shared attendance truth across history, reports, exports, and manual corrections

## Still Outside Reset Completion

- real-device QR, GPS, and Bluetooth signoff
- production validation for Google OIDC, SES, Sentry, and OTEL

## Manual Verification Prep

- Use `pnpm manual:prepare` to boot the runtime, apply migrations, seed data, and verify health.
- Use `pnpm manual:mobile` for real phones on Wi-Fi.
- Use `pnpm manual:mobile:emulator` for Android emulator localhost-safe checks.
- Use `pnpm verify:mobile-reports` for a fast host-side report consistency check.

## Screenshot Audit

- Audit matrix: `pnpm audit:matrix`
- Mobile screenshots: `pnpm audit:screenshots:mobile`
- Web screenshots: `pnpm audit:screenshots:web`
- Source-of-truth audit report:
  - [Structure/full-product-screenshot-audit.md](/Users/anuagar2/Desktop/practice/Attendease/Structure/full-product-screenshot-audit.md)

## Seeded Dev Accounts

- student: `student.one@attendease.dev` / `StudentOnePass123!`
- teacher: `teacher@attendease.dev` / `TeacherPass123!`
- admin: `admin@attendease.dev` / `AdminPass123!`

## Related Docs

- [guide.md](/Users/anuagar2/Desktop/practice/Attendease/guide.md)
- [Structure/testing-strategy.md](/Users/anuagar2/Desktop/practice/Attendease/Structure/testing-strategy.md)
- [Structure/release-readiness-report.md](/Users/anuagar2/Desktop/practice/Attendease/Structure/release-readiness-report.md)
- [Structure/android-emulator-validation-report.md](/Users/anuagar2/Desktop/practice/Attendease/Structure/android-emulator-validation-report.md)
