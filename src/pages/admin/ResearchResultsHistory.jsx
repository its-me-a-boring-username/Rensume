// src/pages/admin/ResearchResultsHistory.jsx
// Results History v2:
// - Left pane: recent runs with delete action
// - Right pane: dot-table-first details for selected run

import { useEffect, useMemo, useState } from "react"
import RoleLabelDotTable from "../../components/RoleLabelDotTable.jsx"
import { supabase } from "../../lib/supabase.js"

const label9 = {
  fontSize: 9,
  fontWeight: 700,
  letterSpacing: ".12em",
  textTransform: "uppercase",
  color: "#a09080",
}

const ACCENT_COLORS = ["#904060", "#3a6aaa", "#c07030", "#2a7a6a", "#7a3aaa", "#aa6a2a", "#3aaa6a", "#aa3a3a"]

function formatDate(ts) {
  if (!ts) return "Unknown date"
  try {
    return new Date(ts).toLocaleString()
  } catch {
    return "Unknown date"
  }
}

function safeResumeName(run) {
  const rel = run?.research_resumes
  if (Array.isArray(rel)) return rel[0]?.name || "Unknown resume"
  if (rel && typeof rel === "object") return rel.name || "Unknown resume"
  return "Unknown resume"
}

function parseSettingsSummary(settings) {
  if (!settings || typeof settings !== "object") return "No settings snapshot"
  const models = Array.isArray(settings.models) ? settings.models.length : 0
  const blind = settings.blind ? "Blind on" : "Blind off"
  return `${models} variant${models === 1 ? "" : "s"} • ${blind}`
}

function parseVariantMeta(row, index) {
  return {
    key: row.variant_key || `variant-${index}`,
    label: row.variant_label || row.model_label || row.variant_key || "Unknown variant",
    accent: ACCENT_COLORS[index % ACCENT_COLORS.length],
  }
}

function formatYearsFromMonths(months) {
  const n = Number(months)
  if (!Number.isFinite(n)) return "—"
  return `${(Math.round((n / 12) * 10) / 10).toFixed(1)}y`
}

function VariantDetails({ row, accent }) {
  const functions = Array.isArray(row?.functions) ? row.functions : []

  return (
    <div
      style={{
        background: "white",
        border: "1px solid #e0dbd4",
        borderTop: `2px solid ${accent}`,
        borderRadius: 6,
        padding: "12px 14px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, gap: 10 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#1a1410" }}>{row.variant_label || row.variant_key || "Unknown variant"}</div>
        <div style={{ fontSize: 10, color: "#a09080" }}>{row.model_string || row.model_label || "Unknown model"}</div>
      </div>

      <div style={{ marginBottom: 8 }}>
        <div style={{ ...label9, marginBottom: 3 }}>Summary</div>
        <div style={{ fontSize: 11, color: "#1a1410", lineHeight: 1.6 }}>{row.summary?.trim() || "No summary recorded."}</div>
      </div>

      <div style={{ marginBottom: 8 }}>
        <div style={{ ...label9, marginBottom: 3 }}>Strengths</div>
        <div style={{ fontSize: 11, color: "#706050", lineHeight: 1.6 }}>{row.strengths?.trim() || "No strengths recorded."}</div>
      </div>

      <div>
        <div style={{ ...label9, marginBottom: 4 }}>Functions</div>
        {!functions.length ? (
          <div style={{ fontSize: 10, color: "#a09080" }}>No function rows recorded.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {functions.map((fn, i) => (
              <div
                key={`${row.id}-fn-${i}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  background: "#faf8f5",
                  border: "1px solid #ede8e2",
                  borderRadius: 4,
                  padding: "6px 8px",
                  gap: 8,
                }}
              >
                <span style={{ fontSize: 11, color: "#1a1410", fontWeight: 700 }}>{fn?.name || "Unnamed function"}</span>
                <span style={{ fontSize: 10, color: "#a09080" }}>{formatYearsFromMonths(fn?.months)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function DeleteRunModal({ run, reason, setReason, onCancel, onConfirm, deleting }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(10, 8, 6, 0.38)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
        padding: 20,
      }}
    >
      <div style={{ width: "100%", maxWidth: 520, background: "white", border: "1px solid #d8d0c4", borderRadius: 8, padding: "16px 18px" }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: "#1a1410", marginBottom: 6 }}>Delete Run</div>
        <div style={{ fontSize: 11, color: "#706050", lineHeight: 1.6, marginBottom: 10 }}>
          Deleting <strong>{safeResumeName(run)}</strong> from active Results requires a reason. The run data and reason will be permanently stored in audit history.
        </div>

        <div style={{ ...label9, marginBottom: 5 }}>Deletion reason (required)</div>
        <textarea
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="Why is this run being deleted?"
          style={{ width: "100%", minHeight: 92, resize: "vertical", border: "1px solid #d8d0c4", borderRadius: 6, padding: "10px 12px", fontSize: 12, fontFamily: "inherit", color: "#1a1410", outline: "none", boxSizing: "border-box", marginBottom: 12 }}
        />

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button
            onClick={onCancel}
            disabled={deleting}
            style={{ border: "1px solid #d8d0c4", background: "white", color: "#706050", fontSize: 11, fontWeight: 700, padding: "8px 12px", borderRadius: 4, cursor: "pointer" }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting || !reason.trim()}
            style={{ border: "none", background: deleting || !reason.trim() ? "#e0dbd4" : "#c04060", color: "#fff", fontSize: 11, fontWeight: 700, padding: "8px 12px", borderRadius: 4, cursor: deleting || !reason.trim() ? "not-allowed" : "pointer" }}
          >
            {deleting ? "Deleting..." : "Delete run"}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ResearchResultsHistory() {
  const [runs, setRuns] = useState([])
  const [runsLoading, setRunsLoading] = useState(true)
  const [runsError, setRunsError] = useState("")
  const [selectedRunId, setSelectedRunId] = useState(null)

  const [variantRows, setVariantRows] = useState([])
  const [variantLoading, setVariantLoading] = useState(false)
  const [variantError, setVariantError] = useState("")

  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteReason, setDeleteReason] = useState("")
  const [deleteError, setDeleteError] = useState("")
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function loadRuns() {
      setRunsLoading(true)
      setRunsError("")

      let { data, error } = await supabase
        .from("research_runs")
        .select(`
          id,
          created_at,
          notes,
          settings,
          resume_id,
          parsed_roles_snapshot,
          deleted_at,
          research_resumes(name)
        `)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
      if (error && /deleted_at|column/i.test(error.message || "")) {
        const legacy = await supabase
          .from("research_runs")
          .select(`
            id,
            created_at,
            notes,
            settings,
            resume_id,
            parsed_roles_snapshot,
            research_resumes(name)
          `)
          .order("created_at", { ascending: false })
        data = legacy.data
        error = legacy.error
      }

      if (cancelled) return

      if (error) {
        setRuns([])
        setSelectedRunId(null)
        setRunsError(`Failed to load runs: ${error.message}`)
      } else {
        const rows = data || []
        setRuns(rows)
        setSelectedRunId(rows[0]?.id ?? null)
      }

      setRunsLoading(false)
    }

    loadRuns()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function loadRunResults() {
      if (!selectedRunId) {
        setVariantRows([])
        setVariantError("")
        return
      }

      setVariantLoading(true)
      setVariantError("")

      let { data, error } = await supabase
        .from("research_run_results")
        .select("id, run_id, variant_key, variant_label, model_string, model_label, classifications, summary, strengths, functions")
        .eq("run_id", selectedRunId)
        .order("variant_key", { ascending: true })
      if (error && /variant_label|model_label|column/i.test(error.message || "")) {
        const legacy = await supabase
          .from("research_run_results")
          .select("id, run_id, variant_key, model_string, classifications, summary, strengths, functions")
          .eq("run_id", selectedRunId)
          .order("variant_key", { ascending: true })
        data = legacy.data
        error = legacy.error
      }

      if (cancelled) return

      if (error) {
        setVariantRows([])
        setVariantError(`Failed to load run results: ${error.message}`)
      } else {
        setVariantRows(data || [])
      }
      setVariantLoading(false)
    }

    loadRunResults()
    return () => {
      cancelled = true
    }
  }, [selectedRunId])

  const selectedRun = useMemo(() => runs.find(r => r.id === selectedRunId) || null, [runs, selectedRunId])

  const activeVariants = useMemo(
    () => variantRows.map((row, i) => parseVariantMeta(row, i)),
    [variantRows]
  )

  const classificationsByVariant = useMemo(
    () => variantRows.reduce((acc, row, i) => {
      const meta = parseVariantMeta(row, i)
      acc[meta.key] = Array.isArray(row.classifications) ? row.classifications : []
      return acc
    }, {}),
    [variantRows]
  )

  const selectedRoles = useMemo(() => {
    const roles = selectedRun?.parsed_roles_snapshot
    return Array.isArray(roles) ? roles : []
  }, [selectedRun])

  const openDeleteModal = (run) => {
    setDeleteTarget(run)
    setDeleteReason("")
    setDeleteError("")
  }

  const closeDeleteModal = () => {
    if (deleting) return
    setDeleteTarget(null)
    setDeleteReason("")
    setDeleteError("")
  }

  const handleDeleteRun = async () => {
    if (!deleteTarget) return
    const reason = deleteReason.trim()
    if (!reason) {
      setDeleteError("Deletion reason is required.")
      return
    }

    setDeleting(true)
    setDeleteError("")

    const { data: userData } = await supabase.auth.getUser()
    const actor = userData?.user || null

    const { error } = await supabase.rpc("soft_delete_research_run", {
      p_run_id: deleteTarget.id,
      p_reason: reason,
      p_deleted_by_user_id: actor?.id || null,
      p_deleted_by_email: actor?.email || null,
    })

    if (error) {
      setDeleting(false)
      setDeleteError(error.message || "Delete failed. Apply db/research_results_v2.sql if soft-delete RPC is not installed yet.")
      return
    }

    const removedId = deleteTarget.id
    setRuns(prev => {
      const next = prev.filter(r => r.id !== removedId)
      if (selectedRunId === removedId) {
        setSelectedRunId(next[0]?.id || null)
      }
      return next
    })

    if (selectedRunId === removedId) {
      setVariantRows([])
      setVariantError("")
    }

    setDeleting(false)
    setDeleteTarget(null)
    setDeleteReason("")
    setDeleteError("")
  }

  return (
    <div>
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: "#1a1410", marginBottom: 4 }}>Results History</div>
        <div style={{ fontSize: 12, color: "#706050" }}>Browse saved runs, compare dot-grid outputs, and remove noisy test runs.</div>
      </div>

      {runsLoading ? (
        <div style={{ fontSize: 12, color: "#a09080" }}>Loading run history...</div>
      ) : runsError ? (
        <div style={{ background: "#fef2f2", border: "0.5px solid #fca5a5", borderRadius: 6, padding: "10px 12px", fontSize: 11, color: "#c04060" }}>
          {runsError}
        </div>
      ) : !runs.length ? (
        <div style={{ fontSize: 12, color: "#a09080" }}>No active runs found. Run analysis first to populate this page.</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 18 }}>
          <div style={{ background: "#faf8f5", border: "1px solid #e0dbd4", borderRadius: 6, padding: "12px 10px", maxHeight: "calc(100vh - 220px)", overflowY: "auto" }}>
            <div style={{ ...label9, margin: "0 6px 10px" }}>Recent runs</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {runs.map(run => {
                const isActive = run.id === selectedRunId
                return (
                  <div
                    key={run.id}
                    style={{
                      position: "relative",
                      textAlign: "left",
                      background: isActive ? "#f5eaee" : "white",
                      border: `1px solid ${isActive ? "#904060" : "#e0dbd4"}`,
                      borderRadius: 6,
                      padding: "10px 12px",
                      cursor: "pointer",
                    }}
                    onClick={() => setSelectedRunId(run.id)}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        openDeleteModal(run)
                      }}
                      title="Delete run"
                      style={{
                        position: "absolute",
                        top: 6,
                        right: 8,
                        border: "none",
                        background: "none",
                        color: "#a09080",
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: "pointer",
                        padding: 0,
                        lineHeight: 1,
                      }}
                    >
                      X
                    </button>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#1a1410", marginBottom: 2, paddingRight: 16 }}>{safeResumeName(run)}</div>
                    <div style={{ fontSize: 10, color: "#a09080", marginBottom: 4 }}>{formatDate(run.created_at)}</div>
                    <div style={{ fontSize: 10, color: "#706050" }}>{parseSettingsSummary(run.settings)}</div>
                  </div>
                )
              })}
            </div>
          </div>

          <div style={{ background: "#faf8f5", border: "1px solid #e0dbd4", borderRadius: 6, padding: "14px 16px" }}>
            {!selectedRun ? (
              <div style={{ fontSize: 12, color: "#a09080" }}>Select a run to view details.</div>
            ) : (
              <>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#1a1410", marginBottom: 4 }}>{safeResumeName(selectedRun)}</div>
                  <div style={{ fontSize: 10, color: "#a09080", marginBottom: 4 }}>
                    {selectedRun.id.slice(0, 8).toUpperCase()} • {formatDate(selectedRun.created_at)}
                  </div>
                  <div style={{ fontSize: 10, color: "#706050" }}>{parseSettingsSummary(selectedRun.settings)}</div>
                </div>

                <div style={{ marginBottom: 14 }}>
                  <div style={{ ...label9, marginBottom: 5 }}>Run notes</div>
                  <div style={{ fontSize: 11, color: "#706050", lineHeight: 1.6 }}>{selectedRun.notes?.trim() || "No notes for this run."}</div>
                </div>

                <div style={{ ...label9, marginBottom: 8 }}>Role-level label assignments</div>
                {variantLoading ? (
                  <div style={{ fontSize: 12, color: "#a09080", marginBottom: 16 }}>Loading variant results...</div>
                ) : variantError ? (
                  <div style={{ background: "#fef2f2", border: "0.5px solid #fca5a5", borderRadius: 6, padding: "10px 12px", fontSize: 11, color: "#c04060", marginBottom: 16 }}>
                    {variantError}
                  </div>
                ) : !variantRows.length ? (
                  <div style={{ fontSize: 12, color: "#a09080", marginBottom: 16 }}>This run has no saved variant rows yet.</div>
                ) : (
                  <RoleLabelDotTable
                    roles={selectedRoles}
                    classificationsByVariant={classificationsByVariant}
                    activeVariants={activeVariants}
                    title="Role-level label assignments"
                  />
                )}

                {!variantLoading && !variantError && variantRows.length > 0 && (
                  <>
                    <div style={{ ...label9, marginBottom: 8 }}>Variant details</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {variantRows.map((row, i) => (
                        <VariantDetails key={row.id} row={row} accent={activeVariants[i]?.accent || ACCENT_COLORS[i % ACCENT_COLORS.length]} />
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {deleteTarget && (
        <DeleteRunModal
          run={deleteTarget}
          reason={deleteReason}
          setReason={setDeleteReason}
          onCancel={closeDeleteModal}
          onConfirm={handleDeleteRun}
          deleting={deleting}
        />
      )}

      {deleteTarget && deleteError && (
        <div style={{ position: "fixed", left: 20, bottom: 20, background: "#fef2f2", border: "0.5px solid #fca5a5", borderRadius: 6, padding: "10px 12px", fontSize: 11, color: "#c04060", zIndex: 60 }}>
          {deleteError}
        </div>
      )}
    </div>
  )
}
