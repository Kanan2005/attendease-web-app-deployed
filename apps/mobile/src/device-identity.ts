import * as FileSystem from "expo-file-system"
import { Platform } from "react-native"

import type { DeviceIdentity } from "./device-identity-models"

// Re-export all pure model types and functions for consumers.
export type {
  DeviceIdentity,
  DeviceIdentityState,
  DeviceBindingErrorKind,
  DeviceBindingErrorModel,
} from "./device-identity-models"
export {
  buildPlaceholderDeviceIdentity,
  classifyDeviceBindingError,
  buildDeviceBindingErrorModel,
} from "./device-identity-models"

const INSTALL_ID_FILENAME = "attendease-install-id.txt"

function getInstallIdPath(): string {
  const baseDir = (FileSystem as Record<string, unknown>).documentDirectory as string | null
  return `${baseDir ?? ""}${INSTALL_ID_FILENAME}`
}

function generateInstallId(): string {
  // Use crypto.randomUUID if available (Hermes in RN 0.83+), otherwise fallback
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return `install-${globalThis.crypto.randomUUID()}`
  }

  // Fallback: timestamp + random hex
  const timestamp = Date.now().toString(36)
  const random = Array.from({ length: 16 }, () => Math.floor(Math.random() * 16).toString(16)).join(
    "",
  )
  return `install-${timestamp}-${random}`
}

function derivePublicKey(installId: string): string {
  // Deterministic placeholder key derived from installId.
  // Real RSA/EC key generation requires expo-crypto or native module.
  let hash = 0
  for (let i = 0; i < installId.length; i++) {
    hash = ((hash << 5) - hash + installId.charCodeAt(i)) | 0
  }
  return `pk-${Math.abs(hash).toString(36)}-${installId.slice(-8)}`
}

function resolvePlatform(): DeviceIdentity["platform"] {
  if (Platform.OS === "android") return "ANDROID"
  if (Platform.OS === "ios") return "IOS"
  return "WEB"
}

export async function resolveDeviceIdentity(): Promise<DeviceIdentity> {
  const filePath = getInstallIdPath()
  let installId: string | null = null

  try {
    const info = await FileSystem.getInfoAsync(filePath)
    if (info.exists) {
      const stored = await FileSystem.readAsStringAsync(filePath)
      if (stored && stored.trim().length >= 8) {
        installId = stored.trim()
      }
    }
  } catch {
    // File read failed — will generate a new one
  }

  if (!installId) {
    installId = generateInstallId()
    try {
      await FileSystem.writeAsStringAsync(filePath, installId)
    } catch {
      // Persist failed — identity still usable for this session
    }
  }

  const platform = resolvePlatform()

  return {
    installId,
    publicKey: derivePublicKey(installId),
    platform,
    deviceModel:
      Platform.OS === "web"
        ? null
        : (((Platform.constants as Record<string, unknown> | undefined)?.Model ?? null) as
            | string
            | null),
    osVersion: String(Platform.Version ?? "unknown"),
    appVersion: "0.1.0",
    resolved: true,
  }
}
