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

const GROUP_OPTIONS = [
  { key: "model_label", label: "Model" },
  { key: "variant_label", label: "Variant" },
  { key: "rules_label", label: "Rules" },
  { key: "evidence_label", label: "Evidence" },
  { key: "extract_label", label: "Extraction Prompt" },
  { key: "fn_defs_label", label: "Function Level Definitions" },
  { key: "blind_mode_label", label: "Blind Mode" },
  { key: "resume_name", label: "Resume Nickname" },
]

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

function parseModelKeyFromVariantKey(variantKey) {
  if (!variantKey || typeof variantKey !== "string") return ""
  if (variantKey.endsWith("_blind")) return variantKey.slice(0, -6)
  if (variantKey.endsWith("_titled")) return variantKey.slice(0, -7)
  return ""
}

function normalizeFnArray(functions) {
  if (!Array.isArray(functions)) return []
  return functions
    .map(f => ({ name: f?.name || "", months: Number(f?.months) || 0 }))
    .filter(f => f.name)
}

function labelFromMap(value, map) {
  if (!value) return ""
  return map[value] || value
}

function parseRunIdFilter(input) {
  const raw = (input || "").trim()
  if (!raw) return []
  return raw
    .split(",")
    .map(x => x.trim().toUpperCase())
    .filter(Boolean)
}

export default function ResearchResultsViz() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const [groupBy, setGroupBy] = useState("model_label")
  const [metric, setMetric] = useState("count")
  const [labelFilter, setLabelFilter] = useState("ALL")
  const [runIdFilter, setRunIdFilter] = useState("")

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
          research_resumes(name)
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
            research_resumes(name)
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
          functions
        `)

      if (resultQuery.error && /variant_label|model_label|model_key|blind_mode|rules_key|evidence_key|extract_key|fn_defs_key|column/i.test(resultQuery.error.message || "")) {
        resultQuery = await supabase
          .from("research_run_results")
          .select(`
            id,
            run_id,
            variant_key,
            model_string,
            functions
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

      const enriched = (resultQuery.data || [])
        .map((r) => {
          const run = runMap.get(r.run_id)
          if (!run) return null
          const settings = run.settings && typeof run.settings === "object" ? run.settings : {}
          const modelKey = r.model_key || parseModelKeyFromVariantKey(r.variant_key)

          return {
            id: r.id,
            run_id: r.run_id,
            run_id_short: (r.run_id || "").slice(0, 8).toUpperCase(),
            run_created_at: run.created_at,
            resume_name: getResumeName(run),
            variant_key: r.variant_key || "Unknown",
            variant_label: r.variant_label || r.variant_key || "Unknown",
            model_key: modelKey || "",
            model_label: r.model_label || MODEL_LABEL_MAP[modelKey] || r.model_string || "Unknown",
            rules_label: labelFromMap(r.rules_key || settings.rules_key, RULE_NAME_MAP) || "Not recorded",
            evidence_label: labelFromMap(r.evidence_key || settings.evidence_key, EVIDENCE_NAME_MAP) || "Not recorded",
            extract_label: labelFromMap(r.extract_key || settings.extract_key, EXTRACT_NAME_MAP) || "Not recorded",
            fn_defs_label: labelFromMap(r.fn_defs_key || settings.fn_defs_key, FN_DEFS_NAME_MAP) || "Not recorded",
            blind_mode_label: r.blind_mode === true || settings.blind === true ? "On" : "Off",
            functions: normalizeFnArray(r.functions),
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

  const availableLabels = useMemo(() => {
    const set = new Set()
    rows.forEach(r => r.functions.forEach(f => set.add(f.name)))
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [rows])

  const filteredRows = useMemo(() => {
    const runFilters = parseRunIdFilter(runIdFilter)
    return rows.filter((r) => {
      if (runFilters.length) {
        const matched = runFilters.some(f => r.run_id_short.includes(f) || r.run_id.toUpperCase().includes(f))
        if (!matched) return false
      }
      if (labelFilter !== "ALL" && !r.functions.some(fn => fn.name === labelFilter)) return false
      return true
    })
  }, [rows, runIdFilter, labelFilter])

  const grouped = useMemo(() => {
    const m = new Map()
    for (const r of filteredRows) {
      const key = r[groupBy] || "Not recorded"
      if (!m.has(key)) m.set(key, { key, value: 0, runIds: new Set() })
      const entry = m.get(key)
      entry.runIds.add(r.run_id)

      if (metric === "count") {
        entry.value += 1
      } else {
        const months = labelFilter === "ALL"
          ? r.functions.reduce((sum, fn) => sum + (fn.months || 0), 0)
          : r.functions.filter(fn => fn.name === labelFilter).reduce((sum, fn) => sum + (fn.months || 0), 0)
        entry.value += months
      }
    }

    return Array.from(m.values())
      .map(x => ({ ...x, runCount: x.runIds.size }))
      .sort((a, b) => b.value - a.value)
  }, [filteredRows, groupBy, metric, labelFilter])

  const maxValue = grouped.length ? grouped[0].value : 1

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: "#1a1410", marginBottom: 4 }}>Results</div>
        <div style={{ fontSize: 12, color: "#706050" }}>
          Visualize analyzed data by variable and label, with optional Run ID filtering.
        </div>
      </div>

      <div style={{ background: "#faf8f5", border: "1px solid #e0dbd4", borderRadius: 6, padding: "14px 16px", marginBottom: 16 }}>
        <div style={{ ...label9, marginBottom: 10 }}>Parameters</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(180px, 1fr))", gap: 10 }}>
          <div>
            <div style={{ fontSize: 10, color: "#a09080", marginBottom: 4 }}>Variable</div>
            <select value={groupBy} onChange={(e) => setGroupBy(e.target.value)} style={{ width: "100%", padding: "8px 10px", fontSize: 12, border: "1px solid #d8d0c4", borderRadius: 6, fontFamily: "inherit" }}>
              {GROUP_OPTIONS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize: 10, color: "#a09080", marginBottom: 4 }}>Label</div>
            <select value={labelFilter} onChange={(e) => setLabelFilter(e.target.value)} style={{ width: "100%", padding: "8px 10px", fontSize: 12, border: "1px solid #d8d0c4", borderRadius: 6, fontFamily: "inherit" }}>
              <option value="ALL">All labels</option>
              {availableLabels.map(lbl => <option key={lbl} value={lbl}>{lbl}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize: 10, color: "#a09080", marginBottom: 4 }}>Metric</div>
            <select value={metric} onChange={(e) => setMetric(e.target.value)} style={{ width: "100%", padding: "8px 10px", fontSize: 12, border: "1px solid #d8d0c4", borderRadius: 6, fontFamily: "inherit" }}>
              <option value="count">Result rows</option>
              <option value="months">Function months</option>
            </select>
          </div>
          <div>
            <div style={{ fontSize: 10, color: "#a09080", marginBottom: 4 }}>Run ID filter</div>
            <input
              value={runIdFilter}
              onChange={(e) => setRunIdFilter(e.target.value)}
              placeholder="e.g. EDB0A098 or comma list"
              style={{ width: "100%", padding: "8px 10px", fontSize: 12, border: "1px solid #d8d0c4", borderRadius: 6, fontFamily: "inherit", boxSizing: "border-box" }}
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ fontSize: 12, color: "#a09080" }}>Loading result data...</div>
      ) : error ? (
        <div style={{ background: "#fef2f2", border: "0.5px solid #fca5a5", borderRadius: 6, padding: "10px 12px", fontSize: 11, color: "#c04060" }}>{error}</div>
      ) : grouped.length === 0 ? (
        <div style={{ fontSize: 12, color: "#a09080" }}>No data matches current filters.</div>
      ) : (
        <>
          <div style={{ background: "#faf8f5", border: "1px solid #e0dbd4", borderRadius: 6, padding: "14px 16px", marginBottom: 16 }}>
            <div style={{ ...label9, marginBottom: 10 }}>Visualization</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {grouped.slice(0, 20).map((g) => {
                const width = Math.max(2, Math.round((g.value / maxValue) * 100))
                return (
                  <div key={g.key}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#1a1410", marginBottom: 3, gap: 10 }}>
                      <span style={{ fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{g.key}</span>
                      <span style={{ color: "#706050", whiteSpace: "nowrap" }}>
                        {metric === "count" ? `${g.value} rows` : `${(Math.round((g.value / 12) * 10) / 10).toFixed(1)}y`} • {g.runCount} runs
                      </span>
                    </div>
                    <div style={{ height: 10, background: "#ede8e2", borderRadius: 20, overflow: "hidden" }}>
                      <div style={{ width: `${width}%`, height: "100%", background: "#904060" }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div style={{ background: "#faf8f5", border: "1px solid #e0dbd4", borderRadius: 6, padding: "14px 16px" }}>
            <div style={{ ...label9, marginBottom: 10 }}>Filtered rows ({filteredRows.length})</div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 860 }}>
                <thead>
                  <tr>
                    {["Run ID", "Resume", "Model", "Variant", "Rules", "Evidence", "Date"].map(h => (
                      <th key={h} style={{ textAlign: "left", fontSize: 10, color: "#a09080", padding: "6px 8px", borderBottom: "1px solid #e0dbd4", textTransform: "uppercase", letterSpacing: ".08em" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.slice(0, 60).map((r) => (
                    <tr key={r.id}>
                      <td style={{ padding: "7px 8px", fontSize: 11, borderBottom: "1px solid #ede8e2", color: "#1a1410", fontWeight: 700 }}>{r.run_id_short}</td>
                      <td style={{ padding: "7px 8px", fontSize: 11, borderBottom: "1px solid #ede8e2", color: "#1a1410" }}>{r.resume_name}</td>
                      <td style={{ padding: "7px 8px", fontSize: 11, borderBottom: "1px solid #ede8e2", color: "#1a1410" }}>{r.model_label}</td>
                      <td style={{ padding: "7px 8px", fontSize: 11, borderBottom: "1px solid #ede8e2", color: "#706050" }}>{r.variant_label}</td>
                      <td style={{ padding: "7px 8px", fontSize: 11, borderBottom: "1px solid #ede8e2", color: "#706050" }}>{r.rules_label}</td>
                      <td style={{ padding: "7px 8px", fontSize: 11, borderBottom: "1px solid #ede8e2", color: "#706050" }}>{r.evidence_label}</td>
                      <td style={{ padding: "7px 8px", fontSize: 11, borderBottom: "1px solid #ede8e2", color: "#706050" }}>{formatDate(r.run_created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

