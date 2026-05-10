"use client"

import { useCallback, useEffect, useRef } from "react"

const ACTIVITY_EVENTS: (keyof WindowEventMap)[] = [
  "mousedown",
  "keydown",
  "scroll",
  "touchstart",
  "pointermove",
]

const REFRESH_INTERVAL_MS = 12 * 60 * 1000
const HEARTBEAT_INTERVAL_MS = 30 * 1000
const ACTIVITY_THROTTLE_MS = 60 * 1000

function resolveLoginPath(): string {
  if (typeof window === "undefined") return "/login"
  const path = window.location.pathname
  if (path.startsWith("/admin")) {
    return `/admin/login?next=${encodeURIComponent(path)}`
  }
  return `/login?next=${encodeURIComponent(path)}`
}

export function SessionKeepAlive() {
  const lastActivityRef = useRef(Date.now())
  const lastRefreshRef = useRef(Date.now())
  const inFlightRef = useRef(false)
  const redirectingRef = useRef(false)

  const recordActivity = useCallback(() => {
    lastActivityRef.current = Date.now()
  }, [])

  const handleSessionExpired = useCallback(async () => {
    if (redirectingRef.current) return
    redirectingRef.current = true

    try {
      await fetch("/api/auth/invalidate", { method: "POST" })
    } catch {
      // Best-effort; cookies may already be cleared by refresh route
    }

    window.location.href = resolveLoginPath()
  }, [])

  const refreshSession = useCallback(async () => {
    if (inFlightRef.current || redirectingRef.current) return

    const timeSinceActivity = Date.now() - lastActivityRef.current
    if (timeSinceActivity > ACTIVITY_THROTTLE_MS) return

    inFlightRef.current = true
    try {
      const response = await fetch("/api/auth/refresh", { method: "POST" })
      if (response.ok) {
        lastRefreshRef.current = Date.now()
      } else if (response.status === 401) {
        await handleSessionExpired()
      }
    } catch {
      // Network error — skip this cycle; will retry on next interval
    } finally {
      inFlightRef.current = false
    }
  }, [handleSessionExpired])

  const heartbeat = useCallback(async () => {
    if (inFlightRef.current || redirectingRef.current) return

    const timeSinceActivity = Date.now() - lastActivityRef.current
    if (timeSinceActivity > ACTIVITY_THROTTLE_MS) return

    inFlightRef.current = true
    try {
      const response = await fetch("/api/auth/refresh", { method: "POST" })
      if (response.ok) {
        lastRefreshRef.current = Date.now()
      } else if (response.status === 401) {
        await handleSessionExpired()
      }
    } catch {
      // Network error — skip
    } finally {
      inFlightRef.current = false
    }
  }, [handleSessionExpired])

  useEffect(() => {
    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, recordActivity, { passive: true })
    }

    const refreshId = setInterval(() => {
      const timeSinceRefresh = Date.now() - lastRefreshRef.current
      if (timeSinceRefresh >= REFRESH_INTERVAL_MS) {
        void refreshSession()
      }
    }, 60 * 1000)

    const heartbeatId = setInterval(() => {
      void heartbeat()
    }, HEARTBEAT_INTERVAL_MS)

    return () => {
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, recordActivity)
      }
      clearInterval(refreshId)
      clearInterval(heartbeatId)
    }
  }, [recordActivity, refreshSession, heartbeat])

  return null
}
