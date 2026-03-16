import { describe, expect, it } from "vitest"

import { findWebContentIssues, getWebToneColor, webContentRules, webTheme } from "./index"

describe("web theme tokens", () => {
  it("exposes the shared web design tokens", () => {
    expect(webTheme.colors.primary).toBe("#17181d")
    expect(webTheme.colors.border).toBe("#e3d5c2")
    expect(webTheme.colors.accent).toBe("#ea5b2a")
    expect(webTheme.colors.surfaceHero).toBe("#efe1d0")
    expect(webTheme.colors.warningSoft).toBe("#fbf2e2")
    expect(webTheme.colors.successBorder).toBe("#bfdcc9")
    expect(webTheme.radius.card).toBe(30)
  })

  it("flags developer-facing copy in web surfaces", () => {
    expect(findWebContentIssues("Open login shell for local verification")).toEqual([
      'Avoid "shell" in web user-facing copy.',
      'Avoid "local verification" in web user-facing copy.',
    ])
    expect(findWebContentIssues("Review classroom activity and start attendance.")).toEqual([])
  })

  it("exposes shared content rules and tone colors", () => {
    expect(webContentRules.disallowedTerms).toContain("prepared")
    expect(getWebToneColor("warning")).toBe(webTheme.colors.warning)
    expect(getWebToneColor("danger")).toBe(webTheme.colors.danger)
  })
})
