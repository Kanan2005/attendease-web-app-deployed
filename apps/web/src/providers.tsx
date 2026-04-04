"use client"

import { QueryClientProvider } from "@tanstack/react-query"
import { useState } from "react"
import type { ReactNode } from "react"

import { createWebQueryClient } from "./query-client"
import { SessionKeepAlive } from "./session-keep-alive"
import { ThemeProvider } from "./theme-context"

export function WebAppProviders(props: { children: ReactNode }) {
  const [queryClient] = useState(() => createWebQueryClient())

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <SessionKeepAlive />
        {props.children}
      </QueryClientProvider>
    </ThemeProvider>
  )
}
