# AttendEase Requirements Structure

This folder breaks the main product requirement into smaller requirement documents by feature area and platform. The goal is to make each part of the app easier to design, estimate, and implement.

## How to Use This Folder

- Start with the root document: [`requirement.md`](../../requirement.md)
- Use the long-form baseline reference when you need the original detailed catalog: [`requirement-baseline-reference.md`](../../requirement-baseline-reference.md)
- Use this folder when defining detailed expectations for a specific module
- Treat these documents as area-specific requirement sheets
- Keep cross-cutting rules consistent across all files

## File Map

- `01-system-overview.md` - overall product scope, platforms, and shared product principles
- `02-auth-roles-enrollment.md` - account model, access rules, and enrollment expectations
- `03-student-mobile-app.md` - student-facing mobile app requirements
- `04-teacher-mobile-app.md` - teacher-facing mobile requirements
- `05-teacher-web-app.md` - teacher web portal requirements
- `06-qr-gps-attendance.md` - detailed QR + GPS attendance mode requirements
- `07-bluetooth-attendance.md` - detailed Bluetooth attendance mode requirements
- `08-session-history-manual-edits.md` - session history, session details, and edit window rules
- `09-reports-exports.md` - shared reporting and export requirements
- `10-analytics-email-automation.md` - web-only analytics and automated email requirements
- `11-data-rules-audit.md` - logical data model, business rules, and audit expectations
- `12-non-functional-requirements.md` - security, reliability, performance, privacy, and usability expectations

## Suggested Reading Order

1. `01-system-overview.md`
2. `02-auth-roles-enrollment.md`
3. Platform-specific files: `03`, `04`, `05`
4. Attendance engine files: `06`, `07`
5. Shared operations files: `08`, `09`
6. Web-only intelligence files: `10`
7. Cross-cutting system files: `11`, `12`

## Documentation Rule

If any detailed file conflicts with the root requirement, update both so the product definition remains aligned.
