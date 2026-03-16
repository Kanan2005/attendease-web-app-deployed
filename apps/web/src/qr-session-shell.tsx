"use client"

import { webTheme } from "@attendease/ui-web"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import Link from "next/link"
import QRCode from "qrcode"
import { useEffect, useState } from "react"

import { createWebAuthBootstrap } from "./auth"
import { WebSectionCard } from "./web-shell"
import {
  buildQrSessionLiveModel,
  buildQrSessionRosterModel,
  buildQrSessionShellModel,
  formatPortalDateTime,
  getQrSessionPollInterval,
  qrSessionLiveRefreshIntervalMs,
  teacherWorkflowRoutes,
  webWorkflowQueryKeys,
} from "./web-workflows"

const bootstrap = createWebAuthBootstrap(process.env as Record<string, string | undefined>)

const shellStyles = {
  grid: {
    display: "grid",
    gap: 20,
  },
  hero: {
    borderRadius: 30,
    border: `1px solid ${webTheme.colors.borderStrong}`,
    background:
      "radial-gradient(circle at top left, rgba(234, 91, 42, 0.16), transparent 42%), linear-gradient(180deg, #fffaf2 0%, #f4eadc 100%)",
    padding: 28,
    display: "grid",
    gap: 18,
  },
  projectorHero: {
    borderRadius: 34,
    border: `1px solid ${webTheme.colors.borderStrong}`,
    background:
      "radial-gradient(circle at top left, rgba(234, 91, 42, 0.22), transparent 38%), linear-gradient(180deg, #fff7ee 0%, #efe1d0 100%)",
    padding: 32,
    display: "grid",
    gap: 22,
  },
  heroTopRow: {
    display: "grid",
    gap: 18,
    gridTemplateColumns: "minmax(0, 1.25fr) minmax(280px, 0.75fr)",
    alignItems: "start",
  },
  statPillRow: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap" as const,
    justifyContent: "flex-end",
  },
  statPill: {
    borderRadius: 999,
    padding: "10px 14px",
    border: `1px solid ${webTheme.colors.borderStrong}`,
    background: "rgba(255,255,255,0.9)",
    display: "grid",
    gap: 4,
    minWidth: 132,
  },
  pillLabel: {
    margin: 0,
    color: webTheme.colors.textMuted,
    fontSize: 12,
    fontWeight: 700,
    textTransform: "uppercase" as const,
    letterSpacing: "0.08em",
  },
  pillValue: {
    margin: 0,
    color: webTheme.colors.primary,
    fontSize: 20,
    fontWeight: 800,
  },
  stageGrid: {
    display: "grid",
    gap: 20,
    gridTemplateColumns: "minmax(0, 1.1fr) minmax(320px, 0.9fr)",
    alignItems: "start",
  },
  qrStage: {
    borderRadius: 28,
    border: `1px solid ${webTheme.colors.borderStrong}`,
    background: "linear-gradient(180deg, rgba(255,250,242,0.98) 0%, rgba(244,234,220,0.98) 100%)",
    padding: 24,
    display: "grid",
    gap: 18,
  },
  projectorStage: {
    borderRadius: 40,
    border: `2px solid ${webTheme.colors.borderStrong}`,
    background: "linear-gradient(180deg, rgba(255,250,242,1) 0%, rgba(244,234,220,1) 100%)",
    padding: 36,
    display: "grid",
    gap: 22,
  },
  qrFrame: {
    display: "grid",
    placeItems: "center",
    minHeight: 360,
    borderRadius: 30,
    border: `1px solid ${webTheme.colors.border}`,
    background: webTheme.colors.surfaceRaised,
    padding: 24,
  },
  projectorQrFrame: {
    display: "grid",
    placeItems: "center",
    minHeight: 600,
    borderRadius: 40,
    border: `2px solid ${webTheme.colors.borderStrong}`,
    background: webTheme.colors.surfaceRaised,
    padding: 40,
  },
  qrImage: {
    width: "100%",
    maxWidth: 360,
    aspectRatio: "1 / 1",
    objectFit: "contain" as const,
  },
  projectorQrImage: {
    width: "100%",
    maxWidth: 560,
    aspectRatio: "1 / 1",
    objectFit: "contain" as const,
  },
  actionRow: {
    display: "flex",
    gap: 12,
    flexWrap: "wrap" as const,
  },
  primaryButton: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: webTheme.radius.button,
    border: "none",
    background: webTheme.colors.primary,
    color: webTheme.colors.primaryContrast,
    fontWeight: 700,
    padding: "13px 18px",
    textDecoration: "none",
    cursor: "pointer",
    boxShadow: "0 14px 28px rgba(15, 17, 21, 0.14)",
  },
  secondaryButton: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: webTheme.radius.button,
    border: `1px solid ${webTheme.colors.border}`,
    background: webTheme.colors.surfaceRaised,
    color: webTheme.colors.text,
    fontWeight: 700,
    padding: "13px 18px",
    textDecoration: "none",
    cursor: "pointer",
  },
  dangerButton: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: webTheme.radius.button,
    border: "none",
    background: webTheme.colors.danger,
    color: webTheme.colors.primaryContrast,
    fontWeight: 700,
    padding: "13px 18px",
    cursor: "pointer",
  },
  rosterColumn: {
    display: "grid",
    gap: 20,
  },
  rosterSummaryRow: {
    display: "grid",
    gap: 12,
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  },
  rosterSummaryCard: {
    borderRadius: 18,
    border: `1px solid ${webTheme.colors.border}`,
    background: webTheme.colors.surfaceMuted,
    padding: 16,
  },
  rosterScroll: {
    display: "grid",
    gap: 10,
    maxHeight: 420,
    overflowY: "auto" as const,
    paddingRight: 6,
  },
  rosterItem: {
    borderRadius: 18,
    border: `1px solid ${webTheme.colors.border}`,
    background: webTheme.colors.surfaceRaised,
    padding: 14,
  },
  detailsGrid: {
    display: "grid",
    gap: 14,
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  },
  detailCard: {
    borderRadius: 18,
    border: `1px solid ${webTheme.colors.border}`,
    background: webTheme.colors.surfaceRaised,
    padding: 16,
  },
  projectorFooterGrid: {
    display: "grid",
    gap: 12,
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  },
  metaText: {
    margin: 0,
    color: webTheme.colors.textMuted,
    lineHeight: 1.6,
  },
  statusBanner: {
    borderRadius: 18,
    border: `1px solid ${webTheme.colors.dangerBorder}`,
    background: webTheme.colors.dangerSoft,
    color: webTheme.colors.danger,
    padding: 16,
  },
} as const

export function QrActiveSessionShell(props: {
  accessToken: string | null
  sessionId: string
  projector: boolean
}) {
  const queryClient = useQueryClient()
  const [now, setNow] = useState(() => new Date())
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const shellModel = buildQrSessionShellModel(props)

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
      if (!props.accessToken) {
        throw new Error("Teacher web access is required before ending the QR session.")
      }

      return bootstrap.authClient.endQrAttendanceSession(props.accessToken, props.sessionId)
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: webWorkflowQueryKeys.attendanceSession(props.sessionId),
        }),
        queryClient.invalidateQueries({
          queryKey: webWorkflowQueryKeys.attendanceSessionStudents(props.sessionId),
        }),
        queryClient.invalidateQueries({
          queryKey: webWorkflowQueryKeys.sessionHistory(),
        }),
      ])
    },
  })

  useEffect(() => {
    const ticker = globalThis.setInterval(() => {
      setNow(new Date())
    }, 1_000)

    return () => {
      globalThis.clearInterval(ticker)
    }
  }, [])

  useEffect(() => {
    if (!detailQuery.data?.currentQrPayload) {
      setQrDataUrl(null)
      return
    }

    let cancelled = false

    void QRCode.toDataURL(detailQuery.data.currentQrPayload, {
      margin: 1,
      color: {
        dark: "#0f172a",
        light: "#ffffff",
      },
      width: props.projector ? 720 : 460,
    })
      .then((nextUrl) => {
        if (!cancelled) {
          setQrDataUrl(nextUrl)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setQrDataUrl(null)
        }
      })

    return () => {
      cancelled = true
    }
  }, [props.projector, detailQuery.data?.currentQrPayload])

  const session = detailQuery.data
  const liveModel = session ? buildQrSessionLiveModel(session, now) : null
  const rosterModel = studentsQuery.data ? buildQrSessionRosterModel(studentsQuery.data) : null

  if (!props.accessToken) {
    return (
      <div style={shellStyles.statusBanner}>
        A teacher web session is required before the live QR attendance screen can load.
      </div>
    )
  }

  if (detailQuery.error) {
    return (
      <div style={shellStyles.statusBanner}>
        {detailQuery.error instanceof Error
          ? detailQuery.error.message
          : "The live QR session could not be loaded."}
      </div>
    )
  }

  if (detailQuery.isLoading || !session || !liveModel) {
    return (
      <WebSectionCard
        title={props.projector ? "Loading projector session" : "Loading live QR attendance"}
        description="The teacher web client is loading the live session, timer, and rotating QR state."
      >
        <p style={shellStyles.metaText}>Loading session state...</p>
      </WebSectionCard>
    )
  }

  const classroomSummary = `${session.classroomDisplayTitle} (${session.classroomCode})`
  const scopeSummary = `${session.subjectTitle} · ${session.classCode} ${session.sectionCode}`
  const sessionSummary = session.lectureTitle
    ? `${scopeSummary} · ${session.lectureTitle}`
    : scopeSummary

  return (
    <div style={shellStyles.grid}>
      <section style={props.projector ? shellStyles.projectorHero : shellStyles.hero}>
        <div style={shellStyles.heroTopRow}>
          <div>
            <p
              style={{
                margin: "0 0 10px",
                color: webTheme.colors.accent,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                fontSize: 12,
              }}
            >
              {shellModel.eyebrow}
            </p>
            <h2
              style={{
                margin: "0 0 12px",
                color: webTheme.colors.primary,
                fontSize: props.projector ? 46 : 36,
              }}
            >
              {shellModel.title}
            </h2>
            <p style={{ ...shellStyles.metaText, color: webTheme.colors.text }}>
              {classroomSummary}
            </p>
            <p style={{ ...shellStyles.metaText, marginTop: 6 }}>{sessionSummary}</p>
            <p style={{ ...shellStyles.metaText, marginTop: 10 }}>{shellModel.subtitle}</p>
          </div>

          <div style={shellStyles.statPillRow}>
            <StatPill label="Timer" value={liveModel.countdownLabel} />
            <StatPill label="Marked" value={liveModel.attendanceRatioLabel} />
            <StatPill
              label={props.projector ? "QR refresh" : "Live refresh"}
              value={liveModel.qrRefreshLabel}
            />
          </div>
        </div>
      </section>

      {props.projector ? (
        <section style={shellStyles.projectorStage}>
          <div style={shellStyles.projectorQrFrame}>
            {liveModel.canDisplayQr && qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="Rolling QR code for classroom projection"
                style={shellStyles.projectorQrImage}
              />
            ) : (
              <EmptyQrState message="The session is no longer active, so the rolling QR is hidden." />
            )}
          </div>

          <div style={shellStyles.projectorFooterGrid}>
            <DetailCard label="Session status" value={liveModel.statusLabel} />
            <DetailCard label="Marked now" value={liveModel.liveSummaryLabel} />
            <DetailCard label="QR expires" value={liveModel.qrExpiresLabel} />
          </div>
        </section>
      ) : (
        <>
          <div style={shellStyles.stageGrid}>
            <div style={shellStyles.qrStage}>
              <div style={shellStyles.qrFrame}>
                {liveModel.canDisplayQr && qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt="Rolling QR code for live attendance control"
                    style={shellStyles.qrImage}
                  />
                ) : (
                  <EmptyQrState message="The session is no longer active, so the rolling QR is hidden." />
                )}
              </div>

              <div style={shellStyles.detailsGrid}>
                <DetailCard label="QR expires" value={liveModel.qrExpiresLabel} />
                <DetailCard label="Location rule" value={liveModel.locationRuleLabel} />
                <DetailCard
                  label="Started"
                  value={
                    session.startedAt ? formatPortalDateTime(session.startedAt) : "Not available"
                  }
                />
              </div>

              <div style={shellStyles.actionRow}>
                <Link
                  href={teacherWorkflowRoutes.activeSessionProjector(props.sessionId)}
                  style={shellStyles.primaryButton}
                >
                  Open projector mode
                </Link>
                <Link
                  href={teacherWorkflowRoutes.sessionHistory}
                  style={shellStyles.secondaryButton}
                >
                  Open session history
                </Link>
                <button
                  type="button"
                  onClick={() => endSession.mutate()}
                  disabled={endSession.isPending || session.status !== "ACTIVE"}
                  style={shellStyles.dangerButton}
                >
                  {endSession.isPending ? "Ending session..." : "End session"}
                </button>
              </div>

              {endSession.error ? (
                <div style={shellStyles.statusBanner}>
                  {endSession.error instanceof Error
                    ? endSession.error.message
                    : "Could not end the QR session."}
                </div>
              ) : null}
            </div>

            <div style={shellStyles.rosterColumn}>
              <WebSectionCard
                title="Marked students"
                description="Keep the live roster visible while the class is checking in."
              >
                {studentsQuery.isLoading && !rosterModel ? (
                  <p style={shellStyles.metaText}>Loading live roster...</p>
                ) : studentsQuery.error ? (
                  <div style={shellStyles.statusBanner}>
                    {studentsQuery.error instanceof Error
                      ? studentsQuery.error.message
                      : "Could not load the live student list."}
                  </div>
                ) : rosterModel ? (
                  <div style={shellStyles.grid}>
                    <div style={shellStyles.rosterSummaryRow}>
                      <div style={shellStyles.rosterSummaryCard}>
                        <strong style={{ display: "block", marginBottom: 6 }}>Marked now</strong>
                        <p style={{ margin: 0, color: webTheme.colors.text }}>
                          {rosterModel.presentSummaryLabel}
                        </p>
                        <p style={{ ...shellStyles.metaText, marginTop: 8 }}>
                          {rosterModel.latestMarkedLabel}
                        </p>
                      </div>
                      <div style={shellStyles.rosterSummaryCard}>
                        <strong style={{ display: "block", marginBottom: 6 }}>Still waiting</strong>
                        <p style={{ margin: 0, color: webTheme.colors.text }}>
                          {rosterModel.absentSummaryLabel}
                        </p>
                        <p style={{ ...shellStyles.metaText, marginTop: 8 }}>
                          {liveModel.qrRefreshLabel}
                        </p>
                      </div>
                    </div>

                    {rosterModel.presentRows.length > 0 ? (
                      <div style={shellStyles.rosterScroll}>
                        {rosterModel.presentRows.map((student) => (
                          <div key={student.attendanceRecordId} style={shellStyles.rosterItem}>
                            <strong style={{ display: "block", marginBottom: 4 }}>
                              {student.studentDisplayName}
                            </strong>
                            <p style={{ ...shellStyles.metaText, marginBottom: 4 }}>
                              {student.secondaryLabel}
                            </p>
                            <p style={{ ...shellStyles.metaText, color: webTheme.colors.accent }}>
                              {student.markedAtLabel}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p style={shellStyles.metaText}>
                        No student has marked attendance yet. Keep the QR visible while the class
                        checks in.
                      </p>
                    )}

                    {rosterModel.absentRows.length > 0 ? (
                      <div style={shellStyles.rosterSummaryCard}>
                        <strong style={{ display: "block", marginBottom: 8 }}>Still absent</strong>
                        <p style={shellStyles.metaText}>
                          {rosterModel.absentRows
                            .slice(0, 5)
                            .map((student) => student.studentDisplayName)
                            .join(", ")}
                          {rosterModel.absentRows.length > 5 ? " and more." : "."}
                        </p>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <p style={shellStyles.metaText}>Live roster is not available yet.</p>
                )}
              </WebSectionCard>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function StatPill(props: { label: string; value: string }) {
  return (
    <div style={shellStyles.statPill}>
      <p style={shellStyles.pillLabel}>{props.label}</p>
      <p style={shellStyles.pillValue}>{props.value}</p>
    </div>
  )
}

function DetailCard(props: { label: string; value: string }) {
  return (
    <div style={shellStyles.detailCard}>
      <strong style={{ display: "block", marginBottom: 8 }}>{props.label}</strong>
      <p style={{ margin: 0, color: webTheme.colors.text, lineHeight: 1.6 }}>{props.value}</p>
    </div>
  )
}

function EmptyQrState(props: { message: string }) {
  return (
    <div style={{ textAlign: "center" }}>
      <strong style={{ display: "block", marginBottom: 8 }}>QR not available</strong>
      <p style={shellStyles.metaText}>{props.message}</p>
    </div>
  )
}
