import type {
  AttendanceSessionParams,
  AttendanceSessionSummary,
  CreateQrSessionRequest,
  EndAttendanceSessionResponse,
  MarkQrAttendanceRequest,
  MarkQrAttendanceResponse,
} from "@attendease/contracts"
import { Inject, Injectable } from "@nestjs/common"

import { DatabaseService } from "../../database/database.service.js"
import { ClassroomsService } from "../academic/classrooms.service.js"
import { LecturesService } from "../academic/lectures.service.js"
import { SchedulingService } from "../academic/scheduling.service.js"
import type { AuthRequestContext } from "../auth/auth.types.js"
import type { TrustedDeviceRequestContext } from "../devices/devices.types.js"
import { AttendanceRealtimeService } from "./attendance-realtime.service.js"
import { GpsValidatorService } from "./gps-validator.service.js"
import { LocationAnchorService } from "./location-anchor.service.js"
import { createQrSession, endQrSession, getQrSession } from "./qr-attendance.service.lifecycle.js"
import { markAttendanceFromQr } from "./qr-attendance.service.marking.js"
import type { QrAttendanceServiceContext } from "./qr-attendance.service.types.js"
import { QrTokenService } from "./qr-token.service.js"

@Injectable()
export class QrAttendanceService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(ClassroomsService) private readonly classroomsService: ClassroomsService,
    @Inject(LecturesService) private readonly lecturesService: LecturesService,
    @Inject(SchedulingService) private readonly schedulingService: SchedulingService,
    @Inject(LocationAnchorService) private readonly locationAnchorService: LocationAnchorService,
    @Inject(GpsValidatorService) private readonly gpsValidatorService: GpsValidatorService,
    @Inject(QrTokenService) private readonly qrTokenService: QrTokenService,
    @Inject(AttendanceRealtimeService)
    private readonly realtimeService: AttendanceRealtimeService,
  ) {}

  async createQrSession(
    auth: AuthRequestContext,
    request: CreateQrSessionRequest,
  ): Promise<AttendanceSessionSummary> {
    return createQrSession(this.getContext(), auth, request)
  }

  async getSession(
    auth: AuthRequestContext,
    params: AttendanceSessionParams,
  ): Promise<AttendanceSessionSummary> {
    return getQrSession(this.getContext(), auth, params)
  }

  async endSession(
    auth: AuthRequestContext,
    params: AttendanceSessionParams,
  ): Promise<EndAttendanceSessionResponse> {
    return endQrSession(this.getContext(), auth, params)
  }

  async markAttendanceFromQr(
    auth: AuthRequestContext,
    trustedDevice: TrustedDeviceRequestContext,
    request: MarkQrAttendanceRequest,
  ): Promise<MarkQrAttendanceResponse> {
    return markAttendanceFromQr(this.getContext(), auth, trustedDevice, request)
  }

  private getContext(): QrAttendanceServiceContext {
    return {
      database: this.database,
      classroomsService: this.classroomsService,
      lecturesService: this.lecturesService,
      schedulingService: this.schedulingService,
      locationAnchorService: this.locationAnchorService,
      gpsValidatorService: this.gpsValidatorService,
      qrTokenService: this.qrTokenService,
      realtimeService: this.realtimeService,
    }
  }
}
