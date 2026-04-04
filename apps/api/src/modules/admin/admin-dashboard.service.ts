import type { AdminDashboardStats, AdminSecurityEventSummary } from "@attendease/contracts"
import { Inject, Injectable } from "@nestjs/common"

import { DatabaseService } from "../../database/database.service.js"

@Injectable()
export class AdminDashboardService {
  constructor(
    @Inject(DatabaseService)
    private readonly database: DatabaseService,
  ) {}

  async getDashboardStats(): Promise<AdminDashboardStats> {
    const prisma = this.database.prisma

    const [
      studentCounts,
      teacherCounts,
      classroomCounts,
      semesterCounts,
      pendingDeviceRequests,
      recentSecurityEvents,
    ] = await Promise.all([
      this.countStudentsByStatus(prisma),
      this.countTeachersByStatus(prisma),
      this.countClassroomsByStatus(prisma),
      this.countSemestersByStatus(prisma),
      this.countPendingDeviceRequests(prisma),
      this.listRecentSecurityEvents(prisma),
    ])

    return {
      students: studentCounts,
      teachers: teacherCounts,
      classrooms: classroomCounts,
      semesters: semesterCounts,
      pendingDeviceRequests,
      recentSecurityEvents,
    }
  }

  private async countStudentsByStatus(prisma: DatabaseService["prisma"]) {
    const studentWhere = { roles: { some: { role: "STUDENT" as const } } }

    const [total, active, blocked, pending] = await Promise.all([
      prisma.user.count({ where: studentWhere }),
      prisma.user.count({ where: { ...studentWhere, status: "ACTIVE" } }),
      prisma.user.count({ where: { ...studentWhere, status: "BLOCKED" } }),
      prisma.user.count({ where: { ...studentWhere, status: "PENDING" } }),
    ])

    return { total, active, blocked, pending }
  }

  private async countTeachersByStatus(prisma: DatabaseService["prisma"]) {
    const teacherWhere = { roles: { some: { role: "TEACHER" as const } } }

    const [total, active] = await Promise.all([
      prisma.user.count({ where: teacherWhere }),
      prisma.user.count({ where: { ...teacherWhere, status: "ACTIVE" } }),
    ])

    return { total, active }
  }

  private async countClassroomsByStatus(prisma: DatabaseService["prisma"]) {
    const [total, active, archived] = await Promise.all([
      prisma.courseOffering.count(),
      prisma.courseOffering.count({ where: { status: "ACTIVE" } }),
      prisma.courseOffering.count({ where: { status: "ARCHIVED" } }),
    ])

    return { total, active, archived }
  }

  private async countSemestersByStatus(prisma: DatabaseService["prisma"]) {
    const [total, active] = await Promise.all([
      prisma.semester.count(),
      prisma.semester.count({ where: { status: "ACTIVE" } }),
    ])

    return { total, active }
  }

  private async countPendingDeviceRequests(prisma: DatabaseService["prisma"]): Promise<number> {
    return prisma.userDeviceBinding.count({
      where: {
        bindingType: "STUDENT_ATTENDANCE",
        status: "PENDING",
      },
    })
  }

  private async listRecentSecurityEvents(
    prisma: DatabaseService["prisma"],
  ): Promise<AdminSecurityEventSummary[]> {
    const events = await prisma.securityEvent.findMany({
      where: { userId: { not: null } },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        eventType: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            email: true,
            displayName: true,
          },
        },
      },
    })

    return events
      .filter((event) => event.user !== null)
      .map((event) => ({
        id: event.id,
        eventType: event.eventType,
        userId: event.user!.id,
        userEmail: event.user!.email,
        userDisplayName: event.user!.displayName,
        createdAt: event.createdAt.toISOString(),
      }))
  }
}
