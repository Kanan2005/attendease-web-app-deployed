# System Overview Requirements

## Purpose

This document defines the overall product shape of AttendEase and sets the baseline expectations shared across mobile and web.

## Reset Implementation Status

The reset-track implementation now matches this system overview in the repo.

- one shared mobile app now ships separate student and teacher entry plus navigation
- teacher mobile owns Bluetooth attendance
- teacher web owns QR + GPS attendance
- student onboarding now uses self-registration plus one-device binding
- admin remains login-only and now owns support, recovery, and governance on web

What remains outside the reset IA story is release validation, not product-definition ambiguity:

- real-device QR, GPS, and Bluetooth signoff
- production environment validation for OIDC, SES, Sentry, and OTEL

## Product Mission

AttendEase must provide a practical and trustworthy attendance system for colleges that reduces proxy attendance while remaining simple for students and fast for teachers.

## Product Scope

The system consists of four user-facing experiences:

- Student mobile experience
- Teacher mobile experience inside the same mobile app
- Teacher web app
- Admin web app

The system also includes backend services for attendance session management, validation, reporting, exports, analytics, and email automation.

## Reset Baseline Clarifications

The product reset track locks the following baseline decisions:

- one shared mobile app with separate student and teacher entry
- teacher onboarding uses registration plus sign-in on mobile and web
- teacher mobile owns Bluetooth attendance session creation
- teacher web owns QR + GPS attendance session creation
- student onboarding uses self-registration plus one-device binding
- admin is login-only and holds recovery/governance powers

These decisions clarify product ownership and must guide later UX and workflow changes without changing the approved technical stack.

## Core Product Outcomes

The product is expected to:

- reduce fake attendance submissions
- support fast attendance marking in real classroom settings
- give students clear visibility into their attendance record
- give teachers access to history, reports, edits, and exports
- support deeper analytics and alerting from the web portal

## Primary Attendance Modes

### QR + GPS Mode

This is the primary attendance mode. It is created from the teacher web app and is intended for classroom/projector usage.

Expected outcome:

- students must scan a valid rolling QR code
- students must pass GPS validation within the allowed radius
- only active sessions should accept attendance

### Bluetooth Mode

This is the secondary attendance mode. It is created from the teacher mobile app and is intended for situations where teacher device proximity is a stronger signal than projected QR.

Expected outcome:

- students must be physically close enough to the teacher device to detect the valid BLE signal
- only active sessions should accept attendance

## Platform Expectations

### Mobile

The mobile application must work on both iOS and Android and must support:

- student attendance flows
- student attendance history
- teacher Bluetooth sessions
- teacher history, reports, and basic exports

### Web

The web application must support:

- teacher QR + GPS sessions
- teacher history, reports, and exports
- advanced analytics
- email automation
- comprehensive CSV export
- admin recovery/governance workflows for devices, imports, and semester oversight

## Recommended Technical Direction

The product should be built with:

- React Native for mobile
- Next.js / React for web
- shared TypeScript contracts and business logic where possible

This direction is recommended because the product needs both strong mobile capability and a strong browser-based teacher dashboard.

## Shared Product Principles

All modules should follow these principles:

- simple student experience
- low-friction teacher workflow
- strong anti-proxy controls
- clear role separation
- role-based access
- clear failure messages
- reliable history and reporting
- consistent business rules across web and mobile

## Cross-Platform Consistency

Where the same feature exists on web and mobile, the business outcome must be identical even if the UI differs. Examples include:

- attendance percentage calculations
- manual edit window rules
- session present and absent counts
- export data meaning

## Version 1 Scope Boundary

Version 1 is expected to include:

- role-based student and teacher access
- QR + GPS attendance
- Bluetooth attendance
- manual attendance edits within 24 hours
- session history
- basic reports
- basic exports
- analytics dashboard on web
- low-attendance email notifications on web

Version 1 does not require:

- parent portal
- biometric attendance
- payroll or ERP integration
- institution-wide admin workflows unless added later

## Engineering Foundation Requirements

The implementation baseline for this product must also provide:

- a monorepo with `apps/mobile`, `apps/web`, `apps/api`, and `apps/worker`
- shared packages for config, contracts, domain logic, auth, DB, exports, email, notifications, realtime, and utilities
- root and app-level environment templates plus typed environment-loading utilities
- shared root scripts for `dev`, `build`, `lint`, `typecheck`, and `test`
- a workspace validation check so broken package names, missing scripts, or missing tsconfig files are caught early
- local development infrastructure for PostgreSQL, Redis, S3-compatible storage, and mail testing
- baseline health entry points for web, API, and worker processes
- minimal bootable shells for mobile, web, API, and worker so phase-specific implementation can start from working runtimes
- an initial testing baseline that protects shared contracts, config loading, shared package barrels, app-shell health helpers, and future test layering conventions
