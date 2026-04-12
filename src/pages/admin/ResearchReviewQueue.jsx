import { useEffect, useMemo, useRef, useState } from "react"
import { supabase } from "../../lib/supabase.js"

const label9 = {
  fontSize: 9,
  fontWeight: 700,
  letterSpacing: ".12em",
  textTransform: "uppercase",
  color: "#a09080",
}

const FLAG_OPTIONS = [
  { key: "hallucinated_evidence", label: "Hallucinated evidence" },
  { key: "misleading_quote", label: "Misleading quote" },
  { key: "irrelevant_evidence", label: "Irrelevant evidence" },
  { key: "incomplete_evidence", label: "Incomplete evidence" },
  { key: "wrong_label_despite_good_evidence", label: "Wrong label despite good evidence" },
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

function getResumeText(run) {
  const rel = run?.research_resumes
  if (Array.isArray(rel)) return rel[0]?.clean_text || ""
  if (rel && typeof rel === "object") return rel.clean_text || ""
  return ""
}

function getParsedRoles(run) {
  const fromRun = Array.isArray(run?.parsed_roles_snapshot) ? run.parsed_roles_snapshot : null
  if (fromRun) return fromRun
  const rel = run?.research_resumes
  if (Array.isArray(rel)) return Array.isArray(rel[0]?.parsed_roles) ? rel[0].parsed_roles : []
  if (rel && typeof rel === "object") return Array.isArray(rel.parsed_roles) ? rel.parsed_roles : []
  return []
}

function normalizeReviewItems(classifications) {
  const items = []
  for (const row of Array.isArray(classifications) ? classifications : []) {
    const roleIndex = Number(row?.role_index)
    if (!Number.isFinite(roleIndex)) continue
    for (const label of Array.isArray(row?.labels) ? row.labels : []) {
      const labelName = (label?.name || "").trim()
      if (!labelName) continue
      items.push({
        role_index: roleIndex,
        label_name: labelName,
        evidence_text: (label?.evidence || "").trim(),
      })
    }
  }
  return items
}

function markText(text, needle) {
  const source = String(text || "")
  const q = String(needle || "").trim()
  if (!q) return source
  const idx = source.toLowerCase().indexOf(q.toLowerCase())
  if (idx < 0) return source
  return (
    <>
      {source.slice(0, idx)}
      <mark style={{ background: "#fff3bf", padding: "0 1px" }}>{source.slice(idx, idx + q.length)}</mark>
      {source.slice(idx + q.length)}
    </>
  )
}

function RatingPill({ active, label, onClick, color }) {
  return (
    <button
      onClick={onClick}
      style={{
        border: `1px solid ${active ? color : "#d8d0c4"}`,
        color: active ? color : "#706050",
        background: active ? "#f8f4ef" : "white",
        borderRadius: 999,
        padding: "3px 10px",
        fontSize: 10,
        fontWeight: 700,
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  )
}

export default function ResearchReviewQueue() {
  const [runs, setRuns] = useState([])
  const [resultsByRun, setResultsByRun] = useState({})
  const [reviewsByResultId, setReviewsByResultId] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [saveError, setSaveError] = useState("")
  const [saving, setSaving] = useState(false)
  const [schemaMissing, setSchemaMissing] = useState(false)
  const [reviewer, setReviewer] = useState({ key: "anonymous", userId: null, email: null })

  const [selectedResultId, setSelectedResultId] = useState(null)
  const [selectedRoleIndex, setSelectedRoleIndex] = useState(null)
  const [highlightPhrase, setHighlightPhrase] = useState("")
  const roleRefs = useRef({})

  const [reviewRow, setReviewRow] = useState(null)
  const [itemState, setItemState] = useState({})

  useEffect(() => {
    let cancelled = false

    async function loadAll() {
      setLoading(true)
      setError("")

      const { data: userData } = await supabase.auth.getUser()
      const user = userData?.user || null
      const reviewerKey = user?.id || user?.email || "anonymous"
      if (!cancelled) setReviewer({ key: reviewerKey, userId: user?.id || null, email: user?.email || null })

      let runQuery = await supabase
        .from("research_runs")
        .select("id, resume_id, created_at, parsed_roles_snapshot, deleted_at, research_resumes(name, clean_text, parsed_roles)")
        .is("deleted_at", null)
        .order("created_at", { ascending: false })

      if (runQuery.error && /deleted_at|column/i.test(runQuery.error.message || "")) {
        runQuery = await supabase
          .from("research_runs")
          .select("id, resume_id, created_at, parsed_roles_snapshot, research_resumes(name, clean_text, parsed_roles)")
          .order("created_at", { ascending: false })
      }
      if (runQuery.error) {
        if (!cancelled) {
          setRuns([])
          setError(runQuery.error.message || "Failed to load runs")
          setLoading(false)
        }
        return
      }

      const runRows = runQuery.data || []
      const runIds = runRows.map((r) => r.id)
      let resultRows = []
      if (runIds.length) {
        const resultQuery = await supabase
          .from("research_run_results")
          .select("id, run_id, variant_key, variant_label, model_label, classifications")
          .in("run_id", runIds)
        if (!resultQuery.error) resultRows = resultQuery.data || []
      }

      const grouped = resultRows.reduce((acc, row) => {
        if (!acc[row.run_id]) acc[row.run_id] = []
        acc[row.run_id].push(row)
        return acc
      }, {})

      const resultIds = resultRows.map((r) => r.id)
      let reviewRows = []
      if (resultIds.length) {
        const reviewQuery = await supabase
          .from("research_variant_reviews")
          .select("id, run_result_id, status, coverage_pct, updated_at, reviewer_key, label_family, review_aspect")
          .in("run_result_id", resultIds)
          .eq("reviewer_key", reviewerKey)
          .eq("label_family", "function")
          .eq("review_aspect", "evidence")
        if (reviewQuery.error) {
          if (/relation|does not exist|schema/i.test(reviewQuery.error.message || "")) {
            if (!cancelled) setSchemaMissing(true)
          }
        } else {
          reviewRows = reviewQuery.data || []
        }
      }

      const reviewMap = Object.fromEntries(reviewRows.map((r) => [r.run_result_id, r]))

      if (!cancelled) {
        setSchemaMissing(false)
        setRuns(runRows)
        setResultsByRun(grouped)
        setReviewsByResultId(reviewMap)
        const firstResult = resultRows[0]?.id || null
        setSelectedResultId((prev) => prev || firstResult)
        setLoading(false)
      }
    }

    loadAll()
    return () => { cancelled = true }
  }, [])

  const queueRows = useMemo(() => {
    const rows = []
    for (const run of runs) {
      const runResults = resultsByRun[run.id] || []
      for (const rr of runResults) {
        const totalItems = normalizeReviewItems(rr.classifications).length
        const review = reviewsByResultId[rr.id]
        rows.push({
          run_id: run.id,
          run_created_at: run.created_at,
          resume_name: getResumeName(run),
          run_result_id: rr.id,
          variant_label: rr.variant_label || rr.model_label || rr.variant_key || "Unknown variant",
          model_label: rr.model_label || "Unknown model",
          review_status: review?.status || "draft",
          coverage_pct: review?.coverage_pct ?? 0,
          total_items: totalItems,
        })
      }
    }
    return rows.sort((a, b) => new Date(b.run_created_at) - new Date(a.run_created_at))
  }, [runs, resultsByRun, reviewsByResultId])

  const selectedContext = useMemo(() => {
    for (const run of runs) {
      for (const rr of resultsByRun[run.id] || []) {
        if (rr.id === selectedResultId) {
          return { run, result: rr }
        }
      }
    }
    return null
  }, [runs, resultsByRun, selectedResultId])

  const normalizedItems = useMemo(
    () => normalizeReviewItems(selectedContext?.result?.classifications),
    [selectedContext],
  )

  useEffect(() => {
    setSelectedRoleIndex(null)
    setHighlightPhrase("")
    setReviewRow(null)
    setItemState({})
  }, [selectedResultId])

  useEffect(() => {
    let cancelled = false
    async function loadReviewItems() {
      if (!selectedContext || schemaMissing) return
      const existingReview = reviewsByResultId[selectedContext.result.id] || null
      if (!existingReview) return
      const itemsQuery = await supabase
        .from("research_variant_review_items")
        .select("role_index, label_name, evidence_text, rating, flags, note")
        .eq("variant_review_id", existingReview.id)
        .eq("label_family", "function")
        .eq("review_aspect", "evidence")
      if (itemsQuery.error || cancelled) return

      const mapped = {}
      for (const item of itemsQuery.data || []) {
        const key = `${item.role_index}::${item.label_name}`
        mapped[key] = {
          rating: item.rating || "",
          flags: Array.isArray(item.flags) ? item.flags : [],
          note: item.note || "",
          evidence_text: item.evidence_text || "",
        }
      }
      if (!cancelled) {
        setReviewRow(existingReview)
        setItemState(mapped)
      }
    }
    loadReviewItems()
    return () => { cancelled = true }
  }, [selectedContext, schemaMissing, reviewsByResultId])

  const parsedRoles = useMemo(() => getParsedRoles(selectedContext?.run), [selectedContext])
  const resumeText = useMemo(() => getResumeText(selectedContext?.run), [selectedContext])

  const roleBuckets = useMemo(() => {
    const map = {}
    for (const item of normalizedItems) {
      const key = item.role_index
      if (!map[key]) map[key] = []
      map[key].push(item)
    }
    return map
  }, [normalizedItems])

  const reviewedCount = useMemo(() => {
    return normalizedItems.reduce((sum, item) => {
      const key = `${item.role_index}::${item.label_name}`
      return sum + (itemState[key]?.rating ? 1 : 0)
    }, 0)
  }, [normalizedItems, itemState])
  const coveragePct = normalizedItems.length ? (reviewedCount / normalizedItems.length) * 100 : 0

  const setRating = (roleIndex, labelName, rating) => {
    const key = `${roleIndex}::${labelName}`
    setItemState((prev) => ({ ...prev, [key]: { ...(prev[key] || {}), rating } }))
  }
  const toggleFlag = (roleIndex, labelName, flagKey) => {
    const key = `${roleIndex}::${labelName}`
    setItemState((prev) => {
      const current = prev[key] || {}
      const flags = Array.isArray(current.flags) ? current.flags : []
      const nextFlags = flags.includes(flagKey) ? flags.filter((x) => x !== flagKey) : [...flags, flagKey]
      return { ...prev, [key]: { ...current, flags: nextFlags } }
    })
  }
  const setNote = (roleIndex, labelName, note) => {
    const key = `${roleIndex}::${labelName}`
    setItemState((prev) => ({ ...prev, [key]: { ...(prev[key] || {}), note } }))
  }

  const persist = async (nextStatus = "draft") => {
    if (!selectedContext || schemaMissing) return
    setSaving(true)
    setSaveError("")
    try {
      const baseReview = {
        run_id: selectedContext.run.id,
        run_result_id: selectedContext.result.id,
        resume_id: selectedContext.run.resume_id,
        reviewer_key: reviewer.key,
        reviewer_user_id: reviewer.userId,
        reviewer_email: reviewer.email,
        label_family: "function",
        review_aspect: "evidence",
        status: nextStatus,
        coverage_pct: Number(coveragePct.toFixed(2)),
        finalized_at: nextStatus === "finalized" ? new Date().toISOString() : null,
      }

      const reviewUpsert = await supabase
        .from("research_variant_reviews")
        .upsert(baseReview, { onConflict: "run_result_id,reviewer_key,label_family,review_aspect" })
        .select()
        .single()
      if (reviewUpsert.error) throw reviewUpsert.error
      const vr = reviewUpsert.data
      setReviewRow(vr)

      const rows = normalizedItems.map((item) => {
        const key = `${item.role_index}::${item.label_name}`
        const local = itemState[key] || {}
        return {
          variant_review_id: vr.id,
          role_index: item.role_index,
          label_name: item.label_name,
          label_family: "function",
          review_aspect: "evidence",
          evidence_text: item.evidence_text || local.evidence_text || "",
          rating: local.rating || null,
          flags: Array.isArray(local.flags) ? local.flags : [],
          note: local.note || null,
        }
      })
      if (rows.length) {
        const itemUpsert = await supabase
          .from("research_variant_review_items")
          .upsert(rows, { onConflict: "variant_review_id,role_index,label_name,label_family,review_aspect" })
        if (itemUpsert.error) throw itemUpsert.error
      }

      setReviewsByResultId((prev) => ({
        ...prev,
        [selectedContext.result.id]: {
          id: vr.id,
          run_result_id: selectedContext.result.id,
          status: vr.status,
          coverage_pct: vr.coverage_pct,
          updated_at: vr.updated_at,
        },
      }))
    } catch (e) {
      setSaveError(e.message || "Save failed")
    } finally {
      setSaving(false)
    }
  }

  const handleFinalize = async () => {
    if (reviewedCount < normalizedItems.length) {
      setSaveError("All labels need a rating before finalizing.")
      return
    }
    await persist("finalized")
  }

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: "#1a1410", marginBottom: 4 }}>Review Queue</div>
        <div style={{ fontSize: 12, color: "#706050", maxWidth: 860 }}>
          Evidence review by role and label. Left panel shows resume source text; right panel contains rating controls.
          Finalized reviews are audit-safe and used for downstream calculations.
        </div>
      </div>

      {loading ? (
        <div style={{ fontSize: 12, color: "#a09080" }}>Loading review queue...</div>
      ) : error ? (
        <div style={{ background: "#fef2f2", border: "0.5px solid #fca5a5", borderRadius: 6, padding: "10px 12px", fontSize: 11, color: "#c04060" }}>
          Failed to load queue: {error}
        </div>
      ) : schemaMissing ? (
        <div style={{ background: "#fff8e6", border: "1px solid #f5d87a", borderRadius: 6, padding: "10px 12px", fontSize: 11, color: "#7a5c00" }}>
          Review tables are not installed yet. Run `db/research_review_v1.sql` in Supabase SQL editor, then refresh this page.
        </div>
      ) : queueRows.length === 0 ? (
        <div style={{ fontSize: 12, color: "#a09080" }}>No analyzed variants found yet. Run analysis first.</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 16 }}>
          <div style={{ background: "#faf8f5", border: "1px solid #e0dbd4", borderRadius: 6, padding: "12px 10px", maxHeight: "calc(100vh - 220px)", overflowY: "auto" }}>
            <div style={{ ...label9, margin: "0 6px 10px" }}>Review targets</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {queueRows.map((row) => {
                const active = row.run_result_id === selectedResultId
                const finalized = row.review_status === "finalized"
                return (
                  <button
                    key={row.run_result_id}
                    onClick={() => setSelectedResultId(row.run_result_id)}
                    style={{
                      textAlign: "left",
                      borderRadius: 6,
                      border: `1px solid ${active ? "#904060" : "#e0dbd4"}`,
                      background: active ? "#f5eaee" : "white",
                      padding: "9px 10px",
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#1a1410", marginBottom: 1 }}>{row.resume_name}</div>
                    <div style={{ fontSize: 10, color: "#706050", marginBottom: 4 }}>{row.variant_label}</div>
                    <div style={{ fontSize: 10, color: "#a09080" }}>{formatDate(row.run_created_at)}</div>
                    <div style={{ marginTop: 5, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 10, color: finalized ? "#2a7a6a" : "#a09080" }}>
                        {finalized ? "Finalized" : "Draft"}
                      </span>
                      <span style={{ fontSize: 10, color: "#706050" }}>{Number(row.coverage_pct || 0).toFixed(0)}%</span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {!selectedContext ? (
            <div style={{ background: "#faf8f5", border: "1px solid #e0dbd4", borderRadius: 6, padding: "14px 16px", fontSize: 12, color: "#a09080" }}>
              Select a review target.
            </div>
          ) : (
            <div style={{ background: "#faf8f5", border: "1px solid #e0dbd4", borderRadius: 6, padding: "14px 16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "#1a1410" }}>{getResumeName(selectedContext.run)}</div>
                  <div style={{ fontSize: 11, color: "#706050" }}>
                    {selectedContext.result.variant_label || selectedContext.result.variant_key} • {formatDate(selectedContext.run.created_at)} • Run {(selectedContext.run.id || "").slice(0, 8).toUpperCase()}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => persist("draft")} disabled={saving} style={{ border: "1px solid #d8d0c4", background: "white", color: "#706050", borderRadius: 4, padding: "7px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                    Save Draft
                  </button>
                  <button onClick={handleFinalize} disabled={saving || normalizedItems.length === 0} style={{ border: "none", background: "#904060", color: "white", borderRadius: 4, padding: "7px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                    Finalize
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: 10, fontSize: 11, color: "#706050" }}>
                Coverage: <strong>{reviewedCount}/{normalizedItems.length}</strong> ({coveragePct.toFixed(1)}%) • Status: <strong>{reviewRow?.status || "draft"}</strong>
                {reviewRow?.updated_at ? <> • Last saved: {formatDate(reviewRow.updated_at)}</> : null}
              </div>
              {saveError ? (
                <div style={{ background: "#fef2f2", border: "0.5px solid #fca5a5", borderRadius: 6, padding: "8px 10px", fontSize: 11, color: "#c04060", marginBottom: 10 }}>{saveError}</div>
              ) : null}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div style={{ background: "white", border: "1px solid #e0dbd4", borderRadius: 6, padding: "10px 12px", maxHeight: "calc(100vh - 320px)", overflowY: "auto" }}>
                  <div style={{ ...label9, marginBottom: 8 }}>Resume Text</div>
                  {!parsedRoles.length ? (
                    <pre style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: 11, color: "#1a1410", lineHeight: 1.6 }}>{resumeText || "No text available."}</pre>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {parsedRoles.map((role, idx) => (
                        <div
                          key={`role-text-${idx}`}
                          ref={(el) => { roleRefs.current[idx] = el }}
                          style={{
                            background: selectedRoleIndex === idx ? "#fff8e6" : "#faf8f5",
                            border: `1px solid ${selectedRoleIndex === idx ? "#f5d87a" : "#ede8e2"}`,
                            borderRadius: 6,
                            padding: "8px 10px",
                          }}
                        >
                          <div style={{ fontSize: 11, fontWeight: 700, color: "#1a1410" }}>{role.title || `Role ${idx + 1}`}</div>
                          <div style={{ fontSize: 10, color: "#a09080", marginBottom: 5 }}>{role.employer || "Unknown employer"}</div>
                          <div style={{ fontSize: 11, color: "#1a1410", lineHeight: 1.6 }}>
                            {markText(role.text || "", selectedRoleIndex === idx ? highlightPhrase : "")}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ background: "white", border: "1px solid #e0dbd4", borderRadius: 6, padding: "10px 12px", maxHeight: "calc(100vh - 320px)", overflowY: "auto" }}>
                  <div style={{ ...label9, marginBottom: 8 }}>Evidence Ratings</div>
                  {Object.keys(roleBuckets).length === 0 ? (
                    <div style={{ fontSize: 11, color: "#a09080" }}>No labels to review for this variant.</div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {Object.entries(roleBuckets)
                        .sort((a, b) => Number(a[0]) - Number(b[0]))
                        .map(([roleIdx, labels]) => {
                          const i = Number(roleIdx)
                          const role = parsedRoles[i] || {}
                          return (
                            <div key={`role-bucket-${roleIdx}`} style={{ border: "1px solid #ede8e2", borderRadius: 6, padding: "8px 9px", background: "#faf8f5" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 6 }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: "#1a1410" }}>{role.title || `Role ${i + 1}`}</div>
                                <button
                                  onClick={() => {
                                    setSelectedRoleIndex(i)
                                    const target = roleRefs.current[i]
                                    if (target) target.scrollIntoView({ behavior: "smooth", block: "center" })
                                  }}
                                  style={{ border: "1px solid #d8d0c4", background: "white", color: "#706050", borderRadius: 4, padding: "3px 8px", fontSize: 10, cursor: "pointer" }}
                                >
                                  Jump to text
                                </button>
                              </div>

                              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                {labels.map((item) => {
                                  const key = `${item.role_index}::${item.label_name}`
                                  const local = itemState[key] || {}
                                  return (
                                    <div key={key} style={{ background: "white", border: "1px solid #ede8e2", borderRadius: 6, padding: "7px 8px" }}>
                                      <div style={{ fontSize: 11, fontWeight: 700, color: "#1a1410", marginBottom: 4 }}>{item.label_name}</div>
                                      <div
                                        onClick={() => {
                                          setSelectedRoleIndex(item.role_index)
                                          setHighlightPhrase(item.evidence_text)
                                          const target = roleRefs.current[item.role_index]
                                          if (target) target.scrollIntoView({ behavior: "smooth", block: "center" })
                                        }}
                                        style={{ fontSize: 10, color: "#706050", marginBottom: 6, lineHeight: 1.6, cursor: "pointer" }}
                                        title="Click to highlight this evidence in source text"
                                      >
                                        {item.evidence_text || "No evidence text recorded"}
                                      </div>
                                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
                                        <RatingPill active={local.rating === "accurate"} label="Accurate" color="#2a7a6a" onClick={() => setRating(item.role_index, item.label_name, "accurate")} />
                                        <RatingPill active={local.rating === "partially_accurate"} label="Partially accurate" color="#c07030" onClick={() => setRating(item.role_index, item.label_name, "partially_accurate")} />
                                        <RatingPill active={local.rating === "inaccurate"} label="Inaccurate" color="#c04060" onClick={() => setRating(item.role_index, item.label_name, "inaccurate")} />
                                      </div>
                                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
                                        {FLAG_OPTIONS.map((f) => {
                                          const on = Array.isArray(local.flags) && local.flags.includes(f.key)
                                          return (
                                            <button
                                              key={f.key}
                                              onClick={() => toggleFlag(item.role_index, item.label_name, f.key)}
                                              style={{
                                                border: `1px solid ${on ? "#904060" : "#d8d0c4"}`,
                                                background: on ? "#f5eaee" : "white",
                                                color: on ? "#904060" : "#706050",
                                                borderRadius: 999,
                                                padding: "2px 8px",
                                                fontSize: 9,
                                                cursor: "pointer",
                                              }}
                                            >
                                              {f.label}
                                            </button>
                                          )
                                        })}
                                      </div>
                                      <textarea
                                        value={local.note || ""}
                                        onChange={(e) => setNote(item.role_index, item.label_name, e.target.value)}
                                        placeholder="Optional reviewer note"
                                        style={{ width: "100%", minHeight: 46, resize: "vertical", border: "1px solid #e0dbd4", borderRadius: 4, padding: "6px 8px", fontSize: 10, fontFamily: "inherit", boxSizing: "border-box" }}
                                      />
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )
                        })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
