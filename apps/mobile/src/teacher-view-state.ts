export interface TeacherScreenStatus {
  tone: "primary" | "success" | "warning" | "danger"
  title: string
  message: string
}

export function buildTeacherDashboardStatus(input: {
  hasSession: boolean
  isLoading: boolean
  errorMessage?: string | null
  classroomCount: number
  liveSessionCount: number
  canCreateClassroom: boolean
}): TeacherScreenStatus {
  if (!input.hasSession) {
    return {
      tone: "warning",
      title: "Teacher sign in required",
      message: "Sign in to open classrooms, Bluetooth attendance, history, reports, and exports.",
    }
  }

  if (input.isLoading) {
    return {
      tone: "primary",
      title: "Getting teacher home ready",
      message:
        "AttendEase is loading your classrooms, live sessions, and recent attendance activity.",
    }
  }

  if (input.errorMessage) {
    return {
      tone: "danger",
      title: "Teacher home unavailable",
      message: input.errorMessage,
    }
  }

  if (input.classroomCount === 0) {
    return {
      tone: "warning",
      title: input.canCreateClassroom ? "Create your first classroom" : "No classrooms yet",
      message: input.canCreateClassroom
        ? "Open Classrooms to set up a course, then return here to run Bluetooth attendance."
        : "Your assigned classrooms will appear here once they are ready.",
    }
  }

  if (input.liveSessionCount > 0) {
    return {
      tone: "success",
      title:
        input.liveSessionCount === 1
          ? "Bluetooth attendance is live"
          : `${input.liveSessionCount} attendance sessions are live`,
      message:
        input.liveSessionCount === 1
          ? "Resume the current session or open history to review counts."
          : "Open the right live session from history, or keep classrooms ready for the next one.",
    }
  }

  return {
    tone: "success",
    title: "Teacher home is ready",
    message: "Classrooms, Bluetooth attendance, history, reports, and exports are ready to open.",
  }
}

export function buildTeacherClassroomsStatus(input: {
  hasSession: boolean
  isLoading: boolean
  errorMessage?: string | null
  classroomCount: number
  canCreateClassroom: boolean
}) {
  if (!input.hasSession) {
    return {
      tone: "warning",
      title: "Teacher sign in required",
      message: "Sign in to manage classrooms, course codes, and Bluetooth-ready teaching spaces.",
    } satisfies TeacherScreenStatus
  }

  if (input.isLoading) {
    return {
      tone: "primary",
      title: "Loading classrooms",
      message: "AttendEase is loading your teaching spaces and create-ready course scopes.",
    } satisfies TeacherScreenStatus
  }

  if (input.errorMessage) {
    return {
      tone: "danger",
      title: "Classrooms unavailable",
      message: input.errorMessage,
    } satisfies TeacherScreenStatus
  }

  if (input.classroomCount === 0) {
    return {
      tone: "warning",
      title: input.canCreateClassroom ? "Create your first classroom" : "No classrooms yet",
      message: input.canCreateClassroom
        ? "Start with a new classroom, then return here to manage course details and attendance."
        : "Your assigned classrooms will appear here once they are ready to manage.",
    } satisfies TeacherScreenStatus
  }

  return {
    tone: "success",
    title: "Classrooms are ready",
    message: input.canCreateClassroom
      ? "Open a classroom, update course details, or create a new one from this list."
      : "Open a classroom to manage roster, schedule, stream updates, and attendance launch context.",
  } satisfies TeacherScreenStatus
}

export function buildTeacherRosterStatus(input: {
  hasSession: boolean
  isLoading: boolean
  errorMessage?: string | null
  totalCount: number
  visibleCount: number
  hasActiveFilter: boolean
}) {
  if (!input.hasSession) {
    return {
      tone: "warning",
      title: "Teacher sign in required",
      message: "Sign in to manage students, enrollment state, and classroom roster actions.",
    } satisfies TeacherScreenStatus
  }

  if (input.isLoading) {
    return {
      tone: "primary",
      title: "Loading roster",
      message: "AttendEase is loading classroom students and current roster actions.",
    } satisfies TeacherScreenStatus
  }

  if (input.errorMessage) {
    return {
      tone: "danger",
      title: "Roster unavailable",
      message: input.errorMessage,
    } satisfies TeacherScreenStatus
  }

  if (input.totalCount === 0) {
    return {
      tone: "warning",
      title: "Add your first student",
      message:
        "Use email, roll number, university ID, or student identifier to build this classroom roster.",
    } satisfies TeacherScreenStatus
  }

  if (input.hasActiveFilter && input.visibleCount === 0) {
    return {
      tone: "warning",
      title: "No students match this view",
      message: "Clear the search or change the status filter to see more of this classroom roster.",
    } satisfies TeacherScreenStatus
  }

  return {
    tone: "success",
    title:
      input.hasActiveFilter && input.visibleCount < input.totalCount
        ? `Showing ${input.visibleCount} of ${input.totalCount} students`
        : "Roster is ready",
    message:
      input.totalCount === 1
        ? "The classroom roster is ready to update from this phone."
        : "Students can be added, updated, or removed from this phone without leaving the classroom flow.",
  } satisfies TeacherScreenStatus
}

export function buildTeacherSessionHistoryStatus(input: {
  hasSession: boolean
  isLoading: boolean
  errorMessage?: string | null
  totalCount: number
  liveCount: number
  correctionOpenCount: number
}) {
  if (!input.hasSession) {
    return {
      tone: "warning",
      title: "Teacher sign in required",
      message: "Sign in to review live sessions, saved attendance, and manual correction work.",
    } satisfies TeacherScreenStatus
  }

  if (input.isLoading) {
    return {
      tone: "primary",
      title: "Loading session history",
      message: "AttendEase is loading your live and saved attendance sessions.",
    } satisfies TeacherScreenStatus
  }

  if (input.errorMessage) {
    return {
      tone: "danger",
      title: "Session history unavailable",
      message: input.errorMessage,
    } satisfies TeacherScreenStatus
  }

  if (input.totalCount === 0) {
    return {
      tone: "warning",
      title: "No attendance sessions yet",
      message: "Start Bluetooth attendance from a classroom when you are ready to take attendance.",
    } satisfies TeacherScreenStatus
  }

  if (input.liveCount > 0) {
    return {
      tone: "success",
      title:
        input.liveCount === 1
          ? "1 live attendance session"
          : `${input.liveCount} live attendance sessions`,
      message:
        input.correctionOpenCount > 0
          ? `${input.correctionOpenCount} saved session${input.correctionOpenCount === 1 ? "" : "s"} still allow corrections after class ends.`
          : "Open the live session to review who is already marked present.",
    } satisfies TeacherScreenStatus
  }

  if (input.correctionOpenCount > 0) {
    return {
      tone: "warning",
      title:
        input.correctionOpenCount === 1
          ? "1 saved session still allows corrections"
          : `${input.correctionOpenCount} saved sessions still allow corrections`,
      message: "Review the saved result and make quick fixes while the edit window is still open.",
    } satisfies TeacherScreenStatus
  }

  return {
    tone: "success",
    title: "Session history is ready",
    message: "Open any saved session to review final present and absent lists from your phone.",
  } satisfies TeacherScreenStatus
}

export function buildTeacherReportsStatus(input: {
  hasSession: boolean
  isLoading: boolean
  errorMessage?: string | null
  hasAnyData: boolean
  hasClassroomFilter: boolean
  hasSubjectFilter: boolean
  followUpCount: number
}) {
  if (!input.hasSession) {
    return {
      tone: "warning",
      title: "Teacher sign in required",
      message: "Sign in to review attendance reports and queue exports from your phone.",
    } satisfies TeacherScreenStatus
  }

  if (input.isLoading) {
    return {
      tone: "primary",
      title: "Loading reports",
      message: "AttendEase is loading classroom, student, and day-wise attendance views.",
    } satisfies TeacherScreenStatus
  }

  if (input.errorMessage) {
    return {
      tone: "danger",
      title: "Reports unavailable",
      message: input.errorMessage,
    } satisfies TeacherScreenStatus
  }

  if (!input.hasAnyData) {
    return {
      tone: "warning",
      title: "No report data for this view",
      message:
        input.hasClassroomFilter || input.hasSubjectFilter
          ? "Try clearing a filter or returning to all classrooms to see more attendance history."
          : "Attendance reports will appear here after sessions are created and saved.",
    } satisfies TeacherScreenStatus
  }

  if (input.followUpCount > 0) {
    return {
      tone: "warning",
      title:
        input.followUpCount === 1
          ? "1 student needs follow-up"
          : `${input.followUpCount} students need follow-up`,
      message: "Use the student list below to spot low attendance before you open exports.",
    } satisfies TeacherScreenStatus
  }

  return {
    tone: "success",
    title: "Reports are ready",
    message:
      input.hasClassroomFilter || input.hasSubjectFilter
        ? "This filtered report view is ready to review or export."
        : "Review subject, student, and day-wise attendance from one teacher mobile screen.",
  } satisfies TeacherScreenStatus
}
