import { describe, expect, it, vi } from "vitest"

vi.mock("react-native", () => ({
  Platform: { OS: "ios", select: vi.fn((obj: Record<string, unknown>) => obj.ios) },
  PermissionsAndroid: { request: vi.fn(), RESULTS: { GRANTED: "granted" }, PERMISSIONS: {} },
}))

vi.mock("./native/bluetooth", () => ({
  AttendEaseBluetooth: {
    getAvailability: vi.fn(),
    startAdvertising: vi.fn(),
    stopAdvertising: vi.fn(),
    startScanning: vi.fn(),
    stopScanning: vi.fn(),
    subscribeToDetections: vi.fn(() => () => undefined),
    subscribeToAdvertiserState: vi.fn(() => () => undefined),
    subscribeToScannerState: vi.fn(() => () => undefined),
  },
}))

import {
  buildStudentBluetoothDetectionBanner,
  buildStudentBluetoothScannerBanner,
  buildStudentBluetoothSubmissionBanner,
  canStartBluetoothAdvertising,
  canStartBluetoothScanning,
  dedupeBluetoothDetections,
  describeBluetoothAdvertiserFailure,
  describeBluetoothScannerFailure,
  describeBluetoothSignalStrength,
  mapBluetoothAdvertiserEventToRuntimeState,
  mapBluetoothAvailabilityToPermissionState,
  mapBluetoothScannerEventToRuntimeState,
  resolveBluetoothAdvertiserFailureState,
  resolveBluetoothScannerFailureState,
  resolveSelectedBluetoothDetection,
} from "./bluetooth-attendance"

describe("bluetooth attendance mobile helpers", () => {
  it("maps Bluetooth availability into student permission states", () => {
    expect(
      mapBluetoothAvailabilityToPermissionState({
        supported: true,
        poweredOn: true,
        canAdvertise: true,
        canScan: true,
      }),
    ).toBe("GRANTED")

    expect(
      mapBluetoothAvailabilityToPermissionState({
        supported: true,
        poweredOn: false,
        canAdvertise: true,
        canScan: true,
      }),
    ).toBe("DENIED")

    expect(
      mapBluetoothAvailabilityToPermissionState({
        supported: false,
        poweredOn: false,
        canAdvertise: false,
        canScan: false,
      }),
    ).toBe("UNAVAILABLE")
  })

  it("uses Bluetooth availability to gate advertiser and scanner start attempts", () => {
    expect(
      canStartBluetoothAdvertising({
        supported: true,
        poweredOn: true,
        canAdvertise: true,
        canScan: false,
      }),
    ).toBe(true)

    expect(
      canStartBluetoothAdvertising({
        supported: true,
        poweredOn: false,
        canAdvertise: true,
        canScan: true,
      }),
    ).toBe(false)

    expect(
      canStartBluetoothScanning({
        supported: true,
        poweredOn: true,
        canAdvertise: false,
        canScan: true,
      }),
    ).toBe(true)

    expect(
      canStartBluetoothScanning({
        supported: false,
        poweredOn: true,
        canAdvertise: true,
        canScan: true,
      }),
    ).toBe(false)
  })

  it("maps advertiser and scanner events into mobile runtime states", () => {
    expect(mapBluetoothAdvertiserEventToRuntimeState({ state: "ADVERTISING" })).toBe("ADVERTISING")
    expect(mapBluetoothAdvertiserEventToRuntimeState({ state: "UNAVAILABLE" })).toBe(
      "PERMISSION_REQUIRED",
    )
    expect(mapBluetoothScannerEventToRuntimeState({ state: "SCANNING" })).toBe("SCANNING")
    expect(mapBluetoothScannerEventToRuntimeState({ state: "FAILED" })).toBe("FAILED")
  })

  it("deduplicates repeated BLE detections by payload", () => {
    expect(
      dedupeBluetoothDetections([
        {
          payload: "payload-1",
          rssi: -50,
          serviceUuid: "12345678-1234-5678-1234-56789abc0001",
          detectedAt: 1,
        },
        {
          payload: "payload-1",
          rssi: -49,
          serviceUuid: "12345678-1234-5678-1234-56789abc0001",
          detectedAt: 2,
        },
        {
          payload: "payload-2",
          rssi: -55,
          serviceUuid: "12345678-1234-5678-1234-56789abc0001",
          detectedAt: 3,
        },
      ]),
    ).toEqual([
      {
        payload: "payload-1",
        rssi: -50,
        serviceUuid: "12345678-1234-5678-1234-56789abc0001",
        detectedAt: 1,
      },
      {
        payload: "payload-2",
        rssi: -55,
        serviceUuid: "12345678-1234-5678-1234-56789abc0001",
        detectedAt: 3,
      },
    ])
  })

  it("keeps a selected BLE detection when still present and falls back cleanly when it disappears", () => {
    const detections = [
      {
        payload: "payload-1",
        rssi: -50,
        serviceUuid: "12345678-1234-5678-1234-56789abc0001",
        detectedAt: 1,
      },
      {
        payload: "payload-2",
        rssi: -55,
        serviceUuid: "12345678-1234-5678-1234-56789abc0001",
        detectedAt: 2,
      },
    ]

    expect(
      resolveSelectedBluetoothDetection({
        detections,
        selectedPayload: "payload-2",
      }),
    ).toEqual(detections[1])

    expect(
      resolveSelectedBluetoothDetection({
        detections,
        selectedPayload: "missing-payload",
      }),
    ).toEqual(detections[0])

    expect(
      resolveSelectedBluetoothDetection({
        detections: [],
        selectedPayload: "payload-2",
      }),
    ).toBeNull()
  })

  it("builds Bluetooth scan banners for unavailable, powered-off, and scanning states", () => {
    expect(
      buildStudentBluetoothScannerBanner({
        availability: {
          supported: false,
          poweredOn: false,
          canAdvertise: false,
          canScan: false,
        },
        state: "IDLE",
      }),
    ).toMatchObject({
      title: "Bluetooth unavailable",
      tone: "danger",
    })

    expect(
      buildStudentBluetoothScannerBanner({
        availability: {
          supported: true,
          poweredOn: false,
          canAdvertise: false,
          canScan: true,
        },
        state: "PERMISSION_REQUIRED",
      }),
    ).toMatchObject({
      title: "Turn on Bluetooth",
      tone: "warning",
    })

    expect(
      buildStudentBluetoothScannerBanner({
        availability: {
          supported: true,
          poweredOn: true,
          canAdvertise: false,
          canScan: true,
        },
        state: "SCANNING",
      }),
    ).toMatchObject({
      title: "Scanning nearby",
      tone: "primary",
    })
  })

  it("builds Bluetooth detection and submission banners for no detections, one teacher, and multi-session selection", () => {
    expect(
      buildStudentBluetoothDetectionBanner({
        detectionCount: 0,
        scannerState: "SCANNING",
        selectedDetection: null,
      }),
    ).toMatchObject({
      title: "No teacher found yet",
      tone: "warning",
    })

    expect(
      buildStudentBluetoothDetectionBanner({
        detectionCount: 1,
        scannerState: "SCANNING",
        selectedDetection: {
          rssi: -54,
        },
      }),
    ).toMatchObject({
      title: "Teacher found nearby",
      tone: "success",
    })

    expect(
      buildStudentBluetoothDetectionBanner({
        detectionCount: 2,
        scannerState: "SCANNING",
        selectedDetection: {
          rssi: -68,
        },
      }),
    ).toMatchObject({
      title: "Choose the right teacher",
      tone: "warning",
    })

    expect(
      buildStudentBluetoothSubmissionBanner({
        detectionCount: 0,
        selectedDetection: null,
        canPrepareSubmission: false,
        hasSelectedCandidate: true,
        gateCanContinue: true,
      }),
    ).toMatchObject({
      title: "Nearby teacher needed",
      tone: "warning",
    })

    expect(
      buildStudentBluetoothSubmissionBanner({
        detectionCount: 2,
        selectedDetection: {
          rssi: -59,
        },
        canPrepareSubmission: true,
        hasSelectedCandidate: true,
        gateCanContinue: true,
      }),
    ).toMatchObject({
      title: "Check the selected teacher",
      tone: "warning",
    })

    expect(
      buildStudentBluetoothSubmissionBanner({
        detectionCount: 1,
        selectedDetection: {
          rssi: -59,
        },
        canPrepareSubmission: true,
        hasSelectedCandidate: true,
        gateCanContinue: true,
      }),
    ).toMatchObject({
      title: "Ready to mark",
      tone: "success",
    })
  })

  it("describes signal strength without leaking raw Bluetooth internals into the primary UX copy", () => {
    expect(describeBluetoothSignalStrength(-48)).toBe("Strong nearby signal")
    expect(describeBluetoothSignalStrength(-67)).toBe("Nearby signal")
    expect(describeBluetoothSignalStrength(-82)).toBe("Weak signal")
    expect(describeBluetoothSignalStrength(null)).toBe("Signal strength unavailable")
  })

  it("normalizes raw Android Bluetooth permission failures into student-friendly guidance", () => {
    const permissionError = new Error(
      "Call to function 'AttendeaseBluetooth.startScanning' has been rejected. Caused by: java.lang.SecurityException: Need android.permission.BLUETOOTH_SCAN permission",
    )

    expect(resolveBluetoothScannerFailureState(permissionError)).toBe("PERMISSION_REQUIRED")
    expect(describeBluetoothScannerFailure(permissionError)).toContain("Allow Nearby devices")

    const genericError = new Error("Scanner timeout")

    expect(resolveBluetoothScannerFailureState(genericError)).toBe("FAILED")
    expect(describeBluetoothScannerFailure(genericError)).toBe("Scanner timeout")
  })

  it("normalizes teacher advertiser failures into permission-aware or unsupported guidance", () => {
    const permissionError = new Error(
      "Call to function 'AttendeaseBluetooth.startAdvertising' has been rejected. Caused by: java.lang.SecurityException: Need android.permission.BLUETOOTH_ADVERTISE permission",
    )

    expect(resolveBluetoothAdvertiserFailureState(permissionError)).toBe("PERMISSION_REQUIRED")
    expect(describeBluetoothAdvertiserFailure(permissionError)).toContain("Allow Bluetooth access")

    const unsupportedError = new Error("Bluetooth advertising unavailable on this device")

    expect(resolveBluetoothAdvertiserFailureState(unsupportedError)).toBe("PERMISSION_REQUIRED")
    expect(describeBluetoothAdvertiserFailure(unsupportedError)).toContain(
      "cannot start Bluetooth attendance broadcast",
    )

    const genericError = new Error("Advertiser timeout")

    expect(resolveBluetoothAdvertiserFailureState(genericError)).toBe("FAILED")
    expect(describeBluetoothAdvertiserFailure(genericError)).toBe("Advertiser timeout")
  })
})
