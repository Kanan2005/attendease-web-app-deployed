import { describe, expect, it } from "vitest"

import { adminRoutes } from "./admin-routes.js"

describe("admin route helpers", () => {
  it("keeps static admin routes centralized", () => {
    expect(adminRoutes.dashboard).toBe("/(admin)")
    expect(adminRoutes.students).toBe("/(admin)/students")
    expect(adminRoutes.classrooms).toBe("/(admin)/classrooms")
    expect(adminRoutes.devices).toBe("/(admin)/devices")
  })

  it("all admin routes start with /(admin) prefix", () => {
    for (const [, route] of Object.entries(adminRoutes)) {
      expect(route).toMatch(/^\/\(admin\)/)
    }
  })

  it("has exactly 4 admin routes defined", () => {
    expect(Object.keys(adminRoutes)).toHaveLength(4)
  })
})
