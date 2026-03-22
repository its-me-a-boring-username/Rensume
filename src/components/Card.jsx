// src/components/Card.jsx
// The Rensume taxonomy card. Used on the generate page, candidate portal,
// public card page, and recruiter slide-out. Pass showEvidence to enable
// expandable evidence rows (used on the public card page).

import { useState } from 'react'
import { getSeniorityLabel } from '../lib/classifier'

// ─── Theme definitions ────────────────────────────────────────────────────────

export const THEMES = {
  bordeaux: {
    label: 'Bordeaux',
    dot: '#904060',
    card: { border: '1px solid #281020' },
    header: { background: '#2c3038' },
    accent: { background: '#904060' },
    logo: { color: '#904060' },
    summary: { color: '#909aa8' },
    body: { background: '#faf8f4' },
    section: { color: '#605850', borderBottom: '0.5px solid #d8d0c8' },
    pillFn: { background: '#2c3038', color: '#c87090' },
    pillKa: { background: '#904060', color: '#1a0810' },
    pillInd: { background: '#edeae6', color: '#403830', border: '0.5px solid #c8c0b8' },
    years: { color: '#a09888' },
    footer: { background: '#faf8f4', borderTop: '0.5px solid #d8d0c8' },
    footerLeft: { color: '#b0a898' },
    footerRight: { color: '#682848', fontWeight: 700, letterSpacing: '.1em' },
  },
  ember: {
    label: 'Ember',
    dot: '#a84040',
    card: { border: '1px solid #281818' },
    header: { background: '#2c3038' },
    accent: { background: '#a84040' },
    logo: { color: '#a84040' },
    summary: { color: '#909aa8' },
    body: { background: '#faf8f4' },
    section: { color: '#605850', borderBottom: '0.5px solid #d8d0c8' },
    pillFn: { background: '#2c3038', color: '#d07070' },
    pillKa: { background: '#a84040', color: '#1a0808' },
    pillInd: { background: '#edeae6', color: '#403830', border: '0.5px solid #c8c0b8' },
    years: { color: '#a09888' },
    footer: { background: '#faf8f4', borderTop: '0.5px solid #d8d0c8' },
    footerLeft: { color: '#b0a898' },
    footerRight: { color: '#802828', fontWeight: 700, letterSpacing: '.1em' },
  },
  oxford: {
    label: 'Oxford',
    dot: '#3a6aaa',
    card: { border: '1px solid #101828' },
    header: { background: '#182030' },
    accent: { background: '#3a6aaa' },
    logo: { color: '#3a6aaa' },
    summary: { color: '#8090a8' },
    body: { background: '#f7f9fb' },
    section: { color: '#485868', borderBottom: '0.5px solid #c8d0d8' },
    pillFn: { background: '#182030', color: '#80b0e0' },
    pillKa: { background: '#3a6aaa', color: '#080c18' },
    pillInd: { background: '#e8eaed', color: '#303848', border: '0.5px solid #b8c0c8' },
    years: { color: '#8898a8' },
    footer: { background: '#f7f9fb', borderTop: '0.5px solid #c8d0d8' },
    footerLeft: { color: '#90a0b0' },
    footerRight: { color: '#284880', fontWeight: 700, letterSpacing: '.1em' },
  },
  gilt: {
    label: 'Gilt',
    dot: '#c8a96e',
    card: { border: '1px solid #201808' },
    header: { background: '#111111' },
    accent: { background: '#c8a96e' },
    logo: { color: '#c8a96e' },
    summary: { color: '#909090' },
    body: { background: '#faf8f4' },
    section: { color: '#706050', borderBottom: '0.5px solid #d8d0c4' },
    pillFn: { background: '#111111', color: '#c8a96e' },
    pillKa: { background: '#c8a96e', color: '#111111' },
    pillInd: { background: '#eeece8', color: '#484038', border: '0.5px solid #ccc8c0' },
    years: { color: '#a09070' },
    footer: { background: '#faf8f4', borderTop: '0.5px solid #d8d0c4' },
    footerLeft: { color: '#b0a890' },
    footerRight: { color: '#906830', fontWeight: 700, letterSpacing: '.1em' },
  },
  sterling: {
    label: 'Sterling',
    dot: '#8898a8',
    card: { border: '1px solid #202428' },
    header: { background: '#252a30' },
    accent: { background: '#8898a8' },
    logo: { color: '#8898a8' },
    summary: { color: '#8090a0' },
    body: { background: '#f8f9fa' },
    section: { color: '#505860', borderBottom: '0.5px solid #c8ccd0' },
    pillFn: { background: '#252a30', color: '#b0c0d0' },
    pillKa: { background: '#8898a8', color: '#111111' },
    pillInd: { background: '#eaecee', color: '#383c42', border: '0.5px solid #c0c4c8' },
    years: { color: '#8898a8' },
    footer: { background: '#f8f9fa', borderTop: '0.5px solid #c8ccd0' },
    footerLeft: { color: '#9098a0' },
    footerRight: { color: '#506070', fontWeight: 700, letterSpacing: '.1em' },
  },
}

export const THEME_KEYS = Object.keys(THEMES)

// ─── Expandable evidence row ──────────────────────────────────────────────────

function EvidenceRow({ pill, years, evidence, t, showEvidence }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ borderBottom: '0.5px solid #f0ece8' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '5px 0',
          cursor: showEvidence && evidence ? 'pointer' : 'default',
        }}
        onClick={() => showEvidence && evidence && setOpen(o => !o)}
      >
        <span style={{ ...pill, padding: '3px 9px', borderRadius: 3, fontSize: 9, fontWeight: 700, display: 'inline-block' }}>
          {t.label}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ ...years, fontSize: 8.5 }}>{t.years}y</span>
          {showEvidence && evidence && (
            <span style={{ fontSize: 8, color: '#904060' }}>{open ? '▾' : '›'} Evidence</span>
          )}
        </div>
      </div>
      {open && evidence && (
        <div style={{
          background: '#f8f5f0',
          borderRadius: 4,
          padding: '8px 10px',
          marginBottom: 6,
          fontSize: 9,
          color: '#605040',
          lineHeight: 1.65,
          fontStyle: 'italic',
        }}>
          {evidence}
        </div>
      )}
    </div>
  )
}

// ─── Card ─────────────────────────────────────────────────────────────────────

/**
 * The Rensume taxonomy card.
 *
 * Props:
 *   profile     — classified profile object from classifier.js
 *   theme       — one of THEME_KEYS (default 'bordeaux')
 *   showEvidence — whether evidence rows are expandable (default false)
 *   style       — optional container style overrides
 */
export default function Card({ profile, theme = 'bordeaux', showEvidence = false, style = {} }) {
  const t = THEMES[theme] || THEMES.bordeaux

  if (!profile) return null

  const { summary, functions = [], knowledge_areas = [], industries = [], strengths, tools = [], credentials = [] } = profile

  return (
    <div style={{ borderRadius: 8, overflow: 'hidden', fontFamily: '-apple-system, Arial, sans-serif', ...t.card, ...style }}>

      {/* Header */}
      <div style={{ ...t.header, padding: '14px 18px' }}>
        <div style={{ ...t.logo, fontSize: 7, fontWeight: 700, letterSpacing: '.16em', marginBottom: 6 }}>
          RENSUME · TAXONOMY PROFILE
        </div>
        <div style={{ ...t.summary, fontSize: 10, lineHeight: 1.55 }}>
          {summary}
        </div>
      </div>

      {/* Accent rule */}
      <div style={{ ...t.accent, height: 3 }} />

      {/* Body */}
      <div style={{ ...t.body, padding: '12px 18px' }}>

        {/* Function */}
        {functions.length > 0 && (
          <div>
            <div style={{ ...t.section, fontSize: 7, fontWeight: 700, letterSpacing: '.13em', textTransform: 'uppercase', marginBottom: 5, paddingBottom: 3 }}>
              Function
            </div>
            {functions.map((fn, i) => (
              <EvidenceRow
                key={i}
                t={{ label: getSeniorityLabel(fn.name, fn.years), years: fn.years }}
                pill={t.pillFn}
                years={t.years}
                evidence={fn.evidence}
                showEvidence={showEvidence}
              />
            ))}
          </div>
        )}

        {/* Knowledge area */}
        {knowledge_areas.length > 0 && (
          <div style={{ marginTop: 10 }}>
            <div style={{ ...t.section, fontSize: 7, fontWeight: 700, letterSpacing: '.13em', textTransform: 'uppercase', marginBottom: 5, paddingBottom: 3 }}>
              Knowledge area
            </div>
            {knowledge_areas.map((ka, i) => (
              <EvidenceRow
                key={i}
                t={{ label: ka.name, years: ka.years }}
                pill={t.pillKa}
                years={t.years}
                evidence={ka.evidence}
                showEvidence={showEvidence}
              />
            ))}
          </div>
        )}

        {/* Industry */}
        {industries.length > 0 && (
          <div style={{ marginTop: 10 }}>
            <div style={{ ...t.section, fontSize: 7, fontWeight: 700, letterSpacing: '.13em', textTransform: 'uppercase', marginBottom: 5, paddingBottom: 3 }}>
              Industry
            </div>
            {industries.map((ind, i) => (
              <EvidenceRow
                key={i}
                t={{ label: ind.name, years: ind.years }}
                pill={t.pillInd}
                years={t.years}
                evidence={ind.evidence}
                showEvidence={showEvidence}
              />
            ))}
          </div>
        )}

        {/* Strengths */}
        {strengths && (
          <div style={{ marginTop: 12, background: '#f5f1eb', borderRadius: 4, padding: '10px 12px' }}>
            <div style={{ ...t.section, fontSize: 7, fontWeight: 700, letterSpacing: '.13em', textTransform: 'uppercase', marginBottom: 6, paddingBottom: 3 }}>
              Strengths
            </div>
            <div style={{ fontSize: 10, color: '#504030', lineHeight: 1.7 }}>{strengths}</div>
          </div>
        )}

        {/* Tools */}
        {tools.length > 0 && (
          <div style={{ marginTop: 10 }}>
            <div style={{ ...t.section, fontSize: 7, fontWeight: 700, letterSpacing: '.13em', textTransform: 'uppercase', marginBottom: 6, paddingBottom: 3 }}>
              Tooling &amp; methods
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {tools.map((tool, i) => (
                <span key={i} style={{ background: '#edeae6', color: '#403830', border: '0.5px solid #c8c0b8', padding: '2px 7px', borderRadius: 3, fontSize: 8, fontWeight: 700 }}>
                  {tool}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Credentials */}
        {credentials.length > 0 && (
          <div style={{ marginTop: 10 }}>
            <div style={{ ...t.section, fontSize: 7, fontWeight: 700, letterSpacing: '.13em', textTransform: 'uppercase', marginBottom: 6, paddingBottom: 3 }}>
              Education &amp; credentials
            </div>
            {credentials.map((c, i) => (
              <div key={i} style={{ fontSize: 9.5, color: '#1a1410', marginBottom: 4 }}>
                <span style={{ fontSize: 8, fontWeight: 700, color: '#a09080', textTransform: 'uppercase', letterSpacing: '.08em', marginRight: 6 }}>{c.type}</span>
                <strong>{c.name}</strong>
                {c.institution && <span style={{ color: '#706050' }}> · {c.institution}</span>}
                {c.year && <span style={{ color: '#a09080' }}> · {c.year}</span>}
              </div>
            ))}
          </div>
        )}

      </div>

      {/* Footer */}
      <div style={{ ...t.footer, padding: '8px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ ...t.footerLeft, fontSize: 7.5 }}>Candidate-owned · read-only for recruiters</span>
        <span style={{ ...t.footerRight, fontSize: 7.5 }}>RENSUME</span>
      </div>

    </div>
  )
}
