import os from "node:os"

function detectLanIp() {
  const interfaces = os.networkInterfaces()

  for (const entries of Object.values(interfaces)) {
    for (const entry of entries ?? []) {
      if (entry.family === "IPv4" && !entry.internal) {
        return entry.address
      }
    }
  }

  return null
}

const lanIp = detectLanIp()
const apiUrl = `http://${lanIp ?? "YOUR_LAN_IP"}:4000`

console.log("AttendEase manual-check info")
console.log("")
console.log(`Detected LAN IP: ${lanIp ?? "not found"}`)
console.log(`Android API URL: ${apiUrl}`)
console.log("Web URL: http://localhost:3000")
console.log("API URL: http://localhost:4000")
console.log("")
console.log("Seeded accounts:")
console.log("- student: student.one@attendease.dev / StudentOnePass123!")
console.log("- teacher: teacher@attendease.dev / TeacherPass123!")
console.log("- admin: admin@attendease.dev / AdminPass123!")
console.log("")
console.log("Student trusted-device seed:")
console.log("- installId: seed-install-student-one")
console.log("- publicKey: seed-public-key-student-one")
console.log("- platform: ANDROID")
console.log("")
console.log("Notes:")
console.log("- BLE checks are best on an Expo dev build, not Expo Go.")
console.log(
  "- If the native BLE module is unavailable, the app now falls back cleanly instead of crashing.",
)
