import type { StudentAttendanceGateModel } from "./device-trust.js"

export const trustedGateModel: StudentAttendanceGateModel = {
  title: "Trusted device ready",
  message: "Ready",
  tone: "success",
  supportHint: "Continue",
  canContinue: true,
}

export const qrCandidate = {
  sessionId: "session_1",
  classroomId: "classroom_1",
  subjectId: "subject_1",
  classroomTitle: "Mathematics",
  lectureId: "lecture_1",
  lectureTitle: "Lecture 1",
  mode: "QR_GPS" as const,
  timestamp: "2026-03-14T09:30:00.000Z",
  requiresTrustedDevice: true,
}

export const bluetoothCandidate = {
  sessionId: "session_2",
  classroomId: "classroom_2",
  subjectId: "subject_2",
  classroomTitle: "Physics",
  lectureId: "lecture_2",
  lectureTitle: "Lecture 2",
  mode: "BLUETOOTH" as const,
  timestamp: "2026-03-14T10:30:00.000Z",
  requiresTrustedDevice: true,
}
