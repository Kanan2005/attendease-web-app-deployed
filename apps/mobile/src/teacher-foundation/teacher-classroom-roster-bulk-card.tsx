import { getColors, mobileTheme } from "@attendease/ui-mobile"
import { Ionicons } from "@expo/vector-icons"
import * as DocumentPicker from "expo-document-picker"
import * as FileSystem from "expo-file-system"
import { useState } from "react"
import { Pressable, Text, TextInput, View } from "react-native"

import { TeacherCard, styles } from "./shared-ui"

type Props = {
  importPreviewTitle: string
  importPreviewMessage: string
  importSourceFileName: string
  importRowsText: string
  parsedRowsCount: number
  invalidImportRows: number
  isCreateImportPending: boolean
  onSetImportSourceFileName: (value: string) => void
  onSetImportRows: (value: string) => void
  onCreateImportJob: () => void
  onSetRosterMessage: (message: string | null) => void
  isAddStudentEnabled: boolean
  hasSourceAndRows: boolean
}

export function TeacherClassroomRosterBulkCard({
  importPreviewTitle,
  importPreviewMessage,
  importSourceFileName,
  importRowsText,
  parsedRowsCount,
  invalidImportRows,
  isCreateImportPending,
  onSetImportSourceFileName,
  onSetImportRows,
  onCreateImportJob,
  onSetRosterMessage,
  isAddStudentEnabled,
  hasSourceAndRows,
}: Props) {
  const c = getColors()
  const [filePickError, setFilePickError] = useState<string | null>(null)
  const createDisabled = isCreateImportPending || !hasSourceAndRows

  async function handleFilePick() {
    setFilePickError(null)
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          "text/csv",
          "text/plain",
          "application/vnd.ms-excel",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ],
        copyToCacheDirectory: true,
      })

      if (result.canceled || !result.assets?.length) return

      const asset = result.assets[0]
      if (!asset) return

      onSetImportSourceFileName(asset.name)

      if (asset.name.endsWith(".csv") || asset.name.endsWith(".txt")) {
        const content = await FileSystem.readAsStringAsync(asset.uri)
        onSetImportRows(content)
      } else {
        setFilePickError(
          "Excel files (.xlsx) are read as CSV. Please export your spreadsheet as CSV and try again.",
        )
      }
    } catch {
      setFilePickError("Could not read the selected file.")
    }
  }

  return (
    <TeacherCard
      title="Add Students"
      subtitle="Upload a file or paste student emails to add in bulk."
    >
      {/* File Upload Button */}
      <Pressable
        onPress={() => {
          void handleFilePick()
        }}
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          borderWidth: 1.5,
          borderColor: c.primary,
          borderStyle: "dashed",
          borderRadius: 12,
          paddingVertical: 18,
          backgroundColor: c.primarySoft,
        }}
      >
        <Ionicons name="cloud-upload-outline" size={22} color={c.primary} />
        <Text style={{ fontSize: 15, fontWeight: "600", color: c.primary }}>
          Upload CSV / Excel File
        </Text>
      </Pressable>

      {filePickError ? (
        <Text style={{ fontSize: 13, color: c.danger, lineHeight: 20 }}>{filePickError}</Text>
      ) : null}

      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginVertical: 4 }}>
        <View style={{ flex: 1, height: 0.5, backgroundColor: c.border }} />
        <Text style={{ fontSize: 12, color: c.textSubtle, fontWeight: "600" }}>OR PASTE BELOW</Text>
        <View style={{ flex: 1, height: 0.5, backgroundColor: c.border }} />
      </View>

      <TextInput
        value={importRowsText}
        autoCapitalize="none"
        multiline
        placeholder={"student1@example.com, Student One\nstudent2@example.com, Student Two"}
        placeholderTextColor={c.textSubtle}
        onChangeText={onSetImportRows}
        style={[styles.input, styles.multilineInput, { minHeight: 80 }]}
      />

      {parsedRowsCount > 0 || invalidImportRows > 0 ? (
        <View style={{ flexDirection: "row", gap: 16 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Ionicons name="checkmark-circle" size={14} color={c.success} />
            <Text style={{ fontSize: 13, color: c.success, fontWeight: "600" }}>
              {parsedRowsCount} valid
            </Text>
          </View>
          {invalidImportRows > 0 ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Ionicons name="alert-circle" size={14} color={c.danger} />
              <Text style={{ fontSize: 13, color: c.danger, fontWeight: "600" }}>
                {invalidImportRows} invalid
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}

      <Pressable
        style={[styles.primaryButton, createDisabled ? styles.disabledButton : null]}
        disabled={createDisabled}
        onPress={() => {
          onSetRosterMessage(null)
          onCreateImportJob()
        }}
      >
        <Text style={styles.primaryButtonLabel}>
          {isCreateImportPending
            ? "Importing…"
            : `Import ${parsedRowsCount} Student${parsedRowsCount === 1 ? "" : "s"}`}
        </Text>
      </Pressable>

      <Text style={{ fontSize: 12, color: c.textSubtle, lineHeight: 18 }}>
        {importPreviewTitle}
      </Text>
    </TeacherCard>
  )
}
