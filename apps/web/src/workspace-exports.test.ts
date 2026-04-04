"use client"

import { describe, expect, it } from "vitest"

import * as adminDeviceSupportConsole from "./admin-device-support-console.js"
import * as adminWorkspaces from "./admin-workflows-client.js"
import * as teacherAnalyticsAutomationClient from "./teacher-analytics-automation-client.js"
import * as teacherWorkspaces from "./teacher-workflows-client.js"

describe("web workspace barrel exports", () => {
  it("keeps the teacher workspace exports stable while each workflow lives in a smaller file", () => {
    const expectedTeacherExports = [
      "TeacherClassroomListWorkspace",
      "TeacherClassroomCreateWorkspace",
      "TeacherClassroomDetailWorkspace",
      "TeacherClassroomLecturesWorkspace",
      "TeacherLectureSessionDetailWorkspace",
      "TeacherRosterWorkspace",
      "TeacherImportStatusWorkspace",
      "TeacherScheduleWorkspace",
      "TeacherStreamWorkspace",
      "TeacherSessionHistoryWorkspace",
      "TeacherReportsWorkspace",
      "TeacherExportsWorkspace",
      "TeacherSemesterVisibilityWorkspace",
    ] as const

    for (const exportName of expectedTeacherExports) {
      expect(teacherWorkspaces[exportName]).toBeDefined()
    }
  })

  it("keeps the admin workspace exports stable while governance flows live in smaller files", () => {
    const expectedAdminExports = [
      "AdminStudentManagementWorkspace",
      "AdminClassroomGovernanceWorkspace",
      "AdminSemesterManagementWorkspace",
      "AdminImportMonitoringWorkspace",
      "TeacherImportMonitoringWorkspace",
    ] as const

    for (const exportName of expectedAdminExports) {
      expect(adminWorkspaces[exportName]).toBeDefined()
    }
  })

  it("keeps the analytics/email and admin recovery entry exports stable after splitting large files", () => {
    expect(teacherAnalyticsAutomationClient.TeacherAnalyticsWorkspace).toBeDefined()
    expect(teacherAnalyticsAutomationClient.TeacherEmailAutomationWorkspace).toBeDefined()
    expect(adminDeviceSupportConsole.AdminDeviceSupportConsole).toBeDefined()
  })
})
