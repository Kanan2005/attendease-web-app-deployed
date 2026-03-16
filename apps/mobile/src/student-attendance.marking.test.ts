import { AuthApiClientError } from "@attendease/auth"
import { describe, expect, it } from "vitest"

import {
  buildStudentBluetoothAttendanceErrorBanner,
  buildStudentBluetoothMarkRequest,
  buildStudentQrAttendanceErrorBanner,
  buildStudentQrMarkRequest,
} from "./student-attendance.js"

describe("student attendance marking helpers", () => {
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

  it("builds QR and Bluetooth submission payloads from captured inputs", () => {
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
