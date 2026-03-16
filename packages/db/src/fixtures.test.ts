import { describe, expect, it } from "vitest"

import {
  buildDevelopmentDeviceFixture,
  buildDevelopmentStudentRegistrationFixture,
  buildDevelopmentTeacherRegistrationFixture,
  developmentAcademicFixtures,
  developmentAuthFixtures,
  developmentLifecycleFixtures,
} from "./fixtures"

describe("development reset fixtures", () => {
  it("exposes reset-ready seeded roles, classrooms, and lifecycle states", () => {
    expect(developmentAuthFixtures.teacher.displayName).toBe("Prof. Anurag Agarwal")
    expect(developmentAuthFixtures.students.studentOne.rollNumber).toBe("CSE2301")
    expect(developmentAcademicFixtures.classrooms.math.classroomCode).toBe("CSE6-MATHS-A")
    expect(developmentLifecycleFixtures.roster.classrooms.physics.droppedStudentKeys).toEqual([
      "studentThree",
    ])
    expect(developmentLifecycleFixtures.roster.classrooms.physics.blockedStudentKeys).toEqual([
      "studentFour",
    ])
    expect(developmentLifecycleFixtures.deviceTrust.unregisteredStudents).toEqual([
      "studentThree",
      "studentFour",
    ])
  })

  it("builds deterministic registration fixtures for reset integration tests", () => {
    const studentRegistration = buildDevelopmentStudentRegistrationFixture("prompt-fifteen")
    const teacherRegistration = buildDevelopmentTeacherRegistrationFixture("prompt-fifteen", {
      platform: "MOBILE",
    })

    expect(studentRegistration).toMatchObject({
      email: "prompt-fifteen@attendease.dev",
      password: "StudentResetPass123!",
      platform: "MOBILE",
    })
    expect(studentRegistration.device.installId).toBe("seed-install-prompt-fifteen-attendance")

    expect(teacherRegistration).toMatchObject({
      email: "prompt-fifteen@attendease.dev",
      password: "TeacherResetPass123!",
      platform: "MOBILE",
    })
    expect(teacherRegistration.device?.installId).toBe("seed-install-prompt-fifteen-mobile")
  })

  it("supports device overrides while preserving the normalized naming scheme", () => {
    const iosDevice = buildDevelopmentDeviceFixture("Student Two Legacy", {
      platform: "IOS",
      appVersion: "0.9.0",
    })

    expect(iosDevice.installId).toBe("seed-install-student-two-legacy")
    expect(iosDevice.publicKey).toBe("seed-public-key-student-two-legacy")
    expect(iosDevice.platform).toBe("IOS")
    expect(iosDevice.appVersion).toBe("0.9.0")
  })
})
