"use client"

import { QueryClientProvider } from "@tanstack/react-query"
import { useState } from "react"
import type { ReactNode } from "react"

import { createWebQueryClient } from "./query-client"

export function WebAppProviders(props: { children: ReactNode }) {
  const [queryClient] = useState(() => createWebQueryClient())

  return <QueryClientProvider client={queryClient}>{props.children}</QueryClientProvider>
}
