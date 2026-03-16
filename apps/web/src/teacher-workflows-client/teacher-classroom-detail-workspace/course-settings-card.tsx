"use client"

import type { AttendanceMode, ClassroomDetail } from "@attendease/contracts"
import type { Dispatch, SetStateAction } from "react"

import {
  type createTeacherWebClassroomEditDraft,
  hasTeacherWebClassroomEditChanges,
} from "../../teacher-classroom-management"

import { WebSectionCard } from "../../web-shell"
import { WorkflowField, WorkflowSelectField, workflowStyles } from "../shared"

type ClassroomEditDraft = ReturnType<typeof createTeacherWebClassroomEditDraft>

export function TeacherClassroomSettingsCard(props: {
  classroom: ClassroomDetail
  form: ClassroomEditDraft
  canEditCourseInfo: boolean
  canArchive: boolean
  updatePending: boolean
  joinCodePending: boolean
  archivePending: boolean
  setForm: Dispatch<SetStateAction<ClassroomEditDraft | null>>
  onSave: () => void
  onResetJoinCode: () => void
  onArchive: () => void
}) {
  return (
    <WebSectionCard
      title="Course settings"
      description="Update the classroom title, course code, and attendance defaults without touching academic scope assignments."
    >
      <div style={workflowStyles.formGrid}>
        <WorkflowField
          label="Classroom title"
          value={props.form.classroomTitle}
          onChange={(value) =>
            props.setForm((current) => (current ? { ...current, classroomTitle: value } : current))
          }
        />
        <WorkflowField
          label="Course code"
          value={props.form.courseCode}
          onChange={(value) =>
            props.setForm((current) => (current ? { ...current, courseCode: value } : current))
          }
        />
        <WorkflowSelectField
          label="Attendance mode"
          value={props.form.defaultAttendanceMode}
          onChange={(value) =>
            props.setForm((current) =>
              current ? { ...current, defaultAttendanceMode: value as AttendanceMode } : current,
            )
          }
          options={[
            { value: "QR_GPS", label: "QR + GPS" },
            { value: "BLUETOOTH", label: "Bluetooth" },
            { value: "MANUAL", label: "Manual" },
          ]}
        />
        <WorkflowField
          label="GPS radius (meters)"
          value={props.form.defaultGpsRadiusMeters}
          onChange={(value) =>
            props.setForm((current) =>
              current ? { ...current, defaultGpsRadiusMeters: value } : current,
            )
          }
          type="number"
        />
        <WorkflowField
          label="Session duration (minutes)"
          value={props.form.defaultSessionDurationMinutes}
          onChange={(value) =>
            props.setForm((current) =>
              current ? { ...current, defaultSessionDurationMinutes: value } : current,
            )
          }
          type="number"
        />
        <WorkflowField
          label="Timezone"
          value={props.form.timezone}
          onChange={(value) =>
            props.setForm((current) => (current ? { ...current, timezone: value } : current))
          }
        />
      </div>

      <label style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 14 }}>
        <input
          type="checkbox"
          checked={props.form.requiresTrustedDevice}
          onChange={(event) =>
            props.setForm((current) =>
              current ? { ...current, requiresTrustedDevice: event.target.checked } : current,
            )
          }
        />
        Require device registration for student attendance
      </label>

      <div style={{ ...workflowStyles.buttonRow, marginTop: 16 }}>
        <button
          type="button"
          onClick={props.onSave}
          disabled={
            props.updatePending ||
            !props.canEditCourseInfo ||
            !hasTeacherWebClassroomEditChanges(props.classroom, props.form)
          }
          style={workflowStyles.primaryButton}
        >
          {props.updatePending ? "Saving..." : "Save course settings"}
        </button>
        <button
          type="button"
          onClick={props.onResetJoinCode}
          disabled={props.joinCodePending}
          style={workflowStyles.secondaryButton}
        >
          {props.joinCodePending ? "Rotating..." : "Reset join code"}
        </button>
        <button
          type="button"
          onClick={props.onArchive}
          disabled={props.archivePending || !props.canArchive}
          style={workflowStyles.dangerButton}
        >
          {props.archivePending ? "Archiving..." : "Archive classroom"}
        </button>
      </div>
    </WebSectionCard>
  )
}
