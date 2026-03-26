# AttendEase Manual Check Quickstart

Use this when you want to verify the current project on your Android phone and in the browser without rebuilding the setup from scratch.

If you want the full end-to-end manual testing playbook, use [guide.md](/Users/anuagar2/Desktop/practice/Attendease/guide.md).

## What Was Prepared

- root `.env` now sets `POSTGRES_PORT=55432` on this machine because host port `5432` is already occupied
- `apps/mobile/.env.local` now points the mobile app at the current LAN API URL, seeded dev accounts, and trusted-device defaults for real-phone checks
- `pnpm manual:mobile:emulator` now gives the emulator a localhost API path with `adb reverse`, so emulator validation no longer depends on the LAN IP in `apps/mobile/.env.local`
- `apps/web/.env.local` now points the web app at the local API and enables the local password sign-in path
- `/login` now owns teacher sign in, `/register` now owns teacher registration, and `/admin/login` now owns admin sign in
- those web auth routes write the protected session cookies expected by the teacher and admin route groups
- the mobile BLE wrapper now degrades cleanly if the custom native module is unavailable
- Expo typed-route generation is now disabled in `apps/mobile/app.json` because it was crashing Metro on this machine; the app route structure itself is unchanged

## Verified Working Local Setup

- backend services run in Docker: PostgreSQL, Redis, MinIO, Mailpit, API, and worker
- website checks run against the host-started Next.js server on `http://localhost:3000`
- Android phone checks run against the Expo LAN server from `pnpm manual:mobile`
- Android emulator checks now run against the localhost + `adb reverse` launcher from `pnpm manual:mobile:emulator`
- current LAN IP for this machine is `192.168.29.11`
- current Android emulator baseline is interactive and usable:
  - emulator-safe Metro starts with `EXPO_PUBLIC_API_URL=http://127.0.0.1:4000` by default
  - the installed AttendEase native dev client reaches interactive student and teacher screens
  - base app launch plus in-app navigation is the reliable emulator path
  - direct nested-route deep links in the native development client can still land on `Unmatched Route`
  - the native Android debug-build path is now also verified for emulator install and startup:
    - `pnpm --filter @attendease/mobile exec expo run:android -d Pixel_9_Pro_XL --port 8083 --no-install`
    - native app package `com.anurag203.attendease` launches successfully
    - for native dev-client validation, launch the base dev-client URL first and then navigate in-app; route-specific dev-client deep links can still land on `Unmatched Route`

## One-Time Commands

1. Print the current local verification info:

```bash
pnpm manual:info
```

2. Boot the local runtime, apply seeds, and verify health:

```bash
pnpm manual:prepare
```

This starts:

- PostgreSQL
- Redis
- MinIO
- Mailpit
- API
- worker

If you also want the exact web path that was verified in the latest prep pass, run this in a second terminal after `pnpm manual:prepare`:

```bash
pnpm --filter @attendease/web build
pnpm --filter @attendease/web start
```

3. If you want a host-side proof that the student and teacher mobile report routes now match the
backend report truth, run:

```bash
pnpm verify:mobile-reports
```

## Android Check

1. Choose your mobile target:
   - real Android phone on the same Wi-Fi network
   - Android emulator on this machine
2. Start the app:

```bash
# real phone
pnpm manual:mobile

# emulator
pnpm manual:mobile:emulator -- --device emulator-5554 --port 8101
```

3. Open the project:
   - real phone: use the Expo QR flow
   - emulator: open the installed AttendEase native dev client after the emulator-safe launcher starts
   - Expo may print package-version compatibility warnings on startup; for the current local check, Metro is considered ready once the QR code or localhost dev URL appears
   - for emulator evidence and route inventory, also check `Structure/android-emulator-validation-report.md` and `Structure/full-product-screenshot-audit.md`
4. Use these seeded accounts:
   - student: `student.one@attendease.dev / StudentOnePass123!`
   - teacher: `teacher@attendease.dev / TeacherPass123!`
5. The shared mobile app now opens on a role-choice landing screen:
   - choose `Student` for student sign in or student registration
   - choose `Teacher` for teacher sign in or teacher registration
   - protected student and teacher routes now bounce back to the correct sign-in screen if the matching session is missing
6. Student self-registration is now also available in the mobile app:
   - use a fresh email address
   - the signup flow binds the first device during registration
   - after signup, the app should open an authenticated student session and send the student toward classroom join
   - open `Device Status` after signup and confirm the attendance-device state is shown clearly instead of hidden behind developer wording
7. Teacher self-registration is now also available on mobile and web:
   - use a fresh teacher email address
   - the signup flow creates the teacher account, credential, role, and profile
   - successful signup should open an authenticated teacher session and send the teacher toward the home flow
8. The seeded trusted-device values for the seeded student check are already loaded into `apps/mobile/.env.local`:
   - install id: `seed-install-student-one`
   - public key: `seed-public-key-student-one`
   - platform: `ANDROID`
9. On a trusted seeded student sign-in, `Device Status` should show:
   - `Device trust state: Trusted`
   - `Attendance device state: Trusted`
   - `Binding status: ACTIVE`
10. On teacher mobile, the `Classrooms` route is now also the main classroom-management entry:
   - create a classroom from one labeled teaching scope
   - open a classroom detail page
   - edit `Classroom title` and `Course code`
   - confirm `Archive Classroom` only appears where API permissions allow it
11. On the teacher roster route, the phone flow should now cover normal roster work directly:
   - open `Students` from a classroom card or classroom detail
   - confirm the roster header shows classroom context plus active, pending, and blocked counts
   - add a student by email or identifier
   - use search or a roster-status filter
   - confirm seeded row actions such as `Mark Pending`, `Block`, or `Remove` are visible
   - verify bulk import stays below the normal roster section instead of replacing it

## Website Check

1. Make sure the host web server is running from:

```bash
pnpm --filter @attendease/web start
```

2. Open [http://localhost:3000/login](http://localhost:3000/login) for teacher sign in or [http://localhost:3000/register](http://localhost:3000/register) for teacher registration.
3. For teacher verification:
   - email: `teacher@attendease.dev`
   - password: `TeacherPass123!`
   - after sign-in, open `/teacher/sessions/start`
   - confirm the QR setup route shows:
     - classroom choice
     - session duration
     - allowed distance
     - `Use browser location`
   - confirm classroom detail can also hand off into the same QR setup route
   - open `/teacher/sessions/history` and confirm:
     - classroom/class/section/subject/status/mode/date filters all render
     - grouped `Present students` and `Absent students` lists appear for a selected session
     - pending corrections are visible before save
   - open `/teacher/reports` and confirm:
     - one shared filter scope drives course rollups, student follow-up, and day-wise trend sections
     - `Open session review` and `Open exports` stay visible on the report workspace
4. For teacher registration verification:
   - open `/register`
   - use a fresh teacher email address
   - enter a full name and password
5. For admin verification, open [http://localhost:3000/admin/login](http://localhost:3000/admin/login):
   - email: `admin@attendease.dev`
   - password: `AdminPass123!`
6. After admin sign-in, verify both:
   - `/admin/devices?view=support` for student support review and audited student-status actions
   - `/admin/devices` for guarded device recovery
   - device recovery shows the current trusted phone, pending replacement phone, latest risk, and latest recovery action before you change trust
   - if a pending replacement exists, `Deregister current phone` does not auto-trust that pending phone; it should still require `Approve replacement phone`

## What Still Needs Real Device Verification

- full student QR flow:
  - choose session
  - scan QR
  - confirm location
  - mark attendance
- QR camera scanning on the phone
- GPS permission and out-of-range handling on the phone
- Bluetooth advertiser and scanner flows on real devices
- BLE checks are best in an Expo dev build, not Expo Go
- the emulator/native Android build now proves teacher Bluetooth setup, active recovery, and
  end-session handoff to session detail, but not real nearby BLE success
- teacher session detail now also proves live present or absent lists, pending correction state,
  and saved correction totals in the native Android build
- if the teacher starts Bluetooth attendance while the student app is already open, use `Refresh live sessions` on the attendance hub or `Refresh Bluetooth sessions` on the Bluetooth route before treating `Bluetooth (0)` as final

## Full Product Screenshot Audit

If you need a deterministic screen inventory plus a status matrix, run:

```bash
pnpm audit:matrix
pnpm audit:screenshots:mobile
pnpm audit:screenshots:web
```

Outputs:

- [Structure/full-product-screenshot-audit.md](/Users/anuagar2/Desktop/practice/Attendease/Structure/full-product-screenshot-audit.md)
- [Structure/artifacts/full-product-audit/mobile](/Users/anuagar2/Desktop/practice/Attendease/Structure/artifacts/full-product-audit/mobile)
- [Structure/artifacts/full-product-audit/web](/Users/anuagar2/Desktop/practice/Attendease/Structure/artifacts/full-product-audit/web)

## If Something Looks Wrong

- rerun `pnpm manual:info` to confirm the current LAN IP
- if your Wi-Fi IP changed, update `apps/mobile/.env.local` for real-phone checks
- if the emulator cannot reach the API, prefer `pnpm manual:mobile:emulator -- --device emulator-5554 --port 8101` instead of editing the LAN IP
- rerun `pnpm manual:prepare` to rebuild and reseed the local runtime
- if Docker web is trying to claim `localhost:3000`, stop it and use the host web server for the local password sign-in flow
- if the web session looks stale, just sign in again at `/login` to replace the cookies
