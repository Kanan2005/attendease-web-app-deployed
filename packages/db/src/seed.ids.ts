export const developmentSeedIds = {
  users: {
    admin: "seed_user_admin",
    teacher: "seed_user_teacher",
    studentOne: "seed_user_student_one",
    studentTwo: "seed_user_student_two",
    studentThree: "seed_user_student_three",
    studentFour: "seed_user_student_four",
  },
  academic: {
    term: "seed_term_ay_2026",
    semester: "seed_semester_6",
    class: "seed_class_btech_cse",
    section: "seed_section_a",
    mathSubject: "seed_subject_math",
    physicsSubject: "seed_subject_physics",
  },
  teacherAssignments: {
    math: "seed_teacher_assignment_math",
    physics: "seed_teacher_assignment_physics",
  },
  courseOfferings: {
    math: "seed_course_offering_math",
    physics: "seed_course_offering_physics",
  },
  joinCodes: {
    math: "seed_join_code_math",
    physics: "seed_join_code_physics",
  },
  scheduleSlots: {
    mathMonday: "seed_schedule_slot_math_monday",
    physicsWednesday: "seed_schedule_slot_physics_wednesday",
  },
  lectures: {
    mathCompleted: "seed_lecture_math_completed",
    physicsPlanned: "seed_lecture_physics_planned",
  },
  announcements: {
    mathWelcome: "seed_announcement_math_welcome",
  },
  enrollments: {
    math: {
      studentOne: "seed_enrollment_math_student_one",
      studentTwo: "seed_enrollment_math_student_two",
      studentThree: "seed_enrollment_math_student_three",
      studentFour: "seed_enrollment_math_student_four",
    },
    physics: {
      studentOne: "seed_enrollment_physics_student_one",
      studentTwo: "seed_enrollment_physics_student_two",
      studentThreeDropped: "seed_enrollment_physics_student_three_dropped",
      studentFourBlocked: "seed_enrollment_physics_student_four_blocked",
    },
  },
  sessions: {
    mathCompleted: "seed_attendance_session_math_completed",
  },
  attendanceRecords: {
    studentOne: "seed_attendance_record_student_one",
    studentTwo: "seed_attendance_record_student_two",
    studentThree: "seed_attendance_record_student_three",
    studentFour: "seed_attendance_record_student_four",
  },
  attendanceEvents: {
    sessionCreated: "seed_attendance_event_session_created",
    studentOneQr: "seed_attendance_event_student_one_qr",
    studentTwoQr: "seed_attendance_event_student_two_qr",
    studentThreeManual: "seed_attendance_event_student_three_manual",
    sessionEnded: "seed_attendance_event_session_ended",
  },
  attendanceEditLogs: {
    studentThreeManual: "seed_attendance_edit_student_three_manual",
  },
  authSessions: {
    teacherMobile: "seed_auth_session_teacher_mobile",
  },
  refreshTokens: {
    teacherMobile: "seed_refresh_token_teacher_mobile",
  },
  devices: {
    studentOne: "seed_device_student_one",
    studentTwo: "seed_device_student_two",
    studentTwoRevoked: "seed_device_student_two_revoked",
  },
  bindings: {
    studentOne: "seed_binding_student_one",
    studentTwo: "seed_binding_student_two",
    studentTwoRevoked: "seed_binding_student_two_revoked",
  },
  securityEvents: {
    studentOneBound: "seed_security_event_student_one_bound",
    studentTwoBound: "seed_security_event_student_two_bound",
    studentTwoRevoked: "seed_security_event_student_two_revoked",
  },
  adminActions: {
    studentOneApprove: "seed_admin_action_student_one_approve",
    studentTwoRevoke: "seed_admin_action_student_two_revoke",
    studentTwoApproveReplacement: "seed_admin_action_student_two_approve_replacement",
  },
  emailAutomation: {
    rule: "seed_email_rule_math_low_attendance",
    dispatchRun: "seed_email_dispatch_run_math_daily",
    emailLog: "seed_email_log_student_four",
  },
  outboxEvents: {
    analyticsRefresh: "seed_outbox_event_analytics_refresh",
  },
} as const

export type SeedSummary = {
  userCount: number
  classroomCount: number
  activeJoinCodes: string[]
  seededSessionId: string
  seededEmailRuleId: string
  pendingOutboxTopics: string[]
}
