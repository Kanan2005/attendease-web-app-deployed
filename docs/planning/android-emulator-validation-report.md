# AttendEase Android Emulator Validation Report

Last updated: 2026-03-15  
Status: `COMPLETE_FOR_EMULATOR_SCOPE`

This file records evidence from the Android emulator validation plan. Prompt 1 established tooling and runtime baseline. Prompt 2 completed deterministic student and teacher functional regression checks inside Expo Go. Prompt 3 completed hostile-state, permission, and recovery checks where the emulator is practical. Prompt 4 completed the practical native Android debug-build path on the emulator, including a real `expo run:android` build, install, and launch. This emulator pass still does not replace real-device QR, GPS, or Bluetooth validation.

## Environment And Tooling Status

Status: `PASS`

- `adb` is available and reports a healthy Android SDK installation.
- Android emulator tooling is available and the `Pixel_9_Pro_XL` AVD is present.
- a connected emulator was detected and confirmed as `Pixel_9_Pro_XL`
- Expo Go is installed on the emulator and the local Android SDK env is usable
- emulator proxy settings were clear for local testing

## Emulator Baseline

Status: `PASS` with caveats

- Docker-backed local runtime health was good enough for emulator validation.
- `pnpm manual:info` produced the expected LAN IP and API URL.
- `apps/mobile/.env.local` remained aligned to the LAN API URL used by the emulator.
- a fresh Expo Metro launch path worked for the functional pass.
- Expo Go accepted the app URLs used in the functional sweep.
- the earlier render blocker from Prompt 1 did not reproduce on the current Metro session.

Important caveats:

- bare Expo URL launches can reopen the last route Expo Go had in memory, so they are not deterministic evidence for a specific screen
- deterministic route checks worked best with raw Expo Router group paths
- encoded group paths are not reliable in Expo Go

## Functional Regression Checks

Status: `PASS` with caveats

These checks prove route rendering, bootstrap auth, and live API-backed screen loading on the Android emulator. They do not prove camera, GPS, Bluetooth radio, or native-build behavior.

### Student Android Flows

Status: `PASS`

- app open and bootstrap login were verified against the student route group
- dashboard evidence included the student dashboard title, welcome copy, active classrooms, and trusted-device state
- profile, device-status, classroom detail, classroom stream, and classroom schedule routes all rendered with expected seeded data

### Teacher Android Flows

Status: `PASS`

- teacher bootstrap login and dashboard were verified against the teacher route group
- classroom navigation, roster entrypoints, schedule, announcements, session history, reports, and exports routes all rendered with expected seeded data

### Functional Caveats

- this pass verified route rendering and visible controls, not every write action from inside the emulator UI
- those write paths were exercised in the host-side release-readiness checks and remain documented in [`release-readiness-report.md`](./release-readiness-report.md)
- real-device QR, GPS, and Bluetooth behavior remains outside emulator scope

## Pass/Fail/Blocker Summary

- `PASS`: Android tooling availability, Docker runtime health for emulator-backed API calls, Expo Metro startup on LAN, and Expo Go route-launch handling
- `PASS`: deterministic student and teacher functional routes listed in this report
- `PASS`: current emulator render path for AttendEase student and teacher screens
- `MANUAL REQUIRED`: Android Studio IDE click-through remains optional if you specifically want interactive Gradle or debugger usage beyond the verified CLI debug-build path
- `MANUAL REQUIRED`: deterministic nested-route deep links in the native development client still need either a better route-launch helper or manual in-app navigation
- `REAL DEVICE ONLY`: QR camera, GPS range or accuracy, and Bluetooth advertiser/scanner signoff

Detailed hostile-state, native debug-build, artifact, and command evidence now live in [`android-emulator-validation-report-appendix.md`](./android-emulator-validation-report-appendix.md).
