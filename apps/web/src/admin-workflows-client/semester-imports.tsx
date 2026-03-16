"use client"

import type { ClassroomStatus, SemesterSummary, UserStatus } from "@attendease/contracts"
import { webTheme } from "@attendease/ui-web"
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query"
import Link from "next/link"
import { startTransition, useEffect, useState } from "react"

import {
  buildAdminClassroomArchiveReadiness,
  buildAdminClassroomGovernanceImpactModel,
  buildAdminClassroomGovernanceListCard,
  buildAdminClassroomGovernanceSummaryMessage,
} from "../admin-classroom-governance"
import { formatAdminSupportLabel } from "../admin-device-support"
import {
  buildAdminStudentManagementSummaryMessage,
  buildAdminStudentStatusActionLabel,
  buildAdminStudentStatusActionReadiness,
} from "../admin-student-management"
import { createWebAuthBootstrap } from "../auth"
import { WebSectionCard } from "../web-shell"
import {
  adminWorkflowRoutes,
  buildImportMonitorRows,
  formatPortalDateTime,
  webWorkflowQueryKeys,
} from "../web-workflows"

import {
  Banner,
  Field,
  SemesterForm,
  StateCard,
  type SemesterFormState,
  bootstrap,
  mapSemesterToForm,
  styles,
} from './shared'

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

export function AdminImportMonitoringWorkspace(props: {
  accessToken: string | null
}) {
  return <SharedImportMonitoringWorkspace accessToken={props.accessToken} scopeLabel="Admin" />
}

export function TeacherImportMonitoringWorkspace(props: {
  accessToken: string | null
}) {
  return <SharedImportMonitoringWorkspace accessToken={props.accessToken} scopeLabel="Teacher" />
}

function SharedImportMonitoringWorkspace(props: {
  accessToken: string | null
  scopeLabel: "Teacher" | "Admin"
}) {
  const [selectedImport, setSelectedImport] = useState<{
    classroomId: string
    jobId: string
  } | null>(null)
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "REVIEW_REQUIRED" | "FAILED" | "APPLIED" | "PROCESSING" | "UPLOADED"
  >("ALL")

  const classroomsQuery = useQuery({
    queryKey: webWorkflowQueryKeys.classrooms(),
    enabled: Boolean(props.accessToken),
    queryFn: () => bootstrap.authClient.listClassrooms(props.accessToken ?? ""),
  })

  const importQueries = useQueries({
    queries: (classroomsQuery.data ?? []).map((classroom) => ({
      queryKey: webWorkflowQueryKeys.classroomImports(classroom.id),
      enabled: Boolean(props.accessToken),
      queryFn: () =>
        bootstrap.authClient.listRosterImportJobs(props.accessToken ?? "", classroom.id),
    })),
  })

  const aggregatedRows =
    classroomsQuery.data && importQueries.length > 0
      ? buildImportMonitorRows({
          classrooms: classroomsQuery.data,
          jobsByClassroom: Object.fromEntries(
            importQueries.map((query, index) => [
              classroomsQuery.data?.[index]?.id ?? `classroom-${index}`,
              query.data ?? [],
            ]),
          ),
        }).filter((row) => (statusFilter === "ALL" ? true : row.status === statusFilter))
      : []

  useEffect(() => {
    if (aggregatedRows.length === 0 || selectedImport) {
      return
    }

    setSelectedImport({
      classroomId: aggregatedRows[0]?.classroomId ?? "",
      jobId: aggregatedRows[0]?.jobId ?? "",
    })
  }, [aggregatedRows, selectedImport])

  const detailQuery = useQuery({
    queryKey: selectedImport
      ? webWorkflowQueryKeys.classroomImportDetail(selectedImport.classroomId, selectedImport.jobId)
      : ["web-workflows", "admin-import-detail", "none"],
    enabled: Boolean(props.accessToken && selectedImport),
    queryFn: () =>
      bootstrap.authClient.getRosterImportJob(
        props.accessToken ?? "",
        selectedImport?.classroomId ?? "",
        selectedImport?.jobId ?? "",
      ),
  })

  const isImportsLoading =
    classroomsQuery.isLoading || importQueries.some((query) => query.isLoading)

  return (
    <div style={styles.grid}>
      <WebSectionCard
        title="Import Monitoring"
        description={`${props.scopeLabel} import oversight keeps uploaded files, review-required jobs, and failures in one queue.`}
      >
        {!props.accessToken ? (
          <StateCard
            message={`No ${props.scopeLabel.toLowerCase()} web access token is available for import monitoring yet.`}
          />
        ) : (
          <div style={styles.grid}>
            <label style={{ display: "grid", gap: 6, maxWidth: 260 }}>
              <span>Filter import status</span>
              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(
                    event.target.value as
                      | "ALL"
                      | "REVIEW_REQUIRED"
                      | "FAILED"
                      | "APPLIED"
                      | "PROCESSING"
                      | "UPLOADED",
                  )
                }
                style={styles.input}
              >
                <option value="ALL">All statuses</option>
                <option value="UPLOADED">Uploaded</option>
                <option value="PROCESSING">Processing</option>
                <option value="REVIEW_REQUIRED">Review required</option>
                <option value="APPLIED">Applied</option>
                <option value="FAILED">Failed</option>
              </select>
            </label>

            {isImportsLoading ? <StateCard message="Loading import monitor rows..." /> : null}
            {classroomsQuery.isError ? (
              <Banner
                tone="danger"
                message={
                  classroomsQuery.error instanceof Error
                    ? classroomsQuery.error.message
                    : "Failed to load classrooms for import monitoring."
                }
              />
            ) : null}

            {aggregatedRows.length > 0 ? (
              <div style={{ overflowX: "auto" }}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Classroom</th>
                      <th style={styles.th}>Source</th>
                      <th style={styles.th}>Status</th>
                      <th style={styles.th}>Rows</th>
                      <th style={styles.th}>Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {aggregatedRows.map((row) => (
                      <tr
                        key={row.jobId}
                        style={{
                          background:
                            selectedImport?.jobId === row.jobId
                              ? "rgba(37, 99, 235, 0.06)"
                              : undefined,
                          cursor: "pointer",
                        }}
                        tabIndex={0}
                        onClick={() =>
                          setSelectedImport({
                            classroomId: row.classroomId,
                            jobId: row.jobId,
                          })
                        }
                        onKeyDown={(event) => {
                          if (event.key !== "Enter" && event.key !== " ") {
                            return
                          }

                          event.preventDefault()
                          setSelectedImport({
                            classroomId: row.classroomId,
                            jobId: row.jobId,
                          })
                        }}
                      >
                        <td style={styles.td}>
                          <strong>{row.classroomTitle}</strong>
                          <div style={{ color: "#64748b", marginTop: 4 }}>{row.classroomCode}</div>
                        </td>
                        <td style={styles.td}>{row.jobId}</td>
                        <td style={styles.td}>
                          <span style={styles.pill}>{row.status}</span>
                        </td>
                        <td style={styles.td}>
                          {row.appliedRows}/{row.totalRows} applied
                        </td>
                        <td style={styles.td}>{formatPortalDateTime(row.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : !isImportsLoading ? (
              <StateCard message="No import jobs are available for the current filter." />
            ) : null}
          </div>
        )}
      </WebSectionCard>

      <WebSectionCard
        title="Selected Import Detail"
        description="Review the selected upload before you guide the next follow-up step."
      >
        {detailQuery.isLoading ? (
          <StateCard message="Loading import detail..." />
        ) : detailQuery.isError ? (
          <Banner
            tone="danger"
            message={
              detailQuery.error instanceof Error
                ? detailQuery.error.message
                : "Failed to load the selected import detail."
            }
          />
        ) : detailQuery.data ? (
          <div style={styles.grid}>
            <div style={styles.buttonRow}>
              <span style={styles.pill}>{detailQuery.data.status}</span>
              <span style={styles.pill}>
                {detailQuery.data.validRows} valid / {detailQuery.data.invalidRows} invalid
              </span>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Row</th>
                    <th style={styles.th}>Student</th>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>Error</th>
                  </tr>
                </thead>
                <tbody>
                  {detailQuery.data.rows.slice(0, 15).map((row) => (
                    <tr key={row.id}>
                      <td style={styles.td}>{row.rowNumber}</td>
                      <td style={styles.td}>
                        {row.studentEmail ?? row.studentRollNumber ?? "Unknown"}
                      </td>
                      <td style={styles.td}>{row.status}</td>
                      <td style={styles.td}>{row.errorMessage ?? "None"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <StateCard message="Choose an import row from the monitoring table to inspect it." />
        )}
      </WebSectionCard>
    </div>
  )
}
