import { describe, expect, it } from "vitest"

import {
  findMobileContentIssues,
  getMobileToneColor,
  mobileContentRules,
  mobileTheme,
} from "./index"

describe("mobile theme tokens", () => {
  it("exposes the shared mobile design tokens", () => {
    expect(mobileTheme.colors.primary).toBe("#6366F1")
    expect(mobileTheme.colors.accent).toBe("#14B8A6")
    expect(mobileTheme.colors.successSoft).toBe("rgba(16, 185, 129, 0.08)")
    expect(mobileTheme.colors.dangerBorder).toBe("rgba(239, 68, 68, 0.2)")
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
