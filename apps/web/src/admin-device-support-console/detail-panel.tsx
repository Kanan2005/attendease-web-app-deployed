import type {
  AdminApproveReplacementDeviceRequest,
  AdminDeviceSupportDetail,
} from "@attendease/contracts"
import type { Dispatch, SetStateAction } from "react"

import type {
  AdminDeviceWorkspaceView,
  buildAdminDeviceWorkspaceModel,
} from "../admin-device-support"
import { AdminDeviceActionsSection } from "./actions-section"
import { AdminDeviceBindingsSection } from "./bindings-section"
import { AdminDeviceHistorySections } from "./history-sections"
import { AdminDeviceSupportOverviewSection } from "./overview-section"
import { panelStyle } from "./styles"

export function AdminDeviceSupportDetailPanel(props: {
  detail: AdminDeviceSupportDetail | null
  view: AdminDeviceWorkspaceView
  workspace: ReturnType<typeof buildAdminDeviceWorkspaceModel>
  busy: boolean
  actionReason: string
  setActionReason: Dispatch<SetStateAction<string>>
  highRiskAcknowledged: boolean
  setHighRiskAcknowledged: Dispatch<SetStateAction<boolean>>
  replacementDevice: AdminApproveReplacementDeviceRequest
  setReplacementDevice: Dispatch<SetStateAction<AdminApproveReplacementDeviceRequest>>
  onRevokeBinding: (bindingId: string) => void
  onDelinkStudent: (studentId: string) => void
  onApproveReplacementDevice: (studentId: string) => void
}) {
  return (
    <div style={panelStyle}>
      <h3 style={{ marginTop: 0 }}>{props.workspace.selectedRecordTitle}</h3>
      {!props.detail ? (
        <p style={{ color: "#475569", marginBottom: 0 }}>{props.workspace.emptyDetailMessage}</p>
      ) : (
        <AdminDeviceSupportDetailContent {...props} detail={props.detail} />
      )}
    </div>
  )
}

function AdminDeviceSupportDetailContent(
  props: Omit<Parameters<typeof AdminDeviceSupportDetailPanel>[0], "detail"> & {
    detail: AdminDeviceSupportDetail
  },
) {
  return (
    <div style={{ display: "grid", gap: 18 }}>
      <AdminDeviceSupportOverviewSection detail={props.detail} workspace={props.workspace} />
      <AdminDeviceBindingsSection
        detail={props.detail}
        view={props.view}
        actionReason={props.actionReason}
        highRiskAcknowledged={props.highRiskAcknowledged}
        busy={props.busy}
        onRevokeBinding={props.onRevokeBinding}
      />
      <AdminDeviceHistorySections detail={props.detail} />
      <AdminDeviceActionsSection
        detail={props.detail}
        view={props.view}
        workspace={props.workspace}
        busy={props.busy}
        actionReason={props.actionReason}
        setActionReason={props.setActionReason}
        highRiskAcknowledged={props.highRiskAcknowledged}
        setHighRiskAcknowledged={props.setHighRiskAcknowledged}
        replacementDevice={props.replacementDevice}
        setReplacementDevice={props.setReplacementDevice}
        onDelinkStudent={props.onDelinkStudent}
        onApproveReplacementDevice={props.onApproveReplacementDevice}
      />
    </div>
  )
}
