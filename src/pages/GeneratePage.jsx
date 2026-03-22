// src/pages/GeneratePage.jsx
// The card generation page. Manages two states:
//   State 1 — resume input
//   State 2 — review + theme picker + save options

import { useState } from 'react'
import { classifyResume } from '../lib/classifier'
import Card from '../components/Card'
import ThemePicker from '../components/ThemePicker'
import SaveOptions from '../components/SaveOptions'
import ReviewPanel from '../components/ReviewPanel'

// ─── Ghost card (State 1 placeholder) ────────────────────────────────────────

function GhostCard() {
  const bar = (w = '100%') => (
    <div style={{ height: 8, background: '#404850', borderRadius: 2, marginBottom: 5, width: w }} />
  )
  const bodyBar = (w = '100%') => (
    <div style={{ height: 20, background: '#ede8e0', borderRadius: 3, marginBottom: 5, width: w }} />
  )
  return (
    <div style={{ background: 'white', borderRadius: 8, border: '0.5px solid #d8d0c4', overflow: 'hidden', opacity: 0.35 }}>
      <div style={{ background: '#2c3038', padding: '14px 16px' }}>
        <div style={{ fontSize: 7, fontWeight: 700, letterSpacing: '.14em', color: '#904060', marginBottom: 8 }}>RENSUME · TAXONOMY PROFILE</div>
        {bar()} {bar('60%')}
      </div>
      <div style={{ height: 2, background: '#904060' }} />
      <div style={{ padding: '12px 16px' }}>
        <div style={{ height: 6, background: '#e0d8d0', borderRadius: 2, width: '35%', marginBottom: 8 }} />
        {bodyBar()} {bodyBar('70%')}
        <div style={{ height: 6, background: '#e0d8d0', borderRadius: 2, width: '35%', margin: '12px 0 8px' }} />
        {bodyBar()} {bodyBar('70%')}
        <div style={{ height: 6, background: '#e0d8d0', borderRadius: 2, width: '35%', margin: '12px 0 8px' }} />
        {bodyBar()}
      </div>
    </div>
  )
}

// ─── Nav ──────────────────────────────────────────────────────────────────────

function Nav({ onBack }) {
  return (
    <div style={{
      background: '#2c3038',
      padding: '10px 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottom: '0.5px solid #404850',
    }}>
      <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.12em', color: '#904060' }}>RENSUME</span>
      {onBack && (
        <span
          onClick={onBack}
          style={{ fontSize: 11, color: '#606878', cursor: 'pointer' }}
        >
          ← Back to home
        </span>
      )}
    </div>
  )
}

// ─── GeneratePage ─────────────────────────────────────────────────────────────

export default function GeneratePage() {
  const [state, setState]           = useState('input')   // 'input' | 'review'
  const [resumeText, setResumeText] = useState('')
  const [profile, setProfile]       = useState(null)
  const [theme, setTheme]           = useState('bordeaux')
  const [saveMode, setSaveMode]     = useState('save')
  const [loading, setLoading]       = useState(false)
  const [loadingMsg, setLoadingMsg] = useState('')
  const [error, setError]           = useState('')
  const [downloading, setDownloading] = useState(false)

  // ── Classification ──────────────────────────────────────────────────────────

  const handleGenerate = async () => {
    if (!resumeText.trim()) { setError('Paste your resume text first.'); return }
    setLoading(true)
    setError('')
    try {
      const result = await classifyResume(resumeText, msg => setLoadingMsg(msg))
      setProfile(result)
      setState('review')
    } catch (e) {
      setError(e.message || 'Classification failed — please try again.')
    } finally {
      setLoading(false)
      setLoadingMsg('')
    }
  }

  const handleRegenerate = () => {
    setState('input')
    setProfile(null)
    setError('')
  }

  // ── Flag submission ─────────────────────────────────────────────────────────
  // For now we log the flag — Supabase integration comes in the next step.

  const handleFlag = (flaggedItems, note) => {
    console.log('Flag submitted:', { flaggedItems, note, profile })
    // TODO: insert into card_flags via Supabase
  }

  // ── Download ────────────────────────────────────────────────────────────────
  // PDF generation via jsPDF — stub for now, full implementation next step.

  const handleDownload = async () => {
    if (!profile) return
    setDownloading(true)
    try {
      if (saveMode === 'save') {
        // TODO: save card to Supabase, trigger account creation overlay
        console.log('Save + download — account creation flow coming next')
      } else {
        // TODO: generate PDF and show permanent URL
        console.log('Download only — PDF generation coming next')
      }
    } finally {
      setDownloading(false)
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div style={{ fontFamily: '-apple-system, Arial, sans-serif', background: '#faf8f4', minHeight: '100vh' }}>

      <Nav onBack={state === 'review' ? null : null} />

      {/* State banner — dev only, remove before launch */}
      {process.env.NODE_ENV === 'development' && (
        <div style={{ background: '#f0ece4', borderBottom: '0.5px solid #d8d0c4', padding: '6px 24px', fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: '#a09080' }}>
          State {state === 'input' ? '1 — Input' : '2 — Review'}
        </div>
      )}

      {/* Split layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', minHeight: 'calc(100vh - 44px)' }}>

        {/* ── Left panel ── */}
        <div style={{ padding: '32px 28px', background: '#faf8f4', borderRight: '0.5px solid #d8d0c4' }}>

          {state === 'input' ? (
            <>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.16em', textTransform: 'uppercase', color: '#904060', marginBottom: 8 }}>
                Generate your card
              </div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#1a1410', marginBottom: 6 }}>
                Paste your resume
              </div>
              <p style={{ fontSize: 11.5, color: '#706050', lineHeight: 1.7, marginBottom: 20 }}>
                Plain text works best. Include your full work history for the most accurate profile.
              </p>

              <textarea
                value={resumeText}
                onChange={e => { setResumeText(e.target.value); setError('') }}
                placeholder="Paste your resume text here..."
                style={{
                  width: '100%',
                  height: 260,
                  background: 'white',
                  border: error ? '1px solid #c04060' : '1px solid #d8d0c4',
                  borderRadius: 6,
                  padding: '14px 16px',
                  fontSize: 11,
                  color: '#1a1410',
                  lineHeight: 1.75,
                  resize: 'none',
                  fontFamily: 'inherit',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
                onFocus={e => e.target.style.borderColor = '#904060'}
                onBlur={e => e.target.style.borderColor = error ? '#c04060' : '#d8d0c4'}
              />

              {error && (
                <p style={{ fontSize: 10, color: '#c04060', marginTop: 6 }}>{error}</p>
              )}

              <p style={{ fontSize: 10, color: '#a09080', margin: '8px 0 20px' }}>
                Your resume is never stored without your permission.
              </p>

              <button
                onClick={handleGenerate}
                disabled={loading}
                style={{
                  display: 'inline-block',
                  background: loading ? '#c8a0b0' : '#904060',
                  color: '#fff',
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '10px 22px',
                  borderRadius: 3,
                  border: 'none',
                  cursor: loading ? 'not-allowed' : 'pointer',
                }}
              >
                {loading ? loadingMsg || 'Classifying...' : 'Generate my card →'}
              </button>
            </>
          ) : (
            <ReviewPanel
              profile={profile}
              onRegenerate={handleRegenerate}
              onFlag={handleFlag}
            />
          )}
        </div>

        {/* ── Right panel ── */}
        <div style={{ padding: '28px 24px', background: '#f5f1eb' }}>

          {state === 'input' ? (
            <>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: '#a09080', marginBottom: 12 }}>
                Your card will appear here
              </div>
              <GhostCard />
            </>
          ) : (
            <>
              {/* Theme picker */}
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: '#a09080', marginBottom: 10 }}>
                Choose your theme
              </div>
              <div style={{ marginBottom: 16 }}>
                <ThemePicker theme={theme} onChange={setTheme} />
              </div>

              {/* Live card preview */}
              <div style={{ marginBottom: 16 }}>
                <Card profile={profile} theme={theme} />
              </div>

              {/* Save options */}
              <SaveOptions
                selected={saveMode}
                onSelect={setSaveMode}
                onDownload={handleDownload}
                loading={downloading}
              />
            </>
          )}
        </div>

      </div>
    </div>
  )
}
