import { getColors, mobileTheme } from "@attendease/ui-mobile"
import { GradientHeader } from "@attendease/ui-mobile/animated"
import { Redirect } from "expo-router"
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native"

import {
  buildMobileAuthFormState,
  buildMobileEntryCardModel,
  mobileEntryRoutes,
} from "./mobile-entry-models"
import { EntryRoleCard, MobileAuthScreen, mobileEntryScreenStyles } from "./mobile-entry-ui"
import { studentRoutes } from "./student-routes"
import { useStudentSession } from "./student-session"
import { teacherRoutes } from "./teacher-routes"
import { useTeacherSession } from "./teacher-session"

export function MobileEntryLandingScreen() {
  const styles = useLocalStyles()
  const studentSession = useStudentSession()
  const teacherSession = useTeacherSession()

  const studentCard = buildMobileEntryCardModel({
    role: "student",
    hasSession: Boolean(studentSession.session),
    displayName: studentSession.session?.user.displayName,
  })
  const teacherCard = buildMobileEntryCardModel({
    role: "teacher",
    hasSession: Boolean(teacherSession.session),
    displayName: teacherSession.session?.user.displayName,
  })

  return (
    <ScrollView contentContainerStyle={styles.screenContent} style={styles.screen}>
      <GradientHeader
        eyebrow="AttendEase"
        title="Choose your space"
        subtitle="Student and teacher experiences stay separate, but both live inside the same app."
      />

      <EntryRoleCard
        card={studentCard}
        onSignOut={() => {
          studentSession.signOut()
        }}
      />
      <EntryRoleCard
        card={teacherCard}
        onSignOut={() => {
          teacherSession.signOut()
        }}
      />
    </ScrollView>
  )
}

export function StudentSignInScreen() {
  const { draft, updateDraft, signIn, status, errorMessage, hasDevelopmentCredentials, session } =
    useStudentSession()

  if (session) {
    return <Redirect href={studentRoutes.home} />
  }

  const formState = buildMobileAuthFormState({
    role: "student",
    mode: "sign_in",
    status,
    hasDevelopmentCredentials,
    errorMessage,
  })
  const canSubmit = Boolean(draft.email.trim() && draft.password)

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
      <TextInput
        value={draft.email}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        placeholder="student@example.com"
        onChangeText={(value) => updateDraft({ email: value })}
        style={mobileEntryScreenStyles.input}
      />
      <TextInput
        value={draft.password}
        secureTextEntry
        placeholder="Password"
        onChangeText={(value) => updateDraft({ password: value })}
        style={mobileEntryScreenStyles.input}
      />
      <Text style={mobileEntryScreenStyles.helperNote}>
        This phone stays linked to your attendance record after sign in.
      </Text>
    </MobileAuthScreen>
  )
}

export function StudentRegisterScreen() {
  const { draft, updateDraft, register, status, errorMessage, hasDevelopmentCredentials, session } =
    useStudentSession()

  if (session) {
    return <Redirect href={studentRoutes.home} />
  }

  const formState = buildMobileAuthFormState({
    role: "student",
    mode: "register",
    status,
    hasDevelopmentCredentials,
    errorMessage,
  })
  const canSubmit = Boolean(draft.displayName.trim() && draft.email.trim() && draft.password)

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
      <TextInput
        value={draft.displayName}
        autoCapitalize="words"
        placeholder="Full name"
        onChangeText={(value) => updateDraft({ displayName: value })}
        style={mobileEntryScreenStyles.input}
      />
      <TextInput
        value={draft.email}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        placeholder="student@example.com"
        onChangeText={(value) => updateDraft({ email: value })}
        style={mobileEntryScreenStyles.input}
      />
      <TextInput
        value={draft.password}
        secureTextEntry
        placeholder="Create password"
        onChangeText={(value) => updateDraft({ password: value })}
        style={mobileEntryScreenStyles.input}
      />
      <Text style={mobileEntryScreenStyles.helperNote}>
        Your account is created with device registration for this phone from the first session.
      </Text>
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
      <TextInput
        value={draft.email}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        placeholder="teacher@example.com"
        onChangeText={(value) => updateDraft({ email: value })}
        style={mobileEntryScreenStyles.input}
      />
      <TextInput
        value={draft.password}
        secureTextEntry
        placeholder="Password"
        onChangeText={(value) => updateDraft({ password: value })}
        style={mobileEntryScreenStyles.input}
      />
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
      <TextInput
        value={draft.displayName}
        autoCapitalize="words"
        placeholder="Full name"
        onChangeText={(value) => updateDraft({ displayName: value })}
        style={mobileEntryScreenStyles.input}
      />
      <TextInput
        value={draft.email}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        placeholder="teacher@example.com"
        onChangeText={(value) => updateDraft({ email: value })}
        style={mobileEntryScreenStyles.input}
      />
      <TextInput
        value={draft.password}
        secureTextEntry
        placeholder="Create password"
        onChangeText={(value) => updateDraft({ password: value })}
        style={mobileEntryScreenStyles.input}
      />
    </MobileAuthScreen>
  )
}

function useLocalStyles() {
  const c = getColors()
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: c.surface,
    },
    screenContent: {
      padding: mobileTheme.spacing.xl,
      paddingBottom: mobileTheme.spacing.xxxl,
      gap: mobileTheme.spacing.xl,
    },
  })
}
