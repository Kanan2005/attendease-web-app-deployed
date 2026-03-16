import type { ClassroomSchedule, LectureSummary } from "@attendease/contracts"

import type { CardTone } from "./student-models"
import {
  buildExceptionTitle,
  formatDateLabel,
  formatDateTimeLabel,
  formatMinutes,
  resolveLectureTimestamp,
  weekdayLabels,
} from "./student-workflow-models-helpers"
import type { StudentScheduleOverviewModel } from "./student-workflow-models-types"

export function buildStudentScheduleOverviewModel(input: {
  schedule: ClassroomSchedule | null
  lectures: LectureSummary[]
}): StudentScheduleOverviewModel {
  const weeklyItems = [...(input.schedule?.scheduleSlots ?? [])]
    .sort((left, right) => left.weekday - right.weekday || left.startMinutes - right.startMinutes)
    .map((slot) => ({
      id: slot.id,
      weekdayLabel: weekdayLabels[slot.weekday - 1] ?? "Day",
      timeLabel: `${formatMinutes(slot.startMinutes)} - ${formatMinutes(slot.endMinutes)}`,
      locationLabel: slot.locationLabel,
    }))

  const exceptionItems = [...(input.schedule?.scheduleExceptions ?? [])]
    .sort(
      (left, right) =>
        new Date(left.effectiveDate).getTime() - new Date(right.effectiveDate).getTime(),
    )
    .map((exception) => ({
      id: exception.id,
      title: buildExceptionTitle(exception.exceptionType),
      effectiveDateLabel: formatDateLabel(exception.effectiveDate),
      timeLabel:
        exception.startMinutes !== null && exception.endMinutes !== null
          ? `${formatMinutes(exception.startMinutes)} - ${formatMinutes(exception.endMinutes)}`
          : "No class time",
      locationLabel: exception.locationLabel,
      reason: exception.reason,
      tone: (exception.exceptionType === "CANCELLED" ? "danger" : "warning") as CardTone,
    }))

  const upcomingLectures = [...input.lectures]
    .filter((lecture) => lecture.status !== "CANCELLED")
    .sort(
      (left, right) =>
        new Date(resolveLectureTimestamp(left)).getTime() -
        new Date(resolveLectureTimestamp(right)).getTime(),
    )
    .slice(0, 6)
    .map((lecture) => ({
      id: lecture.id,
      title: lecture.title ?? "Scheduled lecture",
      timeLabel: formatDateTimeLabel(resolveLectureTimestamp(lecture)),
      status: lecture.status,
    }))

  return {
    weeklyItems,
    exceptionItems,
    upcomingLectures,
  }
}
