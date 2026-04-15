import { useEffect, useMemo, useState } from "react"
import { supabase } from "../../lib/supabase.js"
import {
  AVAILABLE_MODELS,
  CLASSIFICATION_RULES,
  EVIDENCE_INSTRUCTIONS,
  EXTRACT_PROMPTS,
  EVIDENCE_QUALITY_ASSESSMENTS,
  FN_DEFINITIONS,
} from "../../lib/researchClassifier.js"

const label9 = { fontSize: 9, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: "#a09080" }
const MODEL_LABEL_MAP = Object.fromEntries(AVAILABLE_MODELS.map((m) => [m.key, m.label]))
const RULE_NAME_MAP = Object.fromEntries(CLASSIFICATION_RULES.map((x) => [x.key, x.name]))
const EVIDENCE_NAME_MAP = Object.fromEntries(EVIDENCE_INSTRUCTIONS.map((x) => [x.key, x.name]))
const EXTRACT_NAME_MAP = Object.fromEntries(EXTRACT_PROMPTS.map((x) => [x.key, x.name]))
const FN_DEFS_NAME_MAP = Object.fromEntries(FN_DEFINITIONS.map((x) => [x.key, x.name]))
const EVIDENCE_QUALITY_ASSESSMENT_NAME_MAP = Object.fromEntries(EVIDENCE_QUALITY_ASSESSMENTS.map((x) => [x.key, x.name]))

function formatDate(ts) {
  if (!ts) return "Unknown date"
  try { return new Date(ts).toLocaleString() } catch { return "Unknown date" }
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
    map.set(idx, new Set((c?.labels || []).map((l) => l?.name).filter(Boolean)))
  }
  return map
}

function computeAccuracyStats(classifications, calibrationRows) {
  if (!Array.isArray(calibrationRows) || calibrationRows.length === 0) return null
  const predictedByRole = buildPredictedByRole(classifications)
  let matches = 0
  let total = 0
  const byLabel = {}
  for (const row of calibrationRows) {
    const idx = Number(row?.role_index)
    const labels = Array.isArray(row?.labels) ? row.labels.filter(Boolean) : []
    if (!Number.isFinite(idx) || !labels.length) continue
    const predicted = predictedByRole.get(idx) || new Set()
    for (const label of labels) {
      total += 1
      if (!byLabel[label]) byLabel[label] = { matches: 0, total: 0 }
      byLabel[label].total += 1
      if (predicted.has(label)) {
        matches += 1
        byLabel[label].matches += 1
      }
    }
  }
  if (!total) return null
  return { matches, total, pct: (matches / total) * 100, byLabel }
}

function getStatForMetric(row, yMetric, functionLabel) {
  if (yMetric === "overall") return { matches: row.accuracy_matches || 0, total: row.accuracy_total || 0 }
  const byLabel = row.accuracy_by_label || {}
  if (functionLabel === "ALL") {
    return Object.keys(byLabel).reduce((acc, k) => {
      acc.matches += byLabel[k]?.matches || 0
      acc.total += byLabel[k]?.total || 0
      return acc
    }, { matches: 0, total: 0 })
  }
  return { matches: byLabel[functionLabel]?.matches || 0, total: byLabel[functionLabel]?.total || 0 }
}

function isResumeFinalized(parsedRoles, calibrationRows) {
  const roles = Array.isArray(parsedRoles) ? parsedRoles : []
  const reviewedRoleIndexes = roles
    .map((role, idx) => ({ role, idx }))
    .filter(({ role }) => !role?.flagged)
    .map(({ idx }) => idx)
  if (!reviewedRoleIndexes.length) return false

  const calibrated = new Set(
    (Array.isArray(calibrationRows) ? calibrationRows : [])
      .filter((row) => Number.isFinite(Number(row?.role_index)) && Array.isArray(row?.labels) && row.labels.length > 0)
      .map((row) => Number(row.role_index)),
  )
  return reviewedRoleIndexes.every((idx) => calibrated.has(idx))
}

function getMeasureStat(row, measureKey, yMetric, functionLabel) {
  if (measureKey === "function") return getStatForMetric(row, yMetric, functionLabel)
  if (measureKey === "evidence") return { matches: row.evidence_matches || 0, total: row.evidence_total || 0 }
  return { matches: 0, total: 0 }
}

function MultiSelectFilter({ label, options, selected, setSelected, placeholder }) {
  const toggle = (value) => setSelected((prev) => prev.includes(value) ? prev.filter((x) => x !== value) : [...prev, value])
  return (
    <div>
      <div style={{ fontSize: 10, color: "#a09080", marginBottom: 4 }}>{label}</div>
      {options.length === 0 ? (
        <div style={{ fontSize: 11, color: "#a09080", padding: "8px 10px", border: "1px solid #e0dbd4", borderRadius: 6 }}>{placeholder}</div>
      ) : (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: 6, border: "1px solid #d8d0c4", borderRadius: 6, background: "white", minHeight: 40 }}>
          {options.map((option) => {
            const active = selected.includes(option.value)
            return (
              <button key={option.value} onClick={() => toggle(option.value)} style={{ border: `1px solid ${active ? "#904060" : "#e0dbd4"}`, background: active ? "#f5eaee" : "white", color: active ? "#904060" : "#706050", borderRadius: 999, padding: "4px 10px", fontSize: 10, cursor: "pointer" }}>
                {option.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function VariableDefinitionCard({ title, description, content }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div style={{ border: "1px solid #ede8e2", borderRadius: 6, background: "white", padding: "8px 10px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#1a1410" }}>{title}</div>
          <div style={{ fontSize: 10, color: "#a09080", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{description || "Definition available."}</div>
        </div>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          style={{ border: "none", background: "transparent", color: "#706050", cursor: "pointer", fontSize: 13, fontWeight: 700, padding: "0 2px" }}
          title={expanded ? "Hide content" : "Show content"}
          aria-label={expanded ? "Hide content" : "Show content"}
        >
          {expanded ? "⌄" : ">"}
        </button>
      </div>
      {expanded && (
        <pre
          style={{
            margin: "8px 0 0",
            padding: "8px 10px",
            background: "#faf8f5",
            border: "1px solid #e8e2db",
            borderRadius: 6,
            color: "#403830",
            fontSize: 10,
            lineHeight: 1.45,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
          }}
        >
          {content || "No content recorded."}
        </pre>
      )}
    </div>
  )
}

function BarChart({ rows }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {rows.map((g) => (
        <div key={g.key}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#1a1410", marginBottom: 3, gap: 10 }}>
            <span style={{ fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{g.key}</span>
            <span style={{ color: "#706050", whiteSpace: "nowrap" }}>{g.accuracy_pct.toFixed(1)}% • {g.matches}/{g.total}</span>
          </div>
          <div style={{ height: 12, background: "#ede8e2", borderRadius: 20, overflow: "hidden" }}>
            <div style={{ width: `${Math.max(2, Math.round(g.accuracy_pct))}%`, height: "100%", background: "#2a7a6a" }} />
          </div>
        </div>
      ))}
    </div>
  )
}

function PieChart({ rows }) {
  const top = rows.slice(0, 8)
  const total = top.reduce((sum, r) => sum + r.total, 0) || 1
  const colors = ["#2a7a6a", "#904060", "#3a6aaa", "#c07030", "#7a3aaa", "#2f8f80", "#aa5b2a", "#5a4f95"]
  let start = 0
  const segments = top.map((row, i) => {
    const size = (row.total / total) * 100
    const seg = { ...row, color: colors[i % colors.length], start, end: start + size }
    start += size
    return seg
  })
  const gradient = segments.map((s) => `${s.color} ${s.start}% ${s.end}%`).join(", ")
  return (
    <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 14, alignItems: "start" }}>
      <div style={{ width: 220, height: 220, borderRadius: "50%", background: `conic-gradient(${gradient})`, border: "1px solid #e0dbd4" }} />
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {segments.map((s) => (
          <div key={s.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, fontSize: 11 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
              <span style={{ width: 10, height: 10, borderRadius: 999, background: s.color, flexShrink: 0 }} />
              <span style={{ color: "#1a1410", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.key}</span>
            </div>
            <span style={{ color: "#706050", whiteSpace: "nowrap" }}>{s.accuracy_pct.toFixed(1)}% • {s.total}</span>
          </div>
        ))}
      </div>
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
  const [selectedEvidenceQualityAssessment, setSelectedEvidenceQualityAssessment] = useState("ALL")
  const [selectedTag, setSelectedTag] = useState("ALL")
  const [selectedRunId, setSelectedRunId] = useState("ALL")

  const [groupBy, setGroupBy] = useState("model_label")
  const [chartType, setChartType] = useState("bar")
  const [selectedMeasure, setSelectedMeasure] = useState("function")
  const [yMetric, setYMetric] = useState("overall")
  const [functionLabel, setFunctionLabel] = useState("ALL")
  const [tableUnit, setTableUnit] = useState("runs")

  useEffect(() => {
    let cancelled = false
    async function loadData() {
      setLoading(true)
      setError("")

      let runQuery = await supabase.from("research_runs").select("id, created_at, resume_id, settings, parsed_roles_snapshot, deleted_at, research_resumes(name, tags, parsed_roles)").is("deleted_at", null).order("created_at", { ascending: false })
      if (runQuery.error && /deleted_at|column/i.test(runQuery.error.message || "")) {
        runQuery = await supabase.from("research_runs").select("id, created_at, resume_id, settings, parsed_roles_snapshot, research_resumes(name, tags, parsed_roles)").order("created_at", { ascending: false })
      }
      if (runQuery.error) {
        if (!cancelled) { setRows([]); setError(`Failed to load runs: ${runQuery.error.message}`); setLoading(false) }
        return
      }

      const resultQuery = await supabase
        .from("research_run_results")
        .select("id, run_id, variant_key, variant_label, model_key, model_label, model_string, rules_key, evidence_key, extract_key, fn_defs_key, evidence_display_settings_key, evidence_quality_assessment_key, blind_mode, classifications")
      if (resultQuery.error) {
        if (!cancelled) { setRows([]); setError(`Failed to load results: ${resultQuery.error.message}`); setLoading(false) }
        return
      }

      const resultRows = resultQuery.data || []
      const runMap = new Map((runQuery.data || []).map((r) => [r.id, r]))
      const resumeIds = [...new Set((runQuery.data || []).map((r) => r.resume_id).filter(Boolean))]
      let calibrationRows = []
      if (resumeIds.length) {
        const calibQuery = await supabase.from("research_calibrations").select("resume_id, role_index, labels").in("resume_id", resumeIds)
        if (!calibQuery.error) calibrationRows = calibQuery.data || []
      }
      const calibrationByResume = calibrationRows.reduce((acc, row) => {
        if (!acc[row.resume_id]) acc[row.resume_id] = []
        acc[row.resume_id].push(row)
        return acc
      }, {})

      const evidenceStatsByResultId = {}
      const evidenceFinalizedByResultId = {}
      if (resultRows.length) {
        const reviewQuery = await supabase
          .from("research_variant_reviews")
          .select("id, run_result_id")
          .in("run_result_id", resultRows.map((r) => r.id))
          .eq("status", "finalized")
          .eq("label_family", "function")
          .eq("review_aspect", "evidence")
        if (!reviewQuery.error) {
          const reviewRows = reviewQuery.data || []
          reviewRows.forEach((rr) => { evidenceFinalizedByResultId[rr.run_result_id] = true })
          if (reviewRows.length) {
            const reviewIdToResult = Object.fromEntries(reviewRows.map((rr) => [rr.id, rr.run_result_id]))
            const itemQuery = await supabase
              .from("research_variant_review_items")
              .select("variant_review_id, rating")
              .in("variant_review_id", reviewRows.map((rr) => rr.id))
            if (!itemQuery.error) {
              for (const item of itemQuery.data || []) {
                const resultId = reviewIdToResult[item.variant_review_id]
                if (!resultId) continue
                if (!evidenceStatsByResultId[resultId]) evidenceStatsByResultId[resultId] = { matches: 0, total: 0 }
                const bucket = evidenceStatsByResultId[resultId]
                if (item.rating) {
                  bucket.total += 1
                  if (item.rating === "accurate") bucket.matches += 1
                }
              }
            }
          }
        }
      }

      const enriched = resultRows.map((r) => {
        const run = runMap.get(r.run_id)
        if (!run) return null
        const settings = run.settings && typeof run.settings === "object" ? run.settings : {}
        const modelKey = r.model_key || parseModelKeyFromVariantKey(r.variant_key)
        const resumeCalibrations = calibrationByResume[run.resume_id] || []
        const relParsedRoles = Array.isArray(run.research_resumes)
          ? run.research_resumes[0]?.parsed_roles
          : run.research_resumes?.parsed_roles
        const parsedRoles = Array.isArray(run.parsed_roles_snapshot)
          ? run.parsed_roles_snapshot
          : (Array.isArray(relParsedRoles) ? relParsedRoles : [])
        const reviewedFinalized = isResumeFinalized(parsedRoles, resumeCalibrations)
        const accuracy = computeAccuracyStats(r.classifications, resumeCalibrations)
        const evidenceStats = evidenceStatsByResultId[r.id] || { matches: 0, total: 0 }
        return {
          id: r.id,
          run_id: r.run_id,
          run_id_short: (r.run_id || "").slice(0, 8).toUpperCase(),
          run_created_at: run.created_at,
          resume_name: getResumeName(run),
          resume_tags: getResumeTags(run),
          variant_label: r.variant_label || r.variant_key || "Unknown",
          model_label: r.model_label || MODEL_LABEL_MAP[modelKey] || r.model_string || "Unknown",
          rules_label: labelFromMap(r.rules_key || settings.rules_key, RULE_NAME_MAP) || "Not recorded",
          evidence_label: labelFromMap(r.evidence_key || settings.evidence_key, EVIDENCE_NAME_MAP) || "Not recorded",
          extract_label: labelFromMap(r.extract_key || settings.extract_key, EXTRACT_NAME_MAP) || "Not recorded",
          fn_defs_label: labelFromMap(r.fn_defs_key || settings.fn_defs_key, FN_DEFS_NAME_MAP) || "Not recorded",
          evidence_quality_assessment_key: r.evidence_quality_assessment_key || settings.evidence_quality_assessment_key || "not_recorded",
          evidence_quality_assessment_label: labelFromMap(r.evidence_quality_assessment_key || settings.evidence_quality_assessment_key, EVIDENCE_QUALITY_ASSESSMENT_NAME_MAP) || "Not recorded",
          function_review_finalized: reviewedFinalized,
          evidence_review_finalized: Boolean(evidenceFinalizedByResultId[r.id]),
          accuracy_pct: accuracy?.pct ?? null,
          accuracy_matches: accuracy?.matches ?? 0,
          accuracy_total: accuracy?.total ?? 0,
          accuracy_by_label: accuracy?.byLabel || {},
          evidence_matches: evidenceStats.matches,
          evidence_total: evidenceStats.total,
        }
      }).filter(Boolean)

      if (!cancelled) { setRows(enriched); setLoading(false) }
    }
    loadData()
    return () => { cancelled = true }
  }, [])

  const modelOptions = useMemo(() => {
    const seen = new Set()
    return rows.map((r) => ({ value: r.model_label, label: r.model_label })).filter((o) => {
      if (!o.value || seen.has(o.value)) return false
      seen.add(o.value)
      return true
    }).sort((a, b) => a.label.localeCompare(b.label))
  }, [rows])
  const extractOptions = useMemo(() => [...new Set(rows.map((r) => r.extract_label).filter(Boolean))].sort(), [rows])
  const evidenceOptions = useMemo(() => [...new Set(rows.map((r) => r.evidence_label).filter(Boolean))].sort(), [rows])
  const fnDefsOptions = useMemo(() => [...new Set(rows.map((r) => r.fn_defs_label).filter(Boolean))].sort(), [rows])
  const rulesOptions = useMemo(() => [...new Set(rows.map((r) => r.rules_label).filter(Boolean))].sort(), [rows])
  const evidenceQualityAssessmentOptions = useMemo(() => [...new Set(rows.map((r) => r.evidence_quality_assessment_label).filter(Boolean))].sort(), [rows])
  const tagOptions = useMemo(() => [...new Set(rows.flatMap((r) => r.resume_tags || []).filter(Boolean))].sort(), [rows])
  const runIdOptions = useMemo(() => {
    const map = new Map()
    rows.forEach((r) => { if (!map.has(r.run_id)) map.set(r.run_id, { value: r.run_id, label: `${r.run_id_short} • ${r.resume_name} • ${formatDate(r.run_created_at)}` }) })
    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label))
  }, [rows])
  const functionLabelOptions = useMemo(() => [...new Set(rows.flatMap((r) => Object.keys(r.accuracy_by_label || {})))].sort(), [rows])
  const functionReviewedRows = useMemo(() => rows.filter((r) => r.function_review_finalized), [rows])
  const evidenceReviewedRows = useMemo(() => rows.filter((r) => r.evidence_review_finalized), [rows])
  const activeSourceRows = useMemo(() => {
    if (selectedMeasure === "function") return functionReviewedRows
    if (selectedMeasure === "evidence") return evidenceReviewedRows
    return []
  }, [selectedMeasure, functionReviewedRows, evidenceReviewedRows])
  const excludedUnreviewedCount = rows.length - activeSourceRows.length

  const filteredRows = useMemo(() => activeSourceRows.filter((r) => {
    if (selectedModels.length && !selectedModels.includes(r.model_label)) return false
    if (selectedExtract !== "ALL" && r.extract_label !== selectedExtract) return false
    if (selectedEvidence !== "ALL" && r.evidence_label !== selectedEvidence) return false
    if (selectedFnDefs !== "ALL" && r.fn_defs_label !== selectedFnDefs) return false
    if (selectedRules !== "ALL" && r.rules_label !== selectedRules) return false
    if (selectedEvidenceQualityAssessment !== "ALL" && r.evidence_quality_assessment_label !== selectedEvidenceQualityAssessment) return false
    if (selectedTag !== "ALL" && !(r.resume_tags || []).includes(selectedTag)) return false
    if (selectedRunId !== "ALL" && r.run_id !== selectedRunId) return false
    return true
  }), [activeSourceRows, selectedModels, selectedExtract, selectedEvidence, selectedFnDefs, selectedRules, selectedEvidenceQualityAssessment, selectedTag, selectedRunId])

  const selectedRuleDef = useMemo(
    () => selectedRules === "ALL" ? null : (CLASSIFICATION_RULES.find((x) => x.name === selectedRules || x.key === selectedRules) || null),
    [selectedRules]
  )
  const selectedEvidenceDef = useMemo(
    () => selectedEvidence === "ALL" ? null : (EVIDENCE_INSTRUCTIONS.find((x) => x.name === selectedEvidence || x.key === selectedEvidence) || null),
    [selectedEvidence]
  )
  const selectedExtractDef = useMemo(
    () => selectedExtract === "ALL" ? null : (EXTRACT_PROMPTS.find((x) => x.name === selectedExtract || x.key === selectedExtract) || null),
    [selectedExtract]
  )
  const selectedFnDefsDef = useMemo(
    () => selectedFnDefs === "ALL" ? null : (FN_DEFINITIONS.find((x) => x.name === selectedFnDefs || x.key === selectedFnDefs) || null),
    [selectedFnDefs]
  )
  const selectedQualityDef = useMemo(
    () => selectedEvidenceQualityAssessment === "ALL" ? null : (EVIDENCE_QUALITY_ASSESSMENTS.find((x) => x.name === selectedEvidenceQualityAssessment || x.key === selectedEvidenceQualityAssessment) || null),
    [selectedEvidenceQualityAssessment]
  )

  const activeVariableDefinitions = useMemo(() => {
    const items = []
    if (selectedRuleDef) {
      items.push({
        key: "rules",
        title: `Classification rules: ${selectedRuleDef.name}`,
        description: selectedRuleDef.description,
        content: selectedRuleDef.content,
      })
    }
    if (selectedEvidenceDef) {
      items.push({
        key: "evidence",
        title: `Evidence instructions: ${selectedEvidenceDef.name}`,
        description: selectedEvidenceDef.description,
        content: selectedEvidenceDef.content,
      })
    }
    if (selectedExtractDef) {
      items.push({
        key: "extract",
        title: `Extract prompt: ${selectedExtractDef.name}`,
        description: selectedExtractDef.description,
        content: selectedExtractDef.content,
      })
    }
    if (selectedFnDefsDef) {
      items.push({
        key: "fn_defs",
        title: `Function level definitions: ${selectedFnDefsDef.name}`,
        description: selectedFnDefsDef.description,
        content: selectedFnDefsDef.content,
      })
    }
    if (selectedQualityDef) {
      items.push({
        key: "quality",
        title: `Evidence quality assessment: ${selectedQualityDef.name}`,
        description: selectedQualityDef.description,
        content: `maxLength: ${selectedQualityDef.maxLength}\nlengthWeight: ${selectedQualityDef.lengthWeight}\nnumberBonus: ${selectedQualityDef.numberBonus}\nquoteBonus: ${selectedQualityDef.quoteBonus}\nactionVerbBonus: ${selectedQualityDef.actionVerbBonus}`,
      })
    }
    return items
  }, [selectedRuleDef, selectedEvidenceDef, selectedExtractDef, selectedFnDefsDef, selectedQualityDef])

  const groupedAccuracy = useMemo(() => {
    const map = new Map()
    for (const r of filteredRows) {
      const key = r[groupBy] || "Not recorded"
      if (!map.has(key)) map.set(key, { key, matches: 0, total: 0 })
      const stat = getMeasureStat(r, selectedMeasure, yMetric, functionLabel)
      map.get(key).matches += stat.matches
      map.get(key).total += stat.total
    }
    return Array.from(map.values()).filter((e) => e.total > 0).map((e) => ({ ...e, accuracy_pct: (e.matches / e.total) * 100 })).sort((a, b) => b.accuracy_pct - a.accuracy_pct)
  }, [filteredRows, groupBy, yMetric, functionLabel, selectedMeasure])

  const summary = useMemo(() => {
    const counts = filteredRows.reduce((acc, r) => {
      const stat = getMeasureStat(r, selectedMeasure, yMetric, functionLabel)
      acc.matches += stat.matches
      acc.total += stat.total
      return acc
    }, { matches: 0, total: 0 })
    return {
      runCount: new Set(filteredRows.map((r) => r.run_id)).size,
      variantCount: filteredRows.length,
      rowsWithCal: filteredRows.filter((r) => getMeasureStat(r, selectedMeasure, yMetric, functionLabel).total > 0).length,
      avgAccuracy: counts.total > 0 ? (counts.matches / counts.total) * 100 : null,
    }
  }, [filteredRows, yMetric, functionLabel, selectedMeasure])

  const runRows = useMemo(() => {
    const map = new Map()
    for (const r of filteredRows) {
      if (!map.has(r.run_id)) map.set(r.run_id, { run_id: r.run_id, run_id_short: r.run_id_short, resume_name: r.resume_name, run_created_at: r.run_created_at, resume_tags: r.resume_tags || [], models: new Set(), variants: 0, matches: 0, total: 0 })
      const entry = map.get(r.run_id)
      entry.models.add(r.model_label)
      entry.variants += 1
      const stat = getMeasureStat(r, selectedMeasure, yMetric, functionLabel)
      entry.matches += stat.matches
      entry.total += stat.total
    }
    return Array.from(map.values()).map((e) => ({ ...e, model_summary: Array.from(e.models).join(", "), accuracy_pct: e.total ? (e.matches / e.total) * 100 : null })).sort((a, b) => new Date(b.run_created_at) - new Date(a.run_created_at))
  }, [filteredRows, yMetric, functionLabel, selectedMeasure])

  const functionOverall = useMemo(() => {
    const counts = functionReviewedRows.reduce((acc, r) => {
      const stat = getStatForMetric(r, "overall", "ALL")
      acc.matches += stat.matches
      acc.total += stat.total
      return acc
    }, { matches: 0, total: 0 })
    return counts.total > 0 ? (counts.matches / counts.total) * 100 : null
  }, [functionReviewedRows])

  const evidenceOverall = useMemo(() => {
    const counts = evidenceReviewedRows.reduce((acc, r) => {
      acc.matches += r.evidence_matches || 0
      acc.total += r.evidence_total || 0
      return acc
    }, { matches: 0, total: 0 })
    return counts.total > 0 ? (counts.matches / counts.total) * 100 : null
  }, [evidenceReviewedRows])

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: "#1a1410", marginBottom: 4 }}>Results</div>
        <div style={{ fontSize: 12, color: "#706050" }}>
          Visualize reviewed accuracy across settings. Deleted and non-finalized rows are excluded from calculations.
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
              {runIdOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, minmax(160px, 1fr))", gap: 10 }}>
          <div>
            <div style={{ fontSize: 10, color: "#a09080", marginBottom: 4 }}>Extraction prompt</div>
            <select value={selectedExtract} onChange={(e) => setSelectedExtract(e.target.value)} style={{ width: "100%", padding: "8px 10px", fontSize: 12, border: "1px solid #d8d0c4", borderRadius: 6, fontFamily: "inherit" }}>
              <option value="ALL">All</option>
              {extractOptions.map((x) => <option key={x} value={x}>{x}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize: 10, color: "#a09080", marginBottom: 4 }}>Evidence instructions</div>
            <select value={selectedEvidence} onChange={(e) => setSelectedEvidence(e.target.value)} style={{ width: "100%", padding: "8px 10px", fontSize: 12, border: "1px solid #d8d0c4", borderRadius: 6, fontFamily: "inherit" }}>
              <option value="ALL">All</option>
              {evidenceOptions.map((x) => <option key={x} value={x}>{x}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize: 10, color: "#a09080", marginBottom: 4 }}>Function level definition</div>
            <select value={selectedFnDefs} onChange={(e) => setSelectedFnDefs(e.target.value)} style={{ width: "100%", padding: "8px 10px", fontSize: 12, border: "1px solid #d8d0c4", borderRadius: 6, fontFamily: "inherit" }}>
              <option value="ALL">All</option>
              {fnDefsOptions.map((x) => <option key={x} value={x}>{x}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize: 10, color: "#a09080", marginBottom: 4 }}>Classification rules</div>
            <select value={selectedRules} onChange={(e) => setSelectedRules(e.target.value)} style={{ width: "100%", padding: "8px 10px", fontSize: 12, border: "1px solid #d8d0c4", borderRadius: 6, fontFamily: "inherit" }}>
              <option value="ALL">All</option>
              {rulesOptions.map((x) => <option key={x} value={x}>{x}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize: 10, color: "#a09080", marginBottom: 4 }}>Evidence quality assessment</div>
            <select value={selectedEvidenceQualityAssessment} onChange={(e) => setSelectedEvidenceQualityAssessment(e.target.value)} style={{ width: "100%", padding: "8px 10px", fontSize: 12, border: "1px solid #d8d0c4", borderRadius: 6, fontFamily: "inherit" }}>
              <option value="ALL">All</option>
              {evidenceQualityAssessmentOptions.map((x) => <option key={x} value={x}>{x}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize: 10, color: "#a09080", marginBottom: 4 }}>Industry tag</div>
            <select value={selectedTag} onChange={(e) => setSelectedTag(e.target.value)} style={{ width: "100%", padding: "8px 10px", fontSize: 12, border: "1px solid #d8d0c4", borderRadius: 6, fontFamily: "inherit" }}>
              <option value="ALL">All tags</option>
              {tagOptions.map((x) => <option key={x} value={x}>{x}</option>)}
            </select>
          </div>
        </div>

        {activeVariableDefinitions.length > 0 && (
          <div style={{ marginTop: 12, borderTop: "1px solid #e0dbd4", paddingTop: 12 }}>
            <div style={{ ...label9, marginBottom: 10 }}>Selected Variable Definitions</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 12px" }}>
              {activeVariableDefinitions.map((item) => (
                <VariableDefinitionCard
                  key={item.key}
                  title={item.title}
                  description={item.description}
                  content={item.content}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div style={{ fontSize: 12, color: "#a09080" }}>Loading result data...</div>
      ) : error ? (
        <div style={{ background: "#fef2f2", border: "0.5px solid #fca5a5", borderRadius: 6, padding: "10px 12px", fontSize: 11, color: "#c04060" }}>
          {error}
        </div>
      ) : (
        <>
          <div style={{ background: "#f5f2ee", border: "1px solid #e0dbd4", borderRadius: 6, padding: "10px 12px", marginBottom: 12, fontSize: 11, color: "#706050" }}>
            Using finalized review rows only ({selectedMeasure === "function" ? "function calibration" : selectedMeasure === "evidence" ? "evidence review" : "selected measure"}): {activeSourceRows.length} included, {excludedUnreviewedCount} excluded.
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(6, minmax(150px, 1fr))", gap: 10, marginBottom: 16 }}>
            <div style={{ background: "white", border: "1px solid #e0dbd4", borderRadius: 6, padding: "10px 12px" }}>
              <div style={{ ...label9, marginBottom: 4 }}>Runs matched</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#1a1410" }}>{summary.runCount}</div>
            </div>
            <div style={{ background: "white", border: "1px solid #e0dbd4", borderRadius: 6, padding: "10px 12px" }}>
              <div style={{ ...label9, marginBottom: 4 }}>Variant rows</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#1a1410" }}>{summary.variantCount}</div>
            </div>
            <div style={{ background: "white", border: "1px solid #e0dbd4", borderRadius: 6, padding: "10px 12px" }}>
              <div style={{ ...label9, marginBottom: 4 }}>{selectedMeasure === "evidence" ? "Reviewed rows" : "Calibrated rows"}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#1a1410" }}>{summary.rowsWithCal}</div>
            </div>
            <div style={{ background: "white", border: "1px solid #e0dbd4", borderRadius: 6, padding: "10px 12px" }}>
              <div style={{ ...label9, marginBottom: 4 }}>Overall accuracy</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#1a1410" }}>
                {summary.avgAccuracy === null ? "N/A" : `${summary.avgAccuracy.toFixed(1)}%`}
              </div>
            </div>
            <div style={{ background: "white", border: "1px solid #e0dbd4", borderRadius: 6, padding: "10px 12px" }}>
              <div style={{ ...label9, marginBottom: 4 }}>Function level</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#1a1410" }}>{functionOverall === null ? "N/A" : `${functionOverall.toFixed(1)}%`}</div>
            </div>
            <div style={{ background: "white", border: "1px solid #e0dbd4", borderRadius: 6, padding: "10px 12px" }}>
              <div style={{ ...label9, marginBottom: 4 }}>Evidence</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#1a1410" }}>{evidenceOverall === null ? "N/A" : `${evidenceOverall.toFixed(1)}%`}</div>
            </div>
            <div style={{ background: "white", border: "1px solid #e0dbd4", borderRadius: 6, padding: "10px 12px" }}>
              <div style={{ ...label9, marginBottom: 4 }}>Industry</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#a09080" }}>Pending</div>
            </div>
            <div style={{ background: "white", border: "1px solid #e0dbd4", borderRadius: 6, padding: "10px 12px" }}>
              <div style={{ ...label9, marginBottom: 4 }}>Knowledge Area</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#a09080" }}>Pending</div>
            </div>
          </div>

          <div style={{ background: "#faf8f5", border: "1px solid #e0dbd4", borderRadius: 6, padding: "14px 16px", marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, gap: 10, flexWrap: "wrap" }}>
              <div style={{ ...label9 }}>Accuracy chart</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <select value={selectedMeasure} onChange={(e) => setSelectedMeasure(e.target.value)} style={{ padding: "6px 10px", fontSize: 12, border: "1px solid #d8d0c4", borderRadius: 6, fontFamily: "inherit" }}>
                  <option value="function">Measure: Function level</option>
                  <option value="evidence">Measure: Evidence handling</option>
                  <option value="industry">Measure: Industry</option>
                  <option value="knowledge_area">Measure: Knowledge area</option>
                </select>
                <select value={chartType} onChange={(e) => setChartType(e.target.value)} style={{ padding: "6px 10px", fontSize: 12, border: "1px solid #d8d0c4", borderRadius: 6, fontFamily: "inherit" }}>
                  <option value="bar">Bar chart</option>
                  <option value="pie">Pie chart</option>
                </select>
                <select value={groupBy} onChange={(e) => setGroupBy(e.target.value)} style={{ padding: "6px 10px", fontSize: 12, border: "1px solid #d8d0c4", borderRadius: 6, fontFamily: "inherit" }}>
                  <option value="model_label">Group by model</option>
                  <option value="rules_label">Group by rules</option>
                  <option value="evidence_label">Group by evidence</option>
                  <option value="evidence_quality_assessment_label">Group by evidence quality assessment</option>
                  <option value="extract_label">Group by extraction prompt</option>
                  <option value="fn_defs_label">Group by function level defs</option>
                  <option value="variant_label">Group by variant</option>
                  <option value="resume_name">Group by resume</option>
                </select>
                <select value={yMetric} onChange={(e) => setYMetric(e.target.value)} disabled={selectedMeasure !== "function"} style={{ padding: "6px 10px", fontSize: 12, border: "1px solid #d8d0c4", borderRadius: 6, fontFamily: "inherit", background: selectedMeasure !== "function" ? "#f5f2ee" : "white", color: selectedMeasure !== "function" ? "#a09080" : "#1a1410" }}>
                  <option value="overall">Y-axis: overall accuracy</option>
                  <option value="function_label">Y-axis: accuracy by function label</option>
                </select>
                {selectedMeasure === "function" && yMetric === "function_label" && (
                  <select value={functionLabel} onChange={(e) => setFunctionLabel(e.target.value)} style={{ padding: "6px 10px", fontSize: 12, border: "1px solid #d8d0c4", borderRadius: 6, fontFamily: "inherit" }}>
                    <option value="ALL">All function labels</option>
                    {functionLabelOptions.map((x) => <option key={x} value={x}>{x}</option>)}
                  </select>
                )}
              </div>
            </div>

            {selectedMeasure === "industry" || selectedMeasure === "knowledge_area" ? (
              <div style={{ fontSize: 12, color: "#a09080" }}>
                {selectedMeasure === "industry" ? "Industry accuracy is pending: finalized human industry labels are not stored yet." : null}
                {selectedMeasure === "knowledge_area" ? "Knowledge-area accuracy is pending: finalized human knowledge-area labels are not stored yet." : null}
              </div>
            ) : groupedAccuracy.length === 0 ? (
              <div style={{ fontSize: 12, color: "#a09080" }}>
                {selectedMeasure === "evidence"
                  ? "No finalized evidence reviews match current filters yet."
                  : "No calibrated rows match current filters yet. Accuracy appears after human calibration labels are available."}
              </div>
            ) : chartType === "bar" ? (
              <BarChart rows={groupedAccuracy.slice(0, 24)} />
            ) : (
              <PieChart rows={groupedAccuracy.slice(0, 8)} />
            )}
          </div>

          <div style={{ background: "#faf8f5", border: "1px solid #e0dbd4", borderRadius: 6, padding: "14px 16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, gap: 10, flexWrap: "wrap" }}>
              <div style={{ ...label9 }}>{tableUnit === "runs" ? `Filtered runs (${runRows.length})` : `Filtered variant rows (${filteredRows.length})`}</div>
              <select value={tableUnit} onChange={(e) => setTableUnit(e.target.value)} style={{ padding: "6px 10px", fontSize: 12, border: "1px solid #d8d0c4", borderRadius: 6, fontFamily: "inherit" }}>
                <option value="runs">Show run-level table</option>
                <option value="variants">Show variant-level table</option>
              </select>
            </div>

            {tableUnit === "runs" ? (
              runRows.length === 0 ? (
                <div style={{ fontSize: 12, color: "#a09080" }}>No runs matched your current filters.</div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
                    <thead>
                      <tr>
                        {["Run ID", "Resume", "Models", "Variants", "Industry Tags", "Accuracy", "Date"].map((h) => <th key={h} style={{ textAlign: "left", fontSize: 10, color: "#a09080", padding: "6px 8px", borderBottom: "1px solid #e0dbd4", textTransform: "uppercase", letterSpacing: ".08em" }}>{h}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {runRows.slice(0, 80).map((r) => (
                        <tr key={r.run_id}>
                          <td style={{ padding: "7px 8px", fontSize: 11, borderBottom: "1px solid #ede8e2", color: "#1a1410", fontWeight: 700 }}>{r.run_id_short}</td>
                          <td style={{ padding: "7px 8px", fontSize: 11, borderBottom: "1px solid #ede8e2", color: "#1a1410" }}>{r.resume_name}</td>
                          <td style={{ padding: "7px 8px", fontSize: 11, borderBottom: "1px solid #ede8e2", color: "#1a1410" }}>{r.model_summary || "Not recorded"}</td>
                          <td style={{ padding: "7px 8px", fontSize: 11, borderBottom: "1px solid #ede8e2", color: "#706050" }}>{r.variants}</td>
                          <td style={{ padding: "7px 8px", fontSize: 11, borderBottom: "1px solid #ede8e2", color: "#706050" }}>{(r.resume_tags || []).join(", ") || "—"}</td>
                          <td style={{ padding: "7px 8px", fontSize: 11, borderBottom: "1px solid #ede8e2", color: "#1a1410", fontWeight: 700 }}>{r.accuracy_pct === null ? "N/A" : `${r.accuracy_pct.toFixed(1)}%`}</td>
                          <td style={{ padding: "7px 8px", fontSize: 11, borderBottom: "1px solid #ede8e2", color: "#706050" }}>{formatDate(r.run_created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            ) : filteredRows.length === 0 ? (
              <div style={{ fontSize: 12, color: "#a09080" }}>No variant rows matched your current filters.</div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 980 }}>
                  <thead>
                    <tr>
                      {["Run ID", "Resume", "Model", "Rules", "Evidence", "Evidence Quality", "Extraction", "Fn Defs", "Industry Tags", "Accuracy", "Date"].map((h) => <th key={h} style={{ textAlign: "left", fontSize: 10, color: "#a09080", padding: "6px 8px", borderBottom: "1px solid #e0dbd4", textTransform: "uppercase", letterSpacing: ".08em" }}>{h}</th>)}
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
                        <td style={{ padding: "7px 8px", fontSize: 11, borderBottom: "1px solid #ede8e2", color: "#706050" }}>{r.evidence_quality_assessment_label}</td>
                        <td style={{ padding: "7px 8px", fontSize: 11, borderBottom: "1px solid #ede8e2", color: "#706050" }}>{r.extract_label}</td>
                        <td style={{ padding: "7px 8px", fontSize: 11, borderBottom: "1px solid #ede8e2", color: "#706050" }}>{r.fn_defs_label}</td>
                        <td style={{ padding: "7px 8px", fontSize: 11, borderBottom: "1px solid #ede8e2", color: "#706050" }}>{(r.resume_tags || []).join(", ") || "—"}</td>
                        <td style={{ padding: "7px 8px", fontSize: 11, borderBottom: "1px solid #ede8e2", color: "#1a1410", fontWeight: 700 }}>{r.accuracy_pct === null ? "N/A" : `${r.accuracy_pct.toFixed(1)}%`}</td>
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
