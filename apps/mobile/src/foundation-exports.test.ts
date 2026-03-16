import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

const currentDir = dirname(fileURLToPath(import.meta.url))

function readLocalFile(relativePath: string) {
  return readFileSync(join(currentDir, relativePath), "utf8")
}

describe("mobile foundation barrel exports", () => {
  it("keeps the top-level student foundation barrel stable", () => {
    const barrelSource = readLocalFile("./student-foundation.tsx")

    expect(barrelSource).toContain("export { buildStudentInvalidationKeys }")
    expect(barrelSource).toContain('export * from "./student-foundation/index"')
  })

  it("keeps the student foundation export map aligned with the per-screen files", () => {
    const indexSource = readLocalFile("./student-foundation/index.ts")
    const expectedStudentExports = [
      "StudentDashboardScreen",
      "StudentJoinClassroomScreen",
      "StudentClassroomsScreen",
      "StudentClassroomDetailScreen",
      "StudentClassroomStreamScreen",
      "StudentClassroomScheduleScreen",
      "StudentHistoryScreen",
      "StudentReportsScreen",
      "StudentSubjectReportScreen",
      "StudentProfileScreen",
      "StudentDeviceStatusScreen",
      "StudentAttendanceHubScreen",
      "StudentQrAttendanceScreen",
      "StudentBluetoothAttendanceScreen",
    ] as const

    for (const exportName of expectedStudentExports) {
      expect(indexSource).toContain(exportName)
    }
  })

  it("keeps the top-level teacher foundation barrel stable", () => {
    const barrelSource = readLocalFile("./teacher-foundation.tsx")

    expect(barrelSource).toContain("export { buildTeacherInvalidationKeys }")
    expect(barrelSource).toContain("export { buildTeacherLoginRequest }")
    expect(barrelSource).toContain('export * from "./teacher-foundation/index"')
  })

  it("keeps the teacher foundation export map aligned with the per-screen files", () => {
    const indexSource = readLocalFile("./teacher-foundation/index.ts")
    const expectedTeacherExports = [
      "TeacherDashboardScreen",
      "TeacherClassroomsScreen",
      "TeacherClassroomDetailScreen",
      "TeacherClassroomRosterScreen",
      "TeacherClassroomScheduleScreen",
      "TeacherClassroomAnnouncementsScreen",
      "TeacherClassroomLecturesScreen",
      "TeacherBluetoothSessionCreateScreen",
      "TeacherBluetoothActiveSessionScreen",
      "TeacherSessionHistoryScreen",
      "TeacherSessionDetailScreen",
      "TeacherReportsScreen",
      "TeacherExportsScreen",
    ] as const

    for (const exportName of expectedTeacherExports) {
      expect(indexSource).toContain(exportName)
    }
  })
})
