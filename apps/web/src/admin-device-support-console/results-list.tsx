import type { AdminDeviceSupportSummary } from "@attendease/contracts"

import type { buildAdminDeviceWorkspaceModel } from "../admin-device-support"
import { AdminRecoveryListCard } from "./shared"
import { panelStyle } from "./styles"

export function AdminDeviceSupportResultsList(props: {
  workspace: ReturnType<typeof buildAdminDeviceWorkspaceModel>
  records: AdminDeviceSupportSummary[]
  onSelect: (studentId: string) => void
}) {
  return (
    <div style={panelStyle}>
      <h3 style={{ marginTop: 0 }}>Matching students</h3>
      {props.records.length === 0 ? (
        <p style={{ color: "#475569", marginBottom: 0 }}>{props.workspace.emptyResultsMessage}</p>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {props.records.map((record) => (
            <AdminRecoveryListCard
              key={record.student.id}
              record={record}
              onSelect={() => props.onSelect(record.student.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
