import { webTheme } from "@attendease/ui-web"

import type { AttendanceSessionDetail } from "@attendease/contracts"
import type { buildQrSessionShellModel } from "./web-workflows"
import type { QrSessionRosterModel } from "./web-workflows-types"

import { qrShellStyles } from "./qr-session-shell-styles"

interface StatRow {
  label: string
  value: string
}

interface QrLiveSessionView {
  statusLabel: string
  liveSummaryLabel: string
  qrExpiresLabel: string
  qrRefreshLabel: string
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
          <EmptyQrState message="Session is no longer active." />
        )}
      </div>
      <div style={qrShellStyles.projectorFooterGrid}>
        <DetailCard label="Status" value={props.liveModel.statusLabel} />
        <DetailCard label="Marked" value={props.liveModel.liveSummaryLabel} />
        <DetailCard label="QR expires" value={props.liveModel.qrExpiresLabel} />
      </div>
    </section>
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
  if (props.isLoading && !props.rosterModel) {
    return <p style={qrShellStyles.metaText}>Loading roster...</p>
  }

  if (props.error) {
    return (
      <div style={qrShellStyles.statusBanner}>
        {props.error instanceof Error ? props.error.message : "Could not load roster."}
      </div>
    )
  }

  if (!props.rosterModel) {
    return <p style={qrShellStyles.metaText}>Roster not available yet.</p>
  }

  return (
    <div style={qrShellStyles.rosterColumn}>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 4 }}>
        <button
          type="button"
          onClick={props.onRefresh}
          disabled={props.isRefreshing}
          aria-label="Refresh roster"
          className="ui-secondary-btn"
          style={{
            background: "transparent",
            border: `1px solid ${webTheme.colors.border}`,
            borderRadius: 8,
            padding: "4px 12px",
            fontSize: 12,
            fontWeight: 600,
            color: webTheme.colors.textMuted,
            cursor: props.isRefreshing ? "not-allowed" : "pointer",
          }}
        >
          {props.isRefreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>
      <div style={qrShellStyles.rosterSummaryRow}>
        <div style={qrShellStyles.rosterSummaryCard}>
          <p
            style={{
              margin: 0,
              fontSize: 11,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: webTheme.colors.textSubtle,
            }}
          >
            Present
          </p>
          <p
            style={{
              margin: "4px 0 0",
              fontSize: 22,
              fontWeight: 700,
              color: webTheme.colors.success,
            }}
          >
            {props.rosterModel.presentRows.length}
          </p>
        </div>
        <div style={qrShellStyles.rosterSummaryCard}>
          <p
            style={{
              margin: 0,
              fontSize: 11,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: webTheme.colors.textSubtle,
            }}
          >
            Absent
          </p>
          <p
            style={{
              margin: "4px 0 0",
              fontSize: 22,
              fontWeight: 700,
              color: webTheme.colors.danger,
            }}
          >
            {props.rosterModel.absentRows.length}
          </p>
        </div>
      </div>

      {props.rosterModel.presentRows.length > 0 ? (
        <div style={qrShellStyles.rosterScroll}>
          {props.rosterModel.presentRows.map((student) => (
            <div
              key={student.attendanceRecordId}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "10px 14px",
                borderRadius: 10,
                border: `1px solid ${webTheme.colors.border}`,
                background: webTheme.colors.surfaceTint,
              }}
            >
              <div style={{ minWidth: 0 }}>
                <p
                  style={{ margin: 0, fontSize: 13, fontWeight: 600, color: webTheme.colors.text }}
                >
                  {student.studentDisplayName}
                </p>
                <p style={{ margin: "2px 0 0", fontSize: 11, color: webTheme.colors.textMuted }}>
                  {student.secondaryLabel}
                </p>
              </div>
              <span
                style={{
                  fontSize: 11,
                  color: webTheme.colors.accent,
                  fontWeight: 600,
                  flexShrink: 0,
                  marginLeft: 8,
                }}
              >
                {student.markedAtLabel}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p style={{ ...qrShellStyles.metaText, padding: "16px 0", textAlign: "center" }}>
          No students marked yet.
        </p>
      )}

      {props.rosterModel.absentRows.length > 0 ? (
        <div
          style={{
            ...qrShellStyles.rosterSummaryCard,
            background: webTheme.colors.dangerSoft,
            borderColor: webTheme.colors.dangerBorder,
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 11,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: webTheme.colors.danger,
            }}
          >
            Still absent
          </p>
          <p
            style={{
              margin: "6px 0 0",
              fontSize: 13,
              color: webTheme.colors.text,
              lineHeight: 1.5,
            }}
          >
            {props.rosterModel.absentRows
              .slice(0, 8)
              .map((s) => s.studentDisplayName)
              .join(", ")}
            {props.rosterModel.absentRows.length > 8
              ? ` +${props.rosterModel.absentRows.length - 8} more`
              : ""}
          </p>
        </div>
      ) : null}
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
      <p
        style={{
          margin: 0,
          fontSize: 11,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          color: webTheme.colors.textSubtle,
        }}
      >
        {props.label}
      </p>
      <p style={{ margin: "6px 0 0", color: webTheme.colors.text, fontSize: 14, lineHeight: 1.4 }}>
        {props.value}
      </p>
    </div>
  )
}

export function EmptyQrState(props: { message: string }) {
  return (
    <div style={{ textAlign: "center", padding: 24 }}>
      <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: webTheme.colors.textMuted }}>
        QR not available
      </p>
      <p style={{ margin: "4px 0 0", fontSize: 12, color: webTheme.colors.textSubtle }}>
        {props.message}
      </p>
    </div>
  )
}
