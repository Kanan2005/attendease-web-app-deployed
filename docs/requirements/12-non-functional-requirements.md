# Non-Functional Requirements

## Purpose

This document defines the quality expectations for the AttendEase system beyond feature behavior.

## Security Requirements

The system must:

- require authentication for protected actions
- enforce role-based authorization
- protect attendance endpoints from invalid access
- require trusted device context for student attendance-sensitive mobile actions
- protect against duplicate attendance submission
- log high-risk device-abuse attempts and device-recovery actions
- keep admin recovery endpoints restricted to admin sessions
- avoid applying student-only device gates to teacher or admin workflows
- transmit sensitive data securely
- provide a support-safe recovery path so legitimate phone replacement does not weaken the anti-proxy model

The system must not depend on MAC-address locking as the core mobile identity mechanism.

## Reliability Requirements

The system must:

- persist attendance records safely
- prevent duplicate attendance for the same student and session
- keep reports and exports consistent with final attendance data
- preserve history and edit integrity over time
- propagate a request ID through API responses and logs so operational issues can be traced quickly
- fail with a consistent API error shape so mobile and web clients can map errors predictably

## Performance Requirements

The system should:

- allow attendance marking to complete quickly under normal conditions
- update live session counts with minimal delay
- load teacher history, reports, and analytics in a practical time for classroom use

Exact performance thresholds may be defined later during engineering planning.

## Availability Expectations

The product should be stable enough for real academic operations. Features that are core to daily attendance should not depend on fragile or manual back-office steps.

## Usability Requirements

The system must:

- be understandable to students with minimal training
- keep attendance marking flows short
- clearly communicate permission needs
- clearly communicate failure reasons
- support both iOS and Android for mobile
- support modern desktop browsers for web

## Privacy Expectations

The product should respect user privacy by:

- requesting only necessary permissions
- using location only for attendance validation needs
- using Bluetooth only for attendance session detection needs
- limiting exposure of student data based on role
- avoiding collection of invasive hardware identifiers when app-scoped trust signals are sufficient

## Auditability Requirements

The system should retain internal operational logs for:

- session start and end
- attendance attempts and outcomes
- manual edits
- email delivery results
- device-trust decisions, security events, and admin recovery actions
- rate-limit rejections and validation failures with request ID correlation
- worker-cycle failures and automation dispatch failures

## Maintainability Expectations

The implementation should aim for:

- shared business rules across mobile and web
- clear separation of platform UI and core validation logic
- documentation that stays aligned with business rules
- centralized environment loading and validation instead of app-local ad hoc parsing
- reusable observability hooks so logging, tracing, and error capture are applied consistently

## Scalability Expectations

The system should be designed so it can later support:

- more classes and subjects
- more teachers
- larger attendance history datasets
- future admin-level analytics

## Acceptance Expectations

These quality requirements are successful when:

- the system behaves consistently across platforms
- attendance data remains trustworthy
- the app remains usable in real classroom conditions
- future extension of the system remains practical

## Current Implementation Outcome

The current repo now includes:

- centralized env validation in `packages/config`
- structured JSON logging with security-sensitive redaction
- API request-ID propagation and a shared API error envelope
- optional Sentry and tracing hooks for API and worker
- rate limiting on auth and attendance-mark endpoints
- worker-side structured logging and failure capture
- rollout flags for Bluetooth attendance, email automation, and strict device-binding mode
- API readiness and queue-health reporting for operational monitoring
- rollout-disabled Bluetooth attendance and email automation routes failing closed with `503` responses
- queue-health stale classification driven by `QUEUE_HEALTH_STALE_AFTER_MS`
- worker guardrails for batch sizes and stale job recovery across exports, roster imports, outbox processing, and email dispatch
- an operational runbook for backup, recovery, and queue triage
- automated tests for config parsing, request middleware, logger redaction, health services, rollout flags, rate limiting, and error handling
