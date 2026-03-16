import { loadApiEnv } from "@attendease/config"
import type {
  BluetoothSessionCreateResponse,
  CreateBluetoothSessionRequest,
  MarkBluetoothAttendanceRequest,
  MarkBluetoothAttendanceResponse,
} from "@attendease/contracts"
import { Inject, Injectable } from "@nestjs/common"

import { DatabaseService } from "../../database/database.service.js"
import { ClassroomsService } from "../academic/classrooms.service.js"
import { LecturesService } from "../academic/lectures.service.js"
import { SchedulingService } from "../academic/scheduling.service.js"
import type { AuthRequestContext } from "../auth/auth.types.js"
import type { TrustedDeviceRequestContext } from "../devices/devices.types.js"
import { AttendanceRealtimeService } from "./attendance-realtime.service.js"
import { markAttendanceFromBluetooth } from "./bluetooth-attendance.service.marking.js"
import { createBluetoothSession } from "./bluetooth-attendance.service.session-creation.js"
import type { BluetoothAttendanceServiceContext } from "./bluetooth-attendance.service.types.js"
import { BluetoothTokenService } from "./bluetooth-token.service.js"

@Injectable()
export class BluetoothAttendanceService {
  private readonly env = loadApiEnv(process.env)

  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(ClassroomsService) private readonly classroomsService: ClassroomsService,
    @Inject(LecturesService) private readonly lecturesService: LecturesService,
    @Inject(SchedulingService) private readonly schedulingService: SchedulingService,
    @Inject(BluetoothTokenService)
    private readonly bluetoothTokenService: BluetoothTokenService,
    @Inject(AttendanceRealtimeService)
    private readonly realtimeService: AttendanceRealtimeService,
  ) {}

  async createBluetoothSession(
    auth: AuthRequestContext,
    request: CreateBluetoothSessionRequest,
  ): Promise<BluetoothSessionCreateResponse> {
    return createBluetoothSession(this.getContext(), auth, request)
  }

  async markAttendanceFromBluetooth(
    auth: AuthRequestContext,
    trustedDevice: TrustedDeviceRequestContext,
    request: MarkBluetoothAttendanceRequest,
  ): Promise<MarkBluetoothAttendanceResponse> {
    return markAttendanceFromBluetooth(this.getContext(), auth, trustedDevice, request)
  }

  private getContext(): BluetoothAttendanceServiceContext {
    return {
      env: this.env,
      database: this.database,
      classroomsService: this.classroomsService,
      lecturesService: this.lecturesService,
      schedulingService: this.schedulingService,
      bluetoothTokenService: this.bluetoothTokenService,
      realtimeService: this.realtimeService,
    }
  }
}
