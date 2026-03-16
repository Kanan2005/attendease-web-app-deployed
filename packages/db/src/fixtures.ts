type DevelopmentDevicePlatform = "ANDROID" | "IOS" | "WEB"

export type DevelopmentDeviceFixture = {
  installId: string
  platform: DevelopmentDevicePlatform
  publicKey: string
  appVersion: string
  deviceModel: string
  osVersion: string
}

export type DevelopmentStudentSeedFixture = {
  userId: string
  email: string
  password: string
  displayName: string
  rollNumber: string
  universityId: string
  programName: string
  currentSemester: number
  device?: DevelopmentDeviceFixture
}

export type DevelopmentTeacherSeedFixture = {
  userId: string
  email: string
  password: string
  displayName: string
  employeeCode: string
  department: string
  designation: string
  googleProviderSubject: string
  hostedDomain: string
}

export type DevelopmentAdminSeedFixture = {
  userId: string
  email: string
  password: string
  displayName: string
}

export type DevelopmentStudentRegistrationFixture = {
  email: string
  password: string
  displayName: string
  platform: "MOBILE"
  device: DevelopmentDeviceFixture
}

export type DevelopmentTeacherRegistrationFixture = {
  email: string
  password: string
  displayName: string
  platform: "MOBILE" | "WEB"
  device?: DevelopmentDeviceFixture
}

function normalizeFixtureLabel(label: string): string {
  const normalized = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

  return normalized.length > 0 ? normalized : "fixture"
}

function toTitleCaseLabel(label: string): string {
  return normalizeFixtureLabel(label)
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

export function buildDevelopmentDeviceFixture(
  label: string,
  overrides: Partial<DevelopmentDeviceFixture> = {},
): DevelopmentDeviceFixture {
  const normalizedLabel = normalizeFixtureLabel(label)
  const platform = overrides.platform ?? "ANDROID"

  const platformDefaults: Record<
    DevelopmentDevicePlatform,
    Omit<DevelopmentDeviceFixture, "installId" | "platform" | "publicKey">
  > = {
    ANDROID: {
      appVersion: "1.0.0",
      deviceModel: "Pixel 9",
      osVersion: "Android 16",
    },
    IOS: {
      appVersion: "1.0.0",
      deviceModel: "iPhone 16",
      osVersion: "iOS 19",
    },
    WEB: {
      appVersion: "1.0.0",
      deviceModel: "Chrome Browser",
      osVersion: "macOS 16",
    },
  }

  return {
    installId: `seed-install-${normalizedLabel}`,
    platform,
    publicKey: `seed-public-key-${normalizedLabel}`,
    ...platformDefaults[platform],
    ...overrides,
  }
}

export function buildDevelopmentStudentRegistrationFixture(
  label = "student-registration",
  overrides: Partial<DevelopmentStudentRegistrationFixture> = {},
): DevelopmentStudentRegistrationFixture {
  const normalizedLabel = normalizeFixtureLabel(label)
  const defaultDevice = buildDevelopmentDeviceFixture(`${normalizedLabel}-attendance`, {
    platform: "ANDROID",
  })

  return {
    email: `${normalizedLabel}@attendease.dev`,
    password: "StudentResetPass123!",
    displayName: toTitleCaseLabel(label),
    platform: "MOBILE",
    device: {
      ...defaultDevice,
      ...(overrides.device ?? {}),
    },
    ...overrides,
  }
}

export function buildDevelopmentTeacherRegistrationFixture(
  label = "teacher-registration",
  overrides: Partial<DevelopmentTeacherRegistrationFixture> = {},
): DevelopmentTeacherRegistrationFixture {
  const normalizedLabel = normalizeFixtureLabel(label)
  const platform = overrides.platform ?? "WEB"
  const defaultDevice =
    platform === "WEB"
      ? buildDevelopmentDeviceFixture(`${normalizedLabel}-web`, { platform: "WEB" })
      : buildDevelopmentDeviceFixture(`${normalizedLabel}-mobile`, { platform: "ANDROID" })
  const baseFixture = {
    email: `${normalizedLabel}@attendease.dev`,
    password: "TeacherResetPass123!",
    displayName: `Prof. ${toTitleCaseLabel(label)}`,
    platform,
    ...overrides,
  }

  if (platform === "WEB") {
    return baseFixture
  }

  return {
    ...baseFixture,
    device: {
      ...defaultDevice,
      ...(overrides.device ?? {}),
    },
  }
}

export const developmentAuthFixtures = {
  admin: {
    userId: "seed_user_admin",
    email: "admin@attendease.dev",
    password: "AdminPass123!",
    displayName: "AttendEase Admin",
  },
  teacher: {
    userId: "seed_user_teacher",
    email: "teacher@attendease.dev",
    password: "TeacherPass123!",
    displayName: "Prof. Anurag Agarwal",
    employeeCode: "EMP-AT-001",
    department: "Computer Science",
    designation: "Assistant Professor",
    googleProviderSubject: "teacher-google-subject-attendease-dev",
    hostedDomain: "attendease.dev",
  },
  students: {
    studentOne: {
      userId: "seed_user_student_one",
      email: "student.one@attendease.dev",
      password: "StudentOnePass123!",
      displayName: "Aarav Sharma",
      rollNumber: "CSE2301",
      universityId: "UNI-CSE2301",
      programName: "B.Tech CSE",
      currentSemester: 6,
      device: {
        installId: "seed-install-student-one",
        platform: "ANDROID" as const,
        publicKey: "seed-public-key-student-one",
        appVersion: "0.1.0",
        deviceModel: "Pixel 8",
        osVersion: "Android 15",
      },
    },
    studentTwo: {
      userId: "seed_user_student_two",
      email: "student.two@attendease.dev",
      password: "StudentTwoPass123!",
      displayName: "Diya Verma",
      rollNumber: "CSE2302",
      universityId: "UNI-CSE2302",
      programName: "B.Tech CSE",
      currentSemester: 6,
      device: {
        installId: "seed-install-student-two",
        platform: "IOS" as const,
        publicKey: "seed-public-key-student-two",
        appVersion: "0.1.0",
        deviceModel: "iPhone 16",
        osVersion: "iOS 19",
      },
    },
    studentThree: {
      userId: "seed_user_student_three",
      email: "student.three@attendease.dev",
      password: "StudentThreePass123!",
      displayName: "Kabir Singh",
      rollNumber: "CSE2303",
      universityId: "UNI-CSE2303",
      programName: "B.Tech CSE",
      currentSemester: 6,
    },
    studentFour: {
      userId: "seed_user_student_four",
      email: "student.four@attendease.dev",
      password: "StudentFourPass123!",
      displayName: "Meera Patel",
      rollNumber: "CSE2304",
      universityId: "UNI-CSE2304",
      programName: "B.Tech CSE",
      currentSemester: 6,
    },
  },
} as const satisfies {
  admin: DevelopmentAdminSeedFixture
  teacher: DevelopmentTeacherSeedFixture
  students: Record<string, DevelopmentStudentSeedFixture>
}

export const developmentAcademicFixtures = {
  academicTermCode: "AY2026-2027",
  academicTermTitle: "Academic Year 2026-2027",
  semesterCode: "SEM6-2026",
  semesterTitle: "Semester 6",
  classCode: "BTECH-CSE-2023",
  classTitle: "B.Tech Computer Science",
  sectionCode: "A",
  sectionTitle: "Section A",
  classrooms: {
    math: {
      subjectCode: "MATH101",
      subjectTitle: "Mathematics",
      shortTitle: "Maths",
      classroomCode: "CSE6-MATHS-A",
      classroomTitle: "Mathematics - Semester 6 A",
      joinCode: "MATH6A",
      locationLabel: "Room 204",
      defaultAttendanceMode: "QR_GPS" as const,
    },
    physics: {
      subjectCode: "PHY101",
      subjectTitle: "Physics",
      shortTitle: "Physics",
      classroomCode: "CSE6-PHYSICS-A",
      classroomTitle: "Physics - Semester 6 A",
      joinCode: "PHY6A",
      locationLabel: "Lab 2",
      defaultAttendanceMode: "BLUETOOTH" as const,
    },
  },
  subjects: {
    math: {
      code: "MATH101",
      courseOfferingCode: "CSE6-MATHS-A",
      joinCode: "MATH6A",
    },
    physics: {
      code: "PHY101",
      courseOfferingCode: "CSE6-PHYSICS-A",
      joinCode: "PHY6A",
    },
  },
} as const

export const developmentLifecycleFixtures = {
  registration: {
    studentCandidate: buildDevelopmentStudentRegistrationFixture("student-reset-candidate"),
    teacherCandidate: buildDevelopmentTeacherRegistrationFixture("teacher-reset-candidate"),
  },
  deviceTrust: {
    trustedStudents: ["studentOne", "studentTwo"],
    unregisteredStudents: ["studentThree", "studentFour"],
    replacementHistory: {
      studentTwo: {
        revokedDevice: buildDevelopmentDeviceFixture("student-two-legacy", {
          platform: "IOS",
          appVersion: "0.9.0",
          deviceModel: "iPhone 15",
          osVersion: "iOS 18",
        }),
        revokedReason: "Support confirmed the previous phone was replaced.",
        approvalReason:
          "Support approved the verified replacement phone for continued attendance access.",
      },
    },
  },
  roster: {
    classrooms: {
      math: {
        activeStudentKeys: ["studentOne", "studentTwo", "studentThree", "studentFour"],
      },
      physics: {
        activeStudentKeys: ["studentOne", "studentTwo"],
        droppedStudentKeys: ["studentThree"],
        blockedStudentKeys: ["studentFour"],
      },
    },
  },
  attendance: {
    completedMathQrSession: {
      classroomKey: "math",
      mode: "QR_GPS" as const,
      presentStudentKeys: ["studentOne", "studentTwo", "studentThree"],
      absentStudentKeys: ["studentFour"],
      manualPresentStudentKeys: ["studentThree"],
    },
  },
  adminRecovery: {
    studentTwoReplacement: {
      studentKey: "studentTwo",
      approvalReason:
        "Support approved the current verified phone after revoking the previous attendance device.",
      revokeReason: "Support confirmed the previous phone was replaced.",
    },
  },
} as const
