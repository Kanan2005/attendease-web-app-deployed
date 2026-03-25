import fs from "node:fs"
import path from "node:path"

const maxAllowedLines = 400

const ignoredDirectoryNames = new Set([
  ".git",
  ".next",
  ".pnpm-store",
  ".turbo",
  ".expo",
  "build",
  "coverage",
  "dist",
  "node_modules",
])

const ignoredPathPrefixes = [
  "apps/mobile/android/.gradle/",
  "apps/mobile/android/app/.cxx/",
  "apps/mobile/android/app/build/",
]

const allowedOverLimitFiles = new Set([
  "apps/api/src/infrastructure/non-functional.integration.test.ts",
  "apps/api/src/modules/academic/academic-management.integration.test.ts",
  "apps/api/src/modules/academic/classroom-roster.integration.test.ts",
  "apps/api/src/modules/academic/classrooms.service.test.ts",
  "apps/api/src/modules/academic/classrooms.service.ts",
  "apps/api/src/modules/academic/roster.service.test.ts",
  "apps/api/src/modules/academic/scheduling.service.test.ts",
  "apps/api/src/modules/admin/admin-device-support.integration.test.ts",
  "apps/api/src/modules/analytics/analytics.integration.test.ts",
  "apps/api/src/modules/attendance/attendance-history.integration.test.ts",
  "apps/api/src/modules/attendance/bluetooth-attendance.integration.test.ts",
  "apps/api/src/modules/attendance/qr-attendance.integration.test.ts",
  "apps/api/src/modules/auth/auth.integration.test.ts",
  "apps/api/src/modules/exports/exports.integration.test.ts",
  "apps/api/src/modules/reports/reports.integration.test.ts",
  "apps/api/src/test/e2e-flows.integration.test.ts",
  "apps/mobile/e2e/run-e2e.sh",
  "apps/mobile/ios/AttendEase.xcodeproj/project.pbxproj",
  "apps/mobile/src/bluetooth-attendance-hooks.ts",
  "apps/mobile/src/mobile-entry-screens.tsx",
  "apps/mobile/src/student-foundation/shared-ui.tsx",
  "apps/mobile/src/student-foundation/student-classroom-detail-screen.tsx",
  "apps/mobile/src/student-foundation/student-dashboard-screen.tsx",
  "apps/mobile/src/student-foundation/student-profile-screen.tsx",
  "apps/mobile/src/student-workflow-models.test.ts",
  "apps/mobile/src/teacher-foundation/shared-ui.tsx",
  "apps/mobile/src/teacher-foundation/styles.ts",
  "apps/mobile/src/teacher-foundation/teacher-bluetooth-active-session-screen-content.tsx",
  "apps/mobile/src/teacher-foundation/teacher-bluetooth-session-create-screen-content.tsx",
  "apps/mobile/src/teacher-foundation/teacher-classroom-detail-screen-content.tsx",
  "apps/mobile/src/teacher-foundation/teacher-classroom-roster-screen-content.tsx",
  "apps/mobile/src/teacher-foundation/teacher-classroom-schedule-screen-content.tsx",
  "apps/mobile/src/teacher-foundation/teacher-classrooms-screen.tsx",
  "apps/mobile/src/teacher-foundation/teacher-exports-screen.tsx",
  "apps/web/app/globals.css",
  "apps/web/src/qr-session-shell.tsx",
  "apps/mobile/src/teacher-foundation/teacher-reports-screen-content.tsx",
  "apps/mobile/src/teacher-operational-reports.ts",
  "apps/mobile/src/teacher-operational.test.ts",
  "apps/web/src/teacher-review-workflows.test.ts",
  "apps/web/src/teacher-workflows-client/session-start.tsx",
  "apps/web/src/teacher-workflows-client/teacher-classroom-lectures-workspace.tsx",
  "apps/web/src/teacher-workflows-client/teacher-lecture-session-detail-workspace.tsx",
  "apps/web/src/teacher-workflows-client/teacher-profile-workspace.tsx",
  "apps/web/src/teacher-workflows-client/teacher-reports-workspace.tsx",
  "apps/web/src/teacher-workflows-client/teacher-session-history-workspace/session-detail.tsx",
  "apps/web/src/web-workflows.test.ts",
  "packages/auth/src/client.test.ts",
  "packages/contracts/src/index.test.ts",
  "packages/db/prisma/migrations/20260314000100_initial_data_foundation/migration.sql",
  "packages/db/prisma/schema.prisma",
  "packages/db/src/integration.test.ts",
  "packages/db/src/scripts/seed-bulk.ts",
  "packages/db/src/scripts/seed-moderate.ts",
  "pnpm-lock.yaml",
])

function getLineCount(contents) {
  if (contents.length === 0) {
    return 0
  }

  return contents.endsWith("\n") ? contents.split("\n").length - 1 : contents.split("\n").length
}

function shouldIgnore(relativePath) {
  if (ignoredPathPrefixes.some((prefix) => relativePath.startsWith(prefix))) {
    return true
  }

  return relativePath.split(path.sep).some((part) => ignoredDirectoryNames.has(part))
}

export function validateLineCounts(rootDirectory, errors) {
  const discoveredOverLimitFiles = new Set()

  function visitDirectory(directoryPath) {
    for (const entry of fs.readdirSync(directoryPath, { withFileTypes: true })) {
      const filePath = path.join(directoryPath, entry.name)
      const relativePath = path.relative(rootDirectory, filePath)

      if (shouldIgnore(relativePath)) {
        continue
      }

      if (entry.isDirectory()) {
        visitDirectory(filePath)
        continue
      }

      let fileBuffer
      try {
        fileBuffer = fs.readFileSync(filePath)
      } catch {
        continue
      }

      if (fileBuffer.includes(0)) {
        continue
      }

      const contents = fileBuffer.toString("utf8")
      const lineCount = getLineCount(contents)
      if (lineCount <= maxAllowedLines) {
        continue
      }

      discoveredOverLimitFiles.add(relativePath)
      if (!allowedOverLimitFiles.has(relativePath)) {
        errors.push(`line-count: ${relativePath} has ${lineCount} lines; max is ${maxAllowedLines}`)
      }
    }
  }

  visitDirectory(rootDirectory)

  for (const relativePath of allowedOverLimitFiles) {
    const filePath = path.join(rootDirectory, relativePath)
    if (!fs.existsSync(filePath)) {
      errors.push(`line-count: allowlisted file is missing ${relativePath}`)
      continue
    }

    const contents = fs.readFileSync(filePath, "utf8")
    if (getLineCount(contents) <= maxAllowedLines) {
      errors.push(`line-count: remove ${relativePath} from the allowlist; it is now compliant`)
      continue
    }

    if (!discoveredOverLimitFiles.has(relativePath)) {
      errors.push(
        `line-count: allowlisted file was not discovered during validation ${relativePath}`,
      )
    }
  }
}
