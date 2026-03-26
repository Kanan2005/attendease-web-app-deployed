# Running the Mobile App on a USB-Connected Android Device (via ADB)

This guide covers how to run the AttendEase mobile app on a physical Android device or emulator connected via USB, using ADB for port forwarding.

## Prerequisites

- Node.js >= 22.12 (project uses v23.9.0)
- pnpm 9.12.3
- Android device with USB debugging enabled, OR Android emulator running
- ADB installed (comes with Android SDK / Android Studio)

## 1. Start Backend Services

### Start Docker (PostgreSQL + Redis)

```bash
docker compose up -d
```

### Start the API Server

```bash
cd apps/api
pnpm dev
```

Runs on `http://localhost:4000`. Verify with `curl http://localhost:4000/health`.

## 2. Set Up ADB Port Forwarding

The Android device/emulator can't reach your Mac's `localhost` directly. Use `adb reverse` to tunnel ports from the device back to your Mac:

```bash
# API server (required for sign-in and all API calls)
adb reverse tcp:4000 tcp:4000

# Metro bundler (required for JS bundle loading and hot-reload)
adb reverse tcp:8081 tcp:8081
```

**Important:** These port forwards are lost when:
- The device/emulator is restarted
- The USB cable is disconnected
- ADB server is restarted
- The API server process is killed and restarted

Always re-run `adb reverse` after any of these events.

### Verify ADB Forwarding

```bash
adb reverse --list
# Should show:
# (reverse) tcp:4000 tcp:4000
# (reverse) tcp:8081 tcp:8081
```

## 3. Start Metro Bundler

```bash
cd apps/mobile
npx expo start --port 8081
```

If port 8081 is already in use, either kill the old process or use a different port (but update `adb reverse` accordingly).

### If Using a Custom Port (e.g., 8101)

```bash
npx expo start --port 8101
adb reverse tcp:8101 tcp:8101
```

## 4. Run the App on the Device

### Option A: From Metro Menu

Once Metro is running, press `a` in the terminal to launch on Android.

### Option B: Manual Install + Launch

```bash
cd apps/mobile
npx expo run:android --device
```

### Option C: Using the Project Script (Emulator)

```bash
pnpm manual:mobile:emulator -- --device emulator-5554 --port 8101
```

Then set up port forwarding:

```bash
adb reverse tcp:4000 tcp:4000
adb reverse tcp:8101 tcp:8101
```

## 5. Verify Everything Works

1. **Metro connected:** The app should load the JS bundle (not show a red error screen)
2. **API reachable:** Sign-in should work (no "Network request failed" error)
3. **Hot-reload working:** Edit a `.tsx` file and save — changes should appear on device within seconds

## Troubleshooting

### "Network request failed" on Sign-in

API port forwarding is missing or the API server isn't running.

```bash
# Check API is running
lsof -i :4000 | grep LISTEN

# Re-establish port forwarding
adb reverse tcp:4000 tcp:4000
```

### App Shows Red Error Screen / Can't Load Bundle

Metro port forwarding is missing or Metro isn't running.

```bash
# Check Metro is running
lsof -i :8081 | grep LISTEN

# Re-establish port forwarding
adb reverse tcp:8081 tcp:8081
```

### "No connected devices" from ADB

```bash
# List connected devices
adb devices

# If empty, check:
# - USB cable is connected
# - USB debugging is enabled on the device
# - You accepted the "Allow USB debugging" prompt on the device
```

### Native Module Changes (e.g., Kotlin BLE code)

JS-only changes hot-reload automatically. But if you edit native code (e.g., `AttendeaseBluetoothModule.kt`), you must rebuild:

```bash
cd apps/mobile
npx expo run:android --device
```

### BLE-Specific: Permission Issues

On Android 12+ (API 31+), BLE requires runtime permissions. The app requests them automatically, but if denied, go to:

**Settings > Apps > AttendEase > Permissions > Nearby devices > Allow**

## Environment Files

The mobile app loads `.env.local` from `apps/mobile/`. Key variables:

| Variable | Purpose | Example |
|---|---|---|
| `EXPO_PUBLIC_API_URL` | API base URL | `http://localhost:4000` |
| `EXPO_PUBLIC_ATTENDANCE_BLUETOOTH_SERVICE_UUID` | BLE service UUID | `12345678-1234-5678-1234-56789abc0001` |
| `EXPO_PUBLIC_TEACHER_DEV_EMAIL` | Auto-fill teacher login | `teacher@attendease.dev` |
| `EXPO_PUBLIC_STUDENT_DEV_EMAIL` | Auto-fill student login | `student.one@attendease.dev` |

## Test Credentials

| Role | Email | Password |
|---|---|---|
| Teacher | `teacher@attendease.dev` | `TeacherPass123!` |
| Student | `student.one@attendease.dev` | `StudentOnePass123!` |
| Admin | `admin@attendease.dev` | `AdminPass123!` |

## Quick Start Checklist

```bash
# 1. Start Docker
docker compose up -d

# 2. Start API
cd apps/api && pnpm dev &

# 3. Start Metro
cd apps/mobile && npx expo start --port 8081 &

# 4. Set up ADB forwarding
adb reverse tcp:4000 tcp:4000
adb reverse tcp:8081 tcp:8081

# 5. Launch app (press 'a' in Metro terminal, or run:)
# npx expo run:android --device
```
