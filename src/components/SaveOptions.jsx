// src/components/SaveOptions.jsx
// Three save mode options + download button.

import { useState } from 'react'

export const SAVE_MODES = {
  save_account: {
    label: 'Save to my account',
    recommended: false,
    comingSoon: true,
    description: 'Account creation coming soon.',
  },
  download_save: {
    label: 'Download and save',
    recommended: true,
    comingSoon: false,
    description: 'Download your PDF and get a permanent shareable link for your digital card. No account needed.',
  },
  download: {
    label: 'Download only',
    recommended: false,
    comingSoon: false,
    description: 'Just the PDF. Your card is not saved and the QR code links to rensume.com.',
  },
}

function RadioOption({ id, mode, selected, onSelect }) {
  const isOn = selected === id && !mode.comingSoon
  const disabled = mode.comingSoon

  return (
    <div
      onClick={() => !disabled && onSelect(id)}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        background: disabled ? '#f5f5f5' : isOn ? '#fdf8f6' : 'white',
        border: isOn ? '1.5px solid #904060' : '0.5px solid #d8d0c4',
        borderRadius: 6,
        padding: '11px 13px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        marginBottom: 8,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <div style={{
        width: 13,
        height: 13,
        borderRadius: '50%',
        border: isOn ? '1.5px solid #904060' : '1.5px solid #d8d0c4',
        background: isOn ? '#904060' : 'transparent',
        marginTop: 2,
        flexShrink: 0,
      }} />
      <div>
        <div style={{ fontSize: 10.5, fontWeight: 700, color: disabled ? '#a09080' : '#1a1410', marginBottom: 3 }}>
          {mode.label}
          {mode.recommended && !disabled && (
            <span style={{
              display: 'inline-block',
              fontSize: 8,
              fontWeight: 700,
              padding: '1px 6px',
              borderRadius: 3,
              background: '#f0ece4',
              color: '#906050',
              marginLeft: 6,
              verticalAlign: 'middle',
            }}>
              Recommended
            </span>
          )}
          {disabled && (
            <span style={{
              display: 'inline-block',
              fontSize: 8,
              fontWeight: 700,
              padding: '1px 6px',
              borderRadius: 3,
              background: '#eeeeee',
              color: '#a09080',
              marginLeft: 6,
              verticalAlign: 'middle',
            }}>
              Coming soon
            </span>
          )}
        </div>
        <div style={{ fontSize: 9.5, color: '#a09080', lineHeight: 1.6 }}>
          {mode.description}
        </div>
      </div>
    </div>
  )
}

function CopyLinkBox({ url }) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const accent = copied ? '#904060' : '#c0a0b0'

  return (
    <div style={{ background: '#f5f1eb', border: '0.5px solid #d8d0c4', borderRadius: 4, padding: '10px 12px', marginBottom: 8 }}>
      <div style={{ fontSize: 8.5, fontWeight: 700, color: '#904060', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 4 }}>Your card link</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 10, color: '#1a1410', wordBreak: 'break-all', flex: 1 }}>{url}</span>
        <button
          onClick={handleCopy}
          style={{ fontSize: 9, fontWeight: 700, color: accent, background: 'none', border: `1px solid ${accent}`, borderRadius: 3, padding: '3px 8px', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, transition: 'color 0.15s, border-color 0.15s' }}
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
    </div>
  )
}

export default function SaveOptions({ selected, onSelect, onDownload, loading = false, cardUrl = null }) {
  return (
    <div>
      {Object.entries(SAVE_MODES).map(([id, mode]) => (
        <RadioOption key={id} id={id} mode={mode} selected={selected} onSelect={onSelect} />
      ))}

      <button
        onClick={onDownload}
        disabled={loading || SAVE_MODES[selected]?.comingSoon}
        style={{
          display: 'block',
          width: '100%',
          background: loading || SAVE_MODES[selected]?.comingSoon ? '#c8a0b0' : '#904060',
          color: '#fff',
          fontSize: 11,
          fontWeight: 700,
          padding: 11,
          borderRadius: 3,
          border: 'none',
          cursor: loading || SAVE_MODES[selected]?.comingSoon ? 'not-allowed' : 'pointer',
          marginBottom: 8,
        }}
      >
        {loading
          ? 'Preparing your card...'
          : selected === 'download_save' ? 'Download and save →'
          : 'Download my card →'}
      </button>

      {cardUrl && <CopyLinkBox url={cardUrl} />}

      <div style={{ fontSize: 9.5, color: '#b0a890', textAlign: 'center', lineHeight: 1.6 }}>
        Your resume is deleted after your card is built. Your data, your choice.
      </div>
    </div>
  )
}
