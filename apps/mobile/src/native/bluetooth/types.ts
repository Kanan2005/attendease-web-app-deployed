export type BluetoothAvailability = {
  supported: boolean
  poweredOn: boolean
  canAdvertise: boolean
  canScan: boolean
}

export type BluetoothAdvertiserConfig = {
  serviceUuid: string
  publicId: string
  seed: string
  protocolVersion: number
  rotationWindowSeconds: number
}

export type BluetoothAdvertiserStartResult = {
  state: "ADVERTISING" | "UNAVAILABLE"
  publicId?: string
  serviceUuid?: string
}

export type BluetoothAdvertiserStopResult = {
  state: "STOPPED"
}

export type BluetoothScannerConfig = {
  serviceUuid: string
}

export type BluetoothScannerStartResult = {
  state: "SCANNING" | "UNAVAILABLE"
}

export type BluetoothScannerStopResult = {
  state: "STOPPED"
}

export type BluetoothDetection = {
  payload: string
  rssi: number | null
  serviceUuid: string
  detectedAt: number
}

export type BluetoothAdvertiserStateEvent = {
  state: "ADVERTISING" | "STOPPED" | "FAILED" | "UNAVAILABLE"
  payload?: string
  publicId?: string
  errorCode?: number
  message?: string
  nativeState?: string
}

export type BluetoothScannerStateEvent = {
  state: "SCANNING" | "STOPPED" | "FAILED" | "UNAVAILABLE"
  errorCode?: number
  nativeState?: string
}
