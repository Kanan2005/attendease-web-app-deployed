export const studentRoutes = {
  classrooms: "/(student)/(tabs)/classrooms" as const,
  join: "/(student)/join" as const,
  history: "/(student)/history" as const,
  reports: "/(student)/(tabs)/reports" as const,
  profile: "/(student)/(tabs)/profile" as const,
  deviceStatus: "/(student)/device-status" as const,
  attendance: "/(student)/attendance" as const,
  qrAttendance: "/(student)/attendance/qr-scan" as const,
  bluetoothAttendance: "/(student)/attendance/bluetooth-scan" as const,
  qrAttendanceFromClassroom(classroomId: string) {
    return {
      pathname: "/(student)/attendance/qr-scan" as const,
      params: { classroomId },
    }
  },
  bluetoothAttendanceFromClassroom(classroomId: string) {
    return {
      pathname: "/(student)/attendance/bluetooth-scan" as const,
      params: { classroomId },
    }
  },
  classroomDetail(classroomId: string) {
    return {
      pathname: "/(student)/classroom/[classroomId]" as const,
      params: {
        classroomId,
      },
    }
  },
  classroomStream(classroomId: string) {
    return {
      pathname: "/(student)/classroom/[classroomId]/stream" as const,
      params: {
        classroomId,
      },
    }
  },
  classroomSchedule(classroomId: string) {
    return {
      pathname: "/(student)/classroom/[classroomId]/schedule" as const,
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
