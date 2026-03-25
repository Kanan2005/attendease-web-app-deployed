// Expo's babel transform only inlines direct process.env.EXPO_PUBLIC_* member
// expressions. Passing `process.env` as an object to a function loses the
// inlining and every key resolves to `undefined` at runtime, causing Zod
// defaults (e.g. http://localhost:4000) to kick in.
//
// This module builds the source object with direct references so the babel
// transform can replace each one with its literal value at bundle time.

import { loadMobileEnv } from "@attendease/config"

export const mobileEnvSource: Record<string, string | undefined> = {
  EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL,
  EXPO_PUBLIC_GOOGLE_OIDC_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_OIDC_CLIENT_ID,
  EXPO_PUBLIC_APP_ENV: process.env.EXPO_PUBLIC_APP_ENV,
  EXPO_PUBLIC_ATTENDANCE_BLUETOOTH_SERVICE_UUID:
    process.env.EXPO_PUBLIC_ATTENDANCE_BLUETOOTH_SERVICE_UUID,
  EXPO_PUBLIC_DEVICE_ATTESTATION_ANDROID_MODE:
    process.env.EXPO_PUBLIC_DEVICE_ATTESTATION_ANDROID_MODE,
  EXPO_PUBLIC_DEVICE_ATTESTATION_APPLE_MODE: process.env.EXPO_PUBLIC_DEVICE_ATTESTATION_APPLE_MODE,
  EXPO_PUBLIC_FEATURE_BLUETOOTH_ATTENDANCE_ENABLED:
    process.env.EXPO_PUBLIC_FEATURE_BLUETOOTH_ATTENDANCE_ENABLED,
  EXPO_PUBLIC_FEATURE_EMAIL_AUTOMATION_ENABLED:
    process.env.EXPO_PUBLIC_FEATURE_EMAIL_AUTOMATION_ENABLED,
  EXPO_PUBLIC_STUDENT_DEV_EMAIL: process.env.EXPO_PUBLIC_STUDENT_DEV_EMAIL,
  EXPO_PUBLIC_STUDENT_DEV_PASSWORD: process.env.EXPO_PUBLIC_STUDENT_DEV_PASSWORD,
  EXPO_PUBLIC_STUDENT_DEV_INSTALL_ID: process.env.EXPO_PUBLIC_STUDENT_DEV_INSTALL_ID,
  EXPO_PUBLIC_STUDENT_DEV_PUBLIC_KEY: process.env.EXPO_PUBLIC_STUDENT_DEV_PUBLIC_KEY,
  EXPO_PUBLIC_STUDENT_DEV_PLATFORM: process.env.EXPO_PUBLIC_STUDENT_DEV_PLATFORM,
  EXPO_PUBLIC_TEACHER_DEV_EMAIL: process.env.EXPO_PUBLIC_TEACHER_DEV_EMAIL,
  EXPO_PUBLIC_TEACHER_DEV_PASSWORD: process.env.EXPO_PUBLIC_TEACHER_DEV_PASSWORD,
  EXPO_PUBLIC_ADMIN_DEV_EMAIL: process.env.EXPO_PUBLIC_ADMIN_DEV_EMAIL,
  EXPO_PUBLIC_ADMIN_DEV_PASSWORD: process.env.EXPO_PUBLIC_ADMIN_DEV_PASSWORD,
}

export const mobileEnv = loadMobileEnv(mobileEnvSource)
