"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import QRCode from "qrcode"
import { useEffect, useState } from "react"

import { createWebAuthBootstrap } from "./auth"
import {
  QrSessionHero,
  QrSessionProjectorHero,
  QrSessionQRStage,
  QrSessionRosterPanel,
} from "./qr-session-shell-components"
import { qrShellStyles } from "./qr-session-shell-styles"
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
      <div style={qrShellStyles.statusBanner}>
        A teacher web session is required before the live QR attendance screen can load.
      </div>
    )
  }

  if (detailQuery.error) {
    return (
      <div style={qrShellStyles.statusBanner}>
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
        <p style={qrShellStyles.metaText}>Loading session state...</p>
      </WebSectionCard>
    )
  }

  const sessionEnded = session.status !== "ACTIVE"
  const projectorMode = props.projector

  return (
    <div style={qrShellStyles.grid}>
      {projectorMode ? (
        <>
          <QrSessionProjectorHero
            model={shellModel}
            session={session}
            liveModel={{
              statusLabel: liveModel.statusLabel,
              liveSummaryLabel: liveModel.liveSummaryLabel,
              qrExpiresLabel: liveModel.qrExpiresLabel,
              qrRefreshLabel: liveModel.qrRefreshLabel,
            }}
            qrDataUrl={qrDataUrl}
            canDisplayQr={liveModel.canDisplayQr}
          />
          <div style={qrShellStyles.projectorStage}>
            <img
              src={qrDataUrl ?? ""}
              alt="Rolling QR code for classroom projection"
              style={{ ...qrShellStyles.projectorQrImage, display: qrDataUrl ? "block" : "none" }}
            />
          </div>
        </>
      ) : (
        <>
          <QrSessionHero
            model={shellModel}
            session={session}
            liveModel={{
              countdownLabel: liveModel.countdownLabel,
              attendanceRatioLabel: liveModel.attendanceRatioLabel,
              qrRefreshLabel: liveModel.qrRefreshLabel,
            }}
          />

          <div style={qrShellStyles.stageGrid}>
            <QrSessionQRStage
              session={session}
              liveModel={{
                statusLabel: liveModel.statusLabel,
                liveSummaryLabel: liveModel.liveSummaryLabel,
                qrExpiresLabel: liveModel.qrExpiresLabel,
                attendanceRatioLabel: liveModel.attendanceRatioLabel,
                countdownLabel: liveModel.countdownLabel,
                qrRefreshLabel: liveModel.qrRefreshLabel,
                locationRuleLabel: liveModel.locationRuleLabel,
              }}
              qrDataUrl={qrDataUrl}
              canDisplayQr={liveModel.canDisplayQr}
              onOpenProjector={teacherWorkflowRoutes.activeSessionProjector(props.sessionId)}
              onOpenHistory={teacherWorkflowRoutes.sessionHistory}
              onEndSession={() => endSession.mutate()}
              isEnding={endSession.isPending}
              sessionEnded={sessionEnded}
              endError={endSession.error instanceof Error ? endSession.error : null}
              formatStartedAt={(value) => (value ? formatPortalDateTime(value) : "Not available")}
            />

            <WebSectionCard
              title="Marked students"
              description="Keep the live roster visible while the class is checking in."
            >
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
            </WebSectionCard>
          </div>
        </>
      )}
    </div>
  )
}
