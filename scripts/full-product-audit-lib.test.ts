import { describe, expect, it } from "vitest"

import {
  auditScreens,
  buildAuditMarkdown,
  getAuditSummary,
  getMobileScreenshotCopyPlan,
  getWebCapturePlan,
} from "./full-product-audit-lib.mjs"

describe("full product audit inventory", () => {
  it("covers all reset-track product surfaces with deterministic screenshot paths", () => {
    expect(auditScreens.length).toBeGreaterThanOrEqual(40)
    expect(auditScreens.some((screen) => screen.role === "Student Mobile")).toBe(true)
    expect(auditScreens.some((screen) => screen.role === "Teacher Mobile")).toBe(true)
    expect(auditScreens.some((screen) => screen.role === "Teacher Web")).toBe(true)
    expect(auditScreens.some((screen) => screen.role === "Admin Web")).toBe(true)
    expect(
      auditScreens.every((screen) =>
        screen.screenshotFile.startsWith("Structure/artifacts/full-product-audit/"),
      ),
    ).toBe(true)
  })

  it("builds copy and capture plans for the current audit artifact strategy", () => {
    const mobileCopyPlan = getMobileScreenshotCopyPlan()
    const webCapturePlan = getWebCapturePlan()

    expect(mobileCopyPlan.length).toBeGreaterThan(20)
    expect(webCapturePlan.length).toBeGreaterThan(10)
    expect(webCapturePlan.every((entry) => entry.route.startsWith("/"))).toBe(true)
  })

  it("renders a markdown audit report with grouped sections and status counts", () => {
    const markdown = buildAuditMarkdown()
    const summary = getAuditSummary()

    expect(summary.total).toBe(auditScreens.length)
    expect(summary.byStatus.FAIL).toBe(0)
    expect(summary.byStatus.BLOCKED).toBe(0)
    expect(markdown).toContain("# Full Product Screenshot Audit")
    expect(markdown).toContain("## Student Mobile")
    expect(markdown).toContain("## Teacher Mobile")
    expect(markdown).toContain("## Teacher Web")
    expect(markdown).toContain("## Admin Web")
    expect(markdown).toContain("MANUAL-REQUIRED")
  })
})
