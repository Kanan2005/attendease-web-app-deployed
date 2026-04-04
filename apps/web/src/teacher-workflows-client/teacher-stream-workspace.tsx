"use client"

import type { AnnouncementVisibility } from "@attendease/contracts"
import { webTheme } from "@attendease/ui-web"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import React, { useState } from "react"

import { formatPortalDateTime, webWorkflowQueryKeys } from "../web-workflows"

import {
  WorkflowBanner,
  WorkflowField,
  WorkflowSelectField,
  WorkflowStateCard,
  bootstrap,
  workflowStyles,
} from "./shared"

export function TeacherStreamWorkspace(props: {
  accessToken: string | null
  classroomId: string
}) {
  const queryClient = useQueryClient()
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [visibility, setVisibility] = useState<AnnouncementVisibility>("STUDENT_AND_TEACHER")
  const [shouldNotify, setShouldNotify] = useState(true)

  const announcementsQuery = useQuery({
    queryKey: webWorkflowQueryKeys.classroomStream(props.classroomId, 25),
    enabled: Boolean(props.accessToken),
    queryFn: () =>
      bootstrap.authClient.listClassroomAnnouncements(props.accessToken ?? "", props.classroomId, {
        limit: 25,
      }),
  })

  const createAnnouncement = useMutation({
    mutationFn: async () => {
      if (!props.accessToken) {
        throw new Error("Announcement posting requires an authenticated teacher or admin session.")
      }

      return bootstrap.authClient.createClassroomAnnouncement(
        props.accessToken,
        props.classroomId,
        {
          ...(title.trim() ? { title: title.trim() } : {}),
          body: body.trim(),
          visibility,
          shouldNotify,
        },
      )
    },
    onSuccess: async (announcement) => {
      setStatusMessage(`Posted "${announcement.title ?? "Untitled announcement"}" to the stream.`)
      setTitle("")
      setBody("")
      await queryClient.invalidateQueries({
        queryKey: webWorkflowQueryKeys.classroomStream(props.classroomId, 25),
      })
    },
    onError: (error) => {
      setStatusMessage(error instanceof Error ? error.message : "Failed to post announcement.")
    },
  })

  const announcements = announcementsQuery.data ?? []

  return (
    <div style={workflowStyles.grid}>
      {/* Compose card */}
      <div
        style={{
          borderRadius: 16,
          border: "1px solid var(--ae-card-border)",
          background: "var(--ae-card-surface)",
          boxShadow: "var(--ae-card-shadow)",
          overflow: "hidden",
          position: "relative",
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
        <div
          style={{
            padding: "16px 24px",
            borderBottom: "1px solid var(--ae-card-border)",
            position: "relative",
            zIndex: 1,
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: webTheme.gradients.accentButton,
              display: "grid",
              placeItems: "center",
              fontSize: 14,
              color: "#fff",
              flexShrink: 0,
            }}
          >
            📢
          </div>
          <h3
            style={{
              margin: 0,
              fontSize: 15,
              fontWeight: 600,
              color: webTheme.colors.text,
            }}
          >
            New Announcement
          </h3>
        </div>

        <div style={{ padding: "20px 24px", display: "grid", gap: 14, position: "relative", zIndex: 1 }}>
          {!props.accessToken ? (
            <WorkflowStateCard message="Sign in to post announcements." />
          ) : (
            <>
              <WorkflowField label="Title" value={title} onChange={setTitle} placeholder="Optional title" />
              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: webTheme.colors.textMuted, letterSpacing: "0.02em" }}>
                  Body
                </span>
                <textarea
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                  style={{ ...workflowStyles.textarea, minHeight: 100 }}
                  placeholder="Write your announcement..."
                />
              </label>
              <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                <div style={{ flex: "1 1 180px", minWidth: 0 }}>
                  <WorkflowSelectField
                    label="Visibility"
                    value={visibility}
                    onChange={(value) => setVisibility(value as AnnouncementVisibility)}
                    options={[
                      { value: "STUDENT_AND_TEACHER", label: "Everyone" },
                      { value: "TEACHER_ONLY", label: "Teachers only" },
                    ]}
                  />
                </div>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: 13,
                    color: webTheme.colors.textMuted,
                    padding: "10px 0",
                    cursor: "pointer",
                    userSelect: "none",
                    flexShrink: 0,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={shouldNotify}
                    onChange={(event) => setShouldNotify(event.target.checked)}
                    style={{ accentColor: webTheme.colors.accent }}
                  />
                  Notify
                </label>
                <button
                  type="button"
                  className="ui-primary-btn"
                  onClick={() => createAnnouncement.mutate()}
                  disabled={createAnnouncement.isPending || !body.trim()}
                  style={{
                    ...workflowStyles.primaryButton,
                    padding: "10px 24px",
                    flexShrink: 0,
                    marginLeft: "auto",
                  }}
                >
                  {createAnnouncement.isPending ? "Posting..." : "Post"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {statusMessage ? <WorkflowBanner tone="info" message={statusMessage} /> : null}

      {/* Stream history */}
      {announcementsQuery.isLoading ? <WorkflowStateCard message="Loading announcements..." /> : null}
      {announcementsQuery.isError ? (
        <WorkflowBanner
          tone="danger"
          message={
            announcementsQuery.error instanceof Error
              ? announcementsQuery.error.message
              : "Failed to load classroom announcements."
          }
        />
      ) : null}
      {announcementsQuery.data && announcements.length === 0 ? (
        <div
          style={{
            padding: "48px 24px",
            textAlign: "center",
            borderRadius: 16,
            border: "1px dashed var(--ae-card-border)",
            background: "var(--ae-card-surface)",
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 15,
              fontWeight: 600,
              color: webTheme.colors.text,
              marginBottom: 4,
            }}
          >
            No announcements yet
          </p>
          <p style={{ margin: 0, fontSize: 13, color: webTheme.colors.textMuted }}>
            Post your first announcement above.
          </p>
        </div>
      ) : null}
      {announcements.length > 0 ? (
        <div
          style={{
            borderRadius: 16,
            border: "1px solid var(--ae-card-border)",
            boxShadow: "var(--ae-card-shadow)",
            overflow: "hidden",
            position: "relative",
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
          {announcements.map((announcement, index) => (
            <React.Fragment key={announcement.id}>
              <div
                style={{
                  padding: "16px 24px",
                  position: "relative",
                  zIndex: 1,
                  background: "var(--ae-card-surface)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                    marginBottom: 8,
                  }}
                >
                  <h4
                    style={{
                      margin: 0,
                      fontSize: 14,
                      fontWeight: 600,
                      color: webTheme.colors.text,
                    }}
                  >
                    {announcement.title ?? "Untitled"}
                  </h4>
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    {announcement.visibility === "TEACHER_ONLY" ? (
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 600,
                          letterSpacing: "0.04em",
                          textTransform: "uppercase",
                          color: webTheme.colors.warning,
                          background: webTheme.colors.warningSoft,
                          border: `1px solid ${webTheme.colors.warningBorder}`,
                          borderRadius: 999,
                          padding: "2px 8px",
                        }}
                      >
                        Teachers only
                      </span>
                    ) : null}
                  </div>
                </div>
                <p
                  style={{
                    margin: "0 0 10px",
                    fontSize: 14,
                    color: webTheme.colors.textMuted,
                    lineHeight: 1.6,
                  }}
                >
                  {announcement.body}
                </p>
                <div
                  style={{
                    fontSize: 12,
                    color: webTheme.colors.textSubtle,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <span style={{ fontWeight: 500 }}>{announcement.authorDisplayName}</span>
                  <span>·</span>
                  <span>{formatPortalDateTime(announcement.createdAt)}</span>
                </div>
              </div>
              {index < announcements.length - 1 ? (
                <div
                  aria-hidden
                  style={{
                    height: 1,
                    background: "var(--ae-divider-gradient)",
                    marginLeft: 24,
                    marginRight: 24,
                    position: "relative",
                    zIndex: 1,
                  }}
                />
              ) : null}
            </React.Fragment>
          ))}
        </div>
      ) : null}
    </div>
  )
}
