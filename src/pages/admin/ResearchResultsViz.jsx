import { useEffect, useMemo, useState } from "react"
import { supabase } from "../../lib/supabase.js"
import {
  AVAILABLE_MODELS,
  CLASSIFICATION_RULES,
  EVIDENCE_INSTRUCTIONS,
  EXTRACT_PROMPTS,
  FN_DEFINITIONS,
} from "../../lib/researchClassifier.js"

const label9 = {
  fontSize: 9,
  fontWeight: 700,
  letterSpacing: ".12em",
  textTransform: "uppercase",
  color: "#a09080",
}

const MODEL_LABEL_MAP = Object.fromEntries(AVAILABLE_MODELS.map(m => [m.key, m.label]))
const RULE_NAME_MAP = Object.fromEntries(CLASSIFICATION_RULES.map(x => [x.key, x.name]))
const EVIDENCE_NAME_MAP = Object.fromEntries(EVIDENCE_INSTRUCTIONS.map(x => [x.key, x.name]))
const EXTRACT_NAME_MAP = Object.fromEntries(EXTRACT_PROMPTS.map(x => [x.key, x.name]))
const FN_DEFS_NAME_MAP = Object.fromEntries(FN_DEFINITIONS.map(x => [x.key, x.name]))

function formatDate(ts) {
  if (!ts) return "Unknown date"
  try {
    return new Date(ts).toLocaleString()
  } catch {
    return "Unknown date"
  }
}

function getResumeName(run) {
  const rel = run?.research_resumes
  if (Array.isArray(rel)) return rel[0]?.name || "Unknown resume"
  if (rel && typeof rel === "object") return rel.name || "Unknown resume"
  return "Unknown resume"
}

function getResumeTags(run) {
  const rel = run?.research_resumes
  const tags = Array.isArray(rel) ? rel[0]?.tags : rel?.tags
  return Array.isArray(tags) ? tags : []
}

function labelFromMap(value, map) {
  if (!value) return ""
  return map[value] || value
}

function parseModelKeyFromVariantKey(variantKey) {
  if (!variantKey || typeof variantKey !== "string") return ""
  if (variantKey.endsWith("_blind")) return variantKey.slice(0, -6)
  if (variantKey.endsWith("_titled")) return variantKey.slice(0, -7)
  return ""
}

function buildPredictedByRole(classifications) {
  const map = new Map()
  if (!Array.isArray(classifications)) return map
  for (const c of classifications) {
    const idx = Number(c?.role_index)
    if (!Number.isFinite(idx)) continue
    const labels = new Set((c?.labels || []).map(l => l?.name).filter(Boolean))
    map.set(idx, labels)
  }
  return map
}

function computeAccuracy(classifications, calibrationRows) {
  if (!Array.isArray(calibrationRows) || calibrationRows.length === 0) return null

  const predictedByRole = buildPredictedByRole(classifications)
  let total = 0
  let matches = 0

  for (const row of calibrationRows) {
    const roleIndex = Number(row?.role_index)
    const labels = Array.isArray(row?.labels) ? row.labels.filter(Boolean) : []
    if (!Number.isFinite(roleIndex) || labels.length === 0) continue
    const predicted = predictedByRole.get(roleIndex) || new Set()
    for (const label of labels) {
      total += 1
      if (predicted.has(label)) matches += 1
    }
  }

  if (total === 0) return null
  return { matches, total, pct: (matches / total) * 100 }
}

function MultiSelectFilter({ label, options, selected, setSelected, placeholder }) {
  const toggle = (value) => {
    setSelected(prev => prev.includes(value) ? prev.filter(x => x !== value) : [...prev, value])
  }

  return (
    <div>
      <div style={{ fontSize: 10, color: "#a09080", marginBottom: 4 }}>{label}</div>
      {options.length === 0 ? (
        <div style={{ fontSize: 11, color: "#a09080", padding: "8px 10px", border: "1px solid #e0dbd4", borderRadius: 6 }}>
          {placeholder}
        </div>
      ) : (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: "6px", border: "1px solid #d8d0c4", borderRadius: 6, background: "white", minHeight: 40 }}>
          {options.map((option) => {
            const active = selected.includes(option.value)
            return (
              <button
                key={option.value}
                onClick={() => toggle(option.value)}
                style={{
                  border: `1px solid ${active ? "#904060" : "#e0dbd4"}`,
                  background: active ? "#f5eaee" : "white",
                  color: active ? "#904060" : "#706050",
                  borderRadius: 999,
                  padding: "4px 10px",
                  fontSize: 10,
                  cursor: "pointer",
                }}
              >
                {option.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function ResearchResultsViz() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const [selectedModels, setSelectedModels] = useState([])
  const [selectedExtract, setSelectedExtract] = useState("ALL")
  const [selectedEvidence, setSelectedEvidence] = useState("ALL")
  const [selectedFnDefs, setSelectedFnDefs] = useState("ALL")
  const [selectedRules, setSelectedRules] = useState("ALL")
  const [selectedTag, setSelectedTag] = useState("ALL")
  const [selectedRunId, setSelectedRunId] = useState("ALL")
  const [groupBy, setGroupBy] = useState("variant_label")

  useEffect(() => {
    let cancelled = false

    async function loadData() {
      setLoading(true)
      setError("")

      let runQuery = await supabase
        .from("research_runs")
        .select(`
          id,
          created_at,
          resume_id,
          settings,
          deleted_at,
          research_resumes(name, tags)
        `)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })

      if (runQuery.error && /deleted_at|column/i.test(runQuery.error.message || "")) {
        runQuery = await supabase
          .from("research_runs")
          .select(`
            id,
            created_at,
            resume_id,
            settings,
            research_resumes(name, tags)
          `)
          .order("created_at", { ascending: false })
      }

      if (runQuery.error) {
        if (!cancelled) {
          setRows([])
          setError(`Failed to load runs: ${runQuery.error.message}`)
          setLoading(false)
        }
        return
      }

      let resultQuery = await supabase
        .from("research_run_results")
        .select(`
          id,
          run_id,
          variant_key,
          variant_label,
          model_key,
          model_label,
          model_string,
          rules_key,
          evidence_key,
          extract_key,
          fn_defs_key,
          blind_mode,
          classifications
        `)

      if (resultQuery.error && /variant_label|model_label|model_key|rules_key|evidence_key|extract_key|fn_defs_key|blind_mode|column/i.test(resultQuery.error.message || "")) {
        resultQuery = await supabase
          .from("research_run_results")
          .select(`
            id,
            run_id,
            variant_key,
            model_string,
            classifications
          `)
      }

      if (resultQuery.error) {
        if (!cancelled) {
          setRows([])
          setError(`Failed to load results: ${resultQuery.error.message}`)
          setLoading(false)
        }
        return
      }

      const runMap = new Map((runQuery.data || []).map(r => [r.id, r]))
      const resumeIds = [...new Set((runQuery.data || []).map(r => r.resume_id).filter(Boolean))]

      let calibrationRows = []
      if (resumeIds.length) {
        const calibQuery = await supabase
          .from("research_calibrations")
          .select("resume_id, role_index, labels")
          .in("resume_id", resumeIds)
        if (!calibQuery.error) calibrationRows = calibQuery.data || []
      }

      const calibrationByResume = calibrationRows.reduce((acc, row) => {
        const key = row.resume_id
        if (!acc[key]) acc[key] = []
        acc[key].push(row)
        return acc
      }, {})

      const enriched = (resultQuery.data || [])
        .map((r) => {
          const run = runMap.get(r.run_id)
          if (!run) return null

          const settings = run.settings && typeof run.settings === "object" ? run.settings : {}
          const modelKey = r.model_key || parseModelKeyFromVariantKey(r.variant_key)
          const modelLabel = r.model_label || MODEL_LABEL_MAP[modelKey] || r.model_string || "Unknown"
          const rulesLabel = labelFromMap(r.rules_key || settings.rules_key, RULE_NAME_MAP) || "Not recorded"
          const evidenceLabel = labelFromMap(r.evidence_key || settings.evidence_key, EVIDENCE_NAME_MAP) || "Not recorded"
          const extractLabel = labelFromMap(r.extract_key || settings.extract_key, EXTRACT_NAME_MAP) || "Not recorded"
          const fnDefsLabel = labelFromMap(r.fn_defs_key || settings.fn_defs_key, FN_DEFS_NAME_MAP) || "Not recorded"
          const blindModeLabel = r.blind_mode === true || settings.blind === true ? "On" : "Off"
          const accuracy = computeAccuracy(r.classifications, calibrationByResume[run.resume_id] || [])

          return {
            id: r.id,
            run_id: r.run_id,
            run_id_short: (r.run_id || "").slice(0, 8).toUpperCase(),
            run_created_at: run.created_at,
            resume_name: getResumeName(run),
            resume_tags: getResumeTags(run),
            variant_key: r.variant_key || "Unknown",
            variant_label: r.variant_label || r.variant_key || "Unknown",
            model_key: modelKey || "",
            model_label: modelLabel,
            rules_label: rulesLabel,
            evidence_label: evidenceLabel,
            extract_label: extractLabel,
            fn_defs_label: fnDefsLabel,
            blind_mode_label: blindModeLabel,
            accuracy_pct: accuracy?.pct ?? null,
            accuracy_matches: accuracy?.matches ?? 0,
            accuracy_total: accuracy?.total ?? 0,
          }
        })
        .filter(Boolean)

      if (!cancelled) {
        setRows(enriched)
        setLoading(false)
      }
    }

    loadData()
    return () => { cancelled = true }
  }, [])

  const modelOptions = useMemo(() => {
    const seen = new Set()
    return rows
      .map(r => ({ value: r.model_label, label: r.model_label }))
      .filter(o => {
        if (!o.value || seen.has(o.value)) return false
        seen.add(o.value)
        return true
      })
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [rows])

  const extractOptions = useMemo(() => [...new Set(rows.map(r => r.extract_label).filter(Boolean))].sort(), [rows])
  const evidenceOptions = useMemo(() => [...new Set(rows.map(r => r.evidence_label).filter(Boolean))].sort(), [rows])
  const fnDefsOptions = useMemo(() => [...new Set(rows.map(r => r.fn_defs_label).filter(Boolean))].sort(), [rows])
  const rulesOptions = useMemo(() => [...new Set(rows.map(r => r.rules_label).filter(Boolean))].sort(), [rows])
  const tagOptions = useMemo(() => [...new Set(rows.flatMap(r => r.resume_tags || []).filter(Boolean))].sort(), [rows])

  const runIdOptions = useMemo(() => {
    const map = new Map()
    rows.forEach((r) => {
      if (!map.has(r.run_id)) {
        map.set(r.run_id, {
          value: r.run_id,
          label: `${r.run_id_short} • ${r.resume_name} • ${formatDate(r.run_created_at)}`,
        })
      }
    })
    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label))
  }, [rows])

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      if (selectedModels.length && !selectedModels.includes(r.model_label)) return false
      if (selectedExtract !== "ALL" && r.extract_label !== selectedExtract) return false
      if (selectedEvidence !== "ALL" && r.evidence_label !== selectedEvidence) return false
      if (selectedFnDefs !== "ALL" && r.fn_defs_label !== selectedFnDefs) return false
      if (selectedRules !== "ALL" && r.rules_label !== selectedRules) return false
      if (selectedTag !== "ALL" && !(r.resume_tags || []).includes(selectedTag)) return false
      if (selectedRunId !== "ALL" && r.run_id !== selectedRunId) return false
      return true
    })
  }, [rows, selectedModels, selectedExtract, selectedEvidence, selectedFnDefs, selectedRules, selectedTag, selectedRunId])

  const groupedAccuracy = useMemo(() => {
    const map = new Map()
    for (const r of filteredRows) {
      if (r.accuracy_pct === null) continue
      const key = r[groupBy] || "Not recorded"
      if (!map.has(key)) map.set(key, { key, matches: 0, total: 0, rows: 0 })
      const entry = map.get(key)
      entry.matches += r.accuracy_matches
      entry.total += r.accuracy_total
      entry.rows += 1
    }
    return Array.from(map.values())
      .map(e => ({ ...e, accuracy_pct: e.total > 0 ? (e.matches / e.total) * 100 : 0 }))
      .sort((a, b) => b.accuracy_pct - a.accuracy_pct)
  }, [filteredRows, groupBy])

  const summary = useMemo(() => {
    const withCal = filteredRows.filter(r => r.accuracy_pct !== null)
    const matches = withCal.reduce((sum, r) => sum + r.accuracy_matches, 0)
    const total = withCal.reduce((sum, r) => sum + r.accuracy_total, 0)
    const avg = total > 0 ? (matches / total) * 100 : null
    return {
      rows: filteredRows.length,
      rowsWithCal: withCal.length,
      avgAccuracy: avg,
    }
  }, [filteredRows])

  const maxPct = groupedAccuracy.length ? Math.max(...groupedAccuracy.map(g => g.accuracy_pct), 1) : 1

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: "#1a1410", marginBottom: 4 }}>Results</div>
        <div style={{ fontSize: 12, color: "#706050" }}>
          Accuracy dashboard with filter controls for model, prompt components, industry tags, and specific run IDs.
        </div>
      </div>

      <div style={{ background: "#faf8f5", border: "1px solid #e0dbd4", borderRadius: 6, padding: "14px 16px", marginBottom: 16 }}>
        <div style={{ ...label9, marginBottom: 10 }}>Filters</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <MultiSelectFilter
            label="Model (multiple choice)"
            options={modelOptions}
            selected={selectedModels}
            setSelected={setSelectedModels}
            placeholder="No models available"
          />
          <div>
            <div style={{ fontSize: 10, color: "#a09080", marginBottom: 4 }}>Run ID</div>
            <select value={selectedRunId} onChange={(e) => setSelectedRunId(e.target.value)} style={{ width: "100%", padding: "8px 10px", fontSize: 12, border: "1px solid #d8d0c4", borderRadius: 6, fontFamily: "inherit" }}>
              <option value="ALL">All runs</option>
              {runIdOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(160px, 1fr))", gap: 10 }}>
          <div>
            <div style={{ fontSize: 10, color: "#a09080", marginBottom: 4 }}>Extraction prompt</div>
            <select value={selectedExtract} onChange={(e) => setSelectedExtract(e.target.value)} style={{ width: "100%", padding: "8px 10px", fontSize: 12, border: "1px solid #d8d0c4", borderRadius: 6, fontFamily: "inherit" }}>
              <option value="ALL">All</option>
              {extractOptions.map(x => <option key={x} value={x}>{x}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize: 10, color: "#a09080", marginBottom: 4 }}>Evidence instructions</div>
            <select value={selectedEvidence} onChange={(e) => setSelectedEvidence(e.target.value)} style={{ width: "100%", padding: "8px 10px", fontSize: 12, border: "1px solid #d8d0c4", borderRadius: 6, fontFamily: "inherit" }}>
              <option value="ALL">All</option>
              {evidenceOptions.map(x => <option key={x} value={x}>{x}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize: 10, color: "#a09080", marginBottom: 4 }}>Function level definition</div>
            <select value={selectedFnDefs} onChange={(e) => setSelectedFnDefs(e.target.value)} style={{ width: "100%", padding: "8px 10px", fontSize: 12, border: "1px solid #d8d0c4", borderRadius: 6, fontFamily: "inherit" }}>
              <option value="ALL">All</option>
              {fnDefsOptions.map(x => <option key={x} value={x}>{x}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize: 10, color: "#a09080", marginBottom: 4 }}>Classification rules</div>
            <select value={selectedRules} onChange={(e) => setSelectedRules(e.target.value)} style={{ width: "100%", padding: "8px 10px", fontSize: 12, border: "1px solid #d8d0c4", borderRadius: 6, fontFamily: "inherit" }}>
              <option value="ALL">All</option>
              {rulesOptions.map(x => <option key={x} value={x}>{x}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize: 10, color: "#a09080", marginBottom: 4 }}>Industry tag</div>
            <select value={selectedTag} onChange={(e) => setSelectedTag(e.target.value)} style={{ width: "100%", padding: "8px 10px", fontSize: 12, border: "1px solid #d8d0c4", borderRadius: 6, fontFamily: "inherit" }}>
              <option value="ALL">All tags</option>
              {tagOptions.map(x => <option key={x} value={x}>{x}</option>)}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ fontSize: 12, color: "#a09080" }}>Loading result data...</div>
      ) : error ? (
        <div style={{ background: "#fef2f2", border: "0.5px solid #fca5a5", borderRadius: 6, padding: "10px 12px", fontSize: 11, color: "#c04060" }}>
          {error}
        </div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(180px, 1fr))", gap: 10, marginBottom: 16 }}>
            <div style={{ background: "white", border: "1px solid #e0dbd4", borderRadius: 6, padding: "10px 12px" }}>
              <div style={{ ...label9, marginBottom: 4 }}>Rows matched</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#1a1410" }}>{summary.rows}</div>
            </div>
            <div style={{ background: "white", border: "1px solid #e0dbd4", borderRadius: 6, padding: "10px 12px" }}>
              <div style={{ ...label9, marginBottom: 4 }}>Rows with calibration</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#1a1410" }}>{summary.rowsWithCal}</div>
            </div>
            <div style={{ background: "white", border: "1px solid #e0dbd4", borderRadius: 6, padding: "10px 12px" }}>
              <div style={{ ...label9, marginBottom: 4 }}>Average accuracy</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#1a1410" }}>
                {summary.avgAccuracy === null ? "N/A" : `${summary.avgAccuracy.toFixed(1)}%`}
              </div>
            </div>
          </div>

          <div style={{ background: "#faf8f5", border: "1px solid #e0dbd4", borderRadius: 6, padding: "14px 16px", marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, gap: 10, flexWrap: "wrap" }}>
              <div style={{ ...label9 }}>Accuracy visualization</div>
              <div>
                <select value={groupBy} onChange={(e) => setGroupBy(e.target.value)} style={{ padding: "6px 10px", fontSize: 12, border: "1px solid #d8d0c4", borderRadius: 6, fontFamily: "inherit" }}>
                  <option value="variant_label">Group by Variant</option>
                  <option value="model_label">Group by Model</option>
                  <option value="rules_label">Group by Rules</option>
                  <option value="evidence_label">Group by Evidence</option>
                  <option value="extract_label">Group by Extraction Prompt</option>
                  <option value="fn_defs_label">Group by Fn Level Definition</option>
                  <option value="resume_name">Group by Resume</option>
                </select>
              </div>
            </div>

            {groupedAccuracy.length === 0 ? (
              <div style={{ fontSize: 12, color: "#a09080" }}>
                No calibrated rows match current filters yet. Accuracy will appear once calibration labels exist for matched rows.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {groupedAccuracy.slice(0, 24).map((g) => {
                  const width = Math.max(2, Math.round((g.accuracy_pct / maxPct) * 100))
                  return (
                    <div key={g.key}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#1a1410", marginBottom: 3, gap: 10 }}>
                        <span style={{ fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{g.key}</span>
                        <span style={{ color: "#706050", whiteSpace: "nowrap" }}>{g.accuracy_pct.toFixed(1)}% • {g.matches}/{g.total}</span>
                      </div>
                      <div style={{ height: 10, background: "#ede8e2", borderRadius: 20, overflow: "hidden" }}>
                        <div style={{ width: `${width}%`, height: "100%", background: "#2a7a6a" }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div style={{ background: "#faf8f5", border: "1px solid #e0dbd4", borderRadius: 6, padding: "14px 16px" }}>
            <div style={{ ...label9, marginBottom: 10 }}>Filtered rows ({filteredRows.length})</div>
            {filteredRows.length === 0 ? (
              <div style={{ fontSize: 12, color: "#a09080" }}>No rows matched your current filters.</div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 980 }}>
                  <thead>
                    <tr>
                      {["Run ID", "Resume", "Model", "Rules", "Evidence", "Extraction", "Fn Defs", "Industry Tags", "Accuracy", "Date"].map(h => (
                        <th key={h} style={{ textAlign: "left", fontSize: 10, color: "#a09080", padding: "6px 8px", borderBottom: "1px solid #e0dbd4", textTransform: "uppercase", letterSpacing: ".08em" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.slice(0, 80).map((r) => (
                      <tr key={r.id}>
                        <td style={{ padding: "7px 8px", fontSize: 11, borderBottom: "1px solid #ede8e2", color: "#1a1410", fontWeight: 700 }}>{r.run_id_short}</td>
                        <td style={{ padding: "7px 8px", fontSize: 11, borderBottom: "1px solid #ede8e2", color: "#1a1410" }}>{r.resume_name}</td>
                        <td style={{ padding: "7px 8px", fontSize: 11, borderBottom: "1px solid #ede8e2", color: "#1a1410" }}>{r.model_label}</td>
                        <td style={{ padding: "7px 8px", fontSize: 11, borderBottom: "1px solid #ede8e2", color: "#706050" }}>{r.rules_label}</td>
                        <td style={{ padding: "7px 8px", fontSize: 11, borderBottom: "1px solid #ede8e2", color: "#706050" }}>{r.evidence_label}</td>
                        <td style={{ padding: "7px 8px", fontSize: 11, borderBottom: "1px solid #ede8e2", color: "#706050" }}>{r.extract_label}</td>
                        <td style={{ padding: "7px 8px", fontSize: 11, borderBottom: "1px solid #ede8e2", color: "#706050" }}>{r.fn_defs_label}</td>
                        <td style={{ padding: "7px 8px", fontSize: 11, borderBottom: "1px solid #ede8e2", color: "#706050" }}>{(r.resume_tags || []).join(", ") || "—"}</td>
                        <td style={{ padding: "7px 8px", fontSize: 11, borderBottom: "1px solid #ede8e2", color: "#1a1410", fontWeight: 700 }}>
                          {r.accuracy_pct === null ? "N/A" : `${r.accuracy_pct.toFixed(1)}%`}
                        </td>
                        <td style={{ padding: "7px 8px", fontSize: 11, borderBottom: "1px solid #ede8e2", color: "#706050" }}>{formatDate(r.run_created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

