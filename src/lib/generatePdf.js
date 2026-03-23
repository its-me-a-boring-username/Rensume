// src/lib/generatePdf.js
// Rensume card PDF — jsPDF, A4, Bordeaux theme.
// Two-column layout:
//   Left  — Function (square tag / style B) + Knowledge Area (accent bar / style A)
//   Right — Industry (neutral bar / style A) + Strengths + Tools + Credentials

import { jsPDF } from 'jspdf'
import { getSeniorityLabel } from './classifier'

// ─── Colors ───────────────────────────────────────────────────────────────────

const C = {
  headerBg:     [44,  48,  56],
  accent:       [144, 64,  96],
  logoText:     [144, 64,  96],
  summaryText:  [144, 154, 168],
  bodyBg:       [250, 248, 244],
  sectionLabel: [96,  88,  80],
  divider:      [216, 208, 200],
  years:        [160, 152, 136],

  // Function — square tag (style B)
  tagFnBg:      [44,  48,  56],
  tagFnText:    [200, 112, 144],
  tagFnYears:   [200, 112, 144],

  // Knowledge area — accent bar (style A)
  barKa:        [144, 64,  96],
  labelKa:      [144, 64,  96],

  // Industry — neutral bar (style A)
  barInd:       [200, 192, 184],
  labelInd:     [64,  56,  48],

  evidenceText: [128, 116, 104],
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
const GUTTER  = 7
const COL_W   = (PAGE_W - MARGIN * 2 - GUTTER) / 2  // ~88.5mm
const COL_L   = MARGIN
const COL_R   = MARGIN + COL_W + GUTTER
const ACC_H   = 2
const FOOT_H  = 9
const FOOT_Y  = PAGE_H - FOOT_H
const FONT    = 'helvetica'

// ─── Typography ───────────────────────────────────────────────────────────────

const T = {
  logo:      { style: 'bold',   pt: 7    },
  summary:   { style: 'normal', pt: 9    },
  section:   { style: 'bold',   pt: 6.5  },
  tag:       { style: 'bold',   pt: 8.5  },  // function square tag
  tagYears:  { style: 'normal', pt: 8    },
  barLabel:  { style: 'bold',   pt: 8.5  },  // KA / industry bar label
  barYears:  { style: 'normal', pt: 8    },
  evidence:  { style: 'normal', pt: 7    },
  strengths: { style: 'normal', pt: 8.5  },
  tool:      { style: 'bold',   pt: 7.5  },
  credType:  { style: 'bold',   pt: 6    },
  credName:  { style: 'bold',   pt: 8.5  },
  credSub:   { style: 'normal', pt: 7.5  },
  footer:    { style: 'normal', pt: 6.5  },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sf(doc, style, pt) {
  doc.setFont(FONT, style)
  doc.setFontSize(pt)
}

// Line height in mm from pt size
function lh(pt, ratio = 1.5) {
  return pt * 0.3528 * ratio
}

function drawFooter(doc) {
  doc.setDrawColor(...C.divider)
  doc.setLineWidth(0.3)
  doc.line(MARGIN, FOOT_Y, MARGIN + COL_W * 2 + GUTTER, FOOT_Y)
  sf(doc, 'normal', T.footer.pt)
  doc.setTextColor(...C.footerLeft)
  doc.text('Candidate-owned · read-only for recruiters', MARGIN, FOOT_Y + 5.5)
  sf(doc, 'bold', T.footer.pt)
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

// ─── Column factory ───────────────────────────────────────────────────────────

function makeColumn(doc, colX) {
  let y = 0

  function checkPage(needed = 16) {
    if (y + needed > FOOT_Y - 4) {
      drawFooter(doc)
      doc.addPage()
      doc.setFillColor(...C.bodyBg)
      doc.rect(0, 0, PAGE_W, PAGE_H, 'F')
      y = MARGIN + 4
    }
  }

  // Section heading + full-width hairline
  function section(label) {
    checkPage(18)
    sf(doc, T.section.style, T.section.pt)
    doc.setTextColor(...C.sectionLabel)
    doc.text(label.toUpperCase(), colX, y)
    doc.setDrawColor(...C.divider)
    doc.setLineWidth(0.3)
    doc.line(colX, y + 2.5, colX + COL_W, y + 2.5)
    y += 8
  }

  // Style B — full-width square tag (function levels)
  function tagRow(label, yearsVal, evidence) {
    const TAG_H  = 8.5
    const TAG_PX = 6

    // Measure evidence height before drawing
    const evLines = parseEvidence(evidence)
    let evWrapped = []
    if (evLines.length > 0) {
      sf(doc, T.evidence.style, T.evidence.pt)
      evWrapped = evLines.flatMap(line =>
        doc.splitTextToSize(line, COL_W - 4)
      )
    }
    const EV_LH   = lh(T.evidence.pt, 1.55)
    const evBlockH = evWrapped.length > 0 ? evWrapped.length * EV_LH + 4 : 0

    checkPage(TAG_H + evBlockH + 5)

    // Tag background — full column width, square corners
    doc.setFillColor(...C.tagFnBg)
    doc.rect(colX, y, COL_W, TAG_H, 'F')

    // Label — left-aligned with padding
    sf(doc, T.tag.style, T.tag.pt)
    doc.setTextColor(...C.tagFnText)
    doc.text(label, colX + TAG_PX, y + TAG_H / 2 + lh(T.tag.pt, 0.38))

    // Years — right-aligned with padding, same baseline
    sf(doc, T.tagYears.style, T.tagYears.pt)
    doc.setTextColor(...C.tagFnYears)
    doc.text(`${yearsVal}y`, colX + COL_W - TAG_PX, y + TAG_H / 2 + lh(T.tagYears.pt, 0.38), { align: 'right' })

    y += TAG_H + 3.5  // gap tag → evidence

    // Evidence
    if (evWrapped.length > 0) {
      sf(doc, T.evidence.style, T.evidence.pt)
      doc.setTextColor(...C.evidenceText)
      evWrapped.forEach(line => {
        doc.text(line, colX + 4, y)
        y += EV_LH
      })
      y += 2
    }

    y += 4  // gap before next row
  }

  // Style A — left accent bar (knowledge area + industry)
  function barRow(label, yearsVal, barColor, labelColor, evidence) {
    const BAR_W  = 3
    const BAR_R  = 1
    const ROW_H  = lh(T.barLabel.pt, 1.8)  // enough for one line of label

    const evLines = parseEvidence(evidence)
    let evWrapped = []
    if (evLines.length > 0) {
      sf(doc, T.evidence.style, T.evidence.pt)
      evWrapped = evLines.flatMap(line =>
        doc.splitTextToSize(line, COL_W - BAR_W - 6)
      )
    }
    const EV_LH    = lh(T.evidence.pt, 1.55)
    const evBlockH = evWrapped.length > 0 ? evWrapped.length * EV_LH + 3 : 0

    checkPage(ROW_H + evBlockH + 5)

    // Accent bar
    doc.setFillColor(...barColor)
    doc.roundedRect(colX, y, BAR_W, ROW_H, BAR_R, BAR_R, 'F')

    // Label
    sf(doc, T.barLabel.style, T.barLabel.pt)
    doc.setTextColor(...labelColor)
    doc.text(label, colX + BAR_W + 5, y + ROW_H / 2 + lh(T.barLabel.pt, 0.38))

    // Years
    sf(doc, T.barYears.style, T.barYears.pt)
    doc.setTextColor(...C.years)
    doc.text(`${yearsVal}y`, colX + COL_W, y + ROW_H / 2 + lh(T.barYears.pt, 0.38), { align: 'right' })

    y += ROW_H + 2.5

    // Evidence
    if (evWrapped.length > 0) {
      sf(doc, T.evidence.style, T.evidence.pt)
      doc.setTextColor(...C.evidenceText)
      evWrapped.forEach(line => {
        doc.text(line, colX + BAR_W + 5, y)
        y += EV_LH
      })
      y += 2
    }

    y += 4
  }

  return {
    setY:      v => { y = v },
    getY:      () => y,
    section,
    tagRow,
    barRow,
    checkPage,
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

  // ── Body background ────────────────────────────────────────────────────────
  doc.setFillColor(...C.bodyBg)
  doc.rect(0, 0, PAGE_W, PAGE_H, 'F')

  // ── Header — measure summary first so band height is exact ────────────────
  sf(doc, T.summary.style, T.summary.pt)
  const sumLines = doc.splitTextToSize(summary, PAGE_W - MARGIN * 2 - 2)
  const SUM_LH   = lh(T.summary.pt, 1.5)
  const PAD_T    = 7
  const PAD_M    = 4.5
  const PAD_B    = 7
  const LOGO_H   = lh(T.logo.pt, 1)
  const HDR_H    = PAD_T + LOGO_H + PAD_M + sumLines.length * SUM_LH + PAD_B

  doc.setFillColor(...C.headerBg)
  doc.rect(0, 0, PAGE_W, HDR_H, 'F')

  sf(doc, T.logo.style, T.logo.pt)
  doc.setTextColor(...C.logoText)
  doc.text('RENSUME · TAXONOMY PROFILE', MARGIN, PAD_T + LOGO_H)

  sf(doc, T.summary.style, T.summary.pt)
  doc.setTextColor(...C.summaryText)
  const sumY = PAD_T + LOGO_H + PAD_M + SUM_LH * 0.82
  sumLines.forEach((line, i) => doc.text(line, MARGIN, sumY + i * SUM_LH))

  // ── Accent rule ────────────────────────────────────────────────────────────
  doc.setFillColor(...C.accent)
  doc.rect(0, HDR_H, PAGE_W, ACC_H, 'F')

  // ── Columns ────────────────────────────────────────────────────────────────
  const BODY_Y = HDR_H + ACC_H + 10
  const left   = makeColumn(doc, COL_L)
  const right  = makeColumn(doc, COL_R)
  left.setY(BODY_Y)
  right.setY(BODY_Y)

  // ── LEFT: Function (style B — square tag) ──────────────────────────────────
  if (functions.length) {
    left.section('Function')
    functions.forEach(fn =>
      left.tagRow(
        getSeniorityLabel(fn.name, fn.years),
        fn.years,
        fn.evidence
      )
    )
    left.setY(left.getY() + 2)
  }

  // ── LEFT: Knowledge Area (style A — accent bar) ────────────────────────────
  if (knowledge_areas.length) {
    left.section('Knowledge Area')
    knowledge_areas.forEach(ka =>
      left.barRow(ka.name, ka.years, C.barKa, C.labelKa, ka.evidence)
    )
  }

  // ── RIGHT: Industry (style A — neutral bar) ────────────────────────────────
  if (industries.length) {
    right.section('Industry')
    industries.forEach(ind =>
      right.barRow(ind.name, ind.years, C.barInd, C.labelInd, ind.evidence)
    )
    right.setY(right.getY() + 2)
  }

  // ── RIGHT: Strengths ───────────────────────────────────────────────────────
  if (strengths) {
    right.checkPage(22)
    let ry = right.getY()

    sf(doc, T.section.style, T.section.pt)
    doc.setTextColor(...C.sectionLabel)
    doc.text('STRENGTHS', COL_R, ry)
    doc.setDrawColor(...C.divider)
    doc.setLineWidth(0.3)
    doc.line(COL_R, ry + 2.5, COL_R + COL_W, ry + 2.5)
    ry += 8

    sf(doc, T.strengths.style, T.strengths.pt)
    const strLines = doc.splitTextToSize(strengths, COL_W - 8)
    const STR_LH   = lh(T.strengths.pt, 1.5)
    const BOX_PY   = 5
    const boxH     = strLines.length * STR_LH + BOX_PY * 2

    doc.setFillColor(...C.strengthsBg)
    doc.rect(COL_R, ry, COL_W, boxH, 'F')
    sf(doc, T.strengths.style, T.strengths.pt)
    doc.setTextColor(...C.strengthsTxt)
    strLines.forEach((line, i) =>
      doc.text(line, COL_R + 4.5, ry + BOX_PY + STR_LH * 0.82 + i * STR_LH)
    )
    right.setY(ry + boxH + 6)
  }

  // ── RIGHT: Tooling & Methods ───────────────────────────────────────────────
  if (tools.length) {
    right.checkPage(22)
    let ry = right.getY()

    sf(doc, T.section.style, T.section.pt)
    doc.setTextColor(...C.sectionLabel)
    doc.text('TOOLING & METHODS', COL_R, ry)
    doc.setDrawColor(...C.divider)
    doc.setLineWidth(0.3)
    doc.line(COL_R, ry + 2.5, COL_R + COL_W, ry + 2.5)
    ry += 8

    const CHIP_H   = 6.5
    const CHIP_PX  = 5
    const CHIP_GAP = 3
    let tx = COL_R

    tools.forEach(tool => {
      sf(doc, T.tool.style, T.tool.pt)
      const tw = doc.getTextWidth(tool) + CHIP_PX * 2
      if (tx + tw > COL_R + COL_W) {
        tx  = COL_R
        ry += CHIP_H + CHIP_GAP
        right.checkPage(CHIP_H + 4)
        ry = right.getY()
      }
      doc.setFillColor(...C.toolBg)
      doc.rect(tx, ry, tw, CHIP_H, 'F')
      doc.setDrawColor(...C.toolBdr)
      doc.setLineWidth(0.2)
      doc.rect(tx, ry, tw, CHIP_H, 'S')
      doc.setTextColor(...C.toolText)
      sf(doc, T.tool.style, T.tool.pt)
      doc.text(tool, tx + tw / 2, ry + CHIP_H / 2 + lh(T.tool.pt, 0.38), { align: 'center' })
      tx += tw + CHIP_GAP
    })
    right.setY(ry + CHIP_H + 6)
  }

  // ── RIGHT: Education & Credentials ────────────────────────────────────────
  if (credentials.length) {
    right.checkPage(20)
    let ry = right.getY()

    sf(doc, T.section.style, T.section.pt)
    doc.setTextColor(...C.sectionLabel)
    doc.text('EDUCATION & CREDENTIALS', COL_R, ry)
    doc.setDrawColor(...C.divider)
    doc.setLineWidth(0.3)
    doc.line(COL_R, ry + 2.5, COL_R + COL_W, ry + 2.5)
    ry += 8

    credentials.forEach(cred => {
      right.checkPage(14)
      ry = right.getY()

      const typeLabel = (cred.type || '').toUpperCase()
      const name      = cred.name || ''
      const sub       = [cred.institution, cred.year].filter(Boolean).join(' · ')

      // Type badge
      sf(doc, T.credType.style, T.credType.pt)
      doc.setTextColor(...C.credType)
      doc.text(typeLabel, COL_R, ry)
      ry += lh(T.credType.pt, 1.6)

      // Credential name
      sf(doc, T.credName.style, T.credName.pt)
      doc.setTextColor(...C.credName)
      const nameLines = doc.splitTextToSize(name, COL_W)
      nameLines.forEach(nl => {
        doc.text(nl, COL_R, ry)
        ry += lh(T.credName.pt, 1.4)
      })

      // Institution · year
      if (sub) {
        sf(doc, T.credSub.style, T.credSub.pt)
        doc.setTextColor(...C.credSub)
        const subLines = doc.splitTextToSize(sub, COL_W - 4)
        subLines.forEach(sl => {
          doc.text(sl, COL_R + 4, ry)
          ry += lh(T.credSub.pt, 1.4)
        })
      }

      ry += 4  // gap between credentials
      right.setY(ry)
    })
  }

  // ── Footer on every page ───────────────────────────────────────────────────
  const total = doc.getNumberOfPages()
  for (let p = 1; p <= total; p++) {
    doc.setPage(p)
    drawFooter(doc)
  }

  doc.save(`rensume-card-${themeName}-${Date.now()}.pdf`)
}
