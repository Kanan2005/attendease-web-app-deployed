import type { ClassroomSummary } from "@attendease/contracts"
import { describe, expect, it } from "vitest"

import {
  applyTeacherWebQrSessionClassroomSelection,
  buildTeacherWebQrSessionClassroomOptions,
  buildTeacherWebQrSessionStartRequest,
  createTeacherWebQrSessionStartDraft,
  evaluateTeacherWebQrSessionStartReadiness,
} from "./teacher-qr-session-management.js"

function createClassroomSummary(overrides: Partial<ClassroomSummary> = {}): ClassroomSummary {
  return {
    id: "classroom_1",
    semesterId: "semester_1",
    semesterCode: "SEM6",
    semesterTitle: "Semester 6",
    classId: "class_1",
    classCode: "CSE6",
    classTitle: "CSE 6",
    sectionId: "section_1",
    sectionCode: "A",
    sectionTitle: "Section A",
    subjectId: "subject_1",
    subjectCode: "MATH101",
    subjectTitle: "Mathematics",
    primaryTeacherId: "teacher_1",
    primaryTeacherDisplayName: "Teacher One",
    createdByUserId: "teacher_1",
    code: "CSE6-MATH-A",
    courseCode: "CSE6-MATH-A",
    displayTitle: "Mathematics",
    classroomTitle: "Mathematics",
    status: "ACTIVE",
    defaultAttendanceMode: "QR_GPS",
    defaultGpsRadiusMeters: 100,
    defaultSessionDurationMinutes: 15,
    qrRotationWindowSeconds: 15,
    bluetoothRotationWindowSeconds: 10,
    timezone: "Asia/Kolkata",
    requiresTrustedDevice: true,
    archivedAt: null,
    activeJoinCode: null,
    permissions: {
      canEdit: true,
      canArchive: true,
      canEditCourseInfo: true,
      canEditAcademicScope: false,
      canReassignTeacher: false,
    },
    ...overrides,
  }
}

describe("teacher QR session management helpers", () => {
  it("keeps only active and draft classrooms in the setup chooser, excludes archived", () => {
    const options = buildTeacherWebQrSessionClassroomOptions([
      createClassroomSummary(),
      createClassroomSummary({
        id: "classroom_2",
        courseCode: "CSE6-PHY-A",
        subjectCode: "PHY101",
        subjectTitle: "Physics",
        classroomTitle: "Physics",
      }),
      createClassroomSummary({
        id: "classroom_3",
        defaultAttendanceMode: "BLUETOOTH",
        classroomTitle: "Bluetooth Lab",
      }),
      createClassroomSummary({
        id: "classroom_4",
        status: "ARCHIVED",
        archivedAt: "2026-03-15T10:00:00.000Z",
        classroomTitle: "Archived Room",
      }),
    ])

    expect(options.map((entry) => entry.classroomId)).toEqual(["classroom_3", "classroom_1", "classroom_2"])
    expect(options[0]).toMatchObject({
      classroomTitle: "Bluetooth Lab",
      attendanceModeLabel: "Bluetooth",
      deviceRuleLabel: "Device registration required for students",
    })
  })

  it("builds the start draft from classroom defaults and lets the teacher switch classrooms", () => {
    const options = buildTeacherWebQrSessionClassroomOptions([
      createClassroomSummary(),
      createClassroomSummary({
        id: "classroom_2",
        courseCode: "CSE6-CHE-A",
        classroomTitle: "Chemistry",
        subjectCode: "CHE101",
        subjectTitle: "Chemistry",
        defaultGpsRadiusMeters: 60,
        defaultSessionDurationMinutes: 25,
      }),
    ])

    expect(createTeacherWebQrSessionStartDraft(options, "classroom_2")).toEqual({
      classroomId: "classroom_2",
      lectureId: "",
      sessionDurationMinutes: "25",
      gpsRadiusMeters: "60",
      anchorLatitude: "",
      anchorLongitude: "",
      anchorLabel: "Chemistry",
    })

    expect(applyTeacherWebQrSessionClassroomSelection(options, "classroom_1")).toEqual({
      classroomId: "classroom_1",
      lectureId: "",
      sessionDurationMinutes: "15",
      gpsRadiusMeters: "100",
      anchorLatitude: "",
      anchorLongitude: "",
      anchorLabel: "Mathematics",
    })
  })

  it("blocks session start until classroom, timing, distance, and browser location are ready", () => {
    const options = buildTeacherWebQrSessionClassroomOptions([createClassroomSummary()])
    const draft = createTeacherWebQrSessionStartDraft(options)

    if (!draft) {
      throw new Error("Expected a QR session draft for an active QR classroom.")
    }

    expect(evaluateTeacherWebQrSessionStartReadiness(draft, options)).toEqual({
      canStart: false,
      blockingMessage: "Use browser location before starting the session.",
    })

    const readyDraft = {
      ...draft,
      sessionDurationMinutes: "20",
      gpsRadiusMeters: "80",
      anchorLatitude: "12.971599",
      anchorLongitude: "77.594566",
    }

    expect(evaluateTeacherWebQrSessionStartReadiness(readyDraft, options)).toEqual({
      canStart: true,
      blockingMessage: null,
    })
    expect(
      evaluateTeacherWebQrSessionStartReadiness(
        {
          ...readyDraft,
          gpsRadiusMeters: "0",
        },
        options,
      ),
    ).toEqual({
      canStart: false,
      blockingMessage: "Enter a valid allowed distance in meters.",
    })
  })

  it("builds the QR session request with a teacher-selected GPS anchor", () => {
    expect(
      buildTeacherWebQrSessionStartRequest({
        classroomId: "classroom_1",
        lectureId: "",
        sessionDurationMinutes: "30",
        gpsRadiusMeters: "75",
        anchorLatitude: "12.971599",
        anchorLongitude: "77.594566",
        anchorLabel: " Classroom door ",
      }),
    ).toEqual({
      classroomId: "classroom_1",
      sessionDurationMinutes: 30,
      gpsRadiusMeters: 75,
      anchorType: "TEACHER_SELECTED",
      anchorLatitude: 12.971599,
      anchorLongitude: 77.594566,
      anchorLabel: "Classroom door",
    })
  })
})
