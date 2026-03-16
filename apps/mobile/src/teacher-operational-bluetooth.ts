import type { ClassroomSummary, LectureSummary } from "@attendease/contracts"

import type { TeacherCardTone } from "./teacher-models"
import type {
  TeacherBluetoothActiveStatusModel,
  TeacherBluetoothAdvertiserState,
  TeacherBluetoothCandidate,
  TeacherBluetoothControlModel,
  TeacherBluetoothEndSessionModel,
  TeacherBluetoothRecoveryModel,
  TeacherBluetoothSessionShellSnapshot,
  TeacherBluetoothSetupStatusModel,
} from "./teacher-operational-types"

export function buildTeacherBluetoothCandidates(input: {
  classrooms: ClassroomSummary[]
  lectureSets: Array<{ classroomId: string; lectures: LectureSummary[] }>
}): TeacherBluetoothCandidate[] {
  const lectureMap = new Map(input.lectureSets.map((entry) => [entry.classroomId, entry.lectures]))
  const candidates: TeacherBluetoothCandidate[] = []

  for (const classroom of input.classrooms) {
    if (classroom.status === "ARCHIVED") {
      continue
    }

    const lectures = (lectureMap.get(classroom.id) ?? []).filter(
      (lecture) => lecture.status === "OPEN_FOR_ATTENDANCE" || lecture.status === "PLANNED",
    )

    if (lectures.length === 0) {
      candidates.push({
        sessionId: `preview-${classroom.id}-shell`,
        classroomId: classroom.id,
        classroomTitle: classroom.displayTitle,
        lectureId: null,
        lectureTitle: "Launch without linked lecture",
        durationMinutes: classroom.defaultSessionDurationMinutes,
        bluetoothRotationWindowSeconds: classroom.bluetoothRotationWindowSeconds,
        status: "SHELL_ONLY",
      })
      continue
    }

    for (const lecture of lectures) {
      candidates.push({
        sessionId: `preview-${classroom.id}-${lecture.id}`,
        classroomId: classroom.id,
        classroomTitle: classroom.displayTitle,
        lectureId: lecture.id,
        lectureTitle: lecture.title ?? "Scheduled lecture",
        durationMinutes: classroom.defaultSessionDurationMinutes,
        bluetoothRotationWindowSeconds: classroom.bluetoothRotationWindowSeconds,
        status: lecture.status,
      })
    }
  }

  return candidates.sort((left, right) => left.classroomTitle.localeCompare(right.classroomTitle))
}

export function buildTeacherBluetoothSessionShellSnapshot(input: {
  candidate: TeacherBluetoothCandidate | null
  advertiserState: TeacherBluetoothAdvertiserState
}): TeacherBluetoothSessionShellSnapshot {
  if (!input.candidate) {
    return {
      title: "Bluetooth session setup is waiting for a classroom",
      message: "Select a classroom and optional lecture before creating the Bluetooth session.",
      stateTone: "warning",
      canOpenActiveShell: false,
    }
  }

  if (input.advertiserState === "ADVERTISING") {
    return {
      title: "Bluetooth session is active",
      message:
        "Teacher mobile is broadcasting the rotating AttendEase BLE identifier for the active session.",
      stateTone: "success",
      canOpenActiveShell: true,
    }
  }

  if (input.advertiserState === "PERMISSION_REQUIRED") {
    return {
      title: "Bluetooth permissions are still required",
      message:
        "Bluetooth must be enabled and available before teacher advertising can begin on this device.",
      stateTone: "warning",
      canOpenActiveShell: true,
    }
  }

  if (input.advertiserState === "FAILED") {
    return {
      title: "Bluetooth session shell needs recovery",
      message:
        "Advertising failed and needs recovery before this session can keep broadcasting nearby.",
      stateTone: "danger",
      canOpenActiveShell: true,
    }
  }

  if (input.advertiserState === "STOPPED") {
    return {
      title: "Bluetooth session shell stopped",
      message:
        "The Bluetooth advertiser stopped. Teacher mobile can retry or end the active session.",
      stateTone: "warning",
      canOpenActiveShell: true,
    }
  }

  return {
    title: "Bluetooth session ready",
    message:
      "Teacher mobile can create the Bluetooth session and then hand off to the native advertiser controller.",
    stateTone: "primary",
    canOpenActiveShell: true,
  }
}

export function buildTeacherBluetoothSetupStatusModel(input: {
  candidate: TeacherBluetoothCandidate | null
  durationMinutes: number
  isCreating: boolean
  errorMessage?: string | null
}): TeacherBluetoothSetupStatusModel {
  if (!input.candidate) {
    return {
      title: "Choose a classroom to begin",
      message:
        "Select the classroom and class-session context first. AttendEase creates the Bluetooth attendance session before broadcasting starts.",
      stateTone: "warning",
      startLabel: "Choose A Classroom First",
    }
  }

  if (input.isCreating) {
    return {
      title: "Starting Bluetooth attendance",
      message:
        "AttendEase is creating the live attendance session and preparing the teacher phone for Bluetooth broadcast.",
      stateTone: "primary",
      startLabel: "Starting Bluetooth Attendance...",
    }
  }

  if (input.errorMessage) {
    return {
      title: "Bluetooth attendance could not start",
      message: input.errorMessage,
      stateTone: "danger",
      startLabel: "Retry Bluetooth Attendance",
    }
  }

  if (input.candidate.status === "SHELL_ONLY") {
    return {
      title: "Ready to start from classroom context",
      message: `Students nearby will only see this classroom while teacher mobile keeps the app open for the next ${input.durationMinutes} minutes.`,
      stateTone: "primary",
      startLabel: "Start Bluetooth Attendance",
    }
  }

  return {
    title: "Ready for a live class session",
    message: `Students nearby can mark attendance for ${input.candidate.lectureTitle} during the next ${input.durationMinutes} minutes once Bluetooth broadcast begins.`,
    stateTone: "success",
    startLabel: "Start Bluetooth Attendance",
  }
}

export function buildTeacherBluetoothControlModel(
  advertiserState: TeacherBluetoothAdvertiserState,
): TeacherBluetoothControlModel {
  switch (advertiserState) {
    case "ADVERTISING":
      return {
        startLabel: "Bluetooth Live",
        stopLabel: "Pause Broadcast",
        canStart: false,
        canStop: true,
        helperMessage:
          "Students nearby can detect this teacher phone while Bluetooth attendance stays live in the foreground.",
      }
    case "STOPPED":
      return {
        startLabel: "Resume Broadcast",
        stopLabel: "Broadcast Paused",
        canStart: true,
        canStop: false,
        helperMessage:
          "Bluetooth attendance is still open in the backend, but the local phone broadcast is paused until you resume it.",
      }
    case "PERMISSION_REQUIRED":
      return {
        startLabel: "Turn Bluetooth On",
        stopLabel: "Broadcast Unavailable",
        canStart: false,
        canStop: false,
        helperMessage:
          "Bluetooth must be enabled and available on this phone before nearby students can detect the session.",
      }
    case "FAILED":
      return {
        startLabel: "Retry Bluetooth",
        stopLabel: "Broadcast Failed",
        canStart: true,
        canStop: false,
        helperMessage:
          "The phone could not keep the Bluetooth broadcast alive. Retry here or end the session cleanly.",
      }
    case "IDLE":
    case "READY":
      return {
        startLabel: "Start Broadcast",
        stopLabel: "Pause Broadcast",
        canStart: true,
        canStop: false,
        helperMessage:
          "Teacher mobile is ready to start broadcasting this attendance session to nearby students.",
      }
  }
}

export function buildTeacherBluetoothRecoveryModel(input: {
  advertiserState: TeacherBluetoothAdvertiserState
  errorMessage?: string | null
  availability?: {
    supported: boolean
    poweredOn: boolean
    canAdvertise: boolean
  } | null
}): TeacherBluetoothRecoveryModel {
  if (input.advertiserState === "FAILED") {
    return {
      title: "Bluetooth broadcast needs recovery",
      message:
        input.errorMessage ??
        "Advertising failed. Retry the broadcast or refresh Bluetooth availability before ending the session.",
      stateTone: "danger",
      shouldShow: true,
      shouldRefreshBluetooth: true,
      shouldRetryBroadcast: true,
      shouldOfferEndSession: true,
    }
  }

  if (
    input.advertiserState === "PERMISSION_REQUIRED" &&
    input.availability?.supported &&
    !input.availability.poweredOn
  ) {
    return {
      title: "Turn Bluetooth on to continue",
      message:
        "Bluetooth is currently turned off on this device. Enable it in system settings, then refresh and restart the classroom broadcast.",
      stateTone: "warning",
      shouldShow: true,
      shouldRefreshBluetooth: true,
      shouldRetryBroadcast: true,
      shouldOfferEndSession: true,
    }
  }

  if (input.advertiserState === "STOPPED") {
    return {
      title: "Broadcast stopped",
      message:
        input.errorMessage ??
        "The advertiser stopped while the attendance session is still active. Restart the broadcast or end the session cleanly.",
      stateTone: "warning",
      shouldShow: true,
      shouldRefreshBluetooth: false,
      shouldRetryBroadcast: true,
      shouldOfferEndSession: true,
    }
  }

  if (input.advertiserState === "PERMISSION_REQUIRED") {
    return {
      title: "Bluetooth advertising is unavailable",
      message:
        input.errorMessage ??
        "This device still needs Bluetooth access before AttendEase can advertise the rotating BLE session.",
      stateTone: "warning",
      shouldShow: true,
      shouldRefreshBluetooth: true,
      shouldRetryBroadcast: false,
      shouldOfferEndSession: true,
    }
  }

  return {
    title: "Bluetooth runtime is healthy",
    message: "No recovery action is needed right now.",
    stateTone: "success",
    shouldShow: false,
    shouldRefreshBluetooth: false,
    shouldRetryBroadcast: false,
    shouldOfferEndSession: false,
  }
}

export function buildTeacherBluetoothEndSessionModel(input: {
  requestState: "IDLE" | "ENDING" | "FAILED" | "ENDED"
}): TeacherBluetoothEndSessionModel {
  if (input.requestState === "ENDING") {
    return {
      buttonLabel: "Ending Bluetooth...",
      helperMessage: "AttendEase is closing the session and stopping the teacher-phone broadcast.",
      buttonDisabled: true,
    }
  }

  if (input.requestState === "FAILED") {
    return {
      buttonLabel: "Retry Ending Session",
      helperMessage:
        "The session did not close cleanly yet. Retry ending it here so history and reports stay accurate.",
      buttonDisabled: false,
    }
  }

  if (input.requestState === "ENDED") {
    return {
      buttonLabel: "Session Closed",
      helperMessage: "Bluetooth attendance is already closed for this class session.",
      buttonDisabled: true,
    }
  }

  return {
    buttonLabel: "End Bluetooth Attendance",
    helperMessage:
      "Ending Bluetooth attendance stops nearby detection and sends you back to the session detail view.",
    buttonDisabled: false,
  }
}

export function buildTeacherBluetoothActiveStatusModel(input: {
  advertiserState: TeacherBluetoothAdvertiserState
  sessionStatus: string | null
  presentCount: number
}): TeacherBluetoothActiveStatusModel {
  if (input.sessionStatus && input.sessionStatus !== "ACTIVE") {
    return {
      title: "Bluetooth attendance is closed",
      message:
        "This attendance session is no longer live. Review the final student list or open session history for the saved result.",
      stateTone: "warning",
    }
  }

  if (input.advertiserState === "ADVERTISING") {
    return {
      title: "Bluetooth is live",
      message: `${input.presentCount} student${input.presentCount === 1 ? "" : "s"} marked attendance so far. Keep this screen open while students nearby check in.`,
      stateTone: "success",
    }
  }

  if (input.advertiserState === "FAILED") {
    return {
      title: "Bluetooth needs attention",
      message:
        "The teacher-phone broadcast stopped unexpectedly. Retry the broadcast or end the session cleanly from this screen.",
      stateTone: "danger",
    }
  }

  if (input.advertiserState === "STOPPED") {
    return {
      title: "Broadcast is paused",
      message:
        "The attendance session is still open, but students nearby cannot detect it again until you resume the broadcast.",
      stateTone: "warning",
    }
  }

  if (input.advertiserState === "PERMISSION_REQUIRED") {
    return {
      title: "Turn Bluetooth on to continue",
      message:
        "This phone still needs Bluetooth availability before nearby students can detect the live attendance session.",
      stateTone: "warning",
    }
  }

  return {
    title: "Ready to broadcast",
    message:
      "The live attendance session is created. Start the teacher-phone broadcast when students are nearby.",
    stateTone: "primary",
  }
}
