import { Pressable, Text, View } from "react-native"

import { mapTeacherApiErrorToMessage } from "../teacher-models"
import { formatEnum } from "./shared-ui"
import { TeacherCard, styles } from "./shared-ui"
import type { RosterJobModel } from "./teacher-classroom-roster-screen-models"

type Props = {
  jobs: RosterJobModel[]
  isApplyImportPending: boolean
  applyImportMutationError: unknown | null
  onApplyReviewJob: (jobId: string) => void
}

export function TeacherClassroomRosterImportStatusCard({
  jobs,
  isApplyImportPending,
  applyImportMutationError,
  onApplyReviewJob,
}: Props) {
  if (!jobs.length) {
    return null
  }

  return (
    <TeacherCard title="Roster Import Status" subtitle="Track import progress.">
      {jobs.map((job) => (
        <View key={job.id} style={styles.listRow}>
          <Text style={styles.listTitle}>{job.fileName}</Text>
          <Text style={styles.listMeta}>
            {formatEnum(job.status as never)} · {job.appliedRows}/{job.totalRows} applied
          </Text>
          {job.canApplyReview ? (
            <Pressable
              style={styles.secondaryButton}
              disabled={isApplyImportPending}
              onPress={() => {
                onApplyReviewJob(job.id)
              }}
            >
              <Text style={styles.secondaryButtonLabel}>
                {isApplyImportPending ? "Applying..." : "Apply Reviewed Rows"}
              </Text>
            </Pressable>
          ) : null}
        </View>
      ))}
      {applyImportMutationError ? (
        <Text style={styles.errorText}>
          {mapTeacherApiErrorToMessage(applyImportMutationError)}
        </Text>
      ) : null}
    </TeacherCard>
  )
}
