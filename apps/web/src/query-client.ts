import { AuthApiClientError } from "@attendease/auth"
import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query"

let redirectingToLogin = false

function isAuthExpiredError(error: unknown): boolean {
  return error instanceof AuthApiClientError && error.status === 401
}

function resolveLoginPath(): string {
  if (typeof window === "undefined") return "/login"
  const path = window.location.pathname
  if (path.startsWith("/admin")) {
    const next = path + window.location.search
    return `/admin/login?next=${encodeURIComponent(next)}`
  }
  const next = path + window.location.search
  return `/login?next=${encodeURIComponent(next)}`
}

async function redirectToLogin() {
  if (redirectingToLogin || typeof window === "undefined") return
  redirectingToLogin = true

  try {
    await fetch("/api/auth/invalidate", { method: "POST" })
  } catch {
    // Best-effort cookie cleanup; proceed with redirect regardless
  }

  window.location.href = resolveLoginPath()
}

export function createWebQueryClient() {
  return new QueryClient({
    queryCache: new QueryCache({
      onError: (error) => {
        if (isAuthExpiredError(error)) redirectToLogin()
      },
    }),
    mutationCache: new MutationCache({
      onError: (error) => {
        if (isAuthExpiredError(error)) redirectToLogin()
      },
    }),
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: (failureCount, error) => {
          if (isAuthExpiredError(error)) return false
          return failureCount < 3
        },
      },
      mutations: {
        retry: (failureCount, error) => {
          if (isAuthExpiredError(error)) return false
          return failureCount < 1
        },
      },
    },
  })
}
