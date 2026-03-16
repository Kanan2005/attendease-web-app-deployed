"use client"

import type { ClassroomSummary, LectureSummary } from "@attendease/contracts"
import { startTransition, useState } from "react"

import {
  buildTeacherAcademicSummary,
  createWebAcademicManagementBootstrap,
} from "./academic-management"

const bootstrap = createWebAcademicManagementBootstrap(
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
  background: "#0f766e",
  color: "#ffffff",
  fontWeight: 600,
  cursor: "pointer",
} as const

export function TeacherAcademicConsole() {
  const [token, setToken] = useState("")
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [classrooms, setClassrooms] = useState<ClassroomSummary[]>([])
  const [selectedClassroomId, setSelectedClassroomId] = useState("")
  const [scheduleSummary, setScheduleSummary] = useState<string>("No schedule loaded yet.")
  const [lectureSummary, setLectureSummary] = useState<string>("No lecture history loaded yet.")
  const [lectures, setLectures] = useState<LectureSummary[]>([])
  const [busy, setBusy] = useState(false)

  const loadClassrooms = async () => {
    if (!token) {
      setStatusMessage("Paste a teacher or admin bearer token before loading classrooms.")
      return
    }

    setBusy(true)
    setStatusMessage("Loading classrooms...")

    try {
      const nextClassrooms = await bootstrap.authClient.listClassrooms(token)

      startTransition(() => {
        setClassrooms(nextClassrooms)
        setSelectedClassroomId(nextClassrooms[0]?.id ?? "")
        setStatusMessage(
          buildTeacherAcademicSummary({
            classroomCount: nextClassrooms.length,
            slotCount: 0,
            exceptionCount: 0,
            lectureCount: 0,
          }),
        )
      })
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Failed to load classrooms.")
    } finally {
      setBusy(false)
    }
  }

  const loadScheduleAndLectures = async () => {
    if (!token || !selectedClassroomId) {
      setStatusMessage("Select a classroom after loading records.")
      return
    }

    setBusy(true)
    setStatusMessage("Loading classroom schedule and lecture data...")

    try {
      const [schedule, lectureRows] = await Promise.all([
        bootstrap.authClient.getClassroomSchedule(token, selectedClassroomId),
        bootstrap.authClient.listClassroomLectures(token, selectedClassroomId),
      ])

      startTransition(() => {
        setLectures(lectureRows)
        setScheduleSummary(
          buildTeacherAcademicSummary({
            classroomCount: classrooms.length || 1,
            slotCount: schedule.scheduleSlots.length,
            exceptionCount: schedule.scheduleExceptions.length,
            lectureCount: lectureRows.length,
          }),
        )
        setLectureSummary(
          lectureRows.length === 0
            ? "No lectures exist yet for the selected classroom."
            : `Latest lecture: ${lectureRows[lectureRows.length - 1]?.title ?? "Untitled lecture"} on ${lectureRows[lectureRows.length - 1]?.lectureDate ?? "unknown date"}.`,
        )
        setStatusMessage("Loaded the classroom calendar and lecture screen data.")
      })
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : "Failed to load schedule and lecture data.",
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <section style={{ display: "grid", gap: 20 }}>
      <div style={panelStyle}>
        <h2 style={{ marginTop: 0 }}>{bootstrap.pageTitle}</h2>
        <p style={{ marginTop: 0, color: "#475569" }}>
          This teacher/admin console is the first web integration point for classroom schedule and
          lecture screens. It loads live classroom, schedule, and lecture data from the backend APIs
          so later UI phases can focus on richer interactions instead of new transport logic.
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
              onClick={loadScheduleAndLectures}
              disabled={busy || !selectedClassroomId}
              style={primaryButtonStyle}
            >
              Load schedule and lectures
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
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
        }}
      >
        <div style={panelStyle}>
          <h3 style={{ marginTop: 0 }}>Schedule Screen</h3>
          <p style={{ color: "#475569" }}>{scheduleSummary}</p>
          <p style={{ color: "#64748b" }}>
            The backend now exposes recurring weekly slots, date exceptions, and save-and-notify
            outbox support for this screen.
          </p>
        </div>
        <div style={panelStyle}>
          <h3 style={{ marginTop: 0 }}>Lecture Screen</h3>
          <p style={{ color: "#475569" }}>{lectureSummary}</p>
          <p style={{ color: "#64748b" }}>
            Loaded lecture rows: {lectures.length}. Future attendance phases can reuse the linked
            lecture ids created from schedule exceptions.
          </p>
        </div>
      </div>
    </section>
  )
}
