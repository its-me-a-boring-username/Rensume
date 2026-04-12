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

function getResumeName(run) {
  const rel = run?.research_resumes
  if (Array.isArray(rel)) return rel[0]?.name || "Unknown resume"
  if (rel && typeof rel === "object") return rel.name || "Unknown resume"
  return "Unknown resume"
}

export default function ResearchReviewQueue() {
  const [runs, setRuns] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    let cancelled = false

    async function loadRuns() {
      setLoading(true)
      setError("")

      let { data, error } = await supabase
        .from("research_runs")
        .select(`
          id,
          resume_id,
          created_at,
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
            resume_id,
            created_at,
            research_resumes(name)
          `)
          .order("created_at", { ascending: false })
        data = legacy.data
        error = legacy.error
      }

      if (cancelled) return

      if (error) {
        setRuns([])
        setError(error.message || "Failed to load review queue.")
      } else {
        setRuns(data || [])
      }
      setLoading(false)
    }

    loadRuns()
    return () => { cancelled = true }
  }, [])

  const resumeQueue = useMemo(() => {
    const map = new Map()
    for (const run of runs) {
      if (!run?.resume_id) continue
      const existing = map.get(run.resume_id)
      if (!existing) {
        map.set(run.resume_id, {
          resume_id: run.resume_id,
          resume_name: getResumeName(run),
          latest_run_date: run.created_at,
          run_count: 1,
        })
      } else {
        existing.run_count += 1
        if (new Date(run.created_at) > new Date(existing.latest_run_date)) {
          existing.latest_run_date = run.created_at
        }
      }
    }
    return Array.from(map.values()).sort((a, b) => new Date(b.latest_run_date) - new Date(a.latest_run_date))
  }, [runs])

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: "#1a1410", marginBottom: 4 }}>Review Queue</div>
        <div style={{ fontSize: 12, color: "#706050", maxWidth: 780 }}>
          Resumes shown here have been analyzed but have not yet gone through evidence evaluation.
          This placeholder queue separates review workflow from the Data tab.
        </div>
      </div>

      {loading ? (
        <div style={{ fontSize: 12, color: "#a09080" }}>Loading review queue...</div>
      ) : error ? (
        <div style={{ background: "#fef2f2", border: "0.5px solid #fca5a5", borderRadius: 6, padding: "10px 12px", fontSize: 11, color: "#c04060" }}>
          Failed to load queue: {error}
        </div>
      ) : resumeQueue.length === 0 ? (
        <div style={{ fontSize: 12, color: "#a09080" }}>
          No analyzed resumes found yet. Run analysis first, then come back to review.
        </div>
      ) : (
        <div style={{ background: "#faf8f5", border: "1px solid #e0dbd4", borderRadius: 6, padding: "14px 16px" }}>
          <div style={{ ...label9, marginBottom: 10 }}>Pending evidence review</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {resumeQueue.map((item) => (
              <div
                key={item.resume_id}
                style={{
                  background: "white",
                  border: "1px solid #e0dbd4",
                  borderRadius: 6,
                  padding: "10px 12px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#1a1410" }}>{item.resume_name}</div>
                  <div style={{ fontSize: 10, color: "#a09080" }}>Latest run: {formatDate(item.latest_run_date)}</div>
                </div>
                <div style={{ fontSize: 10, color: "#706050", whiteSpace: "nowrap" }}>
                  {item.run_count} run{item.run_count === 1 ? "" : "s"}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

