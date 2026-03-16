# AttendEase Android And Troubleshooting Guide

## One-Time Prep

```bash
pnpm manual:info
pnpm manual:prepare
```

After that, verify:

- web on `localhost:3000`
- API on `localhost:4000`
- worker healthy

## Emulator Path

- Preferred command:
  - `pnpm manual:mobile:emulator -- --device emulator-5554 --port 8101`
- Use this when you want localhost-safe emulator validation with `adb reverse`.

## Real Phone Path

- Preferred command:
  - `pnpm manual:mobile`
- Use this for the real phone on the same Wi-Fi network as the dev machine.

## Native Android Validation

- Help:
  - `pnpm android:validate:help`
- Example:
  - `pnpm android:validate -- -d emulator-5554 --port 8083 --no-install`

## Real-Device Attendance Reality

- Emulator can prove route flow, session gating, and most UI states.
- Emulator cannot be final signoff for:
  - QR camera behavior
  - GPS radius accuracy
  - Bluetooth advertiser/scanner trust

## Troubleshooting

- If the website does not open:
  - check `pnpm runtime:check`
  - check `http://localhost:3000/health`
- If mobile cannot reach the API:
  - confirm API health at `http://localhost:4000/health`
  - confirm you used the correct launch path for emulator vs real phone
- If Expo Go cannot open the project:
  - prefer the native/emulator path instead of Expo Go for device-sensitive flows
- If PostgreSQL port `5432` is busy:
  - override `DATABASE_URL` or use another published port

## Related Files

- [README.md](/Users/anuagar2/Desktop/practice/Attendease/README.md)
- [README-runtime-and-commands.md](/Users/anuagar2/Desktop/practice/Attendease/README-runtime-and-commands.md)
- [README-validation-and-manual-checks.md](/Users/anuagar2/Desktop/practice/Attendease/README-validation-and-manual-checks.md)
- [Structure/android-emulator-validation-report.md](/Users/anuagar2/Desktop/practice/Attendease/Structure/android-emulator-validation-report.md)
- [Structure/release-readiness-report.md](/Users/anuagar2/Desktop/practice/Attendease/Structure/release-readiness-report.md)
