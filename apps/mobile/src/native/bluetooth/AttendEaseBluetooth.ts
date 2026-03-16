import type { EventSubscription } from "expo-modules-core"
import { Platform, requireOptionalNativeModule } from "expo-modules-core"

import type {
  BluetoothAdvertiserConfig,
  BluetoothAdvertiserStartResult,
  BluetoothAdvertiserStateEvent,
  BluetoothAdvertiserStopResult,
  BluetoothAvailability,
  BluetoothDetection,
  BluetoothScannerConfig,
  BluetoothScannerStartResult,
  BluetoothScannerStateEvent,
  BluetoothScannerStopResult,
} from "./types"

type NativeBluetoothModule = {
  getAvailability(): Promise<BluetoothAvailability>
  startAdvertising(config: BluetoothAdvertiserConfig): Promise<BluetoothAdvertiserStartResult>
  stopAdvertising(): Promise<BluetoothAdvertiserStopResult>
  startScanning(config: BluetoothScannerConfig): Promise<BluetoothScannerStartResult>
  stopScanning(): Promise<BluetoothScannerStopResult>
}

type BluetoothModuleEvents = {
  onDetection: (event: BluetoothDetection) => void
  onAdvertiserState: (event: BluetoothAdvertiserStateEvent) => void
  onScannerState: (event: BluetoothScannerStateEvent) => void
}

type NativeBluetoothEventModule = NativeBluetoothModule & {
  addListener<EventName extends keyof BluetoothModuleEvents>(
    eventName: EventName,
    listener: BluetoothModuleEvents[EventName],
  ): EventSubscription
}

const unsupportedAvailability: BluetoothAvailability = {
  supported: false,
  poweredOn: false,
  canAdvertise: false,
  canScan: false,
}

const nativeModule =
  Platform.OS === "web"
    ? null
    : requireOptionalNativeModule<NativeBluetoothEventModule>("AttendeaseBluetooth")

export const AttendEaseBluetooth = {
  async getAvailability(): Promise<BluetoothAvailability> {
    if (!nativeModule) {
      return unsupportedAvailability
    }

    return nativeModule.getAvailability()
  },
  async startAdvertising(
    config: BluetoothAdvertiserConfig,
  ): Promise<BluetoothAdvertiserStartResult> {
    if (!nativeModule) {
      return {
        state: "UNAVAILABLE",
      }
    }

    return nativeModule.startAdvertising(config)
  },
  async stopAdvertising(): Promise<BluetoothAdvertiserStopResult> {
    if (!nativeModule) {
      return {
        state: "STOPPED",
      }
    }

    return nativeModule.stopAdvertising()
  },
  async startScanning(config: BluetoothScannerConfig): Promise<BluetoothScannerStartResult> {
    if (!nativeModule) {
      return {
        state: "UNAVAILABLE",
      }
    }

    return nativeModule.startScanning(config)
  },
  async stopScanning(): Promise<BluetoothScannerStopResult> {
    if (!nativeModule) {
      return {
        state: "STOPPED",
      }
    }

    return nativeModule.stopScanning()
  },
  subscribeToDetections(listener: (event: BluetoothDetection) => void) {
    if (!nativeModule) {
      return () => undefined
    }

    const subscription: EventSubscription = nativeModule.addListener("onDetection", listener)

    return () => {
      subscription.remove()
    }
  },
  subscribeToAdvertiserState(listener: (event: BluetoothAdvertiserStateEvent) => void) {
    if (!nativeModule) {
      return () => undefined
    }

    const subscription: EventSubscription = nativeModule.addListener("onAdvertiserState", listener)

    return () => {
      subscription.remove()
    }
  },
  subscribeToScannerState(listener: (event: BluetoothScannerStateEvent) => void) {
    if (!nativeModule) {
      return () => undefined
    }

    const subscription: EventSubscription = nativeModule.addListener("onScannerState", listener)

    return () => {
      subscription.remove()
    }
  },
}
