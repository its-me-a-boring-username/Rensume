// src/lib/generatePdf.js
// Rensume card PDF — jsPDF, A4, Bordeaux theme.
// Font: IBM Plex Sans (embedded via ibmPlexFonts.js)
// Two-column layout:
//   Left  — Function Levels (bar + evidence) + Knowledge Areas (bar + evidence)
//   Right — Industries (bar + evidence) + Tools + Credentials
// Strengths: full-width band between header and columns

import { jsPDF } from 'jspdf'
import { registerIBMPlexSans } from './ibmPlexFonts'
import { getSeniorityLabel } from './classifier'

// ─── Colors (Bordeaux) ───────────────────────────────────────────────────────

const C = {
  headerBg:     [44,  48,  56],
  accent:       [144, 64,  96],
  logoText:     [144, 64,  96],
  summaryText:  [200, 208, 220],
  bodyBg:       [250, 248, 244],
  sectionLabel: [80,  72,  64],
  divider:      [216, 208, 200],
  barFn:        [44,  48,  56],   labelFn:  [44,  48,  56],
  barKa:        [144, 64,  96],   labelKa:  [144, 64,  96],
  barInd:       [180, 172, 164],  labelInd: [48,  40,  32],
  evidenceText: [112, 96,  80],
  strengthsBg:  [245, 241, 235],
  strengthsTxt: [80,  64,  48],
  toolBg:       [237, 234, 230],
  toolText:     [48,  40,  32],
  toolBdr:      [200, 192, 184],
  credType:     [120, 104, 88],
  credName:     [26,  20,  16],
  credSub:      [88,  72,  58],
  footerLeft:   [140, 130, 116],
  footerRight:  [104, 40,  72],
}

// ─── Layout ──────────────────────────────────────────────────────────────────

const PAGE_W  = 210
const PAGE_H  = 297
const MARGIN  = 14
const GUTTER  = 7
const COL_W   = (PAGE_W - MARGIN * 2 - GUTTER) / 2
const COL_L   = MARGIN
const COL_R   = MARGIN + COL_W + GUTTER
const ACC_H   = 2
const FOOT_H  = 9
const FOOT_Y  = PAGE_H - FOOT_H
const IBM     = 'IBMPlexSans'

// ─── Spacing ─────────────────────────────────────────────────────────────────

function lhFn(pt, ratio) { return pt * 0.3528 * ratio }

const SP = {
  barH:           lhFn(10, 1.7),
  barToEvidence:  3,
  evidenceLH:     lhFn(9, 1.5),
  evidenceToNext: 2,
  noEvidenceGap:  4,
  sectionToFirst: 7,
  sectionGap:     4,
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sf(doc, weight, style, pt) {
  const combined = weight === 'bold' && style === 'italic' ? 'bolditalic'
    : weight === 'bold' ? 'bold'
    : style === 'italic' ? 'italic'
    : 'normal'
  doc.setFont(IBM, combined)
  doc.setFontSize(pt)
}

function lh(pt, ratio = 1.5) { return pt * 0.3528 * ratio }

function paintBodyBg(doc) {
  doc.setFillColor(...C.bodyBg)
  doc.rect(0, 0, PAGE_W, PAGE_H, 'F')
}

function drawFooter(doc) {
  doc.setDrawColor(...C.divider)
  doc.setLineWidth(0.3)
  doc.line(MARGIN, FOOT_Y, MARGIN + COL_W * 2 + GUTTER, FOOT_Y)
  sf(doc, 'normal', 'normal', 7)
  doc.setTextColor(...C.footerLeft)
  doc.text('Candidate-owned · read-only for recruiters', MARGIN, FOOT_Y + 5.5)
  sf(doc, 'bold', 'normal', 7)
  doc.setTextColor(...C.footerRight)
  doc.text('RENSUME', MARGIN + COL_W * 2 + GUTTER, FOOT_Y + 5.5, { align: 'right' })
}

function parseEvidence(str) {
  if (!str) return []
  return str
    .split(/\n/)
    .flatMap(line => line.split(/(?=·)/))
    .map(s => s.trim())
    .filter(Boolean)
}

// ─── Column factory ──────────────────────────────────────────────────────────

function makeColumn(doc, colX, startPage, reusePages) {
  let y = 0, page = startPage

  function goToPage(p) { page = p; doc.setPage(p) }

  function checkPage(needed = 18) {
    if (y + needed > FOOT_Y - 4) {
      drawFooter(doc)
      const next = page + 1
      if (reusePages && next <= doc.getNumberOfPages()) {
        goToPage(next)
      } else {
        doc.addPage()
        page = doc.getNumberOfPages()
        paintBodyBg(doc)
      }
      y = MARGIN + 4
    }
  }

  function section(label) {
    checkPage(20)
    sf(doc, 'bold', 'normal', 7)
    doc.setTextColor(...C.sectionLabel)
    doc.text(label.toUpperCase(), colX, y)
    doc.setDrawColor(...C.divider)
    doc.setLineWidth(0.3)
    doc.line(colX, y + 3, colX + COL_W, y + 3)
    y += SP.sectionToFirst
  }

  function barRow(label, yearsVal, barColor, labelColor, evidence) {
    const BAR_W = 3.5, BAR_R = 1
    const ROW_H = SP.barH
    const EV_LH = SP.evidenceLH

    const evLines = parseEvidence(evidence)
    let evWrapped = []
    if (evLines.length > 0) {
      sf(doc, 'normal', 'normal', 9)
      evWrapped = evLines.flatMap(l => doc.splitTextToSize(l, COL_W - BAR_W - 7))
    }
    const evBlockH = evWrapped.length > 0
      ? SP.barToEvidence + evWrapped.length * EV_LH + SP.evidenceToNext
      : 0

    checkPage(ROW_H + evBlockH + SP.noEvidenceGap)

    // Bar
    doc.setFillColor(...barColor)
    doc.roundedRect(colX, y, BAR_W, ROW_H, BAR_R, BAR_R, 'F')

    // Label
    sf(doc, 'bold', 'normal', 10)
    doc.setTextColor(...labelColor)
    doc.text(label, colX + BAR_W + 5, y + ROW_H / 2 + lh(10, 0.38))

    // Years
    sf(doc, 'bold', 'normal', 10)
    doc.setTextColor(...labelColor)
    doc.text(`${yearsVal}y`, colX + COL_W, y + ROW_H / 2 + lh(10, 0.38), { align: 'right' })

    y += ROW_H

    if (evWrapped.length > 0) {
      y += SP.barToEvidence
      sf(doc, 'normal', 'normal', 9)
      doc.setTextColor(...C.evidenceText)
      evWrapped.forEach(line => { doc.text(line, colX + BAR_W + 5, y); y += EV_LH })
      y += SP.evidenceToNext
    } else {
      y += SP.noEvidenceGap
    }
  }

  return { setY: v => { y = v }, getY: () => y, getPage: () => page, goToPage, section, barRow, checkPage }
}

// ─── Main export ─────────────────────────────────────────────────────────────

export function downloadCardPdf(profile, themeName = 'bordeaux') {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })

  // Register IBM Plex Sans
  try {
    registerIBMPlexSans(doc)
  } catch (e) {
    alert('Font registration failed: ' + e.message)
    console.error(e)
    return
  }

  const {
    summary         = '',
    strengths       = '',
    functions       = [],
    knowledge_areas = [],
    industries      = [],
    tools           = [],
    credentials     = [],
  } = profile

  paintBodyBg(doc)

  // ── Header ───────────────────────────────────────────────────────────────
  sf(doc, 'bold', 'normal', 11)
  const sumLines = doc.splitTextToSize(summary, PAGE_W - MARGIN * 2 - 2)
  const SUM_LH   = lh(11, 1.45)
  const PAD_T = 7, PAD_M = 5, PAD_B = 7
  const LOGO_H = lh(7, 1)
  const HDR_H = PAD_T + LOGO_H + PAD_M + sumLines.length * SUM_LH + PAD_B

  doc.setFillColor(...C.headerBg)
  doc.rect(0, 0, PAGE_W, HDR_H, 'F')

  sf(doc, 'bold', 'normal', 7)
  doc.setTextColor(...C.logoText)
  doc.text('RENSUME · TAXONOMY PROFILE', MARGIN, PAD_T + LOGO_H)

  sf(doc, 'bold', 'normal', 11)
  doc.setTextColor(...C.summaryText)
  const sumY = PAD_T + LOGO_H + PAD_M + SUM_LH * 0.82
  sumLines.forEach((line, i) => doc.text(line, MARGIN, sumY + i * SUM_LH))

  // ── Strengths — full-width band ──────────────────────────────────────────
  let strengthsBandH = 0
  if (strengths) {
    sf(doc, 'normal', 'normal', 9)
    const strLines = doc.splitTextToSize(strengths, PAGE_W - MARGIN * 2 - 10)
    const STR_LH   = lh(9, 1.55)
    const BOX_PY   = 5.5
    strengthsBandH = strLines.length * STR_LH + BOX_PY * 2

    doc.setFillColor(...C.strengthsBg)
    doc.rect(0, HDR_H, PAGE_W, strengthsBandH, 'F')
    doc.setDrawColor(...C.divider)
    doc.setLineWidth(0.25)
    doc.line(0, HDR_H + strengthsBandH, PAGE_W, HDR_H + strengthsBandH)

    sf(doc, 'normal', 'normal', 9)
    doc.setTextColor(...C.strengthsTxt)
    strLines.forEach((line, i) =>
      doc.text(line, MARGIN + 5, HDR_H + BOX_PY + STR_LH * 0.82 + i * STR_LH)
    )
  }

  // ── Accent rule ──────────────────────────────────────────────────────────
  const accentY = HDR_H + strengthsBandH
  doc.setFillColor(...C.accent)
  doc.rect(0, accentY, PAGE_W, ACC_H, 'F')

  const BODY_Y = accentY + ACC_H + 10

  // ── Columns ──────────────────────────────────────────────────────────────
  const left  = makeColumn(doc, COL_L, 1, false)
  const right = makeColumn(doc, COL_R, 1, true)
  left.setY(BODY_Y)

  // LEFT: Function Levels
  if (functions.length) {
    left.section('Function Levels')
    functions.forEach(fn =>
      left.barRow(getSeniorityLabel(fn.name, fn.years), fn.years, C.barFn, C.labelFn, fn.evidence)
    )
    left.setY(left.getY() + SP.sectionGap)
  }

  // LEFT: Knowledge Areas
  if (knowledge_areas.length) {
    left.section('Knowledge Areas')
    knowledge_areas.forEach(ka =>
      left.barRow(ka.name, ka.years, C.barKa, C.labelKa, ka.evidence)
    )
  }

  // RIGHT: Industries
  doc.setPage(1)
  right.setY(BODY_Y)

  if (industries.length) {
    right.section('Industries')
    industries.forEach(ind =>
      right.barRow(ind.name, ind.years, C.barInd, C.labelInd, ind.evidence)
    )
    right.setY(right.getY() + SP.sectionGap)
  }

  // RIGHT: Tools
  if (tools.length) {
    right.checkPage(24)
    let ry = right.getY()

    sf(doc, 'bold', 'normal', 7)
    doc.setTextColor(...C.sectionLabel)
    doc.text('TOOLING & METHODS', COL_R, ry)
    doc.setDrawColor(...C.divider)
    doc.setLineWidth(0.3)
    doc.line(COL_R, ry + 3, COL_R + COL_W, ry + 3)
    right.setY(ry + SP.sectionToFirst)

    const CHIP_H = 6.5, CHIP_PX = 4.5, CHIP_GAP = 2.5
    let tx = COL_R

    tools.forEach(tool => {
      sf(doc, 'bold', 'normal', 7.5)
      const tw = doc.getTextWidth(tool) + CHIP_PX * 2
      if (tx + tw > COL_R + COL_W) {
        right.setY(right.getY() + CHIP_H + CHIP_GAP)
        right.checkPage(CHIP_H + 4)
        tx = COL_R
      }
      ry = right.getY()
      doc.setFillColor(...C.toolBg)
      doc.rect(tx, ry, tw, CHIP_H, 'F')
      doc.setDrawColor(...C.toolBdr)
      doc.setLineWidth(0.2)
      doc.rect(tx, ry, tw, CHIP_H, 'S')
      doc.setTextColor(...C.toolText)
      sf(doc, 'bold', 'normal', 7.5)
      doc.text(tool, tx + tw / 2, ry + CHIP_H / 2 + lh(7.5, 0.38), { align: 'center' })
      tx += tw + CHIP_GAP
    })
    right.setY(right.getY() + CHIP_H + SP.sectionGap + 2)
  }

  // RIGHT: Credentials
  if (credentials.length) {
    right.checkPage(22)
    let ry = right.getY()

    sf(doc, 'bold', 'normal', 7)
    doc.setTextColor(...C.sectionLabel)
    doc.text('EDUCATION & CREDENTIALS', COL_R, ry)
    doc.setDrawColor(...C.divider)
    doc.setLineWidth(0.3)
    doc.line(COL_R, ry + 3, COL_R + COL_W, ry + 3)
    ry += SP.sectionToFirst
    right.setY(ry)

    credentials.forEach(cred => {
      right.checkPage(16)
      ry = right.getY()

      const typeLabel = (cred.type || '').toUpperCase()
      const sub = [cred.institution, cred.year].filter(Boolean).join(' · ')

      sf(doc, 'bold', 'normal', 6.5)
      doc.setTextColor(...C.credType)
      doc.text(typeLabel, COL_R, ry)
      ry += lh(6.5, 1.7)

      sf(doc, 'bold', 'normal', 9.5)
      doc.setTextColor(...C.credName)
      doc.splitTextToSize(cred.name || '', COL_W).forEach(nl => {
        doc.text(nl, COL_R, ry); ry += lh(9.5, 1.4)
      })

      if (sub) {
        sf(doc, 'normal', 'normal', 8.5)
        doc.setTextColor(...C.credSub)
        doc.splitTextToSize(sub, COL_W - 4).forEach(sl => {
          doc.text(sl, COL_R + 4, ry); ry += lh(8.5, 1.4)
        })
      }

      ry += 5
      right.setY(ry)
    })
  }

  // Footer on every page
  const total = doc.getNumberOfPages()
  for (let p = 1; p <= total; p++) { doc.setPage(p); drawFooter(doc) }

  try {
    doc.save(`rensume-card-${themeName}-${Date.now()}.pdf`)
  } catch(e) {
    alert('PDF save failed: ' + e.message)
    console.error(e)
  }
}
