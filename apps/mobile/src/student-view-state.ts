export interface StudentScreenStatus {
  tone: "primary" | "success" | "warning" | "danger"
  title: string
  message: string
}

export type StudentJoinBannerState = "idle" | "pending" | "success" | "error"

export function buildStudentDashboardStatus(input: {
  hasSession: boolean
  isLoading: boolean
  errorMessage?: string | null
  classroomCount: number
  recentLectureCount: number
  openAttendanceCount: number
  attendanceBlocked: boolean
}): StudentScreenStatus {
  if (!input.hasSession) {
    return {
      tone: "warning",
      title: "Student sign in required",
      message: "Sign in to open your classrooms, attendance, reports, and profile.",
    }
  }

  if (input.isLoading) {
    return {
      tone: "primary",
      title: "Getting your home ready",
      message: "AttendEase is loading your classrooms, attendance windows, and recent updates.",
    }
  }

  if (input.errorMessage) {
    return {
      tone: "danger",
      title: "Home unavailable",
      message: input.errorMessage,
    }
  }

  if (input.classroomCount === 0) {
    return {
      tone: "warning",
      title: "No classrooms yet",
      message: "Join a classroom with a course code to unlock attendance, updates, and reports.",
    }
  }

  if (input.attendanceBlocked) {
    return {
      tone: "warning",
      title: "Attendance needs approval",
      message: "Open device status if this phone cannot mark attendance right now.",
    }
  }

  if (input.openAttendanceCount > 0) {
    return {
      tone: "success",
      title: "Attendance is open now",
      message:
        input.openAttendanceCount === 1
          ? "You have 1 attendance session ready to mark."
          : `You have ${input.openAttendanceCount} attendance sessions ready to mark.`,
    }
  }

  if (input.recentLectureCount === 0) {
    return {
      tone: "primary",
      title: "Ready for your first class",
      message: "Your classrooms are connected. Updates and attendance sessions will show up here.",
    }
  }

  return {
    tone: "success",
    title: "Home is ready",
    message:
      "Your student home is synced and ready for attendance, classroom updates, and reports.",
  }
}

export function buildStudentJoinBanner(input: {
  state: StudentJoinBannerState
  classroomTitle?: string
  errorMessage?: string | null
}): StudentScreenStatus | null {
  switch (input.state) {
    case "pending":
      return {
        tone: "primary",
        title: "Joining classroom",
        message: "AttendEase is validating the join code and refreshing student classroom state.",
      }
    case "success":
      return {
        tone: "success",
        title: "Classroom joined",
        message: input.classroomTitle
          ? `Joined ${input.classroomTitle}. Dashboard, reports, and classroom views are refreshing.`
          : "Classroom joined successfully.",
      }
    case "error":
      return {
        tone: "danger",
        title: "Join failed",
        message: input.errorMessage ?? "AttendEase could not join the classroom.",
      }
    default:
      return null
  }
}

export function buildStudentHistoryRefreshStatus(input: {
  isLoading: boolean
  isRefreshing: boolean
  recordCount: number
}): StudentScreenStatus {
  if (input.isLoading) {
    return {
      tone: "primary",
      title: "Loading attendance history",
      message: "AttendEase is loading your recent attendance record.",
    }
  }

  if (input.isRefreshing) {
    return {
      tone: "primary",
      title: "Refreshing history",
      message: "AttendEase is refreshing your recent attendance record.",
    }
  }

  if (input.recordCount === 0) {
    return {
      tone: "warning",
      title: "No history yet",
      message:
        "Your marked attendance sessions will appear here after class attendance is recorded.",
    }
  }

  return {
    tone: "success",
    title: "History ready",
    message: "Your recent attendance record is up to date.",
  }
}

export function buildStudentAttendanceRefreshStatus(input: {
  isRefreshing: boolean
  openAttendanceCount: number
  mode: "ALL" | "BLUETOOTH"
}): StudentScreenStatus {
  if (input.isRefreshing) {
    return {
      tone: "primary",
      title: input.mode === "BLUETOOTH" ? "Refreshing Bluetooth sessions" : "Refreshing attendance",
      message:
        input.mode === "BLUETOOTH"
          ? "AttendEase is checking your classrooms for a live Bluetooth attendance session."
          : "AttendEase is checking your classrooms for live QR and Bluetooth attendance sessions.",
    }
  }

  if (input.openAttendanceCount === 0) {
    return {
      tone: "warning",
      title:
        input.mode === "BLUETOOTH"
          ? "Waiting for a Bluetooth session"
          : "Waiting for a live session",
      message:
        input.mode === "BLUETOOTH"
          ? "Ask your teacher to open Bluetooth attendance, then refresh here."
          : "Ask your teacher to open attendance, then refresh here.",
    }
  }

  if (input.mode === "BLUETOOTH") {
    return {
      tone: "success",
      title:
        input.openAttendanceCount === 1
          ? "Bluetooth session ready"
          : `${input.openAttendanceCount} Bluetooth sessions ready`,
      message:
        input.openAttendanceCount === 1
          ? "Choose the classroom session, then scan nearby teachers."
          : "Choose the right classroom session first, then scan nearby teachers.",
    }
  }

  return {
    tone: "success",
    title:
      input.openAttendanceCount === 1
        ? "1 attendance session ready"
        : `${input.openAttendanceCount} attendance sessions ready`,
    message: "Choose QR or Bluetooth, then continue with the live session that matches your class.",
  }
}

export function buildStudentReportsStatus(input: {
  hasSession: boolean
  isLoading: boolean
  subjectCount: number
  classroomCount: number
}): StudentScreenStatus {
  if (!input.hasSession) {
    return {
      tone: "warning",
      title: "Student sign in required",
      message: "Sign in to view your attendance summary and course breakdown.",
    }
  }

  if (input.isLoading) {
    return {
      tone: "primary",
      title: "Loading reports",
      message: "AttendEase is loading your attendance summary and course-level results.",
    }
  }

  if (input.classroomCount === 0) {
    return {
      tone: "warning",
      title: "No report data yet",
      message: "Join a classroom to unlock subject-wise attendance reports.",
    }
  }

  if (input.subjectCount === 0) {
    return {
      tone: "warning",
      title: "No attendance history yet",
      message:
        "Your classrooms are connected, but recorded attendance sessions have not appeared yet.",
    }
  }

  return {
    tone: "success",
    title: "Reports ready",
    message: "Your attendance summary is ready across overall and course-level views.",
  }
}
