# Phase Prompt: Mobile Report Blocker Remediation

Use this playbook after release-readiness when the known student and teacher mobile report blockers still remain.

Execution order: Post-release-readiness remediation, after `17-release-readiness-prompt.md`.
Assume the full architecture sequence, Dockerization, and release-readiness work are already present in the repo.

Purpose:

- remove the student mobile report fallback models
- remove the teacher mobile report fallback models
- make both mobile report surfaces use the final backend report APIs
- prove that mobile report truth matches backend report truth on seeded data
- rerun the affected release-readiness evidence so the blocker status is real, not assumed

Use [`../release-readiness-report.md`](../release-readiness-report.md) as the blocker source of truth and keep it updated when this work is finished.

## Prompt 1
```text
You are fixing the AttendEase mobile reporting blockers from the release-readiness report.

Read these files first:
- Structure/context.md
- Structure/release-readiness-report.md
- Structure/final-tech-stack-and-implementation.md
- Structure/testing-strategy.md
- Structure/requirements/03-student-mobile-app.md
- Structure/requirements/04-teacher-mobile-app.md
- Structure/requirements/09-reports-exports.md
- Structure/architecture/03-student-mobile-app.md
- Structure/architecture/04-teacher-mobile-app.md
- Structure/architecture/09-reports-exports.md

Inspect the current mobile report implementation and the existing backend report APIs before making changes.

Your task in this step is to replace the student mobile report fallback layer with real report-backed data:
- locate the current student mobile report screens, hooks, models, and fallback calculations
- identify the final backend APIs already available for:
  - student report overview
  - student subject-wise report list
  - student subject detail
- implement a clean mobile report query layer for student reports using the existing shared API client
- replace lecture-coverage-derived fallback values in the student report route flow with the real report responses
- preserve the current route structure and UX direction; do not redesign the student report flow
- add clear loading, empty, and error states where the fallback logic previously hid missing data
- keep query invalidation and cache behavior coherent with the existing student mobile architecture
- add or extend robust tests for:
  - student report query hooks or helpers
  - student report view-model mapping
  - seeded-truth alignment where practical
- update matching requirement, architecture, and mobile-flow docs if they still describe fallback report behavior
- update Structure/context.md with progress, files changed, tests added, blockers removed, and the exact next pickup point

Important constraints:
- do not introduce new fake report calculations in mobile
- do not re-derive attendance percentages from lecture counts if the backend already provides the truth
- do not redesign the student app route tree or navigation flow
- if a student backend contract is insufficient, add the smallest aligned improvement instead of inventing mobile-only logic

Run the relevant tests and checks you can run locally, fix safe issues before stopping, and leave the student mobile report flow using the real backend truth.
```

## Prompt 2
```text
Continue the AttendEase mobile report blocker remediation from the current repo state.

Read these files first:
- Structure/context.md
- Structure/release-readiness-report.md
- Structure/requirements/04-teacher-mobile-app.md
- Structure/requirements/09-reports-exports.md
- Structure/architecture/04-teacher-mobile-app.md
- Structure/architecture/09-reports-exports.md
- apps/mobile/src/teacher-foundation.tsx
- apps/mobile/src/teacher-query.ts

Now replace the teacher mobile report fallback flow with the final teacher report APIs:
- inspect the current teacher report screen implementation and identify where lecture-derived fallback data is still used
- map the current teacher mobile report UI to the existing backend APIs for:
  - day-wise teacher reports
  - subject-wise teacher reports
  - student percentage reports
- implement the teacher mobile report query layer on top of the existing shared auth client
- update the teacher report screen(s) so they render real attendance truth rather than fallback lecture coverage
- keep the current teacher route and navigation structure intact
- make sure report filters, classroom or subject selection, and empty states stay usable on mobile
- verify the export route still remains API-backed and does not regress while report wiring changes
- add or extend robust tests for:
  - teacher report query hooks or query keys
  - teacher report view-model mapping
  - filter behavior and response rendering helpers where practical
- sync any requirement, architecture, README, or guide docs that still say teacher mobile reports are waiting on later APIs
- update Structure/context.md with progress, tests added, blockers removed, and the exact next pickup point

Important constraints:
- do not fall back to lecture counts or classroom coverage percentages once the real teacher report data is available
- do not redesign teacher report UX beyond what is necessary to correctly surface the real API data
- keep mobile code maintainable; prefer shared report mapping helpers over duplicated screen-local logic

Run the relevant tests and checks you can run locally, fix safe issues before stopping, and leave teacher mobile reports wired to the final report endpoints.
```

## Prompt 3
```text
Continue the AttendEase mobile report blocker remediation from the current repo state.

Read these files first:
- Structure/context.md
- Structure/release-readiness-report.md
- Structure/manual-check-quickstart.md
- guide.md
- Structure/requirements/03-student-mobile-app.md
- Structure/requirements/04-teacher-mobile-app.md
- Structure/requirements/09-reports-exports.md

Now harden and verify the mobile reporting fix end to end:
- review that student and teacher mobile report screens no longer use fallback lecture-coverage truth
- verify student mobile report values match the backend student report APIs on seeded data
- verify teacher mobile report values match the backend teacher report APIs on seeded data
- add robust tests for:
  - student-versus-backend truth alignment
  - teacher mobile report mapping and filter behavior
  - empty-state and error-state handling for mobile reports
- run the relevant mobile tests, API tests, and typechecks needed to prove the report blocker is actually removed
- if an emulator or host-side scripted verification is practical, run it and record exact evidence
- update Structure/release-readiness-report.md so the student and teacher mobile report blockers are either:
  - removed with evidence
  - or narrowed to a smaller remaining issue with evidence
- sync any docs or guides that still mention the old fallback report behavior
- update Structure/context.md with completed scope, tests added or updated, remaining gaps, and the exact next pickup point

Important constraints:
- do not mark the blocker fixed unless you actually verified the values against the backend truth
- do not replace backend truth checks with UI-only confidence
- if any report screen still depends on non-final data, name it explicitly and leave it documented as a remaining blocker

Run the relevant tests and validation checks before stopping, and leave the repo with a trustworthy mobile-report verification result.
```

## Prompt 4
```text
Finish the AttendEase mobile report blocker remediation with a release-readiness follow-up.

Read these files first:
- Structure/context.md
- Structure/release-readiness-report.md
- Structure/release-readiness-checklist.md
- Structure/requirements/03-student-mobile-app.md
- Structure/requirements/04-teacher-mobile-app.md
- Structure/requirements/09-reports-exports.md
- Structure/architecture/03-student-mobile-app.md
- Structure/architecture/04-teacher-mobile-app.md
- Structure/architecture/09-reports-exports.md

Now do all of the following:
- review the release-readiness report and remove or downgrade only the report-related blockers that are now fully evidenced as fixed
- make sure the report clearly distinguishes:
  - mobile report blockers resolved in code and tests
  - real-device-only QR or Bluetooth blockers that still remain
  - production-only setup blockers that still remain
- add any final missing automated coverage if a safe high-value mobile reporting gap still exists
- do a final documentation sync for any requirement, architecture, README, guide, or manual-check docs touched during the remediation
- update Structure/context.md with completed scope, remaining gaps, and the exact next recommended action
- summarize in the final response:
  - what student mobile reporting now uses
  - what teacher mobile reporting now uses
  - which blocker lines in release-readiness were removed or changed
  - which tests were added or updated
  - which commands were run
  - what manual verification still remains

Important constraints:
- do not claim a full release `GO` unless the broader release blockers are actually gone
- this prompt closes the mobile report blocker remediation, not the entire product rollout story
- keep the recommendation evidence-based and specific

Fix any safe remaining issues before stopping, then leave the repo with a clean remediation handoff and updated release-readiness status.
```
