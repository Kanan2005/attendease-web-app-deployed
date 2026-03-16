import { afterEach, describe, expect, it, vi } from "vitest"

async function importBluetoothModule(input: {
  os: "web" | "ios"
  nativeModule?: {
    getAvailability: ReturnType<typeof vi.fn>
    startAdvertising: ReturnType<typeof vi.fn>
    stopAdvertising: ReturnType<typeof vi.fn>
    startScanning: ReturnType<typeof vi.fn>
    stopScanning: ReturnType<typeof vi.fn>
    addListener: ReturnType<typeof vi.fn>
  }
}) {
  vi.resetModules()
  vi.doMock("expo-modules-core", () => ({
    Platform: {
      OS: input.os,
    },
    requireOptionalNativeModule: vi.fn(() => input.nativeModule ?? null),
  }))

  return import("./AttendEaseBluetooth.js")
}

afterEach(() => {
  vi.resetModules()
  vi.doUnmock("expo-modules-core")
})

describe("AttendEaseBluetooth wrapper", () => {
  it("falls back cleanly on web without a native module", async () => {
    const { AttendEaseBluetooth } = await importBluetoothModule({
      os: "web",
    })

    await expect(AttendEaseBluetooth.getAvailability()).resolves.toEqual({
      supported: false,
      poweredOn: false,
      canAdvertise: false,
      canScan: false,
    })
    await expect(
      AttendEaseBluetooth.startAdvertising({
        serviceUuid: "12345678-1234-5678-1234-56789abc0001",
        publicId: "public-id-1",
        seed: "seed-1",
        protocolVersion: 1,
        rotationWindowSeconds: 10,
      }),
    ).resolves.toEqual({
      state: "UNAVAILABLE",
    })
    await expect(
      AttendEaseBluetooth.startScanning({
        serviceUuid: "12345678-1234-5678-1234-56789abc0001",
      }),
    ).resolves.toEqual({
      state: "UNAVAILABLE",
    })
    await expect(AttendEaseBluetooth.stopAdvertising()).resolves.toEqual({
      state: "STOPPED",
    })
    await expect(AttendEaseBluetooth.stopScanning()).resolves.toEqual({
      state: "STOPPED",
    })

    const unsubscribeDetection = AttendEaseBluetooth.subscribeToDetections(() => undefined)
    const unsubscribeAdvertiser = AttendEaseBluetooth.subscribeToAdvertiserState(() => undefined)
    const unsubscribeScanner = AttendEaseBluetooth.subscribeToScannerState(() => undefined)

    expect(() => unsubscribeDetection()).not.toThrow()
    expect(() => unsubscribeAdvertiser()).not.toThrow()
    expect(() => unsubscribeScanner()).not.toThrow()
  })

  it("delegates availability, lifecycle calls, and listener cleanup to the native module", async () => {
    const remove = vi.fn()
    const nativeModule = {
      getAvailability: vi.fn().mockResolvedValue({
        supported: true,
        poweredOn: true,
        canAdvertise: true,
        canScan: true,
      }),
      startAdvertising: vi.fn().mockResolvedValue({ state: "ADVERTISING" }),
      stopAdvertising: vi.fn().mockResolvedValue({ state: "STOPPED" }),
      startScanning: vi.fn().mockResolvedValue({ state: "SCANNING" }),
      stopScanning: vi.fn().mockResolvedValue({ state: "STOPPED" }),
      addListener: vi.fn(() => ({
        remove,
      })),
    }

    const { AttendEaseBluetooth } = await importBluetoothModule({
      os: "ios",
      nativeModule,
    })

    await expect(AttendEaseBluetooth.getAvailability()).resolves.toEqual({
      supported: true,
      poweredOn: true,
      canAdvertise: true,
      canScan: true,
    })

    await expect(
      AttendEaseBluetooth.startAdvertising({
        serviceUuid: "12345678-1234-5678-1234-56789abc0001",
        publicId: "public-id-1",
        seed: "seed-1",
        protocolVersion: 1,
        rotationWindowSeconds: 10,
      }),
    ).resolves.toEqual({ state: "ADVERTISING" })
    await expect(AttendEaseBluetooth.stopAdvertising()).resolves.toEqual({ state: "STOPPED" })
    await expect(
      AttendEaseBluetooth.startScanning({
        serviceUuid: "12345678-1234-5678-1234-56789abc0001",
      }),
    ).resolves.toEqual({ state: "SCANNING" })
    await expect(AttendEaseBluetooth.stopScanning()).resolves.toEqual({ state: "STOPPED" })

    const unsubscribeDetection = AttendEaseBluetooth.subscribeToDetections(() => undefined)
    const unsubscribeAdvertiser = AttendEaseBluetooth.subscribeToAdvertiserState(() => undefined)
    const unsubscribeScanner = AttendEaseBluetooth.subscribeToScannerState(() => undefined)

    expect(nativeModule.addListener).toHaveBeenCalledWith("onDetection", expect.any(Function))
    expect(nativeModule.addListener).toHaveBeenCalledWith("onAdvertiserState", expect.any(Function))
    expect(nativeModule.addListener).toHaveBeenCalledWith("onScannerState", expect.any(Function))

    unsubscribeDetection()
    unsubscribeAdvertiser()
    unsubscribeScanner()
    expect(remove).toHaveBeenCalledTimes(3)
  })
})
