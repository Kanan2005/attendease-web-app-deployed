"use client"

import type {
  AnnouncementSummary,
  AnnouncementVisibility,
  ClassroomJoinCodeSummary,
  ClassroomRosterMemberSummary,
  ClassroomSummary,
  RosterImportJobSummary,
} from "@attendease/contracts"
import { startTransition, useMemo, useState } from "react"

import {
  buildAnnouncementComposerHint,
  buildTeacherClassroomHubSummary,
  createWebClassroomCommunicationsBootstrap,
} from "./classroom-communications"

const bootstrap = createWebClassroomCommunicationsBootstrap(
  process.env as Record<string, string | undefined>,
)

const panelStyle = {
  border: "1px solid #dbe4f0",
  borderRadius: 20,
  background: "#ffffff",
  padding: 20,
  boxShadow: "0 18px 40px rgba(15, 23, 42, 0.07)",
} as const

const inputStyle = {
  width: "100%",
  borderRadius: 14,
  border: "1px solid #cbd5e1",
  padding: "12px 14px",
  fontSize: 14,
} as const

const primaryButtonStyle = {
  border: "none",
  borderRadius: 14,
  padding: "12px 16px",
  background: "#2563eb",
  color: "#ffffff",
  fontWeight: 600,
  cursor: "pointer",
} as const

const mutedButtonStyle = {
  ...primaryButtonStyle,
  background: "#0f766e",
} as const

export function TeacherClassroomConsole() {
  const [token, setToken] = useState("")
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [classrooms, setClassrooms] = useState<ClassroomSummary[]>([])
  const [selectedClassroomId, setSelectedClassroomId] = useState("")
  const [joinCode, setJoinCode] = useState<ClassroomJoinCodeSummary | null>(null)
  const [roster, setRoster] = useState<ClassroomRosterMemberSummary[]>([])
  const [announcements, setAnnouncements] = useState<AnnouncementSummary[]>([])
  const [importJobs, setImportJobs] = useState<RosterImportJobSummary[]>([])
  const [announcementTitle, setAnnouncementTitle] = useState("")
  const [announcementBody, setAnnouncementBody] = useState("")
  const [announcementVisibility, setAnnouncementVisibility] =
    useState<AnnouncementVisibility>("STUDENT_AND_TEACHER")
  const [shouldNotify, setShouldNotify] = useState(true)
  const [busy, setBusy] = useState(false)

  const composerHint = useMemo(
    () =>
      buildAnnouncementComposerHint({
        shouldNotify,
        visibility: announcementVisibility,
      }),
    [announcementVisibility, shouldNotify],
  )

  const loadClassrooms = async () => {
    if (!token) {
      setStatusMessage("Paste a teacher or admin bearer token before loading classroom records.")
      return
    }

    setBusy(true)
    setStatusMessage("Loading classroom hub records...")

    try {
      const nextClassrooms = await bootstrap.authClient.listClassrooms(token)

      startTransition(() => {
        setClassrooms(nextClassrooms)
        setSelectedClassroomId(nextClassrooms[0]?.id ?? "")
        setStatusMessage(
          buildTeacherClassroomHubSummary({
            classroomCount: nextClassrooms.length,
            rosterCount: 0,
            announcementCount: 0,
            importJobCount: 0,
            reviewRequiredCount: 0,
          }),
        )
      })
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Failed to load classrooms.")
    } finally {
      setBusy(false)
    }
  }

  const loadClassroomHub = async () => {
    if (!token || !selectedClassroomId) {
      setStatusMessage("Choose a classroom after loading classroom records.")
      return
    }

    setBusy(true)
    setStatusMessage("Loading roster, announcements, join code, and import jobs...")

    try {
      const [nextJoinCode, nextRoster, nextAnnouncements, nextImportJobs] = await Promise.all([
        bootstrap.authClient.getClassroomJoinCode(token, selectedClassroomId),
        bootstrap.authClient.listClassroomRoster(token, selectedClassroomId),
        bootstrap.authClient.listClassroomAnnouncements(token, selectedClassroomId, {
          limit: 10,
        }),
        bootstrap.authClient.listRosterImportJobs(token, selectedClassroomId),
      ])

      startTransition(() => {
        setJoinCode(nextJoinCode)
        setRoster(nextRoster)
        setAnnouncements(nextAnnouncements)
        setImportJobs(nextImportJobs)
        setStatusMessage(
          buildTeacherClassroomHubSummary({
            classroomCount: classrooms.length || 1,
            rosterCount: nextRoster.length,
            announcementCount: nextAnnouncements.length,
            importJobCount: nextImportJobs.length,
            reviewRequiredCount: nextImportJobs.filter((job) => job.status === "REVIEW_REQUIRED")
              .length,
          }),
        )
      })
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Failed to load classroom hub.")
    } finally {
      setBusy(false)
    }
  }

  const postAnnouncement = async () => {
    if (!token || !selectedClassroomId) {
      setStatusMessage("Choose a classroom before posting to the classroom stream.")
      return
    }

    if (!announcementBody.trim()) {
      setStatusMessage("Announcement body is required before posting to the stream.")
      return
    }

    setBusy(true)
    setStatusMessage("Posting the classroom announcement...")

    try {
      const createdAnnouncement = await bootstrap.authClient.createClassroomAnnouncement(
        token,
        selectedClassroomId,
        {
          title: announcementTitle || undefined,
          body: announcementBody,
          visibility: announcementVisibility,
          shouldNotify,
        },
      )

      startTransition(() => {
        setAnnouncements((current) => [createdAnnouncement, ...current].slice(0, 10))
        setAnnouncementTitle("")
        setAnnouncementBody("")
        setStatusMessage(
          `Posted "${createdAnnouncement.title ?? "Untitled announcement"}" to the classroom stream.`,
        )
      })
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Failed to post announcement.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <section style={{ display: "grid", gap: 20 }}>
      <div style={panelStyle}>
        <h2 style={{ marginTop: 0 }}>{bootstrap.pageTitle}</h2>
        <p style={{ marginTop: 0, color: "#475569" }}>
          This teacher/admin console exercises the live classroom stream, roster, join-code, and
          roster-import APIs so later UI phases can focus on richer screens instead of inventing new
          transport flows.
        </p>
        <div style={{ display: "grid", gap: 12 }}>
          <label style={{ display: "grid", gap: 6 }}>
            <span>Teacher or admin bearer token</span>
            <input
              value={token}
              onChange={(event) => setToken(event.target.value)}
              placeholder="Paste a teacher/admin access token"
              style={inputStyle}
            />
          </label>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={loadClassrooms}
              disabled={busy}
              style={primaryButtonStyle}
            >
              {busy ? "Loading..." : "Load classrooms"}
            </button>
            <button
              type="button"
              onClick={loadClassroomHub}
              disabled={busy || !selectedClassroomId}
              style={mutedButtonStyle}
            >
              Load classroom hub
            </button>
          </div>
          <label style={{ display: "grid", gap: 6 }}>
            <span>Selected classroom</span>
            <select
              value={selectedClassroomId}
              onChange={(event) => setSelectedClassroomId(event.target.value)}
              style={inputStyle}
            >
              <option value="">Choose a classroom</option>
              {classrooms.map((classroom) => (
                <option key={classroom.id} value={classroom.id}>
                  {classroom.displayTitle} ({classroom.code})
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {statusMessage ? (
        <div
          style={{
            ...panelStyle,
            borderColor: "#bfdbfe",
            background: "#eff6ff",
            color: "#1d4ed8",
          }}
        >
          {statusMessage}
        </div>
      ) : null}

      <div
        style={{
          display: "grid",
          gap: 20,
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
        }}
      >
        <div style={panelStyle}>
          <h3 style={{ marginTop: 0 }}>Classroom Access</h3>
          <p style={{ color: "#475569" }}>
            Active join code: {joinCode?.code ?? "Load a classroom to see the current join code."}
          </p>
          <p style={{ color: "#64748b" }}>
            Roster members loaded: {roster.length}. Import jobs loaded: {importJobs.length}.
          </p>
          <p style={{ color: "#64748b" }}>
            Jobs awaiting review:{" "}
            {importJobs.filter((job) => job.status === "REVIEW_REQUIRED").length}
          </p>
        </div>
        <div style={panelStyle}>
          <h3 style={{ marginTop: 0 }}>Latest Stream Activity</h3>
          {announcements.length === 0 ? (
            <p style={{ color: "#475569" }}>No classroom announcements loaded yet.</p>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {announcements.slice(0, 3).map((announcement) => (
                <div
                  key={announcement.id}
                  style={{
                    borderRadius: 16,
                    border: "1px solid #dbe4f0",
                    background: "#f8fafc",
                    padding: 14,
                  }}
                >
                  <strong>{announcement.title ?? "Untitled announcement"}</strong>
                  <p style={{ marginBottom: 4, color: "#475569" }}>{announcement.body}</p>
                  <small style={{ color: "#64748b" }}>
                    {announcement.visibility} · notify {announcement.shouldNotify ? "on" : "off"}
                  </small>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={panelStyle}>
        <h3 style={{ marginTop: 0 }}>Post to the Classroom Stream</h3>
        <div style={{ display: "grid", gap: 12 }}>
          <label style={{ display: "grid", gap: 6 }}>
            <span>Announcement title</span>
            <input
              value={announcementTitle}
              onChange={(event) => setAnnouncementTitle(event.target.value)}
              placeholder="Mid-sem quiz reminder"
              style={inputStyle}
            />
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <span>Announcement body</span>
            <textarea
              value={announcementBody}
              onChange={(event) => setAnnouncementBody(event.target.value)}
              placeholder="Paste the classroom stream update here."
              style={{ ...inputStyle, minHeight: 120, resize: "vertical" }}
            />
          </label>
          <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr" }}>
            <label style={{ display: "grid", gap: 6 }}>
              <span>Visibility</span>
              <select
                value={announcementVisibility}
                onChange={(event) =>
                  setAnnouncementVisibility(event.target.value as AnnouncementVisibility)
                }
                style={inputStyle}
              >
                <option value="STUDENT_AND_TEACHER">Student and teacher</option>
                <option value="TEACHER_ONLY">Teacher only</option>
              </select>
            </label>
            <label style={{ display: "flex", gap: 10, alignItems: "center", paddingTop: 28 }}>
              <input
                type="checkbox"
                checked={shouldNotify}
                onChange={(event) => setShouldNotify(event.target.checked)}
              />
              <span>Notify after posting</span>
            </label>
          </div>
          <p style={{ margin: 0, color: "#64748b" }}>{composerHint}</p>
          <div>
            <button
              type="button"
              onClick={postAnnouncement}
              disabled={busy || !selectedClassroomId}
              style={primaryButtonStyle}
            >
              Post announcement
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
