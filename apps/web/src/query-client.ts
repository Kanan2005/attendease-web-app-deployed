import { AuthApiClientError } from "@attendease/auth"
import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query"

let redirectingToLogin = false

function isAuthExpiredError(error: unknown): boolean {
  return error instanceof AuthApiClientError && error.status === 401
}

function redirectToLogin() {
  if (redirectingToLogin || typeof window === "undefined") return
  redirectingToLogin = true
  const next = window.location.pathname + window.location.search
  window.location.href = `/login?next=${encodeURIComponent(next)}`
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
