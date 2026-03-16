# AttendEase

AttendEase is a smart attendance platform with:

- one shared mobile app for students and teachers
- one teacher/admin web app
- one backend API
- one background worker

## Current Product State

The reset-track product implementation is complete through Prompt 40.

Implemented:

- split student and teacher entry inside one mobile app
- student self-registration with one-device binding
- teacher self-registration on mobile and web
- teacher mobile Bluetooth attendance ownership
- teacher web QR + GPS attendance ownership
- admin device recovery and governance
- shared attendance truth across history, reports, exports, and corrections

Still pending outside reset implementation:

- real-device QR, GPS, and Bluetooth signoff
- production validation for Google OIDC, SES, Sentry, and OTEL

## Current Reset Product State

- separate student and teacher entry inside one shared mobile app
- student self-registration with one-device binding
- teacher self-registration on mobile and web
- teacher mobile Bluetooth ownership
- teacher web QR + GPS ownership
- admin device recovery and governance
- shared attendance truth across history, reports, exports, and corrections

## Start Here

- Runtime and command reference:
  - [README-runtime-and-commands.md](/Users/anuagar2/Desktop/practice/Attendease/README-runtime-and-commands.md)
- Validation and manual-check guide:
  - [README-validation-and-manual-checks.md](/Users/anuagar2/Desktop/practice/Attendease/README-validation-and-manual-checks.md)
- Manual testing guide:
  - [guide.md](/Users/anuagar2/Desktop/practice/Attendease/guide.md)
- Codebase layout:
  - [Structure/codebase-structure.md](/Users/anuagar2/Desktop/practice/Attendease/Structure/codebase-structure.md)
- Implementation handoff:
  - [Structure/context.md](/Users/anuagar2/Desktop/practice/Attendease/Structure/context.md)
- Repo-wide cleanup tracker:
  - [Structure/line-count-cleanup-plan.md](/Users/anuagar2/Desktop/practice/Attendease/Structure/line-count-cleanup-plan.md)
