"use client"

import { webTheme } from "@attendease/ui-web"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import Link from "next/link"
import { useRouter } from "next/navigation"
import QRCode from "qrcode"
import { useEffect, useState } from "react"

import { createWebAuthBootstrap } from "./auth"
import {
  QrSessionRosterPanel,
  StatPill,
} from "./qr-session-shell-components"
import { qrShellStyles } from "./qr-session-shell-styles"
import {
  buildQrSessionLiveModel,
  buildQrSessionRosterModel,
  getQrSessionPollInterval,
  qrSessionLiveRefreshIntervalMs,
  teacherWorkflowRoutes,
  webWorkflowQueryKeys,
} from "./web-workflows"

const bootstrap = createWebAuthBootstrap(process.env as Record<string, string | undefined>)

export function QrActiveSessionShell(props: {
  accessToken: string | null
  sessionId: string
  projector: boolean
}) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [now, setNow] = useState(() => new Date())
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [confirmEnd, setConfirmEnd] = useState(false)

  const detailQuery = useQuery({
    queryKey: webWorkflowQueryKeys.attendanceSession(props.sessionId),
    enabled: Boolean(props.accessToken),
    queryFn: () =>
      bootstrap.authClient.getAttendanceSessionDetail(props.accessToken ?? "", props.sessionId),
    refetchInterval(query) {
      return getQrSessionPollInterval(query.state.data ?? null)
    },
  })

  const studentsQuery = useQuery({
    queryKey: webWorkflowQueryKeys.attendanceSessionStudents(props.sessionId),
    enabled: Boolean(props.accessToken),
    queryFn: () =>
      bootstrap.authClient.listAttendanceSessionStudents(props.accessToken ?? "", props.sessionId),
    refetchInterval: detailQuery.data?.status === "ACTIVE" ? qrSessionLiveRefreshIntervalMs : false,
  })

  const endSession = useMutation({
    mutationFn: async () => {
      if (!props.accessToken) throw new Error("Sign in required.")
      return bootstrap.authClient.endQrAttendanceSession(props.accessToken, props.sessionId)
    },
    onSuccess: async (_, __, ___) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: webWorkflowQueryKeys.attendanceSession(props.sessionId) }),
        queryClient.invalidateQueries({ queryKey: webWorkflowQueryKeys.attendanceSessionStudents(props.sessionId) }),
        queryClient.invalidateQueries({ queryKey: webWorkflowQueryKeys.sessionHistory() }),
      ])
      const sessionData = queryClient.getQueryData<{ classroomId?: string; lectureId?: string | null }>(
        webWorkflowQueryKeys.attendanceSession(props.sessionId),
      )
      if (sessionData?.classroomId && sessionData.lectureId) {
        router.push(teacherWorkflowRoutes.lectureSession(sessionData.classroomId, sessionData.lectureId))
      } else if (sessionData?.classroomId) {
        router.push(teacherWorkflowRoutes.classroomLectures(sessionData.classroomId))
      }
    },
  })

  useEffect(() => {
    const ticker = globalThis.setInterval(() => setNow(new Date()), 1_000)
    return () => globalThis.clearInterval(ticker)
  }, [])

  useEffect(() => {
    if (!detailQuery.data?.currentQrPayload) {
      setQrDataUrl(null)
      return
    }
    let cancelled = false
    void QRCode.toDataURL(detailQuery.data.currentQrPayload, {
      margin: 2,
      color: { dark: "#09090B", light: "#ffffff" },
      width: 400,
    })
      .then((url) => { if (!cancelled) setQrDataUrl(url) })
      .catch(() => { if (!cancelled) setQrDataUrl(null) })
    return () => { cancelled = true }
  }, [props.projector, detailQuery.data?.currentQrPayload])

  const session = detailQuery.data
  const liveModel = session ? buildQrSessionLiveModel(session, now) : null
  const rosterModel = studentsQuery.data ? buildQrSessionRosterModel(studentsQuery.data) : null

  if (!props.accessToken) {
    return <div style={qrShellStyles.statusBanner}>Sign in to view the live attendance session.</div>
  }
  if (detailQuery.error) {
    return (
      <div style={qrShellStyles.statusBanner}>
        {detailQuery.error instanceof Error ? detailQuery.error.message : "Could not load session."}
      </div>
    )
  }
  if (detailQuery.isLoading || !session || !liveModel) {
    return (
      <div style={{ textAlign: "center", padding: "80px 24px", color: webTheme.colors.textMuted }}>
        <div className="skeleton" style={{ width: 48, height: 48, borderRadius: 14, margin: "0 auto 16px" }} />
        <p style={{ fontSize: 15, fontWeight: 500 }}>Loading live session...</p>
      </div>
    )
  }

  const sessionEnded = session.status !== "ACTIVE"
  const projectorMode = props.projector

  if (projectorMode) {
    const projScopeLabel = session.lectureTitle
      ? `${session.classroomDisplayTitle} · ${session.lectureTitle}`
      : session.classroomDisplayTitle

    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100vh", padding: 16, gap: 12, boxSizing: "border-box" }}>
        {/* Compact header */}
        <div style={qrShellStyles.projectorHero}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
            <Link
              href={teacherWorkflowRoutes.activeSession(props.sessionId)}
              className="ui-back-link"
              style={{ fontSize: 13, color: webTheme.colors.textMuted, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4, flexShrink: 0 }}
            >
              <span aria-hidden>←</span> Exit projector
            </Link>
            <div style={{ minWidth: 0 }}>
              <p style={{ margin: "0 0 2px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: webTheme.colors.accent }}>
                Live attendance
              </p>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: webTheme.colors.text, letterSpacing: "-0.02em" }}>
                {projScopeLabel}
              </h2>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <StatPill label="Marked" value={liveModel.liveSummaryLabel} />
            <StatPill label="QR refresh" value={liveModel.qrRefreshLabel} />
            {confirmEnd ? (
              <>
                <span style={{ fontSize: 13, color: webTheme.colors.danger, fontWeight: 600 }}>End session?</span>
                <button
                  type="button"
                  onClick={() => { endSession.mutate(); setConfirmEnd(false) }}
                  disabled={endSession.isPending}
                  style={{ ...qrShellStyles.dangerButton, padding: "10px 20px" }}
                >
                  {endSession.isPending ? "Ending..." : "Confirm"}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmEnd(false)}
                  className="ui-secondary-btn"
                  style={{ padding: "10px 16px", border: `1px solid ${webTheme.colors.border}`, borderRadius: 10, background: webTheme.colors.surfaceRaised, color: webTheme.colors.text, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmEnd(true)}
                disabled={sessionEnded || endSession.isPending}
                aria-label="End attendance session"
                style={{ ...qrShellStyles.dangerButton, padding: "10px 20px" }}
              >
                End session
              </button>
            )}
          </div>
        </div>

        {/* Full-height QR */}
        <div style={qrShellStyles.projectorQrFrame}>
          {liveModel.canDisplayQr && qrDataUrl ? (
            <img src={qrDataUrl} alt="Rolling QR code for classroom projection" style={qrShellStyles.projectorQrImage} />
          ) : (
            <div style={{ textAlign: "center", padding: 32 }}>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 600, color: webTheme.colors.textMuted }}>QR not available</p>
              <p style={{ margin: "4px 0 0", fontSize: 13, color: webTheme.colors.textSubtle }}>Session may have ended.</p>
            </div>
          )}
        </div>

        {endSession.error instanceof Error ? (
          <div style={{ ...qrShellStyles.statusBanner, flexShrink: 0 }}>{endSession.error.message}</div>
        ) : null}
      </div>
    )
  }

  const scopeLabel = session.lectureTitle
    ? `${session.classroomDisplayTitle} · ${session.lectureTitle}`
    : session.classroomDisplayTitle

  const sessionBackHref = session.lectureId && session.classroomId
    ? teacherWorkflowRoutes.lectureSession(session.classroomId, session.lectureId)
    : session.classroomId
      ? teacherWorkflowRoutes.classroomLectures(session.classroomId)
      : teacherWorkflowRoutes.classrooms

  return (
    <div style={qrShellStyles.grid}>
      {/* Back link */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <Link
          href={sessionBackHref}
          className="ui-back-link"
          style={{ fontSize: 13, color: webTheme.colors.textMuted, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}
        >
          <span aria-hidden>←</span> Back to session
        </Link>
      </div>

      {/* Top status bar */}
      <div style={qrShellStyles.hero}>
        <div style={{ minWidth: 0 }}>
          <p style={{ margin: "0 0 2px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: webTheme.colors.accent }}>
            Live attendance
          </p>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: webTheme.colors.text, letterSpacing: "-0.02em" }}>
            {scopeLabel}
          </h2>
        </div>
        <div style={qrShellStyles.statPillRow}>
          <StatPill label="Elapsed" value={liveModel.countdownLabel} />
          <StatPill label="Marked" value={liveModel.attendanceRatioLabel} />
          <StatPill label="QR refresh" value={`${qrSessionLiveRefreshIntervalMs / 1000}s`} />
        </div>
      </div>

      {/* Main content: QR + sidebar */}
      <div style={qrShellStyles.stageGrid}>
        {/* QR column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, minHeight: 0 }}>
          <div style={qrShellStyles.qrFrame}>
            {liveModel.canDisplayQr && qrDataUrl ? (
              <img src={qrDataUrl} alt="Live QR code" style={qrShellStyles.qrImage} />
            ) : (
              <div style={{ textAlign: "center", padding: 32, color: webTheme.colors.textSubtle }}>
                <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: webTheme.colors.textMuted }}>QR not available</p>
                <p style={{ margin: "4px 0 0", fontSize: 13, color: webTheme.colors.textSubtle }}>Session may have ended.</p>
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexShrink: 0 }}>
            <Link href={teacherWorkflowRoutes.activeSessionProjector(props.sessionId)} className="ui-secondary-btn" style={qrShellStyles.secondaryButton}>
              Projector mode
            </Link>
            {confirmEnd ? (
              <>
                <span style={{ fontSize: 13, color: webTheme.colors.danger, fontWeight: 600 }}>End session?</span>
                <button
                  type="button"
                  onClick={() => { endSession.mutate(); setConfirmEnd(false) }}
                  disabled={endSession.isPending}
                  style={{ ...qrShellStyles.dangerButton, padding: "12px 28px" }}
                >
                  {endSession.isPending ? "Ending..." : "Confirm"}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmEnd(false)}
                  className="ui-secondary-btn"
                  style={{ padding: "10px 16px", border: `1px solid ${webTheme.colors.border}`, borderRadius: 10, background: webTheme.colors.surfaceRaised, color: webTheme.colors.text, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmEnd(true)}
                disabled={sessionEnded || endSession.isPending}
                aria-label="End attendance session"
                style={{ ...qrShellStyles.dangerButton, padding: "12px 28px" }}
              >
                End session
              </button>
            )}
          </div>

          {endSession.error instanceof Error ? (
            <div style={{ ...qrShellStyles.statusBanner, flexShrink: 0 }}>{endSession.error.message}</div>
          ) : null}
        </div>

        {/* Roster sidebar */}
        <div
          style={{
            borderRadius: webTheme.radius.card,
            border: `1px solid ${webTheme.colors.border}`,
            background: webTheme.colors.surfaceRaised,
            padding: 16,
            display: "flex",
            flexDirection: "column",
            gap: 12,
            minHeight: 0,
            overflow: "hidden",
          }}
        >
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: webTheme.colors.text, flexShrink: 0 }}>
            Live roster
          </h3>
          <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
            <QrSessionRosterPanel
              rosterModel={rosterModel}
              isLoading={studentsQuery.isLoading}
              error={studentsQuery.error}
              liveModel={{
                statusLabel: liveModel.statusLabel,
                liveSummaryLabel: liveModel.liveSummaryLabel,
                qrExpiresLabel: liveModel.qrExpiresLabel,
                qrRefreshLabel: liveModel.qrRefreshLabel,
              }}
              onRefresh={() => studentsQuery.refetch()}
              isRefreshing={studentsQuery.isRefetching}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
