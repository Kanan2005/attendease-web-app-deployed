"use client"

import type { ClassroomStatus, SemesterSummary, UserStatus } from "@attendease/contracts"
import { webTheme } from "@attendease/ui-web"
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query"
import Link from "next/link"
import { startTransition, useEffect, useState } from "react"

import {
  buildAdminClassroomArchiveReadiness,
  buildAdminClassroomGovernanceImpactModel,
  buildAdminClassroomGovernanceListCard,
  buildAdminClassroomGovernanceSummaryMessage,
} from "../admin-classroom-governance"
import { formatAdminSupportLabel } from "../admin-device-support"
import {
  buildAdminStudentManagementSummaryMessage,
  buildAdminStudentStatusActionLabel,
  buildAdminStudentStatusActionReadiness,
} from "../admin-student-management"
import { createWebAuthBootstrap } from "../auth"
import { WebSectionCard } from "../web-shell"
import {
  adminWorkflowRoutes,
  buildImportMonitorRows,
  formatPortalDateTime,
  webWorkflowQueryKeys,
} from "../web-workflows"

export const bootstrap = createWebAuthBootstrap(process.env as Record<string, string | undefined>)

export const styles = {
  grid: {
    display: "grid",
    gap: 20,
  },
  formGrid: {
    display: "grid",
    gap: 14,
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  },
  rowCard: {
    borderRadius: 24,
    border: `1px solid ${webTheme.colors.border}`,
    background: webTheme.colors.surfaceRaised,
    padding: 16,
    boxShadow: webTheme.shadow.card,
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
  stateCard: {
    borderRadius: 24,
    border: `1px dashed ${webTheme.colors.borderStrong}`,
    background: webTheme.colors.surfaceMuted,
    padding: 18,
    color: webTheme.colors.textMuted,
  },
  pill: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    padding: "8px 12px",
    background: webTheme.colors.surfaceHero,
    border: `1px solid ${webTheme.colors.borderStrong}`,
    color: webTheme.colors.primary,
    fontSize: 13,
    fontWeight: 700,
  },
} as const

export type SemesterFormState = {
  academicTermId: string
  code: string
  title: string
  ordinal: string
  startDate: string
  endDate: string
  attendanceCutoffDate: string
}

export type AdminStudentStatusFilter = "ALL" | UserStatus
export type AdminClassroomStatusFilter = "ALL" | ClassroomStatus

export function SemesterForm(props: {
  form: SemesterFormState
  onChange: (next: SemesterFormState) => void
}) {
  return (
    <div style={styles.formGrid}>
      <Field
        label="Academic term id"
        value={props.form.academicTermId}
        onChange={(value) => props.onChange({ ...props.form, academicTermId: value })}
      />
      <Field
        label="Code"
        value={props.form.code}
        onChange={(value) => props.onChange({ ...props.form, code: value })}
      />
      <Field
        label="Title"
        value={props.form.title}
        onChange={(value) => props.onChange({ ...props.form, title: value })}
      />
      <Field
        label="Ordinal"
        value={props.form.ordinal}
        onChange={(value) => props.onChange({ ...props.form, ordinal: value })}
        type="number"
      />
      <Field
        label="Start date (ISO)"
        value={props.form.startDate}
        onChange={(value) => props.onChange({ ...props.form, startDate: value })}
      />
      <Field
        label="End date (ISO)"
        value={props.form.endDate}
        onChange={(value) => props.onChange({ ...props.form, endDate: value })}
      />
      <Field
        label="Attendance cutoff (ISO)"
        value={props.form.attendanceCutoffDate}
        onChange={(value) => props.onChange({ ...props.form, attendanceCutoffDate: value })}
      />
    </div>
  )
}

export function mapSemesterToForm(semester: SemesterSummary): SemesterFormState {
  return {
    academicTermId: semester.academicTermId,
    code: semester.code,
    title: semester.title,
    ordinal: semester.ordinal === null ? "" : String(semester.ordinal),
    startDate: semester.startDate,
    endDate: semester.endDate,
    attendanceCutoffDate: semester.attendanceCutoffDate ?? "",
  }
}

export function Field(props: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: "text" | "number"
}) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span>{props.label}</span>
      <input
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
        style={styles.input}
        type={props.type ?? "text"}
      />
    </label>
  )
}

export function StateCard(props: { message: string }) {
  return <div style={styles.stateCard}>{props.message}</div>
}

export function Banner(props: {
  tone: "info" | "danger"
  message: string
}) {
  return (
    <div
      style={{
        ...styles.rowCard,
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
