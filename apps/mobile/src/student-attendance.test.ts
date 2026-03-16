import { AuthApiClientError } from "@attendease/auth"
import { describe, expect, it } from "vitest"

import type { StudentAttendanceGateModel } from "./device-trust.js"
import {
  buildStudentAttendanceControllerSnapshot,
  buildStudentAttendancePermissionBanner,
  buildStudentAttendanceResultBanner,
  buildStudentBluetoothAttendanceErrorBanner,
  buildStudentBluetoothMarkRequest,
  buildStudentQrAttendanceErrorBanner,
  buildStudentQrLocationBanner,
  buildStudentQrMarkRequest,
  buildStudentQrScanBanner,
  resolveStudentQrCameraPermissionState,
} from "./student-attendance.js"

const trustedGateModel: StudentAttendanceGateModel = {
  title: "Trusted device ready",
  message: "Ready",
  tone: "success",
  supportHint: "Continue",
  canContinue: true,
}

describe("student attendance UX helpers", () => {
  it("builds permission-denied messaging for QR and Bluetooth flows", () => {
    expect(
      buildStudentAttendancePermissionBanner({
        mode: "QR_GPS",
        permissionState: "DENIED",
      }),
    ).toMatchObject({
      title: "Permission denied",
      tone: "danger",
    })

    expect(
      buildStudentAttendancePermissionBanner({
        mode: "BLUETOOTH",
        permissionState: "PENDING_REQUEST",
      }),
    ).toMatchObject({
      title: "Permission needed",
      tone: "warning",
    })
  })

  it("builds QR scan banners for manual, denied, and captured states", () => {
    expect(
      buildStudentQrScanBanner({
        cameraMode: "manual",
        cameraPermissionState: "PENDING_REQUEST",
        hasQrPayload: false,
        isPreparingCamera: false,
      }),
    ).toMatchObject({
      title: "Scan the live QR",
      tone: "primary",
    })

    expect(
      buildStudentQrScanBanner({
        cameraMode: "manual",
        cameraPermissionState: "DENIED",
        hasQrPayload: false,
        isPreparingCamera: false,
      }),
    ).toMatchObject({
      title: "Camera denied",
      tone: "warning",
    })

    expect(
      buildStudentQrScanBanner({
        cameraMode: "manual",
        cameraPermissionState: "GRANTED",
        hasQrPayload: true,
        isPreparingCamera: false,
      }),
    ).toMatchObject({
      title: "QR captured",
      tone: "success",
    })
  })

  it("builds result banners for missing QR payload and successful refresh", () => {
    expect(
      buildStudentAttendanceResultBanner({
        mode: "QR_GPS",
        resultKind: "READY",
        gateModel: trustedGateModel,
        permissionState: "GRANTED",
        selectedCandidate: {
          sessionId: "session_1",
          classroomId: "classroom_1",
          subjectId: "subject_1",
          classroomTitle: "Mathematics",
          lectureId: "lecture_1",
          lectureTitle: "Lecture 1",
          mode: "QR_GPS",
          timestamp: "2026-03-14T09:30:00.000Z",
          requiresTrustedDevice: true,
        },
        scanValue: "",
      }),
    ).toMatchObject({
      title: "QR payload required",
      tone: "warning",
    })

    expect(
      buildStudentAttendanceResultBanner({
        mode: "BLUETOOTH",
        resultKind: "SUCCESS",
        gateModel: trustedGateModel,
        permissionState: "GRANTED",
        selectedCandidate: {
          sessionId: "session_2",
          classroomId: "classroom_2",
          subjectId: "subject_2",
          classroomTitle: "Physics",
          lectureId: "lecture_2",
          lectureTitle: "Lecture 2",
          mode: "BLUETOOTH",
          timestamp: "2026-03-14T10:30:00.000Z",
          requiresTrustedDevice: true,
        },
        scanValue: "",
      }),
    ).toMatchObject({
      title: "Attendance marked",
      tone: "success",
    })
  })

  it("surfaces permission and candidate blockers before attendance submission", () => {
    expect(
      buildStudentAttendanceResultBanner({
        mode: "BLUETOOTH",
        resultKind: "ERROR",
        gateModel: trustedGateModel,
        permissionState: "DENIED",
        selectedCandidate: {
          sessionId: "session_2",
          classroomId: "classroom_2",
          subjectId: "subject_2",
          classroomTitle: "Physics",
          lectureId: "lecture_2",
          lectureTitle: "Lecture 2",
          mode: "BLUETOOTH",
          timestamp: "2026-03-14T10:30:00.000Z",
          requiresTrustedDevice: true,
        },
        scanValue: "",
      }),
    ).toMatchObject({
      title: "Attendance blocked by permissions",
      tone: "danger",
    })

    expect(
      buildStudentAttendanceResultBanner({
        mode: "BLUETOOTH",
        resultKind: "ERROR",
        gateModel: trustedGateModel,
        permissionState: "GRANTED",
        selectedCandidate: null,
        scanValue: "",
      }),
    ).toMatchObject({
      title: "No attendance session open",
      tone: "warning",
    })
  })

  it("asks for location before QR attendance can be submitted", () => {
    expect(
      buildStudentAttendanceResultBanner({
        mode: "QR_GPS",
        resultKind: "ERROR",
        gateModel: trustedGateModel,
        permissionState: "PENDING_REQUEST",
        selectedCandidate: {
          sessionId: "session_1",
          classroomId: "classroom_1",
          subjectId: "subject_1",
          classroomTitle: "Mathematics",
          lectureId: "lecture_1",
          lectureTitle: "Lecture 1",
          mode: "QR_GPS",
          timestamp: "2026-03-14T09:30:00.000Z",
          requiresTrustedDevice: true,
        },
        scanValue: "ROLLING-PAYLOAD",
      }),
    ).toMatchObject({
      title: "Location needed",
      tone: "warning",
    })
  })

  it("builds controller snapshots for blocked and ready attendance states", () => {
    const blocked = buildStudentAttendanceControllerSnapshot({
      mode: "QR_GPS",
      gateModel: {
        title: "Attendance blocked",
        message: "Blocked",
        tone: "danger",
        supportHint: "Open support",
        canContinue: false,
      },
      permissionState: "GRANTED",
      selectedCandidate: null,
      scanValue: "",
      resultKind: "ERROR",
    })

    expect(blocked.canPrepareSubmission).toBe(false)
    expect(blocked.resultBanner).toMatchObject({
      title: "Attendance blocked",
      tone: "danger",
    })

    const ready = buildStudentAttendanceControllerSnapshot({
      mode: "QR_GPS",
      gateModel: trustedGateModel,
      permissionState: "GRANTED",
      selectedCandidate: {
        sessionId: "session_1",
        classroomId: "classroom_1",
        subjectId: "subject_1",
        classroomTitle: "Mathematics",
        lectureId: "lecture_1",
        lectureTitle: "Lecture 1",
        mode: "QR_GPS",
        timestamp: "2026-03-14T09:30:00.000Z",
        requiresTrustedDevice: true,
      },
      scanValue: "ROLLING-PAYLOAD",
      resultKind: "READY",
    })

    expect(ready.canPrepareSubmission).toBe(true)
    expect(ready.permissionBanner.tone).toBe("success")
    expect(ready.resultBanner).toMatchObject({
      title: "Ready to submit",
      tone: "success",
    })
  })

  it("resolves qr camera permission state transitions for retry, denial, and unavailable flows", () => {
    expect(
      resolveStudentQrCameraPermissionState({
        currentPermissionState: "PENDING_REQUEST",
        transition: "REQUESTING",
      }),
    ).toBe("PENDING_REQUEST")

    expect(
      resolveStudentQrCameraPermissionState({
        currentPermissionState: "GRANTED",
        transition: "REQUESTING",
      }),
    ).toBe("GRANTED")

    expect(
      resolveStudentQrCameraPermissionState({
        currentPermissionState: "PENDING_REQUEST",
        transition: "DENIED",
      }),
    ).toBe("DENIED")

    expect(
      resolveStudentQrCameraPermissionState({
        currentPermissionState: "PENDING_REQUEST",
        transition: "UNAVAILABLE",
      }),
    ).toBe("UNAVAILABLE")
  })

  it("maps QR mark API errors into student-facing attendance banners", () => {
    expect(
      buildStudentQrAttendanceErrorBanner(
        new AuthApiClientError("Conflict", 409, {
          message: "The QR token has expired.",
        }),
      ),
    ).toMatchObject({
      title: "QR expired",
      tone: "warning",
    })

    expect(
      buildStudentQrAttendanceErrorBanner(
        new AuthApiClientError("Bad Request", 400, {
          message: "The QR token is invalid for this session.",
        }),
      ),
    ).toMatchObject({
      title: "Invalid QR",
      tone: "danger",
    })

    expect(
      buildStudentQrAttendanceErrorBanner(
        new AuthApiClientError("Forbidden", 403, {
          message: "The device is outside the allowed attendance radius.",
        }),
      ),
    ).toMatchObject({
      title: "Outside allowed range",
      tone: "danger",
    })

    expect(
      buildStudentQrAttendanceErrorBanner(
        new AuthApiClientError("Conflict", 409, {
          message: "Attendance has already been marked for this session.",
        }),
      ),
    ).toMatchObject({
      title: "Attendance already marked",
      tone: "warning",
    })

    expect(
      buildStudentQrAttendanceErrorBanner(
        new AuthApiClientError("Conflict", 409, {
          message: "This attendance session is not active.",
        }),
      ),
    ).toMatchObject({
      title: "Session closed",
      tone: "warning",
    })

    expect(
      buildStudentQrAttendanceErrorBanner(
        new AuthApiClientError("Bad Request", 400, {
          message: "The current location accuracy is too low.",
        }),
      ),
    ).toMatchObject({
      title: "Location accuracy too low",
      tone: "warning",
    })
  })

  it("maps Bluetooth mark API errors into student-facing attendance banners", () => {
    expect(
      buildStudentBluetoothAttendanceErrorBanner(
        new AuthApiClientError("Conflict", 409, {
          message: "The Bluetooth attendance token has expired.",
        }),
      ),
    ).toMatchObject({
      title: "Bluetooth token expired",
      tone: "warning",
    })

    expect(
      buildStudentBluetoothAttendanceErrorBanner(
        new AuthApiClientError("Bad Request", 400, {
          message: "The Bluetooth attendance payload is invalid for this session.",
        }),
      ),
    ).toMatchObject({
      title: "Invalid Bluetooth session",
      tone: "danger",
    })

    expect(
      buildStudentBluetoothAttendanceErrorBanner(
        new AuthApiClientError("Conflict", 409, {
          message: "This attendance session is not active.",
        }),
      ),
    ).toMatchObject({
      title: "Session closed",
      tone: "warning",
    })

    expect(
      buildStudentBluetoothAttendanceErrorBanner(
        new AuthApiClientError("Conflict", 409, {
          message: "Attendance has already been marked for this session.",
        }),
      ),
    ).toMatchObject({
      title: "Attendance already marked",
      tone: "warning",
    })
  })

  it("builds QR location banners and submission payloads from captured location", () => {
    expect(
      buildStudentQrLocationBanner({
        locationState: "IDLE",
        location: null,
      }),
    ).toMatchObject({
      title: "Location needed",
      tone: "warning",
    })

    expect(
      buildStudentQrLocationBanner({
        locationState: "READY",
        location: {
          latitude: 28.6139,
          longitude: 77.209,
          accuracyMeters: 12.4,
          capturedAt: "2026-03-14T10:00:00.000Z",
        },
      }),
    ).toMatchObject({
      title: "Location ready",
      tone: "success",
    })

    expect(
      buildStudentQrMarkRequest({
        qrPayload: "ROLLING-PAYLOAD",
        location: {
          latitude: 28.6139,
          longitude: 77.209,
          accuracyMeters: 12.4,
          capturedAt: "2026-03-14T10:00:00.000Z",
        },
      }),
    ).toEqual({
      qrPayload: "ROLLING-PAYLOAD",
      latitude: 28.6139,
      longitude: 77.209,
      accuracyMeters: 12.4,
      deviceTimestamp: "2026-03-14T10:00:00.000Z",
    })

    expect(
      buildStudentBluetoothMarkRequest({
        detectedPayload: "BLE-PAYLOAD",
        rssi: -52,
        deviceTimestamp: "2026-03-14T10:00:01.000Z",
      }),
    ).toEqual({
      detectedPayload: "BLE-PAYLOAD",
      rssi: -52,
      deviceTimestamp: "2026-03-14T10:00:01.000Z",
    })
  })
})
