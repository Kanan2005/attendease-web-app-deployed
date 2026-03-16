import type { AttendanceSessionStatus } from "@attendease/contracts"
import { webTheme } from "@attendease/ui-web"

import type { TeacherWebReviewTone } from "../teacher-review-workflows"

export function toneForSessionState(status: AttendanceSessionStatus): TeacherWebReviewTone {
  switch (status) {
    case "ACTIVE":
      return "success"
    case "ENDED":
      return "primary"
    case "EXPIRED":
    case "CANCELLED":
      return "warning"
    default:
      return "primary"
  }
}

export function getToneStyles(tone: TeacherWebReviewTone) {
  switch (tone) {
    case "success":
      return {
        background: webTheme.colors.successSoft,
        borderColor: webTheme.colors.successBorder,
        textColor: webTheme.colors.success,
      }
    case "warning":
      return {
        background: webTheme.colors.warningSoft,
        borderColor: webTheme.colors.warningBorder,
        textColor: webTheme.colors.warning,
      }
    case "danger":
      return {
        background: webTheme.colors.dangerSoft,
        borderColor: webTheme.colors.dangerBorder,
        textColor: webTheme.colors.danger,
      }
    default:
      return {
        background: webTheme.colors.surfaceHero,
        borderColor: webTheme.colors.borderStrong,
        textColor: webTheme.colors.primary,
      }
  }
}
