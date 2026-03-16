import {
  type AnnouncementListQuery,
  type AnnouncementSummary,
  type CreateAnnouncementRequest,
  announcementSummarySchema,
} from "@attendease/contracts"
import { queueOutboxEvent, runInTransaction } from "@attendease/db"
import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common"

import { DatabaseService } from "../../database/database.service.js"
import type { AuthRequestContext } from "../auth/auth.types.js"
import { ClassroomsService } from "./classrooms.service.js"

@Injectable()
export class AnnouncementsService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(ClassroomsService) private readonly classroomsService: ClassroomsService,
  ) {}

  async listClassroomStream(
    auth: AuthRequestContext,
    classroomId: string,
    query: AnnouncementListQuery = {},
  ): Promise<AnnouncementSummary[]> {
    await this.requireStreamAccess(auth, classroomId)

    const posts = await this.database.prisma.announcementPost.findMany({
      where: {
        courseOfferingId: classroomId,
        ...(auth.activeRole === "STUDENT" ? { visibility: "STUDENT_AND_TEACHER" } : {}),
      },
      include: {
        authorUser: {
          select: {
            displayName: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      ...(query.limit ? { take: query.limit } : {}),
    })

    return posts.map((post) => this.toAnnouncementSummary(post))
  }

  async createAnnouncement(
    auth: AuthRequestContext,
    classroomId: string,
    request: CreateAnnouncementRequest,
  ): Promise<AnnouncementSummary> {
    await this.requireAnnouncementWriteAccess(auth, classroomId)

    const announcement = await runInTransaction(this.database.prisma, async (transaction) => {
      const created = await transaction.announcementPost.create({
        data: {
          courseOfferingId: classroomId,
          authorUserId: auth.userId,
          postType: request.postType ?? "ANNOUNCEMENT",
          visibility: request.visibility ?? "STUDENT_AND_TEACHER",
          title: request.title?.trim() ?? null,
          body: request.body.trim(),
          shouldNotify: request.shouldNotify ?? false,
        },
        include: {
          authorUser: {
            select: {
              displayName: true,
            },
          },
        },
      })

      if (created.shouldNotify) {
        await queueOutboxEvent(transaction, {
          topic: "classroom.announcement.posted",
          aggregateType: "announcement_post",
          aggregateId: created.id,
          payload: {
            announcementId: created.id,
            classroomId,
            authorUserId: auth.userId,
            visibility: created.visibility,
            postType: created.postType,
          },
        })
      }

      return created
    })

    return this.toAnnouncementSummary(announcement)
  }

  private async requireStreamAccess(auth: AuthRequestContext, classroomId: string) {
    if (auth.activeRole === "STUDENT") {
      const enrollment = await this.database.prisma.enrollment.findFirst({
        where: {
          courseOfferingId: classroomId,
          studentId: auth.userId,
          status: {
            in: ["ACTIVE", "PENDING"],
          },
        },
        select: {
          id: true,
        },
      })

      if (!enrollment) {
        throw new ForbiddenException("Students can only view classroom streams they belong to.")
      }

      return
    }

    if (auth.activeRole === "TEACHER" || auth.activeRole === "ADMIN") {
      await this.classroomsService.requireAccessibleClassroom(auth, classroomId)
      return
    }

    throw new ForbiddenException("Unsupported role for classroom stream access.")
  }

  private async requireAnnouncementWriteAccess(auth: AuthRequestContext, classroomId: string) {
    const classroom = await this.classroomsService.requireAccessibleClassroom(auth, classroomId)

    if (classroom.status === "COMPLETED" || classroom.status === "ARCHIVED") {
      throw new BadRequestException(
        "Completed or archived classrooms cannot receive new announcements.",
      )
    }

    if (classroom.semester.status === "CLOSED" || classroom.semester.status === "ARCHIVED") {
      throw new BadRequestException(
        "Closed or archived semesters cannot receive new announcements.",
      )
    }

    return classroom
  }

  toAnnouncementSummary(input: {
    id: string
    courseOfferingId: string
    authorUserId: string
    postType: "ANNOUNCEMENT" | "SCHEDULE_UPDATE" | "ATTENDANCE_REMINDER" | "IMPORT_RESULT"
    visibility: "TEACHER_ONLY" | "STUDENT_AND_TEACHER"
    title: string | null
    body: string
    shouldNotify: boolean
    createdAt: Date
    editedAt: Date | null
    authorUser?: {
      displayName: string
    }
  }): AnnouncementSummary {
    if (!input.authorUser) {
      throw new NotFoundException("Announcement author could not be resolved.")
    }

    return announcementSummarySchema.parse({
      id: input.id,
      courseOfferingId: input.courseOfferingId,
      classroomId: input.courseOfferingId,
      authorUserId: input.authorUserId,
      authorDisplayName: input.authorUser.displayName,
      postType: input.postType,
      visibility: input.visibility,
      title: input.title,
      body: input.body,
      shouldNotify: input.shouldNotify,
      createdAt: input.createdAt.toISOString(),
      editedAt: input.editedAt?.toISOString() ?? null,
    })
  }
}
