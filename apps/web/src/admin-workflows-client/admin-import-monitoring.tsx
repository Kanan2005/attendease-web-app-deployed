"use client"

import { useQueries, useQuery } from "@tanstack/react-query"
import { useEffect, useState } from "react"

import { WebSectionCard } from "../web-shell"
import {
  buildImportMonitorRows,
  formatPortalDateTime,
  webWorkflowQueryKeys,
} from "../web-workflows"

import { Banner, StateCard, bootstrap, styles } from "./shared"

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
