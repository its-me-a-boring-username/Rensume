// src/lib/generatePdf.js
// Rensume card PDF — jsPDF, A4, Bordeaux theme.
// Two-column layout: Left = Function + Knowledge Area | Right = Industry + Strengths + Tools + Credentials
// Evidence text rendered under each pill row.

import { jsPDF } from 'jspdf'
import { getSeniorityLabel } from './classifier'

// ─── Colors (Bordeaux) ────────────────────────────────────────────────────────

const C = {
  headerBg:     [44,  48,  56],
  accent:       [144, 64,  96],
  logoText:     [144, 64,  96],
  summaryText:  [144, 154, 168],
  bodyBg:       [250, 248, 244],
  sectionLabel: [96,  88,  80],
  divider:      [216, 208, 200],
  years:        [160, 152, 136],
  pillFnBg:     [44,  48,  56],
  pillFnText:   [200, 112, 144],
  pillKaBg:     [144, 64,  96],
  pillKaText:   [26,  8,   16],
  pillIndBg:    [237, 234, 230],
  pillIndText:  [64,  56,  48],
  pillIndBdr:   [200, 192, 184],
  evidenceText: [120, 108, 96],   // slightly warmer than sectionLabel
  strengthsBg:  [245, 241, 235],
  strengthsTxt: [80,  64,  48],
  toolBg:       [237, 234, 230],
  toolText:     [64,  56,  48],
  toolBdr:      [200, 192, 184],
  credType:     [160, 144, 128],
  credName:     [26,  20,  16],
  credSub:      [112, 96,  80],
  footerLeft:   [176, 168, 152],
  footerRight:  [104, 40,  72],
}

// ─── Layout ───────────────────────────────────────────────────────────────────

const PAGE_W  = 210
const PAGE_H  = 297
const MARGIN  = 14
const GUTTER  = 6
const COL_W   = (PAGE_W - MARGIN * 2 - GUTTER) / 2  // ~88mm each
const COL_L   = MARGIN                                // left col x
const COL_R   = MARGIN + COL_W + GUTTER              // right col x
const ACC_H   = 1.5
const FOOT_H  = 9
const FOOT_Y  = PAGE_H - FOOT_H
const FONT    = 'helvetica'

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Always set font before text ops (Lyminal pattern)
function sf(doc, style, pt) {
  doc.setFont(FONT, style)
  doc.setFontSize(pt)
}

// Draw footer — called before addPage and at the end
function drawFooter(doc) {
  doc.setDrawColor(...C.divider)
  doc.setLineWidth(0.25)
  doc.line(MARGIN, FOOT_Y, MARGIN + COL_W * 2 + GUTTER, FOOT_Y)
  sf(doc, 'normal', 6.5)
  doc.setTextColor(...C.footerLeft)
  doc.text('Candidate-owned · read-only for recruiters', MARGIN, FOOT_Y + 5.5)
  sf(doc, 'bold', 6.5)
  doc.setTextColor(...C.footerRight)
  doc.text('RENSUME', MARGIN + COL_W * 2 + GUTTER, FOOT_Y + 5.5, { align: 'right' })
}

// Parse evidence string into individual bullet lines.
// Evidence is either "· Company: 'quote'\n· Company: 'quote'" or a plain sentence.
function parseEvidence(str) {
  if (!str) return []
  const trimmed = str.trim()
  // Split on newline-prefixed bullets or mid-string bullets
  const parts = trimmed.split(/\n/).flatMap(line => {
    const sub = line.split(/(?=·)/).map(s => s.trim()).filter(Boolean)
    return sub.length > 0 ? sub : [line.trim()]
  }).filter(Boolean)
  return parts
}

// ─── Column renderer factory ───────────────────────────────────────────────────
// Returns drawing helpers scoped to a column's x position and y cursor.

function makeColumn(doc, colX) {
  let y = 0   // set by caller after header

  function checkPage(neededMm = 14) {
    if (y + neededMm > FOOT_Y - 3) {
      drawFooter(doc)
      doc.addPage()
      // Repaint bg
      doc.setFillColor(...C.bodyBg)
      doc.rect(0, 0, PAGE_W, PAGE_H, 'F')
      y = MARGIN + 4
    }
  }

  // Section heading with full-col-width underline
  function section(label) {
    checkPage(18)
    sf(doc, 'bold', 6)
    doc.setTextColor(...C.sectionLabel)
    doc.text(label.toUpperCase(), colX, y)
    doc.setDrawColor(...C.divider)
    doc.setLineWidth(0.25)
    doc.line(colX, y + 2, colX + COL_W, y + 2)
    y += 8    // section label height + breathing room before first pill
  }

  // Pill + years row, then evidence text beneath
  function pillRow(label, yearsVal, bgRgb, textRgb, borderRgb, evidence) {
    const PILL_H   = 7
    const PILL_PX  = 6
    const PILL_PT  = 8       // pill font size — larger than before
    const EV_PT    = 6.5
    const EV_LH    = 3.8
    const EV_INDENT = 3      // indent from col left

    // Measure pill width — font BEFORE getTextWidth
    sf(doc, 'bold', PILL_PT)
    const labelW = doc.getTextWidth(label)
    const pillW  = Math.min(labelW + PILL_PX * 2, COL_W * 0.82)

    // Parse evidence to estimate height for checkPage
    const evLines = parseEvidence(evidence)
    const evWrapped = evLines.flatMap(line => {
      sf(doc, 'normal', EV_PT)
      return doc.splitTextToSize(line, COL_W - EV_INDENT)
    })
    const evH = evWrapped.length > 0 ? evWrapped.length * EV_LH + 3 : 0

    checkPage(PILL_H + evH + 5)

    // ── Pill background ──
    doc.setFillColor(...bgRgb)
    doc.roundedRect(colX, y, pillW, PILL_H, 1.5, 1.5, 'F')

    // ── Pill border (industry pills) ──
    if (borderRgb) {
      doc.setDrawColor(...borderRgb)
      doc.setLineWidth(0.25)
      doc.roundedRect(colX, y, pillW, PILL_H, 1.5, 1.5, 'S')
    }

    // ── Pill label — font already set so width was accurate ──
    doc.setTextColor(...textRgb)
    sf(doc, 'bold', PILL_PT)
    doc.text(label, colX + pillW / 2, y + PILL_H / 2 + 1.4, { align: 'center' })

    // ── Years — right edge of column ──
    sf(doc, 'normal', 8)
    doc.setTextColor(...C.years)
    doc.text(`${yearsVal}y`, colX + COL_W, y + PILL_H / 2 + 1.4, { align: 'right' })

    y += PILL_H + 2.5

    // ── Evidence text ──
    if (evWrapped.length > 0) {
      sf(doc, 'normal', EV_PT)
      doc.setTextColor(...C.evidenceText)
      evWrapped.forEach(line => {
        doc.text(line, colX + EV_INDENT, y)
        y += EV_LH
      })
      y += 2   // gap after evidence block
    }

    y += 3   // gap before next pill
  }

  return {
    setY: (val) => { y = val },
    getY: () => y,
    section,
    pillRow,
    checkPage,
    raw: () => ({ y, colX }),  // expose for custom drawing
  }
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

  // ── Measure summary to size header exactly (font before split) ─────────────
  sf(doc, 'normal', 8.5)
  const sumLines   = doc.splitTextToSize(summary, PAGE_W - MARGIN * 2 - 2)
  const SUM_LH     = 4.8
  const PAD_TOP    = 6.5
  const PAD_MID    = 4
  const PAD_BOT    = 6.5
  const LOGO_H     = 4
  const HDR_H      = PAD_TOP + LOGO_H + PAD_MID + sumLines.length * SUM_LH + PAD_BOT

  // ── Header — full bleed, flush to top ─────────────────────────────────────
  doc.setFillColor(...C.headerBg)
  doc.rect(0, 0, PAGE_W, HDR_H, 'F')

  sf(doc, 'bold', 5.5)
  doc.setTextColor(...C.logoText)
  doc.text('RENSUME · TAXONOMY PROFILE', MARGIN, PAD_TOP + LOGO_H)

  const sumY = PAD_TOP + LOGO_H + PAD_MID + SUM_LH * 0.8
  sf(doc, 'normal', 8.5)
  doc.setTextColor(...C.summaryText)
  sumLines.forEach((line, i) => doc.text(line, MARGIN, sumY + i * SUM_LH))

  // ── Accent rule ────────────────────────────────────────────────────────────
  doc.setFillColor(...C.accent)
  doc.rect(0, HDR_H, PAGE_W, ACC_H, 'F')

  // ── Set body start y for both columns ─────────────────────────────────────
  const bodyStartY = HDR_H + ACC_H + 9

  // ── Column instances ───────────────────────────────────────────────────────
  const left  = makeColumn(doc, COL_L)
  const right = makeColumn(doc, COL_R)
  left.setY(bodyStartY)
  right.setY(bodyStartY)

  // ── LEFT: Function ─────────────────────────────────────────────────────────
  if (functions.length) {
    left.section('Function')
    functions.forEach(fn =>
      left.pillRow(
        getSeniorityLabel(fn.name, fn.years),
        fn.years,
        C.pillFnBg,
        C.pillFnText,
        null,
        fn.evidence
      )
    )
    left.setY(left.getY() + 3)
  }

  // ── LEFT: Knowledge Area ───────────────────────────────────────────────────
  if (knowledge_areas.length) {
    left.section('Knowledge Area')
    knowledge_areas.forEach(ka =>
      left.pillRow(
        ka.name,
        ka.years,
        C.pillKaBg,
        C.pillKaText,
        null,
        ka.evidence
      )
    )
  }

  // ── RIGHT: Industry ────────────────────────────────────────────────────────
  if (industries.length) {
    right.section('Industry')
    industries.forEach(ind =>
      right.pillRow(
        ind.name,
        ind.years,
        C.pillIndBg,
        C.pillIndText,
        C.pillIndBdr,
        ind.evidence
      )
    )
    right.setY(right.getY() + 3)
  }

  // ── RIGHT: Strengths ───────────────────────────────────────────────────────
  if (strengths) {
    right.checkPage(20)
    const ry = right.getY()

    sf(doc, 'bold', 6)
    doc.setTextColor(...C.sectionLabel)
    doc.text('STRENGTHS', COL_R, ry)
    doc.setDrawColor(...C.divider)
    doc.setLineWidth(0.25)
    doc.line(COL_R, ry + 2, COL_R + COL_W, ry + 2)

    const strY = ry + 9
    sf(doc, 'normal', 8)
    const strLines = doc.splitTextToSize(strengths, COL_W - 8)
    const LINE_H   = 4.5
    const PAD_Y    = 5
    const boxH     = strLines.length * LINE_H + PAD_Y * 2

    doc.setFillColor(...C.strengthsBg)
    doc.rect(COL_R, strY, COL_W, boxH, 'F')
    sf(doc, 'normal', 8)
    doc.setTextColor(...C.strengthsTxt)
    strLines.forEach((line, i) =>
      doc.text(line, COL_R + 4, strY + PAD_Y + LINE_H * 0.85 + i * LINE_H)
    )
    right.setY(strY + boxH + 6)
  }

  // ── RIGHT: Tooling & Methods ───────────────────────────────────────────────
  if (tools.length) {
    right.checkPage(20)
    let ry = right.getY()

    sf(doc, 'bold', 6)
    doc.setTextColor(...C.sectionLabel)
    doc.text('TOOLING & METHODS', COL_R, ry)
    doc.setDrawColor(...C.divider)
    doc.setLineWidth(0.25)
    doc.line(COL_R, ry + 2, COL_R + COL_W, ry + 2)
    ry += 8.5

    const CHIP_H   = 6
    const CHIP_PX  = 4.5
    const CHIP_GAP = 2.5
    let tx = COL_R

    tools.forEach(tool => {
      sf(doc, 'bold', 7)
      const tw = doc.getTextWidth(tool) + CHIP_PX * 2
      if (tx + tw > COL_R + COL_W) {
        tx = COL_R
        ry += CHIP_H + CHIP_GAP
        right.checkPage(CHIP_H + 4)
      }
      doc.setFillColor(...C.toolBg)
      doc.roundedRect(tx, ry, tw, CHIP_H, 1, 1, 'F')
      doc.setDrawColor(...C.toolBdr)
      doc.setLineWidth(0.2)
      doc.roundedRect(tx, ry, tw, CHIP_H, 1, 1, 'S')
      doc.setTextColor(...C.toolText)
      sf(doc, 'bold', 7)
      doc.text(tool, tx + tw / 2, ry + CHIP_H / 2 + 1.2, { align: 'center' })
      tx += tw + CHIP_GAP
    })
    right.setY(ry + CHIP_H + 6)
  }

  // ── RIGHT: Education & Credentials ────────────────────────────────────────
  if (credentials.length) {
    right.checkPage(18)
    let ry = right.getY()

    sf(doc, 'bold', 6)
    doc.setTextColor(...C.sectionLabel)
    doc.text('EDUCATION & CREDENTIALS', COL_R, ry)
    doc.setDrawColor(...C.divider)
    doc.setLineWidth(0.25)
    doc.line(COL_R, ry + 2, COL_R + COL_W, ry + 2)
    ry += 8.5

    credentials.forEach(cred => {
      right.checkPage(10)
      ry = right.getY()

      const typeLabel = (cred.type || '').toUpperCase()
      const name      = cred.name || ''
      const sub       = [cred.institution, cred.year].filter(Boolean).join(' · ')
      const baseline  = ry + 4.5

      // Type badge
      sf(doc, 'bold', 5.5)
      doc.setTextColor(...C.credType)
      doc.text(typeLabel, COL_R, baseline)
      const typeW = doc.getTextWidth(typeLabel)

      // Credential name
      sf(doc, 'bold', 8)
      doc.setTextColor(...C.credName)
      doc.text(name, COL_R + typeW + 2.5, baseline)
      const nameW = doc.getTextWidth(name)

      // Institution · year
      if (sub) {
        const subStr = '  ·  ' + sub
        sf(doc, 'normal', 7.5)
        doc.setTextColor(...C.credSub)
        const fits = typeW + 2.5 + nameW + doc.getTextWidth(subStr) <= COL_W
        if (fits) {
          doc.text(subStr, COL_R + typeW + 2.5 + nameW, baseline)
          right.setY(ry + 8.5)
        } else {
          right.setY(ry + 6)
          let sy = right.getY()
          sf(doc, 'normal', 7.5)
          doc.setTextColor(...C.credSub)
          const subLines = doc.splitTextToSize(sub, COL_W - 4)
          subLines.forEach(l => { doc.text(l, COL_R + 4, sy + 3.5); sy += 4.5 })
          right.setY(sy + 2)
        }
      } else {
        right.setY(ry + 8.5)
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
