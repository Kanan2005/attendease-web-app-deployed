import type {
  BluetoothAdvertiserStateEvent,
  BluetoothAvailability,
  BluetoothDetection,
  BluetoothScannerStateEvent,
} from "./native/bluetooth"
import type {
  StudentAttendancePermissionBanner,
  StudentAttendancePermissionState,
  StudentAttendanceResultBanner,
} from "./student-attendance"

export type TeacherBluetoothAdvertiserRuntimeState =
  | "IDLE"
  | "READY"
  | "ADVERTISING"
  | "STOPPED"
  | "PERMISSION_REQUIRED"
  | "FAILED"

export type StudentBluetoothScannerRuntimeState =
  | "IDLE"
  | "SCANNING"
  | "STOPPED"
  | "PERMISSION_REQUIRED"
  | "FAILED"

export interface StudentBluetoothScannerBannerInput {
  availability: BluetoothAvailability | null
  state: StudentBluetoothScannerRuntimeState
  errorMessage?: string | null
}

export interface StudentBluetoothDetectionBannerInput {
  detectionCount: number
  scannerState: StudentBluetoothScannerRuntimeState
  selectedDetection: Pick<BluetoothDetection, "rssi"> | null
}

export interface StudentBluetoothSubmissionBannerInput {
  detectionCount: number
  selectedDetection: Pick<BluetoothDetection, "rssi"> | null
  canPrepareSubmission: boolean
  hasSelectedCandidate: boolean
  gateCanContinue: boolean
}

export function mapBluetoothAvailabilityToPermissionState(
  availability: BluetoothAvailability | null,
): StudentAttendancePermissionState {
  if (!availability || !availability.supported || !availability.canScan) {
    return "UNAVAILABLE"
  }

  if (!availability.poweredOn) {
    return "DENIED"
  }

  return "GRANTED"
}

export function canStartBluetoothAdvertising(availability: BluetoothAvailability | null) {
  return Boolean(availability?.supported && availability.poweredOn && availability.canAdvertise)
}

export function canStartBluetoothScanning(availability: BluetoothAvailability | null) {
  return Boolean(availability?.supported && availability.poweredOn && availability.canScan)
}

export function resolveBluetoothAdvertiserFailureState(
  error: unknown,
): TeacherBluetoothAdvertiserRuntimeState {
  const message = error instanceof Error ? error.message.toLowerCase() : ""

  if (
    message.includes("bluetooth_advertise") ||
    message.includes("securityexception") ||
    message.includes("permission") ||
    message.includes("nearby devices") ||
    message.includes("unavailable") ||
    message.includes("unsupported")
  ) {
    return "PERMISSION_REQUIRED"
  }

  return "FAILED"
}

export function describeBluetoothAdvertiserFailure(error: unknown): string {
  const message = error instanceof Error ? error.message : "Bluetooth advertising failed."
  const lowercase = message.toLowerCase()

  if (
    lowercase.includes("bluetooth_advertise") ||
    lowercase.includes("securityexception") ||
    lowercase.includes("permission") ||
    lowercase.includes("nearby devices")
  ) {
    return "Allow Bluetooth access on this phone, then refresh Bluetooth and try broadcasting again."
  }

  if (lowercase.includes("unavailable") || lowercase.includes("unsupported")) {
    return "This phone cannot start Bluetooth attendance broadcast in the current runtime."
  }

  return message
}

export function buildStudentBluetoothScannerBanner(
  input: StudentBluetoothScannerBannerInput,
): StudentAttendancePermissionBanner {
  if (!input.availability) {
    return {
      tone: "warning",
      title: "Checking Bluetooth",
      message: "AttendEase is checking whether this phone can scan for a nearby teacher session.",
    }
  }

  if (!input.availability.supported || !input.availability.canScan) {
    return {
      tone: "danger",
      title: "Bluetooth unavailable",
      message: "This phone cannot scan for Bluetooth attendance sessions on the current build.",
    }
  }

  if (!input.availability.poweredOn) {
    return {
      tone: "warning",
      title: "Turn on Bluetooth",
      message: "Turn on Bluetooth, then refresh or start scanning to look for your teacher nearby.",
    }
  }

  if (input.state === "FAILED") {
    return {
      tone: "danger",
      title: "Bluetooth scan failed",
      message:
        input.errorMessage ??
        "AttendEase could not keep the Bluetooth scan running. Refresh and try again.",
    }
  }

  if (input.state === "PERMISSION_REQUIRED") {
    return {
      tone: "warning",
      title: "Bluetooth needed",
      message:
        input.errorMessage ??
        "Allow Bluetooth scanning on this phone before you try to mark attendance.",
    }
  }

  if (input.state === "SCANNING") {
    return {
      tone: "primary",
      title: "Scanning nearby",
      message: "Keep this phone near your teacher while AttendEase looks for a live session.",
    }
  }

  if (input.state === "STOPPED") {
    return {
      tone: "warning",
      title: "Scan paused",
      message: "Start the scan again when you are ready to look for the teacher nearby.",
    }
  }

  return {
    tone: "primary",
    title: "Ready to scan",
    message: "Bluetooth is available on this phone. Start scanning when your teacher is nearby.",
  }
}

export function describeBluetoothSignalStrength(rssi: number | null): string {
  if (rssi === null) {
    return "Signal strength unavailable"
  }

  if (rssi >= -60) {
    return "Strong nearby signal"
  }

  if (rssi >= -75) {
    return "Nearby signal"
  }

  return "Weak signal"
}

export function buildStudentBluetoothDetectionBanner(
  input: StudentBluetoothDetectionBannerInput,
): StudentAttendanceResultBanner {
  if (input.detectionCount === 0) {
    if (input.scannerState === "SCANNING") {
      return {
        tone: "warning",
        title: "No teacher found yet",
        message: "Keep this phone near your teacher until a live Bluetooth session appears.",
      }
    }

    return {
      tone: "warning",
      title: "No nearby teacher yet",
      message: "Start or refresh the scan when you are near the teacher running attendance.",
    }
  }

  if (input.detectionCount > 1) {
    return {
      tone: "warning",
      title: "Choose the right teacher",
      message:
        "More than one live Bluetooth session is nearby. Choose the strongest or closest teacher before you submit.",
    }
  }

  return {
    tone: "success",
    title: "Teacher found nearby",
    message: `${describeBluetoothSignalStrength(input.selectedDetection?.rssi ?? null)}. Submit attendance when this matches your class.`,
  }
}

export function buildStudentBluetoothSubmissionBanner(
  input: StudentBluetoothSubmissionBannerInput,
): StudentAttendanceResultBanner | null {
  if (!input.gateCanContinue || !input.hasSelectedCandidate) {
    return null
  }

  if (!input.selectedDetection) {
    return {
      tone: "warning",
      title: "Nearby teacher needed",
      message: "Keep this phone near your teacher until AttendEase finds a live Bluetooth session.",
    }
  }

  if (input.detectionCount > 1) {
    return {
      tone: "warning",
      title: "Check the selected teacher",
      message:
        "More than one nearby session is visible. Make sure the selected teacher is the correct one before you mark attendance.",
    }
  }

  if (input.canPrepareSubmission) {
    return {
      tone: "success",
      title: "Ready to mark",
      message: "Your class session and the nearby teacher are ready for Bluetooth attendance.",
    }
  }

  return null
}

export function mapBluetoothAdvertiserEventToRuntimeState(
  event: BluetoothAdvertiserStateEvent,
): TeacherBluetoothAdvertiserRuntimeState {
  switch (event.state) {
    case "ADVERTISING":
      return "ADVERTISING"
    case "FAILED":
      return "FAILED"
    case "UNAVAILABLE":
      return "PERMISSION_REQUIRED"
    case "STOPPED":
      return "STOPPED"
    default:
      return "READY"
  }
}

export function mapBluetoothScannerEventToRuntimeState(
  event: BluetoothScannerStateEvent,
): StudentBluetoothScannerRuntimeState {
  switch (event.state) {
    case "SCANNING":
      return "SCANNING"
    case "FAILED":
      return "FAILED"
    case "UNAVAILABLE":
      return "PERMISSION_REQUIRED"
    case "STOPPED":
      return "STOPPED"
    default:
      return "IDLE"
  }
}

export function resolveBluetoothScannerFailureState(
  error: unknown,
): StudentBluetoothScannerRuntimeState {
  const message = error instanceof Error ? error.message.toLowerCase() : ""

  if (
    message.includes("bluetooth_scan") ||
    message.includes("nearby") ||
    message.includes("securityexception") ||
    message.includes("permission")
  ) {
    return "PERMISSION_REQUIRED"
  }

  return "FAILED"
}

export function describeBluetoothScannerFailure(error: unknown): string {
  const message = error instanceof Error ? error.message : "Bluetooth scanning failed."
  const lowercase = message.toLowerCase()

  if (
    lowercase.includes("bluetooth_scan") ||
    lowercase.includes("nearby") ||
    lowercase.includes("securityexception") ||
    lowercase.includes("permission")
  ) {
    return "Allow Nearby devices or Bluetooth scan access, then refresh Bluetooth and try again."
  }

  return message
}

export function dedupeBluetoothDetections(
  detections: BluetoothDetection[],
  limit = 8,
): BluetoothDetection[] {
  const seen = new Set<string>()
  const nextDetections: BluetoothDetection[] = []

  for (const detection of detections) {
    if (seen.has(detection.payload)) {
      continue
    }

    seen.add(detection.payload)
    nextDetections.push(detection)

    if (nextDetections.length >= limit) {
      break
    }
  }

  return nextDetections
}

export function resolveSelectedBluetoothDetection(input: {
  detections: BluetoothDetection[]
  selectedPayload: string | null
}) {
  if (input.selectedPayload) {
    const matched = input.detections.find(
      (detection) => detection.payload === input.selectedPayload,
    )

    if (matched) {
      return matched
    }
  }

  return input.detections[0] ?? null
}
