// src/pages/GeneratePage.jsx
// The card generation page. Manages two states:
//   State 1 — resume input
//   State 2 — review + theme picker + save options
//

import { useState, useEffect } from 'react'
import { classifyResume } from '../lib/classifier'
import Card from '../components/Card'
import ThemePicker from '../components/ThemePicker'
import SaveOptions from '../components/SaveOptions'
import ReviewPanel from '../components/ReviewPanel'
import { downloadCardPdf } from '../lib/generatePdf'

// ─── Keyframe animations (injected once) ─────────────────────────────────────

const STYLES = `
  @keyframes shimmer {
    0%   { background-position: -600px 0; }
    100% { background-position:  600px 0; }
  }
  @keyframes pulse-dot {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.25; }
  }
  @keyframes fade-in-up {
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .shimmer-bar {
    background: linear-gradient(90deg, #e8e4de 25%, #f0ece6 50%, #e8e4de 75%);
    background-size: 600px 100%;
    animation: shimmer 1.6s infinite linear;
    border-radius: 3px;
  }
  .card-reveal {
    animation: fade-in-up 0.4s ease forwards;
  }
`

function InjectStyles() {
  useEffect(() => {
    const id = 'rensume-anim-styles'
    if (!document.getElementById(id)) {
      const el = document.createElement('style')
      el.id = id
      el.textContent = STYLES
      document.head.appendChild(el)
    }
  }, [])
  return null
}

// ─── Ghost card ───────────────────────────────────────────────────────────────

function GhostCard({ loading = false }) {
  const bar = (w = '100%', h = 8) => (
    <div
      className={loading ? 'shimmer-bar' : ''}
      style={{ height: h, background: loading ? undefined : '#404850', borderRadius: 2, marginBottom: 5, width: w }}
    />
  )
  const bodyBar = (w = '100%') => (
    <div
      className={loading ? 'shimmer-bar' : ''}
      style={{ height: 20, background: loading ? undefined : '#ede8e0', borderRadius: 3, marginBottom: 5, width: w }}
    />
  )
  const secBar = (mt = 0) => (
    <div
      className={loading ? 'shimmer-bar' : ''}
      style={{ height: 6, background: loading ? undefined : '#e0d8d0', borderRadius: 2, width: '35%', margin: `${mt}px 0 8px` }}
    />
  )
  return (
    <div style={{
      background: 'white',
      borderRadius: 8,
      border: '0.5px solid #d8d0c4',
      overflow: 'hidden',
      opacity: loading ? 1 : 0.35,
      transition: 'opacity 0.3s ease',
    }}>
      <div style={{ background: '#2c3038', padding: '14px 16px' }}>
        <div style={{ fontSize: 7, fontWeight: 700, letterSpacing: '.14em', color: '#904060', marginBottom: 8 }}>
          RENSUME · TAXONOMY PROFILE
        </div>
        {bar()} {bar('60%')}
      </div>
      <div style={{ height: 2, background: '#904060' }} />
      <div style={{ padding: '12px 16px' }}>
        {secBar(0)} {bodyBar()} {bodyBar('70%')}
        {secBar(12)} {bodyBar()} {bodyBar('70%')}
        {secBar(12)} {bodyBar()}
      </div>
    </div>
  )
}

// ─── Progress indicator ───────────────────────────────────────────────────────

function ProgressIndicator({ message }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      marginTop: 14,
      padding: '10px 14px',
      background: '#f0ece4',
      borderRadius: 4,
      border: '0.5px solid #d8d0c4',
    }}>
      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: 5,
            height: 5,
            borderRadius: '50%',
            background: '#904060',
            animation: `pulse-dot 1.2s ease-in-out ${i * 0.2}s infinite`,
          }} />
        ))}
      </div>
      <span style={{ fontSize: 10, color: '#706050', fontWeight: 600 }}>
        {message}
      </span>
    </div>
  )
}

// ─── Nav ──────────────────────────────────────────────────────────────────────

function Nav() {
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
    </div>
  )
}

// ─── GeneratePage ─────────────────────────────────────────────────────────────

export default function GeneratePage() {
  const [state, setState]             = useState('input')
  const [resumeText, setResumeText]   = useState('')
  const [profile, setProfile]         = useState(null)
  const [theme, setTheme]             = useState('bordeaux')
  const [saveMode, setSaveMode]       = useState('save')
  const [loadingMsg, setLoadingMsg]   = useState('')
  const [error, setError]             = useState('')
  const [downloading, setDownloading] = useState(false)

  const loading = state === 'loading'

  // ── Classification ──────────────────────────────────────────────────────────

  const handleGenerate = async () => {
    if (!resumeText.trim()) { setError('Paste your resume text first.'); return }
    setState('loading')
    setError('')
    try {
      const result = await classifyResume(resumeText, msg => setLoadingMsg(msg))
      setProfile(result)
      setState('review')
    } catch (e) {
      setError(e.message || 'Classification failed — please try again.')
      setState('input')
    } finally {
      setLoadingMsg('')
    }
  }

  const handleRegenerate = () => {
    setState('input')
    setProfile(null)
    setError('')
  }

  // ── Flag submission ─────────────────────────────────────────────────────────

  const handleFlag = (flaggedItems, note) => {
    console.log('Flag submitted:', { flaggedItems, note, profile })
    // TODO: insert into card_flags via Supabase
  }

  // ── Download ────────────────────────────────────────────────────────────────

  const handleDownload = async () => {
    if (!profile) return

    setDownloading(true)
    try {
      await downloadCardPdf(profile, theme)
    } catch (e) {
      alert(`PDF error: ${e.message}`)
      console.error('PDF generation failed:', e)
    } finally {
      setDownloading(false)
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div style={{ fontFamily: '-apple-system, Arial, sans-serif', background: '#faf8f4', minHeight: '100vh' }}>
      <InjectStyles />
      <Nav />

      {/* Dev state banner */}
      {process.env.NODE_ENV === 'development' && (
        <div style={{ background: '#f0ece4', borderBottom: '0.5px solid #d8d0c4', padding: '6px 24px', fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: '#a09080' }}>
          State {state === 'input' ? '1 — Input' : state === 'loading' ? '1.5 — Loading' : '2 — Review'}
        </div>
      )}

      {/* Split layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', minHeight: 'calc(100vh - 44px)' }}>

        {/* ── Left panel ── */}
        <div style={{ padding: '32px 28px', background: '#faf8f4', borderRight: '0.5px solid #d8d0c4' }}>

          {state === 'review' ? (
            <ReviewPanel
              profile={profile}
              onRegenerate={handleRegenerate}
              onFlag={handleFlag}
            />
          ) : (
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
                disabled={loading}
                style={{
                  width: '100%',
                  height: 260,
                  background: loading ? '#f5f1eb' : 'white',
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
                  transition: 'background 0.2s ease, border-color 0.15s ease',
                }}
                onFocus={e => { if (!loading) e.target.style.borderColor = '#904060' }}
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
                  background: loading ? '#b07080' : '#904060',
                  color: '#fff',
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '10px 22px',
                  borderRadius: 3,
                  border: 'none',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'background 0.2s ease',
                }}
              >
                {loading ? 'Classifying...' : 'Generate my card →'}
              </button>

              {loading && loadingMsg && <ProgressIndicator message={loadingMsg} />}
            </>
          )}
        </div>

        {/* ── Right panel ── */}
        <div style={{ padding: '28px 24px', background: '#f5f1eb' }}>

          {state === 'review' ? (
            <div className="card-reveal">
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: '#a09080', marginBottom: 10 }}>
                Choose your theme
              </div>
              <div style={{ marginBottom: 16 }}>
                <ThemePicker theme={theme} onChange={setTheme} />
              </div>

              <div style={{ marginBottom: 16 }}>
                <Card profile={profile} theme={theme} showEvidence />
              </div>

              <SaveOptions
                selected={saveMode}
                onSelect={setSaveMode}
                onDownload={handleDownload}
                loading={downloading}
              />
            </div>
          ) : (
            <>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: loading ? '#904060' : '#a09080', marginBottom: 12, transition: 'color 0.2s ease' }}>
                {loading ? 'Building your card...' : 'Your card will appear here'}
              </div>
              <GhostCard loading={loading} />
            </>
          )}
        </div>

      </div>
    </div>
  )
}
