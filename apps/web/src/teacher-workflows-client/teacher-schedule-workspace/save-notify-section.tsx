"use client"

import { WebSectionCard } from "../../web-shell"

import { WorkflowBanner, WorkflowField, workflowStyles } from "../shared"

export function TeacherScheduleSaveNotifySection(props: {
  saveNote: string
  setSaveNote: (value: string) => void
  statusMessage: string | null
  savePending: boolean
  onSave: () => void
}) {
  return (
    <>
      <WebSectionCard
        title="Save & Notify"
        description="One transaction-backed schedule.changed outbox event is emitted when the draft is saved successfully."
      >
        <div style={workflowStyles.grid}>
          <WorkflowField label="Save note" value={props.saveNote} onChange={props.setSaveNote} />
          <button
            type="button"
            onClick={props.onSave}
            disabled={props.savePending}
            style={workflowStyles.primaryButton}
          >
            {props.savePending ? "Saving..." : "Save & Notify"}
          </button>
        </div>
      </WebSectionCard>

      {props.statusMessage ? <WorkflowBanner tone="info" message={props.statusMessage} /> : null}
    </>
  )
}
