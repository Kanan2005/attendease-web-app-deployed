export const studentRoutes = {
  home: "/(student)" as const,
  dashboard: "/(student)" as const,
  classrooms: "/(student)/classrooms" as const,
  join: "/(student)/join" as const,
  history: "/(student)/history" as const,
  reports: "/(student)/reports" as const,
  profile: "/(student)/profile" as const,
  deviceStatus: "/(student)/device-status" as const,
  attendance: "/(student)/attendance" as const,
  qrAttendance: "/(student)/attendance/qr-scan" as const,
  bluetoothAttendance: "/(student)/attendance/bluetooth-scan" as const,
  classroomDetail(classroomId: string) {
    return {
      pathname: "/(student)/classrooms/[classroomId]" as const,
      params: {
        classroomId,
      },
    }
  },
  classroomStream(classroomId: string) {
    return {
      pathname: "/(student)/classrooms/[classroomId]/stream" as const,
      params: {
        classroomId,
      },
    }
  },
  classroomSchedule(classroomId: string) {
    return {
      pathname: "/(student)/classrooms/[classroomId]/schedule" as const,
      params: {
        classroomId,
      },
    }
  },
  subjectReport(subjectId: string) {
    return {
      pathname: "/(student)/reports/subject/[subjectId]" as const,
      params: {
        subjectId,
      },
    }
  },
}
