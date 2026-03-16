import { auditFindingsBySurface } from "./full-product-audit-findings.mjs"
import { auditRoot, mobilePath, webPath } from "./full-product-audit-paths.mjs"
import { studentMobileAuditScreens } from "./full-product-audit-student-mobile-screens.mjs"
import {
  buildAuditMarkdown as buildAuditMarkdownFromScreens,
  getMobileScreenshotCopyPlan as buildMobileScreenshotCopyPlan,
  getWebCapturePlan as buildWebCapturePlan,
  getGroupedAuditScreens as groupAuditScreens,
  getAuditSummary as summarizeAuditScreens,
} from "./full-product-audit-summary.mjs"
import { teacherMobileAuditScreens } from "./full-product-audit-teacher-mobile-screens.mjs"
import { webAuditScreens } from "./full-product-audit-web-screens.mjs"

export { auditFindingsBySurface, auditRoot, mobilePath, webPath }

export const auditScreens = [
  ...studentMobileAuditScreens,
  ...teacherMobileAuditScreens,
  ...webAuditScreens,
]

export function getAuditSummary(screens = auditScreens) {
  return summarizeAuditScreens(screens)
}

export function getGroupedAuditScreens(screens = auditScreens) {
  return groupAuditScreens(screens)
}

export function buildAuditMarkdown({
  screens = auditScreens,
  findingsBySurface = auditFindingsBySurface,
} = {}) {
  return buildAuditMarkdownFromScreens({
    screens,
    findingsBySurface,
  })
}

export function getMobileScreenshotCopyPlan(screens = auditScreens) {
  return buildMobileScreenshotCopyPlan(screens)
}

export function getWebCapturePlan(screens = auditScreens) {
  return buildWebCapturePlan(screens)
}
