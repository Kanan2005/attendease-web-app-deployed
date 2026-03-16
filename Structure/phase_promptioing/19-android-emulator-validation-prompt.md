# Phase Prompt: Android Emulator And Android Studio Validation

Use this playbook after the core feature work is done and when you want deeper Android-only validation than simple manual tapping.

Execution order: Optional post-release validation track, after `18-mobile-report-blockers-prompt.md` or in parallel with release-readiness follow-up when mobile report blockers are already understood.

Purpose:

- use the Android emulator and Android Studio as real validation tools
- add deterministic Android coverage that is hard to do manually
- catch mobile regressions with logs, screenshots, lifecycle forcing, and native debug paths
- improve confidence in startup, navigation, permission handling, and native Android integration
- keep an honest separation between emulator validation and real-device validation

Use [`../android-emulator-validation-plan.md`](../android-emulator-validation-plan.md) as the source of truth for scope and limits.

## Prompt 1
```text
You are executing the AttendEase Android emulator validation plan.

Read these files first:
- Structure/context.md
- Structure/android-emulator-validation-plan.md
- Structure/release-readiness-report.md
- guide.md
- README.md
- apps/mobile/app.json
- apps/mobile/package.json

Inspect the current repo and local Android setup before making assumptions.

Your task for this step is to establish the Android emulator validation baseline:
- verify Android tooling availability where practical:
  - `adb`
  - connected emulator
  - available AVDs
  - Expo Metro start path
- create or update a working evidence file at `Structure/android-emulator-validation-report.md`
- organize that report with clear sections for:
  - environment and tooling status
  - emulator baseline
  - functional regression checks
  - hostile-state and recovery checks
  - native debug-build checks
  - artifacts captured
  - pass/fail/blocker summary
- verify the Docker-backed local runtime is healthy enough for Android app validation
- verify Expo Metro starts successfully for the mobile app
- verify the app can be opened on the connected Android emulator through Expo Go where practical
- capture concrete evidence in the report:
  - commands run
  - emulator or AVD name
  - pass/fail status
  - blockers
- fix any safe mobile startup or runtime-prep issue you find
- update Structure/context.md with progress, checks run, blockers, and the exact next pickup point

Important constraints:
- do not pretend real-device QR, GPS, or Bluetooth checks are satisfied by emulator success
- do not redesign mobile flows while doing validation
- if Expo Go, emulator image, or AVD state causes a blocker, record it exactly instead of hand-waving it

Run the relevant checks you can run locally, fix safe setup issues before stopping, and leave the repo with a trustworthy Android-emulator baseline report.
```

## Prompt 2
```text
Continue the AttendEase Android emulator validation work from the current repo state.

Read these files first:
- Structure/context.md
- Structure/android-emulator-validation-plan.md
- Structure/android-emulator-validation-report.md
- Structure/release-readiness-report.md
- Structure/requirements/03-student-mobile-app.md
- Structure/requirements/04-teacher-mobile-app.md
- Structure/architecture/03-student-mobile-app.md
- Structure/architecture/04-teacher-mobile-app.md

Now execute deterministic Android functional regression checks on the emulator:
- verify student Android flows where practical:
  - app open
  - login
  - dashboard
  - classroom detail
  - stream
  - schedule
  - profile
  - device-status
- verify teacher Android flows where practical:
  - app open
  - login
  - teacher dashboard
  - classroom navigation
  - roster entrypoints
  - schedule route
  - announcements route
  - session history route
  - reports route
  - exports route
- use emulator-friendly tooling where useful:
  - `adb shell am start`
  - `adb exec-out screencap -p`
  - `adb logcat`
  - deep-link launches if practical
- add or extend automated or semi-automated checks only where they safely improve confidence
- fix safe route, startup, or runtime regressions you discover
- record concrete evidence in `Structure/android-emulator-validation-report.md`
- update any guide or setup docs if the actual emulator workflow differs from the current docs
- update Structure/context.md with progress, tests added, blockers, and the exact next pickup point

Important constraints:
- do not mark report flows as passed if the known report blocker still makes their data untrustworthy
- do not turn emulator testing into vague manual notes; capture evidence, commands, and exact outcomes
- keep the current route structure intact

Run the relevant checks you can run locally, fix safe issues before stopping, and leave the report with honest Android functional validation status.
```

## Prompt 3
```text
Continue the AttendEase Android emulator validation work from the current repo state.

Read these files first:
- Structure/context.md
- Structure/android-emulator-validation-plan.md
- Structure/android-emulator-validation-report.md
- guide.md
- apps/mobile/src/student-foundation.tsx
- apps/mobile/src/teacher-foundation.tsx

Now execute hostile-state, permission, and recovery validation on Android where practical:
- verify permission-related Android behavior where practical:
  - camera denied state
  - location denied state
  - re-open after permission denial
- verify lifecycle and recovery behavior where practical:
  - force-stop the app
  - relaunch after force-stop
  - clear app data if useful
  - verify login or bootstrap recovery
  - verify device-status or blocked-attendance messaging still renders
- verify deep-link or direct route launch behavior where practical
- collect useful evidence:
  - screenshots
  - short logcat excerpts
  - route launch outputs
- add or extend tests only if a high-value gap is discovered and can be covered safely in code
- fix safe lifecycle or permission-state issues discovered during this pass
- update `Structure/android-emulator-validation-report.md` with pass/fail/evidence/blockers
- sync `guide.md` or other docs if the Android validation path learned something important
- update Structure/context.md with progress, tests added, blockers, and the exact next pickup point

Important constraints:
- do not fake camera, GPS, or BLE final confidence from emulator-only checks
- use emulator validation to improve state-handling confidence, not to erase real-device requirements
- if a behavior is blocked by emulator limitations or Expo Go limitations, say so explicitly

Run the relevant checks you can run locally, fix safe issues before stopping, and leave the report with credible hostile-state Android evidence.
```

## Prompt 4
```text
Continue the AttendEase Android emulator validation work from the current repo state.

Read these files first:
- Structure/context.md
- Structure/android-emulator-validation-plan.md
- Structure/android-emulator-validation-report.md
- guide.md
- README.md
- Structure/release-readiness-report.md

Now validate the native Android debug-build path and finish the emulator validation pass:
- verify the practical native Android path where feasible:
  - `pnpm --filter @attendease/mobile exec expo run:android --help`
  - native debug-build prerequisites
  - Android Studio or Gradle assumptions
- if a real native debug build is practical in this environment, run it and record:
  - whether install succeeded
  - whether app launch succeeded
  - whether obvious native crashes occurred
  - what remains blocked
- if a full native debug build is not practical, document the exact missing prerequisite instead of pretending success
- review the full Android emulator report and mark each major area as:
  - passed
  - failed
  - blocked
  - manual-required
- do a final documentation sync for:
  - `guide.md`
  - `README.md`
  - any Android-specific setup notes touched during this pass
- update Structure/context.md with completed scope, remaining gaps, and the exact next recommended action
- summarize in the final response:
  - what Android checks were newly covered by emulator or Android Studio
  - what is still real-device-only
  - what commands were run
  - what artifacts or evidence were captured
  - what blockers remain

Important constraints:
- do not call Android validation complete if native or emulator results are still blocked in a meaningful way
- do not downgrade real-device QR, GPS, or Bluetooth requirements just because emulator checks passed
- keep the final conclusion evidence-based and Android-specific

Fix any safe remaining issues before stopping, then leave the repo with a clean Android-emulator validation handoff.
```
