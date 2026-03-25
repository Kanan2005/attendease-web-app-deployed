import { useEffect, useState } from "react"
import { Alert } from "react-native"

import { useRouter } from "expo-router"
import {
  buildTeacherClassroomScopeSummary,
  buildTeacherClassroomSupportingText,
  buildTeacherClassroomUpdateRequest,
  createTeacherClassroomEditDraft,
  hasTeacherClassroomEditChanges,
} from "../teacher-classroom-management"
import { mapTeacherApiErrorToMessage } from "../teacher-models"
import { buildTeacherJoinCodeActionModel } from "../teacher-operational"
import { teacherRoutes } from "../teacher-routes"
import { useTeacherSession } from "../teacher-session"
import { useTeacherClassroomDetailData } from "./queries"
import {
  useTeacherArchiveClassroomMutation,
  useTeacherResetJoinCodeMutation,
  useTeacherUpdateClassroomMutation,
} from "./queries"
import { formatDateTime, formatEnum } from "./shared-ui"
import { TeacherClassroomDetailScreenContent } from "./teacher-classroom-detail-screen-content"

export function TeacherClassroomDetailScreen(props: { classroomId: string }) {
  const { session } = useTeacherSession()
  const router = useRouter()
  const classroom = useTeacherClassroomDetailData(props.classroomId)
  const updateClassroomMutation = useTeacherUpdateClassroomMutation(props.classroomId)
  const archiveClassroomMutation = useTeacherArchiveClassroomMutation(props.classroomId)
  const resetJoinCodeMutation = useTeacherResetJoinCodeMutation(props.classroomId)
  const [isEditingCourseInfo, setIsEditingCourseInfo] = useState(false)
  const [courseInfoDraft, setCourseInfoDraft] = useState<ReturnType<
    typeof createTeacherClassroomEditDraft
  > | null>(null)
  const [joinCodeMessage, setJoinCodeMessage] = useState<string | null>(null)
  const [courseInfoMessage, setCourseInfoMessage] = useState<string | null>(null)

  const classroomContext = teacherRoutes.classroomContext(props.classroomId)
  const classroomDetail = classroom.detailQuery.data ?? null
  const joinCodeAction = buildTeacherJoinCodeActionModel({
    joinCode: classroom.detailQuery.data?.activeJoinCode ?? null,
    isPending: resetJoinCodeMutation.isPending,
  })
  const canEditCourseInfo = classroomDetail?.permissions?.canEditCourseInfo ?? false
  const canArchiveClassroom = classroomDetail?.permissions?.canArchive ?? false
  const canLaunchBluetooth =
    classroomDetail?.status !== "ARCHIVED" && classroomDetail?.status !== "COMPLETED"
  const canRotateJoinCode =
    classroomDetail?.status !== "ARCHIVED" && (classroomDetail?.permissions?.canEdit ?? true)

  useEffect(() => {
    const detailData = classroom.detailQuery.data

    if (!detailData) {
      return
    }

    setCourseInfoDraft(
      (currentDraft) => currentDraft ?? createTeacherClassroomEditDraft(detailData),
    )
  }, [classroom.detailQuery.data])

  const hasCourseChanges =
    classroomDetail && courseInfoDraft
      ? hasTeacherClassroomEditChanges(classroomDetail, courseInfoDraft)
      : false

  const route = {
    bluetoothCreate: classroomContext.bluetoothCreate,
    roster: classroomContext.roster,
    announcements: classroomContext.announcements,
    schedule: classroomContext.schedule,
    lectures: classroomContext.lectures,
  }

  return (
    <TeacherClassroomDetailScreenContent
      hasSession={Boolean(session)}
      isLoading={
        classroom.detailQuery.isLoading ||
        classroom.rosterQuery.isLoading ||
        classroom.scheduleQuery.isLoading ||
        classroom.announcementsQuery.isLoading ||
        classroom.lecturesQuery.isLoading ||
        classroom.rosterImportsQuery.isLoading
      }
      loadErrorMessage={
        (classroom.detailQuery.error ??
        classroom.rosterQuery.error ??
        classroom.scheduleQuery.error ??
        classroom.announcementsQuery.error ??
        classroom.lecturesQuery.error ??
        classroom.rosterImportsQuery.error)
          ? mapTeacherApiErrorToMessage(
              classroom.detailQuery.error ??
                classroom.rosterQuery.error ??
                classroom.scheduleQuery.error ??
                classroom.announcementsQuery.error ??
                classroom.lecturesQuery.error ??
                classroom.rosterImportsQuery.error,
            )
          : null
      }
      detailStatus={{
        tone: "primary",
        title: "Classroom detail loaded",
        message: "Review launch, course, and status in one hub.",
      }}
      classroomTitle={
        classroomDetail?.classroomTitle ?? classroomDetail?.displayTitle ?? "Classroom"
      }
      classroomSubtitle={`${classroomDetail?.courseCode ?? classroomDetail?.code ?? ""} · ${formatEnum(classroomDetail?.status ?? "DRAFT")}`}
      supportingText={classroomDetail ? buildTeacherClassroomSupportingText(classroomDetail) : ""}
      joinCodeLabel={classroomDetail?.activeJoinCode?.code ?? "—"}
      courseCode={classroomDetail?.courseCode ?? classroomDetail?.code ?? "—"}
      joinCodeExpiryLabel={
        classroomDetail?.activeJoinCode?.expiresAt
          ? formatDateTime(classroomDetail.activeJoinCode.expiresAt)
          : joinCodeAction.expiryLabel
      }
      scopeSummary={
        classroomDetail ? buildTeacherClassroomScopeSummary(classroomDetail) : "Classroom"
      }
      defaultAttendanceMode={classroomDetail?.defaultAttendanceMode ?? "QR_GPS"}
      timezone={classroomDetail?.timezone ?? "—"}
      routeLinks={route}
      canLaunchBluetooth={canLaunchBluetooth}
      canRotateJoinCode={canRotateJoinCode}
      canEditCourseInfo={canEditCourseInfo}
      canArchiveClassroom={canArchiveClassroom}
      classroomActions={{
        resetButtonLabel: joinCodeAction.resetButtonLabel,
        helperMessage: joinCodeAction.helperMessage,
        currentCodeLabel: joinCodeAction.currentCodeLabel,
      }}
      isRotateJoinCodePending={resetJoinCodeMutation.isPending}
      rotateJoinCodeError={resetJoinCodeMutation.error}
      joinCodeMessage={joinCodeMessage}
      canSaveCourseInfo={canEditCourseInfo}
      isEditingCourseInfo={isEditingCourseInfo}
      courseInfoDraft={
        courseInfoDraft ??
        (classroomDetail ? createTeacherClassroomEditDraft(classroomDetail) : null)
      }
      hasCourseChanges={hasCourseChanges}
      isCourseInfoSaving={updateClassroomMutation.isPending}
      courseInfoMessage={courseInfoMessage}
      courseInfoError={updateClassroomMutation.error}
      isArchivePending={archiveClassroomMutation.isPending}
      archiveError={archiveClassroomMutation.error}
      isArchived={classroomDetail?.status === "ARCHIVED"}
      rosterCount={classroom.rosterQuery.data?.length ?? 0}
      announcementsCount={classroom.announcementsQuery.data?.length ?? 0}
      lecturesCount={classroom.lecturesQuery.data?.length ?? 0}
      importsCount={classroom.rosterImportsQuery.data?.length ?? 0}
      announcements={
        classroom.announcementsQuery.data?.map((a) => ({
          id: a.id,
          title: a.title ?? "Announcement",
          body: a.body,
          createdAt: a.createdAt,
        })) ?? []
      }
      lectures={
        classroom.lecturesQuery.data?.map((l) => ({
          id: l.id,
          title: l.title ?? "",
          lectureDate: l.lectureDate,
          status: l.status,
        })) ?? []
      }
      onStartEditCourseInfo={() => {
        setCourseInfoMessage(null)
        setIsEditingCourseInfo(true)
      }}
      onCourseInfoDraftTitleChange={(value) =>
        setCourseInfoDraft((currentDraft) =>
          currentDraft ? { ...currentDraft, classroomTitle: value } : currentDraft,
        )
      }
      onCourseInfoDraftCodeChange={(value) =>
        setCourseInfoDraft((currentDraft) =>
          currentDraft ? { ...currentDraft, courseCode: value } : currentDraft,
        )
      }
      onSaveCourseInfo={() => {
        if (!classroomDetail || !courseInfoDraft) {
          return
        }

        setCourseInfoMessage(null)
        updateClassroomMutation.mutate(
          buildTeacherClassroomUpdateRequest(classroomDetail, courseInfoDraft),
          {
            onSuccess: (updated) => {
              setCourseInfoDraft(createTeacherClassroomEditDraft(updated))
              setCourseInfoMessage(`Saved ${updated.classroomTitle ?? updated.displayTitle}.`)
              setIsEditingCourseInfo(false)
            },
          },
        )
      }}
      onCancelCourseInfo={() => {
        if (classroomDetail) {
          setCourseInfoDraft(createTeacherClassroomEditDraft(classroomDetail))
        }
        setCourseInfoMessage(null)
        setIsEditingCourseInfo(false)
      }}
      onRotateJoinCode={() => {
        setJoinCodeMessage(null)
        resetJoinCodeMutation.mutate(undefined, {
          onSuccess: (joinCode) => {
            setJoinCodeMessage(`New join code: ${joinCode.code}`)
          },
        })
      }}
      onClearCourseInfoMessage={() => setCourseInfoMessage(null)}
      onClearJoinCodeMessage={() => setJoinCodeMessage(null)}
      onClearCourseInfoErrorState={() => {}}
      onArchiveClassroom={() => {
        Alert.alert(
          "Archive Classroom",
          "This will remove the classroom from active teaching. Attendance history is preserved.",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Archive",
              style: "destructive",
              onPress: () => {
                setCourseInfoMessage(null)
                archiveClassroomMutation.mutate(undefined, {
                  onSuccess: (archived) => {
                    setCourseInfoDraft(createTeacherClassroomEditDraft(archived))
                    setCourseInfoMessage(
                      `Archived ${archived.classroomTitle ?? archived.displayTitle}.`,
                    )
                    setIsEditingCourseInfo(false)
                  },
                })
              },
            },
          ],
        )
      }}
      onBackToClassrooms={() => router.back()}
    />
  )
}
