import { webTheme } from "@attendease/ui-web"
import Link from "next/link"

import type { AttendanceSessionDetail } from "@attendease/contracts"
import type { buildQrSessionShellModel } from "./web-workflows"
import type { QrSessionRosterModel } from "./web-workflows-types"

import { qrShellStyles } from "./qr-session-shell-styles"

interface StatRow {
  label: string
  value: string
}

interface QrLiveCards {
  countdownLabel: string
  attendanceRatioLabel: string
  qrRefreshLabel: string
}

interface QrLiveSessionView {
  statusLabel: string
  liveSummaryLabel: string
  qrExpiresLabel: string
  qrRefreshLabel: string
}

export function QrSessionHero(props: {
  model: ReturnType<typeof buildQrSessionShellModel>
  session: AttendanceSessionDetail
  liveModel: QrLiveCards
}) {
  const session = props.session
  const scopeSummary = `${session.subjectTitle} · ${session.classCode} ${session.sectionCode}`
  const sessionSummary = session.lectureTitle
    ? `${scopeSummary} · ${session.lectureTitle}`
    : scopeSummary

  return (
    <section style={qrShellStyles.hero}>
      <div style={qrShellStyles.heroTopRow}>
        <div>
          <p style={heroMetaStyle}>{props.model.eyebrow}</p>
          <h2 style={{ margin: "0 0 12px", color: webTheme.colors.primary, fontSize: 36 }}>
            {props.model.title}
          </h2>
          <p style={{ ...qrShellStyles.metaText, color: webTheme.colors.text }}>
            {session.classroomDisplayTitle} ({session.classroomCode})
          </p>
          <p style={{ ...qrShellStyles.metaText, marginTop: 6 }}>{sessionSummary}</p>
          <p style={{ ...qrShellStyles.metaText, marginTop: 10 }}>{props.model.subtitle}</p>
        </div>
        <div style={qrShellStyles.statPillRow}>
          <StatPill label="Timer" value={props.liveModel.countdownLabel} />
          <StatPill label="Marked" value={props.liveModel.attendanceRatioLabel} />
          <StatPill label="Live refresh" value={props.liveModel.qrRefreshLabel} />
        </div>
      </div>
    </section>
  )
}

export function QrSessionProjectorHero(props: {
  model: ReturnType<typeof buildQrSessionShellModel>
  session: AttendanceSessionDetail
  liveModel: QrLiveSessionView
  qrDataUrl: string | null
  canDisplayQr: boolean
}) {
  return (
    <section style={qrShellStyles.projectorHero}>
      <div style={qrShellStyles.projectorQrFrame}>
        {props.canDisplayQr && props.qrDataUrl ? (
          <img
            src={props.qrDataUrl}
            alt="Rolling QR code for classroom projection"
            style={qrShellStyles.projectorQrImage}
          />
        ) : (
          <EmptyQrState message="The session is no longer active, so the rolling QR is hidden." />
        )}
      </div>
      <div style={qrShellStyles.projectorFooterGrid}>
        <DetailCard label="Session status" value={props.liveModel.statusLabel} />
        <DetailCard label="Marked now" value={props.liveModel.liveSummaryLabel} />
        <DetailCard label="QR expires" value={props.liveModel.qrExpiresLabel} />
      </div>
    </section>
  )
}

export function QrSessionQRStage(props: {
  session: AttendanceSessionDetail
  liveModel: QrLiveSessionView & QrLiveCards & { locationRuleLabel: string }
  qrDataUrl: string | null
  canDisplayQr: boolean
  onOpenProjector: string
  onOpenHistory: string
  onEndSession: () => void
  isEnding: boolean
  sessionEnded: boolean
  endError?: Error | null
  formatStartedAt: (value: string | null) => string
}) {
  return (
    <div style={qrShellStyles.stageGrid}>
      <div style={qrShellStyles.qrStage}>
        <div style={qrShellStyles.qrFrame}>
          {props.canDisplayQr && props.qrDataUrl ? (
            <img
              src={props.qrDataUrl}
              alt="Rolling QR code for live attendance control"
              style={qrShellStyles.qrImage}
            />
          ) : (
            <EmptyQrState message="The session is no longer active, so the rolling QR is hidden." />
          )}
        </div>

        <div style={qrShellStyles.detailsGrid}>
          <DetailCard label="QR expires" value={props.liveModel.qrExpiresLabel} />
          <DetailCard label="Location rule" value={props.liveModel.locationRuleLabel} />
          <DetailCard label="Started" value={props.formatStartedAt(props.session.startedAt)} />
        </div>

        <div style={qrShellStyles.actionRow}>
          <Link href={props.onOpenProjector} style={qrShellStyles.primaryButton}>
            Open projector mode
          </Link>
          <Link href={props.onOpenHistory} style={qrShellStyles.secondaryButton}>
            Open session history
          </Link>
          <button
            type="button"
            onClick={props.onEndSession}
            disabled={props.isEnding || props.sessionEnded}
            style={qrShellStyles.dangerButton}
          >
            {props.isEnding ? "Ending session..." : "End session"}
          </button>
        </div>

        {props.endError ? (
          <div style={qrShellStyles.statusBanner}>{props.endError.message}</div>
        ) : null}
      </div>
    </div>
  )
}

export function QrSessionRosterPanel(props: {
  rosterModel: QrSessionRosterModel | null
  isLoading: boolean
  error: unknown
  liveModel: QrLiveSessionView
  onRefresh: () => void
  isRefreshing: boolean
}) {
  return (
    <div style={qrShellStyles.rosterColumn}>
      {props.isLoading && !props.rosterModel ? (
        <p style={qrShellStyles.metaText}>Loading live roster...</p>
      ) : null}

      {props.error ? (
        <div style={qrShellStyles.statusBanner}>
          {props.error instanceof Error
            ? props.error.message
            : "Could not load the live student list."}
        </div>
      ) : null}

      {props.rosterModel ? (
        <div style={qrShellStyles.grid}>
          <div style={qrShellStyles.rosterSummaryRow}>
            <div style={qrShellStyles.rosterSummaryCard}>
              <strong style={{ display: "block", marginBottom: 6 }}>Marked now</strong>
              <p style={{ margin: 0, color: webTheme.colors.text }}>
                {props.rosterModel.presentSummaryLabel}
              </p>
              <p style={{ ...qrShellStyles.metaText, marginTop: 8 }}>
                {props.liveModel.liveSummaryLabel}
              </p>
            </div>
            <div style={qrShellStyles.rosterSummaryCard}>
              <strong style={{ display: "block", marginBottom: 6 }}>Still waiting</strong>
              <p style={{ margin: 0, color: webTheme.colors.text }}>
                {props.rosterModel.absentSummaryLabel}
              </p>
              <p style={{ ...qrShellStyles.metaText, marginTop: 8 }}>
                {props.liveModel.qrRefreshLabel}
              </p>
            </div>
          </div>

          {props.rosterModel.presentRows.length > 0 ? (
            <div style={qrShellStyles.rosterScroll}>
              {props.rosterModel.presentRows.map((student) => (
                <div key={student.attendanceRecordId} style={qrShellStyles.rosterItem}>
                  <strong style={{ display: "block", marginBottom: 4 }}>
                    {student.studentDisplayName}
                  </strong>
                  <p style={{ ...qrShellStyles.metaText, marginBottom: 4 }}>
                    {student.secondaryLabel}
                  </p>
                  <p style={{ ...qrShellStyles.metaText, color: webTheme.colors.accent }}>
                    {student.markedAtLabel}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p style={qrShellStyles.metaText}>No student has marked attendance yet.</p>
          )}

          {props.rosterModel.absentRows.length > 0 ? (
            <div style={qrShellStyles.rosterSummaryCard}>
              <strong style={{ display: "block", marginBottom: 8 }}>Still absent</strong>
              <p style={qrShellStyles.metaText}>
                {props.rosterModel.absentRows
                  .slice(0, 5)
                  .map((student) => student.studentDisplayName)
                  .join(", ")}
                {props.rosterModel.absentRows.length > 5 ? " and more." : "."}
              </p>
            </div>
          ) : null}
        </div>
      ) : (
        <p style={qrShellStyles.metaText}>Live roster is not available yet.</p>
      )}
    </div>
  )
}

export function StatPill(props: StatRow) {
  return (
    <div style={qrShellStyles.statPill}>
      <p style={qrShellStyles.pillLabel}>{props.label}</p>
      <p style={qrShellStyles.pillValue}>{props.value}</p>
    </div>
  )
}

export function DetailCard(props: { label: string; value: string }) {
  return (
    <div style={qrShellStyles.detailCard}>
      <strong style={{ display: "block", marginBottom: 8 }}>{props.label}</strong>
      <p style={{ margin: 0, color: webTheme.colors.text, lineHeight: 1.6 }}>{props.value}</p>
    </div>
  )
}

export function EmptyQrState(props: { message: string }) {
  return (
    <div style={{ textAlign: "center" }}>
      <strong style={{ display: "block", marginBottom: 8 }}>QR not available</strong>
      <p style={qrShellStyles.metaText}>{props.message}</p>
    </div>
  )
}

const heroMetaStyle: React.CSSProperties = {
  margin: "0 0 10px",
  color: webTheme.colors.accent,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  fontSize: 12,
}
