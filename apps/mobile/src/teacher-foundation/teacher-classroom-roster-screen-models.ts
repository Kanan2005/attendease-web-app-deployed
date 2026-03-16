type RoutePath = string | { pathname: string; params?: Record<string, string> }

export type TeacherRosterStatusFilter = "ALL" | "ACTIVE" | "PENDING" | "BLOCKED" | "DROPPED"

export type RosterRouteLinks = {
  detail: RoutePath
  schedule: RoutePath
  announcements: RoutePath
}

export type RosterJobModel = {
  id: string
  fileName: string
  status: string
  appliedRows: number
  totalRows: number
  canApplyReview: boolean
}

export type RosterMemberActionModel = {
  key: string
  label: string
  tone: "secondary" | "danger"
  kind: "REMOVE" | "UPDATE"
  membershipStatus?: string
}

export type RosterMemberModel = {
  id: string
  studentDisplayName: string
  identityText: string
  statusText: string
  joinedAtText: string
  attendanceDisabled: string
  actions: RosterMemberActionModel[]
}
