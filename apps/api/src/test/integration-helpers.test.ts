import { describe, expect, it } from "vitest"

import {
  resetFlowIntegrationFixtures,
  resolveIntegrationTestDatabaseUrls,
} from "./integration-helpers.js"

describe("integration test helpers", () => {
  it("prefers explicit test and runtime database URLs while preserving fallbacks", () => {
    const urls = resolveIntegrationTestDatabaseUrls({
      TEST_DATABASE_URL: "postgresql://tester:secret@localhost:55432/attendance_db",
      DATABASE_URL: "postgresql://app:secret@localhost:5433/attendance_db",
      POSTGRES_PORT: "55432",
    })

    expect(urls[0]).toBe("postgresql://tester:secret@localhost:55432/attendance_db")
    expect(urls).toContain("postgresql://app:secret@localhost:5433/attendance_db")
    expect(urls).toContain(
      "postgresql://attendance_user:attendance_password@localhost:55432/attendance_db",
    )
    expect(urls).toContain(
      "postgresql://attendance_user:attendance_password@localhost:5432/attendance_db",
    )
  })

  it("deduplicates identical fallback URLs and honors test-database-port overrides", () => {
    const urls = resolveIntegrationTestDatabaseUrls({
      TEST_DATABASE_URL:
        "postgresql://attendance_user:attendance_password@localhost:5432/attendance_db",
      DATABASE_URL: "postgresql://attendance_user:attendance_password@localhost:5432/attendance_db",
      TEST_DATABASE_PORT: "5432",
      POSTGRES_PORT: "55432",
    })

    expect(urls).toEqual([
      "postgresql://attendance_user:attendance_password@localhost:5432/attendance_db",
      "postgresql://attendease:attendease@localhost:5432/attendease",
    ])
  })

  it("exports reset-ready registration, roster, and device recovery fixtures", () => {
    expect(resetFlowIntegrationFixtures.registration.student.email).toBe(
      "api-reset-student@attendease.dev",
    )
    expect(resetFlowIntegrationFixtures.registration.teacher.email).toBe(
      "api-reset-teacher@attendease.dev",
    )
    expect(resetFlowIntegrationFixtures.deviceTrust.studentTwoRevokedDevice.installId).toBe(
      "seed-install-student-two-legacy",
    )
    expect(resetFlowIntegrationFixtures.roster.classrooms.physics.droppedStudentKeys).toEqual([
      "studentThree",
    ])
    expect(resetFlowIntegrationFixtures.adminRecovery.studentTwo.revokedBindingId).toBe(
      "seed_binding_student_two_revoked",
    )
  })
})
