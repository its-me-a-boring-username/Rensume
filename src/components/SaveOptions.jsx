// src/components/SaveOptions.jsx
// The two save mode radio options + download button.
// "Download and save" is greyed out until account creation is implemented.

export const SAVE_MODES = {
  save: {
    label: 'Download and save to my account',
    recommended: false,
    comingSoon: true,
    description: 'Account creation coming soon.',
  },
  download: {
    label: 'Download only',
    recommended: true,
    comingSoon: false,
    description: "Get your PDF and a unique link to your card. There's no way to access your card if you lose the link, so save it somewhere safe.",
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
