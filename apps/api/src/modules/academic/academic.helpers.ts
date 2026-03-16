import { randomBytes } from "node:crypto"

import type { PrismaTransactionClient } from "@attendease/db"
import { ConflictException } from "@nestjs/common"

export function isUniqueConstraintError(error: unknown): error is { code: string } {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
  )
}

export function createUppercaseCode(length: number): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  const bytes = randomBytes(length)

  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("")
}

export function toInclusiveDayEnd(date: Date): Date {
  const result = new Date(date)
  result.setUTCHours(23, 59, 59, 999)
  return result
}

export function toUtcDateOnly(input: Date): Date {
  return new Date(Date.UTC(input.getUTCFullYear(), input.getUTCMonth(), input.getUTCDate()))
}

export function minutesToUtcDateTime(date: Date, minutes: number): Date {
  const normalizedDate = toUtcDateOnly(date)
  const result = new Date(normalizedDate)
  result.setUTCMinutes(minutes)
  return result
}

export function rangesOverlap(
  leftStartMinutes: number,
  leftEndMinutes: number,
  rightStartMinutes: number,
  rightEndMinutes: number,
): boolean {
  return leftStartMinutes < rightEndMinutes && rightStartMinutes < leftEndMinutes
}

export async function createActiveJoinCodeWithRetries(
  transaction: PrismaTransactionClient,
  params: {
    courseOfferingId: string
    createdByUserId: string
    expiresAt: Date
    rotatedFromId?: string | null
  },
) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      return await transaction.classroomJoinCode.create({
        data: {
          courseOfferingId: params.courseOfferingId,
          createdByUserId: params.createdByUserId,
          code: createUppercaseCode(6),
          status: "ACTIVE",
          expiresAt: params.expiresAt,
          ...(params.rotatedFromId ? { rotatedFromId: params.rotatedFromId } : {}),
        },
      })
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        continue
      }

      throw error
    }
  }

  throw new ConflictException("Unable to generate a unique classroom join code.")
}
