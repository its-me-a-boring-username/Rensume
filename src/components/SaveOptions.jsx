// src/components/SaveOptions.jsx
// The two save mode radio options + download button.
// Shown in the right panel of the generate/review page after classification.

export const SAVE_MODES = {
  save: {
    label: 'Download and save to my account',
    recommended: true,
    description: 'Get your PDF and a free account to retrieve your card anytime. Not visible to recruiters.',
  },
  download: {
    label: 'Download only',
    recommended: false,
    description: "Get your PDF and a unique link to your card. There's no way to access your card if you lose the link, so save it. Not visible to recruiters.",
  },
}

function RadioOption({ id, mode, selected, onSelect }) {
  const isOn = selected === id
  return (
    <div
      onClick={() => onSelect(id)}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        background: isOn ? '#fdf8f6' : 'white',
        border: isOn ? '1.5px solid #904060' : '0.5px solid #d8d0c4',
        borderRadius: 6,
        padding: '11px 13px',
        cursor: 'pointer',
        marginBottom: 8,
      }}
    >
      {/* Radio dot */}
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
        <div style={{ fontSize: 10.5, fontWeight: 700, color: '#1a1410', marginBottom: 3 }}>
          {mode.label}
          {mode.recommended && (
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
        </div>
        <div style={{ fontSize: 9.5, color: '#a09080', lineHeight: 1.6 }}>
          {mode.description}
        </div>
      </div>
    </div>
  )
}

/**
 * Props:
 *   selected   — 'save' | 'download'
 *   onSelect   — (mode) => void
 *   onDownload — () => void
 *   loading    — bool
 */
export default function SaveOptions({ selected, onSelect, onDownload, loading = false }) {
  return (
    <div>
      {Object.entries(SAVE_MODES).map(([id, mode]) => (
        <RadioOption key={id} id={id} mode={mode} selected={selected} onSelect={onSelect} />
      ))}

      <button
        onClick={onDownload}
        disabled={loading}
        style={{
          display: 'block',
          width: '100%',
          background: loading ? '#c8a0b0' : '#904060',
          color: '#fff',
          fontSize: 11,
          fontWeight: 700,
          padding: 11,
          borderRadius: 3,
          border: 'none',
          cursor: loading ? 'not-allowed' : 'pointer',
          marginBottom: 8,
        }}
      >
        {loading ? 'Preparing your card...' : 'Download my card'}
      </button>

      <div style={{ fontSize: 9.5, color: '#b0a890', textAlign: 'center', lineHeight: 1.6 }}>
        Your resume is deleted after your card is built. Your data, your choice.
      </div>
    </div>
  )
}
