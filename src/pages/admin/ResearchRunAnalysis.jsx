// src/pages/admin/ResearchRunAnalysis.jsx
// Run Analysis page — select models, prompt components, blind mode, run classifier,
// view role-label dot grid and result columns.

import { useState } from "react"
import {
  AVAILABLE_MODELS, CLASSIFICATION_RULES, EVIDENCE_INSTRUCTIONS,
  EXTRACT_PROMPTS, FN_DEFINITIONS, DEFAULT_SETTINGS, ALL_FN_NAMES,
  extractRoles, classifyRoles, getSummary, aggregateLabels,
  processRole, m2y, seniority,
} from "../../lib/researchClassifier.js"

// ─── Accent colors ────────────────────────────────────────────────────────────

const ACCENT_COLORS = ['#904060','#3a6aaa','#c07030','#2a7a6a','#7a3aaa','#aa6a2a','#3aaa6a','#aa3a3a']

// ─── Parsed roles panel ───────────────────────────────────────────────────────

function ParsedRoles({ roles, loading }) {
  if (loading) return <div style={{ color: '#a09080', fontSize: 12, marginBottom: 24 }}>Parsing resume...</div>
  if (!roles) return null

  const flagged = roles.filter(r => r.flagged)
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: '#a09080', marginBottom: 10 }}>
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
            {r.flagged ? (
              <div style={{ color: '#c04060', fontSize: 10, marginTop: 2 }}>⚠ {r.flag_reason}</div>
            ) : (
              <div style={{ color: '#a09080', fontSize: 10, marginTop: 2 }}>
                {r.start_raw} → {r.end_raw || 'Present'} · {r.months}mo
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Role label table ─────────────────────────────────────────────────────────

function RoleLabelTable({ roles, classifications, activeVariants }) {
  if (!roles || !activeVariants.length) return null
  if (!activeVariants.some(v => classifications[v.key])) return null

  const visibleRoles = roles.filter(r => !r.flagged)

  const labelSet = (classifs, roleIdx) => {
    if (!classifs) return new Set()
    const entry = classifs.find(c => c.role_index === roleIdx)
    return new Set((entry?.labels || []).map(l => l.name))
  }

  const thStyle = {
    padding: '6px 10px', fontSize: 9, fontWeight: 700, letterSpacing: '.1em',
    textTransform: 'uppercase', color: '#a09080', borderBottom: '1px solid #ede8e2',
    whiteSpace: 'nowrap', textAlign: 'left', background: '#faf8f5',
  }
  const tdStyle = { padding: '6px 10px', fontSize: 11, borderBottom: '1px solid #ede8e2', verticalAlign: 'middle' }
  const dotStyle = (present, accent) => ({
    display: 'inline-block', width: 7, height: 7, borderRadius: '50%',
    background: present ? accent : '#e0dbd4',
  })

  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: '#a09080', marginBottom: 10 }}>
        Role-level label assignments
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', border: '1px solid #ede8e2', borderRadius: 6, overflow: 'hidden', minWidth: '100%' }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, minWidth: 180 }}>Role</th>
              <th style={{ ...thStyle, minWidth: 40, color: '#706050' }}>Mo</th>
              {ALL_FN_NAMES.map(fn => (
                <th key={fn} style={{ ...thStyle, minWidth: 100 }}>
                  {fn.replace('Processing ', 'Proc. ').replace('Strategic ', 'Strat. ')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleRoles.map((role, i) => {
              const sets = activeVariants.reduce((acc, v) => {
                acc[v.key] = labelSet(classifications[v.key], i)
                return acc
              }, {})
              return (
                <tr key={i} style={{ background: i % 2 === 0 ? 'white' : '#faf8f5' }}>
                  <td style={tdStyle}>
                    <div style={{ fontWeight: 700, fontSize: 11 }}>{role.title}</div>
                    <div style={{ color: '#a09080', fontSize: 10 }}>{role.employer}</div>
                  </td>
                  <td style={{ ...tdStyle, color: '#a09080', fontSize: 10 }}>{role.months}</td>
                  {ALL_FN_NAMES.map(fn => (
                    <td key={fn} style={{ ...tdStyle, textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: 3, justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
                        {activeVariants.map(v => (
                          <span key={v.key} title={v.label} style={dotStyle(sets[v.key]?.has(fn), v.accent)} />
                        ))}
                      </div>
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
        <div style={{ fontSize: 10, color: '#a09080', marginTop: 6, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {activeVariants.map(v => (
            <span key={v.key}>
              <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: v.accent, marginRight: 4 }} />
              {v.label}
            </span>
          ))}
          <span>
            <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: '#e0dbd4', marginRight: 4 }} />
            Not assigned
          </span>
        </div>
      </div>
    </div>
  )
}

// ─── Result column ────────────────────────────────────────────────────────────

function ResultColumn({ result, loading, error, variant }) {
  const { label, accent } = variant
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
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: '#a09080', marginBottom: 4 }}>Summary</div>
            {result.summary}
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: '#a09080', marginBottom: 4 }}>Strengths</div>
            <div style={{ color: '#706050' }}>{result.strengths}</div>
          </div>
          <div>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: '#a09080', marginBottom: 8 }}>Function levels</div>
            {(result.functions || []).map((fn, i) => (
              <div key={i} style={{ paddingLeft: 10, borderLeft: `2px solid ${accent}`, marginBottom: 8 }}>
                <div style={{ fontWeight: 700 }}>
                  {seniority(fn.name, fn.months)}
                  <span style={{ fontWeight: 400, color: '#a09080', marginLeft: 6, fontSize: 11 }}>{m2y(fn.months)}y</span>
                </div>
                <div style={{ fontSize: 10, color: '#706050', marginTop: 2 }}>{fn.evidence}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Component selector ───────────────────────────────────────────────────────

function ComponentSelector({ label, options, selectedKey, onChange }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#1a1410', marginBottom: 8 }}>{label}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {options.map(opt => (
          <label key={opt.key} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer' }}>
            <input
              type="radio"
              name={label}
              value={opt.key}
              checked={selectedKey === opt.key}
              onChange={() => onChange(opt.key)}
              style={{ marginTop: 2, flexShrink: 0 }}
            />
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: opt.content.startsWith('PLACEHOLDER') ? '#a09080' : '#1a1410' }}>
                {opt.name}
              </div>
              <div style={{ fontSize: 10, color: '#a09080' }}>{opt.description}</div>
            </div>
          </label>
        ))}
      </div>
    </div>
  )
}

// ─── Settings panel ───────────────────────────────────────────────────────────

function SettingsPanel({ selectedModels, setSelectedModels, blind, setBlind, componentKeys, setComponentKeys }) {
  const toggle = (key) => {
    setSelectedModels(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    )
  }

  const setKey = (component, key) => {
    setComponentKeys(prev => ({ ...prev, [component]: key }))
  }

  return (
    <div style={{ background: '#faf8f5', border: '1px solid #e0dbd4', borderRadius: 6, padding: '16px 20px', marginBottom: 24 }}>
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: '#a09080', marginBottom: 16 }}>
        Run settings
      </div>

      {/* Model selection */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#1a1410', marginBottom: 8 }}>Models</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {AVAILABLE_MODELS.map(m => {
            const selected = selectedModels.includes(m.key)
            return (
              <button
                key={m.key}
                onClick={() => toggle(m.key)}
                title={m.price}
                style={{
                  padding: '4px 10px', fontSize: 11, borderRadius: 3, cursor: 'pointer',
                  border: `1px solid ${selected ? '#904060' : '#d8d0c4'}`,
                  background: selected ? '#f5eaee' : 'white',
                  color: selected ? '#904060' : '#706050',
                  fontWeight: selected ? 700 : 400,
                }}
              >
                {m.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Blind mode */}
      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#1a1410' }}>Blind mode</div>
        <button
          onClick={() => setBlind(b => !b)}
          style={{
            padding: '4px 10px', fontSize: 11, borderRadius: 3, cursor: 'pointer',
            border: `1px solid ${blind ? '#904060' : '#d8d0c4'}`,
            background: blind ? '#f5eaee' : 'white',
            color: blind ? '#904060' : '#706050',
            fontWeight: blind ? 700 : 400,
          }}
        >
          {blind ? 'On — title + employer hidden' : 'Off — titled'}
        </button>
      </div>

      {/* Prompt component selectors — 2 column grid */}
      <div style={{ borderTop: '1px solid #e0dbd4', paddingTop: 16 }}>
        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: '#a09080', marginBottom: 14 }}>
          Prompt components — select one per category
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 32px' }}>
          <ComponentSelector
            label="Classification rules"
            options={CLASSIFICATION_RULES}
            selectedKey={componentKeys.rulesKey}
            onChange={key => setKey('rulesKey', key)}
          />
          <ComponentSelector
            label="Evidence instructions"
            options={EVIDENCE_INSTRUCTIONS}
            selectedKey={componentKeys.evidenceKey}
            onChange={key => setKey('evidenceKey', key)}
          />
          <ComponentSelector
            label="Extract prompt"
            options={EXTRACT_PROMPTS}
            selectedKey={componentKeys.extractKey}
            onChange={key => setKey('extractKey', key)}
          />
          <ComponentSelector
            label="Function level definitions"
            options={FN_DEFINITIONS}
            selectedKey={componentKeys.fnDefsKey}
            onChange={key => setKey('fnDefsKey', key)}
          />
        </div>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ResearchRunAnalysis() {
  const [resumeText,   setResumeText]   = useState('')
  const [roles,        setRoles]        = useState(null)
  const [parseLoading, setParseLoading] = useState(false)
  const [parseError,   setParseError]   = useState('')
  const [hasRun,       setHasRun]       = useState(false)
  const [activeVariants, setActiveVariants] = useState([])

  // Settings
  const [selectedModels,  setSelectedModels]  = useState(['sonnet_4', 'haiku_4_5'])
  const [blind,           setBlind]           = useState(false)
  const [componentKeys,   setComponentKeys]   = useState(DEFAULT_SETTINGS)

  // Per-variant state — keyed by variantKey
  const [results,         setResults]         = useState({})
  const [classifications, setClassifications] = useState({})
  const [loading,         setLoading]         = useState({})
  const [errors,          setErrors]          = useState({})

  // Resolve selected component objects from keys
  const resolveComponents = () => ({
    rules:    CLASSIFICATION_RULES.find(r => r.key === componentKeys.rulesKey),
    evidence: EVIDENCE_INSTRUCTIONS.find(e => e.key === componentKeys.evidenceKey),
    extract:  EXTRACT_PROMPTS.find(e => e.key === componentKeys.extractKey),
    fnDefs:   FN_DEFINITIONS.find(f => f.key === componentKeys.fnDefsKey),
  })

  const buildVariants = () =>
    selectedModels.map((modelKey, i) => {
      const modelDef = AVAILABLE_MODELS.find(m => m.key === modelKey)
      return {
        key:    `${modelKey}_${blind ? 'blind' : 'titled'}`,
        label:  `${modelDef.label}${blind ? ' — Blind' : ''}`,
        model:  modelDef.model,
        accent: ACCENT_COLORS[i % ACCENT_COLORS.length],
        blind,
      }
    })

  const runVariant = async (variant, parsedRoles, components) => {
    const { key, model, blind: isBlind } = variant
    setLoading(l => ({ ...l, [key]: true }))
    setErrors(e  => ({ ...e,  [key]: '' }))
    setResults(r => ({ ...r,  [key]: null }))
    try {
      const [classifs, summary] = await Promise.all([
        classifyRoles(parsedRoles, model, isBlind, components.rules, components.evidence, components.fnDefs),
        getSummary(resumeText, model),
      ])
      const functions = aggregateLabels(parsedRoles, classifs)
      setClassifications(c => ({ ...c, [key]: classifs }))
      setResults(r => ({ ...r, [key]: { ...summary, functions } }))
    } catch(e) {
      setErrors(err => ({ ...err, [key]: e.message || 'Classification failed' }))
    } finally {
      setLoading(l => ({ ...l, [key]: false }))
    }
  }

  const runAll = async () => {
    if (!resumeText.trim() || !selectedModels.length) return

    const components = resolveComponents()
    const variants   = buildVariants()

    setActiveVariants(variants)
    setHasRun(true)
    setParseLoading(true)
    setParseError('')
    setRoles(null)
    setResults({})
    setClassifications({})
    setLoading({})
    setErrors({})

    let parsedRoles
    try {
      const rawRoles = await extractRoles(resumeText, components.extract)
      parsedRoles = rawRoles.map(processRole)
      setRoles(parsedRoles)
    } catch(e) {
      setParseError('Parsing failed: ' + (e.message || 'unknown error'))
      setParseLoading(false)
      return
    }
    setParseLoading(false)
    variants.forEach(v => runVariant(v, parsedRoles, components))
  }

  const anyLoading = parseLoading || Object.values(loading).some(Boolean)
  const canRun     = resumeText.trim() && selectedModels.length > 0 && !anyLoading

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: '#1a1410', marginBottom: 4 }}>Run Analysis</div>
        <div style={{ fontSize: 12, color: '#706050' }}>Select models and prompt components, paste a resume, run.</div>
      </div>

      <SettingsPanel
        selectedModels={selectedModels}
        setSelectedModels={setSelectedModels}
        blind={blind}
        setBlind={setBlind}
        componentKeys={componentKeys}
        setComponentKeys={setComponentKeys}
      />

      <textarea
        value={resumeText}
        onChange={e => setResumeText(e.target.value)}
        placeholder="Paste resume text here..."
        style={{ width: '100%', height: 200, padding: '12px 14px', fontSize: 12, border: '1px solid #d8d0c4', borderRadius: 6, background: 'white', outline: 'none', resize: 'vertical', lineHeight: 1.7, fontFamily: 'inherit', color: '#1a1410', marginBottom: 14, boxSizing: 'border-box' }}
      />

      <button
        onClick={runAll}
        disabled={!canRun}
        style={{ background: '#904060', color: '#fff', fontSize: 12, fontWeight: 700, padding: '10px 24px', borderRadius: 3, border: 'none', cursor: canRun ? 'pointer' : 'not-allowed', marginBottom: 32, opacity: canRun ? 1 : 0.5 }}
      >
        {anyLoading ? 'Running...' : 'Run →'}
      </button>

      {!selectedModels.length && (
        <div style={{ fontSize: 11, color: '#c04060', marginBottom: 16 }}>Select at least one model to run.</div>
      )}

      {parseError && (
        <div style={{ background: '#fef2f2', border: '0.5px solid #fca5a5', borderRadius: 6, padding: '10px 12px', fontSize: 11, color: '#c04060', marginBottom: 16 }}>{parseError}</div>
      )}

      {hasRun && (
        <>
          <ParsedRoles roles={roles} loading={parseLoading} />
          <RoleLabelTable roles={roles} classifications={classifications} activeVariants={activeVariants} />
          <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
            {activeVariants.map(v => (
              <ResultColumn
                key={v.key}
                variant={v}
                result={results[v.key]}
                loading={loading[v.key]}
                error={errors[v.key]}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
