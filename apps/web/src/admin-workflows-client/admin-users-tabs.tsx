"use client"

import { webTheme } from "@attendease/ui-web"
import { useRouter, useSearchParams } from "next/navigation"
import { useMemo } from "react"

import { AdminUsersStudentsWorkspace } from "./admin-users-students"
import { AdminUsersTeachersWorkspace } from "./admin-users-teachers"

type Tab = "students" | "teachers"

export function AdminUsersTabsWorkspace(props: { accessToken: string | null }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const rawTab = searchParams.get("tab")
  const tab: Tab = useMemo(() => (rawTab === "teachers" ? "teachers" : "students"), [rawTab])

  function setTab(next: Tab) {
    const params = new URLSearchParams(searchParams.toString())
    params.set("tab", next)
    router.replace(`/admin/users?${params.toString()}`)
  }

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <div
        role="tablist"
        aria-label="Users tabs"
        style={{
          display: "flex",
          gap: 4,
          borderBottom: `1px solid ${webTheme.colors.border}`,
          paddingBottom: 0,
        }}
      >
        <TabButton active={tab === "students"} onClick={() => setTab("students")}>
          Students
        </TabButton>
        <TabButton active={tab === "teachers"} onClick={() => setTab("teachers")}>
          Teachers
        </TabButton>
      </div>
      {tab === "students" ? (
        <AdminUsersStudentsWorkspace accessToken={props.accessToken} />
      ) : (
        <AdminUsersTeachersWorkspace accessToken={props.accessToken} />
      )}
    </div>
  )
}

function TabButton(props: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={props.active}
      onClick={props.onClick}
      className="ui-tab-link"
      style={{
        border: "none",
        padding: "10px 20px",
        background: props.active ? webTheme.colors.accentSoft : "transparent",
        color: props.active ? webTheme.colors.accent : webTheme.colors.textMuted,
        fontWeight: 700,
        fontSize: 14,
        cursor: "pointer",
        borderBottom: `2px solid ${props.active ? webTheme.colors.accent : "transparent"}`,
        borderRadius: "8px 8px 0 0",
        marginBottom: -1,
        transition: "color 0.2s ease, background 0.2s ease, border-color 0.2s ease",
      }}
    >
      {props.children}
    </button>
  )
}
