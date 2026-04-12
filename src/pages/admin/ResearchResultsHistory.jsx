// src/pages/admin/ResearchResultsHistory.jsx
// Results History MVP:
// - Left pane: recent runs
// - Right pane: selected run details + variant outputs

import { useEffect, useMemo, useState } from "react"
import { supabase } from "../../lib/supabase.js"

const label9 = {
  fontSize: 9,
  fontWeight: 700,
  letterSpacing: ".12em",
  textTransform: "uppercase",
  color: "#a09080",
}

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

function formatYearsFromMonths(months) {
  const n = Number(months)
  if (!Number.isFinite(n)) return "—"
  return `${(Math.round((n / 12) * 10) / 10).toFixed(1)}y`
}

function VariantCard({ row }) {
  const functions = Array.isArray(row?.functions) ? row.functions : []
  return (
    <div
      style={{
        background: "white",
        border: "1px solid #e0dbd4",
        borderRadius: 6,
        padding: "14px 16px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, gap: 10 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#1a1410" }}>{row.variant_key || "Unknown variant"}</div>
        <div style={{ fontSize: 10, color: "#a09080" }}>{row.model_string || "Unknown model"}</div>
      </div>

      <div style={{ marginBottom: 10 }}>
        <div style={{ ...label9, marginBottom: 4 }}>Summary</div>
        <div style={{ fontSize: 11, color: "#1a1410", lineHeight: 1.6 }}>
          {row.summary?.trim() || "No summary recorded for this variant."}
        </div>
      </div>

      <div style={{ marginBottom: 10 }}>
        <div style={{ ...label9, marginBottom: 4 }}>Strengths</div>
        <div style={{ fontSize: 11, color: "#706050", lineHeight: 1.6 }}>
          {row.strengths?.trim() || "No strengths recorded for this variant."}
        </div>
      </div>

      <div>
        <div style={{ ...label9, marginBottom: 6 }}>Function Levels</div>
        {!functions.length ? (
          <div style={{ fontSize: 11, color: "#a09080" }}>No function rows recorded.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {functions.map((fn, i) => (
              <div
                key={`${row.id}-fn-${i}`}
                style={{
                  border: "1px solid #ede8e2",
                  borderRadius: 4,
                  padding: "7px 10px",
                  background: "#faf8f5",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                }}
              >
                <div style={{ fontSize: 11, color: "#1a1410", fontWeight: 700 }}>{fn?.name || "Unnamed function"}</div>
                <div style={{ fontSize: 10, color: "#a09080" }}>{formatYearsFromMonths(fn?.months)}</div>
              </div>
            ))}
          </div>
        )}
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

  useEffect(() => {
    let cancelled = false

    async function loadRuns() {
      setRunsLoading(true)
      setRunsError("")

      const { data, error } = await supabase
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
    return () => { cancelled = true }
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

      const { data, error } = await supabase
        .from("research_run_results")
        .select("id, run_id, variant_key, model_string, classifications, summary, strengths, functions")
        .eq("run_id", selectedRunId)
        .order("variant_key", { ascending: true })

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
    return () => { cancelled = true }
  }, [selectedRunId])

  const selectedRun = useMemo(
    () => runs.find(r => r.id === selectedRunId) || null,
    [runs, selectedRunId]
  )

  return (
    <div>
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: "#1a1410", marginBottom: 4 }}>Results History</div>
        <div style={{ fontSize: 12, color: "#706050" }}>Browse saved runs and inspect each model variant output.</div>
      </div>

      {runsLoading ? (
        <div style={{ fontSize: 12, color: "#a09080" }}>Loading run history...</div>
      ) : runsError ? (
        <div style={{ background: "#fef2f2", border: "0.5px solid #fca5a5", borderRadius: 6, padding: "10px 12px", fontSize: 11, color: "#c04060" }}>
          {runsError}
        </div>
      ) : !runs.length ? (
        <div style={{ fontSize: 12, color: "#a09080" }}>No runs found yet. Run an analysis first to populate this page.</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 18 }}>
          <div style={{ background: "#faf8f5", border: "1px solid #e0dbd4", borderRadius: 6, padding: "12px 10px", maxHeight: "calc(100vh - 220px)", overflowY: "auto" }}>
            <div style={{ ...label9, margin: "0 6px 10px" }}>Recent runs</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {runs.map(run => {
                const isActive = run.id === selectedRunId
                return (
                  <button
                    key={run.id}
                    onClick={() => setSelectedRunId(run.id)}
                    style={{
                      textAlign: "left",
                      background: isActive ? "#f5eaee" : "white",
                      border: `1px solid ${isActive ? "#904060" : "#e0dbd4"}`,
                      borderRadius: 6,
                      padding: "10px 12px",
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#1a1410", marginBottom: 2 }}>{safeResumeName(run)}</div>
                    <div style={{ fontSize: 10, color: "#a09080", marginBottom: 4 }}>{formatDate(run.created_at)}</div>
                    <div style={{ fontSize: 10, color: "#706050" }}>{parseSettingsSummary(run.settings)}</div>
                  </button>
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
                  <div style={{ fontSize: 11, color: "#706050", lineHeight: 1.6 }}>
                    {selectedRun.notes?.trim() || "No notes for this run."}
                  </div>
                </div>

                <div style={{ ...label9, marginBottom: 8 }}>Variant outputs</div>

                {variantLoading ? (
                  <div style={{ fontSize: 12, color: "#a09080" }}>Loading variant results...</div>
                ) : variantError ? (
                  <div style={{ background: "#fef2f2", border: "0.5px solid #fca5a5", borderRadius: 6, padding: "10px 12px", fontSize: 11, color: "#c04060" }}>
                    {variantError}
                  </div>
                ) : !variantRows.length ? (
                  <div style={{ fontSize: 12, color: "#a09080" }}>
                    This run has no saved variant rows yet.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {variantRows.map(row => <VariantCard key={row.id} row={row} />)}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
