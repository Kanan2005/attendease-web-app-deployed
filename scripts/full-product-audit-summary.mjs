import path from "node:path"

import { auditRoot } from "./full-product-audit-paths.mjs"

export function getAuditSummary(screens) {
  return screens.reduce(
    (summary, screen) => {
      summary.total += 1
      summary.byStatus[screen.status] = (summary.byStatus[screen.status] ?? 0) + 1
      return summary
    },
    {
      total: 0,
      byStatus: {
        PASS: 0,
        FAIL: 0,
        BLOCKED: 0,
        "MANUAL-REQUIRED": 0,
      },
    },
  )
}

export function getGroupedAuditScreens(screens) {
  return screens.reduce((groups, screen) => {
    const nextGroup = groups[screen.role] ?? []
    nextGroup.push(screen)
    groups[screen.role] = nextGroup
    return groups
  }, {})
}

export function buildAuditMarkdown({ screens, findingsBySurface } = {}) {
  const summary = getAuditSummary(screens)
  const groups = getGroupedAuditScreens(screens)
  const sections = Object.entries(groups)
    .map(([role, roleScreens]) => {
      const tableRows = roleScreens
        .map((screen) =>
          [
            screen.screenName,
            `\`${screen.route}\``,
            screen.preconditions,
            screen.expectedResult,
            screen.screenshotFile
              ? `[${path.posix.basename(screen.screenshotFile)}](/Users/anuagar2/Desktop/practice/Attendease/${screen.screenshotFile})`
              : "Not captured",
            `\`${screen.status}\``,
            screen.blocker || "None",
            screen.notes,
          ].join(" | "),
        )
        .join("\n")
      const findings = findingsBySurface[role]
        ? findingsBySurface[role].map((entry) => `- ${entry}`).join("\n")
        : "- No additional notes recorded."

      return `## ${role}

${findings}

| Screen name | Route | Preconditions | Expected result | Screenshot file | Status | Blocker | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
${tableRows}
`
    })
    .join("\n")

  return `# Full Product Screenshot Audit

## Summary

- Total screens in audit scope: **${summary.total}**
- PASS: **${summary.byStatus.PASS}**
- FAIL: **${summary.byStatus.FAIL}**
- BLOCKED: **${summary.byStatus.BLOCKED}**
- MANUAL-REQUIRED: **${summary.byStatus["MANUAL-REQUIRED"]}**

This audit tracks the reset-era student mobile, teacher mobile, teacher web, and admin web surfaces. Deterministic screenshots live under \`${auditRoot}\`. Emulator-backed captures are never treated as final proof for QR camera scan accuracy, GPS distance accuracy, or BLE proximity.

${sections}`.trim()
}

export function getMobileScreenshotCopyPlan(screens) {
  return screens
    .filter(
      (screen) => screen.screenshotFile.startsWith(`${auditRoot}/mobile`) && screen.sourceArtifact,
    )
    .map((screen) => ({
      id: screen.id,
      source: screen.sourceArtifact,
      target: screen.screenshotFile,
    }))
}

export function getWebCapturePlan(screens) {
  return screens
    .filter((screen) => screen.screenshotFile.startsWith(`${auditRoot}/web`) && screen.capturePath)
    .map((screen) => ({
      id: screen.id,
      authRole: screen.authRole ?? null,
      route: screen.capturePath,
      target: screen.screenshotFile,
    }))
}
