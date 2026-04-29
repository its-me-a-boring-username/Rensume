// src/components/ReviewPanel.jsx
// Left panel of the generate/review page in State 2.
// Shows classified taxonomy rows with per-item delete controls.

import { useState } from 'react'
import { getSeniorityLabel } from '../lib/classifier'

const PILL_STYLES = {
  fn:  { background: '#2c3038', color: '#c87090' },
  ka:  { background: '#904060', color: '#1a0810' },
  ind: { background: '#edeae6', color: '#403830', border: '0.5px solid #c8c0b8' },
}

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

function TaxonomyRow({ label, years, pillStyle, deleteMode, deleted, onToggleDelete }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '7px 0',
      borderBottom: '0.5px solid #ede8e2',
      opacity: deleted ? 0.4 : 1,
      transition: 'opacity 0.15s',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {deleteMode && (
          <input
            type="checkbox"
            checked={deleted}
            onChange={onToggleDelete}
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
          textDecoration: deleted ? 'line-through' : 'none',
        }}>
          {label}
        </span>
      </div>
      <span style={{ fontSize: 9, color: '#a09080' }}>{years}y</span>
    </div>
  )
}

/**
 * Props:
 *   profile        — original classified profile from classifier.js
 *   onRegenerate   — () => void
 *   deletedNames   — string[] of label names removed by the user
 *   onToggleDelete — (name: string) => void
 */
export default function ReviewPanel({ profile, onRegenerate, deletedNames = [], onToggleDelete }) {
  const [deleteMode, setDeleteMode] = useState(false)

  if (!profile) return null

  const { summary, functions = [], knowledge_areas = [], industries = [] } = profile
  const deletedCount = deletedNames.length

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
        {deleteMode
          ? 'Check the boxes next to any labels you want to remove from your card.'
          : 'Review each section. Remove any labels that don\'t look right.'}
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
                deleteMode={deleteMode}
                deleted={deletedNames.includes(fn.name)}
                onToggleDelete={() => onToggleDelete(fn.name)}
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
              deleteMode={deleteMode}
              deleted={deletedNames.includes(ka.name)}
              onToggleDelete={() => onToggleDelete(ka.name)}
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
              deleteMode={deleteMode}
              deleted={deletedNames.includes(ind.name)}
              onToggleDelete={() => onToggleDelete(ind.name)}
            />
          ))}
        </>
      )}

      {/* Bottom actions */}
      <div style={{ marginTop: 20, paddingTop: 16, borderTop: '0.5px solid #d8d0c4' }}>
        {deleteMode ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 10, color: '#a09080' }}>
              {deletedCount > 0
                ? `${deletedCount} label${deletedCount !== 1 ? 's' : ''} removed`
                : 'No labels removed yet'}
            </span>
            <button
              onClick={() => setDeleteMode(false)}
              style={{
                background: '#904060',
                color: '#fff',
                border: 'none',
                fontSize: 11,
                fontWeight: 700,
                padding: '9px 18px',
                borderRadius: 3,
                cursor: 'pointer',
              }}
            >
              Done
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span
              onClick={() => setDeleteMode(true)}
              style={{ fontSize: 10, color: '#a09080', cursor: 'pointer', textDecoration: 'underline', textDecorationColor: '#d8d0c4' }}
            >
              {deletedCount > 0
                ? `${deletedCount} label${deletedCount !== 1 ? 's' : ''} removed · Edit →`
                : 'Remove a label →'}
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
