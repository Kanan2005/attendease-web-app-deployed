import { Injectable } from "@nestjs/common"

export type SessionCounterUpdatedRealtimeEvent = {
  sessionId: string
  presentCount: number
  absentCount: number
  rosterSnapshotCount: number
}

export type SessionStateChangedRealtimeEvent = {
  sessionId: string
  status: "DRAFT" | "ACTIVE" | "ENDED" | "EXPIRED" | "CANCELLED"
  endedAt: string | null
  editableUntil: string | null
}

@Injectable()
export class AttendanceRealtimeService {
  async publishSessionCounterUpdated(_event: SessionCounterUpdatedRealtimeEvent): Promise<void> {
    // Realtime transport wiring lands in the later live-session phase.
  }

  async publishSessionStateChanged(_event: SessionStateChangedRealtimeEvent): Promise<void> {
    // Realtime transport wiring lands in the later live-session phase.
  }
}
