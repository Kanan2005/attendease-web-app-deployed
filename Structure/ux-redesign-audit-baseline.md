# UX Redesign Audit Baseline Archive

This companion note keeps the original pre-reset UX diagnosis that motivated the reset track.

## Original Pre-Reset Baseline Problems

### 1. Before the reset, the product spoke like a scaffold

Before the reset prompts, the repo already worked in many places, but the UI still talked like an implementation scaffold instead of a finished product.

Common user-facing phrases still include:

- shell
- foundation
- route ready
- later
- local verification
- prepared
- bootstrapping
- attendance readiness
- live API
- Web Login Foundation
- Open Login Shell

This language forced users to understand the build process instead of the task they were trying to complete.

### 2. The information architecture was route-first, not role-first

- mobile defaulted directly into the student side instead of making role entry explicit
- teacher/admin web used a shared layout, but the role value proposition was not clearly separated
- attendance mode ownership was technically implemented but not explained product-wise
- the product expected users to discover workflows from page lists more than from clear primary actions

### 3. The UI explained internal plumbing

Many screens described query invalidation, future phases, backend readiness, route stability,
native scanner wiring, and shell states rather than the user’s next step.

### 4. Dev bootstrap was too visible

The product often exposed seeded credentials, install IDs, public keys, login helper wording, and
local password verification language on primary entry screens.

## Detailed Audit By Area

### Auth, Entry, And First-Run

Pre-reset baseline:

- the mobile root route redirected straight to the student dashboard
- student and teacher mobile both exposed session-setup cards instead of first-run auth/product entry
- the web home page was a scaffold landing page
- the web login page worked locally but was framed as a dev helper

Problems:

- there was no deliberate first-run choice between student and teacher inside the mobile app
- there was no clean student registration journey in the app
- teacher sign-in and student sign-in did not feel like distinct product paths
- admin was technically separate but not clearly positioned as a governance/recovery role
- local password login read like a temporary support surface instead of a finished sign-in experience

Reset implications:

- later prompts needed distinct first-run entry for student and teacher
- student registration needed to become a real product flow
- admin web login needed to read like governance/support sign-in, not alternate teacher sign-in
- developer bootstrap inputs needed to move behind dev-only tooling

### Student Mobile

Pre-reset baseline:

- dashboard
- classroom detail
- stream
- schedule
- profile
- device status
- reports
- history
- join classroom
- QR attendance
- Bluetooth attendance

Problems:

- entry was wrong because the app opened into the student route by default
- session setup exposed email, password, install ID, and public key inputs
- attendance routes leaked trusted-device readiness, lecture candidates, query invalidation, and native wiring
- device trust was not explained in user terms
- navigation felt feature-complete but not task-prioritized
- empty/support states sounded procedural instead of reassuring

Reset implications:

- student mobile needed to become registration-first, attendance-first, and classroom-first
- Bluetooth attendance stayed student-visible for marking, but teacher ownership of Bluetooth creation stayed on teacher mobile
- device binding needed to be presented as a product rule during onboarding

### Teacher Mobile

Pre-reset baseline:

- dashboard
- classrooms
- roster
- schedule
- announcements
- lectures
- Bluetooth create
- Bluetooth active session
- session history and manual edit
- reports
- exports

Problems:

- teacher entry was not explicit enough
- Bluetooth ownership existed technically, but the UX sounded provisional
- the product mix was too broad on small screens
- teacher copy leaked implementation thinking
- session history and manual edit were powerful, but the language was still mostly operational

Reset implications:

- teacher mobile needed to clearly own Bluetooth attendance initiation
- Bluetooth creation and active-session flows needed to become primary teacher-mobile actions
- the rest of teacher mobile needed to support daily teaching operations without sounding like a debug console

### Teacher Web

Pre-reset baseline:

- dashboards
- classrooms
- semester visibility
- QR sessions and projector
- session history/manual edits
- reports
- exports
- analytics
- email automation

Problems:

- landing and login pages looked like internal tools
- dashboard content was placeholder-heavy
- many pages were generic containers rather than strong workflows
- QR + GPS ownership was implemented, but the workflow over-explained the architecture
- reporting/exports/analytics hierarchy was too weak

Reset implications:

- teacher web needed to feel like the main teacher operations surface
- QR + GPS setup and projector flow needed to become the obvious attendance path on web
- reporting and analytics needed clearer progression from overview to detail to action

### Admin Web And Support/Governance

Pre-reset baseline:

- dashboard
- devices
- imports
- semesters

Problems:

- admin felt like teacher web with different pages instead of a distinct governance console
- device recovery power existed, but the UI language did not strongly communicate audit, risk, or support responsibility
- imports, device recovery, and semester governance did not read as one support workflow
- admin login was separate, but the framing did not emphasize that enough

Reset implications:

- admin needed to stay login-only
- admin needed a clearer governance/support identity than teacher web
- device recovery, student support, imports, and academic governance needed to read like intentional admin tools

### Device Binding And Registration

Pre-reset baseline:

- device trust backend rules were strong
- one-device enforcement existed
- admin recovery existed
- attendance readiness checks existed

Problems:

- student-facing setup exposed install IDs, public keys, and readiness states
- one-device policy was not introduced through product onboarding
- recovery was possible, but the end-user story was unclear
- the UX did not clearly express the real device-binding rule

Reset implications:

- student self-registration needed to include device-binding at onboarding time
- device binding needed to be explained with plain language and explicit recovery pathways
- admin recovery powers needed to remain real but be framed as exceptional support actions

## Current Product Inventory

### Mobile

Current route groups:

- student:
  - dashboard
  - join classroom
  - history
  - reports
  - profile
  - device status
  - attendance hub
  - QR scan
  - Bluetooth scan
  - classroom detail
  - classroom stream
  - classroom schedule
- teacher:
  - dashboard
  - classrooms list
  - classroom detail
  - roster
  - schedule
  - announcements
  - lectures
  - Bluetooth create
  - Bluetooth active session
  - session history
  - session detail / manual edit
  - reports
  - exports

### Web

Current route groups:

- teacher:
  - dashboard
  - classrooms
  - classroom create
  - classroom detail
  - roster
  - schedule
  - stream
  - lectures
  - imports
  - semesters
  - session history
  - QR active session
  - QR projector
  - reports
  - exports
  - analytics
  - email automation
- admin:
  - dashboard
  - semesters
  - devices
  - imports
- shared:
  - login
  - password login POST

## Classroom, Roster, Join Code, And Scheduling

Pre-reset baseline:

- classroom list and detail
- roster management
- join codes
- semester views
- schedule editing
- lectures
- imports
- stream/announcements

Problems:

- terminology was inconsistent across classroom, course offering, class, section, subject, and semester
- join-code and roster flows were split across multiple surfaces without a clear “manage students” mental model
- schedule and lecture flows sounded like route-level tooling rather than product tasks
- classroom detail pages often behaved like nav containers more than task pages

Reset implications:

- later prompts needed a final naming system used consistently across product surfaces
- roster, imports, join code, and attendance-session ownership needed to be easier to discover from classroom detail

## Attendance Modes

Pre-reset baseline:

- student had QR and Bluetooth attendance routes
- teacher mobile owned Bluetooth session creation
- teacher web owned QR + GPS session creation
- backend truth for both attendance modes existed

Problems:

- attendance-mode ownership was not obvious from the UX itself
- student attendance screens exposed too much verification detail
- QR + GPS and Bluetooth permission states were functional, but the language was too technical
- the product needed a simpler rule: teacher starts Bluetooth means students use Bluetooth; teacher starts QR + GPS means students use QR

Reset implications:

- teacher mobile needed to stay the Bluetooth owner
- teacher web needed to stay the QR + GPS owner
- later prompts needed to simplify student mode choice and surface whichever attendance session was actually available

## Reports, Exports, And Analytics

Pre-reset baseline:

- backend truth was correct
- student mobile reports were API-backed
- teacher mobile reports were API-backed
- web reports, exports, analytics, and email automation were live

Problems:

- data truth was good, but presentation hierarchy was weak
- mobile reports needed concise progress-first framing
- teacher mobile exports were real, but mobile should not feel like a secondary analytics workstation
- web analytics and exports still inherited generic shell language and placeholder chart language

Reset implications:

- student mobile reports needed to emphasize simple attendance understanding
- teacher mobile reports needed to emphasize classroom action
- teacher web needed to own richer filtering, exports, analytics, and automation depth

## Copy And Content Audit

Problem pattern:

The biggest copy issue was that the product narrated its own implementation.

Current anti-patterns to remove:

- "shell"
- "foundation"
- "ready for the later..."
- "route is stable..."
- "prepared dataset"
- "polling today"
- "query invalidation"
- "dev bootstrap"
- "local verification"
- "seeded credentials"
- "connect the shell to the live API"
- "Open Login Shell"

Replacement rule:

User-facing copy in the reset track should:

- describe the user goal
- describe the next action
- explain failure in plain product language
- avoid architecture/process explanations
- avoid future-phase framing

## Reset Baseline Decisions For Later Prompts

Later prompts should treat these as baseline product intent:

1. The mobile app must open into a neutral role entry, not directly into the student dashboard.
2. Student onboarding must be real self-registration with device binding, not dev session bootstrap.
3. Teacher mobile must feel like the Bluetooth attendance owner plus supporting classroom toolset.
4. Teacher web must feel like the QR + GPS attendance owner plus the richer reporting/analytics workspace.
5. Admin must feel like a governance and recovery console, not a second teacher shell.
6. The product must stop exposing implementation-phase copy and placeholder status labels.
7. Classroom, attendance, reporting, and recovery terminology must be normalized once and reused everywhere.

## What Later Prompts Must Not Preserve

- automatic mobile redirect into the student side
- visible install ID / public key fields in normal user onboarding
- local-verification framing on the main web login page
- dashboard metrics that describe implementation readiness instead of product value
- "shell" and "foundation" language in user-facing screens
- dual ownership ambiguity between teacher web and teacher mobile attendance modes
- any regression back to MAC-address-only device enforcement

## Open Questions To Resolve In Later Prompts

These were not locked in Prompt 1 and had to be resolved by later prompts:

- final first-run mobile entry layout
- exact student registration fields and verification order
- exact teacher sign-in/onboarding path on mobile
- final teacher web landing page and dashboard CTA order
- final admin dashboard information architecture
- final product vocabulary for classroom/course code/subject/attendance session/device registration
