# AttendEase Android Emulator Validation Plan

## Purpose

This plan defines how to use the Android emulator and Android Studio to get more validation coverage from the current AttendEase mobile app before or alongside real-device testing.

The goal is not to pretend emulator coverage replaces real phones.

The goal is to add:

- repeatable regression checks
- better crash detection
- better log capture
- deterministic permission and lifecycle testing
- faster UI and navigation verification
- safer validation of native Android debug builds

## Recommendation Summary

Use the Android emulator and Android Studio for:

- app startup and bundling verification
- login and navigation regression checks
- teacher and student dashboard loading
- classroom detail, stream, schedule, history, and profile route checks
- permission grant and revoke cycles
- force-stop and cold-start recovery
- process-death and state-restoration checks
- deep-link verification
- deterministic screenshot and log capture
- native Android debug-build checks for the current app

Do not treat emulator validation as final sign-off for:

- QR camera quality and scanning behavior
- real GPS accuracy and out-of-range behavior
- Bluetooth advertiser and scanner behavior
- trusted-device behavior under real hardware conditions
- final production device compatibility

Practical recommendation:

- use emulator validation to catch mobile regressions faster
- use Android Studio and `adb` to force device states that are painful to reproduce manually
- still keep real-phone validation for QR, GPS, Bluetooth, and final release confidence

## Current Local State

The current machine already has useful Android validation prerequisites:

- Android Studio is installed
- `adb` is available
- an emulator exists: `Pixel_9_Pro_XL`
- the emulator was already detected by `adb devices`
- Expo Metro can now start successfully again after:
  - disabling Expo typed-route generation in `apps/mobile/app.json`
  - moving server-only auth exports behind explicit subpaths in `@attendease/auth`

This makes emulator validation realistic and useful right now.

## What Emulator Validation Can Add

### 1. Deterministic Startup Checks

The emulator can verify:

- app launches cleanly after Metro start
- the Expo bundle does not crash during module resolution
- login screens load without immediate runtime errors
- student and teacher route groups open without blank-screen failures

This is especially useful after shared package refactors.

### 2. Repeatable Screen Checks

The emulator is good for:

- student dashboard rendering
- teacher dashboard rendering
- classroom navigation flows
- session history navigation
- export and report screen opening
- device-status route opening

This gives a faster repeated regression loop than real-phone tapping.

### 3. Permission-State Testing

The emulator can help validate:

- grant or revoke camera permission
- grant or revoke location permission
- clear app data
- force app reinstall-like flows
- permission denial banners and retry states

This is valuable because permission-state testing is annoying and inconsistent by hand.

### 4. Lifecycle And Recovery Testing

The emulator can be used to force:

- cold boot
- app force-stop
- relaunch after force-stop
- background to foreground transitions
- process death and recovery

This is good for:

- session bootstrap resilience
- cached-auth recovery
- screen reload behavior
- crash detection through logcat

### 5. Native Debug-Build Validation

Android Studio plus `expo run:android` can add validation beyond Expo Go:

- native module linking
- debug-build installation
- startup under the real Android runtime
- native logcat visibility
- Bluetooth bridge initialization boundaries

This is not the same as final BLE sign-off, but it is still much better than web-only or Expo-Go-only confidence.

### 6. Deep-Link And Route Checks

The emulator can help verify:

- app scheme handling
- direct route launches through deep links
- route parsing for classroom or session detail screens

This is useful for route integrity and onboarding flows.

### 7. Evidence Capture

The emulator path makes it easier to collect:

- screenshots
- screen recordings
- `logcat` traces
- route launch evidence
- crash stack traces

This improves debugging quality during remediation and release-readiness work.

## What Emulator Validation Cannot Replace

These still need real-device validation:

- actual QR scanning through the real camera
- real GPS drift, accuracy, and out-of-range behavior
- Bluetooth advertiser and scanner behavior
- trusted-device behavior under real install-id and real native hardware conditions
- device performance on the intended release hardware mix

The emulator can support those areas only partially:

- route access
- placeholder screen rendering
- permission UI
- non-hardware error states

It cannot act as the final release gate for those hardware-sensitive features.

## Recommended Validation Phases

## Phase A: Emulator Baseline

First, confirm the emulator path itself is stable.

Recommended checks:

- `adb devices`
- emulator availability
- Docker runtime healthy
- Expo Metro starts
- app opens on emulator
- no immediate red-screen or module-resolution crash

Useful outputs:

- Metro startup proof
- emulator launch proof
- first-screen screenshot

## Phase B: Functional Regression Checks

Run deterministic student and teacher flows through the emulator.

Recommended focus:

- student login
- teacher login
- dashboard
- classroom navigation
- stream
- schedule
- profile
- session history
- manual-edit route opening
- report route opening
- export route opening

This phase is good for catching:

- missing imports
- broken route params
- stale query assumptions
- blank UI states
- regression after API-client changes

## Phase C: Hostile-State And Recovery Checks

Use emulator and `adb` to force states that are hard to reproduce manually.

Recommended focus:

- revoke camera permission
- revoke location permission
- force-stop the app
- clear app data
- relaunch after force-stop
- offline or reconnect scenarios where practical
- deep-link route launch

This phase is especially useful for:

- blocked-attendance messaging
- login recovery
- device-status recovery
- empty/error state correctness

## Phase D: Native Debug-Build Validation

Use `expo run:android` and optionally Android Studio to validate the native debug path.

Recommended focus:

- native app install succeeds
- app launches in debug build
- native module boundaries do not immediately crash
- logcat stays clean of obvious fatal exceptions

This phase adds confidence for:

- BLE bridge boundaries
- Android permission declarations
- app startup outside Expo Go

It still does not replace final real-device BLE sign-off.

## Suggested Tooling

### ADB

Use `adb` for:

- device detection
- app launch
- force-stop
- log capture
- screenshots
- deep-link injection
- permission changes where practical

### Android Studio

Use Android Studio for:

- emulator management
- Logcat filtering
- native debug-build run
- easier crash inspection
- inspecting app restarts and cold boots

### Expo Metro

Use Metro for:

- Expo Go validation
- fast iteration during mobile remediation
- confirming JS-side route or module issues are fixed

### Optional Native Debug Path

Use:

- `pnpm --filter @attendease/mobile exec expo run:android`

This is the recommended next step when:

- Expo Go is not enough
- you need native-module confidence
- you want Android Studio to run the installed native project

## Recommended Evidence To Capture

For each meaningful emulator validation pass, capture:

- command run
- whether the check was emulator-only or native-debug-build
- screenshot path if useful
- route or screen name
- whether it passed, failed, or is blocked
- relevant `logcat` evidence for failures

Good evidence artifacts:

- screenshots
- screen recordings
- short `logcat` extracts
- exact route or account used

## What To Fix Versus What To Only Record

Fix directly if found:

- startup crashes
- route-resolution crashes
- shared package bundling problems
- mobile screen regressions
- broken login or navigation caused by code
- obvious permission-state handling regressions

Record only, do not overclaim:

- Bluetooth real-hardware behavior
- QR real camera behavior
- GPS final geolocation accuracy
- real-device performance issues

## Recommended Execution Order With Current Repo State

Because the current release blockers include student and teacher mobile report truth mismatch:

1. first run the mobile report remediation playbook
   - `Structure/phase_prompting/18-mobile-report-blockers-prompt.md`
2. then run the Android emulator validation playbook
3. then rerun the affected release-readiness evidence
4. finally run real-device QR and Bluetooth checks

If you want fast extra confidence before report remediation, you can still run Phase A and Phase B of emulator validation first, but that will not resolve the report blocker itself.

## Acceptance Criteria

This emulator-validation plan is useful only if it produces:

- repeatable Android checks that can be rerun after fixes
- additional evidence beyond ad-hoc manual tapping
- honest separation between emulator confidence and real-device confidence
- better debugging artifacts for mobile issues

It is not successful if it merely repeats the existing manual guide without adding:

- lifecycle coverage
- permission coverage
- native debug coverage
- deeper crash or log evidence
