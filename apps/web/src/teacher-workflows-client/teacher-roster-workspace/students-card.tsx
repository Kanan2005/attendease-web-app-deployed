"use client"

import type { ClassroomRosterMemberSummary } from "@attendease/contracts"
import { webTheme } from "@attendease/ui-web"

import {
  buildTeacherWebRosterMemberActions,
  buildTeacherWebRosterMemberIdentityText,
} from "../../teacher-roster-management"
import { WebSectionCard } from "../../web-shell"
import { formatPortalDateTime } from "../../web-workflows"

import { WorkflowBanner, WorkflowStateCard, workflowStyles } from "../shared"

export function TeacherRosterStudentsCard(props: {
  members: ClassroomRosterMemberSummary[] | undefined
  loading: boolean
  error: unknown
  rosterSummary: string
  updatePending: boolean
  removePending: boolean
  onUpdate: (input: {
    enrollmentId: string
    membershipStatus: ClassroomRosterMemberSummary["membershipState"]
  }) => void
  onRemove: (enrollmentId: string) => void
}) {
  return (
    <WebSectionCard
      title="Students"
      description="Review each student in course context, update membership state where policy allows, and remove a student explicitly when needed."
    >
      {props.loading ? <WorkflowStateCard message="Loading roster..." /> : null}
      {props.error ? (
        <WorkflowBanner
          tone="danger"
          message={
            props.error instanceof Error ? props.error.message : "Failed to load the roster."
          }
        />
      ) : null}
      {props.members && props.members.length === 0 ? (
        <WorkflowStateCard message={props.rosterSummary} />
      ) : null}

      {props.members && props.members.length > 0 ? (
        <div style={workflowStyles.cardGrid}>
          {props.members.map((member) => {
            const membershipSource = member.membershipSource ?? member.source

            return (
              <div key={member.id} style={workflowStyles.rowCard}>
                <div style={{ display: "grid", gap: 10 }}>
                  <div>
                    <strong style={{ display: "block", fontSize: 18 }}>
                      {member.studentName ?? member.studentDisplayName}
                    </strong>
                    <div
                      style={{ color: webTheme.colors.textSubtle, marginTop: 6, lineHeight: 1.5 }}
                    >
                      {buildTeacherWebRosterMemberIdentityText(member)}
                    </div>
                  </div>

                  <div style={workflowStyles.buttonRow}>
                    <span style={workflowStyles.pill}>{member.membershipState}</span>
                    <span style={workflowStyles.pill}>{membershipSource}</span>
                    {member.attendanceDisabled ? (
                      <span style={workflowStyles.pill}>Attendance paused</span>
                    ) : null}
                  </div>

                  <div style={{ color: webTheme.colors.textMuted, lineHeight: 1.6 }}>
                    Member since {formatPortalDateTime(member.memberSince)}
                    <br />
                    Joined via {membershipSource.toLowerCase().replaceAll("_", " ")}
                  </div>

                  <div style={workflowStyles.buttonRow}>
                    {buildTeacherWebRosterMemberActions(member).map((action) =>
                      action.kind === "REMOVE" ? (
                        <button
                          type="button"
                          key={`${member.id}-${action.label}`}
                          onClick={() => props.onRemove(member.id)}
                          disabled={props.removePending || props.updatePending}
                          style={workflowStyles.dangerButton}
                        >
                          {props.removePending ? "Removing..." : action.label}
                        </button>
                      ) : (
                        <button
                          type="button"
                          key={`${member.id}-${action.membershipStatus}`}
                          onClick={() =>
                            props.onUpdate({
                              enrollmentId: member.id,
                              membershipStatus: action.membershipStatus,
                            })
                          }
                          disabled={props.updatePending || props.removePending}
                          style={
                            action.tone === "danger"
                              ? workflowStyles.dangerButton
                              : workflowStyles.secondaryButton
                          }
                        >
                          {props.updatePending ? "Saving..." : action.label}
                        </button>
                      ),
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : null}
    </WebSectionCard>
  )
}
