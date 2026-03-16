# AttendEase Android Emulator Validation Report

Last updated: 2026-03-15  
Status: `COMPLETE_FOR_EMULATOR_SCOPE`

This file records evidence from the Android emulator validation plan. Prompt 1 established tooling and runtime baseline. Prompt 2 completed deterministic student and teacher functional regression checks inside Expo Go. Prompt 3 completed hostile-state, permission, and recovery checks where the emulator is practical. Prompt 4 completed the practical native Android debug-build path on the emulator, including a real `expo run:android` build, install, and launch. This emulator pass still does not replace real-device QR, GPS, or Bluetooth validation.

## Environment And Tooling Status

Status: `PASS`

- `adb` available:
  - command: `which adb && adb version`
  - result: `/Users/anuagar2/Library/Android/sdk/platform-tools/adb`
  - result: `Android Debug Bridge version 1.0.41`
- Android emulator tooling available:
  - command: `(which emulator && emulator -list-avds) || true`
  - result: `/Users/anuagar2/Library/Android/sdk/emulator/emulator`
  - result: `Pixel_9_Pro_XL`
- Connected emulator detected:
  - command: `adb devices -l`
  - result: `emulator-5554`
  - result: model `sdk_gphone16k_arm64`
- Active AVD name confirmed:
  - command: `adb shell getprop ro.boot.qemu.avd_name`
  - result: `Pixel_9_Pro_XL`
- Expo Go present on emulator:
  - command: `adb shell pm list packages | rg 'expo|exponent' || true`
  - result: `package:host.exp.exponent`
- Expo Go version confirmed:
  - command: `adb shell dumpsys package host.exp.exponent | rg -n 'versionName|versionCode' -m 4`
  - result: `versionName=55.0.5`
  - result: `versionCode=406`
- Local Android SDK env was usable with `ANDROID_HOME=/Users/anuagar2/Library/Android/sdk`
- Emulator proxy check:
  - command: `adb shell settings get global http_proxy || true`
  - result: `null`

## Emulator Baseline

Status: `PASS` with caveats

- Docker-backed local runtime health was good enough for emulator validation:
  - command: `POSTGRES_PORT=55432 pnpm runtime:check`
  - result: passed
- Manual-check environment info printed correctly:
  - command: `pnpm manual:info`
  - result: current LAN IP `192.168.29.11`
  - result: API URL `http://192.168.29.11:4000`
- Safe prep fix from Prompt 1 remained valid:
  - file: `apps/mobile/.env.local`
  - setting: `EXPO_PUBLIC_API_URL=http://192.168.29.11:4000`
- Fresh Expo Metro launch path worked for the functional pass:
  - command: `pnpm --filter @attendease/mobile exec expo start --clear --host lan --port 8083`
  - result: Metro served `exp://192.168.29.11:8083`
  - result: fresh bundle used `expo-router@55.0.5`
- Expo Go accepted the app URLs used in the functional sweep:
  - command pattern: `adb shell "am start -W -a android.intent.action.VIEW -d 'exp://192.168.29.11:8083/--/…' host.exp.exponent"`
  - result: `Status: ok`
- Earlier render blocker from Prompt 1 did not reproduce on the current Metro session:
  - previous error: `useLinkPreviewContext must be used within a LinkPreviewContextProvider`
  - current result: interactive AttendEase student and teacher screens rendered successfully

Important emulator workflow caveats:

- Bare Expo URL launches such as `exp://192.168.29.11:8083` can reopen the last route Expo Go had in memory. They are good enough for proving the app opens, but they are not deterministic evidence for a specific screen.
- Deterministic route checks worked best with raw Expo Router group paths:
  - `exp://192.168.29.11:8083/--/(student)`
  - `exp://192.168.29.11:8083/--/(teacher)/reports`
- Encoded group paths are not reliable in Expo Go:
  - command: `adb shell "am start -W -a android.intent.action.VIEW -d 'exp://192.168.29.11:8083/--/%28student%29/profile' host.exp.exponent"`
  - result: `Unmatched Route`

## Functional Regression Checks

Status: `PASS` with caveats

These checks prove route rendering, bootstrap auth, and live API-backed screen loading on the Android emulator. They do not prove camera, GPS, Bluetooth radio, or native-build behavior.

### Student Android Flows

Status: `PASS`

- App open and bootstrap login:
  - command: `adb shell "am start -W -a android.intent.action.VIEW -d 'exp://192.168.29.11:8083/--/(student)' host.exp.exponent"`
  - evidence:
    - `Student Dashboard`
    - `Welcome back, Aarav`
    - `Active Classrooms 2`
    - `Trusted Device Trusted`
  - note: this prompt verified development-bootstrap login, not a typed manual credential form
- Dashboard:
  - evidence:
    - `Mark Attendance`
    - `Join Classroom`
    - `History`
    - `Reports`
    - `Profile`
    - `Device Status`
- Profile:
  - command: `adb shell "am start -W -a android.intent.action.VIEW -d 'exp://192.168.29.11:8083/--/(student)/profile' host.exp.exponent"`
  - evidence:
    - `Aarav Sharma`
    - `student.one@attendease.dev`
    - `Active role: STUDENT`
    - `Sign Out From Mobile Shell`
- Device status:
  - command: `adb shell "am start -W -a android.intent.action.VIEW -d 'exp://192.168.29.11:8083/--/(student)/device-status' host.exp.exponent"`
  - evidence:
    - `Attendance device verified`
    - `Install ID: seed-install-student-one`
    - `Device trust state: Trusted`
    - `Binding status: ACTIVE`
- Classroom detail:
  - command: `adb shell "am start -W -a android.intent.action.VIEW -d 'exp://192.168.29.11:8083/--/(student)/classrooms/seed_course_offering_physics' host.exp.exponent"`
  - evidence:
    - `Physics - Semester 6 A`
    - `Trusted device required: Yes`
    - `Open Stream`
    - `Open Schedule`
    - `Subject Report`
- Classroom stream:
  - command: `adb shell "am start -W -a android.intent.action.VIEW -d 'exp://192.168.29.11:8083/--/(student)/classrooms/seed_course_offering_physics/stream' host.exp.exponent"`
  - evidence:
    - `Classroom Stream`
    - `Teacher-only posts stay hidden from this student route.`
    - student-visible announcement entries rendered
- Classroom schedule:
  - command: `adb shell "am start -W -a android.intent.action.VIEW -d 'exp://192.168.29.11:8083/--/(student)/classrooms/seed_course_offering_physics/schedule' host.exp.exponent"`
  - evidence:
    - `Classroom Schedule`
    - `Wednesday`
    - `11:00 AM - 12:00 PM · Lab 2`
    - exception entries rendered

### Teacher Android Flows

Status: `PASS`

- Teacher bootstrap login and dashboard:
  - command: `adb shell "am start -W -a android.intent.action.VIEW -d 'exp://192.168.29.11:8083/--/(teacher)' host.exp.exponent"`
  - evidence:
    - `Teacher Dashboard`
    - `Welcome back, Prof. Anurag Agarwal`
    - `Bluetooth Session`
    - `Session History`
    - `Reports`
    - `Exports`
  - note: this prompt verified development-bootstrap teacher login, not a typed manual credential form
- Classroom navigation:
  - command: `adb shell "am start -W -a android.intent.action.VIEW -d 'exp://192.168.29.11:8083/--/(teacher)/classrooms' host.exp.exponent"`
  - evidence:
    - `Mathematics - Semester 6 A`
    - `Physics - Semester 6 A`
    - `Open Detail`
    - `Roster`
    - `Schedule`
- Roster entrypoints:
  - command: `adb shell "am start -W -a android.intent.action.VIEW -d 'exp://192.168.29.11:8083/--/(teacher)/classrooms/seed_course_offering_math/roster' host.exp.exponent"`
  - evidence:
    - `Classroom Roster`
    - `Manual Add`
    - `Status: Set Pending`
    - `Import Trigger`
- Schedule route:
  - command: `adb shell "am start -W -a android.intent.action.VIEW -d 'exp://192.168.29.11:8083/--/(teacher)/classrooms/seed_course_offering_math/schedule' host.exp.exponent"`
  - evidence:
    - `Classroom Schedule`
    - `Discard Draft`
    - `Add Weekly Slot`
    - `Add One-off`
    - `Add Cancellation`
    - `Add Reschedule`
- Announcements route:
  - command: `adb shell "am start -W -a android.intent.action.VIEW -d 'exp://192.168.29.11:8083/--/(teacher)/classrooms/seed_course_offering_math/announcements' host.exp.exponent"`
  - evidence:
    - `Announcements`
    - `Post Announcement`
    - `Teacher Only`
    - `Student Visible`
- Session history route:
  - command: `adb shell "am start -W -a android.intent.action.VIEW -d 'exp://192.168.29.11:8083/--/(teacher)/sessions' host.exp.exponent"`
  - evidence:
    - `Session History`
    - `Release QR 426637 · Qr Gps · Ended`
    - `Attendance Session · Bluetooth · Ended`
    - `Edit window Open`
- Reports route:
  - command: `adb shell "am start -W -a android.intent.action.VIEW -d 'exp://192.168.29.11:8083/--/(teacher)/reports' host.exp.exponent"`
  - evidence:
    - `Teacher mobile now uses the same final teacher report APIs as the backend and web reporting surfaces.`
    - filter chips rendered for `All Classrooms`, `Mathematics - Semester 6 A`, `Physics - Semester 6 A`
    - subject filters rendered for `All Subjects`, `Mathematics`, `Physics`
- Exports route:
  - command: `adb shell "am start -W -a android.intent.action.VIEW -d 'exp://192.168.29.11:8083/--/(teacher)/exports' host.exp.exponent"`
  - evidence:
    - `Teacher mobile now queues real export jobs and watches worker-backed delivery status.`
    - export options rendered: `SESSION_PDF`, `SESSION_CSV`, `STUDENT_PERCENT_CSV`, `COMPREHENSIVE_CSV`

### Functional Caveats

- This prompt verified route rendering and visible controls. It did not drive write actions such as save, post, or manual edit submission from inside the emulator UI.
- Those write paths were already exercised in earlier host-side release-readiness checks and remain documented in `Structure/release-readiness-report.md`.
- Real-device QR, GPS, and Bluetooth behavior is still outside emulator scope.

## Hostile-State And Recovery Checks

Status: `PASS` with caveats

Safe issues fixed during Prompt 3:

- QR camera denial now updates the main permission banner to `Permission denied` instead of leaving it stuck on `Permission request pending`.
  - files:
    - `apps/mobile/src/student-foundation.tsx`
    - `apps/mobile/src/student-attendance.ts`
    - `apps/mobile/src/student-attendance.test.ts`
- QR location capture now loads `expo-location` through `require("expo-location")` inside the handler, which fixed the Expo Go runtime failure:
  - previous logcat excerpt:
    - `ExpoLocation.requestForegroundPermissionsAsync is not a function (it is undefined)`
  - file:
    - `apps/mobile/src/student-foundation.tsx`

Permission-denial evidence:

- Camera denied state:
  - prep:
    - `adb shell pm revoke host.exp.exponent android.permission.CAMERA`
  - route:
    - `exp://192.168.29.11:8083/--/(student)/attendance/qr-scan`
  - system dialog rendered:
    - `Allow Expo Go to take pictures and record video?`
    - `While using the app`
    - `Only this time`
    - `Don’t allow`
  - after denying:
    - `Permission denied`
    - `Camera access was denied. Paste the rolling QR payload manually or enable camera access in system settings.`
- Location denied state:
  - prep:
    - `adb shell pm revoke host.exp.exponent android.permission.ACCESS_FINE_LOCATION`
    - `adb shell pm revoke host.exp.exponent android.permission.ACCESS_COARSE_LOCATION`
    - cold relaunch via `adb shell am force-stop host.exp.exponent`
  - route:
    - `exp://192.168.29.11:8083/--/(student)/attendance/qr-scan`
  - system dialog rendered:
    - `Allow Expo Go to access this device’s location?`
    - `Precise`
    - `Approximate`
    - `While using the app`
    - `Only this time`
    - `Don’t allow`
  - after denying:
    - `Permission denied`
    - `Location capture failed`
- Re-open after denial:
  - command:
    - `adb shell "am start -W -a android.intent.action.VIEW -d 'exp://192.168.29.11:8083/--/(student)/attendance/qr-scan' host.exp.exponent"`
  - evidence:
    - route reopened successfully
    - permission state reset to `Permission request pending`
    - screen remained interactive with `Open Camera Scanner` and `Capture Location`

Lifecycle and recovery evidence:

- Force-stop and cold relaunch:
  - command:
    - `adb shell am force-stop host.exp.exponent`
  - cold relaunch evidence:
    - `LaunchState: COLD`
    - student QR route reopened and showed the Android location permission dialog
- Bootstrap recovery after clear data:
  - command:
    - `adb shell pm clear host.exp.exponent`
  - Expo Go caveat:
    - the first launch after clear data stopped on Expo Go’s own intro/dev UI with `Continue`
    - a scripted flow cannot treat that first screen as AttendEase bootstrap success
  - recovery after one-time Expo Go intro and force-stop:
    - student dashboard relaunched and showed `Student Dashboard`, `Welcome back, Aarav`
    - device-status route relaunched and showed `Attendance device verified`, `Device trust state: Trusted`
    - teacher dashboard relaunched and showed `Teacher Dashboard`, `Welcome back, Prof. Anurag Agarwal`
- Deep-link reliability:
  - raw group-path routes still worked after force-stop and after clear-data recovery
  - encoded group-path routes still produced `Unmatched Route`

Current hostile-state limitations:

- This prompt did not exercise offline or degraded-network behavior.
- Expo Go’s own intro/dev UI after `pm clear` is an Expo-specific limitation, not an AttendEase route failure.
- Emulator permission flows still do not count as final real-device QR or GPS validation.

## Native Debug-Build Checks

Status: `PASS` with caveats

- Native command surface verified:
  - command: `pnpm --filter @attendease/mobile exec expo run:android --help`
  - result: Expo CLI exposes `--device`, `--port`, `--no-install`, and `--no-bundler` options for the current repo
- Native prerequisites verified:
  - `ANDROID_HOME=/Users/anuagar2/Library/Android/sdk`
  - `java -version` -> `openjdk version "23.0.2" 2025-01-21`
  - connected emulator remained `Pixel_9_Pro_XL`
  - native project exists under `apps/mobile/android`
- First native build attempt revealed a real Android-only issue in the custom BLE module:
  - first failing command:
    - `pnpm --filter @attendease/mobile exec expo run:android -d Pixel_9_Pro_XL --port 8083 --no-install`
  - first failure:
    - `project ':attendease-bluetooth' does not specify compileSdk`
  - safe fix applied:
    - `apps/mobile/modules/attendease-bluetooth/android/build.gradle` now opts into Expo's default Android SDK versions and core dependencies
- Second native build attempt revealed a real Kotlin API mismatch in the custom BLE module:
  - failure:
    - `CodedException` constructor calls in `AttendeaseBluetoothModule.kt` were using the old two-argument pattern
  - safe fix applied:
    - `apps/mobile/modules/attendease-bluetooth/android/src/main/java/expo/modules/attendeasebluetooth/AttendeaseBluetoothModule.kt` now uses the current Expo `CodedException(code, message, cause)` signature
- Final native debug build succeeded:
  - command:
    - `pnpm --filter @attendease/mobile exec expo run:android -d Pixel_9_Pro_XL --port 8083 --no-install`
  - result:
    - `BUILD SUCCESSFUL in 28s`
    - `Installing .../android/app/build/outputs/apk/debug/app-debug.apk`
    - `Opening attendease://expo-development-client/?url=http%3A%2F%2F192.168.29.11%3A8083 on Pixel_9_Pro_XL`
- Native install and launch evidence:
  - command:
    - `adb shell pm list packages | rg 'attendease|exponent'`
  - result:
    - `package:com.anurag203.attendease`
  - command:
    - `adb shell dumpsys activity activities | rg -n 'mResumedActivity|topResumedActivity|ResumedActivity|attendease'`
  - result:
    - top resumed activity `com.anurag203.attendease/.MainActivity`
  - artifact:
    - `Structure/artifacts/android-native-debug-launch.png`
  - artifact evidence:
    - native app rendered `Student Dashboard`
    - `Welcome back, Aarav`
    - `Dashboard ready`
- Native crash sweep:
  - command:
    - `adb logcat -d | rg -n 'FATAL EXCEPTION|AndroidRuntime|useLinkPreviewContext|unknown module|requestForegroundPermissionsAsync|AttendeaseBluetoothModule|com.anurag203.attendease'`
  - result:
    - no fresh app-process `FATAL EXCEPTION`
    - no repeat of the earlier Expo Go `useLinkPreviewContext`, `unknown module`, or `requestForegroundPermissionsAsync` failures
    - native libraries loaded successfully for `com.anurag203.attendease`

Native debug-build caveats:

- Expo CLI `--device` expects the AVD name (`Pixel_9_Pro_XL`) rather than the `adb` serial (`emulator-5554`).
- Deterministic nested-route deep links are still easier in Expo Go than in the native development client.
  - direct package-targeted `exp://...` launches did not resolve under `com.anurag203.attendease`
  - direct app-scheme launches like `attendease://--/(teacher)` and development-client launches with nested grouped routes currently land on Expo Router `Unmatched Route`
  - artifact:
    - `Structure/artifacts/android-native-debug-teacher-route.png`
  - artifact evidence:
    - screen showed `Unmatched Route`
    - URI collapsed to `attendease://--`
- Because of that route-launch caveat, the current native debug-build path is best used for:
  - Android install verification
  - native startup verification
  - native crash detection
  - BLE module compilation validation
- Deterministic screen-by-screen sweeps on the emulator are still more reliable through Expo Go raw group-path routes.

## Artifacts Captured

Historical baseline artifacts:

- `Structure/artifacts/android-emulator-baseline.png`
- `Structure/artifacts/android-emulator-post-fix.png`

Prompt 2 route artifacts:

- `Structure/artifacts/android-student-dashboard-route.png`
- `Structure/artifacts/android-student-profile.png`
- `Structure/artifacts/android-student-device-status.png`
- `Structure/artifacts/android-student-classroom-detail.png`
- `Structure/artifacts/android-student-classroom-stream.png`
- `Structure/artifacts/android-student-classroom-schedule.png`
- `Structure/artifacts/android-teacher-dashboard.png`
- `Structure/artifacts/android-teacher-classrooms.png`
- `Structure/artifacts/android-teacher-classroom-roster.png`
- `Structure/artifacts/android-teacher-classroom-schedule.png`
- `Structure/artifacts/android-teacher-classroom-announcements.png`
- `Structure/artifacts/android-teacher-session-history.png`
- `Structure/artifacts/android-teacher-reports.png`
- `Structure/artifacts/android-teacher-exports.png`
- `Structure/artifacts/android-encoded-group-unmatched.png`

Prompt 3 hostile-state and recovery artifacts:

- `Structure/artifacts/android-qr-camera-permission-dialog.png`
- `Structure/artifacts/android-qr-camera-denied-after-fix.png`
- `Structure/artifacts/android-qr-location-after-force-stop.png`
- `Structure/artifacts/android-qr-location-denied.png`
- `Structure/artifacts/android-qr-reopen-after-denial.png`
- `Structure/artifacts/android-recovery-student-after-clear.png`
- `Structure/artifacts/android-recovery-student-after-clear-force-stop.png`
- `Structure/artifacts/android-recovery-device-after-clear-force-stop.png`
- `Structure/artifacts/android-recovery-teacher-post-clear-force-stop.png`

Prompt 4 native debug-build artifacts:

- `Structure/artifacts/android-native-debug-launch.png`
- `Structure/artifacts/android-native-debug-launch.xml`
- `Structure/artifacts/android-native-debug-teacher-route.png`
- `Structure/artifacts/android-native-debug-teacher-route.xml`

For each route artifact above, a matching UI dump was also captured with the same filename stem and `.xml` extension.

## Pass/Fail/Blocker Summary

- `PASS`: Android tooling availability (`adb`, emulator binary, AVD, connected emulator)
- `PASS`: Docker runtime health for emulator-backed API calls
- `PASS`: Expo Metro startup on LAN
- `PASS`: Expo Go installed and able to accept route-launch intents
- `PASS`: current emulator render path for AttendEase student and teacher screens
- `PASS`: deterministic student functional routes listed in this report
- `PASS`: deterministic teacher functional routes listed in this report
- `PASS`: QR camera denial now surfaces the correct denied banner and recovery guidance
- `PASS`: QR location denial now reaches the Android permission dialog and returns to a recoverable denied state
- `PASS`: force-stop and cold relaunch recover student and teacher bootstrap routes
- `PASS`: clear-data recovery is possible, with an Expo Go intro/dev-screen caveat before the app is relaunched
- `PASS`: final logcat sweep after the prompt 3 fixes did not surface fresh `FATAL EXCEPTION`, render-error, unknown-module, or `ExpoLocation` failures in the grep used for this report
- `PASS`: native Android debug build compiles, installs, and launches on the emulator through `expo run:android`
- `PASS`: native startup reaches `com.anurag203.attendease/.MainActivity` and renders the student dashboard without an obvious native crash
- `PASS`: native BLE module build blockers found in this prompt were fixed (`compileSdk` setup and `CodedException` signature usage)
- `MANUAL REQUIRED`: Android Studio IDE click-through remains optional if you specifically want interactive Gradle or debugger usage beyond the verified CLI debug-build path
- `MANUAL REQUIRED`: deterministic nested-route deep links in the native development client still need either a better route-launch helper or manual in-app navigation
- `REAL DEVICE ONLY`: QR camera, GPS range or accuracy, and Bluetooth advertiser/scanner signoff

## Commands Run

Baseline and prep commands:

- `which adb && adb version`
- `adb devices -l`
- `(which emulator && emulator -list-avds) || true`
- `adb shell getprop ro.boot.qemu.avd_name`
- `adb shell pm list packages | rg 'expo|exponent' || true`
- `adb shell dumpsys package host.exp.exponent | rg -n 'versionName|versionCode' -m 4`
- `adb shell settings get global http_proxy || true`
- `pnpm manual:info`
- `POSTGRES_PORT=55432 pnpm runtime:check`
- `cd apps/mobile && pnpm exec expo install --check`
- `cd apps/mobile && pnpm exec expo install --fix`
- `pnpm install`
- `pnpm --filter @attendease/mobile typecheck`
- `pnpm --filter @attendease/mobile test -- src/student-foundation.test.ts src/teacher-operational.test.ts src/student-attendance.test.ts src/bluetooth-attendance.test.ts`
- `pnpm manual:mobile`

Current prompt commands:

- `pnpm --filter @attendease/mobile exec expo start --clear --host lan --port 8083`
- `adb shell "am start -W -a android.intent.action.VIEW -d 'exp://192.168.29.11:8083' host.exp.exponent"`
- `adb shell "am start -W -a android.intent.action.VIEW -d 'exp://192.168.29.11:8083/--/(student)' host.exp.exponent"`
- `adb shell "am start -W -a android.intent.action.VIEW -d 'exp://192.168.29.11:8083/--/(student)/profile' host.exp.exponent"`
- `adb shell "am start -W -a android.intent.action.VIEW -d 'exp://192.168.29.11:8083/--/(student)/device-status' host.exp.exponent"`
- `adb shell "am start -W -a android.intent.action.VIEW -d 'exp://192.168.29.11:8083/--/(student)/classrooms/seed_course_offering_physics' host.exp.exponent"`
- `adb shell "am start -W -a android.intent.action.VIEW -d 'exp://192.168.29.11:8083/--/(student)/classrooms/seed_course_offering_physics/stream' host.exp.exponent"`
- `adb shell "am start -W -a android.intent.action.VIEW -d 'exp://192.168.29.11:8083/--/(student)/classrooms/seed_course_offering_physics/schedule' host.exp.exponent"`
- `adb shell "am start -W -a android.intent.action.VIEW -d 'exp://192.168.29.11:8083/--/(teacher)' host.exp.exponent"`
- `adb shell "am start -W -a android.intent.action.VIEW -d 'exp://192.168.29.11:8083/--/(teacher)/classrooms' host.exp.exponent"`
- `adb shell "am start -W -a android.intent.action.VIEW -d 'exp://192.168.29.11:8083/--/(teacher)/classrooms/seed_course_offering_math/roster' host.exp.exponent"`
- `adb shell "am start -W -a android.intent.action.VIEW -d 'exp://192.168.29.11:8083/--/(teacher)/classrooms/seed_course_offering_math/schedule' host.exp.exponent"`
- `adb shell "am start -W -a android.intent.action.VIEW -d 'exp://192.168.29.11:8083/--/(teacher)/classrooms/seed_course_offering_math/announcements' host.exp.exponent"`
- `adb shell "am start -W -a android.intent.action.VIEW -d 'exp://192.168.29.11:8083/--/(teacher)/sessions' host.exp.exponent"`
- `adb shell "am start -W -a android.intent.action.VIEW -d 'exp://192.168.29.11:8083/--/(teacher)/reports' host.exp.exponent"`
- `adb shell "am start -W -a android.intent.action.VIEW -d 'exp://192.168.29.11:8083/--/(teacher)/exports' host.exp.exponent"`
- `adb shell "am start -W -a android.intent.action.VIEW -d 'exp://192.168.29.11:8083/--/%28student%29/profile' host.exp.exponent"`
- `adb exec-out screencap -p > Structure/artifacts/...`
- `adb shell uiautomator dump /sdcard/window_dump.xml`
- `adb logcat -c`
- `adb logcat -d | rg -n 'ReactNativeJS|FATAL EXCEPTION|Render Error|Unhandled|Error:'`

Prompt 3 hostile-state commands:

- `adb shell pm revoke host.exp.exponent android.permission.CAMERA`
- `adb shell pm revoke host.exp.exponent android.permission.ACCESS_FINE_LOCATION`
- `adb shell pm revoke host.exp.exponent android.permission.ACCESS_COARSE_LOCATION`
- `adb shell pm grant host.exp.exponent android.permission.CAMERA`
- `adb shell am force-stop host.exp.exponent`
- `adb shell pm clear host.exp.exponent`
- `adb shell input tap ...` to deny Android runtime permission prompts and dismiss Expo Go intro UI
- `adb logcat -d | rg -n 'expo-location|Location|ReactNativeJS|Error|permission|foreground'`
- `adb logcat -d | rg -n 'ReactNativeJS|FATAL EXCEPTION|Render Error|Uncaught Error|ExpoLocation|unknown module|requestForegroundPermissionsAsync'`
- `pnpm exec biome check --write apps/mobile/src/student-foundation.tsx apps/mobile/src/student-attendance.ts apps/mobile/src/student-attendance.test.ts`
- `pnpm --filter @attendease/mobile test -- src/student-attendance.test.ts`
- `pnpm --filter @attendease/mobile typecheck`

Prompt 4 native debug-build commands:

- `pnpm --filter @attendease/mobile exec expo run:android --help`
- `java -version`
- `echo $ANDROID_HOME`
- `pnpm --filter @attendease/mobile exec expo run:android -d emulator-5554 --port 8083 --no-install`
- `pnpm --filter @attendease/mobile exec expo run:android -d Pixel_9_Pro_XL --port 8083 --no-install`
- `adb shell pm list packages | rg 'attendease|exponent'`
- `adb shell dumpsys activity activities | rg -n 'mResumedActivity|topResumedActivity|ResumedActivity|attendease|expo-development-client|host.exp.exponent'`
- `adb exec-out screencap -p > Structure/artifacts/android-native-debug-launch.png`
- `adb shell uiautomator dump /sdcard/window_dump.xml`
- `adb logcat -d | rg -n 'FATAL EXCEPTION|AndroidRuntime|useLinkPreviewContext|unknown module|requestForegroundPermissionsAsync|AttendeaseBluetoothModule|com.anurag203.attendease'`
- `adb shell "am start -W -a android.intent.action.VIEW -d 'exp://192.168.29.11:8083/--/(teacher)' com.anurag203.attendease"`
- `adb shell "am start -W -a android.intent.action.VIEW -d 'attendease://expo-development-client/?url=http%3A%2F%2F192.168.29.11%3A8083%2F--%2F(teacher)' com.anurag203.attendease"`
- `adb shell "am start -W -a android.intent.action.VIEW -d 'attendease://--/(teacher)' com.anurag203.attendease"`
- `pnpm --filter @attendease/mobile typecheck`

## Exact Next Pickup

- Android emulator validation is complete for its intended scope.
- Next recommended action:
  - use `guide.md` and `Structure/manual-check-quickstart.md`
  - run real Android phone checks for:
    - QR camera scanning
    - GPS permission, range, and accuracy validation
    - Bluetooth advertiser and scanner flows
  - then update `Structure/release-readiness-report.md` with the real-device evidence
