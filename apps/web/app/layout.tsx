import type { ReactNode } from "react"

import { WebAppProviders } from "../src/providers"

import "./globals.css"

export const metadata = {
  title: {
    default: "AttendEase",
    template: "%s · AttendEase",
  },
  description: "Smart attendance management for teachers and administrators",
}

const themeInitScript = `(function(){try{var t=localStorage.getItem('attendease-theme');if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t)}catch(e){}})();`

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: Inline theme bootstrap reads localStorage and sets data-theme before paint; static string from source, not user input. */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <WebAppProviders>{children}</WebAppProviders>
      </body>
    </html>
  )
}
