import { Pressable, Text, TextInput } from "react-native"

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
  const createDisabled = isCreateImportPending || !hasSourceAndRows
  return (
    <TeacherCard
      title="Bulk Import"
      subtitle="Normal roster work stays above. Use this only when you need to queue a larger student batch."
    >
      <Text style={styles.listMeta}>{importPreviewTitle}</Text>
      <Text style={styles.listMeta}>{importPreviewMessage}</Text>
      <TextInput
        value={importSourceFileName}
        autoCapitalize="none"
        placeholder="teacher-mobile-import.csv"
        onChangeText={onSetImportSourceFileName}
        style={styles.input}
      />
      <TextInput
        value={importRowsText}
        autoCapitalize="none"
        multiline
        placeholder="student.one@attendease.dev, Student One"
        onChangeText={onSetImportRows}
        style={[styles.input, styles.multilineInput]}
      />
      <Text style={styles.listMeta}>
        Parsed rows: {parsedRowsCount} · Invalid lines: {invalidImportRows}
      </Text>
      {invalidImportRows ? (
        <Text style={styles.errorText}>
          Invalid lines will be ignored until the document-picker upload adapter lands.
        </Text>
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
          {isCreateImportPending ? "Creating Import..." : "Create Import Job"}
        </Text>
      </Pressable>
      {!isAddStudentEnabled ? null : (
        <Text style={styles.listMeta}>
          You can still add individuals even with a larger import.
        </Text>
      )}
    </TeacherCard>
  )
}
