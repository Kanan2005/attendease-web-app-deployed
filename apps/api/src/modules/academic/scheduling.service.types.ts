import type { PrismaTransactionClient } from "@attendease/db"

import type { DatabaseService } from "../../database/database.service.js"

export type ScheduleQueryClient = DatabaseService["prisma"] | PrismaTransactionClient

export type LinkedLectureResult = {
  lectureId: string
  created: boolean
  matchedBy: "EXCEPTION" | "SLOT" | "AD_HOC"
}

export type EditableScheduleClassroom = {
  status: string
  semester: {
    status: string
    startDate: Date
    endDate: Date
  }
}

export type ScheduleSlotRecord = {
  id: string
  courseOfferingId: string
  weekday: number
  startMinutes: number
  endMinutes: number
  locationLabel: string | null
  status: "ACTIVE" | "ARCHIVED"
}

export type ScheduleExceptionRecord = {
  id: string
  courseOfferingId: string
  scheduleSlotId: string | null
  exceptionType: "CANCELLED" | "RESCHEDULED" | "ONE_OFF"
  effectiveDate: Date
  startMinutes: number | null
  endMinutes: number | null
  locationLabel: string | null
  reason: string | null
}
