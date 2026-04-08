// src/pages/admin/ResearchResumeLibrary.jsx
// Resume Library — three views:
//   1. Library — list of saved resumes
//   2. Upload — paste or PDF, clean, parse, calibrate, tag, save
//   3. Detail — view a saved resume and its calibration

import { useState, useEffect, useRef } from "react"
import { supabase } from "../../lib/supabase.js"
import { EXTRACT_PROMPTS, ALL_FN_NAMES, processRole } from "../../lib/researchClassifier.js"
import * as pdfjsLib from "pdfjs-dist"
import pdfjsWorker from "pdfjs-dist/build/pdf.worker?url"

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker

const EXTRACT_PROMPT = EXTRACT_PROMPTS[0]

// ─── Styles ───────────────────────────────────────────────────────────────────

const label9 = { fontSize: 9, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: '#a09080' }

const btn = (active) => ({
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

const ghostBtn = {
  background: 'none', border: '1px solid #d8d0c4', fontSize: 11,
  padding: '6px 14px', borderRadius: 3, cursor: 'pointer', color: '#706050',
}

// ─── Tag input with autocomplete ──────────────────────────────────────────────

function TagInput({ tags, onChange, allTags }) {
  const [input, setInput] = useState('')
  const [suggestions, setSuggestions] = useState([])

  const handleInput = (val) => {
    setInput(val)
    if (val.trim()) {
      setSuggestions(allTags.filter(t =>
        t.toLowerCase().includes(val.toLowerCase()) && !tags.includes(t)
      ))
    } else {
      setSuggestions([])
    }
  }

  const addTag = (tag) => {
    const t = tag.trim()
    if (t && !tags.includes(t)) onChange([...tags, t])
    setInput('')
    setSuggestions([])
  }

  const removeTag = (tag) => onChange(tags.filter(t => t !== tag))

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '8px 10px', border: '1px solid #d8d0c4', borderRadius: 6, background: 'white', minHeight: 40 }}>
        {tags.map(tag => (
          <span key={tag} style={{ background: '#f5eaee', border: '1px solid #e8d0d8', borderRadius: 3, padding: '2px 8px', fontSize: 11, color: '#904060', display: 'flex', alignItems: 'center', gap: 4 }}>
            {tag}
            <span onClick={() => removeTag(tag)} style={{ cursor: 'pointer', fontWeight: 700, fontSize: 13, lineHeight: 1 }}>x</span>
          </span>
        ))}
        <input
          value={input}
          onChange={e => handleInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); if (input.trim()) addTag(input) }
            if (e.key === 'Backspace' && !input && tags.length) removeTag(tags[tags.length - 1])
          }}
          placeholder={tags.length ? '' : 'Type to add tags...'}
          style={{ border: 'none', outline: 'none', fontSize: 11, fontFamily: 'inherit', flex: 1, minWidth: 120, color: '#1a1410' }}
        />
      </div>
      {suggestions.length > 0 && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid #d8d0c4', borderRadius: 6, zIndex: 10, marginTop: 2, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
          {suggestions.map(s => (
            <div
              key={s}
              onClick={() => addTag(s)}
              style={{ padding: '8px 12px', fontSize: 11, cursor: 'pointer', color: '#1a1410' }}
              onMouseEnter={e => e.target.style.background = '#faf8f5'}
              onMouseLeave={e => e.target.style.background = 'white'}
            >{s}</div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Calibration dot grid ─────────────────────────────────────────────────────

function CalibrationGrid({ roles, calibration, onChange, readOnly }) {
  const [expandedRole, setExpandedRole] = useState(null)
  const visibleRoles = roles.filter(r => !r.flagged)

  const toggle = (roleIdx, fn) => {
    if (readOnly) return
    const current = calibration[roleIdx] || []
    const next = current.includes(fn)
      ? current.filter(f => f !== fn)
      : [...current, fn]
    onChange({ ...calibration, [roleIdx]: next })
  }

  const thStyle = {
    padding: '6px 10px', fontSize: 9, fontWeight: 700, letterSpacing: '.1em',
    textTransform: 'uppercase', color: '#a09080', borderBottom: '1px solid #ede8e2',
    whiteSpace: 'nowrap', textAlign: 'left', background: '#faf8f5',
  }
  const tdStyle = { padding: '6px 10px', fontSize: 11, borderBottom: '1px solid #ede8e2', verticalAlign: 'middle' }

  return (
    <div>
      {!readOnly && (
        <div style={{ fontSize: 11, color: '#706050', marginBottom: 12, lineHeight: 1.6, background: '#f5f2ee', border: '1px solid #e0dbd4', borderRadius: 6, padding: '10px 14px' }}>
          Set the correct function level labels for each role. These will be used as ground truth for evaluating model accuracy on all future runs. Click a role title to see its full description. <strong>Labels are permanent once saved and cannot be edited from the results screen.</strong>
        </div>
      )}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', border: '1px solid #ede8e2', borderRadius: 6, overflow: 'hidden', minWidth: '100%' }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, minWidth: 180 }}>Role</th>
              <th style={{ ...thStyle, minWidth: 40 }}>Mo</th>
              {ALL_FN_NAMES.map(fn => (
                <th key={fn} style={{ ...thStyle, minWidth: 90 }}>
                  {fn.replace('Processing ', 'Proc. ').replace('Strategic ', 'Strat. ')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleRoles.map((role, i) => {
              const roleIdx = roles.indexOf(role)
              const selected = calibration[roleIdx] || []
              const isExpanded = expandedRole === roleIdx
              return (
                <>
                  <tr key={i} style={{ background: i % 2 === 0 ? 'white' : '#faf8f5' }}>
                    <td style={tdStyle}>
                      <div
                        onClick={() => setExpandedRole(isExpanded ? null : roleIdx)}
                        style={{ fontWeight: 700, fontSize: 11, cursor: 'pointer', color: '#904060', textDecoration: 'underline', textDecorationStyle: 'dotted' }}
                        title="Click to view full role description"
                      >
                        {role.title}
                      </div>
                      <div style={{ color: '#a09080', fontSize: 10 }}>{role.employer}</div>
                    </td>
                    <td style={{ ...tdStyle, color: '#a09080', fontSize: 10 }}>{role.months}</td>
                    {ALL_FN_NAMES.map(fn => (
                      <td key={fn} style={{ ...tdStyle, textAlign: 'center' }}>
                        <span
                          onClick={() => toggle(roleIdx, fn)}
                          title={readOnly ? fn : `Toggle ${fn}`}
                          style={{
                            display: 'inline-block', width: 10, height: 10, borderRadius: '50%',
                            background: selected.includes(fn) ? '#1a1410' : '#e0dbd4',
                            cursor: readOnly ? 'default' : 'pointer',
                            transition: 'background 0.1s',
                          }}
                        />
                      </td>
                    ))}
                  </tr>
                  {isExpanded && (
                    <tr key={`${i}-expanded`} style={{ background: '#fdf9f6' }}>
                      <td colSpan={2 + ALL_FN_NAMES.length} style={{ padding: '12px 16px', borderBottom: '1px solid #ede8e2' }}>
                        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: '#a09080', marginBottom: 8 }}>
                          {role.title} — {role.employer} — {role.start_raw} to {role.end_raw || 'Present'}
                        </div>
                        <pre style={{ fontSize: 11, color: '#1a1410', lineHeight: 1.7, whiteSpace: 'pre-wrap', margin: 0, fontFamily: 'inherit' }}>
                          {role.text || 'No description available.'}
                        </pre>
                      </td>
                    </tr>
                  )}
                </>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Parsed roles panel ───────────────────────────────────────────────────────

function ParsedRolesPanel({ roles }) {
  if (!roles) return null
  const flagged = roles.filter(r => r.flagged)
  return (
    <div style={{ marginBottom: 20 }}>
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
              : <div style={{ color: '#a09080', fontSize: 10, marginTop: 2 }}>{r.start_raw} to {r.end_raw || 'Present'} - {r.months}mo</div>
            }
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Upload view ──────────────────────────────────────────────────────────────

function UploadView({ onSaved, onCancel, allTags }) {
  const [mode, setMode]               = useState('paste')
  const [rawText, setRawText]         = useState('')
  const [pdfFilename, setPdfFilename] = useState('')
  const [parsing, setParsing]         = useState(false)
  const [parseError, setParseError]   = useState('')
  const [roles, setRoles]             = useState(null)
  const [calibration, setCalibration] = useState({})
  const [name, setName]               = useState('')
  const [tags, setTags]               = useState([])
  const [saving, setSaving]           = useState(false)
  const [saveError, setSaveError]     = useState('')
  const fileRef = useRef()

  const handlePDF = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setParseError('')
    setPdfFilename(file.name)
    try {
      const arrayBuffer = await file.arrayBuffer()
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
      const pages = await Promise.all(
        Array.from({ length: pdf.numPages }, (_, i) =>
          pdf.getPage(i + 1)
            .then(page => page.getTextContent())
            .then(tc => tc.items.map(item => item.str).join(' '))
        )
      )
      const text = pages.join('\n\n').trim()
      if (!text) throw new Error('No text found in PDF — try pasting the text instead')
      setRawText(text)
    } catch(err) {
      setParseError('PDF extraction failed: ' + (err.message || 'unknown error'))
      setPdfFilename('')
    }
  }

  const handleParse = async () => {
    if (!rawText.trim()) return
    setParsing(true)
    setParseError('')
    setRoles(null)
    setCalibration({})
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          max_tokens: 4000,
          system: EXTRACT_PROMPT.content,
          messages: [{ role: 'user', content: 'Extract all roles:\n\n' + rawText }],
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error.message)
      const raw = (data.content || []).map(b => b.text || '').join('').replace(/```json|```/g, '').trim()
      const rawRoles = JSON.parse(raw)
      setRoles(rawRoles.map(processRole))
    } catch(e) {
      setParseError('Parsing failed: ' + (e.message || 'unknown error'))
    } finally {
      setParsing(false)
    }
  }

  const handleSave = async () => {
    if (!roles || !name.trim()) return
    setSaving(true)
    setSaveError('')
    try {
      const { data: resume, error: resumeErr } = await supabase
        .from('research_resumes')
        .insert({ name: name.trim(), clean_text: rawText, parsed_roles: roles, tags })
        .select()
        .single()
      if (resumeErr) throw resumeErr

      const calibRows = Object.entries(calibration)
        .filter(([, labels]) => labels.length > 0)
        .map(([roleIndex, labels]) => ({
          resume_id: resume.id,
          role_index: parseInt(roleIndex),
          labels,
        }))

      if (calibRows.length > 0) {
        const { error: calibErr } = await supabase
          .from('research_calibrations')
          .insert(calibRows)
        if (calibErr) throw calibErr
      }

      onSaved(resume)
    } catch(e) {
      setSaveError('Save failed: ' + (e.message || 'unknown error'))
    } finally {
      setSaving(false)
    }
  }

  const canParse = rawText.trim() && !parsing
  const canSave  = roles && name.trim() && !saving

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <button onClick={onCancel} style={ghostBtn}>Back</button>
        <div style={{ fontSize: 22, fontWeight: 700, color: '#1a1410' }}>Upload Resume</div>
      </div>

      {/* Step 1 */}
      <div style={{ background: '#faf8f5', border: '1px solid #e0dbd4', borderRadius: 6, padding: '16px 20px', marginBottom: 20 }}>
        <div style={{ ...label9, marginBottom: 14 }}>Step 1 — Paste text or upload PDF</div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          <button onClick={() => setMode('paste')} style={btn(mode === 'paste')}>Paste text</button>
          <button onClick={() => setMode('pdf')} style={btn(mode === 'pdf')}>Upload PDF</button>
        </div>

        {mode === 'paste' ? (
          <textarea
            value={rawText}
            onChange={e => setRawText(e.target.value)}
            placeholder="Paste resume text here..."
            style={{ width: '100%', height: 200, padding: '12px 14px', fontSize: 12, border: '1px solid #d8d0c4', borderRadius: 6, background: 'white', outline: 'none', resize: 'vertical', lineHeight: 1.7, fontFamily: 'inherit', color: '#1a1410', boxSizing: 'border-box' }}
          />
        ) : (
          <div>
            <input ref={fileRef} type="file" accept=".pdf" onChange={handlePDF} style={{ display: 'none' }} />
            <button onClick={() => fileRef.current.click()} style={ghostBtn}>Choose PDF file</button>
            {pdfFilename && !parseError && (
              <div style={{ fontSize: 11, color: '#2a7a6a', marginTop: 8 }}>
                {pdfFilename} — {rawText.length} characters extracted
              </div>
            )}
          </div>
        )}

        {parseError && (
          <div style={{ background: '#fef2f2', border: '0.5px solid #fca5a5', borderRadius: 6, padding: '10px 12px', fontSize: 11, color: '#c04060', marginTop: 10 }}>{parseError}</div>
        )}

        <button onClick={handleParse} disabled={!canParse} style={{ ...primaryBtn(!canParse), marginTop: 14 }}>
          {parsing ? 'Parsing...' : 'Parse roles'}
        </button>
      </div>

      {/* Step 2 — Calibration */}
      {roles && (
        <div style={{ background: '#faf8f5', border: '1px solid #e0dbd4', borderRadius: 6, padding: '16px 20px', marginBottom: 20 }}>
          <div style={{ ...label9, marginBottom: 14 }}>Step 2 — Review and calibrate</div>
          <ParsedRolesPanel roles={roles} />
          <CalibrationGrid roles={roles} calibration={calibration} onChange={setCalibration} readOnly={false} />
        </div>
      )}

      {/* Step 3 — Name, tags, save */}
      {roles && (
        <div style={{ background: '#faf8f5', border: '1px solid #e0dbd4', borderRadius: 6, padding: '16px 20px', marginBottom: 20 }}>
          <div style={{ ...label9, marginBottom: 14 }}>Step 3 — Name and tag this resume</div>

          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#1a1410', marginBottom: 6 }}>Name</div>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Anna K — Senior Ops"
              style={{ width: '100%', padding: '10px 14px', fontSize: 12, border: '1px solid #d8d0c4', borderRadius: 6, outline: 'none', fontFamily: 'inherit', color: '#1a1410', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#1a1410', marginBottom: 6 }}>Industry tags</div>
            <TagInput tags={tags} onChange={setTags} allTags={allTags} />
          </div>

          {saveError && (
            <div style={{ background: '#fef2f2', border: '0.5px solid #fca5a5', borderRadius: 6, padding: '10px 12px', fontSize: 11, color: '#c04060', marginBottom: 14 }}>{saveError}</div>
          )}

          <button onClick={handleSave} disabled={!canSave} style={primaryBtn(!canSave)}>
            {saving ? 'Saving...' : 'Save to library'}
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Detail view ──────────────────────────────────────────────────────────────

function DetailView({ resume, calibrations, onBack }) {
  const calMap = calibrations.reduce((acc, c) => {
    acc[c.role_index] = c.labels
    return acc
  }, {})

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <button onClick={onBack} style={ghostBtn}>Back</button>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#1a1410' }}>{resume.name}</div>
          <div style={{ fontSize: 11, color: '#a09080', marginTop: 2 }}>
            {resume.id.slice(0, 8).toUpperCase()} · {new Date(resume.created_at).toLocaleDateString()}
            {resume.tags?.length > 0 && <span> · {resume.tags.join(', ')}</span>}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
        <div style={{ background: '#faf8f5', border: '1px solid #e0dbd4', borderRadius: 6, padding: '16px 20px' }}>
          <div style={{ ...label9, marginBottom: 12 }}>Clean text</div>
          <pre style={{ fontSize: 11, color: '#1a1410', lineHeight: 1.7, whiteSpace: 'pre-wrap', margin: 0, fontFamily: 'inherit', maxHeight: 400, overflowY: 'auto' }}>
            {resume.clean_text}
          </pre>
        </div>
        <div>
          <ParsedRolesPanel roles={resume.parsed_roles} />
        </div>
      </div>

      <div style={{ background: '#faf8f5', border: '1px solid #e0dbd4', borderRadius: 6, padding: '16px 20px' }}>
        <div style={{ ...label9, marginBottom: 14 }}>Calibration labels (read only)</div>
        <CalibrationGrid roles={resume.parsed_roles} calibration={calMap} onChange={() => {}} readOnly={true} />
      </div>
    </div>
  )
}

// ─── Library view ─────────────────────────────────────────────────────────────

function LibraryView({ resumes, onUpload, onSelect }) {
  const [tagFilter, setTagFilter] = useState('')

  const filtered = tagFilter
    ? resumes.filter(r => r.tags?.some(t => t.toLowerCase().includes(tagFilter.toLowerCase())))
    : resumes

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: '#1a1410' }}>Resume Library</div>
        <button onClick={onUpload} style={primaryBtn(false)}>+ Upload resume</button>
      </div>

      {resumes.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <input
            value={tagFilter}
            onChange={e => setTagFilter(e.target.value)}
            placeholder="Filter by tag..."
            style={{ padding: '8px 12px', fontSize: 12, border: '1px solid #d8d0c4', borderRadius: 6, outline: 'none', fontFamily: 'inherit', color: '#1a1410', width: 240 }}
          />
        </div>
      )}

      {filtered.length === 0 ? (
        <div style={{ fontSize: 12, color: '#a09080' }}>
          {resumes.length === 0 ? 'No resumes saved yet. Upload one to get started.' : 'No resumes match that tag.'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(r => (
            <div
              key={r.id}
              onClick={() => onSelect(r)}
              style={{ background: 'white', border: '1px solid #e0dbd4', borderRadius: 6, padding: '12px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
              onMouseEnter={e => e.currentTarget.style.background = '#faf8f5'}
              onMouseLeave={e => e.currentTarget.style.background = 'white'}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: 12, color: '#1a1410' }}>{r.name}</div>
                <div style={{ fontSize: 10, color: '#a09080', marginTop: 2 }}>
                  {r.id.slice(0, 8).toUpperCase()} · {new Date(r.created_at).toLocaleDateString()}
                  {r.parsed_roles?.length > 0 && ` · ${r.parsed_roles.filter(p => !p.flagged).length} roles`}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                {r.tags?.map(tag => (
                  <span key={tag} style={{ background: '#f5eaee', border: '1px solid #e8d0d8', borderRadius: 3, padding: '2px 8px', fontSize: 10, color: '#904060' }}>{tag}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ResearchResumeLibrary() {
  const [view, setView]                         = useState('library')
  const [resumes, setResumes]                   = useState([])
  const [selectedResume, setSelectedResume]     = useState(null)
  const [selectedCalibrations, setSelectedCalibrations] = useState([])
  const [loading, setLoading]                   = useState(true)
  const [error, setError]                       = useState('')

  const allTags = [...new Set(resumes.flatMap(r => r.tags || []))]

  const fetchResumes = async () => {
    setLoading(true)
    setError('')
    const { data, error } = await supabase
      .from('research_resumes')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) setError('Failed to load resumes: ' + error.message)
    else setResumes(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchResumes() }, [])

  const handleSelect = async (resume) => {
    const { data: calibs } = await supabase
      .from('research_calibrations')
      .select('*')
      .eq('resume_id', resume.id)
    setSelectedResume(resume)
    setSelectedCalibrations(calibs || [])
    setView('detail')
  }

  const handleSaved = () => {
    fetchResumes()
    setView('library')
  }

  if (loading) return <div style={{ fontSize: 12, color: '#a09080' }}>Loading...</div>
  if (error)   return <div style={{ fontSize: 12, color: '#c04060' }}>{error}</div>

  if (view === 'upload') {
    return <UploadView onSaved={handleSaved} onCancel={() => setView('library')} allTags={allTags} />
  }

  if (view === 'detail' && selectedResume) {
    return <DetailView resume={selectedResume} calibrations={selectedCalibrations} onBack={() => setView('library')} />
  }

  return <LibraryView resumes={resumes} onUpload={() => setView('upload')} onSelect={handleSelect} />
}
