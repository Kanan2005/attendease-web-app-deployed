import { describe, expect, it } from "vitest"

import {
  createPrismaClient,
  disconnectPrismaClient,
  getPrismaClient,
  resolveDatabaseUrl,
} from "./client"

describe("db client helpers", () => {
  it("prefers the regular DATABASE_URL by default and falls back when needed", () => {
    expect(
      resolveDatabaseUrl({
        DATABASE_URL: "postgresql://primary",
        TEST_DATABASE_URL: "postgresql://test",
      }),
    ).toBe("postgresql://primary")

    expect(
      resolveDatabaseUrl({
        DATABASE_URL: undefined,
        TEST_DATABASE_URL: "postgresql://test",
      }),
    ).toBe("postgresql://test")
  })

  it("can prefer TEST_DATABASE_URL when explicitly requested", () => {
    expect(
      resolveDatabaseUrl(
        {
          DATABASE_URL: "postgresql://primary",
          TEST_DATABASE_URL: "postgresql://test",
        },
        { preferTestUrl: true },
      ),
    ).toBe("postgresql://test")
  })

  it("creates standalone clients for explicit database URLs and reuses a singleton otherwise", async () => {
    const standaloneOne = createPrismaClient({
      databaseUrl: "postgresql://standalone-one",
    })
    const standaloneTwo = createPrismaClient({
      databaseUrl: "postgresql://standalone-two",
    })

    expect(standaloneOne).not.toBe(standaloneTwo)

    const originalNodeEnv = process.env.NODE_ENV
    process.env.NODE_ENV = "development"

    const sharedOne = getPrismaClient()
    const sharedTwo = getPrismaClient()

    expect(sharedOne).toBe(sharedTwo)

    await Promise.all([
      disconnectPrismaClient(standaloneOne),
      disconnectPrismaClient(standaloneTwo),
      disconnectPrismaClient(sharedOne),
    ])

    process.env.NODE_ENV = originalNodeEnv
  })
})
