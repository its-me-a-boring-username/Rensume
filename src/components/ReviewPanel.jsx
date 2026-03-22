// src/components/ReviewPanel.jsx
// Left panel of the generate/review page in State 2.
// Shows classified taxonomy rows — read only.
// Includes the flag flow at the bottom.

import { useState } from 'react'
import { getSeniorityLabel } from '../lib/classifier'

// ─── Pill styles by dimension ─────────────────────────────────────────────────

const PILL_STYLES = {
  fn:  { background: '#2c3038', color: '#c87090' },
  ka:  { background: '#904060', color: '#1a0810' },
  ind: { background: '#edeae6', color: '#403830', border: '0.5px solid #c8c0b8' },
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({ label }) {
  return (
    <div style={{
      fontSize: 8,
      fontWeight: 700,
      letterSpacing: '.13em',
      textTransform: 'uppercase',
      color: '#a09080',
      borderBottom: '0.5px solid #d8d0c4',
      paddingBottom: 4,
      margin: '14px 0 5px',
    }}>
      {label}
    </div>
  )
}

// ─── Taxonomy row ─────────────────────────────────────────────────────────────

function TaxonomyRow({ label, years, pillStyle, flagMode, flagged, onToggleFlag }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '7px 0',
      borderBottom: '0.5px solid #ede8e2',
      background: flagged ? '#fdf5f6' : 'transparent',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {flagMode && (
          <input
            type="checkbox"
            checked={flagged}
            onChange={onToggleFlag}
            style={{ accentColor: '#904060', flexShrink: 0 }}
          />
        )}
        <span style={{
          ...pillStyle,
          padding: '3px 9px',
          borderRadius: 3,
          fontSize: 8.5,
          fontWeight: 700,
          display: 'inline-block',
        }}>
          {label}
        </span>
      </div>
      <span style={{ fontSize: 9, color: '#a09080' }}>{years}y</span>
    </div>
  )
}

// ─── Flag form ────────────────────────────────────────────────────────────────

function FlagForm({ flagged, onSubmit, onCancel }) {
  const [note, setNote] = useState('')
  const hasFlags = flagged.length > 0

  return (
    <div style={{
      marginTop: 12,
      background: '#f5f1eb',
      border: '0.5px solid #d8d0c4',
      borderRadius: 6,
      padding: 14,
    }}>
      {hasFlags ? (
        <div style={{ fontSize: 9.5, color: '#1a1410', marginBottom: 10 }}>
          <strong>Flagged: </strong>{flagged.join(', ')}
        </div>
      ) : (
        <div style={{ fontSize: 9.5, color: '#a09080', marginBottom: 10 }}>
          No items selected yet — check the boxes next to any items that look wrong.
        </div>
      )}

      <textarea
        value={note}
        onChange={e => setNote(e.target.value)}
        placeholder="Describe what looks wrong and what you'd expect instead..."
        style={{
          width: '100%',
          fontSize: 10,
          padding: '8px 10px',
          border: '0.5px solid #d8d0c4',
          borderRadius: 4,
          background: 'white',
          color: '#1a1410',
          resize: 'none',
          height: 72,
          fontFamily: 'inherit',
          boxSizing: 'border-box',
        }}
      />

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
        <button
          onClick={onCancel}
          style={{
            fontSize: 10,
            fontWeight: 700,
            padding: '6px 14px',
            borderRadius: 3,
            background: 'transparent',
            color: '#a09080',
            border: '1px solid #d8d0c4',
            cursor: 'pointer',
          }}
        >
          Cancel
        </button>
        <button
          onClick={() => hasFlags && onSubmit(flagged, note)}
          disabled={!hasFlags}
          style={{
            fontSize: 10,
            fontWeight: 700,
            padding: '6px 14px',
            borderRadius: 3,
            background: hasFlags ? '#904060' : '#d8d0c4',
            color: '#fff',
            border: 'none',
            cursor: hasFlags ? 'pointer' : 'not-allowed',
          }}
        >
          Submit flag
        </button>
      </div>
    </div>
  )
}

// ─── ReviewPanel ──────────────────────────────────────────────────────────────

/**
 * Props:
 *   profile      — classified profile from classifier.js
 *   onRegenerate — () => void
 *   onFlag       — (flaggedItems: string[], note: string) => void
 */
export default function ReviewPanel({ profile, onRegenerate, onFlag }) {
  const [flagMode, setFlagMode]       = useState(false)
  const [flagged, setFlagged]         = useState([])
  const [flagSubmitted, setFlagSubmitted] = useState(false)

  if (!profile) return null

  const { summary, functions = [], knowledge_areas = [], industries = [] } = profile

  const toggleFlag = (label) => {
    setFlagged(prev =>
      prev.includes(label) ? prev.filter(f => f !== label) : [...prev, label]
    )
  }

  const handleSubmitFlag = (items, note) => {
    onFlag?.(items, note)
    setFlagMode(false)
    setFlagged([])
    setFlagSubmitted(true)
  }

  const handleCancelFlag = () => {
    setFlagMode(false)
    setFlagged([])
  }

  return (
    <div style={{ fontFamily: '-apple-system, Arial, sans-serif' }}>

      {/* Header */}
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.16em', textTransform: 'uppercase', color: '#904060', marginBottom: 6 }}>
        Review your profile
      </div>
      <div style={{ fontSize: 20, fontWeight: 700, color: '#1a1410', marginBottom: 6 }}>
        Does this look right?
      </div>
      <p style={{ fontSize: 11.5, color: '#706050', lineHeight: 1.7, marginBottom: 20 }}>
        {flagMode
          ? 'Check the items that look wrong, then add a note below.'
          : 'Review each section. If something looks wrong, flag it for our team to review.'}
      </p>

      {/* Summary */}
      <SectionHeader label="Summary" />
      <p style={{ fontSize: 11, color: '#706050', lineHeight: 1.65, padding: '7px 0' }}>
        {summary}
      </p>

      {/* Function */}
      {functions.length > 0 && (
        <>
          <SectionHeader label="Function" />
          {functions.map((fn, i) => {
            const label = getSeniorityLabel(fn.name, fn.years)
            return (
              <TaxonomyRow
                key={i}
                label={label}
                years={fn.years}
                pillStyle={PILL_STYLES.fn}
                flagMode={flagMode}
                flagged={flagged.includes(label)}
                onToggleFlag={() => toggleFlag(label)}
              />
            )
          })}
        </>
      )}

      {/* Knowledge area */}
      {knowledge_areas.length > 0 && (
        <>
          <SectionHeader label="Knowledge area" />
          {knowledge_areas.map((ka, i) => (
            <TaxonomyRow
              key={i}
              label={ka.name}
              years={ka.years}
              pillStyle={PILL_STYLES.ka}
              flagMode={flagMode}
              flagged={flagged.includes(ka.name)}
              onToggleFlag={() => toggleFlag(ka.name)}
            />
          ))}
        </>
      )}

      {/* Industry */}
      {industries.length > 0 && (
        <>
          <SectionHeader label="Industry" />
          {industries.map((ind, i) => (
            <TaxonomyRow
              key={i}
              label={ind.name}
              years={ind.years}
              pillStyle={PILL_STYLES.ind}
              flagMode={flagMode}
              flagged={flagged.includes(ind.name)}
              onToggleFlag={() => toggleFlag(ind.name)}
            />
          ))}
        </>
      )}

      {/* Bottom actions */}
      <div style={{ marginTop: 20, paddingTop: 16, borderTop: '0.5px solid #d8d0c4' }}>

        {flagSubmitted ? (
          <div style={{
            background: '#eaf4ee',
            border: '0.5px solid #b0d8b8',
            borderRadius: 6,
            padding: '10px 14px',
            marginBottom: 12,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#2a7a50', flexShrink: 0 }} />
              <div style={{ fontSize: 10, color: '#2a6040', lineHeight: 1.6 }}>
                Thanks — we've received your flag and will review it within 2 business days. Your card has been saved as-is.
              </div>
            </div>
          </div>
        ) : flagMode ? (
          <FlagForm flagged={flagged} onSubmit={handleSubmitFlag} onCancel={handleCancelFlag} />
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span
              onClick={() => setFlagMode(true)}
              style={{ fontSize: 10, color: '#a09080', cursor: 'pointer', textDecoration: 'underline', textDecorationColor: '#d8d0c4' }}
            >
              Something look wrong? Flag it →
            </span>
            <button
              onClick={onRegenerate}
              style={{
                background: 'transparent',
                color: '#706050',
                border: '1px solid #d8d0c4',
                fontSize: 11,
                fontWeight: 700,
                padding: '9px 18px',
                borderRadius: 3,
                cursor: 'pointer',
              }}
            >
              Re-generate
            </button>
          </div>
        )}

      </div>
    </div>
  )
}
