"use client"

import { WebSectionCard } from "../../web-shell"

import { WorkflowField, WorkflowSelectField, workflowStyles } from "../shared"

export function TeacherRosterAddStudentCard(props: {
  studentLookup: string
  newMemberStatus: "ACTIVE" | "PENDING"
  addPending: boolean
  setStudentLookup: (value: string) => void
  setNewMemberStatus: (value: "ACTIVE" | "PENDING") => void
  onAdd: () => void
}) {
  return (
    <WebSectionCard
      title="Add student"
      description="Use a student email or identifier so normal classroom roster work stays quick."
    >
      <div style={workflowStyles.grid}>
        <div style={workflowStyles.formGrid}>
          <WorkflowField
            label="Student email or identifier"
            value={props.studentLookup}
            onChange={props.setStudentLookup}
            placeholder="student.one@attendease.dev or 23CS001"
          />
          <WorkflowSelectField
            label="Starting membership state"
            value={props.newMemberStatus}
            onChange={(value) => props.setNewMemberStatus(value as "ACTIVE" | "PENDING")}
            options={[
              { value: "PENDING", label: "Pending" },
              { value: "ACTIVE", label: "Active" },
            ]}
          />
        </div>

        <div style={workflowStyles.buttonRow}>
          <button
            type="button"
            onClick={props.onAdd}
            disabled={props.addPending}
            style={workflowStyles.primaryButton}
          >
            {props.addPending ? "Adding..." : "Add student"}
          </button>
        </div>

        <div style={workflowStyles.stateCard}>
          Accepted lookup values:
          <br />
          student email
          <br />
          student identifier
        </div>
      </div>
    </WebSectionCard>
  )
}

export function TeacherRosterFiltersCard(props: {
  search: string
  statusFilter: "ALL" | "ACTIVE" | "PENDING" | "DROPPED" | "BLOCKED"
  loading: boolean
  rosterSummary: string
  activeCount: number
  setSearch: (value: string) => void
  setStatusFilter: (value: "ALL" | "ACTIVE" | "PENDING" | "DROPPED" | "BLOCKED") => void
}) {
  return (
    <WebSectionCard
      title="Roster filters"
      description="Search by student identity and narrow the current classroom roster without losing course context."
    >
      <div style={workflowStyles.grid}>
        <div style={workflowStyles.formGrid}>
          <WorkflowField label="Search students" value={props.search} onChange={props.setSearch} />
          <WorkflowSelectField
            label="Membership state"
            value={props.statusFilter}
            onChange={(value) =>
              props.setStatusFilter(value as "ALL" | "ACTIVE" | "PENDING" | "DROPPED" | "BLOCKED")
            }
            options={[
              { value: "ALL", label: "All students" },
              { value: "ACTIVE", label: "Active" },
              { value: "PENDING", label: "Pending" },
              { value: "DROPPED", label: "Dropped" },
              { value: "BLOCKED", label: "Blocked" },
            ]}
          />
        </div>

        <div style={workflowStyles.stateCard}>
          {props.loading ? "Refreshing roster..." : props.rosterSummary}
          <br />
          {props.activeCount} active students ready for attendance from this view.
        </div>
      </div>
    </WebSectionCard>
  )
}
