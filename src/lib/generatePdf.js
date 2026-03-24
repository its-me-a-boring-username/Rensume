// src/lib/generatePdf.js
// Rensume card PDF — jsPDF, A4, Bordeaux theme.
// Layout:
//   Header (dark band) → Strengths (full-width parchment band) → accent rule
//   Left col  — Function Levels (bar + evidence) + Knowledge Areas (bar only)
//   Right col — Industries (bar only) + Tools + Credentials
//
// Evidence rules:
//   - Function levels: show evidence (dropped if card would exceed one page)
//   - Knowledge areas + Industries: label + years only, never evidence

import { jsPDF } from 'jspdf'
import { getSeniorityLabel } from './classifier'

// ─── Colors ───────────────────────────────────────────────────────────────────

const C = {
  headerBg:     [44,  48,  56],
  accent:       [144, 64,  96],
  logoText:     [144, 64,  96],
  summaryText:  [200, 208, 220],  // brighter blue-grey for bold helv on dark
  bodyBg:       [250, 248, 244],
  sectionLabel: [80,  72,  64],
  divider:      [216, 208, 200],
  years:        [120, 110, 96],
  barFn:        [44,  48,  56],
  labelFn:      [32,  36,  44],
  barKa:        [144, 64,  96],
  labelKa:      [120, 48,  72],
  barInd:       [180, 172, 164],
  labelInd:     [48,  40,  32],
  evidenceText: [80,  70,  60],
  strengthsBg:  [245, 241, 235],
  strengthsTxt: [56,  44,  32],
  strengthsLbl: [80,  72,  64],
  toolBg:       [237, 234, 230],
  toolText:     [48,  40,  32],
  toolBdr:      [200, 192, 184],
  credType:     [120, 104, 88],
  credName:     [20,  14,  10],
  credSub:      [88,  72,  58],
  footerLeft:   [140, 130, 116],
  footerRight:  [104, 40,  72],
}

// ─── Layout ───────────────────────────────────────────────────────────────────

const PAGE_W  = 210
const PAGE_H  = 297
const MARGIN  = 14
const GUTTER  = 7
const COL_W   = (PAGE_W - MARGIN * 2 - GUTTER) / 2
const COL_L   = MARGIN
const COL_R   = MARGIN + COL_W + GUTTER
const FULL_W  = PAGE_W - MARGIN * 2   // full content width for spanning sections
const ACC_H   = 2
const FOOT_H  = 9
const FOOT_Y  = PAGE_H - FOOT_H
const HELV    = 'helvetica'

// ─── Typography ───────────────────────────────────────────────────────────────

const T = {
  logo:      { font: HELV, style: 'bold',   pt: 7.5  },
  summary:   { font: HELV, style: 'bold',   pt: 11.5 },  // bold helv, notably larger
  section:   { font: HELV, style: 'bold',   pt: 7.5  },
  barLabel:  { font: HELV, style: 'bold',   pt: 10   },
  barYears:  { font: HELV, style: 'normal', pt: 9.5  },
  evidence:  { font: HELV, style: 'normal', pt: 9    },
  strengths: { font: HELV, style: 'normal', pt: 9    },
  tool:      { font: HELV, style: 'bold',   pt: 8.5  },
  credType:  { font: HELV, style: 'bold',   pt: 7    },
  credName:  { font: HELV, style: 'bold',   pt: 10   },
  credSub:   { font: HELV, style: 'normal', pt: 8.5  },
  footer:    { font: HELV, style: 'normal', pt: 7    },
}

// ─── Spacing ──────────────────────────────────────────────────────────────────

function lhFn(pt, ratio) { return pt * 0.3528 * ratio }

const SP = {
  barH:           lhFn(T.barLabel.pt, 1.7),
  barToEvidence:  2.5,
  evidenceLH:     lhFn(T.evidence.pt, 1.45),
  evidenceToNext: 2,
  noEvidenceGap:  3,
  sectionToFirst: 7,
  sectionGap:     4,
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sf(doc, t) {
  doc.setFont(t.font, t.style)
  doc.setFontSize(t.pt)
}

function lh(pt, ratio = 1.5) {
  return pt * 0.3528 * ratio
}

function paintBodyBg(doc) {
  doc.setFillColor(...C.bodyBg)
  doc.rect(0, 0, PAGE_W, PAGE_H, 'F')
}

function drawFooter(doc) {
  doc.setDrawColor(...C.divider)
  doc.setLineWidth(0.3)
  doc.line(MARGIN, FOOT_Y, MARGIN + FULL_W, FOOT_Y)
  sf(doc, T.footer)
  doc.setTextColor(...C.footerLeft)
  doc.text('Candidate-owned · read-only for recruiters', MARGIN, FOOT_Y + 5.5)
  doc.setFont(HELV, 'bold')
  doc.setTextColor(...C.footerRight)
  doc.text('RENSUME', MARGIN + FULL_W, FOOT_Y + 5.5, { align: 'right' })
}

function parseEvidence(str) {
  if (!str) return []
  return str
    .split(/\n/)
    .flatMap(line => line.split(/(?=·)/))
    .map(s => s.trim())
    .filter(Boolean)
}

// ─── Dry-run height estimate ───────────────────────────────────────────────────

function estimateHeight(doc, profile, bodyStartY) {
  const { functions = [], knowledge_areas = [], industries = [], tools = [], credentials = [] } = profile
  const SECTION_GAP = SP.sectionGap + 9

  let leftH = bodyStartY
  if (functions.length) {
    leftH += SECTION_GAP
    functions.forEach(fn => {
      sf(doc, T.evidence)
      const evLines = parseEvidence(fn.evidence)
      const wrapped = evLines.flatMap(l => doc.splitTextToSize(l, COL_W - 8))
      const evH = wrapped.length > 0
        ? SP.barToEvidence + wrapped.length * SP.evidenceLH + SP.evidenceToNext
        : 0
      leftH += SP.barH + evH + SP.noEvidenceGap
    })
  }
  if (knowledge_areas.length) {
    leftH += SECTION_GAP
    leftH += knowledge_areas.length * (SP.barH + SP.noEvidenceGap)
  }

  let rightH = bodyStartY
  if (industries.length) {
    rightH += SECTION_GAP
    rightH += industries.length * (SP.barH + SP.noEvidenceGap)
  }
  if (tools.length) {
    const CHIP_H = 7, CHIP_PX = 5, CHIP_GAP = 3
    let tx = 0, rows = 1
    tools.forEach(tool => {
      sf(doc, T.tool)
      const tw = doc.getTextWidth(tool) + CHIP_PX * 2
      if (tx + tw > COL_W) { rows++; tx = 0 }
      tx += tw + CHIP_GAP
    })
    rightH += SECTION_GAP + rows * (CHIP_H + CHIP_GAP) + 7
  }
  if (credentials.length) {
    rightH += SECTION_GAP
    credentials.forEach(cred => {
      rightH += lh(T.credType.pt, 1.7) + lh(T.credName.pt, 1.4)
        + (cred.institution || cred.year ? lh(T.credSub.pt, 1.4) : 0) + 5
    })
  }

  return Math.max(leftH, rightH)
}

// ─── Column factory ───────────────────────────────────────────────────────────

function makeColumn(doc, colX, startPage, reusePages) {
  let y    = 0
  let page = startPage

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
    sf(doc, T.section)
    doc.setTextColor(...C.sectionLabel)
    doc.text(label.toUpperCase(), colX, y)
    doc.setDrawColor(...C.divider)
    doc.setLineWidth(0.3)
    doc.line(colX, y + 3, colX + COL_W, y + 3)
    y += SP.sectionToFirst
  }

  function barRow(label, yearsVal, barColor, labelColor, evidence, showEvidence) {
    const BAR_W = 3.5
    const BAR_R = 1
    const ROW_H = SP.barH

    let evWrapped = []
    if (showEvidence && evidence) {
      sf(doc, T.evidence)
      evWrapped = parseEvidence(evidence).flatMap(l =>
        doc.splitTextToSize(l, COL_W - BAR_W - 7)
      )
    }
    const evBlockH = evWrapped.length > 0
      ? SP.barToEvidence + evWrapped.length * SP.evidenceLH + SP.evidenceToNext
      : 0

    checkPage(ROW_H + evBlockH + SP.noEvidenceGap)

    doc.setFillColor(...barColor)
    doc.roundedRect(colX, y, BAR_W, ROW_H, BAR_R, BAR_R, 'F')

    sf(doc, T.barLabel)
    doc.setTextColor(...labelColor)
    doc.text(label, colX + BAR_W + 5, y + ROW_H / 2 + lh(T.barLabel.pt, 0.38))

    sf(doc, T.barYears)
    doc.setTextColor(...labelColor)
    doc.text(`${yearsVal}y`, colX + COL_W, y + ROW_H / 2 + lh(T.barYears.pt, 0.38), { align: 'right' })

    y += ROW_H

    if (evWrapped.length > 0) {
      y += SP.barToEvidence
      sf(doc, T.evidence)
      doc.setTextColor(...C.evidenceText)
      evWrapped.forEach(line => { doc.text(line, colX + BAR_W + 5, y); y += SP.evidenceLH })
      y += SP.evidenceToNext
    } else {
      y += SP.noEvidenceGap
    }
  }

  return { setY: v => { y = v }, getY: () => y, getPage: () => page, goToPage, section, barRow, checkPage }
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

  paintBodyBg(doc)

  // ── HEADER — dark band, logo label + bold summary ─────────────────────────
  sf(doc, T.summary)
  const sumLines = doc.splitTextToSize(summary, FULL_W - 2)
  const SUM_LH   = lh(T.summary.pt, 1.45)
  const PAD_T    = 7
  const PAD_M    = 4
  const PAD_B    = 7
  const LOGO_H   = lh(T.logo.pt, 1)
  const HDR_H    = PAD_T + LOGO_H + PAD_M + sumLines.length * SUM_LH + PAD_B

  doc.setFillColor(...C.headerBg)
  doc.rect(0, 0, PAGE_W, HDR_H, 'F')

  sf(doc, T.logo)
  doc.setTextColor(...C.logoText)
  doc.text('RENSUME · TAXONOMY PROFILE', MARGIN, PAD_T + LOGO_H)

  sf(doc, T.summary)
  doc.setTextColor(...C.summaryText)
  const sumY = PAD_T + LOGO_H + PAD_M + SUM_LH * 0.82
  sumLines.forEach((line, i) => doc.text(line, MARGIN, sumY + i * SUM_LH))

  // ── STRENGTHS — full-width parchment band, between header and columns ─────
  let strengthsBandH = 0
  if (strengths) {
    sf(doc, T.strengths)
    const strLines = doc.splitTextToSize(strengths, FULL_W - 10)
    const STR_LH   = lh(T.strengths.pt, 1.55)
    const BOX_PY   = 6
    const BOX_PX   = 5
    strengthsBandH = strLines.length * STR_LH + BOX_PY * 2

    doc.setFillColor(...C.strengthsBg)
    doc.rect(0, HDR_H, PAGE_W, strengthsBandH, 'F')

    // Hairline dividers top and bottom of strengths band
    doc.setDrawColor(...C.divider)
    doc.setLineWidth(0.3)
    doc.line(0, HDR_H, PAGE_W, HDR_H)
    doc.line(0, HDR_H + strengthsBandH, PAGE_W, HDR_H + strengthsBandH)

    sf(doc, T.strengths)
    doc.setTextColor(...C.strengthsTxt)
    strLines.forEach((line, i) =>
      doc.text(line, MARGIN + BOX_PX, HDR_H + BOX_PY + STR_LH * 0.82 + i * STR_LH)
    )
  }

  // ── ACCENT RULE — after strengths band ────────────────────────────────────
  const accentY = HDR_H + strengthsBandH
  doc.setFillColor(...C.accent)
  doc.rect(0, accentY, PAGE_W, ACC_H, 'F')

  const BODY_Y = accentY + ACC_H + 10

  // ── Dry run: one-page check for function evidence ─────────────────────────
  // Evidence always shown — no dry-run
  const showEvidence = true

  // ── LEFT column ────────────────────────────────────────────────────────────
  const left = makeColumn(doc, COL_L, 1, false)
  left.setY(BODY_Y)

  if (functions.length) {
    left.section('Function Levels')
    functions.forEach(fn =>
      left.barRow(
        getSeniorityLabel(fn.name, fn.years), fn.years,
        C.barFn, C.labelFn, fn.evidence, showEvidence
      )
    )
    left.setY(left.getY() + SP.sectionGap)
  }

  if (knowledge_areas.length) {
    left.section('Knowledge Areas')
    knowledge_areas.forEach(ka =>
      left.barRow(ka.name, ka.years, C.barKa, C.labelKa, null, false)
    )
  }

  // ── RIGHT column ───────────────────────────────────────────────────────────
  const right = makeColumn(doc, COL_R, 1, true)
  doc.setPage(1)
  right.setY(BODY_Y)

  if (industries.length) {
    right.section('Industries')
    industries.forEach(ind =>
      right.barRow(ind.name, ind.years, C.barInd, C.labelInd, null, false)
    )
    right.setY(right.getY() + SP.sectionGap)
  }

  // Tools
  if (tools.length) {
    right.checkPage(24)
    let ry = right.getY()

    sf(doc, T.section)
    doc.setTextColor(...C.sectionLabel)
    doc.text('TOOLING & METHODS', COL_R, ry)
    doc.setDrawColor(...C.divider)
    doc.setLineWidth(0.3)
    doc.line(COL_R, ry + 3, COL_R + COL_W, ry + 3)
    right.setY(ry + SP.sectionToFirst)

    const CHIP_H = 7, CHIP_PX = 5, CHIP_GAP = 3
    let tx = COL_R

    tools.forEach(tool => {
      sf(doc, T.tool)
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
      sf(doc, T.tool)
      doc.text(tool, tx + tw / 2, ry + CHIP_H / 2 + lh(T.tool.pt, 0.38), { align: 'center' })
      tx += tw + CHIP_GAP
    })
    right.setY(right.getY() + CHIP_H + SP.sectionGap + 2)
  }

  // Credentials
  if (credentials.length) {
    right.checkPage(22)
    let ry = right.getY()

    sf(doc, T.section)
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
      const name      = cred.name || ''
      const sub       = [cred.institution, cred.year].filter(Boolean).join(' · ')

      sf(doc, T.credType)
      doc.setTextColor(...C.credType)
      doc.text(typeLabel, COL_R, ry)
      ry += lh(T.credType.pt, 1.7)

      sf(doc, T.credName)
      doc.setTextColor(...C.credName)
      doc.splitTextToSize(name, COL_W).forEach(nl => { doc.text(nl, COL_R, ry); ry += lh(T.credName.pt, 1.4) })

      if (sub) {
        sf(doc, T.credSub)
        doc.setTextColor(...C.credSub)
        doc.splitTextToSize(sub, COL_W - 4).forEach(sl => { doc.text(sl, COL_R + 4, ry); ry += lh(T.credSub.pt, 1.4) })
      }

      ry += 5
      right.setY(ry)
    })
  }

  // Footer on every page
  const total = doc.getNumberOfPages()
  for (let p = 1; p <= total; p++) { doc.setPage(p); drawFooter(doc) }

  doc.save(`rensume-card-${themeName}-${Date.now()}.pdf`)
}
