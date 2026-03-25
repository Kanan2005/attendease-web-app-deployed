import { useRouter } from "expo-router"
import type { Dispatch, SetStateAction } from "react"
import { Pressable, Text, TextInput, View } from "react-native"

import type { ClassroomSummary, CreateClassroomRequest } from "@attendease/contracts"
import type { TeacherClassroomCreateDraft } from "../teacher-classroom-management"
import {
  buildTeacherClassroomCreateRequest,
  createTeacherClassroomCreateDraft,
} from "../teacher-classroom-management"
import type { buildTeacherClassroomScopeOptions } from "../teacher-classroom-management"
import { mapTeacherApiErrorToMessage } from "../teacher-models"
import { teacherRoutes } from "../teacher-routes"
import { TeacherCard, TeacherEmptyCard, TeacherNavAction, styles } from "./shared-ui"

type ScopeOption = ReturnType<typeof buildTeacherClassroomScopeOptions>[number]
type ClassroomCreateDraft = TeacherClassroomCreateDraft

type TeacherClassroomCreateCardProps = {
  canCreateClassroom: boolean
  isCreateOpen: boolean
  createMessage: string | null
  createScopeOptions: ScopeOption[]
  createDraft: ClassroomCreateDraft
  setCreateMessage: (value: string | null) => void
  setIsCreateOpen: (updater: SetStateAction<boolean>) => void
  setCreateDraft: Dispatch<SetStateAction<ClassroomCreateDraft>>
  createClassroomMutation: {
    isPending: boolean
    error: unknown
    mutate: (
      variables: CreateClassroomRequest,
      options?: {
        onSuccess?: (created: ClassroomSummary) => void
      },
    ) => void
  }
}

export function TeacherClassroomsCreateCard({
  canCreateClassroom,
  isCreateOpen,
  createMessage,
  createScopeOptions,
  createDraft,
  setCreateMessage,
  setIsCreateOpen,
  setCreateDraft,
  createClassroomMutation,
}: TeacherClassroomCreateCardProps) {
  const router = useRouter()

  return (
    <>
      <TeacherCard title="Manage Classrooms" subtitle="Create or manage classrooms.">
        <View style={styles.actionGrid}>
          {canCreateClassroom ? (
            <Pressable
              style={styles.primaryButton}
              onPress={() => {
                setCreateMessage(null)
                setIsCreateOpen((current) => !current)
              }}
            >
              <Text style={styles.primaryButtonLabel}>
                {isCreateOpen ? "Close Create" : "Create Classroom"}
              </Text>
            </Pressable>
          ) : null}
          <TeacherNavAction href={teacherRoutes.home} label="Teacher Home" icon="home-outline" />
        </View>
        {createMessage ? <Text style={styles.successText}>{createMessage}</Text> : null}
        {!canCreateClassroom ? (
          <Text style={styles.listMeta}>
            This teacher account can manage assigned classrooms, but classroom creation is not
            enabled for any current teaching scope.
          </Text>
        ) : null}
      </TeacherCard>

      {isCreateOpen ? (
        <TeacherCard
          title="Create Classroom"
          subtitle="Pick one teaching scope, then enter a course name and course code. AttendEase keeps the rest of the defaults ready."
        >
          {createScopeOptions.length ? (
            <>
              <Text style={styles.fieldLabel}>Teaching scope</Text>
              <View style={styles.optionGrid}>
                {createScopeOptions.map((option) => {
                  const isSelected = option.key === createDraft.selectedScopeKey

                  return (
                    <Pressable
                      key={option.key}
                      style={[styles.selectionCard, isSelected ? styles.selectionCardActive : null]}
                      onPress={() =>
                        setCreateDraft((currentDraft) => ({
                          ...currentDraft,
                          selectedScopeKey: option.key,
                        }))
                      }
                    >
                      <Text style={styles.listTitle}>{option.title}</Text>
                      <Text style={styles.listMeta}>{option.supportingText}</Text>
                    </Pressable>
                  )
                })}
              </View>

              <Text style={styles.fieldLabel}>Classroom title</Text>
              <TextInput
                value={createDraft.classroomTitle}
                autoCapitalize="words"
                placeholder="Applied Mathematics"
                onChangeText={(value) =>
                  setCreateDraft((currentDraft) => ({
                    ...currentDraft,
                    classroomTitle: value,
                  }))
                }
                style={styles.input}
              />

              <Text style={styles.fieldLabel}>Course code</Text>
              <TextInput
                value={createDraft.courseCode}
                autoCapitalize="characters"
                placeholder="CSE6-MATH-A"
                onChangeText={(value) =>
                  setCreateDraft((currentDraft) => ({
                    ...currentDraft,
                    courseCode: value,
                  }))
                }
                style={styles.input}
              />

              <View style={styles.actionGrid}>
                <Pressable
                  style={[
                    styles.primaryButton,
                    createClassroomMutation.isPending ||
                    createDraft.classroomTitle.trim().length < 3 ||
                    createDraft.courseCode.trim().length < 3
                      ? styles.disabledButton
                      : null,
                  ]}
                  disabled={
                    createClassroomMutation.isPending ||
                    createDraft.classroomTitle.trim().length < 3 ||
                    createDraft.courseCode.trim().length < 3
                  }
                  onPress={() => {
                    setCreateMessage(null)
                    createClassroomMutation.mutate(
                      buildTeacherClassroomCreateRequest(createScopeOptions, createDraft),
                      {
                        onSuccess: (created) => {
                          setCreateMessage(
                            `Created ${created.classroomTitle ?? created.displayTitle}.`,
                          )
                          setIsCreateOpen(false)
                          setCreateDraft(
                            createTeacherClassroomCreateDraft(createScopeOptions[0]?.key ?? ""),
                          )
                          router.push(teacherRoutes.classroomDetail(created.id))
                        },
                      },
                    )
                  }}
                >
                  <Text style={styles.primaryButtonLabel}>
                    {createClassroomMutation.isPending ? "Creating..." : "Create Classroom"}
                  </Text>
                </Pressable>
                <Pressable
                  style={styles.secondaryButton}
                  onPress={() => {
                    setCreateMessage(null)
                    setIsCreateOpen(false)
                    setCreateDraft(
                      createTeacherClassroomCreateDraft(createScopeOptions[0]?.key ?? ""),
                    )
                  }}
                >
                  <Text style={styles.secondaryButtonLabel}>Cancel</Text>
                </Pressable>
              </View>
              {createClassroomMutation.error ? (
                <Text style={styles.errorText}>
                  {mapTeacherApiErrorToMessage(createClassroomMutation.error)}
                </Text>
              ) : null}
            </>
          ) : (
            <TeacherEmptyCard label="No teaching scopes available." />
          )}
        </TeacherCard>
      ) : null}
    </>
  )
}
