"use client"

import type { ProfileResponse } from "@attendease/contracts"
import { webTheme } from "@attendease/ui-web"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { AnimatePresence, motion } from "framer-motion"
import { useCallback, useRef, useState } from "react"

import { webWorkflowQueryKeys } from "../web-workflows-routes"
import { workflowStyles } from "./shared-styles"
import { bootstrap } from "./shared"

export function TeacherProfileWorkspace(props: { accessToken: string | null }) {
  const queryClient = useQueryClient()

  const profileQuery = useQuery({
    queryKey: webWorkflowQueryKeys.profile(),
    enabled: Boolean(props.accessToken),
    queryFn: () => bootstrap.authClient.getProfile(props.accessToken ?? ""),
  })

  const [form, setForm] = useState<{
    displayName: string
    department: string
    designation: string
    employeeCode: string
    avatarUrl: string
  } | null>(null)

  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [avatarBroken, setAvatarBroken] = useState(false)
  const lastAvatarUrl = useRef("")

  const initForm = useCallback((profile: ProfileResponse) => {
    setForm({
      displayName: profile.displayName,
      department: profile.department ?? "",
      designation: profile.designation ?? "",
      employeeCode: profile.employeeCode ?? "",
      avatarUrl: profile.avatarUrl ?? "",
    })
  }, [])

  if (profileQuery.data && !form) {
    initForm(profileQuery.data)
  }

  const updateMutation = useMutation({
    mutationFn: (data: {
      displayName?: string
      department?: string | null
      designation?: string | null
      employeeCode?: string | null
      avatarUrl?: string | null
    }) => bootstrap.authClient.updateProfile(props.accessToken ?? "", data),
    onSuccess: (profile) => {
      queryClient.setQueryData(webWorkflowQueryKeys.profile(), profile)
      setSuccessMessage("Profile updated successfully")
      setErrorMessage(null)
      setTimeout(() => setSuccessMessage(null), 3000)
    },
    onError: (err) => {
      setErrorMessage(err instanceof Error ? err.message : "Failed to update profile")
      setSuccessMessage(null)
    },
  })

  const handleSave = () => {
    if (!form || !profileQuery.data) return
    const payload: Record<string, string | null | undefined> = {}
    if (form.displayName !== profileQuery.data.displayName) payload.displayName = form.displayName
    if (form.department !== (profileQuery.data.department ?? ""))
      payload.department = form.department || null
    if (form.designation !== (profileQuery.data.designation ?? ""))
      payload.designation = form.designation || null
    if (form.employeeCode !== (profileQuery.data.employeeCode ?? ""))
      payload.employeeCode = form.employeeCode || null
    if (form.avatarUrl !== (profileQuery.data.avatarUrl ?? ""))
      payload.avatarUrl = form.avatarUrl || null
    if (Object.keys(payload).length === 0) {
      setSuccessMessage("No changes to save")
      setTimeout(() => setSuccessMessage(null), 2000)
      return
    }
    updateMutation.mutate(payload)
  }

  const handleRemoveAvatar = () => {
    if (!form) return
    setForm({ ...form, avatarUrl: "" })
  }

  const profile = profileQuery.data
  const initials = profile?.displayName
    ?.split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() ?? "?"

  const memberSince = profile?.createdAt
    ? new Intl.DateTimeFormat("en-US", {
        month: "long",
        year: "numeric",
      }).format(new Date(profile.createdAt))
    : null

  if (profileQuery.isLoading) {
    return (
      <div style={{ display: "grid", placeItems: "center", minHeight: 300, color: webTheme.colors.textMuted }}>
        Loading profile...
      </div>
    )
  }

  if (profileQuery.isError || !profile || !form) {
    return (
      <div style={{ ...workflowStyles.stateCard, textAlign: "center" }}>
        Unable to load profile. Please try again.
      </div>
    )
  }

  const hasChanges =
    form.displayName !== profile.displayName ||
    form.department !== (profile.department ?? "") ||
    form.designation !== (profile.designation ?? "") ||
    form.employeeCode !== (profile.employeeCode ?? "") ||
    form.avatarUrl !== (profile.avatarUrl ?? "")

  return (
    <section style={{ display: "grid", gap: 28, maxWidth: 720, margin: "0 auto" }}>
      <header style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <a
          href="/teacher/dashboard"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 32,
            height: 32,
            borderRadius: 8,
            border: `1px solid ${webTheme.colors.border}`,
            background: webTheme.colors.surfaceTint,
            color: webTheme.colors.textMuted,
            textDecoration: "none",
            fontSize: 16,
            transition: `all ${webTheme.animation.fast}`,
          }}
          className="ui-secondary-btn"
          aria-label="Back to dashboard"
        >
          ←
        </a>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: webTheme.colors.text, letterSpacing: "-0.02em" }}>
            My Profile
          </h2>
          <p style={{ margin: "2px 0 0", fontSize: 13, color: webTheme.colors.textSubtle }}>
            Manage your personal information
          </p>
        </div>
      </header>

      {/* Avatar & Identity Card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        style={{
          ...workflowStyles.rowCard,
          display: "flex",
          alignItems: "center",
          gap: 24,
          padding: 28,
        }}
      >
        <div style={{ position: "relative", flexShrink: 0 }}>
          {form.avatarUrl && !avatarBroken ? (
            <img
              src={form.avatarUrl}
              alt={profile.displayName}
              onError={() => setAvatarBroken(true)}
              style={{
                width: 80,
                height: 80,
                borderRadius: "50%",
                objectFit: "cover",
                border: `2px solid ${webTheme.colors.border}`,
              }}
            />
          ) : (
            <div
              style={{
                width: 80,
                height: 80,
                borderRadius: "50%",
                background: webTheme.gradients.accentButton,
                display: "grid",
                placeItems: "center",
                fontSize: 28,
                fontWeight: 800,
                color: "#fff",
                letterSpacing: "-0.02em",
              }}
            >
              {initials}
            </div>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: webTheme.colors.text }}>
            {profile.displayName}
          </h3>
          <p style={{ margin: "4px 0 0", fontSize: 14, color: webTheme.colors.textMuted }}>
            {profile.email}
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
            <span style={pillStyle}>Teacher</span>
            {profile.department ? <span style={pillStyle}>{profile.department}</span> : null}
            {memberSince ? (
              <span style={{ fontSize: 12, color: webTheme.colors.textSubtle }}>
                Member since {memberSince}
              </span>
            ) : null}
          </div>
        </div>
      </motion.div>

      {/* Notifications */}
      <AnimatePresence>
        {successMessage ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            style={{
              borderRadius: 10,
              padding: "12px 16px",
              background: webTheme.colors.successSoft,
              border: `1px solid ${webTheme.colors.successBorder}`,
              color: webTheme.colors.success,
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            {successMessage}
          </motion.div>
        ) : null}
        {errorMessage ? (
          <motion.div
            key="error"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            style={{
              borderRadius: 10,
              padding: "12px 16px",
              background: webTheme.colors.dangerSoft,
              border: `1px solid ${webTheme.colors.dangerBorder}`,
              color: webTheme.colors.danger,
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            {errorMessage}
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Personal Information */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
        style={workflowStyles.rowCard}
      >
        <h3 style={sectionTitle}>Personal Information</h3>
        <div style={{ display: "grid", gap: 16 }}>
          <label style={fieldWrap}>
            <span style={fieldLabel}>Display Name</span>
            <input
              value={form.displayName}
              onChange={(e) => setForm({ ...form, displayName: e.target.value })}
              style={workflowStyles.input}
              placeholder="Your full name"
            />
          </label>

          <label style={fieldWrap}>
            <span style={fieldLabel}>Email</span>
            <input
              value={profile.email}
              disabled
              style={{ ...workflowStyles.input, opacity: 0.6, cursor: "not-allowed" }}
            />
            <span style={{ fontSize: 11, color: webTheme.colors.textSubtle, marginTop: 2 }}>
              Email cannot be changed
            </span>
          </label>

          <label style={fieldWrap}>
            <span style={fieldLabel}>Avatar URL</span>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                value={form.avatarUrl}
                onChange={(e) => {
                  const url = e.target.value
                  if (url !== lastAvatarUrl.current) {
                    setAvatarBroken(false)
                    lastAvatarUrl.current = url
                  }
                  setForm({ ...form, avatarUrl: url })
                }}
                style={{ ...workflowStyles.input, flex: 1 }}
                placeholder="https://example.com/photo.jpg"
              />
              {form.avatarUrl ? (
                <button
                  type="button"
                  onClick={handleRemoveAvatar}
                  className="ui-danger-action"
                  style={{
                    border: "none",
                    borderRadius: 8,
                    padding: "8px 14px",
                    background: webTheme.colors.dangerSoft,
                    color: webTheme.colors.danger,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    transition: `all ${webTheme.animation.fast}`,
                  }}
                >
                  Remove
                </button>
              ) : null}
            </div>
          </label>
        </div>
      </motion.div>

      {/* Professional Information */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.16, ease: [0.16, 1, 0.3, 1] }}
        style={workflowStyles.rowCard}
      >
        <h3 style={sectionTitle}>Professional Information</h3>
        <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
          <label style={fieldWrap}>
            <span style={fieldLabel}>Department</span>
            <input
              value={form.department}
              onChange={(e) => setForm({ ...form, department: e.target.value })}
              style={workflowStyles.input}
              placeholder="e.g. Computer Science"
            />
          </label>

          <label style={fieldWrap}>
            <span style={fieldLabel}>Designation</span>
            <input
              value={form.designation}
              onChange={(e) => setForm({ ...form, designation: e.target.value })}
              style={workflowStyles.input}
              placeholder="e.g. Associate Professor"
            />
          </label>

          <label style={fieldWrap}>
            <span style={fieldLabel}>Employee Code</span>
            <input
              value={form.employeeCode}
              onChange={(e) => setForm({ ...form, employeeCode: e.target.value })}
              style={workflowStyles.input}
              placeholder="e.g. EMP-001"
            />
          </label>
        </div>
      </motion.div>

      {/* Save */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.24, ease: [0.16, 1, 0.3, 1] }}
        style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}
      >
        <button
          type="button"
          onClick={() => initForm(profile)}
          disabled={!hasChanges}
          className="ui-secondary-btn"
          style={{
            ...workflowStyles.secondaryButton,
            opacity: hasChanges ? 1 : 0.5,
            cursor: hasChanges ? "pointer" : "not-allowed",
          }}
        >
          Discard changes
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={updateMutation.isPending || !hasChanges}
          className="ui-primary-btn"
          style={{
            ...workflowStyles.primaryButton,
            opacity: hasChanges ? 1 : 0.5,
            cursor: hasChanges ? "pointer" : "not-allowed",
          }}
        >
          {updateMutation.isPending ? "Saving..." : "Save changes"}
        </button>
      </motion.div>
    </section>
  )
}

const pillStyle: React.CSSProperties = {
  display: "inline-block",
  padding: "3px 10px",
  borderRadius: 999,
  background: webTheme.colors.accentSoft,
  color: webTheme.colors.accent,
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
}

const sectionTitle: React.CSSProperties = {
  margin: "0 0 16px",
  fontSize: 15,
  fontWeight: 600,
  color: webTheme.colors.text,
  letterSpacing: "-0.01em",
}

const fieldWrap: React.CSSProperties = {
  display: "grid",
  gap: 6,
}

const fieldLabel: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: webTheme.colors.textMuted,
  letterSpacing: "0.02em",
  textTransform: "uppercase",
}
