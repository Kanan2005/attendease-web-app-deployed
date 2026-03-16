import { QueryClient } from "@tanstack/react-query"

export function createWebQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
      },
    },
  })
}
