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
const ACTIVITY_THROTTLE_MS = 30 * 1000

export function SessionKeepAlive() {
  const lastActivityRef = useRef(Date.now())
  const lastRefreshRef = useRef(Date.now())
  const refreshInFlightRef = useRef(false)

  const recordActivity = useCallback(() => {
    lastActivityRef.current = Date.now()
  }, [])

  const refreshSession = useCallback(async () => {
    if (refreshInFlightRef.current) return

    const timeSinceActivity = Date.now() - lastActivityRef.current
    if (timeSinceActivity > ACTIVITY_THROTTLE_MS) return

    refreshInFlightRef.current = true
    try {
      const response = await fetch("/api/auth/refresh", { method: "POST" })
      if (response.ok) {
        lastRefreshRef.current = Date.now()
      } else if (response.status === 401) {
        window.location.href = "/login"
      }
    } catch {
      // Network error — skip this cycle; will retry on next interval
    } finally {
      refreshInFlightRef.current = false
    }
  }, [])

  useEffect(() => {
    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, recordActivity, { passive: true })
    }

    const intervalId = setInterval(() => {
      const timeSinceRefresh = Date.now() - lastRefreshRef.current
      if (timeSinceRefresh >= REFRESH_INTERVAL_MS) {
        void refreshSession()
      }
    }, 60 * 1000)

    return () => {
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, recordActivity)
      }
      clearInterval(intervalId)
    }
  }, [recordActivity, refreshSession])

  return null
}
