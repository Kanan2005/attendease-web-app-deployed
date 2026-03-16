import { describe, expect, it } from "vitest"

import {
  findMobileContentIssues,
  getMobileToneColor,
  mobileContentRules,
  mobileTheme,
} from "./index"

describe("mobile theme tokens", () => {
  it("exposes the shared mobile design tokens", () => {
    expect(mobileTheme.colors.primary).toBe("#00D4AA")
    expect(mobileTheme.colors.accent).toBe("#FF6B6B")
    expect(mobileTheme.colors.successSoft).toBe("rgba(0, 230, 118, 0.12)")
    expect(mobileTheme.colors.dangerBorder).toBe("rgba(255, 82, 82, 0.25)")
    expect(mobileTheme.radius.card).toBe(16)
    expect(mobileTheme.typography.hero).toBe(32)
  })

  it("flags developer-facing copy in mobile surfaces", () => {
    expect(findMobileContentIssues("Student shell ready for local verification")).toEqual([
      'Avoid "shell" in mobile user-facing copy.',
      'Avoid "local verification" in mobile user-facing copy.',
    ])
    expect(findMobileContentIssues("Join a classroom and mark attendance.")).toEqual([])
  })

  it("exposes shared content rules and semantic tone colors", () => {
    expect(mobileContentRules.disallowedTerms).toContain("foundation")
    expect(getMobileToneColor("positive")).toBe(mobileTheme.colors.success)
    expect(getMobileToneColor("critical")).toBe(mobileTheme.colors.danger)
  })
})
