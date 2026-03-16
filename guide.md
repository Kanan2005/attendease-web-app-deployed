# AttendEase Manual Testing Guide

This guide explains how to check the current AttendEase project in the safest and most useful order.

It covers:

- website testing
- Android emulator testing
- Android real-phone testing
- when to use Expo Go versus a native Android build
- what is already verified
- what still needs real-device validation

This guide is written for the current local setup on this machine.

## Reset Product Reality Check

The reset-track product experience is now implemented locally:

- one shared mobile app with separate student and teacher entry
- teacher web and admin web with separate auth handoff
- teacher mobile Bluetooth ownership
- teacher web QR + GPS ownership
- student self-registration plus one-device binding
- admin student support, device recovery, and classroom governance

The remaining gaps are validation gaps, not missing reset UX ownership:

- real-device QR camera and GPS signoff
- real-device Bluetooth signoff
- production environment validation for OIDC, SES, Sentry, and OTEL

## Recommended Order

Use this order. It gives the most signal with the least setup pain:

1. Start the local backend/runtime stack.
2. Check the website in the browser.
3. Check the app in the Android emulator.
4. Check the app on your real Android phone.
5. Only after that, move to native Android build or APK-style validation if needed.
6. Do real-device QR, GPS, and Bluetooth validation last.

## Current Verified Local Setup

These items are already prepared and verified:

- Docker runtime works for:
  - PostgreSQL
  - Redis
  - MinIO
  - Mailpit
  - API
  - worker
  - web
- local teacher and admin web auth works at `/login`, `/register`, and `/admin/login`
- teacher dashboard loads after sign-in
- admin dashboard loads after sign-in
- Expo Metro starts for the mobile app
- Android emulator is available and connected on this machine
- emulator-safe Metro startup is now available through `pnpm manual:mobile:emulator`

Current local URLs:

- teacher web sign in: `http://localhost:3000/login`
- teacher web registration: `http://localhost:3000/register`
- admin web sign in: `http://localhost:3000/admin/login`
- API: `http://localhost:4000`
- API health: `http://localhost:4000/health`
- API readiness: `http://localhost:4000/health/ready`
- web health: `http://localhost:3000/health`

Current LAN IP on this machine when last checked:

- `192.168.29.11`

If your Wi-Fi changes, rerun `pnpm manual:info`.

For local mobile validation there are now two supported launch paths:

- real phone on Wi-Fi: `pnpm manual:mobile`
- Android emulator on this machine: `pnpm manual:mobile:emulator -- --device emulator-5554 --port 8101`

## Seeded Test Accounts

Use these accounts during manual checks:

- student: `student.one@attendease.dev` / `StudentOnePass123!`
- teacher: `teacher@attendease.dev` / `TeacherPass123!`
- admin: `admin@attendease.dev` / `AdminPass123!`

Student mobile now also supports real self-registration:

- use a fresh email address on the student registration flow
- registration binds the first attendance device during signup
- a successful signup should open an authenticated student session and move the student toward classroom join
- after signup or sign-in, open `Device Status` and confirm the phone shows `Trusted`, `Pending approval`, `Replaced`, `Blocked`, or `Unregistered` instead of vague trust copy

Teacher mobile and web now also support real self-registration:

- use a fresh teacher email address on the teacher registration flow
- teacher signup creates the teacher account, credential, role, and profile
- mobile teacher signup may include device metadata, but teacher auth still stays `NOT_REQUIRED`
- a successful teacher signup should open an authenticated teacher session and move the teacher toward the home flow

The shared mobile app now opens on a role-choice landing screen first:

- choose `Student` to open student sign in or student registration
- choose `Teacher` to open teacher sign in or teacher registration
- the app no longer defaults straight into the student side on launch

Student trusted-device seed currently configured for mobile local testing:

- install id: `seed-install-student-one`
- public key: `seed-public-key-student-one`
- platform: `ANDROID`

## One-Time Prep

From the repo root:

```bash
pnpm manual:info
pnpm manual:prepare
```

What `pnpm manual:prepare` does:

- boots the Docker runtime
- applies migrations
- seeds local data
- verifies runtime health

After that, you should have:

- web on `localhost:3000`
- API on `localhost:4000`
- worker healthy

If you want a quick host-side proof that the mobile report routes now match the backend report
truth before opening the app, run:

```bash
pnpm verify:mobile-reports
```

If you want to confirm manually:

```bash
curl http://localhost:3000/health
curl http://localhost:4000/health
curl http://localhost:4000/health/ready
docker compose -f docker-compose.yml -f docker-compose.runtime.yml ps
```

## Focused Validation Commands

For reset-track implementation prompts, use focused checks instead of rerunning every suite:

```bash
POSTGRES_PORT=55432 pnpm test:api:integration -- src/modules/auth/auth.integration.test.ts
pnpm test:api:targeted -- src/test/integration-helpers.test.ts
pnpm test:mobile:targeted -- src/student-foundation.test.ts src/student-query.test.ts
pnpm test:web:targeted -- src/web-portal.test.ts
pnpm android:validate:help
pnpm android:validate -- -d emulator-5554 --port 8083 --no-install
```

If your local Docker runtime publishes PostgreSQL on a non-default host port, pass that port
through `POSTGRES_PORT` when running focused API integration tests.

## Website Testing

### How to Open It

Open:

- `http://localhost:3000/login` for teacher sign in
- `http://localhost:3000/register` for teacher registration
- `http://localhost:3000/admin/login` for admin sign in

### Website Login Checks

Check teacher login:

1. Open `/login`
2. Use:
   - email: `teacher@attendease.dev`
   - password: `TeacherPass123!`
3. Confirm redirect to teacher dashboard

Check teacher registration:

1. Open `/register`
2. Use a fresh teacher email address
3. Enter full name plus password
4. Confirm redirect to teacher dashboard

Check admin login:

1. Open `/admin/login`
2. Use:
   - email: `admin@attendease.dev`
   - password: `AdminPass123!`
3. Confirm redirect to admin dashboard

### Teacher Website Checklist

Check these flows:

- dashboard loads
- classrooms list opens
- classroom detail opens
- roster page opens
- schedule page opens
- stream page opens
- semesters page opens
- session history page opens
- reports page opens
- history filters for classroom, class, section, subject, status, mode, and date all render
- session detail keeps grouped present and absent student lists visible
- session detail shows `Mark present` / `Mark absent` actions when the edit window is open
- reports keep one shared filter scope for course rollups, student follow-up, and day-wise trend
- exports page opens
- analytics page opens
- email automation page opens
- QR setup page opens at `/teacher/sessions/start`
- classroom detail can hand off into the same QR setup flow
- projector route opens

What to pay attention to:

- loading states should resolve cleanly
- no blank pages
- no redirect loops
- no stale session errors after sign-in
- teacher pages should not bounce to admin pages

### Admin Website Checklist

Check these flows:

- admin dashboard loads
- student support page opens at `/admin/devices?view=support`
- device recovery page opens at `/admin/devices`
- imports page opens
- semesters page opens
- admin-only pages stay accessible after admin sign-in

What to pay attention to:

- teacher account should not access admin-only pages
- admin pages should not show teacher-only navigation
- student support should focus on account state, classroom context, and device context before recovery actions appear
- student support should allow safe deactivate, reactivate, or archive actions only after a reason and verification acknowledgement
- device recovery should require a reason plus explicit confirmation before high-risk actions enable
- device recovery should show the current trusted phone, pending replacement phone, latest risk, and latest recovery action before an admin proceeds
- if a pending replacement exists, clearing the current phone should still leave that replacement blocked until support approval

## Android Emulator Testing

Use the emulator for general UI and API flow checks.

This is useful for:

- login
- dashboard
- classroom navigation
- roster and announcements
- history and profile
- general layout problems

This is not enough for:

- final Bluetooth validation
- final QR camera validation
- final GPS accuracy validation

### Emulator Preconditions

On this machine, these are already true:

- Android Studio is installed
- an emulator exists: `Pixel_9_Pro_XL`
- `adb` is available
- the emulator is connected

You can confirm with:

```bash
adb devices
```

### Start the App for Emulator Testing

Start emulator-safe Metro:

```bash
pnpm manual:mobile:emulator -- --device emulator-5554 --port 8101
```

This launcher already:

- reverses Metro traffic with `adb reverse`
- reverses API traffic with `adb reverse`
- forces `EXPO_PUBLIC_API_URL=http://127.0.0.1:4000` by default

Then open the installed AttendEase native dev client in the emulator and navigate in-app from the base app launch.

Notes:

- Current baseline status on this machine:
  - Metro starts successfully with localhost API routing
  - the AttendEase native dev client reaches interactive student and teacher screens
  - base app launch plus in-app navigation is the reliable path for emulator checks
  - route-specific nested deep links in the native development client can still land on `Unmatched Route`
  - use `Structure/android-emulator-validation-report.md` plus `Structure/full-product-screenshot-audit.md` as the source of truth for current emulator evidence

### Emulator Checklist: Student

Check:

- app opens
- student login works
- trusted-device status screen opens
- device-status screen shows both `Device trust state` and `Attendance device state`
- dashboard loads
- classroom detail opens
- stream opens
- schedule opens
- profile opens
- blocked-attendance or device-status messaging renders if applicable

Report status:

- student reports now use the final backend student report APIs
- seeded trusted-device Android validation now also proves the dashboard card can show `Trusted Device = Trusted` and the device-status screen can show `Attendance device state: Trusted`
- still verify the report screens on emulator and a real phone because mobile release sign-off still needs device-level confirmation

### Emulator Checklist: Teacher

Check:

- teacher login works
- teacher dashboard loads
- classroom navigation works
- classroom create flow works
- classroom title and course-code edit flow works
- classroom archive flow shows only where allowed
- roster entrypoints open
- roster screen shows classroom context plus active/pending/blocked counts
- add-student flow works with email or identifier
- roster search or status filter works
- roster actions such as `Mark Pending`, `Block`, or `Remove` render clearly for seeded members
- schedule screen opens
- stream or announcement screen opens
- session history opens
- manual edit route opens
- live session detail shows grouped present and absent student lists
- ended session detail shows `Mark Present` or `Mark Absent` actions plus `Save Attendance Changes`
- export screen opens

Report status:

- teacher mobile reports now use the final teacher report APIs
- still verify the report screen on emulator and a real phone because teacher mobile release sign-off still needs device-level confirmation

## Real Android Phone Testing

Use your real Android phone after website and emulator checks.

This is the best path for:

- real network behavior
- real device permissions
- camera
- GPS
- trusted-device behavior

### Do You Need Developer Mode?

For Expo Go testing:

- developer mode is not strictly required
- you mainly need the phone on the same Wi-Fi network

For native Android build or USB debugging:

- yes, enable Developer Options
- enable USB debugging

### Start the Phone Test

1. Make sure your phone and laptop are on the same Wi-Fi.
2. Run:

```bash
pnpm manual:mobile
```

3. Open Expo Go on your phone.
4. Scan the Expo QR code.

If LAN access breaks because your IP changed:

1. Run:

```bash
pnpm manual:info
```

2. Update `apps/mobile/.env.local` if needed.
3. Restart Metro.

### Real Phone Checklist: Student

Check:

- login
- trusted-device state
- dashboard
- classroom detail
- stream
- schedule
- device-status screen
- blocked-attendance messaging

Real-device-only checks:

- permission prompts
- trusted-device behavior under real network conditions
- QR camera scan behavior
- GPS capture and range feedback

Report status:

- student reports are API-backed now
- still verify the report screens on a real phone as part of final mobile sign-off

### Real Phone Checklist: Teacher

Check:

- login
- dashboard
- classroom navigation
- roster entrypoints
- roster context and student counts
- add student by email or identifier
- roster search or status filtering
- roster member actions for pending/block/remove
- schedule save flow
- announcement flow
- session history
- manual edit flow
- session review keeps grouped present and absent student lists visible
- pending corrections appear before save
- reports keep shared filters plus course/student/day-wise output from the same final truth
- export request flow

Real-device-only checks:

- any permission or native behavior differences
- Bluetooth advertiser flow in a real native build

Known blocker:

- none at the report-data layer; teacher mobile reports are now API-backed

## QR Attendance Testing

### What You Can Check in Emulator

You can check:

- QR attendance entry screens open
- the short four-step QR flow is visible
- camera permission prompt and denied fallback
- live camera preview opens after permission is granted
- location permission prompt, denied state, and ready state
- error banners render
- route flow is intact

You should not treat emulator QR as final validation.

### What Must Be Checked on a Real Phone

Check on a real device:

- full four-step QR flow with a live classroom session
- camera permission prompt
- real QR scan
- expired QR error
- invalid QR error
- out-of-range GPS error
- low-accuracy GPS error
- duplicate mark handling

## Bluetooth Attendance Testing

### What You Can Check in Emulator

You can check:

- Bluetooth screens open
- inactive or unavailable states render
- teacher and student Bluetooth entry flows are visible
- teacher setup can select a classroom, start Bluetooth attendance, and open the active-session route
- teacher active control can show broadcast recovery and end-session actions
- teacher end-session can return to saved session detail in the native Android build
- teacher session detail can show live marked-student lists during the active session, then allow a
  one-tap correction plus save after the session ends
- if the teacher starts Bluetooth attendance while the student app is already open, use `Refresh live sessions` on the attendance hub or `Refresh Bluetooth sessions` inside the Bluetooth route before assuming no session exists

This is not enough for sign-off.

### What Must Be Checked on Real Hardware

Bluetooth still needs real-device validation for:

- teacher advertiser start
- student scanner detection
- detected-session selection
- mark-attendance success
- advertiser stop or session-end behavior
- Bluetooth disabled recovery
- advertiser-start failure recovery
- cross-device teacher-to-student proximity proof

### Important Note About Expo Go

Expo Go is fine for broad app checks, but it is not the final BLE validation path.

For Bluetooth sign-off, use a native Android dev build.

## Native Android Build or APK-Style Testing

Use this only after the normal website + Expo Go checks.

This path is now practically verified on this machine for emulator-based debug builds.

### Recommended Native Path

The working local native path is:

```bash
pnpm --filter @attendease/mobile exec expo run:android -d Pixel_9_Pro_XL --port 8083 --no-install
```

What is already evidenced:

- the Android debug build compiles successfully
- the debug APK installs on the emulator
- the native app launches as package `com.anurag203.attendease`
- the native app reaches an interactive AttendEase screen
- the custom BLE native module now compiles in the native Android build

Why this matters:

- the app includes custom native Bluetooth bridge code
- BLE validation should be done in a native build, not only Expo Go
- this path catches Android-only Gradle and Kotlin issues that Expo Go cannot reveal

Useful prerequisite checks:

```bash
pnpm --filter @attendease/mobile exec expo run:android --help
adb devices
java -version
```

Notes:

- Expo CLI expects the AVD display name for `-d`, not the raw `adb` serial
- on this machine, `Pixel_9_Pro_XL` worked while `emulator-5554` did not
- the native development client currently opens correctly for the default app launch, but direct nested-route deep links are still less reliable than Expo Go route launches

For a connected real Android device:

```bash
pnpm --filter @attendease/mobile exec expo run:android -d
```

What this does:

- uses the generated Android project in `apps/mobile/android`
- compiles a native debug build
- installs it on the chosen emulator or device
- opens the Expo development client for the current Metro URL

### Android Studio Path

After a native run/prebuild creates the Android project, open the generated Android project in Android Studio and run it there.

Use Android Studio when you want:

- native logs
- Gradle build visibility
- emulator selection from Android Studio
- easier debugging of native Bluetooth behavior

Current honest status:

- the CLI native debug-build path is verified
- Android Studio IDE click-through was not separately exercised in this pass
- treat Android Studio as an optional next step for deeper native debugging, not as a current blocker

### About a Full APK

A true distributable or signed release APK is not the first recommended check for this repo right now.

Start with:

1. website
2. Expo Go checks
3. native debug build checks

Only move to APK-style packaging after that.

Honest current status:

- a clean local debug/dev native path is now verified for emulator install and startup
- direct nested-route deep links in the native development client still land on `Unmatched Route`, so deterministic screen sweeps are still easier in Expo Go
- for native dev-client validation, the most reliable path is to launch the base dev-client URL and then navigate inside AttendEase; route-specific dev-client deep links are still not trustworthy enough for final screen sweeps
- a polished release APK signing and distribution workflow is not the current verified local testing path in this repo

## Known Current Blockers

These are important and should not be ignored during testing:

### Student Mobile Reports

Current status:

- student mobile report routes now use the final student report APIs
- verify the report screens on emulator and a real phone before marking student mobile fully signed off

### Teacher Mobile Reports

Current status:

- teacher mobile report routes now use the final teacher report APIs
- verify the report screen on emulator and a real phone before marking teacher mobile fully signed off

### Browser Login UX

Current status:

- local teacher sign in, teacher registration, and admin sign in now work for testing
- protected routing and cookie session behavior are verified
- real Google OIDC production validation is still separate and not yet signed off

### Real-Device Sign-Off Still Needed

Still manual-required:

- QR camera validation
- GPS validation
- Bluetooth validation
- production credential validation for Google OIDC, SES, Sentry, and OTEL

## What I Recommend You Actually Do

Use this exact flow:

1. Run:

```bash
pnpm manual:prepare
```

2. Check the website first:
   - `http://localhost:3000/login`
   - `http://localhost:3000/register`
   - `http://localhost:3000/admin/login`
   - teacher login
   - teacher registration
   - admin login

3. Check the Android emulator next:
   - student login
   - teacher login
   - main navigation
   - classroom flows

4. Check your real Android phone after that:
   - student flows
   - teacher flows
   - permission prompts
   - device-trust messaging

5. Do QR and Bluetooth only after the above is stable.

6. Treat QR/Bluetooth real-device checks and production credential validation as the remaining release blockers. Local browser password login is now working, and student/teacher mobile reports are API-backed, but both mobile surfaces still need emulator and real-phone verification.

## What to Report Back While Testing

When you find an issue, send:

- which platform: web, emulator, or real phone
- which account: student, teacher, or admin
- exact screen or route
- what you expected
- what actually happened
- screenshot if useful

Examples:

- “Teacher website login redirects back to `/login` after submit”
- “Student Android app opens, but classroom stream is blank”
- “QR scan works, but GPS says out of range even when standing near the test location”

## Troubleshooting

### If Website Does Not Open

Run:

```bash
curl http://localhost:3000/health
curl http://localhost:4000/health
docker compose -f docker-compose.yml -f docker-compose.runtime.yml ps
```

### If Mobile Cannot Reach API

Run:

```bash
pnpm manual:info
```

Check that the LAN IP still matches your current Wi-Fi.

### If Expo Go Cannot Open the Project

- make sure Metro is still running
- for a real phone, make sure the LAN IP still matches `pnpm manual:info`
- for the emulator, use the emulator-safe launcher:

```bash
pnpm manual:mobile:emulator -- --device emulator-5554 --port 8101
```

- if the native dev client is installed but not attached to the current Metro session, reopen it from the emulator after the command above starts

## Full Product Screenshot Audit

Use the deterministic audit tooling when you need a current screenshot inventory or a route-by-route functionality matrix.

Commands:

```bash
pnpm audit:matrix
pnpm audit:screenshots:mobile
pnpm audit:screenshots:web
```

Outputs:

- [Structure/full-product-screenshot-audit.md](/Users/anuagar2/Desktop/practice/Attendease/Structure/full-product-screenshot-audit.md)
- [Structure/artifacts/full-product-audit/mobile](/Users/anuagar2/Desktop/practice/Attendease/Structure/artifacts/full-product-audit/mobile)
- [Structure/artifacts/full-product-audit/web](/Users/anuagar2/Desktop/practice/Attendease/Structure/artifacts/full-product-audit/web)

Interpretation rules:

- `PASS` means the current route and expected state were captured successfully
- `FAIL` means a product bug was reproduced
- `BLOCKED` means a route or state was blocked by code or environment and needs follow-up
- `MANUAL-REQUIRED` means hardware-only proof is still required even when the route UI is visible

### If Port 5432 Is Busy

This machine already uses:

- `POSTGRES_PORT=55432`

That is already handled in the local setup here.

## Related Files

- [README.md](/Users/anuagar2/Desktop/practice/Attendease/README.md)
- [Structure/manual-check-quickstart.md](/Users/anuagar2/Desktop/practice/Attendease/Structure/manual-check-quickstart.md)
- [Structure/release-readiness-checklist.md](/Users/anuagar2/Desktop/practice/Attendease/Structure/release-readiness-checklist.md)
- [Structure/release-readiness-report.md](/Users/anuagar2/Desktop/practice/Attendease/Structure/release-readiness-report.md)
