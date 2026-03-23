// src/lib/generatePdf.js
// Rensume card PDF generator — jsPDF, A4, Bordeaux theme.
// Patterns drawn from Lyminal PDF generator (pdfWrap, checkPage, font-before-measure).

import { jsPDF } from 'jspdf'
import { getSeniorityLabel } from './classifier'

// ─── Colors (Bordeaux) ────────────────────────────────────────────────────────

const C = {
  headerBg:    [44,  48,  56],
  accent:      [144, 64,  96],
  logoText:    [144, 64,  96],
  summaryText: [144, 154, 168],
  bodyBg:      [250, 248, 244],
  sectionLabel:[96,  88,  80],
  divider:     [216, 208, 200],
  years:       [160, 152, 136],
  pillFnBg:    [44,  48,  56],
  pillFnText:  [200, 112, 144],
  pillKaBg:    [144, 64,  96],
  pillKaText:  [26,  8,   16],
  pillIndBg:   [237, 234, 230],
  pillIndText: [64,  56,  48],
  pillIndBdr:  [200, 192, 184],
  strengthsBg: [245, 241, 235],
  strengthsTxt:[80,  64,  48],
  toolBg:      [237, 234, 230],
  toolText:    [64,  56,  48],
  toolBdr:     [200, 192, 184],
  credType:    [160, 144, 128],
  credName:    [26,  20,  16],
  credSub:     [112, 96,  80],
  footerLeft:  [176, 168, 152],
  footerRight: [104, 40,  72],
}

// ─── Layout constants ─────────────────────────────────────────────────────────

const MARGIN  = 14
const PAGE_W  = 210
const PAGE_H  = 297
const CW      = PAGE_W - MARGIN * 2   // 182mm
const X       = MARGIN
const ACC_H   = 1.5
const FOOT_H  = 9
const FOOT_Y  = PAGE_H - FOOT_H       // 288mm
const FONT    = 'helvetica'

// ─── Shared helpers ───────────────────────────────────────────────────────────

// Always set font + size before any text operation (Lyminal rule)
function sf(doc, style, pt) {
  doc.setFont(FONT, style)
  doc.setFontSize(pt)
}

// Wrap + draw text block; returns final y
function pdfWrap(doc, text, style, pt, color, x, y, maxW, lineH) {
  sf(doc, style, pt)
  doc.setTextColor(...color)
  const lines = doc.splitTextToSize(text || '', maxW)
  lines.forEach(line => { doc.text(line, x, y); y += lineH })
  return y
}

// Draw footer — separated so checkPage can call it before addPage
function drawFooter(doc) {
  doc.setDrawColor(...C.divider)
  doc.setLineWidth(0.25)
  doc.line(X, FOOT_Y, X + CW, FOOT_Y)
  sf(doc, 'normal', 6.5)
  doc.setTextColor(...C.footerLeft)
  doc.text('Candidate-owned · read-only for recruiters', X, FOOT_Y + 5.5)
  sf(doc, 'bold', 6.5)
  doc.setTextColor(...C.footerRight)
  doc.text('RENSUME', X + CW, FOOT_Y + 5.5, { align: 'right' })
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function downloadCardPdf(profile, themeName = 'bordeaux') {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })

  const {
    summary         = '',
    strengths       = '',
    functions       = [],
    knowledge_areas = [],
    industries      = [],
    tools           = [],
    credentials     = [],
  } = profile

  // ── Full-page body background ──────────────────────────────────────────────
  doc.setFillColor(...C.bodyBg)
  doc.rect(0, 0, PAGE_W, PAGE_H, 'F')

  // ── Measure summary to size header dynamically ────────────────────────────
  // (Lyminal pattern: measure before drawing so band height is exactly right)
  sf(doc, 'normal', 8)
  const sumLines    = doc.splitTextToSize(summary, CW - 2)
  const SUM_LINE_H  = 4.4
  const PAD_TOP     = 6      // above logo
  const PAD_MID     = 4      // logo to summary
  const PAD_BOT     = 6      // below summary
  const LOGO_H      = 4
  const HDR_H       = PAD_TOP + LOGO_H + PAD_MID + sumLines.length * SUM_LINE_H + PAD_BOT

  // ── Header — full bleed, flush to page top ─────────────────────────────────
  doc.setFillColor(...C.headerBg)
  doc.rect(0, 0, PAGE_W, HDR_H, 'F')

  sf(doc, 'bold', 5.5)
  doc.setTextColor(...C.logoText)
  doc.text('RENSUME · TAXONOMY PROFILE', X, PAD_TOP + LOGO_H)

  const sumStartY = PAD_TOP + LOGO_H + PAD_MID + SUM_LINE_H * 0.8
  sf(doc, 'normal', 8)
  doc.setTextColor(...C.summaryText)
  sumLines.forEach((line, i) => doc.text(line, X, sumStartY + i * SUM_LINE_H))

  // ── Accent rule ────────────────────────────────────────────────────────────
  doc.setFillColor(...C.accent)
  doc.rect(0, HDR_H, PAGE_W, ACC_H, 'F')

  // ── Content cursor ─────────────────────────────────────────────────────────
  let y = HDR_H + ACC_H + 8

  // Lyminal-style checkPage closure — captures y, draws footer, adds page
  function checkPage(neededMm = 14) {
    if (y + neededMm > FOOT_Y - 3) {
      drawFooter(doc)
      doc.addPage()
      doc.setFillColor(...C.bodyBg)
      doc.rect(0, 0, PAGE_W, PAGE_H, 'F')
      y = MARGIN + 4
    }
  }

  // ── Section heading ────────────────────────────────────────────────────────
  function section(label) {
    checkPage(16)
    sf(doc, 'bold', 6)
    doc.setTextColor(...C.sectionLabel)
    doc.text(label.toUpperCase(), X, y)
    doc.setDrawColor(...C.divider)
    doc.setLineWidth(0.25)
    doc.line(X, y + 2, X + CW, y + 2)
    y += 7.5
  }

  // ── Pill row — label left, years right ────────────────────────────────────
  function pillRow(label, yearsVal, bgRgb, textRgb, borderRgb) {
    checkPage(10)

    const PILL_H  = 6.5
    const PILL_PX = 5.5

    // CRITICAL: set font before getTextWidth (Lyminal rule)
    sf(doc, 'bold', 7)
    const labelW = doc.getTextWidth(label)
    const pillW  = Math.min(labelW + PILL_PX * 2, CW * 0.70)

    // Background fill
    doc.setFillColor(...bgRgb)
    doc.roundedRect(X, y, pillW, PILL_H, 1.5, 1.5, 'F')

    // Border (industry pills only)
    if (borderRgb) {
      doc.setDrawColor(...borderRgb)
      doc.setLineWidth(0.25)
      doc.roundedRect(X, y, pillW, PILL_H, 1.5, 1.5, 'S')
    }

    // Label text — font already set above so centering is exact
    doc.setTextColor(...textRgb)
    doc.text(label, X + pillW / 2, y + PILL_H / 2 + 1.2, { align: 'center' })

    // Years
    sf(doc, 'normal', 7.5)
    doc.setTextColor(...C.years)
    doc.text(`${yearsVal}y`, X + CW, y + PILL_H / 2 + 1.2, { align: 'right' })

    y += PILL_H + 3
  }

  // ── FUNCTION ───────────────────────────────────────────────────────────────
  if (functions.length) {
    section('Function')
    functions.forEach(fn =>
      pillRow(getSeniorityLabel(fn.name, fn.years), fn.years, C.pillFnBg, C.pillFnText)
    )
    y += 2
  }

  // ── KNOWLEDGE AREA ─────────────────────────────────────────────────────────
  if (knowledge_areas.length) {
    section('Knowledge Area')
    knowledge_areas.forEach(ka =>
      pillRow(ka.name, ka.years, C.pillKaBg, C.pillKaText)
    )
    y += 2
  }

  // ── INDUSTRY ───────────────────────────────────────────────────────────────
  if (industries.length) {
    section('Industry')
    industries.forEach(ind =>
      pillRow(ind.name, ind.years, C.pillIndBg, C.pillIndText, C.pillIndBdr)
    )
    y += 2
  }

  // ── STRENGTHS ──────────────────────────────────────────────────────────────
  if (strengths) {
    section('Strengths')

    // Measure before drawing (Lyminal pattern)
    sf(doc, 'normal', 8)
    const strLines = doc.splitTextToSize(strengths, CW - 10)
    const LINE_H   = 4.6
    const PAD_Y    = 5.5
    const boxH     = strLines.length * LINE_H + PAD_Y * 2

    checkPage(boxH + 4)
    doc.setFillColor(...C.strengthsBg)
    doc.rect(X, y, CW, boxH, 'F')
    sf(doc, 'normal', 8)
    doc.setTextColor(...C.strengthsTxt)
    strLines.forEach((line, i) =>
      doc.text(line, X + 5, y + PAD_Y + LINE_H * 0.85 + i * LINE_H)
    )
    y += boxH + 5
  }

  // ── TOOLING & METHODS ──────────────────────────────────────────────────────
  if (tools.length) {
    section('Tooling & Methods')

    const CHIP_H   = 5.8
    const CHIP_PX  = 4.5
    const CHIP_GAP = 2.5
    let tx = X

    tools.forEach(tool => {
      // Font before measure
      sf(doc, 'bold', 6.5)
      const tw = doc.getTextWidth(tool) + CHIP_PX * 2

      if (tx + tw > X + CW) {
        tx = X
        y += CHIP_H + CHIP_GAP
        checkPage(CHIP_H + 4)
      }

      doc.setFillColor(...C.toolBg)
      doc.roundedRect(tx, y, tw, CHIP_H, 1, 1, 'F')
      doc.setDrawColor(...C.toolBdr)
      doc.setLineWidth(0.2)
      doc.roundedRect(tx, y, tw, CHIP_H, 1, 1, 'S')
      doc.setTextColor(...C.toolText)
      sf(doc, 'bold', 6.5)
      doc.text(tool, tx + tw / 2, y + CHIP_H / 2 + 1.1, { align: 'center' })

      tx += tw + CHIP_GAP
    })
    y += CHIP_H + 6
  }

  // ── EDUCATION & CREDENTIALS ────────────────────────────────────────────────
  if (credentials.length) {
    section('Education & Credentials')

    credentials.forEach(cred => {
      checkPage(10)

      const typeLabel = (cred.type || '').toUpperCase()
      const name      = cred.name || ''
      const sub       = [cred.institution, cred.year].filter(Boolean).join(' · ')
      const baseline  = y + 4.5

      // Type badge
      sf(doc, 'bold', 5.5)
      doc.setTextColor(...C.credType)
      doc.text(typeLabel, X, baseline)
      const typeW = doc.getTextWidth(typeLabel)

      // Name
      sf(doc, 'bold', 8)
      doc.setTextColor(...C.credName)
      doc.text(name, X + typeW + 2.5, baseline)
      const nameW = doc.getTextWidth(name)

      // Institution + year — check if it fits on same line
      if (sub) {
        const subStr = '  ·  ' + sub
        sf(doc, 'normal', 7.5)
        doc.setTextColor(...C.credSub)
        const fits = typeW + 2.5 + nameW + doc.getTextWidth(subStr) <= CW
        if (fits) {
          doc.text(subStr, X + typeW + 2.5 + nameW, baseline)
          y += 8.5
        } else {
          y += 6
          pdfWrap(doc, sub, 'normal', 7.5, C.credSub, X + 4, y + 3.5, CW - 4, 4.5)
          y += 7
        }
      } else {
        y += 8.5
      }
    })
  }

  // ── Footer on every page ───────────────────────────────────────────────────
  const totalPages = doc.getNumberOfPages()
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p)
    drawFooter(doc)
  }

  doc.save(`rensume-card-${themeName}-${Date.now()}.pdf`)
}
