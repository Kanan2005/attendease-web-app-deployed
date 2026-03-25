import { getColors, mobileTheme } from "@attendease/ui-mobile"
import { AnimatedButton, AnimatedCard, GradientHeader } from "@attendease/ui-mobile/animated"
import { Ionicons } from "@expo/vector-icons"
import { Link, Redirect } from "expo-router"
import { useState } from "react"
import { Pressable, ScrollView, Text, TextInput, View } from "react-native"
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { adminRoutes } from "./admin-routes"
import { useAdminSession } from "./admin-session"
import type { DeviceBindingErrorModel } from "./device-identity-models"
import { buildMobileAuthFormState, mobileEntryRoutes } from "./mobile-entry-models"
import { MobileAuthScreen, mobileEntryScreenStyles } from "./mobile-entry-ui"
import type { MobileEntryRole } from "./shell"
import { studentRoutes } from "./student-routes"
import { useStudentSession } from "./student-session"
import { teacherRoutes } from "./teacher-routes"
import { useTeacherSession } from "./teacher-session"

export function MobileEntryLandingScreen() {
  const insets = useSafeAreaInsets()
  const c = getColors()

  const studentSession = useStudentSession()
  const teacherSession = useTeacherSession()
  const adminSession = useAdminSession()

  const isStudentSignedIn = Boolean(studentSession.session)
  const isTeacherSignedIn = Boolean(teacherSession.session)

  return (
    <ScrollView
      contentContainerStyle={{
        padding: mobileTheme.spacing.xl,
        paddingTop: insets.top + 36,
        paddingBottom: insets.bottom + 32,
        gap: 28,
      }}
      style={{ flex: 1, backgroundColor: c.surface }}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View
        entering={FadeInDown.duration(500).delay(100)}
        style={{ alignItems: "center", gap: 8 }}
      >
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: 16,
            backgroundColor: c.primarySoft,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 4,
          }}
        >
          <Ionicons name="calendar" size={28} color={c.primary} />
        </View>
        <Text style={{ fontSize: 28, fontWeight: "800", color: c.text, letterSpacing: -0.5 }}>
          AttendEase
        </Text>
        <Text
          style={{
            fontSize: 15,
            color: c.textMuted,
            textAlign: "center",
            lineHeight: 22,
            maxWidth: 280,
          }}
        >
          Smart attendance for classrooms. Choose how you'd like to continue.
        </Text>
      </Animated.View>

      <Animated.View entering={FadeInUp.duration(400).delay(250)}>
        <RoleCard
          icon="school-outline"
          title="I'm a Student"
          description="Join classrooms, mark attendance via QR or Bluetooth, and track your records."
          signedIn={isStudentSignedIn}
          signInHref={mobileEntryRoutes.studentSignIn}
          homeHref={studentRoutes.classrooms}
          displayName={studentSession.session?.user.displayName ?? null}
          onSignOut={() => studentSession.signOut()}
        />
      </Animated.View>

      <Animated.View entering={FadeInUp.duration(400).delay(400)}>
        <RoleCard
          icon="easel-outline"
          title="I'm a Teacher"
          description="Create classrooms, manage students, broadcast attendance sessions, and view reports."
          signedIn={isTeacherSignedIn}
          signInHref={mobileEntryRoutes.teacherSignIn}
          homeHref={teacherRoutes.dashboard}
          displayName={teacherSession.session?.user.displayName ?? null}
          onSignOut={() => teacherSession.signOut()}
        />
      </Animated.View>

      <Animated.View
        entering={FadeInUp.duration(300).delay(600)}
        style={{ alignItems: "center", marginTop: 4 }}
      >
        <Link href={mobileEntryRoutes.adminSignIn} asChild>
          <Pressable
            style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 8 }}
          >
            <Ionicons name="shield-checkmark-outline" size={14} color={c.textSubtle} />
            <Text style={{ fontSize: 13, color: c.textSubtle, fontWeight: "600" }}>
              Admin sign in
            </Text>
          </Pressable>
        </Link>
      </Animated.View>
    </ScrollView>
  )
}

function RoleCard(props: {
  icon: React.ComponentProps<typeof Ionicons>["name"]
  title: string
  description: string
  signedIn: boolean
  signInHref: string
  homeHref: string
  displayName: string | null
  onSignOut: () => void
}) {
  const c = getColors()

  return (
    <View
      style={{
        borderRadius: 16,
        backgroundColor: c.surfaceRaised,
        borderWidth: 1,
        borderColor: props.signedIn ? c.successBorder : c.border,
        padding: 20,
        gap: 16,
        ...mobileTheme.shadow.card,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: 14,
            backgroundColor: props.signedIn ? c.successSoft : c.primarySoft,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons
            name={props.signedIn ? "checkmark-circle" : props.icon}
            size={24}
            color={props.signedIn ? c.success : c.primary}
          />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ fontSize: 18, fontWeight: "700", color: c.text }}>{props.title}</Text>
          {props.signedIn && props.displayName ? (
            <Text style={{ fontSize: 13, color: c.success, fontWeight: "600" }}>
              Signed in as {props.displayName}
            </Text>
          ) : null}
        </View>
      </View>

      {!props.signedIn ? (
        <Text style={{ fontSize: 14, color: c.textMuted, lineHeight: 21 }}>
          {props.description}
        </Text>
      ) : null}

      <View style={{ gap: 10 }}>
        {props.signedIn ? (
          <>
            <Link href={props.homeHref} asChild>
              <Pressable
                style={{
                  backgroundColor: c.primary,
                  borderRadius: mobileTheme.radius.button,
                  paddingVertical: 14,
                  alignItems: "center",
                  flexDirection: "row",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                <Ionicons name="arrow-forward" size={18} color={c.primaryContrast} />
                <Text style={{ color: c.primaryContrast, fontSize: 15, fontWeight: "700" }}>
                  Continue
                </Text>
              </Pressable>
            </Link>
            <Pressable
              onPress={props.onSignOut}
              style={{ alignItems: "center", paddingVertical: 8 }}
            >
              <Text style={{ color: c.textSubtle, fontSize: 13, fontWeight: "600" }}>Sign out</Text>
            </Pressable>
          </>
        ) : (
          <Link href={props.signInHref} asChild>
            <Pressable
              style={{
                backgroundColor: c.primary,
                borderRadius: mobileTheme.radius.button,
                paddingVertical: 14,
                alignItems: "center",
                flexDirection: "row",
                justifyContent: "center",
                gap: 8,
              }}
            >
              <Ionicons name="log-in-outline" size={18} color={c.primaryContrast} />
              <Text style={{ color: c.primaryContrast, fontSize: 15, fontWeight: "700" }}>
                Sign In
              </Text>
            </Pressable>
          </Link>
        )}
      </View>
    </View>
  )
}

export function StudentSignInScreen() {
  const {
    draft,
    updateDraft,
    signIn,
    status,
    errorMessage,
    deviceBindingError,
    deviceReady,
    hasDevelopmentCredentials,
    session,
  } = useStudentSession()

  if (session) {
    return <Redirect href={studentRoutes.classrooms} />
  }

  const formState = buildMobileAuthFormState({
    role: "student",
    mode: "sign_in",
    status,
    hasDevelopmentCredentials,
    errorMessage: deviceBindingError ? null : errorMessage,
  })
  const canSubmit = deviceReady && Boolean(draft.email.trim() && draft.password)

  return (
    <MobileAuthScreen
      entryRole="student"
      formState={formState}
      alternateHref={mobileEntryRoutes.studentRegister}
      canSubmit={canSubmit}
      onSubmit={() => {
        void signIn()
      }}
    >
      <FormField label="Email address" icon="mail-outline">
        <TextInput
          value={draft.email}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          placeholder="student@example.com"
          placeholderTextColor={getColors().textSubtle}
          onChangeText={(value) => updateDraft({ email: value })}
          style={mobileEntryScreenStyles.input}
        />
      </FormField>
      <FormField label="Password" icon="lock-closed-outline">
        <TextInput
          value={draft.password}
          secureTextEntry
          placeholder="Enter your password"
          placeholderTextColor={getColors().textSubtle}
          onChangeText={(value) => updateDraft({ password: value })}
          style={mobileEntryScreenStyles.input}
        />
      </FormField>
      {deviceBindingError ? (
        <DeviceBindingErrorBanner error={deviceBindingError} />
      ) : (
        <Text style={mobileEntryScreenStyles.helperNote}>
          This phone stays linked to your attendance record after sign in.
        </Text>
      )}
      {!deviceReady ? (
        <Text style={{ fontSize: 12, color: getColors().textMuted, textAlign: "center" }}>
          Preparing device identity…
        </Text>
      ) : null}
    </MobileAuthScreen>
  )
}

const DEGREE_OPTIONS = [
  { value: "B.Tech" as const, label: "B.Tech" },
  { value: "M.Tech" as const, label: "M.Tech" },
]

const BRANCH_OPTIONS = [
  { value: "CSE" as const, label: "CSE" },
  { value: "ECE" as const, label: "ECE" },
  { value: "EE" as const, label: "EE" },
  { value: "ME" as const, label: "ME" },
  { value: "CHE" as const, label: "CHE" },
  { value: "Civil" as const, label: "Civil" },
  { value: "Meta" as const, label: "Meta" },
]

export function StudentRegisterScreen() {
  const {
    draft,
    updateDraft,
    register,
    status,
    errorMessage,
    deviceBindingError,
    deviceReady,
    hasDevelopmentCredentials,
    session,
  } = useStudentSession()

  if (session) {
    return <Redirect href={studentRoutes.classrooms} />
  }

  const formState = buildMobileAuthFormState({
    role: "student",
    mode: "register",
    status,
    hasDevelopmentCredentials,
    errorMessage: deviceBindingError ? null : errorMessage,
  })
  const canSubmit =
    deviceReady && Boolean(draft.displayName.trim() && draft.email.trim() && draft.password)

  return (
    <MobileAuthScreen
      entryRole="student"
      formState={formState}
      alternateHref={mobileEntryRoutes.studentSignIn}
      canSubmit={canSubmit}
      onSubmit={() => {
        void register()
      }}
    >
      <FormField label="Full name" icon="person-outline">
        <TextInput
          value={draft.displayName}
          autoCapitalize="words"
          placeholder="Your full name"
          placeholderTextColor={getColors().textSubtle}
          onChangeText={(value) => updateDraft({ displayName: value })}
          style={mobileEntryScreenStyles.input}
        />
      </FormField>
      <FormField label="Email address" icon="mail-outline">
        <TextInput
          value={draft.email}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          placeholder="student@example.com"
          placeholderTextColor={getColors().textSubtle}
          onChangeText={(value) => updateDraft({ email: value })}
          style={mobileEntryScreenStyles.input}
        />
      </FormField>
      <FormField label="Password" icon="lock-closed-outline">
        <TextInput
          value={draft.password}
          secureTextEntry
          placeholder="Create a password"
          placeholderTextColor={getColors().textSubtle}
          onChangeText={(value) => updateDraft({ password: value })}
          style={mobileEntryScreenStyles.input}
        />
      </FormField>

      <View style={{ gap: 4, marginTop: 4 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Ionicons name="school" size={14} color={getColors().primary} />
          <Text style={{ color: getColors().text, fontSize: 15, fontWeight: "700" }}>
            Academic Info
          </Text>
        </View>
        <Text style={{ color: getColors().textMuted, fontSize: 12 }}>
          Select your degree program and branch.
        </Text>
      </View>

      <FormField label="Degree" icon="school-outline">
        <PillSelector
          options={DEGREE_OPTIONS}
          selected={draft.degree}
          onSelect={(value) => updateDraft({ degree: value })}
        />
      </FormField>
      <FormField label="Branch" icon="git-branch-outline">
        <PillSelector
          options={BRANCH_OPTIONS}
          selected={draft.branch}
          onSelect={(value) => updateDraft({ branch: value })}
        />
      </FormField>

      {deviceBindingError ? (
        <DeviceBindingErrorBanner error={deviceBindingError} />
      ) : (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            backgroundColor: getColors().surfaceTint,
            borderRadius: 12,
            paddingHorizontal: 14,
            paddingVertical: 12,
            borderWidth: 1,
            borderColor: getColors().border,
          }}
        >
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              backgroundColor: getColors().primarySoft,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="phone-portrait" size={16} color={getColors().primary} />
          </View>
          <Text style={[mobileEntryScreenStyles.helperNote, { flex: 1, marginTop: 0 }]}>
            This device will be linked to your account. One device per student — changes require
            admin approval.
          </Text>
        </View>
      )}
      {!deviceReady ? (
        <Text style={{ fontSize: 12, color: getColors().textMuted, textAlign: "center" }}>
          Preparing device identity…
        </Text>
      ) : null}
    </MobileAuthScreen>
  )
}

export function TeacherSignInScreen() {
  const { draft, updateDraft, signIn, status, errorMessage, hasDevelopmentCredentials, session } =
    useTeacherSession()

  if (session) {
    return <Redirect href={teacherRoutes.dashboard} />
  }

  const formState = buildMobileAuthFormState({
    role: "teacher",
    mode: "sign_in",
    status,
    hasDevelopmentCredentials,
    errorMessage,
  })
  const canSubmit = Boolean(draft.email.trim() && draft.password)

  return (
    <MobileAuthScreen
      entryRole="teacher"
      formState={formState}
      alternateHref={mobileEntryRoutes.teacherRegister}
      canSubmit={canSubmit}
      onSubmit={() => {
        void signIn()
      }}
    >
      <FormField label="Email address" icon="mail-outline">
        <TextInput
          value={draft.email}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          placeholder="teacher@example.com"
          placeholderTextColor={getColors().textSubtle}
          onChangeText={(value) => updateDraft({ email: value })}
          style={mobileEntryScreenStyles.input}
        />
      </FormField>
      <FormField label="Password" icon="lock-closed-outline">
        <TextInput
          value={draft.password}
          secureTextEntry
          placeholder="Enter your password"
          placeholderTextColor={getColors().textSubtle}
          onChangeText={(value) => updateDraft({ password: value })}
          style={mobileEntryScreenStyles.input}
        />
      </FormField>
    </MobileAuthScreen>
  )
}

export function TeacherRegisterScreen() {
  const { draft, updateDraft, register, status, errorMessage, hasDevelopmentCredentials, session } =
    useTeacherSession()

  if (session) {
    return <Redirect href={teacherRoutes.dashboard} />
  }

  const formState = buildMobileAuthFormState({
    role: "teacher",
    mode: "register",
    status,
    hasDevelopmentCredentials,
    errorMessage,
  })
  const canSubmit = Boolean(draft.displayName.trim() && draft.email.trim() && draft.password)

  return (
    <MobileAuthScreen
      entryRole="teacher"
      formState={formState}
      alternateHref={mobileEntryRoutes.teacherSignIn}
      canSubmit={canSubmit}
      onSubmit={() => {
        void register()
      }}
    >
      <FormField label="Full name" icon="person-outline">
        <TextInput
          value={draft.displayName}
          autoCapitalize="words"
          placeholder="Your full name"
          placeholderTextColor={getColors().textSubtle}
          onChangeText={(value) => updateDraft({ displayName: value })}
          style={mobileEntryScreenStyles.input}
        />
      </FormField>
      <FormField label="Email address" icon="mail-outline">
        <TextInput
          value={draft.email}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          placeholder="teacher@example.com"
          placeholderTextColor={getColors().textSubtle}
          onChangeText={(value) => updateDraft({ email: value })}
          style={mobileEntryScreenStyles.input}
        />
      </FormField>
      <FormField label="Password" icon="lock-closed-outline">
        <TextInput
          value={draft.password}
          secureTextEntry
          placeholder="Create a password"
          placeholderTextColor={getColors().textSubtle}
          onChangeText={(value) => updateDraft({ password: value })}
          style={mobileEntryScreenStyles.input}
        />
      </FormField>
    </MobileAuthScreen>
  )
}

export function AdminSignInScreen() {
  const { draft, updateDraft, signIn, status, errorMessage, hasDevelopmentCredentials, session } =
    useAdminSession()

  if (session) {
    return <Redirect href={adminRoutes.dashboard} />
  }

  const formState = buildMobileAuthFormState({
    role: "admin",
    mode: "sign_in",
    status,
    hasDevelopmentCredentials,
    errorMessage,
  })
  const canSubmit = Boolean(draft.email.trim() && draft.password)

  return (
    <MobileAuthScreen
      entryRole="admin"
      formState={formState}
      alternateHref={mobileEntryRoutes.landing}
      canSubmit={canSubmit}
      onSubmit={() => {
        void signIn()
      }}
    >
      <FormField label="Email address" icon="mail-outline">
        <TextInput
          value={draft.email}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          placeholder="admin@example.com"
          placeholderTextColor={getColors().textSubtle}
          onChangeText={(value) => updateDraft({ email: value })}
          style={mobileEntryScreenStyles.input}
        />
      </FormField>
      <FormField label="Password" icon="lock-closed-outline">
        <TextInput
          value={draft.password}
          secureTextEntry
          placeholder="Enter admin password"
          placeholderTextColor={getColors().textSubtle}
          onChangeText={(value) => updateDraft({ password: value })}
          style={mobileEntryScreenStyles.input}
        />
      </FormField>
    </MobileAuthScreen>
  )
}

function FormField(props: {
  label: string
  icon?: React.ComponentProps<typeof Ionicons>["name"]
  children: React.ReactNode
}) {
  const c = getColors()
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        {props.icon ? <Ionicons name={props.icon} size={14} color={c.textSubtle} /> : null}
        <Text style={mobileEntryScreenStyles.inputLabel}>{props.label}</Text>
      </View>
      {props.children}
    </View>
  )
}

function DeviceBindingErrorBanner(props: { error: DeviceBindingErrorModel }) {
  const c = getColors()
  const iconName: React.ComponentProps<typeof Ionicons>["name"] =
    props.error.kind === "DEVICE_BOUND_TO_ANOTHER"
      ? "people-outline"
      : props.error.kind === "REPLACEMENT_PENDING"
        ? "time-outline"
        : props.error.kind === "DEVICE_REPLACED"
          ? "swap-horizontal-outline"
          : "shield-outline"

  return (
    <View
      style={{
        backgroundColor: c.dangerSoft,
        borderRadius: 12,
        padding: 14,
        gap: 10,
        borderWidth: 1,
        borderColor: c.dangerBorder,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            backgroundColor: `${c.danger}20`,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name={iconName} size={18} color={c.danger} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ fontSize: 15, fontWeight: "700", color: c.danger }}>
            {props.error.title}
          </Text>
          <Text style={{ fontSize: 13, color: c.text, lineHeight: 18 }}>{props.error.message}</Text>
        </View>
      </View>
      <Text style={{ fontSize: 12, color: c.textMuted, lineHeight: 17 }}>
        {props.error.supportHint}
      </Text>
    </View>
  )
}

function PillSelector<T extends string>(props: {
  options: readonly { value: T; label: string }[]
  selected: T | undefined
  onSelect: (value: T) => void
}) {
  const c = getColors()
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {props.options.map((option) => {
        const isActive = option.value === props.selected
        return (
          <Pressable
            key={option.value}
            onPress={() => props.onSelect(option.value)}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 20,
              borderWidth: 1.5,
              borderColor: isActive ? c.primary : c.border,
              backgroundColor: isActive ? c.primarySoft : c.surface,
            }}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: isActive ? "700" : "500",
                color: isActive ? c.primary : c.textMuted,
              }}
            >
              {option.label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}
