import { describe, expect, it } from "vitest"

import {
  buildStudentAttendanceControllerSnapshot,
  buildStudentAttendancePermissionBanner,
  buildStudentAttendanceResultBanner,
  buildStudentQrLocationBanner,
  buildStudentQrScanBanner,
  resolveStudentQrCameraPermissionState,
} from "./student-attendance.js"
import {
  bluetoothCandidate,
  qrCandidate,
  trustedGateModel,
} from "./student-attendance.test-fixtures.js"

describe("student attendance banner helpers", () => {
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

  it("builds result banners for ready, blocked, and successful states", () => {
    expect(
      buildStudentAttendanceResultBanner({
        mode: "QR_GPS",
        resultKind: "READY",
        gateModel: trustedGateModel,
        permissionState: "GRANTED",
        selectedCandidate: qrCandidate,
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
        selectedCandidate: bluetoothCandidate,
        scanValue: "",
      }),
    ).toMatchObject({
      title: "Attendance marked",
      tone: "success",
    })

    expect(
      buildStudentAttendanceResultBanner({
        mode: "BLUETOOTH",
        resultKind: "ERROR",
        gateModel: trustedGateModel,
        permissionState: "DENIED",
        selectedCandidate: bluetoothCandidate,
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
        selectedCandidate: qrCandidate,
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
      selectedCandidate: qrCandidate,
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

  it("builds QR location banners from captured state", () => {
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
  })
})
