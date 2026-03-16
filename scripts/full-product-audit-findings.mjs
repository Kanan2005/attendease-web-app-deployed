export const auditFindingsBySurface = {
  "Student Mobile": [
    "The core student journey is now short and intentional: entry, sign in, enrolled classrooms, attendance, and reports all speak in product language.",
    "QR and Bluetooth routes are clean on emulator, but final attendance proof still needs real-device camera, GPS accuracy, and BLE proximity validation.",
    "Profile and device-status stay student-facing instead of exposing recovery tooling.",
  ],
  "Teacher Mobile": [
    "Teacher mobile clearly owns Bluetooth attendance, live roster review, and correction work without sending teachers to the web app for routine classroom tasks.",
    "Home, classroom management, roster, reports, and session history now share one warm premium system instead of scaffold-style cards.",
    "BLE advertiser and nearby student detection still require physical-device signoff beyond emulator coverage.",
  ],
  "Teacher Web": [
    "Teacher web now behaves like a focused portal with a cleaner dashboard, QR setup flow, live projector screen, report review, and manual correction workspace.",
    "The QR live surface is deliberately styled and remains polling-based every 2 seconds; realtime transport is still deferred.",
    "Route islands have been collapsed into clearer classroom, session, and report workspaces.",
  ],
  "Admin Web": [
    "Admin now has a distinct governance surface with separated student support, device recovery, imports, and course governance lanes.",
    "High-risk actions require reason capture and explicit acknowledgement, and destructive governance stays archive-first for audit safety.",
    "Admin remains web-only and intentionally does not inherit teacher flows or student-facing copy.",
  ],
}
