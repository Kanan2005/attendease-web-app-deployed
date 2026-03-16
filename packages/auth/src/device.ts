import type { TrustedDeviceState } from "@attendease/contracts"

export const trustedDeviceInstallIdHeaderName = "x-attendease-install-id"

export function canStudentMarkAttendanceWithDeviceTrust(state: TrustedDeviceState): boolean {
  return state === "TRUSTED"
}

export function buildTrustedDeviceHeaders(installId: string): Record<string, string> {
  return {
    [trustedDeviceInstallIdHeaderName]: installId,
  }
}
