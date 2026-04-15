// src/pages/admin/ResearchRunAnalysis.jsx
// Run Analysis page — select resumes from library, configure settings, run,
// view results, save runs to Supabase.

import { useState, useEffect } from "react"
import { supabase } from "../../lib/supabase.js"
import {
  AVAILABLE_MODELS, CLASSIFICATION_RULES, EVIDENCE_INSTRUCTIONS,
  EXTRACT_PROMPTS, FN_DEFINITIONS, EVIDENCE_QUALITY_ASSESSMENTS, DEFAULT_SETTINGS,
  isPlaceholderOption,
  classifyRoles, getSummary, aggregateLabels, m2y, seniority,
} from "../../lib/researchClassifier.js"
import RoleLabelDotTable from "../../components/RoleLabelDotTable.jsx"

const ACCENT_COLORS = ['#904060','#3a6aaa','#c07030','#2a7a6a','#7a3aaa','#aa6a2a','#3aaa6a','#aa3a3a']

// ─── Styles ───────────────────────────────────────────────────────────────────

const label9 = { fontSize: 9, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: '#a09080' }
const btnStyle = (active) => ({
  padding: '4px 10px', fontSize: 11, borderRadius: 3, cursor: 'pointer',
  border: `1px solid ${active ? '#904060' : '#d8d0c4'}`,
  background: active ? '#f5eaee' : 'white',
  color: active ? '#904060' : '#706050',
  fontWeight: active ? 700 : 400,
})
const primaryBtn = (disabled) => ({
  background: disabled ? '#e0dbd4' : '#904060',
  color: disabled ? '#a09080' : '#fff',
  fontSize: 12, fontWeight: 700, padding: '10px 24px',
  borderRadius: 3, border: 'none',
  cursor: disabled ? 'not-allowed' : 'pointer',
})

// ─── Resume selector ──────────────────────────────────────────────────────────

function ResumeSelector({ resumes, selectedIds, onToggle, onSelectAll, onClearAll, loading }) {
  const [tagFilter, setTagFilter] = useState('')
  const allTags = [...new Set(resumes.flatMap(r => r.tags || []))]

  const filtered = tagFilter
    ? resumes.filter(r => r.tags?.some(t => t.toLowerCase().includes(tagFilter.toLowerCase())))
    : resumes

  if (loading) return <div style={{ fontSize: 12, color: '#a09080' }}>Loading resumes...</div>
  if (!resumes.length) return (
    <div style={{ fontSize: 12, color: '#a09080' }}>
      No resumes in library yet. <a href="/admin/resumes" style={{ color: '#904060' }}>Upload one first.</a>
    </div>
  )

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
        <input
          value={tagFilter}
          onChange={e => setTagFilter(e.target.value)}
          placeholder="Filter by tag..."
          style={{ padding: '6px 10px', fontSize: 11, border: '1px solid #d8d0c4', borderRadius: 6, outline: 'none', fontFamily: 'inherit', color: '#1a1410', width: 200 }}
        />
        <button onClick={() => onSelectAll(filtered.map(r => r.id))} style={{ ...btnStyle(false), fontSize: 10 }}>
          Select all{tagFilter ? ' filtered' : ''}
        </button>
        {selectedIds.length > 0 && (
          <button onClick={onClearAll} style={{ ...btnStyle(false), fontSize: 10 }}>Clear</button>
        )}
        {selectedIds.length > 0 && (
          <span style={{ fontSize: 11, color: '#a09080' }}>{selectedIds.length} selected</span>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 280, overflowY: 'auto' }}>
        {filtered.map(r => {
          const selected = selectedIds.includes(r.id)
          return (
            <div
              key={r.id}
              onClick={() => onToggle(r.id)}
              style={{
                background: selected ? '#f5eaee' : 'white',
                border: `1px solid ${selected ? '#904060' : '#e0dbd4'}`,
                borderRadius: 6, padding: '10px 14px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 14, height: 14, borderRadius: 3, border: `2px solid ${selected ? '#904060' : '#d8d0c4'}`,
                  background: selected ? '#904060' : 'white', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {selected && <span style={{ color: 'white', fontSize: 10, fontWeight: 700 }}>✓</span>}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 11, color: '#1a1410' }}>{r.name}</div>
                  <div style={{ fontSize: 10, color: '#a09080' }}>
                    {r.parsed_roles?.filter(p => !p.flagged).length || 0} roles
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                {r.tags?.map(tag => (
                  <span key={tag} style={{ background: '#f5eaee', border: '1px solid #e8d0d8', borderRadius: 3, padding: '1px 6px', fontSize: 10, color: '#904060' }}>{tag}</span>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Component selector ───────────────────────────────────────────────────────

function ComponentSelector({ label, options, selectedKey, onChange }) {
  const [expanded, setExpanded] = useState({})
  const visibleOptions = options.filter((opt) => !isPlaceholderOption(opt))
  return (
    <div style={{ marginBottom: 24, paddingTop: 4, paddingBottom: 2 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#1a1410', marginBottom: 12 }}>{label}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {visibleOptions.map(opt => (
          <div key={opt.key} style={{ border: '1px solid #ede8e2', borderRadius: 6, background: 'white', padding: '8px 10px' }}>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer', padding: '2px 0' }}>
              <input
                type="radio"
                name={label}
                value={opt.key}
                checked={selectedKey === opt.key}
                onChange={() => onChange(opt.key)}
                style={{ marginTop: 2, flexShrink: 0 }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: opt.content.startsWith('PLACEHOLDER') ? '#a09080' : '#1a1410' }}>
                    {opt.name}
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setExpanded(prev => ({ ...prev, [opt.key]: !prev[opt.key] }))
                    }}
                    style={{ border: 'none', background: 'transparent', color: '#706050', cursor: 'pointer', fontSize: 13, fontWeight: 700, padding: '0 2px' }}
                    title={expanded[opt.key] ? 'Hide content' : 'Show content'}
                    aria-label={expanded[opt.key] ? 'Hide content' : 'Show content'}
                  >
                    {expanded[opt.key] ? '⌄' : '>'}
                  </button>
                </div>
                <div style={{ fontSize: 10, color: '#a09080' }}>{opt.description}</div>
              </div>
            </label>
            {expanded[opt.key] && (
              <pre style={{
                margin: '8px 0 0',
                padding: '8px 10px',
                background: '#faf8f5',
                border: '1px solid #e8e2db',
                borderRadius: 6,
                color: '#403830',
                fontSize: 10,
                lineHeight: 1.45,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
              }}>
                {opt.content || 'No content recorded.'}
              </pre>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Settings panel ───────────────────────────────────────────────────────────

function SettingsPanel({ selectedModels, setSelectedModels, blind, setBlind, componentKeys, setComponentKeys }) {
  const [qualityExpanded, setQualityExpanded] = useState({})
  const toggle = (key) => {
    setSelectedModels(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    )
  }
  const setKey = (component, key) => setComponentKeys(prev => ({ ...prev, [component]: key }))

  return (
    <div style={{ background: '#faf8f5', border: '1px solid #e0dbd4', borderRadius: 6, padding: '16px 20px', marginBottom: 20 }}>
      <div style={{ ...label9, marginBottom: 16 }}>Settings</div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#1a1410', marginBottom: 8 }}>Models</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {AVAILABLE_MODELS.map(m => {
            const selected = selectedModels.includes(m.key)
            return (
              <button key={m.key} onClick={() => toggle(m.key)} title={m.price} style={btnStyle(selected)}>
                {m.label}
              </button>
            )
          })}
        </div>
      </div>

      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#1a1410' }}>Blind mode</div>
        <button onClick={() => setBlind(b => !b)} style={btnStyle(blind)}>
          {blind ? 'On — title hidden' : 'Off — titled'}
        </button>
      </div>

      <div style={{ borderTop: '1px solid #e0dbd4', paddingTop: 20, marginBottom: 22 }}>
        <div style={{ ...label9, marginBottom: 14 }}>Evidence Output</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 28px' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#1a1410' }}>Max snippets</span>
            <input
              type="text"
              inputMode="numeric"
              value={componentKeys.evidenceMaxSnippets ?? "2"}
              onChange={(e) => setKey('evidenceMaxSnippets', e.target.value)}
              placeholder="2"
              style={{ width: '100%', padding: '8px 10px', fontSize: 12, border: '1px solid #d8d0c4', borderRadius: 6, fontFamily: 'inherit' }}
            />
            <span style={{ fontSize: 10, color: '#a09080' }}>How many canonical snippets to display per function label.</span>
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#1a1410' }}>Joiner text</span>
            <input
              type="text"
              value={componentKeys.evidenceJoiner ?? " and "}
              onChange={(e) => setKey('evidenceJoiner', e.target.value)}
              placeholder=" and "
              style={{ width: '100%', padding: '8px 10px', fontSize: 12, border: '1px solid #d8d0c4', borderRadius: 6, fontFamily: 'inherit' }}
            />
            <span style={{ fontSize: 10, color: '#a09080' }}>Text inserted between multiple snippets.</span>
          </label>
        </div>
      </div>

      <div style={{ borderTop: '1px solid #e0dbd4', paddingTop: 20, marginBottom: 22 }}>
        <div style={{ ...label9, marginBottom: 14 }}>Evidence Quality Assessment</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 28px' }}>
          {EVIDENCE_QUALITY_ASSESSMENTS.map((profile) => (
            <div key={profile.key} style={{ border: '1px solid #ede8e2', borderRadius: 6, background: 'white', padding: '8px 10px' }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer', padding: '3px 0' }}>
                <input
                  type="radio"
                  name="Evidence quality assessment"
                  value={profile.key}
                  checked={componentKeys.evidenceQualityAssessmentKey === profile.key}
                  onChange={() => setKey('evidenceQualityAssessmentKey', profile.key)}
                  style={{ marginTop: 2, flexShrink: 0 }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#1a1410' }}>{profile.name}</div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setQualityExpanded(prev => ({ ...prev, [profile.key]: !prev[profile.key] }))
                      }}
                      style={{ border: 'none', background: 'transparent', color: '#706050', cursor: 'pointer', fontSize: 13, fontWeight: 700, padding: '0 2px' }}
                      title={qualityExpanded[profile.key] ? 'Hide content' : 'Show content'}
                      aria-label={qualityExpanded[profile.key] ? 'Hide content' : 'Show content'}
                    >
                      {qualityExpanded[profile.key] ? '⌄' : '>'}
                    </button>
                  </div>
                  <div style={{ fontSize: 10, color: '#a09080' }}>{profile.description}</div>
                </div>
              </label>
              {qualityExpanded[profile.key] && (
                <pre style={{
                  margin: '8px 0 0',
                  padding: '8px 10px',
                  background: '#faf8f5',
                  border: '1px solid #e8e2db',
                  borderRadius: 6,
                  color: '#403830',
                  fontSize: 10,
                  lineHeight: 1.45,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                }}>
{`maxLength: ${profile.maxLength}
lengthWeight: ${profile.lengthWeight}
numberBonus: ${profile.numberBonus}
quoteBonus: ${profile.quoteBonus}
actionVerbBonus: ${profile.actionVerbBonus}`}
                </pre>
              )}
            </div>
          ))}
        </div>
      </div>

      <div style={{ borderTop: '1px solid #e0dbd4', paddingTop: 20 }}>
        <div style={{ ...label9, marginBottom: 16 }}>Prompt components — select one per category</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 32px' }}>
          <ComponentSelector label="Classification rules" options={CLASSIFICATION_RULES} selectedKey={componentKeys.rulesKey} onChange={key => setKey('rulesKey', key)} />
          <ComponentSelector label="Evidence instructions" options={EVIDENCE_INSTRUCTIONS} selectedKey={componentKeys.evidenceKey} onChange={key => setKey('evidenceKey', key)} />
          <ComponentSelector label="Extract prompt" options={EXTRACT_PROMPTS} selectedKey={componentKeys.extractKey} onChange={key => setKey('extractKey', key)} />
          <ComponentSelector label="Function level definitions" options={FN_DEFINITIONS} selectedKey={componentKeys.fnDefsKey} onChange={key => setKey('fnDefsKey', key)} />
        </div>
      </div>
    </div>
  )
}

// ─── Parsed roles panel ───────────────────────────────────────────────────────

function ParsedRolesPanel({ roles }) {
  if (!roles) return null
  const flagged = roles.filter(r => r.flagged)
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ ...label9, marginBottom: 10 }}>
        Parsed roles — {roles.length} found{flagged.length > 0 ? `, ${flagged.length} flagged` : ''}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {roles.map((r, i) => (
          <div key={i} style={{
            background: r.flagged ? '#fff5f5' : '#f5f2ee',
            border: `1px solid ${r.flagged ? '#fca5a5' : '#e0dbd4'}`,
            borderRadius: 4, padding: '6px 10px', fontSize: 11, minWidth: 160,
          }}>
            <div style={{ fontWeight: 700, color: r.flagged ? '#c04060' : '#1a1410' }}>{r.title}</div>
            <div style={{ color: '#706050', fontSize: 10 }}>{r.employer}</div>
            {r.flagged
              ? <div style={{ color: '#c04060', fontSize: 10, marginTop: 2 }}>! {r.flag_reason}</div>
              : <div style={{ color: '#a09080', fontSize: 10, marginTop: 2 }}>{r.start_raw} to {r.end_raw || 'Present'} · {r.months}mo</div>
            }
          </div>
        ))}
      </div>
    </div>
  )
}

function buildSupportingEvidenceByLabel(classifications, roles) {
  const byLabel = {}
  for (const row of Array.isArray(classifications) ? classifications : []) {
    const roleIndex = Number(row?.role_index)
    if (!Number.isFinite(roleIndex)) continue
    const role = Array.isArray(roles) ? roles[roleIndex] : null
    for (const label of Array.isArray(row?.labels) ? row.labels : []) {
      const labelName = (label?.name || '').trim()
      const evidence = (label?.evidence || '').trim()
      if (!labelName || !evidence) continue
      if (!byLabel[labelName]) byLabel[labelName] = []
      byLabel[labelName].push({
        role_index: roleIndex,
        role_title: role?.title || `Role ${roleIndex + 1}`,
        employer: role?.employer || '',
        evidence,
      })
    }
  }
  return byLabel
}

// ─── Role label table ─────────────────────────────────────────────────────────

function ResultColumn({ result, classifications, roles, loading, error, variant }) {
  const { label, accent } = variant
  const [showSupport, setShowSupport] = useState(false)
  const supportByLabel = buildSupportingEvidenceByLabel(classifications, roles)
  return (
    <div style={{ flex: 1, minWidth: 200, borderTop: `2px solid ${accent}`, paddingTop: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <div style={{ width: 9, height: 9, borderRadius: '50%', background: accent }} />
        <span style={{ fontSize: 11, fontWeight: 700, color: '#1a1410' }}>{label}</span>
      </div>
      {loading && <div style={{ color: '#a09080', fontSize: 12 }}>Classifying...</div>}
      {error   && <div style={{ background: '#fef2f2', border: '0.5px solid #fca5a5', borderRadius: 6, padding: '10px 12px', fontSize: 11, color: '#c04060' }}>{error}</div>}
      {result && !loading && (
        <div style={{ fontSize: 12, color: '#1a1410', lineHeight: 1.6 }}>
          <div style={{ marginBottom: 12 }}>
            <div style={{ ...label9, marginBottom: 4 }}>Summary</div>
            {result.summary}
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ ...label9, marginBottom: 4 }}>Strengths</div>
            <div style={{ color: '#706050' }}>{result.strengths}</div>
          </div>
          <div>
            <div style={{ ...label9, marginBottom: 8 }}>Function levels (canonical evidence)</div>
            {(result.functions || []).map((fn, i) => (
              <div key={i} style={{ paddingLeft: 10, borderLeft: `2px solid ${accent}`, marginBottom: 8 }}>
                <div style={{ fontWeight: 700 }}>
                  {seniority(fn.name, fn.months)}
                  <span style={{ fontWeight: 400, color: '#a09080', marginLeft: 6, fontSize: 11 }}>{m2y(fn.months)}y</span>
                </div>
                <div style={{ fontSize: 10, color: '#706050', marginTop: 2 }}>{fn.evidence}</div>
                {showSupport && (
                  <div style={{ marginTop: 6, border: '1px solid #ede8e2', borderRadius: 4, background: '#faf8f5', padding: '6px 8px' }}>
                    <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#a09080', marginBottom: 4 }}>
                      Supporting role evidence (diagnostic)
                    </div>
                    {(supportByLabel[fn.name] || []).length === 0 ? (
                      <div style={{ fontSize: 10, color: '#a09080' }}>No supporting role evidence rows for this label.</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {(supportByLabel[fn.name] || []).map((s, idx) => (
                          <div key={`${fn.name}-support-${idx}`} style={{ fontSize: 10, color: '#706050', lineHeight: 1.5 }}>
                            <strong style={{ color: '#1a1410' }}>{s.role_title}</strong>{s.employer ? ` (${s.employer})` : ''}: {s.evidence}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
            {(result.functions || []).length > 0 && (
              <button
                onClick={() => setShowSupport(s => !s)}
                style={{ marginTop: 6, border: '1px solid #d8d0c4', background: 'white', color: '#706050', borderRadius: 4, padding: '5px 8px', fontSize: 10, cursor: 'pointer' }}
              >
                {showSupport ? 'Hide supporting role evidence' : 'Show supporting role evidence (diagnostic)'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Results for one resume ───────────────────────────────────────────────────

function ResumeResult({ resume, runState }) {
  const { roles, classifications, results, loading, errors, activeVariants, saved, saveError, calibrationByRoleIndex } = runState
  const anyLoading = Object.values(loading).some(Boolean)

  return (
    <div style={{ marginBottom: 48 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#1a1410' }}>{resume.name}</div>
        {resume.tags?.map(tag => (
          <span key={tag} style={{ background: '#f5eaee', border: '1px solid #e8d0d8', borderRadius: 3, padding: '2px 8px', fontSize: 10, color: '#904060' }}>{tag}</span>
        ))}
        {!anyLoading && saved && (
          <span style={{ fontSize: 10, color: '#2a7a6a', marginLeft: 'auto' }}>Saved</span>
        )}
        {!anyLoading && saveError && (
          <span style={{ fontSize: 10, color: '#c04060', marginLeft: 'auto' }}>Save failed: {saveError}</span>
        )}
      </div>
      <ParsedRolesPanel roles={roles} />
      <RoleLabelDotTable
        roles={roles}
        classificationsByVariant={classifications}
        activeVariants={activeVariants}
        calibrationByRoleIndex={calibrationByRoleIndex}
      />
      <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
        {activeVariants.map(v => (
          <ResultColumn
            key={v.key}
            variant={v}
            result={results[v.key]}
            classifications={classifications[v.key]}
            roles={roles}
            loading={loading[v.key]}
            error={errors[v.key]}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ResearchRunAnalysis() {
  const [resumes,       setResumes]       = useState([])
  const [resumesLoading, setResumesLoading] = useState(true)
  const [selectedIds,   setSelectedIds]   = useState([])
  const [hasRun,        setHasRun]        = useState(false)
  const [notes,         setNotes]         = useState('')

  // Settings
  const [selectedModels,  setSelectedModels]  = useState(['sonnet_4_5', 'haiku_4_5'])
  const [blind,           setBlind]           = useState(false)
  const [componentKeys,   setComponentKeys]   = useState(DEFAULT_SETTINGS)

  // Per-resume run state: { [resumeId]: { roles, classifications, results, loading, errors, activeVariants, saved, saveError } }
  const [runStates, setRunStates] = useState({})

  useEffect(() => {
    supabase
      .from('research_resumes')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setResumes(data || [])
        setResumesLoading(false)
      })
  }, [])

  const resolveComponents = () => ({
    rules:    CLASSIFICATION_RULES.find(r => r.key === componentKeys.rulesKey),
    evidence: EVIDENCE_INSTRUCTIONS.find(e => e.key === componentKeys.evidenceKey),
    extract:  EXTRACT_PROMPTS.find(e => e.key === componentKeys.extractKey),
    fnDefs:   FN_DEFINITIONS.find(f => f.key === componentKeys.fnDefsKey),
    evidenceQualityAssessment: EVIDENCE_QUALITY_ASSESSMENTS.find(p => p.key === componentKeys.evidenceQualityAssessmentKey) || EVIDENCE_QUALITY_ASSESSMENTS[0],
  })

  const buildVariants = () =>
    selectedModels.map((modelKey, i) => {
      const modelDef = AVAILABLE_MODELS.find(m => m.key === modelKey)
      return {
        key:    `${modelKey}_${blind ? 'blind' : 'titled'}`,
        label:  `${modelDef.label}${blind ? ' — Blind' : ''}`,
        model:  modelDef.model,
        modelKey,
        accent: ACCENT_COLORS[i % ACCENT_COLORS.length],
        blind,
      }
    })

  const updateRunState = (resumeId, patchOrFn) => {
    setRunStates(prev => {
      const current = prev[resumeId] || {}
      const patch = typeof patchOrFn === 'function' ? patchOrFn(current) : patchOrFn
      return { ...prev, [resumeId]: { ...current, ...patch } }
    })
  }

  const fetchCalibrationByRoleIndex = async (resumeId) => {
    const { data, error } = await supabase
      .from('research_calibrations')
      .select('role_index, labels')
      .eq('resume_id', resumeId)

    if (error || !Array.isArray(data)) return {}

    return data.reduce((acc, row) => {
      const idx = Number(row?.role_index)
      if (!Number.isFinite(idx)) return acc
      acc[idx] = Array.isArray(row?.labels) ? row.labels : []
      return acc
    }, {})
  }

  const saveRunToSupabase = async (resumeId, parsedRoles, variantResults, components, variants) => {
    try {
      const settings = {
        models: variants.map(v => ({ key: v.key, model_string: v.model, blind: v.blind })),
        blind,
        rules_key:    componentKeys.rulesKey,
        evidence_key: componentKeys.evidenceKey,
        extract_key:  componentKeys.extractKey,
        fn_defs_key:  componentKeys.fnDefsKey,
        evidence_display_settings_key: componentKeys.evidenceDisplaySettingsKey,
        evidence_quality_assessment_key: componentKeys.evidenceQualityAssessmentKey,
        evidence_max_snippets: Number(componentKeys.evidenceMaxSnippets) || 2,
        evidence_joiner: String(componentKeys.evidenceJoiner ?? " and "),
      }

      const { data: run, error: runErr } = await supabase
        .from('research_runs')
        .insert({
          resume_id:             resumeId,
          parsed_roles_snapshot: parsedRoles,
          settings,
          notes: notes.trim() || null,
        })
        .select()
        .single()
      if (runErr) throw runErr

      const resultRows = Object.entries(variantResults)
        .filter(([, r]) => r)
        .map(([variantKey, r]) => {
          const variant = variants.find(v => v.key === variantKey)
          const modelDef = AVAILABLE_MODELS.find(m => m.key === variant?.modelKey)
          const variantLabel = [
            variant?.label || variantKey,
            CLASSIFICATION_RULES.find(x => x.key === componentKeys.rulesKey)?.name || componentKeys.rulesKey,
            EVIDENCE_INSTRUCTIONS.find(x => x.key === componentKeys.evidenceKey)?.name || componentKeys.evidenceKey,
            EXTRACT_PROMPTS.find(x => x.key === componentKeys.extractKey)?.name || componentKeys.extractKey,
            FN_DEFINITIONS.find(x => x.key === componentKeys.fnDefsKey)?.name || componentKeys.fnDefsKey,
            `Evidence display: ${componentKeys.evidenceDisplaySettingsKey}`,
            EVIDENCE_QUALITY_ASSESSMENTS.find(x => x.key === componentKeys.evidenceQualityAssessmentKey)?.name || componentKeys.evidenceQualityAssessmentKey,
            `max:${Number(componentKeys.evidenceMaxSnippets) || 2}`,
          ].join(" | ")
          return {
            run_id:          run.id,
            variant_key:     variantKey,
            model_string:    variant?.model || '',
            model_key:       variant?.modelKey || '',
            model_label:     modelDef?.label || '',
            blind_mode:      Boolean(variant?.blind),
            rules_key:       componentKeys.rulesKey,
            evidence_key:    componentKeys.evidenceKey,
            extract_key:     componentKeys.extractKey,
            fn_defs_key:     componentKeys.fnDefsKey,
            evidence_display_settings_key: componentKeys.evidenceDisplaySettingsKey,
            evidence_quality_assessment_key: componentKeys.evidenceQualityAssessmentKey,
            variant_label:   variantLabel,
            classifications: r.classifications || [],
            summary:         r.summary || '',
            strengths:       r.strengths || '',
            functions:       r.functions || [],
          }
        })

      if (resultRows.length > 0) {
        let { error: resultsErr } = await supabase
          .from('research_run_results')
          .insert(resultRows)
        if (resultsErr && /column|schema|variant_label|model_key|blind_mode|evidence_display_settings_key|evidence_quality_assessment_key/i.test(resultsErr.message || '')) {
          const legacyRows = resultRows.map(r => ({
            run_id: r.run_id,
            variant_key: r.variant_key,
            model_string: r.model_string,
            classifications: r.classifications,
            summary: r.summary,
            strengths: r.strengths,
            functions: r.functions,
          }))
          const legacyInsert = await supabase
            .from('research_run_results')
            .insert(legacyRows)
          resultsErr = legacyInsert.error
        }
        if (resultsErr) throw resultsErr
      }

      updateRunState(resumeId, { saved: true })
    } catch(e) {
      updateRunState(resumeId, { saveError: e.message || 'unknown error' })
    }
  }

  const runResume = async (resume, variants, components) => {
    const resumeId   = resume.id
    const parsedRoles = resume.parsed_roles
    const calibrationByRoleIndex = await fetchCalibrationByRoleIndex(resumeId)

    // Initialise state for this resume
    const initLoading = variants.reduce((acc, v) => ({ ...acc, [v.key]: true }), {})
    updateRunState(resumeId, {
      roles: parsedRoles,
      calibrationByRoleIndex,
      activeVariants: variants,
      classifications: {},
      results: {},
      loading: initLoading,
      errors: {},
      saved: false,
      saveError: null,
    })

    // Collect results as they come in so we can save once all are done
    const allClassifications = {}
    const allResults         = {}
    let   completedCount     = 0

    const onVariantComplete = async () => {
      completedCount++
      if (completedCount === variants.length) {
        // All variants done — save to Supabase
        const combined = {}
        variants.forEach(v => {
          combined[v.key] = {
            classifications: allClassifications[v.key] || [],
            ...(allResults[v.key] || {}),
          }
        })
        await saveRunToSupabase(resumeId, parsedRoles, combined, components, variants)
      }
    }

    await Promise.all(variants.map(async (variant) => {
      const { key, model, blind: isBlind } = variant
      try {
        const [classifs, summary] = await Promise.all([
          classifyRoles(parsedRoles, model, isBlind, components.rules, components.evidence, components.fnDefs),
          getSummary(resume.clean_text, model),
        ])
        const functions = aggregateLabels(
          parsedRoles,
          classifs,
          componentKeys.evidenceDisplaySettingsKey,
          componentKeys.evidenceQualityAssessmentKey,
          componentKeys.evidenceMaxSnippets,
          componentKeys.evidenceJoiner
        )

        allClassifications[key] = classifs
        allResults[key]         = { ...summary, functions }

        updateRunState(resumeId, prev => ({
          classifications: { ...(prev?.classifications || {}), [key]: classifs },
          results:         { ...(prev?.results || {}),         [key]: { ...summary, functions } },
          loading:         { ...(prev?.loading || {}),         [key]: false },
        }))
      } catch(e) {
        updateRunState(resumeId, prev => ({
          errors:  { ...(prev?.errors || {}),  [key]: e.message || 'Classification failed' },
          loading: { ...(prev?.loading || {}), [key]: false },
        }))
      } finally {
        await onVariantComplete()
      }
    }))
  }

  const runAll = async () => {
    if (!selectedIds.length || !selectedModels.length) return

    const components      = resolveComponents()
    const variants        = buildVariants()
    const selectedResumes = resumes.filter(r => selectedIds.includes(r.id))

    setHasRun(true)
    setRunStates({})

    // Run resumes sequentially to avoid hammering the API
    for (const resume of selectedResumes) {
      await runResume(resume, variants, components)
    }
  }

  const toggleResume = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])
  }

  const anyRunning = Object.values(runStates).some(s =>
    s?.loading && Object.values(s.loading).some(Boolean)
  )
  const canRun = selectedIds.length > 0 && selectedModels.length > 0 && !anyRunning

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: '#1a1410', marginBottom: 4 }}>Run Analysis</div>
        <div style={{ fontSize: 12, color: '#706050' }}>Select resumes and settings, then run.</div>
      </div>

      {/* Resume selector */}
      <div style={{ background: '#faf8f5', border: '1px solid #e0dbd4', borderRadius: 6, padding: '16px 20px', marginBottom: 20 }}>
        <div style={{ ...label9, marginBottom: 14 }}>Resumes</div>
        <ResumeSelector
          resumes={resumes}
          selectedIds={selectedIds}
          onToggle={toggleResume}
          onSelectAll={(ids) => setSelectedIds(prev => [...new Set([...prev, ...ids])])}
          onClearAll={() => setSelectedIds([])}
          loading={resumesLoading}
        />
      </div>

      {/* Settings */}
      <SettingsPanel
        selectedModels={selectedModels}
        setSelectedModels={setSelectedModels}
        blind={blind}
        setBlind={setBlind}
        componentKeys={componentKeys}
        setComponentKeys={setComponentKeys}
      />

      {/* Notes */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#1a1410', marginBottom: 6 }}>Run notes (optional)</div>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Describe what you're testing in this run..."
          style={{ width: '100%', height: 72, padding: '10px 14px', fontSize: 12, border: '1px solid #d8d0c4', borderRadius: 6, background: 'white', outline: 'none', resize: 'vertical', lineHeight: 1.6, fontFamily: 'inherit', color: '#1a1410', boxSizing: 'border-box' }}
        />
      </div>

      <button onClick={runAll} disabled={!canRun} style={{ ...primaryBtn(!canRun), marginBottom: 32 }}>
        {anyRunning ? 'Running...' : `Run ${selectedIds.length > 0 ? `${selectedIds.length} resume${selectedIds.length > 1 ? 's' : ''}` : ''} →`}
      </button>

      {!selectedIds.length && !anyRunning && (
        <div style={{ fontSize: 11, color: '#a09080', marginBottom: 16 }}>Select at least one resume to run.</div>
      )}
      {!selectedModels.length && (
        <div style={{ fontSize: 11, color: '#c04060', marginBottom: 16 }}>Select at least one model.</div>
      )}

      {/* Results */}
      {hasRun && resumes
        .filter(r => selectedIds.includes(r.id) && runStates[r.id])
        .map(resume => (
          <ResumeResult
            key={resume.id}
            resume={resume}
            runState={runStates[resume.id]}
          />
        ))
      }
    </div>
  )
}


