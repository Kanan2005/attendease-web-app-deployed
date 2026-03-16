# AttendEase Android Emulator Validation Appendix

Companion to: [`android-emulator-validation-report.md`](./android-emulator-validation-report.md)

## Hostile-State and Recovery Checks

Status: `PASS` with caveats

Safe issues fixed during the hostile-state pass:

- QR camera denial now updates the main permission banner to `Permission denied`
- QR location capture now loads `expo-location` through `require("expo-location")` inside the handler, which fixed the Expo Go runtime failure

Evidence captured:

- camera denial and recovery banners
- location denial and recovery banners
- force-stop and cold relaunch recovery
- Expo Go clear-data recovery, including the expected Expo intro caveat before the app is relaunched

## Native Debug-Build Checks

Status: `PASS` with caveats

Validated outcomes:

- Expo CLI exposes the expected `expo run:android` options
- Android prerequisites were present on the host machine
- the first native build uncovered a real Android-only BLE module `compileSdk` issue, which was fixed
- the second build uncovered a Kotlin `CodedException` API mismatch, which was fixed
- the final native debug build succeeded, installed, and launched on the emulator
- the resumed native activity was `com.anurag203.attendease/.MainActivity`
- no fresh native crash signature showed up in the final logcat sweep used for this report

Important caveat:

- deterministic nested-route deep links remain easier in Expo Go than in the native development client, so native acceptance currently relies on base launch plus in-app navigation

## Artifacts Captured

Captured artifacts include:

- emulator baseline screenshots
- student dashboard, profile, device-status, classroom detail, stream, and schedule screenshots
- teacher dashboard, classroom, roster, schedule, announcements, session history, reports, and exports screenshots
- hostile-state screenshots for camera denial, location denial, reopen-after-denial, and clear-data recovery
- native debug-build screenshots and matching UI dump XML files

For each route artifact above, a matching UI dump was also captured with the same filename stem and `.xml` extension where applicable.

## Commands Run

Representative emulator and native-debug commands:

```bash
which adb && adb version
adb devices -l
(which emulator && emulator -list-avds) || true
adb shell getprop ro.boot.qemu.avd_name
pnpm manual:info
POSTGRES_PORT=55432 pnpm runtime:check
pnpm --filter @attendease/mobile exec expo start --clear --host lan --port 8083
adb shell "am start -W -a android.intent.action.VIEW -d 'exp://<lan-ip>:8083/--/(student)' host.exp.exponent"
adb shell "am start -W -a android.intent.action.VIEW -d 'exp://<lan-ip>:8083/--/(teacher)' host.exp.exponent"
adb shell pm revoke host.exp.exponent android.permission.CAMERA
adb shell pm revoke host.exp.exponent android.permission.ACCESS_FINE_LOCATION
adb shell am force-stop host.exp.exponent
adb shell pm clear host.exp.exponent
pnpm --filter @attendease/mobile exec expo run:android -d Pixel_9_Pro_XL --port 8083 --no-install
adb exec-out screencap -p > Structure/artifacts/...
adb shell uiautomator dump /sdcard/window_dump.xml
adb logcat -d | rg -n 'FATAL EXCEPTION|AndroidRuntime|AttendeaseBluetoothModule'
```

## Exact Next Pickup

- Android emulator validation is complete for its intended scope.
- The next step is real Android phone validation for QR camera scanning, GPS permission/range/accuracy, and Bluetooth advertiser/scanner flows, followed by an update to [`release-readiness-report.md`](./release-readiness-report.md).
