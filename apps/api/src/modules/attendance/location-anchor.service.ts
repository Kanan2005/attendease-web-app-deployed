import type { AttendanceLocationAnchorType, CreateQrSessionRequest } from "@attendease/contracts"
import { BadRequestException, Injectable } from "@nestjs/common"

type ResolvedLocationAnchor = {
  anchorType: AttendanceLocationAnchorType
  anchorLatitude: number
  anchorLongitude: number
  anchorLabel: string | null
  anchorResolvedAt: Date
  radiusMeters: number
}

@Injectable()
export class LocationAnchorService {
  resolveForSession(params: {
    request: CreateQrSessionRequest
    defaultRadiusMeters: number
    classroomDisplayTitle: string
    now?: Date
  }): ResolvedLocationAnchor {
    const now = params.now ?? new Date()
    const radiusMeters = params.request.gpsRadiusMeters ?? params.defaultRadiusMeters

    if (!Number.isFinite(radiusMeters) || radiusMeters <= 0) {
      throw new BadRequestException("GPS radius must be a positive number of meters.")
    }

    const anchorType = params.request.anchorType ?? "TEACHER_SELECTED"

    return {
      anchorType,
      anchorLatitude: params.request.anchorLatitude,
      anchorLongitude: params.request.anchorLongitude,
      anchorLabel: params.request.anchorLabel?.trim() || params.classroomDisplayTitle,
      anchorResolvedAt: now,
      radiusMeters,
    }
  }
}
