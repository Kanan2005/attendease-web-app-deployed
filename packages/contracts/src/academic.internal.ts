import { z } from "zod"

export const isoDateTimeSchema = z.string().datetime()
export const minuteOfDaySchema = z.coerce.number().int().min(0).max(1440)
export const weekdaySchema = z.coerce.number().int().min(1).max(7)
export const classroomCodeFieldSchema = z.string().trim().min(3).max(64)
export const classroomTitleFieldSchema = z.string().trim().min(3).max(120)

export function fieldsMatch(left?: string, right?: string) {
  return left === undefined || right === undefined || left.trim() === right.trim()
}
