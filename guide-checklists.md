# AttendEase Checklists

## Website Checks

- Open `http://localhost:3000/login` for teacher sign in.
- Open `http://localhost:3000/register` for teacher registration.
- Open `http://localhost:3000/admin/login` for admin sign in.
- Confirm teacher sign-in redirects to the teacher dashboard.
- Confirm teacher registration redirects to the teacher dashboard.
- Confirm admin sign-in redirects to the admin dashboard.
- Confirm no redirect loops, blank pages, or stale-session errors.

## Teacher Website Checklist

- dashboard loads
- classrooms list opens
- classroom detail opens
- roster page opens
- schedule page opens
- stream page opens
- semesters page opens
- session history page opens
- reports page opens
- exports page opens
- analytics page opens
- email automation page opens
- QR setup page opens
- projector route opens

## Android Emulator Checklist

### Student

- app opens on role-choice landing
- student sign-in opens the student side only
- student registration works with a fresh email
- classroom join flow works
- attendance hub opens
- QR flow shows clean permission and result states
- Bluetooth flow shows scan and result states
- history loads
- reports load
- profile and device status load

### Teacher

- teacher sign-in opens the teacher side only
- teacher registration works with a fresh email
- dashboard loads
- classroom list/detail open
- roster opens
- schedule opens
- Bluetooth session create screen opens
- active Bluetooth session screen opens
- history opens
- reports open

## Real Device Checklist

- repeat the student QR flow on a real phone
- repeat the student Bluetooth flow on real hardware
- verify teacher Bluetooth ownership on a real phone
- verify device trust state transitions on a real phone
- confirm GPS/range behavior with real location services

## Reporting Back

- capture exact screen or route
- record `PASS`, `FAIL`, `BLOCKED`, or `MANUAL-REQUIRED`
- include repro steps for every failure
- separate emulator-only proof from real-device proof
