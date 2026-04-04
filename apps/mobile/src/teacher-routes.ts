function buildTeacherClassroomDetailRoute(classroomId: string) {
  return {
    pathname: "/(teacher)/classroom/[classroomId]" as const,
    params: {
      classroomId,
    },
  }
}

function buildTeacherClassroomRosterRoute(classroomId: string) {
  return {
    pathname: "/(teacher)/classroom/[classroomId]/roster" as const,
    params: {
      classroomId,
    },
  }
}

function buildTeacherClassroomScheduleRoute(classroomId: string) {
  return {
    pathname: "/(teacher)/classroom/[classroomId]/schedule" as const,
    params: {
      classroomId,
    },
  }
}

function buildTeacherClassroomAnnouncementsRoute(classroomId: string) {
  return {
    pathname: "/(teacher)/classroom/[classroomId]/announcements" as const,
    params: {
      classroomId,
    },
  }
}

function buildTeacherClassroomLecturesRoute(classroomId: string) {
  return {
    pathname: "/(teacher)/classroom/[classroomId]/lectures" as const,
    params: {
      classroomId,
    },
  }
}

function buildTeacherBluetoothCreateRoute(classroomId?: string, lectureId?: string) {
  return classroomId
    ? {
        pathname: "/(teacher)/bluetooth/create" as const,
        params: {
          classroomId,
          ...(lectureId ? { lectureId } : {}),
        },
      }
    : ("/(teacher)/bluetooth/create" as const)
}

function buildTeacherSessionDetailRoute(sessionId: string, classroomId?: string) {
  return {
    pathname: "/(teacher)/sessions/[sessionId]" as const,
    params: {
      sessionId,
      ...(classroomId ? { classroomId } : {}),
    },
  }
}

const teacherHomeRoute = "/(teacher)/(tabs)/classrooms" as const

export const teacherRoutes = {
  home: teacherHomeRoute,
  dashboard: teacherHomeRoute,
  classrooms: "/(teacher)/(tabs)/classrooms" as const,
  profile: "/(teacher)/profile" as const,
  sessionHistory: "/(teacher)/sessions" as const,
  bluetoothCreate: "/(teacher)/bluetooth/create" as const,
  bluetoothCreateWithContext(classroomId: string) {
    return buildTeacherBluetoothCreateRoute(classroomId)
  },
  reports: "/(teacher)/(tabs)/reports" as const,
  exports: "/(teacher)/(tabs)/exports" as const,
  sessionDetail(sessionId: string, classroomId?: string) {
    return buildTeacherSessionDetailRoute(sessionId, classroomId)
  },
  classroomDetail(classroomId: string) {
    return buildTeacherClassroomDetailRoute(classroomId)
  },
  classroomRoster(classroomId: string) {
    return buildTeacherClassroomRosterRoute(classroomId)
  },
  classroomSchedule(classroomId: string) {
    return buildTeacherClassroomScheduleRoute(classroomId)
  },
  classroomAnnouncements(classroomId: string) {
    return buildTeacherClassroomAnnouncementsRoute(classroomId)
  },
  classroomLectures(classroomId: string) {
    return buildTeacherClassroomLecturesRoute(classroomId)
  },
  classroomContext(classroomId: string) {
    return {
      detail: buildTeacherClassroomDetailRoute(classroomId),
      roster: buildTeacherClassroomRosterRoute(classroomId),
      schedule: buildTeacherClassroomScheduleRoute(classroomId),
      announcements: buildTeacherClassroomAnnouncementsRoute(classroomId),
      lectures: buildTeacherClassroomLecturesRoute(classroomId),
      bluetoothCreate: buildTeacherBluetoothCreateRoute(classroomId),
      bluetoothCreateForLecture(lectureId: string) {
        return buildTeacherBluetoothCreateRoute(classroomId, lectureId)
      },
    }
  },
  bluetoothActive(input: {
    sessionId: string
    classroomId: string
    classroomTitle: string
    lectureTitle?: string
    durationMinutes: string
    rotationWindowSeconds: string
  }) {
    return {
      pathname: "/(teacher)/bluetooth/active/[sessionId]" as const,
      params: {
        sessionId: input.sessionId,
        classroomId: input.classroomId,
        classroomTitle: input.classroomTitle,
        lectureTitle: input.lectureTitle ?? "",
        durationMinutes: input.durationMinutes,
        rotationWindowSeconds: input.rotationWindowSeconds,
      },
    }
  },
} as const
