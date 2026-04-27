import { useState, useEffect, useRef } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker?url'
import { classifyResume } from '../lib/classifier'
import Card from '../components/Card'
import ThemePicker from '../components/ThemePicker'
import SaveOptions from '../components/SaveOptions'
import ReviewPanel from '../components/ReviewPanel'
import { downloadCardPdf } from '../lib/generatePdf'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker

const STYLES = `
  @keyframes fade-in-up {
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes pulse-dot {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.3; }
  }
  .card-reveal { animation: fade-in-up 0.4s ease forwards; }

  .split-layout {
    display: grid;
    grid-template-columns: 1fr 1fr;
    min-height: calc(100vh - 44px);
  }
  .left-panel  { padding: 40px 36px; background: #faf8f4; border-right: 0.5px solid #d8d0c4; }
  .right-panel { padding: 36px 32px; background: #f5f1eb; }
  .mobile-page { display: none; }

  .input-tabs { display: flex; border: 1px solid #d8d0c4; border-radius: 4px; overflow: hidden; width: fit-content; margin-bottom: 20px; }
  .input-tab { font-size: 11px; font-weight: 700; padding: 7px 18px; cursor: pointer; background: white; color: #a09080; border: none; font-family: inherit; }
  .input-tab.active { background: #904060; color: #fff; }
  .input-tab:not(:last-child) { border-right: 1px solid #d8d0c4; }

  .dropzone { width: 100%; height: 240px; background: white; border: 1.5px dashed #d8d0c4; border-radius: 6px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; cursor: pointer; transition: border-color 0.15s, background 0.15s; }
  .dropzone:hover, .dropzone.dragover { border-color: #904060; background: #fdf9f6; }
  .dropzone.loaded { border-color: #904060; background: #fdf9f6; height: 120px; }

  .ghost-card { background: white; border-radius: 8px; border: 0.5px solid #d8d0c4; overflow: hidden; opacity: 0.35; }
  .ghost-hdr  { background: #2c3038; padding: 14px 16px; }

  @keyframes shimmer {
    0%   { background-position: -600px 0; }
    100% { background-position:  600px 0; }
  }
  .shimmer { background: linear-gradient(90deg, #404850 25%, #505860 50%, #404850 75%); background-size: 600px 100%; animation: shimmer 1.6s infinite linear; border-radius: 2px; }
  .shimmer-light { background: linear-gradient(90deg, #e8e4de 25%, #f0ece6 50%, #e8e4de 75%); background-size: 600px 100%; animation: shimmer 1.6s infinite linear; border-radius: 3px; }

  @media (max-width: 700px) {
    .split-layout { display: none; }
    .mobile-page {
      display: block;
      min-height: calc(100vh - 44px);
      padding: 24px 20px;
      background: #faf8f4;
    }
    .mobile-page.result { background: #f5f1eb; }
  }
`

const STEPS = [
  { msg: 'Loading taxonomy...',           label: 'Loading taxonomy'           },
  { msg: 'Extracting your profile...',    label: 'Extracting profile'         },
  { msg: 'Classifying knowledge areas...', label: 'Classifying knowledge areas' },
  { msg: '__done__',                      label: 'Building your card'         },
]

function stepStatus(steps, currentMsg) {
  if (!currentMsg) return steps.map(() => 'pending')
  const active = steps.findIndex(s => s.msg === currentMsg)
  if (active === -1) {
    // message not recognised — treat all as done (finishing up)
    return steps.map((_, i) => i < steps.length - 1 ? 'done' : 'active')
  }
  return steps.map((_, i) => i < active ? 'done' : i === active ? 'active' : 'pending')
}

function InjectStyles() {
  useEffect(() => {
    const id = 'rensume-gen-styles-v3'
    if (!document.getElementById(id)) {
      const el = document.createElement('style')
      el.id = id; el.textContent = STYLES
      document.head.appendChild(el)
    }
  }, [])
  return null
}

function Nav({ showBack, onBack }) {
  return (
    <div style={{ background: '#1a1e24', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '0.5px solid #2c3038' }}>
      <a href="/" style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.12em', color: '#904060', textDecoration: 'none' }}>RENSUME</a>
      {showBack && (
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#909aa8', fontSize: 11, cursor: 'pointer', padding: '4px 0' }}>
          ← Edit resume
        </button>
      )}
    </div>
  )
}

function LoadingPanel({ loadingMsg }) {
  const statuses = stepStatus(STEPS, loadingMsg)
  const doneCount = statuses.filter(s => s === 'done').length
  const progress = Math.round((doneCount / STEPS.length) * 100)

  return (
    <div style={{ background: '#1a1e24', borderRadius: 8, border: '0.5px solid #2c3038', overflow: 'hidden' }}>
      <div style={{ padding: '16px 18px', borderBottom: '0.5px solid #2c3038' }}>
        <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '.14em', color: '#904060', marginBottom: 6 }}>RENSUME · TAXONOMY PROFILE</div>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#faf8f4' }}>Classifying your resume</div>
      </div>
      <div style={{ padding: '18px 18px' }}>
        {STEPS.map((step, i) => {
          const status = statuses[i]
          return (
            <div key={step.msg} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: i < STEPS.length - 1 ? '0.5px solid #242830' : 'none' }}>
              <div style={{
                width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                background: status === 'done' ? '#904060' : status === 'active' ? '#c87090' : 'transparent',
                border: status === 'pending' ? '1px solid #404850' : 'none',
                animation: status === 'active' ? 'pulse-dot 1.2s ease-in-out infinite' : 'none',
              }} />
              <div style={{
                fontSize: 12,
                color: status === 'done' ? '#606878' : status === 'active' ? '#faf8f4' : '#363c44',
                fontWeight: status === 'active' ? 600 : 400,
              }}>{step.label}</div>
            </div>
          )
        })}
        <div style={{ marginTop: 16, height: 2, background: '#242830', borderRadius: 1, overflow: 'hidden' }}>
          <div style={{ height: '100%', background: '#904060', borderRadius: 1, width: `${progress}%`, transition: 'width 0.4s ease' }} />
        </div>
      </div>
    </div>
  )
}

function GhostCard() {
  const bar = (w = '100%', h = 8) => <div className="shimmer" style={{ height: h, marginBottom: 5, width: w }} />
  const pill = (w = '100%') => <div className="shimmer-light" style={{ height: 20, marginBottom: 6, width: w }} />
  const sec = (mt = 0) => <div className="shimmer-light" style={{ height: 6, width: '30%', margin: `${mt}px 0 10px` }} />
  return (
    <div className="ghost-card">
      <div className="ghost-hdr">
        <div style={{ fontSize: 7, fontWeight: 700, letterSpacing: '.14em', color: '#904060', marginBottom: 8 }}>RENSUME · TAXONOMY PROFILE</div>
        {bar()} {bar('60%')}
      </div>
      <div style={{ height: 2, background: '#904060' }} />
      <div style={{ padding: '14px 16px' }}>
        {sec(0)} {pill()} {pill('70%')}
        {sec(10)} {pill()} {pill('70%')}
        {sec(10)} {pill('70%')}
      </div>
    </div>
  )
}

function InputContent({ resumeText, setResumeText, inputMode, setInputMode, pdfFilename, setPdfFilename, error, setError, loading, handleGenerate }) {
  const fileRef = useRef()
  const [dragover, setDragover] = useState(false)

  const handlePDF = async (file) => {
    if (!file || file.type !== 'application/pdf') return
    setError('')
    setPdfFilename(file.name)
    setResumeText('')
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
      if (!text) throw new Error('No text found in PDF — try pasting the text instead.')
      setResumeText(text)
    } catch (err) {
      setError('PDF extraction failed: ' + (err.message || 'unknown error'))
      setPdfFilename('')
    }
  }

  const handleFileInput = (e) => handlePDF(e.target.files[0])
  const handleDrop = (e) => { e.preventDefault(); setDragover(false); handlePDF(e.dataTransfer.files[0]) }

  const canSubmit = inputMode === 'paste' ? !!resumeText.trim() : !!pdfFilename

  return (
    <>
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.16em', textTransform: 'uppercase', color: '#904060', marginBottom: 10 }}>Generate your card</div>
      <div style={{ fontSize: 26, fontWeight: 700, color: '#1a1410', marginBottom: 20 }}>Add a resume</div>

      <div className="input-tabs">
        <button className={`input-tab${inputMode === 'paste' ? ' active' : ''}`} onClick={() => setInputMode('paste')}>Paste text</button>
        <button className={`input-tab${inputMode === 'pdf' ? ' active' : ''}`} onClick={() => setInputMode('pdf')}>Upload PDF</button>
      </div>

      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', borderLeft: '2px solid #1a1e24', paddingLeft: 14, paddingTop: 10, paddingBottom: 10, paddingRight: 14, background: 'rgba(26, 30, 36, 0.07)', borderRadius: '0 4px 4px 0', marginBottom: 20 }}>
        <p style={{ fontSize: 12, color: '#1a1e24', lineHeight: 1.65, margin: 0 }}>
          For best results, exclude contact details, hobbies, and general skills. Include your full work history.
        </p>
      </div>

      {inputMode === 'paste' ? (
        <textarea
          value={resumeText}
          onChange={e => { setResumeText(e.target.value); setError('') }}
          placeholder="Paste resume text here..."
          disabled={loading}
          style={{ width: '100%', height: 240, background: loading ? '#f5f1eb' : 'white', border: error ? '1px solid #c04060' : '1px solid #d8d0c4', borderRadius: 6, padding: '14px 16px', fontSize: 13, color: '#1a1410', lineHeight: 1.75, resize: 'none', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', transition: 'background 0.2s ease, border-color 0.15s ease' }}
          onFocus={e => { if (!loading) e.target.style.borderColor = '#904060' }}
          onBlur={e => e.target.style.borderColor = error ? '#c04060' : '#d8d0c4'}
        />
      ) : pdfFilename ? (
        <div className="dropzone loaded" style={{ cursor: 'default' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#1a1410' }}>{pdfFilename}</div>
          {resumeText && <div style={{ fontSize: 11, color: '#a09080' }}>{resumeText.length.toLocaleString()} characters extracted</div>}
          <button onClick={() => { setPdfFilename(''); setResumeText(''); setError('') }} style={{ fontSize: 11, color: '#c04060', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Remove</button>
        </div>
      ) : (
        <>
          <input ref={fileRef} type="file" accept=".pdf" onChange={handleFileInput} style={{ display: 'none' }} />
          <div
            className={`dropzone${dragover ? ' dragover' : ''}`}
            onClick={() => fileRef.current.click()}
            onDragOver={e => { e.preventDefault(); setDragover(true) }}
            onDragLeave={() => setDragover(false)}
            onDrop={handleDrop}
          >
            <div style={{ fontSize: 24, opacity: 0.4 }}>↑</div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 13, color: '#a09080' }}>Drop your PDF here</div>
              <div style={{ fontSize: 11, color: '#b8b0a8', marginTop: 4 }}>or</div>
            </div>
            <button onClick={e => { e.stopPropagation(); fileRef.current.click() }} style={{ fontSize: 11, fontWeight: 700, color: '#904060', background: 'none', border: '1px solid #904060', borderRadius: 3, padding: '6px 14px', cursor: 'pointer', fontFamily: 'inherit' }}>Choose file</button>
          </div>
        </>
      )}

      {error && <p style={{ fontSize: 11, color: '#c04060', marginTop: 6 }}>{error}</p>}
      <p style={{ fontSize: 11, color: '#a09080', margin: '10px 0 20px' }}>Your resume is never stored without your permission.</p>
      <button
        onClick={handleGenerate}
        disabled={loading || !canSubmit}
        style={{ display: 'block', width: '100%', background: loading || !canSubmit ? '#b07080' : '#904060', color: '#fff', fontSize: 13, fontWeight: 700, padding: '12px 22px', borderRadius: 3, border: 'none', cursor: loading || !canSubmit ? 'not-allowed' : 'pointer', transition: 'background 0.2s ease' }}
      >
        {loading ? 'Classifying...' : 'Generate my card →'}
      </button>
    </>
  )
}

function ResultContent({ profile, theme, setTheme, saveMode, setSaveMode, handleDownload, downloading }) {
  return (
    <div className="card-reveal">
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: '#a09080', marginBottom: 10 }}>Choose your theme</div>
      <div style={{ marginBottom: 16 }}><ThemePicker theme={theme} onChange={setTheme} /></div>
      <div style={{ marginBottom: 16 }}><Card profile={profile} theme={theme} showEvidence /></div>
      <SaveOptions selected={saveMode} onSelect={setSaveMode} onDownload={handleDownload} loading={downloading} />
    </div>
  )
}

export default function GeneratePage() {
  const [state, setState]             = useState('input')
  const [resumeText, setResumeText]   = useState('')
  const [inputMode, setInputMode]     = useState('paste')
  const [pdfFilename, setPdfFilename] = useState('')
  const [profile, setProfile]         = useState(null)
  const [theme, setTheme]             = useState('bordeaux')
  const [saveMode, setSaveMode]       = useState('download')
  const [loadingMsg, setLoadingMsg]   = useState('')
  const [error, setError]             = useState('')
  const [downloading, setDownloading] = useState(false)

  const loading = state === 'loading'

  const handleGenerate = async () => {
    if (!resumeText.trim()) { setError('Add a resume first.'); return }
    setState('loading'); setError('')
    try {
      const result = await classifyResume(resumeText, msg => setLoadingMsg(msg))
      setProfile(result); setState('review')
    } catch (e) {
      setError(e.message || 'Classification failed — please try again.')
      setState('input')
    } finally { setLoadingMsg('') }
  }

  const handleRegenerate = () => { setState('input'); setProfile(null); setError('') }
  const handleFlag = (flaggedItems, note) => { console.log('Flag submitted:', { flaggedItems, note, profile }) }
  const handleDownload = async () => {
    if (!profile) return
    setDownloading(true)
    try { await downloadCardPdf(profile, theme) }
    catch (e) { alert(`PDF error: ${e.message}`); console.error('PDF generation failed:', e) }
    finally { setDownloading(false) }
  }

  const inputProps = { resumeText, setResumeText, inputMode, setInputMode, pdfFilename, setPdfFilename, error, setError, loading, handleGenerate }
  const resultProps = { profile, theme, setTheme, saveMode, setSaveMode, handleDownload, downloading }

  return (
    <div style={{ fontFamily: '-apple-system, Arial, sans-serif', background: '#faf8f4', minHeight: '100vh' }}>
      <InjectStyles />
      <Nav showBack={state === 'review'} onBack={handleRegenerate} />

      {/* Desktop split layout */}
      <div className="split-layout">
        <div className="left-panel">
          {state === 'review'
            ? <ReviewPanel profile={profile} onRegenerate={handleRegenerate} onFlag={handleFlag} />
            : <InputContent {...inputProps} />
          }
        </div>
        <div className="right-panel">
          {state === 'review' ? (
            <ResultContent {...resultProps} />
          ) : loading ? (
            <>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: '#904060', marginBottom: 14 }}>Building your card...</div>
              <LoadingPanel loadingMsg={loadingMsg} />
            </>
          ) : (
            <>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: '#a09080', marginBottom: 14 }}>Your card will appear here</div>
              <GhostCard />
            </>
          )}
        </div>
      </div>

      {/* Mobile single-page flow */}
      {state !== 'review' ? (
        <div className="mobile-page">
          <InputContent {...inputProps} />
        </div>
      ) : (
        <div className="mobile-page result">
          <ResultContent {...resultProps} />
        </div>
      )}
    </div>
  )
}
