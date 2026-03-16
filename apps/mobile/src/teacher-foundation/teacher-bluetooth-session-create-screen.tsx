import { useQueryClient } from "@tanstack/react-query"
import { useRouter } from "expo-router"
import { useEffect, useState } from "react"

import { useTeacherBluetoothSessionCreateMutation } from "../bluetooth-attendance-hooks"
import {
  buildTeacherBluetoothSessionShellSnapshot,
  buildTeacherBluetoothSetupStatusModel,
} from "../teacher-operational"
import { invalidateTeacherExperienceQueries, teacherQueryKeys } from "../teacher-query"
import { teacherRoutes } from "../teacher-routes"
import { useTeacherSession } from "../teacher-session"
import { useTeacherBluetoothCandidates } from "./queries-classrooms"
import { clampInteger } from "./shared-ui"
import { TeacherBluetoothSessionCreateScreenContent } from "./teacher-bluetooth-session-create-screen-content"

export function TeacherBluetoothSessionCreateScreen(props: { preselectedClassroomId?: string }) {
  const { session } = useTeacherSession()
  const router = useRouter()
  const queryClient = useQueryClient()
  const bluetooth = useTeacherBluetoothCandidates()
  const createSessionMutation = useTeacherBluetoothSessionCreateMutation()
  const initialCandidateId =
    bluetooth.candidates.find(
      (candidate: { classroomId: string; sessionId: string }) =>
        candidate.classroomId === props.preselectedClassroomId,
    )?.sessionId ??
    bluetooth.candidates[0]?.sessionId ??
    ""
  const [selectedSessionId, setSelectedSessionId] = useState(initialCandidateId)
  const selectedCandidate =
    bluetooth.candidates.find(
      (candidate: { sessionId: string }) => candidate.sessionId === selectedSessionId,
    ) ?? null
  const selectedCandidateSessionId = selectedCandidate?.sessionId ?? ""
  const selectedCandidateDurationMinutes = selectedCandidate?.durationMinutes ?? 50
  const [durationMinutes, setDurationMinutes] = useState(
    selectedCandidate ? String(selectedCandidate.durationMinutes) : "50",
  )
  const sessionShell = buildTeacherBluetoothSessionShellSnapshot({
    candidate: selectedCandidate
      ? {
          ...selectedCandidate,
          durationMinutes: clampInteger(durationMinutes, selectedCandidate.durationMinutes, 1, 480),
        }
      : null,
    advertiserState: "READY",
  })
  const normalizedDurationMinutes = clampInteger(
    durationMinutes,
    selectedCandidateDurationMinutes,
    1,
    480,
  )
  const setupStatus = buildTeacherBluetoothSetupStatusModel({
    candidate: selectedCandidate,
    durationMinutes: normalizedDurationMinutes,
    isCreating: createSessionMutation.isPending,
    errorMessage: createSessionMutation.error
      ? (createSessionMutation.error as Error).message
      : null,
  })
  const quickBackLink = selectedCandidate
    ? teacherRoutes.classroomDetail(selectedCandidate.classroomId)
    : teacherRoutes.classrooms
  const quickBackLabel = selectedCandidate ? "Back To Course" : "Classrooms"

  useEffect(() => {
    if (!selectedSessionId && initialCandidateId) {
      setSelectedSessionId(initialCandidateId)
    }
  }, [initialCandidateId, selectedSessionId])

  useEffect(() => {
    if (selectedCandidateSessionId) {
      setDurationMinutes(String(selectedCandidateDurationMinutes))
    }
  }, [selectedCandidateDurationMinutes, selectedCandidateSessionId])

  return (
    <TeacherBluetoothSessionCreateScreenContent
      session={session}
      bluetooth={bluetooth}
      selectedSessionId={selectedSessionId}
      selectedCandidate={selectedCandidate}
      sessionShell={sessionShell}
      setupStatus={setupStatus}
      durationMinutes={durationMinutes}
      normalizedDurationMinutes={normalizedDurationMinutes}
      quickBackLink={quickBackLink}
      quickBackLabel={quickBackLabel}
      createSessionMutation={createSessionMutation}
      onSelectSession={setSelectedSessionId}
      onSetDurationMinutes={setDurationMinutes}
      onStartSession={async () => {
        if (!selectedCandidate) {
          return
        }

        const created = await createSessionMutation.mutateAsync({
          classroomId: selectedCandidate.classroomId,
          ...(selectedCandidate.lectureId ? { lectureId: selectedCandidate.lectureId } : {}),
          sessionDurationMinutes: normalizedDurationMinutes,
        })

        queryClient.setQueryData(teacherQueryKeys.bluetoothRuntime(created.session.id), created)
        await invalidateTeacherExperienceQueries(queryClient, {
          classroomId: created.session.classroomId,
          sessionId: created.session.id,
        })
        router.push(
          teacherRoutes.bluetoothActive({
            sessionId: created.session.id,
            classroomId: created.session.classroomId,
            classroomTitle: selectedCandidate.classroomTitle,
            lectureTitle: selectedCandidate.lectureTitle,
            durationMinutes: String(normalizedDurationMinutes),
            rotationWindowSeconds: String(
              created.session.bluetoothRotationWindowSeconds ??
                selectedCandidate.bluetoothRotationWindowSeconds,
            ),
          }) as never,
        )
      }}
    />
  )
}
