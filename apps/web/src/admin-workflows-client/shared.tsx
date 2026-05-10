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

export const bootstrap = createWebAuthBootstrap()

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
    borderRadius: 16,
    border: `1px solid ${webTheme.colors.border}`,
    background: webTheme.colors.surfaceRaised,
    padding: 16,
    boxShadow: webTheme.shadow.card,
    transition: "border-color 0.2s ease, box-shadow 0.2s ease",
  },
  input: {
    width: "100%",
    borderRadius: webTheme.radius.button,
    border: `1px solid ${webTheme.colors.borderStrong}`,
    padding: "11px 14px",
    fontSize: 14,
    background: webTheme.colors.surfaceRaised,
    color: webTheme.colors.text,
    transition: "border-color 0.2s ease, box-shadow 0.2s ease",
  },
  buttonRow: {
    display: "flex",
    gap: 12,
    flexWrap: "wrap" as const,
  },
  primaryButton: {
    border: "none",
    borderRadius: webTheme.radius.button,
    padding: "11px 20px",
    background: webTheme.gradients.accentButton,
    color: "#fff",
    fontWeight: 700,
    fontSize: 14,
    cursor: "pointer",
    boxShadow: "0 4px 14px rgba(167, 139, 250, 0.35)",
    transition: "transform 0.2s ease, box-shadow 0.2s ease, filter 0.2s ease",
  },
  secondaryButton: {
    border: `1px solid ${webTheme.colors.borderStrong}`,
    borderRadius: webTheme.radius.button,
    padding: "11px 20px",
    background: webTheme.colors.surfaceRaised,
    color: webTheme.colors.text,
    fontWeight: 600,
    fontSize: 14,
    cursor: "pointer",
    transition: "border-color 0.15s ease, background 0.15s ease",
  },
  dangerButton: {
    border: "none",
    borderRadius: webTheme.radius.button,
    padding: "11px 20px",
    background: webTheme.colors.danger,
    color: "#fff",
    fontWeight: 700,
    fontSize: 14,
    cursor: "pointer",
    boxShadow: "0 4px 14px rgba(248, 113, 113, 0.3)",
    transition: "transform 0.2s ease, box-shadow 0.2s ease, filter 0.2s ease",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse" as const,
  },
  th: {
    textAlign: "left" as const,
    padding: "10px 12px",
    color: webTheme.colors.textMuted,
    fontSize: 11,
    fontWeight: 600,
    textTransform: "uppercase" as const,
    letterSpacing: "0.08em",
    borderBottom: `1px solid ${webTheme.colors.border}`,
    background: "var(--ae-th-bg)",
  },
  td: {
    padding: "12px 12px",
    borderBottom: `1px solid ${webTheme.colors.surfaceMuted}`,
    verticalAlign: "top" as const,
    color: webTheme.colors.text,
    fontSize: 14,
  },
  stateCard: {
    borderRadius: 14,
    border: `1px dashed ${webTheme.colors.borderStrong}`,
    background: webTheme.colors.surfaceMuted,
    padding: 20,
    color: webTheme.colors.textMuted,
    fontSize: 14,
    textAlign: "center" as const,
  },
  pill: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    padding: "6px 12px",
    background: webTheme.colors.accentSoft,
    border: `1px solid ${webTheme.colors.accentBorder}`,
    color: webTheme.colors.accent,
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: "0.02em",
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
  type?: "text" | "number" | "email" | "password" | "date"
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
  return <div className="animate-in" style={styles.stateCard}>{props.message}</div>
}

export function Banner(props: {
  tone: "info" | "danger"
  message: string
}) {
  return (
    <div
      className="animate-banner"
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
