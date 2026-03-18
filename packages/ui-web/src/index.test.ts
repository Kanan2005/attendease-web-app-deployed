import { describe, expect, it } from "vitest"

import { findWebContentIssues, getWebToneColor, webContentRules, webTheme } from "./index"

describe("web theme tokens", () => {
  it("exposes the shared web design tokens", () => {
    expect(webTheme.colors.primary).toBe("var(--ae-primary)")
    expect(webTheme.colors.border).toBe("var(--ae-border)")
    expect(webTheme.colors.accent).toBe("var(--ae-accent)")
    expect(webTheme.colors.surfaceHero).toBe("var(--ae-surface-hero)")
    expect(webTheme.colors.warningSoft).toBe("var(--ae-warning-soft)")
    expect(webTheme.colors.successBorder).toBe("var(--ae-success-border)")
    expect(webTheme.radius.card).toBe(14)
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
