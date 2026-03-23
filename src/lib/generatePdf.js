// src/lib/generatePdf.js
// Generates a downloadable PDF of the Rensume taxonomy card using jsPDF.
// Currently hardcoded to Bordeaux theme — theme support to be added once rendering is stable.

import { jsPDF } from 'jspdf'
import { getSeniorityLabel } from './classifier'

// ─── Bordeaux color palette ───────────────────────────────────────────────────

const C = {
  headerBg:    [44,  48,  56],   // #2c3038
  accent:      [144, 64,  96],   // #904060
  logoText:    [144, 64,  96],   // #904060
  summaryText: [144, 154, 168],  // #909aa8
  bodyBg:      [250, 248, 244],  // #faf8f4
  sectionText: [96,  88,  80],   // #605850
  divider:     [216, 208, 200],  // #d8d0c8
  yearsText:   [160, 152, 136],  // #a09888
  pillFnBg:    [44,  48,  56],   // #2c3038
  pillFnText:  [200, 112, 144],  // #c87090
  pillKaBg:    [144, 64,  96],   // #904060
  pillKaText:  [26,  8,   16],   // #1a0810
  pillIndBg:   [237, 234, 230],  // #edeae6
  pillIndText: [64,  56,  48],   // #403830
  pillIndBdr:  [200, 192, 184],  // #c8c0b8
  strengthsBg: [245, 241, 235],  // #f5f1eb
  strengthsTxt:[80,  64,  48],   // #504030
  toolBg:      [237, 234, 230],  // #edeae6
  toolText:    [64,  56,  48],   // #403830
  toolBdr:     [200, 192, 184],  // #c8c0b8
  credType:    [160, 144, 128],  // #a09080
  credName:    [26,  20,  16],   // #1a1410
  credSub:     [112, 96,  80],   // #706050
  footerBg:    [250, 248, 244],  // #faf8f4
  footerLeft:  [176, 168, 152],  // #b0a898
  footerRight: [104, 40,  72],   // #682848
  black:       [0,   0,   0],
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const F = 'helvetica'

function fill(doc, rgb)  { doc.setFillColor(...rgb) }
function txt(doc, rgb)   { doc.setTextColor(...rgb) }
function drw(doc, rgb)   { doc.setDrawColor(...rgb) }

// ─── Main export ──────────────────────────────────────────────────────────────

export function downloadCardPdf(profile, themeName = 'bordeaux') {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })

  const M  = 16
  const W  = 210 - M * 2
  const X  = M

  const {
    summary = '',
    strengths = '',
    functions = [],
    knowledge_areas = [],
    industries = [],
    tools = [],
    credentials = [],
  } = profile

  let y = M

  // ── HEADER ─────────────────────────────────────────────────────────────────

  fill(doc, C.headerBg)
  doc.rect(X, y, W, 30, 'F')

  txt(doc, C.logoText)
  doc.setFont(F, 'bold')
  doc.setFontSize(6)
  doc.text('RENSUME · TAXONOMY PROFILE', X + 5, y + 7)

  txt(doc, C.summaryText)
  doc.setFont(F, 'normal')
  doc.setFontSize(8)
  const sumLines = doc.splitTextToSize(summary, W - 12)
  doc.text(sumLines, X + 5, y + 13)

  y += 30

  // ── ACCENT RULE ────────────────────────────────────────────────────────────

  fill(doc, C.accent)
  doc.rect(X, y, W, 1.5, 'F')
  y += 1.5

  // ── BODY BACKGROUND ────────────────────────────────────────────────────────

  fill(doc, C.bodyBg)
  doc.rect(X, y, W, 297 - y - M, 'F')
  y += 7

  // ── SECTION HELPER ─────────────────────────────────────────────────────────

  function section(label) {
    drw(doc, C.divider)
    doc.setLineWidth(0.2)
    doc.line(X + 5, y + 4, X + W - 5, y + 4)
    txt(doc, C.sectionText)
    doc.setFont(F, 'bold')
    doc.setFontSize(6)
    doc.text(label.toUpperCase(), X + 5, y + 3.5)
    y += 8
  }

  // ── PILL ROW HELPER ────────────────────────────────────────────────────────

  function pillRow(label, years, bgRgb, textRgb, borderRgb = null) {
    doc.setFont(F, 'bold')
    doc.setFontSize(7)
    const pillW = Math.min(doc.getTextWidth(label) + 10, 100)
    const pillH = 7

    fill(doc, bgRgb)
    doc.roundedRect(X + 5, y, pillW, pillH, 1.5, 1.5, 'F')

    if (borderRgb) {
      drw(doc, borderRgb)
      doc.setLineWidth(0.2)
      doc.roundedRect(X + 5, y, pillW, pillH, 1.5, 1.5, 'S')
    }

    txt(doc, textRgb)
    doc.setFont(F, 'bold')
    doc.setFontSize(7)
    doc.text(label, X + 5 + pillW / 2, y + 4.8, { align: 'center' })

    txt(doc, C.yearsText)
    doc.setFont(F, 'normal')
    doc.setFontSize(7)
    doc.text(`${years}y`, X + W - 6, y + 4.8, { align: 'right' })

    y += pillH + 3
  }

  // ── FUNCTION ───────────────────────────────────────────────────────────────

  if (functions.length) {
    section('Function')
    functions.forEach(fn => {
      pillRow(getSeniorityLabel(fn.name, fn.years), fn.years, C.pillFnBg, C.pillFnText)
    })
    y += 2
  }

  // ── KNOWLEDGE AREA ─────────────────────────────────────────────────────────

  if (knowledge_areas.length) {
    section('Knowledge area')
    knowledge_areas.forEach(ka => {
      pillRow(ka.name, ka.years, C.pillKaBg, C.pillKaText)
    })
    y += 2
  }

  // ── INDUSTRY ───────────────────────────────────────────────────────────────

  if (industries.length) {
    section('Industry')
    industries.forEach(ind => {
      pillRow(ind.name, ind.years, C.pillIndBg, C.pillIndText, C.pillIndBdr)
    })
    y += 2
  }

  // ── STRENGTHS ──────────────────────────────────────────────────────────────

  if (strengths) {
    section('Strengths')
    const strLines = doc.splitTextToSize(strengths, W - 18)
    const strH = strLines.length * 4.8 + 6
    fill(doc, C.strengthsBg)
    doc.rect(X + 5, y, W - 10, strH, 'F')
    txt(doc, C.strengthsTxt)
    doc.setFont(F, 'normal')
    doc.setFontSize(8)
    doc.text(strLines, X + 9, y + 5)
    y += strH + 4
  }

  // ── TOOLS ──────────────────────────────────────────────────────────────────

  if (tools.length) {
    section('Tooling & methods')
    let tx = X + 5
    tools.forEach(tool => {
      doc.setFont(F, 'bold')
      doc.setFontSize(6.5)
      const tw = doc.getTextWidth(tool) + 8
      if (tx + tw > X + W - 5) { tx = X + 5; y += 9 }
      fill(doc, C.toolBg)
      doc.roundedRect(tx, y, tw, 6.5, 1, 1, 'F')
      drw(doc, C.toolBdr)
      doc.setLineWidth(0.2)
      doc.roundedRect(tx, y, tw, 6.5, 1, 1, 'S')
      txt(doc, C.toolText)
      doc.text(tool, tx + tw / 2, y + 4.5, { align: 'center' })
      tx += tw + 3
    })
    y += 12
  }

  // ── CREDENTIALS ────────────────────────────────────────────────────────────

  if (credentials.length) {
    section('Education & credentials')
    credentials.forEach(c => {
      const typeLabel = (c.type || '').toUpperCase()

      txt(doc, C.credType)
      doc.setFont(F, 'bold')
      doc.setFontSize(6)
      doc.text(typeLabel, X + 5, y + 4)
      const typeW = doc.getTextWidth(typeLabel + ' ')

      txt(doc, C.credName)
      doc.setFont(F, 'bold')
      doc.setFontSize(8)
      doc.text(c.name || '', X + 7 + typeW, y + 4)
      const nameW = doc.getTextWidth(c.name || '')

      if (c.institution || c.year) {
        txt(doc, C.credSub)
        doc.setFont(F, 'normal')
        doc.setFontSize(7.5)
        const extra = [c.institution, c.year].filter(Boolean).join(' · ')
        doc.text(` · ${extra}`, X + 7 + typeW + nameW, y + 4)
      }
      y += 9
    })
    y += 2
  }

  // ── FOOTER ─────────────────────────────────────────────────────────────────

  fill(doc, C.footerBg)
  doc.rect(X, y, W, 10, 'F')
  drw(doc, C.divider)
  doc.setLineWidth(0.2)
  doc.line(X, y, X + W, y)

  txt(doc, C.footerLeft)
  doc.setFont(F, 'normal')
  doc.setFontSize(6.5)
  doc.text('Candidate-owned · read-only for recruiters', X + 5, y + 6.5)

  txt(doc, C.footerRight)
  doc.setFont(F, 'bold')
  doc.setFontSize(6.5)
  doc.text('RENSUME', X + W - 5, y + 6.5, { align: 'right' })

  // ── SAVE ───────────────────────────────────────────────────────────────────

  doc.save(`rensume-card-${themeName}-${Date.now()}.pdf`)
}
