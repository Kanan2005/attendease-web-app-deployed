import type {
  AdminStudentManagementDetail,
  AdminStudentManagementSearchQuery,
  AdminStudentManagementSummary,
} from "@attendease/contracts"

import { NotFoundException } from "@nestjs/common"
import { AdminDeviceSupportServiceShared } from "./admin-device-support.service.shared.js"

export class AdminDeviceSupportServiceManagementQueries extends AdminDeviceSupportServiceShared {
  async listStudentManagement(
    filters: AdminStudentManagementSearchQuery,
  ): Promise<AdminStudentManagementSummary[]> {
    const query = filters.query?.trim()

    const students = await this.database.prisma.user.findMany({
      where: {
        roles: {
          some: {
            role: "STUDENT",
          },
        },
        ...(filters.accountStatus ? { status: filters.accountStatus } : {}),
        ...(query
          ? {
              OR: [
                {
                  email: {
                    contains: query,
                    mode: "insensitive" as const,
                  },
                },
                {
                  displayName: {
                    contains: query,
                    mode: "insensitive" as const,
                  },
                },
                {
                  studentProfile: {
                    is: {
                      rollNumber: {
                        contains: query,
                        mode: "insensitive" as const,
                      },
                    },
                  },
                },
                {
                  studentProfile: {
                    is: {
                      programName: {
                        contains: query,
                        mode: "insensitive" as const,
                      },
                    },
                  },
                },
                {
                  deviceBindings: {
                    some: {
                      bindingType: "STUDENT_ATTENDANCE" as const,
                      device: {
                        installId: {
                          contains: query,
                          mode: "insensitive" as const,
                        },
                      },
                    },
                  },
                },
                {
                  enrollments: {
                    some: {
                      courseOffering: {
                        code: {
                          contains: query,
                          mode: "insensitive" as const,
                        },
                      },
                    },
                  },
                },
                {
                  enrollments: {
                    some: {
                      courseOffering: {
                        displayTitle: {
                          contains: query,
                          mode: "insensitive" as const,
                        },
                      },
                    },
                  },
                },
              ],
            }
          : {}),
      },
      take: filters.limit,
      orderBy: [{ status: "asc" }, { displayName: "asc" }],
      select: {
        id: true,
        email: true,
        displayName: true,
        status: true,
        createdAt: true,
        lastLoginAt: true,
        studentProfile: {
          select: {
            rollNumber: true,
            programName: true,
            currentSemester: true,
            parentEmail: true,
            attendanceDisabled: true,
          },
        },
        deviceBindings: {
          where: {
            bindingType: "STUDENT_ATTENDANCE",
          },
          orderBy: [{ activatedAt: "desc" }, { createdAt: "desc" }],
          take: 5,
          select: {
            id: true,
            userId: true,
            deviceId: true,
            bindingType: true,
            status: true,
            boundAt: true,
            activatedAt: true,
            revokedAt: true,
            revokeReason: true,
            device: {
              select: {
                id: true,
                installId: true,
                platform: true,
                deviceModel: true,
                osVersion: true,
                appVersion: true,
                publicKey: true,
                attestationStatus: true,
                attestationProvider: true,
                attestedAt: true,
                lastSeenAt: true,
              },
            },
          },
        },
        securityEvents: {
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
          select: {
            id: true,
            userId: true,
            actorUserId: true,
            deviceId: true,
            bindingId: true,
            eventType: true,
            severity: true,
            description: true,
            metadata: true,
            createdAt: true,
          },
        },
        targetedActions: {
          where: {
            actionType: {
              in: ["DEVICE_REVOKE", "DEVICE_APPROVE_REPLACEMENT", "USER_STATUS_CHANGE"],
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
          select: {
            id: true,
            adminUserId: true,
            targetUserId: true,
            targetDeviceId: true,
            targetBindingId: true,
            actionType: true,
            metadata: true,
            createdAt: true,
          },
        },
        enrollments: {
          select: {
            status: true,
          },
        },
      },
    })

    return students.map((student) => {
      const activeBinding = student.deviceBindings.find((binding) => binding.status === "ACTIVE")
      const pendingBinding = student.deviceBindings.find((binding) => binding.status === "PENDING")

      return {
        student: this.toStudentIdentitySummary(student),
        attendanceDeviceState: this.resolveAttendanceDeviceState({
          bindings: student.deviceBindings,
          latestSecurityEvent: student.securityEvents[0] ?? null,
        }),
        activeBinding: activeBinding ? this.toBindingRecord(activeBinding) : null,
        pendingBinding: pendingBinding ? this.toBindingRecord(pendingBinding) : null,
        latestSecurityEvent: student.securityEvents[0]
          ? this.toSecurityEventSummary(student.securityEvents[0])
          : null,
        latestAdminAction: student.targetedActions[0]
          ? this.toAdminActionSummary(student.targetedActions[0])
          : null,
        enrollmentCounts: this.toEnrollmentCounts(student.enrollments),
        actions: this.buildStudentStatusActions(student.status),
      }
    })
  }

  async getStudentManagementDetail(studentId: string): Promise<AdminStudentManagementDetail> {
    const student = await this.database.prisma.user.findFirst({
      where: {
        id: studentId,
        roles: {
          some: {
            role: "STUDENT",
          },
        },
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        status: true,
        createdAt: true,
        lastLoginAt: true,
        studentProfile: {
          select: {
            rollNumber: true,
            programName: true,
            currentSemester: true,
            parentEmail: true,
            attendanceDisabled: true,
          },
        },
        deviceBindings: {
          where: {
            bindingType: "STUDENT_ATTENDANCE",
          },
          orderBy: [{ activatedAt: "desc" }, { createdAt: "desc" }],
          select: {
            id: true,
            userId: true,
            deviceId: true,
            bindingType: true,
            status: true,
            boundAt: true,
            activatedAt: true,
            revokedAt: true,
            revokeReason: true,
            device: {
              select: {
                id: true,
                installId: true,
                platform: true,
                deviceModel: true,
                osVersion: true,
                appVersion: true,
                publicKey: true,
                attestationStatus: true,
                attestationProvider: true,
                attestedAt: true,
                lastSeenAt: true,
              },
            },
          },
        },
        securityEvents: {
          orderBy: {
            createdAt: "desc",
          },
          take: 25,
          select: {
            id: true,
            userId: true,
            actorUserId: true,
            deviceId: true,
            bindingId: true,
            eventType: true,
            severity: true,
            description: true,
            metadata: true,
            createdAt: true,
          },
        },
        targetedActions: {
          where: {
            actionType: {
              in: ["DEVICE_REVOKE", "DEVICE_APPROVE_REPLACEMENT", "USER_STATUS_CHANGE"],
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 25,
          select: {
            id: true,
            adminUserId: true,
            targetUserId: true,
            targetDeviceId: true,
            targetBindingId: true,
            actionType: true,
            metadata: true,
            createdAt: true,
          },
        },
        enrollments: {
          orderBy: [{ updatedAt: "desc" }, { joinedAt: "desc" }],
          take: 12,
          select: {
            id: true,
            status: true,
            joinedAt: true,
            droppedAt: true,
            courseOffering: {
              select: {
                id: true,
                code: true,
                displayTitle: true,
                status: true,
                semester: {
                  select: {
                    title: true,
                    status: true,
                  },
                },
              },
            },
          },
        },
      },
    })

    if (!student) {
      throw new NotFoundException("Student support record was not found.")
    }

    // Fetch attendance stats per enrollment and last active session in parallel
    const enrollmentIds = student.enrollments.map((e) => e.id)
    const courseOfferingIds = student.enrollments.map((e) => e.courseOffering.id)

    const [attendanceStats, sessionCounts, lastActiveSession] = await Promise.all([
      // Count attended sessions per enrollment (PRESENT)
      enrollmentIds.length > 0
        ? this.database.prisma.attendanceRecord.groupBy({
            by: ["enrollmentId"],
            where: {
              enrollmentId: { in: enrollmentIds },
              status: "PRESENT",
            },
            _count: true,
          })
        : Promise.resolve([]),
      // Count total sessions per course offering (ENDED or ACTIVE)
      courseOfferingIds.length > 0
        ? this.database.prisma.attendanceSession.groupBy({
            by: ["courseOfferingId"],
            where: {
              courseOfferingId: { in: courseOfferingIds },
              status: { in: ["ENDED", "ACTIVE"] },
            },
            _count: true,
          })
        : Promise.resolve([]),
      // Last attended attendance record for this student
      this.database.prisma.attendanceRecord.findFirst({
        where: {
          studentId,
          status: "PRESENT",
        },
        orderBy: { markedAt: "desc" },
        select: { markedAt: true },
      }),
    ])

    const attendedByEnrollment = new Map(
      attendanceStats.map((row) => [row.enrollmentId, row._count]),
    )
    const totalByCourseOffering = new Map(
      sessionCounts.map((row) => [row.courseOfferingId, row._count]),
    )

    const activeBinding = student.deviceBindings.find((binding) => binding.status === "ACTIVE")
    const pendingBinding = student.deviceBindings.find((binding) => binding.status === "PENDING")

    return {
      student: {
        ...this.toStudentIdentityDetail(student),
        lastActiveSessionAt: lastActiveSession?.markedAt?.toISOString() ?? null,
      },
      attendanceDeviceState: this.resolveAttendanceDeviceState({
        bindings: student.deviceBindings,
        latestSecurityEvent: student.securityEvents[0] ?? null,
      }),
      activeBinding: activeBinding ? this.toBindingRecord(activeBinding) : null,
      pendingBinding: pendingBinding ? this.toBindingRecord(pendingBinding) : null,
      enrollmentCounts: this.toEnrollmentCounts(student.enrollments),
      recentClassrooms: student.enrollments.map((enrollment) => {
        const totalSessions = totalByCourseOffering.get(enrollment.courseOffering.id) ?? 0
        const attendedSessions = attendedByEnrollment.get(enrollment.id) ?? 0
        const attendancePercentage =
          totalSessions > 0 ? Math.round((attendedSessions / totalSessions) * 100) : null

        return {
          ...this.toStudentClassroomContext(enrollment),
          totalSessions,
          attendedSessions,
          attendancePercentage,
        }
      }),
      securityEvents: student.securityEvents.map((event) => this.toSecurityEventSummary(event)),
      adminActions: student.targetedActions.map((action) => this.toAdminActionSummary(action)),
      actions: this.buildStudentStatusActions(student.status),
    }
  }
}
