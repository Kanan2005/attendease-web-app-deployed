export const emulatorDefaults = {
  metroPort: 8101,
  apiPort: 4000,
  apiHost: "127.0.0.1",
  host: "localhost",
}

export function resolveEmulatorApiUrl(options = {}) {
  const apiHost = options.apiHost ?? emulatorDefaults.apiHost
  const apiPort = Number(options.apiPort ?? emulatorDefaults.apiPort)

  return `http://${apiHost}:${apiPort}`
}

export function buildAdbReverseArgs(port, deviceSerial) {
  const prefix = deviceSerial ? ["-s", deviceSerial] : []
  return [...prefix, "reverse", `tcp:${port}`, `tcp:${port}`]
}

export function buildEmulatorLaunchPlan(options = {}) {
  const metroPort = Number(options.metroPort ?? emulatorDefaults.metroPort)
  const apiPort = Number(options.apiPort ?? emulatorDefaults.apiPort)
  const deviceSerial = options.deviceSerial ?? null
  const apiUrl = resolveEmulatorApiUrl(options)

  return {
    apiUrl,
    metroPort,
    apiPort,
    deviceSerial,
    reverseCommands: [
      buildAdbReverseArgs(metroPort, deviceSerial),
      buildAdbReverseArgs(apiPort, deviceSerial),
    ],
    expoArgs: [
      "--filter",
      "@attendease/mobile",
      "exec",
      "expo",
      "start",
      "--clear",
      "--host",
      options.host ?? emulatorDefaults.host,
      "--port",
      String(metroPort),
    ],
  }
}
