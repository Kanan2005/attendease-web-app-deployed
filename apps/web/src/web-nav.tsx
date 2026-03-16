"use client"

import { webTheme } from "@attendease/ui-web"
import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"

import { type WebPortalNavItem, isPortalNavItemActive } from "./web-portal"

export function WebPortalNav(props: { navItems: WebPortalNavItem[] }) {
  const pathname = usePathname() ?? "/"
  const searchParams = useSearchParams()
  const currentSearch = searchParams?.toString() ?? ""
  const currentLocation = currentSearch ? `${pathname}?${currentSearch}` : pathname

  return (
    <nav style={{ display: "grid", gap: 10 }}>
      {props.navItems.map((item) => {
        const active = isPortalNavItemActive(currentLocation, item.href)

        return (
          <Link
            key={item.href}
            href={item.href}
            style={{
              borderRadius: 18,
              border: `1px solid ${active ? webTheme.colors.borderStrong : webTheme.colors.border}`,
              background: active ? webTheme.colors.surfaceTint : webTheme.colors.surfaceRaised,
              boxShadow: active ? webTheme.shadow.card : "none",
              color: "inherit",
              padding: active ? "16px 16px 17px" : "14px 16px",
              textDecoration: "none",
            }}
          >
            <strong
              style={{
                display: "block",
                marginBottom: 4,
                color: active ? webTheme.colors.primaryStrong : webTheme.colors.text,
              }}
            >
              {item.label}
            </strong>
            <span
              style={{
                color: active ? webTheme.colors.text : webTheme.colors.textMuted,
                fontSize: 13,
                lineHeight: 1.45,
              }}
            >
              {item.description}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
