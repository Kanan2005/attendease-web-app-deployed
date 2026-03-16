"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { startTransition, useEffect, useState } from "react"

import { WebSectionCard } from "../web-shell"
import { formatPortalDateTime, webWorkflowQueryKeys } from "../web-workflows"

import {
  Banner,
  Field,
  SemesterForm,
  type SemesterFormState,
  StateCard,
  bootstrap,
  mapSemesterToForm,
  styles,
} from "./shared"

export function AdminSemesterManagementWorkspace(props: {
  accessToken: string | null
}) {
  const queryClient = useQueryClient()
  const [selectedSemesterId, setSelectedSemesterId] = useState("")
  const [createForm, setCreateForm] = useState<SemesterFormState>({
    academicTermId: "",
    code: "",
    title: "",
    ordinal: "",
    startDate: "",
    endDate: "",
    attendanceCutoffDate: "",
  })
  const [editForm, setEditForm] = useState<SemesterFormState>({
    academicTermId: "",
    code: "",
    title: "",
    ordinal: "",
    startDate: "",
    endDate: "",
    attendanceCutoffDate: "",
  })
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  const semestersQuery = useQuery({
    queryKey: webWorkflowQueryKeys.semesters(),
    enabled: Boolean(props.accessToken),
    queryFn: () => bootstrap.authClient.listSemesters(props.accessToken ?? ""),
  })

  useEffect(() => {
    if (!semestersQuery.data || semestersQuery.data.length === 0) {
      return
    }

    startTransition(() => {
      setSelectedSemesterId((current) => current || semestersQuery.data[0]?.id || "")
    })
  }, [semestersQuery.data])

  useEffect(() => {
    if (!semestersQuery.data || !selectedSemesterId) {
      return
    }

    const selected = semestersQuery.data.find((semester) => semester.id === selectedSemesterId)

    if (!selected) {
      return
    }

    setEditForm(mapSemesterToForm(selected))
  }, [selectedSemesterId, semestersQuery.data])

  const createSemester = useMutation({
    mutationFn: async () => {
      if (!props.accessToken) {
        throw new Error("Admin semester creation requires an authenticated admin web session.")
      }

      return bootstrap.authClient.createSemester(props.accessToken, {
        academicTermId: createForm.academicTermId.trim(),
        code: createForm.code.trim(),
        title: createForm.title.trim(),
        ...(createForm.ordinal.trim() ? { ordinal: Number(createForm.ordinal) } : {}),
        startDate: createForm.startDate.trim(),
        endDate: createForm.endDate.trim(),
        ...(createForm.attendanceCutoffDate.trim()
          ? { attendanceCutoffDate: createForm.attendanceCutoffDate.trim() }
          : {}),
      })
    },
    onSuccess: async (semester) => {
      setStatusMessage(`Created semester ${semester.title}.`)
      setCreateForm({
        academicTermId: "",
        code: "",
        title: "",
        ordinal: "",
        startDate: "",
        endDate: "",
        attendanceCutoffDate: "",
      })
      await queryClient.invalidateQueries({
        queryKey: webWorkflowQueryKeys.semesters(),
      })
    },
    onError: (error) => {
      setStatusMessage(error instanceof Error ? error.message : "Failed to create the semester.")
    },
  })

  const updateSemester = useMutation({
    mutationFn: async () => {
      if (!props.accessToken || !selectedSemesterId) {
        throw new Error("Select a semester before saving lifecycle changes.")
      }

      return bootstrap.authClient.updateSemester(props.accessToken, selectedSemesterId, {
        code: editForm.code.trim(),
        title: editForm.title.trim(),
        ordinal: editForm.ordinal.trim() ? Number(editForm.ordinal) : null,
        startDate: editForm.startDate.trim(),
        endDate: editForm.endDate.trim(),
        attendanceCutoffDate: editForm.attendanceCutoffDate.trim()
          ? editForm.attendanceCutoffDate.trim()
          : null,
      })
    },
    onSuccess: async (semester) => {
      setStatusMessage(`Saved updates for ${semester.title}.`)
      await queryClient.invalidateQueries({
        queryKey: webWorkflowQueryKeys.semesters(),
      })
    },
    onError: (error) => {
      setStatusMessage(error instanceof Error ? error.message : "Failed to update the semester.")
    },
  })

  const activateSemester = useMutation({
    mutationFn: async () => {
      if (!props.accessToken || !selectedSemesterId) {
        throw new Error("Select a semester before activating it.")
      }

      return bootstrap.authClient.activateSemester(props.accessToken, selectedSemesterId)
    },
    onSuccess: async (semester) => {
      setStatusMessage(`Activated ${semester.title}.`)
      await queryClient.invalidateQueries({
        queryKey: webWorkflowQueryKeys.semesters(),
      })
    },
    onError: (error) => {
      setStatusMessage(error instanceof Error ? error.message : "Failed to activate the semester.")
    },
  })

  const archiveSemester = useMutation({
    mutationFn: async () => {
      if (!props.accessToken || !selectedSemesterId) {
        throw new Error("Select a semester before archiving it.")
      }

      return bootstrap.authClient.archiveSemester(props.accessToken, selectedSemesterId)
    },
    onSuccess: async (semester) => {
      setStatusMessage(`Archived ${semester.title}.`)
      await queryClient.invalidateQueries({
        queryKey: webWorkflowQueryKeys.semesters(),
      })
    },
    onError: (error) => {
      setStatusMessage(error instanceof Error ? error.message : "Failed to archive the semester.")
    },
  })

  return (
    <div style={styles.grid}>
      <WebSectionCard
        title="Create Semester"
        description="Open a new semester before classrooms and schedules start using it."
      >
        {!props.accessToken ? (
          <StateCard message="No admin web access token is available for semester management yet." />
        ) : (
          <div style={styles.grid}>
            <SemesterForm form={createForm} onChange={setCreateForm} />
            <button
              type="button"
              onClick={() => createSemester.mutate()}
              disabled={createSemester.isPending}
              style={styles.primaryButton}
            >
              {createSemester.isPending ? "Creating..." : "Create semester"}
            </button>
          </div>
        )}
      </WebSectionCard>

      <WebSectionCard
        title="Semester Records"
        description="Select a semester to update dates, activate it, or archive it."
      >
        {semestersQuery.isLoading ? <StateCard message="Loading semesters..." /> : null}
        {semestersQuery.isError ? (
          <Banner
            tone="danger"
            message={
              semestersQuery.error instanceof Error
                ? semestersQuery.error.message
                : "Failed to load semesters."
            }
          />
        ) : null}

        {semestersQuery.data && semestersQuery.data.length > 0 ? (
          <div style={styles.grid}>
            <label style={{ display: "grid", gap: 6, maxWidth: 320 }}>
              <span>Selected semester</span>
              <select
                value={selectedSemesterId}
                onChange={(event) => setSelectedSemesterId(event.target.value)}
                style={styles.input}
              >
                {semestersQuery.data.map((semester) => (
                  <option key={semester.id} value={semester.id}>
                    {semester.title} ({semester.code})
                  </option>
                ))}
              </select>
            </label>

            <div style={{ overflowX: "auto" }}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Semester</th>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>Range</th>
                    <th style={styles.th}>Cutoff</th>
                  </tr>
                </thead>
                <tbody>
                  {semestersQuery.data.map((semester) => (
                    <tr key={semester.id}>
                      <td style={styles.td}>
                        <strong>{semester.title}</strong>
                        <div style={{ color: "#64748b", marginTop: 4 }}>{semester.code}</div>
                      </td>
                      <td style={styles.td}>{semester.status}</td>
                      <td style={styles.td}>
                        {formatPortalDateTime(semester.startDate)} -{" "}
                        {formatPortalDateTime(semester.endDate)}
                      </td>
                      <td style={styles.td}>
                        {semester.attendanceCutoffDate
                          ? formatPortalDateTime(semester.attendanceCutoffDate)
                          : "Not set"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {selectedSemesterId ? (
              <div style={styles.grid}>
                <SemesterForm form={editForm} onChange={setEditForm} />
                <div style={styles.buttonRow}>
                  <button
                    type="button"
                    onClick={() => updateSemester.mutate()}
                    disabled={updateSemester.isPending}
                    style={styles.primaryButton}
                  >
                    {updateSemester.isPending ? "Saving..." : "Save semester"}
                  </button>
                  <button
                    type="button"
                    onClick={() => activateSemester.mutate()}
                    disabled={activateSemester.isPending}
                    style={styles.secondaryButton}
                  >
                    {activateSemester.isPending ? "Activating..." : "Activate"}
                  </button>
                  <button
                    type="button"
                    onClick={() => archiveSemester.mutate()}
                    disabled={archiveSemester.isPending}
                    style={styles.dangerButton}
                  >
                    {archiveSemester.isPending ? "Archiving..." : "Archive"}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </WebSectionCard>

      {statusMessage ? <Banner tone="info" message={statusMessage} /> : null}
    </div>
  )
}
