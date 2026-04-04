"use client"

import type { AttendanceMode, AttendanceSessionStatus } from "@attendease/contracts"
import { webTheme } from "@attendease/ui-web"
import type { Dispatch, SetStateAction } from "react"

import type {
  TeacherWebAcademicFilterOptions,
  TeacherWebHistoryFilterDraft,
  TeacherWebSessionHistorySummaryModel,
} from "../../teacher-review-workflows"
import { WorkflowField, WorkflowSelectField, WorkflowStateCard, workflowStyles } from "../shared"

export function TeacherSessionHistoryFiltersPanel(props: {
  accessToken: string | null
  filters: TeacherWebHistoryFilterDraft
  setFilters: Dispatch<SetStateAction<TeacherWebHistoryFilterDraft>>
  academicFilterOptions: TeacherWebAcademicFilterOptions
  classroomsError: unknown
  errorMessage: string | null
  historySummary: TeacherWebSessionHistorySummaryModel
}) {
  if (!props.accessToken) {
    return <WorkflowStateCard message="Sign in to review attendance sessions." />
  }

  return (
    <div
      style={{
        borderRadius: 14,
        border: "1px solid var(--ae-card-border)",
        background: "var(--ae-card-surface)",
        boxShadow: "var(--ae-card-shadow)",
        padding: "18px 22px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background: "var(--ae-card-glow)",
          pointerEvents: "none",
        }}
      />
      <p
        style={{
          margin: "0 0 14px",
          fontSize: 11,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          color: webTheme.colors.accent,
          opacity: 0.7,
          position: "relative",
          zIndex: 1,
        }}
      >
        Filters
      </p>
      <div style={{ ...workflowStyles.formGrid, position: "relative", zIndex: 1 }}>
        <WorkflowSelectField
          label="Classroom"
          value={props.filters.classroomId}
          onChange={(value) =>
            props.setFilters((current) => ({
              ...current,
              classroomId: value,
            }))
          }
          options={[
            { value: "", label: "All classrooms" },
            ...props.academicFilterOptions.classroomOptions,
          ]}
        />
        <WorkflowSelectField
          label="Class"
          value={props.filters.classId}
          onChange={(value) =>
            props.setFilters((current) => ({
              ...current,
              classId: value,
            }))
          }
          options={[
            { value: "", label: "All classes" },
            ...props.academicFilterOptions.classOptions,
          ]}
        />
        <WorkflowSelectField
          label="Section"
          value={props.filters.sectionId}
          onChange={(value) =>
            props.setFilters((current) => ({
              ...current,
              sectionId: value,
            }))
          }
          options={[
            { value: "", label: "All sections" },
            ...props.academicFilterOptions.sectionOptions,
          ]}
        />
        <WorkflowSelectField
          label="Subject"
          value={props.filters.subjectId}
          onChange={(value) =>
            props.setFilters((current) => ({
              ...current,
              subjectId: value,
            }))
          }
          options={[
            { value: "", label: "All subjects" },
            ...props.academicFilterOptions.subjectOptions,
          ]}
        />
        <WorkflowSelectField
          label="Status"
          value={props.filters.status}
          onChange={(value) =>
            props.setFilters((current) => ({
              ...current,
              status: value as AttendanceSessionStatus | "ALL",
            }))
          }
          options={[
            { value: "ALL", label: "All statuses" },
            { value: "ACTIVE", label: "Active" },
            { value: "ENDED", label: "Ended" },
            { value: "EXPIRED", label: "Expired" },
            { value: "CANCELLED", label: "Cancelled" },
          ]}
        />
        <WorkflowSelectField
          label="Mode"
          value={props.filters.mode}
          onChange={(value) =>
            props.setFilters((current) => ({
              ...current,
              mode: value as AttendanceMode | "ALL",
            }))
          }
          options={[
            { value: "ALL", label: "All modes" },
            { value: "QR_GPS", label: "QR + GPS" },
            { value: "BLUETOOTH", label: "Bluetooth" },
            { value: "MANUAL", label: "Manual" },
          ]}
        />
        <WorkflowField
          label="From"
          value={props.filters.fromDate}
          onChange={(value) =>
            props.setFilters((current) => ({
              ...current,
              fromDate: value,
            }))
          }
          type="date"
        />
        <WorkflowField
          label="To"
          value={props.filters.toDate}
          onChange={(value) =>
            props.setFilters((current) => ({
              ...current,
              toDate: value,
            }))
          }
          type="date"
        />
      </div>

      {props.classroomsError && props.errorMessage ? (
        <p style={{ margin: 0, fontSize: 13, color: webTheme.colors.danger, position: "relative", zIndex: 1 }}>
          {props.errorMessage}
        </p>
      ) : null}
    </div>
  )
}
