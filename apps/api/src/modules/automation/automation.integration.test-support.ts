import { hashPassword } from "@attendease/auth/password"
import { authSessionResponseSchema } from "@attendease/contracts"
import type { createPrismaClient } from "@attendease/db"
import type { NestFastifyApplication } from "@nestjs/platform-fastify"
import { expect } from "vitest"

export type AutomationTestPrisma = ReturnType<typeof createPrismaClient>

export type AutomationLoginInput = {
  email: string
  password: string
  platform: "WEB" | "MOBILE"
  requestedRole: "ADMIN" | "TEACHER" | "STUDENT"
  device?: {
    installId: string
    platform: "ANDROID" | "IOS"
    publicKey: string
    deviceModel?: string | null
    osVersion?: string | null
    appVersion?: string | null
  }
}

export async function seedForeignTeacher(prisma: AutomationTestPrisma) {
  const passwordHash = await hashPassword("ForeignTeacherPass123!")

  await prisma.user.upsert({
    where: {
      email: "foreign.teacher@attendease.dev",
    },
    update: {
      displayName: "Foreign Teacher",
      status: "ACTIVE",
    },
    create: {
      id: "seed_user_teacher_foreign",
      email: "foreign.teacher@attendease.dev",
      displayName: "Foreign Teacher",
      status: "ACTIVE",
    },
  })

  await prisma.userRole.upsert({
    where: {
      userId_role: {
        userId: "seed_user_teacher_foreign",
        role: "TEACHER",
      },
    },
    update: {},
    create: {
      userId: "seed_user_teacher_foreign",
      role: "TEACHER",
    },
  })

  await prisma.userCredential.upsert({
    where: {
      userId: "seed_user_teacher_foreign",
    },
    update: {
      passwordHash,
    },
    create: {
      userId: "seed_user_teacher_foreign",
      passwordHash,
    },
  })
}

export async function login(app: NestFastifyApplication, input: AutomationLoginInput) {
  const response = await request(app, "POST", "/auth/login", {
    payload: input,
  })

  expect(response.statusCode).toBe(201)
  return authSessionResponseSchema.parse(response.body)
}

export async function request(
  app: NestFastifyApplication,
  method: "GET" | "POST" | "PATCH",
  targetPath: string,
  options: {
    token?: string
    payload?: unknown
    headers?: Record<string, string>
  } = {},
) {
  const response = await app.inject({
    method,
    url: targetPath,
    headers: {
      ...(options.token ? { authorization: `Bearer ${options.token}` } : {}),
      ...(options.headers ?? {}),
    },
    ...(options.payload !== undefined && options.payload !== null
      ? { payload: options.payload }
      : {}),
  })

  return {
    statusCode: response.statusCode,
    body: response.json(),
  }
}
