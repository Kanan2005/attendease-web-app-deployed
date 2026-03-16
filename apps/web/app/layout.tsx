import type { ReactNode } from "react"

import { WebAppProviders } from "../src/providers"

import "./globals.css"

export const metadata = {
  title: "AttendEase",
  description: "Teacher and admin portal scaffold for AttendEase",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode
}>) {
  return (
    <html lang="en">
      <body>
        <WebAppProviders>{children}</WebAppProviders>
      </body>
    </html>
  )
}
