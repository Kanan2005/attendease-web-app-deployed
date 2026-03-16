"use client"

import type {
  AnnouncementVisibility,
  AttendanceMode,
  AttendanceSessionStatus,
  AttendanceSessionStudentSummary,
  ClassroomDetail,
  ClassroomRosterMemberSummary,
  ClassroomSummary,
  CourseOfferingStatus,
  ExportJobType,
  LectureSummary,
} from "@attendease/contracts"
import {
  buildAttendanceCorrectionSaveMessage,
  buildAttendanceEditChanges,
  createAttendanceEditDraft,
  getAttendanceCorrectionReviewPollInterval,
} from "@attendease/domain"
import { webTheme } from "@attendease/ui-web"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

import { createWebAuthBootstrap } from "../auth"
import {
  buildTeacherWebClassroomCreateRequest,
  buildTeacherWebClassroomListCards,
  buildTeacherWebClassroomScopeOptions,
  buildTeacherWebClassroomScopeSummary,
  buildTeacherWebClassroomUpdateRequest,
  createTeacherWebClassroomCreateDraft,
  createTeacherWebClassroomEditDraft,
  formatTeacherWebAttendanceModeLabel,
  hasTeacherWebClassroomEditChanges,
} from "../teacher-classroom-management"
import {
  applyTeacherWebQrSessionClassroomSelection,
  buildTeacherWebQrSessionClassroomOptions,
  buildTeacherWebQrSessionStartRequest,
  createTeacherWebQrSessionStartDraft,
  evaluateTeacherWebQrSessionStartReadiness,
} from "../teacher-qr-session-management"
import {
  type TeacherWebReviewTone,
  buildTeacherWebAcademicFilterOptions,
  buildTeacherWebFilterSummary,
  buildTeacherWebHistoryQueryFilters,
  buildTeacherWebReportOverviewModel,
  buildTeacherWebReportQueryFilters,
  buildTeacherWebSessionDetailOverviewModel,
  buildTeacherWebSessionDetailStatusModel,
  buildTeacherWebSessionHistorySummaryModel,
  buildTeacherWebSessionRosterModel,
  createTeacherWebHistoryFilterDraft,
  createTeacherWebReportFilterDraft,
  mapTeacherWebReviewErrorToMessage,
} from "../teacher-review-workflows"
import {
  buildTeacherWebRosterAddRequest,
  buildTeacherWebRosterFilters,
  buildTeacherWebRosterMemberActions,
  buildTeacherWebRosterMemberIdentityText,
  buildTeacherWebRosterResultSummary,
} from "../teacher-roster-management"
import { WebSectionCard } from "../web-shell"
import {
  buildScheduleSavePayload,
  buildTeacherClassroomLinks,
  buildTeacherSemesterVisibilityRows,
  createEmptyScheduleExceptionDraft,
  createEmptyScheduleSlotDraft,
  createScheduleDraftState,
  formatPortalDateTime,
  formatPortalMinutesRange,
  getTeacherSessionHistoryPollInterval,
  parseRosterImportRowsText,
  sortScheduleExceptions,
  sortScheduleSlots,
  teacherWorkflowRoutes,
  webWorkflowQueryKeys,
} from "../web-workflows"

export const bootstrap = createWebAuthBootstrap(process.env as Record<string, string | undefined>)

export const workflowStyles = {
  grid: {
    display: "grid",
    gap: 20,
  },
  twoColumn: {
    display: "grid",
    gap: 20,
    gridTemplateColumns: "minmax(0, 1.15fr) minmax(320px, 0.85fr)",
  },
  formGrid: {
    display: "grid",
    gap: 14,
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  },
  input: {
    width: "100%",
    borderRadius: webTheme.radius.button,
    border: `1px solid ${webTheme.colors.borderStrong}`,
    padding: "13px 14px",
    fontSize: 14,
    background: webTheme.colors.surfaceRaised,
    color: webTheme.colors.text,
  },
  textarea: {
    width: "100%",
    minHeight: 124,
    borderRadius: webTheme.radius.button,
    border: `1px solid ${webTheme.colors.borderStrong}`,
    padding: "13px 14px",
    fontSize: 14,
    background: webTheme.colors.surfaceRaised,
    color: webTheme.colors.text,
    resize: "vertical" as const,
  },
  buttonRow: {
    display: "flex",
    gap: 12,
    flexWrap: "wrap" as const,
  },
  primaryButton: {
    border: "none",
    borderRadius: webTheme.radius.button,
    padding: "13px 18px",
    background: webTheme.colors.primary,
    color: webTheme.colors.primaryContrast,
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: "0 14px 28px rgba(15, 17, 21, 0.14)",
  },
  secondaryButton: {
    border: `1px solid ${webTheme.colors.border}`,
    borderRadius: webTheme.radius.button,
    padding: "13px 18px",
    background: webTheme.colors.surfaceRaised,
    color: webTheme.colors.text,
    fontWeight: 700,
    cursor: "pointer",
  },
  dangerButton: {
    border: "none",
    borderRadius: webTheme.radius.button,
    padding: "13px 18px",
    background: webTheme.colors.danger,
    color: webTheme.colors.primaryContrast,
    fontWeight: 700,
    cursor: "pointer",
  },
  pill: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    padding: "8px 12px",
    background: webTheme.colors.surfaceTint,
    border: `1px solid ${webTheme.colors.border}`,
    color: webTheme.colors.primary,
    fontSize: 13,
    fontWeight: 700,
  },
  stateCard: {
    borderRadius: 24,
    border: `1px dashed ${webTheme.colors.borderStrong}`,
    background: webTheme.colors.surfaceMuted,
    padding: 18,
    color: webTheme.colors.textMuted,
  },
  rowCard: {
    borderRadius: 24,
    border: `1px solid ${webTheme.colors.border}`,
    background: webTheme.colors.surfaceRaised,
    padding: 16,
    boxShadow: webTheme.shadow.card,
  },
  table: {
    width: "100%",
    borderCollapse: "collapse" as const,
  },
  th: {
    textAlign: "left" as const,
    padding: "12px 10px",
    color: webTheme.colors.textMuted,
    fontSize: 12,
    textTransform: "uppercase" as const,
    letterSpacing: "0.06em",
    borderBottom: `1px solid ${webTheme.colors.border}`,
  },
  td: {
    padding: "14px 10px",
    borderBottom: `1px solid ${webTheme.colors.surfaceMuted}`,
    verticalAlign: "top" as const,
    color: webTheme.colors.text,
  },
  linkGrid: {
    display: "grid",
    gap: 12,
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  },
  linkCard: {
    display: "block",
    borderRadius: 24,
    border: `1px solid ${webTheme.colors.border}`,
    background: webTheme.colors.surfaceTint,
    padding: 16,
    textDecoration: "none",
    color: "inherit",
  },
  cardGrid: {
    display: "grid",
    gap: 16,
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  },
  summaryGrid: {
    display: "grid",
    gap: 12,
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  },
  summaryMetric: {
    borderRadius: 20,
    border: `1px solid ${webTheme.colors.border}`,
    background: webTheme.colors.surfaceTint,
    padding: 14,
  },
} as const

type SemesterFormState = {
  academicTermId: string
  code: string
  title: string
  ordinal: string
  startDate: string
  endDate: string
  attendanceCutoffDate: string
}

export function WorkflowField(props: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: "text" | "number" | "date"
}) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span>{props.label}</span>
      <input
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
        placeholder={props.placeholder}
        type={props.type ?? "text"}
        style={workflowStyles.input}
      />
    </label>
  )
}

export function WorkflowSelectField(props: {
  label: string
  value: string
  onChange: (value: string) => void
  options: Array<{ value: string; label: string }>
}) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span>{props.label}</span>
      <select
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
        style={workflowStyles.input}
      >
        {props.options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}

export function WorkflowSummaryGrid(props: {
  cards: Array<{ label: string; value: string; tone: TeacherWebReviewTone }>
}) {
  return (
    <div style={workflowStyles.summaryGrid}>
      {props.cards.map((card) => (
        <div
          key={card.label}
          style={{
            ...workflowStyles.summaryMetric,
            borderColor: getToneStyles(card.tone).borderColor,
            background: getToneStyles(card.tone).background,
          }}
        >
          <div style={{ color: webTheme.colors.textMuted, fontSize: 13 }}>{card.label}</div>
          <strong style={{ display: "block", fontSize: 24, marginTop: 6 }}>{card.value}</strong>
        </div>
      ))}
    </div>
  )
}

export function WorkflowTonePill(props: {
  label: string
  tone: TeacherWebReviewTone
}) {
  const toneStyles = getToneStyles(props.tone)

  return (
    <span
      style={{
        ...workflowStyles.pill,
        background: toneStyles.background,
        borderColor: toneStyles.borderColor,
        color: toneStyles.textColor,
      }}
    >
      {props.label}
    </span>
  )
}

export function WorkflowStatusCard(props: {
  title: string
  message: string
  tone: TeacherWebReviewTone
}) {
  const toneStyles = getToneStyles(props.tone)

  return (
    <div
      style={{
        ...workflowStyles.rowCard,
        borderColor: toneStyles.borderColor,
        background: toneStyles.background,
        color: toneStyles.textColor,
      }}
    >
      <strong style={{ display: "block", marginBottom: 8 }}>{props.title}</strong>
      <div style={{ lineHeight: 1.7 }}>{props.message}</div>
    </div>
  )
}

export function WorkflowStateCard(props: { message: string }) {
  return <div style={workflowStyles.stateCard}>{props.message}</div>
}

export function WorkflowBanner(props: {
  tone: "info" | "danger"
  message: string
}) {
  return (
    <div
      style={{
        ...workflowStyles.rowCard,
        borderColor:
          props.tone === "danger" ? webTheme.colors.dangerBorder : webTheme.colors.borderStrong,
        background:
          props.tone === "danger" ? webTheme.colors.dangerSoft : webTheme.colors.surfaceHero,
        color: props.tone === "danger" ? webTheme.colors.danger : webTheme.colors.primary,
      }}
    >
      {props.message}
    </div>
  )
}

export function findSelectedFilterLabel(
  options: Array<{ value: string; label: string }>,
  selectedValue: string,
) {
  return options.find((option) => option.value === selectedValue)?.label ?? null
}

export function toneForSessionState(status: AttendanceSessionStatus): TeacherWebReviewTone {
  switch (status) {
    case "ACTIVE":
      return "success"
    case "ENDED":
      return "primary"
    case "EXPIRED":
    case "CANCELLED":
      return "warning"
    default:
      return "primary"
  }
}

export function getToneStyles(tone: TeacherWebReviewTone) {
  switch (tone) {
    case "success":
      return {
        background: webTheme.colors.successSoft,
        borderColor: webTheme.colors.successBorder,
        textColor: webTheme.colors.success,
      }
    case "warning":
      return {
        background: webTheme.colors.warningSoft,
        borderColor: webTheme.colors.warningBorder,
        textColor: webTheme.colors.warning,
      }
    case "danger":
      return {
        background: webTheme.colors.dangerSoft,
        borderColor: webTheme.colors.dangerBorder,
        textColor: webTheme.colors.danger,
      }
    default:
      return {
        background: webTheme.colors.surfaceHero,
        borderColor: webTheme.colors.borderStrong,
        textColor: webTheme.colors.primary,
      }
  }
}
