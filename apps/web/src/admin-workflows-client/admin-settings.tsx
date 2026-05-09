"use client"

import type {
  AdminSettingsAcademicList,
  AdminSettingsAdminInviteResponse,
  AdminSettingsSystem,
} from "@attendease/contracts"
import { webTheme } from "@attendease/ui-web"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useState } from "react"

import { WebSectionCard } from "../web-shell"
import { webWorkflowQueryKeys } from "../web-workflows"
import { Banner, Field, StateCard, bootstrap, styles } from "./shared"

type Tab = "academic" | "system" | "admins" | "security"

export function AdminSettingsWorkspace(props: { accessToken: string | null }) {
  const [tab, setTab] = useState<Tab>("system")

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <div
        role="tablist"
        aria-label="Settings tabs"
        style={{
          display: "flex",
          gap: 8,
          borderBottom: `1px solid ${webTheme.colors.border}`,
        }}
      >
        <TabButton active={tab === "academic"} onClick={() => setTab("academic")}>
          Academic
        </TabButton>
        <TabButton active={tab === "system"} onClick={() => setTab("system")}>
          System
        </TabButton>
        <TabButton active={tab === "admins"} onClick={() => setTab("admins")}>
          Admins
        </TabButton>
        <TabButton active={tab === "security"} onClick={() => setTab("security")}>
          Security
        </TabButton>
      </div>

      {tab === "academic" ? (
        <AcademicPanel accessToken={props.accessToken} />
      ) : tab === "system" ? (
        <SystemPanel accessToken={props.accessToken} />
      ) : tab === "admins" ? (
        <AdminsPanel accessToken={props.accessToken} />
      ) : (
        <SecurityPanel accessToken={props.accessToken} />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Academic
// ---------------------------------------------------------------------------

function AcademicPanel(props: { accessToken: string | null }) {
  const queryClient = useQueryClient()
  const infoQuery = useQuery({
    queryKey: webWorkflowQueryKeys.adminSettingsAcademic(),
    enabled: Boolean(props.accessToken),
    queryFn: () => bootstrap.authClient.getAdminSettingsAcademic(props.accessToken ?? ""),
    staleTime: 30_000,
  })
  const listsQuery = useQuery({
    queryKey: webWorkflowQueryKeys.adminSettingsAcademicLists(),
    enabled: Boolean(props.accessToken),
    queryFn: () => bootstrap.authClient.getAdminSettingsAcademicLists(props.accessToken ?? ""),
    staleTime: 30_000,
  })

  const addMutation = useMutation({
    mutationFn: (input: { list: "branches" | "departments" | "semesters"; value: string }) =>
      bootstrap.authClient.addAdminSettingsAcademicListItem(props.accessToken ?? "", input),
    onSuccess: (data) => {
      queryClient.setQueryData(webWorkflowQueryKeys.adminSettingsAcademicLists(), data)
      queryClient.invalidateQueries({ queryKey: webWorkflowQueryKeys.adminUsersFilterOptions() })
    },
  })

  const removeMutation = useMutation({
    mutationFn: (input: { list: "branches" | "departments" | "semesters"; value: string }) =>
      bootstrap.authClient.removeAdminSettingsAcademicListItem(props.accessToken ?? "", input),
    onSuccess: (data) => {
      queryClient.setQueryData(webWorkflowQueryKeys.adminSettingsAcademicLists(), data)
      queryClient.invalidateQueries({ queryKey: webWorkflowQueryKeys.adminUsersFilterOptions() })
    },
  })

  if (infoQuery.isPending || listsQuery.isPending)
    return <StateCard message="Loading academic settings…" />
  if (infoQuery.isError || listsQuery.isError)
    return <Banner tone="danger" message="Failed to load academic settings." />

  const info = infoQuery.data
  const lists = listsQuery.data

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <ManagedListCard
        title="Branches"
        description="Manage the list of student branches. These appear in dropdown filters across the admin panel."
        items={lists.branches}
        onAdd={(value) => addMutation.mutate({ list: "branches", value })}
        onRemove={(value) => removeMutation.mutate({ list: "branches", value })}
        isPending={addMutation.isPending || removeMutation.isPending}
        inUseMap={new Map(info.branches.map((b) => [b.name, `${b.studentCount} students`]))}
      />

      <ManagedListCard
        title="Departments"
        description="Manage the list of teacher departments. These appear in dropdown filters across the admin panel."
        items={lists.departments}
        onAdd={(value) => addMutation.mutate({ list: "departments", value })}
        onRemove={(value) => removeMutation.mutate({ list: "departments", value })}
        isPending={addMutation.isPending || removeMutation.isPending}
        inUseMap={new Map(info.departments.map((d) => [d.name, `${d.teacherCount} teachers`]))}
      />

      <ManagedListCard
        title="Semesters"
        description="Manage the list of semester numbers. These appear in dropdown filters across the admin panel."
        items={lists.semesters.map(String)}
        onAdd={(value) => addMutation.mutate({ list: "semesters", value })}
        onRemove={(value) => removeMutation.mutate({ list: "semesters", value })}
        isPending={addMutation.isPending || removeMutation.isPending}
        inUseMap={new Map()}
        inputType="number"
      />

      <WebSectionCard title="Academic structure" description="Counts at a glance.">
        <div
          style={{
            display: "grid",
            gap: 12,
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          }}
        >
          <Stat label="Active semesters" value={info.semesterStatusCounts.active.toString()} />
          <Stat label="Closed semesters" value={info.semesterStatusCounts.closed.toString()} />
          <Stat label="Archived semesters" value={info.semesterStatusCounts.archived.toString()} />
          <Stat label="Classes" value={info.classCount.toString()} />
          <Stat label="Sections" value={info.sectionCount.toString()} />
        </div>
      </WebSectionCard>
    </div>
  )
}

function ManagedListCard(props: {
  title: string
  description: string
  items: string[]
  onAdd: (value: string) => void
  onRemove: (value: string) => void
  isPending: boolean
  inUseMap: Map<string, string>
  inputType?: "number" | "email" | "password" | "text"
}) {
  const [newValue, setNewValue] = useState("")

  function handleAdd() {
    const trimmed = newValue.trim()
    if (!trimmed) return
    props.onAdd(trimmed)
    setNewValue("")
  }

  function handleRemove(value: string) {
    const usage = props.inUseMap.get(value)
    const msg = usage
      ? `Remove "${value}"? It is currently in use (${usage}). The value will no longer appear in dropdowns, but existing profiles are not affected.`
      : `Remove "${value}" from the list?`
    if (!window.confirm(msg)) return
    props.onRemove(value)
  }

  return (
    <WebSectionCard title={props.title} description={props.description}>
      <div style={{ display: "flex", gap: 8, alignItems: "flex-end", marginBottom: 16 }}>
        <div style={{ flex: 1 }}>
          <Field
            label={`Add new ${props.title.toLowerCase().replace(/s$/, "")}`}
            value={newValue}
            onChange={setNewValue}
            {...(props.inputType ? { type: props.inputType } : {})}
          />
        </div>
        <button
          type="button"
          style={{ ...styles.primaryButton, height: 40 }}
          disabled={props.isPending || !newValue.trim()}
          onClick={handleAdd}
        >
          Add
        </button>
      </div>
      {props.items.length === 0 ? (
        <p style={{ fontSize: 14, color: webTheme.colors.textMuted }}>
          No items yet. Add one above.
        </p>
      ) : (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {props.items.map((item) => (
            <div
              key={item}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 12px",
                background: webTheme.colors.surfaceMuted,
                borderRadius: 6,
                fontSize: 14,
              }}
            >
              <span>{item}</span>
              {props.inUseMap.has(item) ? (
                <span style={{ fontSize: 11, color: webTheme.colors.textMuted }}>
                  ({props.inUseMap.get(item)})
                </span>
              ) : null}
              <button
                type="button"
                onClick={() => handleRemove(item)}
                disabled={props.isPending}
                style={{
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  color: webTheme.colors.textMuted,
                  fontSize: 16,
                  lineHeight: 1,
                  padding: "0 2px",
                }}
                title={`Remove ${item}`}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </WebSectionCard>
  )
}

// ---------------------------------------------------------------------------
// System
// ---------------------------------------------------------------------------

function SystemPanel(props: { accessToken: string | null }) {
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: webWorkflowQueryKeys.adminSettingsSystem(),
    enabled: Boolean(props.accessToken),
    queryFn: () => bootstrap.authClient.getAdminSettingsSystem(props.accessToken ?? ""),
    staleTime: 30_000,
  })
  const [draft, setDraft] = useState<AdminSettingsSystem | null>(null)

  useEffect(() => {
    if (query.data && draft === null) {
      setDraft(query.data.values)
    }
  }, [query.data, draft])

  const mutation = useMutation({
    mutationFn: async () => {
      if (!draft || !query.data) return query.data
      const changed: Partial<AdminSettingsSystem> = {}
      for (const key of Object.keys(draft) as (keyof AdminSettingsSystem)[]) {
        if (draft[key] !== query.data.values[key]) {
          ;(changed as Record<string, unknown>)[key] = draft[key]
        }
      }
      if (Object.keys(changed).length === 0) return query.data
      return bootstrap.authClient.updateAdminSettingsSystem(
        props.accessToken ?? "",
        changed as AdminSettingsSystem,
      )
    },
    onSuccess: (data) => {
      if (data) {
        queryClient.setQueryData(webWorkflowQueryKeys.adminSettingsSystem(), data)
        setDraft(data.values)
      }
    },
  })

  if (query.isPending || !draft) return <StateCard message="Loading system defaults…" />
  if (query.isError) return <Banner tone="danger" message="Failed to load system settings." />

  return (
    <WebSectionCard
      title="System defaults"
      description="These values apply to newly-created course offerings. Existing courses retain their own values."
    >
      <div style={styles.formGrid}>
        <Field
          label="GPS radius (metres)"
          value={String(draft.gpsRadiusMeters)}
          onChange={(value) =>
            setDraft({ ...draft, gpsRadiusMeters: clamp(Number(value), 5, 500) })
          }
          type="number"
        />
        <Field
          label="QR rotation window (seconds)"
          value={String(draft.qrRotationWindowSeconds)}
          onChange={(value) =>
            setDraft({ ...draft, qrRotationWindowSeconds: clamp(Number(value), 2, 60) })
          }
          type="number"
        />
        <Field
          label="Bluetooth rotation window (seconds)"
          value={String(draft.bluetoothRotationWindowSeconds)}
          onChange={(value) =>
            setDraft({
              ...draft,
              bluetoothRotationWindowSeconds: clamp(Number(value), 2, 60),
            })
          }
          type="number"
        />
        <label style={{ display: "grid", gap: 6 }}>
          <span>Default attendance mode</span>
          <select
            value={draft.defaultAttendanceMode}
            onChange={(event) =>
              setDraft({
                ...draft,
                defaultAttendanceMode: event.target.value as "QR" | "BLUETOOTH",
              })
            }
            style={styles.input}
          >
            <option value="QR">QR</option>
            <option value="BLUETOOTH">Bluetooth</option>
          </select>
        </label>
        <Field
          label="Low attendance threshold (%)"
          value={String(draft.lowAttendanceThresholdPercent)}
          onChange={(value) =>
            setDraft({
              ...draft,
              lowAttendanceThresholdPercent: clamp(Number(value), 40, 100),
            })
          }
          type="number"
        />
      </div>
      <div style={{ ...styles.buttonRow, marginTop: 16 }}>
        <button
          type="button"
          style={styles.primaryButton}
          disabled={mutation.isPending}
          onClick={() => mutation.mutate()}
        >
          {mutation.isPending ? "Saving…" : "Save changes"}
        </button>
        <button
          type="button"
          style={styles.secondaryButton}
          onClick={() => setDraft(query.data.values)}
        >
          Reset
        </button>
      </div>
      {mutation.isError ? (
        <div style={{ marginTop: 12 }}>
          <Banner tone="danger" message="Failed to save settings. Try again." />
        </div>
      ) : null}
      {query.data.updatedBy ? (
        <p style={{ marginTop: 16, fontSize: 12, color: webTheme.colors.textMuted }}>
          Last updated {query.data.updatedAt ? new Date(query.data.updatedAt).toLocaleString() : ""}{" "}
          by {query.data.updatedBy.displayName} ({query.data.updatedBy.email})
        </p>
      ) : null}
    </WebSectionCard>
  )
}

// ---------------------------------------------------------------------------
// Admins
// ---------------------------------------------------------------------------

function AdminsPanel(props: { accessToken: string | null }) {
  const queryClient = useQueryClient()
  const adminsQuery = useQuery({
    queryKey: webWorkflowQueryKeys.adminSettingsAdmins(),
    enabled: Boolean(props.accessToken),
    queryFn: () => bootstrap.authClient.listAdminSettingsAdmins(props.accessToken ?? ""),
    staleTime: 15_000,
  })
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteName, setInviteName] = useState("")
  const [lastInvite, setLastInvite] = useState<AdminSettingsAdminInviteResponse | null>(null)

  const inviteMutation = useMutation({
    mutationFn: () =>
      bootstrap.authClient.inviteAdminSettingsAdmin(props.accessToken ?? "", {
        email: inviteEmail.trim(),
        displayName: inviteName.trim(),
      }),
    onSuccess: (data) => {
      setLastInvite(data)
      setInviteEmail("")
      setInviteName("")
      queryClient.invalidateQueries({ queryKey: webWorkflowQueryKeys.adminSettingsAdmins() })
    },
  })

  const revokeMutation = useMutation({
    mutationFn: (input: { userId: string; reason: string | undefined }) =>
      bootstrap.authClient.revokeAdminSettingsAdmin(
        props.accessToken ?? "",
        input.userId,
        input.reason ? { reason: input.reason } : {},
      ),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: webWorkflowQueryKeys.adminSettingsAdmins() }),
  })

  function handleRevoke(userId: string, displayName: string) {
    const reason = window.prompt(
      `Revoke admin role from ${displayName}?\n\nReason (min 3 chars, optional):`,
      "",
    )
    if (reason === null) return
    revokeMutation.mutate({
      userId,
      reason: reason.trim().length >= 3 ? reason.trim() : undefined,
    })
  }

  function handleSharePassword() {
    if (!lastInvite) return
    const subject = encodeURIComponent("Your Attendease admin login")
    const body = encodeURIComponent(
      `Hi ${lastInvite.displayName},\n\nYou've been added as an admin on Attendease.\n\nEmail: ${lastInvite.email}\nTemporary password: ${lastInvite.temporaryPassword}\n\nPlease sign in and change your password under Settings → Security.\n`,
    )
    const url = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
      lastInvite.email,
    )}&su=${subject}&body=${body}`
    window.open(url, "_blank", "noopener,noreferrer")
  }

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <WebSectionCard
        title="Invite a new admin"
        description="We don't have an email server, so we generate a strong temp password and show it to you once. Share it with the new admin via Gmail or in person."
      >
        <div style={styles.formGrid}>
          <Field label="Email" value={inviteEmail} onChange={setInviteEmail} type="email" />
          <Field label="Display name" value={inviteName} onChange={setInviteName} />
        </div>
        <div style={{ ...styles.buttonRow, marginTop: 16 }}>
          <button
            type="button"
            style={styles.primaryButton}
            disabled={inviteMutation.isPending || !inviteEmail.trim() || !inviteName.trim()}
            onClick={() => inviteMutation.mutate()}
          >
            {inviteMutation.isPending ? "Inviting…" : "Invite"}
          </button>
        </div>
        {inviteMutation.isError ? (
          <div style={{ marginTop: 12 }}>
            <Banner
              tone="danger"
              message={
                inviteMutation.error instanceof Error
                  ? inviteMutation.error.message
                  : "Failed to invite admin."
              }
            />
          </div>
        ) : null}
        {lastInvite ? (
          <div style={{ marginTop: 16, ...styles.rowCard }}>
            <strong>Temporary password (shown once):</strong>
            <div
              style={{
                marginTop: 8,
                padding: 12,
                background: webTheme.colors.surfaceMuted,
                borderRadius: 8,
                fontFamily: "ui-monospace, monospace",
                fontSize: 16,
                letterSpacing: 1,
              }}
            >
              {lastInvite.temporaryPassword}
            </div>
            <p style={{ fontSize: 12, color: webTheme.colors.textMuted, marginTop: 8 }}>
              For {lastInvite.displayName} ({lastInvite.email}).
              {lastInvite.alreadyHadAccount
                ? lastInvite.alreadyAdmin
                  ? " They were already an admin; their password has been reset."
                  : " They already had an account; admin role added and password reset."
                : " New admin account created."}
            </p>
            <div style={{ ...styles.buttonRow, marginTop: 12 }}>
              <button type="button" style={styles.primaryButton} onClick={handleSharePassword}>
                Email this temp password via Gmail
              </button>
              <button
                type="button"
                style={styles.secondaryButton}
                onClick={() => {
                  navigator.clipboard
                    ?.writeText(lastInvite.temporaryPassword)
                    .catch(() => undefined)
                }}
              >
                Copy password
              </button>
              <button
                type="button"
                style={styles.secondaryButton}
                onClick={() => setLastInvite(null)}
              >
                Dismiss
              </button>
            </div>
          </div>
        ) : null}
      </WebSectionCard>

      <WebSectionCard
        title="Current admins"
        description="People with the ADMIN role. The institution must keep at least one admin at all times."
      >
        {adminsQuery.isPending ? (
          <StateCard message="Loading admins…" />
        ) : adminsQuery.isError ? (
          <Banner tone="danger" message="Failed to load admins." />
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Name</th>
                  <th style={styles.th}>Email</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Last login</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {adminsQuery.data.admins.map((admin) => (
                  <tr key={admin.userId}>
                    <td style={styles.td}>
                      {admin.displayName}
                      {admin.isSelf ? (
                        <span
                          style={{
                            marginLeft: 8,
                            fontSize: 11,
                            padding: "2px 6px",
                            background: webTheme.colors.surfaceMuted,
                            borderRadius: 4,
                          }}
                        >
                          you
                        </span>
                      ) : null}
                    </td>
                    <td style={styles.td}>{admin.email}</td>
                    <td style={styles.td}>{admin.status}</td>
                    <td style={styles.td}>
                      {admin.lastLoginAt ? new Date(admin.lastLoginAt).toLocaleString() : "—"}
                    </td>
                    <td style={styles.td}>
                      <button
                        type="button"
                        disabled={admin.isSelf || revokeMutation.isPending}
                        onClick={() => handleRevoke(admin.userId, admin.displayName)}
                        style={{
                          ...styles.dangerButton,
                          padding: "6px 10px",
                          fontSize: 12,
                        }}
                      >
                        Revoke admin
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {revokeMutation.isError ? (
          <div style={{ marginTop: 12 }}>
            <Banner
              tone="danger"
              message={
                revokeMutation.error instanceof Error
                  ? revokeMutation.error.message
                  : "Failed to revoke admin."
              }
            />
          </div>
        ) : null}
      </WebSectionCard>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Security
// ---------------------------------------------------------------------------

function SecurityPanel(props: { accessToken: string | null }) {
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  const mutation = useMutation({
    mutationFn: () =>
      bootstrap.authClient.changeAdminOwnPassword(props.accessToken ?? "", {
        currentPassword,
        newPassword,
      }),
    onSuccess: () => {
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
    },
  })

  const passwordsMismatch =
    newPassword.length > 0 && confirmPassword.length > 0 && newPassword !== confirmPassword

  return (
    <WebSectionCard
      title="Change your password"
      description="Updates only your own password. Existing sessions remain active until they expire."
    >
      <div style={{ display: "grid", gap: 12, maxWidth: 420 }}>
        <Field
          label="Current password"
          value={currentPassword}
          onChange={setCurrentPassword}
          type="password"
        />
        <Field
          label="New password (min 8 chars)"
          value={newPassword}
          onChange={setNewPassword}
          type="password"
        />
        <Field
          label="Confirm new password"
          value={confirmPassword}
          onChange={setConfirmPassword}
          type="password"
        />
      </div>
      <div style={{ ...styles.buttonRow, marginTop: 16 }}>
        <button
          type="button"
          style={styles.primaryButton}
          disabled={
            mutation.isPending ||
            currentPassword.length < 8 ||
            newPassword.length < 8 ||
            passwordsMismatch
          }
          onClick={() => mutation.mutate()}
        >
          {mutation.isPending ? "Updating…" : "Change password"}
        </button>
      </div>
      {passwordsMismatch ? (
        <div style={{ marginTop: 12 }}>
          <Banner tone="info" message="The two new password fields must match." />
        </div>
      ) : null}
      {mutation.isError ? (
        <div style={{ marginTop: 12 }}>
          <Banner
            tone="danger"
            message={
              mutation.error instanceof Error
                ? mutation.error.message
                : "Failed to change password."
            }
          />
        </div>
      ) : null}
      {mutation.isSuccess ? (
        <div style={{ marginTop: 12 }}>
          <Banner tone="info" message="Password updated. Use it next time you sign in." />
        </div>
      ) : null}
    </WebSectionCard>
  )
}

// ---------------------------------------------------------------------------
// Shared bits
// ---------------------------------------------------------------------------

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
      style={{
        border: "none",
        padding: "12px 18px",
        background: "transparent",
        color: props.active ? webTheme.colors.primary : webTheme.colors.textMuted,
        fontWeight: 700,
        fontSize: 14,
        cursor: "pointer",
        borderBottom: `2px solid ${props.active ? webTheme.colors.primary : "transparent"}`,
        marginBottom: -1,
      }}
    >
      {props.children}
    </button>
  )
}

function Stat(props: { label: string; value: string }) {
  return (
    <div style={{ ...styles.rowCard, display: "grid", gap: 4 }}>
      <span style={{ fontSize: 11, color: webTheme.colors.textMuted }}>{props.label}</span>
      <strong style={{ fontSize: 20 }}>{props.value}</strong>
    </div>
  )
}

function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min
  return Math.max(min, Math.min(max, Math.round(value)))
}
