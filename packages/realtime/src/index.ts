export const realtimeChannels = {
  session: "session",
  exportJob: "export-job",
  analytics: "analytics",
} as const

export function buildSessionChannel(sessionId: string): string {
  return `${realtimeChannels.session}:${sessionId}`
}
