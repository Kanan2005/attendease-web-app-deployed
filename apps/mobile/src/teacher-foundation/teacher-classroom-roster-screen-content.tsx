import { mapTeacherApiErrorToMessage } from "../teacher-models"
import {
  TeacherErrorCard,
  TeacherLoadingCard,
  TeacherScreen,
  TeacherSessionSetupCard,
  TeacherStatusBanner,
} from "./shared-ui"
import { TeacherClassroomRosterAddCard } from "./teacher-classroom-roster-add-card"
import { TeacherClassroomRosterBulkCard } from "./teacher-classroom-roster-bulk-card"
import { TeacherClassroomRosterFindCard } from "./teacher-classroom-roster-find-card"
import { TeacherClassroomRosterHeaderCard } from "./teacher-classroom-roster-header-card"
import { TeacherClassroomRosterImportStatusCard } from "./teacher-classroom-roster-import-status-card"
import { TeacherClassroomRosterMembersCard } from "./teacher-classroom-roster-members-card"
import type {
  RosterJobModel,
  RosterMemberActionModel,
  RosterMemberModel,
  RosterRouteLinks,
  TeacherRosterStatusFilter,
} from "./teacher-classroom-roster-screen-models"

export type { TeacherRosterStatusFilter } from "./teacher-classroom-roster-screen-models"

type Props = {
  hasSession: boolean
  isLoading: boolean
  loadErrorMessage: string | null
  rosterStatusBanner: {
    tone: "primary" | "success" | "warning" | "danger"
    title: string
    message: string
  }
  classroomTitle: string
  classroomSummaryText: string
  totalRosterCount: number
  activeRosterCount: number
  pendingRosterCount: number
  blockedRosterCount: number
  routeLinks: RosterRouteLinks
  studentLookup: string
  memberStatus: "ACTIVE" | "PENDING"
  importSourceFileName: string
  importRowsText: string
  invalidImportRows: number
  parsedRowsCount: number
  importPreviewTitle: string
  importPreviewMessage: string
  searchText: string
  statusFilter: TeacherRosterStatusFilter
  statusFilters: readonly TeacherRosterStatusFilter[]
  rosterSummaryText: string
  rosterMessage: string | null
  members: RosterMemberModel[]
  jobs: RosterJobModel[]
  isCreateImportPending: boolean
  isApplyImportPending: boolean
  addMutationError: unknown | null
  updateMutationError: unknown | null
  removeMutationError: unknown | null
  applyImportMutationError: unknown | null
  isAddPending: boolean
  addButtonDisabled: boolean
  isRosterLoading: boolean
  rosterImportLoading: boolean
  onSetStudentLookup: (value: string) => void
  onSetMemberStatus: (status: "ACTIVE" | "PENDING") => void
  onAddStudent: () => void
  onSetSearchText: (value: string) => void
  onSetStatusFilter: (value: TeacherRosterStatusFilter) => void
  onPerformMemberAction: (member: RosterMemberModel, action: RosterMemberActionModel) => void
  onSetImportSourceFileName: (value: string) => void
  onSetImportRows: (value: string) => void
  onCreateImportJob: () => void
  onApplyReviewJob: (jobId: string) => void
  onSetRosterMessage: (value: string | null) => void
  isAddStudentEnabled: boolean
}

export function TeacherClassroomRosterScreenContent(props: Props) {
  if (!props.hasSession) {
    return <TeacherSessionSetupCard />
  }

  if (props.isLoading) {
    return (
      <TeacherScreen
        title="Classroom Roster"
        subtitle="Classroom student membership and enrollment actions."
      >
        <TeacherLoadingCard label="Loading classroom roster" />
      </TeacherScreen>
    )
  }

  if (props.loadErrorMessage) {
    return (
      <TeacherScreen
        title="Classroom Roster"
        subtitle="Classroom student membership and enrollment actions."
      >
        <TeacherErrorCard label={props.loadErrorMessage} />
      </TeacherScreen>
    )
  }

  return (
    <TeacherScreen
      title="Classroom Roster"
      subtitle="Keep students, enrollment state, and course context together from one classroom roster screen."
    >
      <TeacherStatusBanner status={props.rosterStatusBanner} />

      <TeacherClassroomRosterHeaderCard
        classroomTitle={props.classroomTitle}
        classroomSummaryText={props.classroomSummaryText}
        totalRosterCount={props.totalRosterCount}
        activeRosterCount={props.activeRosterCount}
        pendingRosterCount={props.pendingRosterCount}
        blockedRosterCount={props.blockedRosterCount}
        routeLinks={props.routeLinks}
      />

      <TeacherClassroomRosterAddCard
        studentLookup={props.studentLookup}
        memberStatus={props.memberStatus}
        isAddPending={props.isAddPending}
        addButtonDisabled={props.addButtonDisabled}
        addMutationErrorMessage={rosterErrorMessage(props.addMutationError)}
        onSetStudentLookup={props.onSetStudentLookup}
        onSetMemberStatus={props.onSetMemberStatus}
        onAddStudent={props.onAddStudent}
        clearMessage={() => props.onSetRosterMessage(null)}
      />

      <TeacherClassroomRosterFindCard
        searchText={props.searchText}
        statusFilter={props.statusFilter}
        statusFilters={props.statusFilters}
        rosterSummaryText={props.rosterSummaryText}
        onSetSearchText={props.onSetSearchText}
        onSetStatusFilter={props.onSetStatusFilter}
      />

      <TeacherClassroomRosterMembersCard
        members={props.members}
        rosterMessage={props.rosterMessage}
        updateMutationError={props.updateMutationError}
        removeMutationError={props.removeMutationError}
        isAddStudentEnabled={props.isAddStudentEnabled}
        isRosterLoading={props.isRosterLoading}
        onPerformMemberAction={props.onPerformMemberAction}
      />

      <TeacherClassroomRosterBulkCard
        importPreviewTitle={props.importPreviewTitle}
        importPreviewMessage={props.importPreviewMessage}
        importSourceFileName={props.importSourceFileName}
        importRowsText={props.importRowsText}
        parsedRowsCount={props.parsedRowsCount}
        invalidImportRows={props.invalidImportRows}
        isCreateImportPending={props.isCreateImportPending}
        onSetImportSourceFileName={props.onSetImportSourceFileName}
        onSetImportRows={props.onSetImportRows}
        onCreateImportJob={props.onCreateImportJob}
        onSetRosterMessage={props.onSetRosterMessage}
        isAddStudentEnabled={props.isAddStudentEnabled}
        hasSourceAndRows={props.importSourceFileName.trim().length > 0 && props.parsedRowsCount > 0}
      />

      {props.rosterImportLoading ? (
        <TeacherLoadingCard label="Loading roster import status" />
      ) : null}
      <TeacherClassroomRosterImportStatusCard
        jobs={props.jobs}
        isApplyImportPending={props.isApplyImportPending}
        applyImportMutationError={props.applyImportMutationError}
        onApplyReviewJob={props.onApplyReviewJob}
      />
    </TeacherScreen>
  )
}

function rosterErrorMessage(error: unknown): string | null {
  return error ? mapTeacherApiErrorToMessage(error) : null
}
