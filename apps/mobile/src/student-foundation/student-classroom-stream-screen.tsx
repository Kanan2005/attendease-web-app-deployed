import { View } from "react-native"
import { mapStudentApiErrorToMessage } from "../student-models"
import { studentRoutes } from "../student-routes"
import { useStudentSession } from "../student-session"

import { useStudentClassroomAnnouncementsQuery, useStudentClassroomDetailData } from "./queries"
import {
  AnnouncementRow,
  StudentCard,
  StudentEmptyCard,
  StudentErrorCard,
  StudentLoadingCard,
  StudentNavAction,
  StudentScreen,
  StudentSessionSetupCard,
  styles,
} from "./shared-ui"

export function StudentClassroomStreamScreen(props: { classroomId: string }) {
  const { session } = useStudentSession()
  const classroom = useStudentClassroomDetailData(props.classroomId)
  const streamQuery = useStudentClassroomAnnouncementsQuery(props.classroomId, 20)

  return (
    <StudentScreen title="Classroom Stream" subtitle="Latest updates from your teacher.">
      {!session ? (
        <StudentSessionSetupCard />
      ) : classroom.detailQuery.isLoading || streamQuery.isLoading ? (
        <StudentLoadingCard label="Loading classroom stream" />
      ) : classroom.detailQuery.error || streamQuery.error ? (
        <StudentErrorCard
          label={mapStudentApiErrorToMessage(classroom.detailQuery.error ?? streamQuery.error)}
        />
      ) : (
        <>
          <StudentCard title={classroom.detailQuery.data?.displayTitle ?? "Classroom"}>
            <View style={styles.actionGrid}>
              <StudentNavAction
                href={studentRoutes.classroomDetail(props.classroomId)}
                label="Back To Classroom"
                icon="arrow-back-outline"
              />
              <StudentNavAction
                href={studentRoutes.classroomSchedule(props.classroomId)}
                label="Open Schedule"
                icon="calendar-outline"
              />
            </View>
          </StudentCard>
          {streamQuery.data?.length ? (
            <StudentCard title="Announcement Feed" subtitle="Announcements and class updates.">
              {streamQuery.data.map((announcement) => (
                <AnnouncementRow key={announcement.id} announcement={announcement} />
              ))}
            </StudentCard>
          ) : (
            <StudentEmptyCard label="No announcements yet." />
          )}
        </>
      )}
    </StudentScreen>
  )
}
