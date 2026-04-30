// src/components/Card.jsx
// The Rensume taxonomy card.
//
// Font stack: IBM Plex Sans everywhere








import { useState, useEffect } from 'react'
import { getSeniorityLabel } from '../lib/classifier'

// ─── Google Fonts loader ──────────────────────────────────────────────────────

function InjectFonts() {
  useEffect(() => {
    const id = 'rensume-fonts'
    if (document.getElementById(id)) return
    const link = document.createElement('link')
    link.id   = id
    link.rel  = 'stylesheet'
    link.href = 'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:ital,wght@0,400;0,600;0,700;1,400;1,700&display=swap'
    document.head.appendChild(link)
  }, [])
  return null
}

// ─── Font constants ───────────────────────────────────────────────────────────

const F = {
  headline:  "'IBM Plex Sans', Arial, sans-serif",
  label:     "'IBM Plex Sans', Arial, sans-serif",
  body:      "'IBM Plex Sans', Arial, sans-serif",
}

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
    barFn:  { background: '#2c3038' }, labelFn:  { color: '#2c3038' },
    barKa:  { background: '#904060' }, labelKa:  { color: '#904060' },
    barInd: { background: '#c8c0b8' }, labelInd: { color: '#403830' },
    years: { color: '#a09888' },
    evidenceText: { color: '#706050' },
    strengthsBg: { background: '#f5f1eb', borderBottom: '0.5px solid #d8d0c4' },
    strengthsText: { color: '#504030' },
    footer: { background: '#faf8f4', borderTop: '0.5px solid #d8d0c8' },
    footerLeft: { color: '#b0a898' },
    footerRight: { color: '#682848' },
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
    barFn:  { background: '#2c3038' }, labelFn:  { color: '#2c3038' },
    barKa:  { background: '#a84040' }, labelKa:  { color: '#a84040' },
    barInd: { background: '#c8c0b8' }, labelInd: { color: '#403830' },
    years: { color: '#a09888' },
    evidenceText: { color: '#706050' },
    strengthsBg: { background: '#f5f1eb', borderBottom: '0.5px solid #d8d0c4' },
    strengthsText: { color: '#504030' },
    footer: { background: '#faf8f4', borderTop: '0.5px solid #d8d0c8' },
    footerLeft: { color: '#b0a898' },
    footerRight: { color: '#802828' },
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
    barFn:  { background: '#182030' }, labelFn:  { color: '#182030' },
    barKa:  { background: '#3a6aaa' }, labelKa:  { color: '#3a6aaa' },
    barInd: { background: '#b8c0c8' }, labelInd: { color: '#303848' },
    years: { color: '#8898a8' },
    evidenceText: { color: '#485868' },
    strengthsBg: { background: '#edf1f5', borderBottom: '0.5px solid #c8d0d8' },
    strengthsText: { color: '#283848' },
    footer: { background: '#f7f9fb', borderTop: '0.5px solid #c8d0d8' },
    footerLeft: { color: '#90a0b0' },
    footerRight: { color: '#284880' },
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
    barFn:  { background: '#111111' }, labelFn:  { color: '#111111' },
    barKa:  { background: '#c8a96e' }, labelKa:  { color: '#7a6030' },
    barInd: { background: '#ccc8c0' }, labelInd: { color: '#484038' },
    years: { color: '#a09070' },
    evidenceText: { color: '#706050' },
    strengthsBg: { background: '#f5f0e8', borderBottom: '0.5px solid #d8d0c4' },
    strengthsText: { color: '#504030' },
    footer: { background: '#faf8f4', borderTop: '0.5px solid #d8d0c4' },
    footerLeft: { color: '#b0a890' },
    footerRight: { color: '#906830' },
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
    barFn:  { background: '#252a30' }, labelFn:  { color: '#252a30' },
    barKa:  { background: '#8898a8' }, labelKa:  { color: '#505860' },
    barInd: { background: '#c0c4c8' }, labelInd: { color: '#383c42' },
    years: { color: '#8898a8' },
    evidenceText: { color: '#505860' },
    strengthsBg: { background: '#edeef0', borderBottom: '0.5px solid #c8ccd0' },
    strengthsText: { color: '#383c42' },
    footer: { background: '#f8f9fa', borderTop: '0.5px solid #c8ccd0' },
    footerLeft: { color: '#9098a0' },
    footerRight: { color: '#506070' },
  },
}

export const THEME_KEYS = Object.keys(THEMES)

// ─── Size scales ─────────────────────────────────────────────────────────────

const PDF_S = {
  logoText: 7,      logoMb: 8,
  summary: 13,
  sectionLabel: 6.5, sectionMb: 5,  sectionPb: 3,
  strengthsText: 9,  strengthsPad: '8px 18px 10px',
  headerPad: '14px 18px',
  bodyPad: '12px 18px', colGap: '0 16px',
  barLabel: 10, barYears: 10,
  barW: 3, barH: 13, barGap: 6,
  rowPad: '4px 0', rowMb: 2,
  evidenceText: 9, evidencePad: '2px 0 6px 9px',
  toolChip: 8, toolPad: '2px 6px', toolGap: 3,
  credType: 6.5, credName: 9.5, credSub: 8.5, credMb: 7,
  footerText: 7, footerPad: '7px 18px',
}

const WEB_S = {
  logoText: 10,     logoMb: 12,
  summary: 20,
  sectionLabel: 9,  sectionMb: 10, sectionPb: 5,
  strengthsText: 13, strengthsPad: '16px 32px 20px',
  headerPad: '28px 32px',
  bodyPad: '24px 32px', colGap: '0 40px',
  barLabel: 15, barYears: 14,
  barW: 4, barH: 18, barGap: 10,
  rowPad: '7px 0', rowMb: 4,
  evidenceText: 12, evidencePad: '4px 0 14px 14px',
  toolChip: 11, toolPad: '4px 10px', toolGap: 6,
  credType: 9, credName: 13, credSub: 11.5, credMb: 12,
  footerText: 9, footerPad: '12px 32px',
}

// ─── Bar row (label left, years right, evidence below) ────────────────────────

function BarRow({ label, years, barColor, labelColor, yearsColor, evidence, showEvidence, s }) {
  return (
    <div style={{ marginBottom: s.rowMb }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: s.rowPad }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: s.barGap }}>
          <span style={{ width: s.barW, height: s.barH, borderRadius: 1, background: barColor, flexShrink: 0, display: 'inline-block' }} />
          <span style={{ fontFamily: F.label, fontWeight: 700, fontSize: s.barLabel, color: labelColor }}>
            {label}
          </span>
        </span>
        <span style={{ fontFamily: F.label, fontWeight: 700, fontSize: s.barYears, color: yearsColor }}>{years}y</span>
      </div>
      {showEvidence && evidence && (
        <div style={{ fontFamily: F.body, fontSize: s.evidenceText, lineHeight: 1.65, padding: s.evidencePad, color: '#706050' }}>
          {evidence}
        </div>
      )}
    </div>
  )
}

// ─── Card ─────────────────────────────────────────────────────────────────────

export default function Card({ profile, theme = 'bordeaux', showEvidence = false, web = false, style = {} }) {
  const t = THEMES[theme] || THEMES.bordeaux
  const s = web ? WEB_S : PDF_S
  if (!profile) return null

  const { summary, functions = [], knowledge_areas = [], industries = [], strengths, tools = [], credentials = [] } = profile

  const sectionLabel = (text) => (
    <div style={{ ...t.section, fontFamily: F.body, fontSize: s.sectionLabel, fontWeight: 700, letterSpacing: '.13em', textTransform: 'uppercase', marginBottom: s.sectionMb, paddingBottom: s.sectionPb }}>
      {text}
    </div>
  )

  return (
    <div style={{ borderRadius: 8, overflow: 'hidden', fontFamily: F.body, ...t.card, ...style }}>
      <InjectFonts />

      {/* Header */}
      <div style={{ ...t.header, padding: s.headerPad }}>
        <div style={{ ...t.logo, fontFamily: F.body, fontSize: s.logoText, fontWeight: 700, letterSpacing: '.16em', marginBottom: s.logoMb, textTransform: 'uppercase' }}>
          Rensume · Taxonomy Profile
        </div>
        <div style={{ ...t.summary, fontFamily: F.headline, fontWeight: 700, fontSize: s.summary, lineHeight: 1.35 }}>
          {summary}
        </div>
      </div>

      {/* Accent rule */}
      <div style={{ ...t.accent, height: 2 }} />

      {/* Strengths */}
      {strengths && (
        <div style={{ ...t.strengthsBg, padding: s.strengthsPad }}>
          {sectionLabel('Strengths')}
          <div style={{ ...t.strengthsText, fontFamily: F.body, fontSize: s.strengthsText, lineHeight: 1.65 }}>
            {strengths}
          </div>
        </div>
      )}

      {/* Body — two columns */}
      <div style={{ ...t.body, padding: s.bodyPad, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: s.colGap }}>

        {/* LEFT: Function Levels */}
        {functions.length > 0 && (
          <div>
            {sectionLabel('Function Levels')}
            {[...functions].sort((a, b) => {
              const ORDER = ['Strategic Executive', 'Strategic Advisor', 'Strategic Manager', 'People Manager', 'Process Manager', 'Process Specialist']
              const ai = ORDER.findIndex(l => a.name.includes(l))
              const bi = ORDER.findIndex(l => b.name.includes(l))
              return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
            }).map((fn, i) => (
              <BarRow key={i} s={s}
                label={getSeniorityLabel(fn.name, fn.years)} years={fn.years}
                barColor={t.barFn.background} labelColor={t.labelFn.color} yearsColor={t.labelFn.color}
                evidence={fn.evidence} showEvidence={showEvidence}
              />
            ))}
          </div>
        )}

        {/* RIGHT: Industries */}
        {industries.length > 0 && (
          <div>
            {sectionLabel('Industries')}
            {industries.map((ind, i) => (
              <BarRow key={i} s={s}
                label={ind.name} years={ind.years}
                barColor={t.barInd.background} labelColor={t.labelInd.color} yearsColor={t.labelInd.color}
                evidence={ind.evidence} showEvidence={showEvidence}
              />
            ))}
          </div>
        )}

        {/* LEFT continued: Knowledge Areas */}
        {knowledge_areas.length > 0 && (
          <div style={{ marginTop: s.sectionMb }}>
            {sectionLabel('Knowledge Areas')}
            {knowledge_areas.map((ka, i) => (
              <BarRow key={i} s={s}
                label={ka.name} years={ka.years}
                barColor={t.barKa.background} labelColor={t.labelKa.color} yearsColor={t.labelKa.color}
                evidence={ka.evidence} showEvidence={showEvidence}
              />
            ))}
          </div>
        )}

        {/* RIGHT continued: Tools + Credentials */}
        <div style={{ marginTop: s.sectionMb }}>
          {tools.length > 0 && (
            <div>
              {sectionLabel('Tooling & Methods')}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: s.toolGap, marginBottom: s.sectionMb }}>
                {tools.map((tool, i) => (
                  <span key={i} style={{ fontFamily: F.body, fontSize: s.toolChip, fontWeight: 700, padding: s.toolPad, borderRadius: 2, background: '#edeae6', color: '#403830', border: '1px solid #c8c0b8' }}>
                    {tool}
                  </span>
                ))}
              </div>
            </div>
          )}

          {credentials.length > 0 && (
            <div>
              {sectionLabel('Education & Credentials')}
              {credentials.map((c, i) => (
                <div key={i} style={{ marginBottom: s.credMb }}>
                  <div style={{ fontFamily: F.body, fontSize: s.credType, fontWeight: 700, color: t.years.color, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 1 }}>
                    {c.type}
                  </div>
                  <div style={{ fontFamily: F.label, fontWeight: 700, fontSize: s.credName, color: '#1a1410' }}>
                    {c.name}
                  </div>
                  {(c.institution || c.year) && (
                    <div style={{ fontFamily: F.body, fontSize: s.credSub, color: t.evidenceText.color }}>
                      {[c.institution, c.year].filter(Boolean).join(' · ')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Footer */}
      <div style={{ ...t.footer, padding: s.footerPad, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ ...t.footerLeft, fontFamily: F.body, fontSize: s.footerText }}>Candidate-owned · read-only for recruiters</span>
        <span style={{ ...t.footerRight, fontFamily: F.body, fontSize: s.footerText, fontWeight: 700, letterSpacing: '.1em' }}>RENSUME</span>
      </div>

    </div>
  )
}
