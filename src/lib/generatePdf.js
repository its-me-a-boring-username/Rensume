// src/lib/generatePdf.js
// Rensume card PDF — jsPDF, A4, Bordeaux theme.
// Two-column layout:
//   Left  — Function (square tag) + Knowledge Area (accent bar)
//   Right — Industry (neutral bar) + Strengths + Tools + Credentials
//
// Page sync: left column drawn first (may span pages), then right column
// resets to page 1 and uses existing pages before adding new ones.

import { jsPDF } from 'jspdf'
import { getSeniorityLabel } from './classifier'

// ─── Colors ───────────────────────────────────────────────────────────────────

const C = {
  headerBg:     [44,  48,  56],
  accent:       [144, 64,  96],
  logoText:     [144, 64,  96],
  summaryText:  [144, 154, 168],
  bodyBg:       [250, 248, 244],
  sectionLabel: [80,  72,  64],
  divider:      [216, 208, 200],
  years:        [120, 110, 96],
  tagFnBg:      [44,  48,  56],
  tagFnText:    [200, 112, 144],
  tagFnYears:   [200, 112, 144],
  barKa:        [144, 64,  96],
  labelKa:      [120, 48,  72],
  barInd:       [180, 172, 164],
  labelInd:     [48,  40,  32],
  evidenceText: [80,  70,  60],
  strengthsBg:  [245, 241, 235],
  strengthsTxt: [56,  44,  32],
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
const ACC_H   = 2
const FOOT_H  = 9
const FOOT_Y  = PAGE_H - FOOT_H
const FONT    = 'helvetica'

// ─── Typography ───────────────────────────────────────────────────────────────

const T = {
  logo:      { style: 'bold',   pt: 8    },
  summary:   { style: 'normal', pt: 10   },
  section:   { style: 'bold',   pt: 7.5  },
  tag:       { style: 'bold',   pt: 10   },
  tagYears:  { style: 'normal', pt: 9.5  },
  barLabel:  { style: 'bold',   pt: 10   },
  barYears:  { style: 'normal', pt: 9.5  },
  evidence:  { style: 'normal', pt: 8    },
  strengths: { style: 'normal', pt: 9.5  },
  tool:      { style: 'bold',   pt: 8.5  },
  credType:  { style: 'bold',   pt: 7    },
  credName:  { style: 'bold',   pt: 10   },
  credSub:   { style: 'normal', pt: 8.5  },
  footer:    { style: 'normal', pt: 7    },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sf(doc, style, pt) {
  doc.setFont(FONT, style)
  doc.setFontSize(pt)
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
// startPage: which page this column begins on (left=1, right=1 after reset)
// reusePages: if true, use doc.setPage() to navigate existing pages instead of
//             always calling addPage(). Used by the right column so it fills
//             pages the left column already created.

function makeColumn(doc, colX, startPage, reusePages) {
  let y    = 0
  let page = startPage

  function goToPage(p) {
    page = p
    doc.setPage(p)
  }

  function checkPage(needed = 18) {
    if (y + needed > FOOT_Y - 4) {
      drawFooter(doc)
      const nextPage = page + 1
      if (reusePages && nextPage <= doc.getNumberOfPages()) {
        goToPage(nextPage)
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
    sf(doc, T.section.style, T.section.pt)
    doc.setTextColor(...C.sectionLabel)
    doc.text(label.toUpperCase(), colX, y)
    doc.setDrawColor(...C.divider)
    doc.setLineWidth(0.3)
    doc.line(colX, y + 3, colX + COL_W, y + 3)
    y += 9
  }

  // Style B — full-width square tag (function levels)
  function tagRow(label, yearsVal, evidence) {
    const TAG_H  = 9.5
    const TAG_PX = 6
    const EV_LH  = lh(T.evidence.pt, 1.6)

    const evLines = parseEvidence(evidence)
    let evWrapped = []
    if (evLines.length > 0) {
      sf(doc, T.evidence.style, T.evidence.pt)
      evWrapped = evLines.flatMap(line => doc.splitTextToSize(line, COL_W - 4))
    }
    const evBlockH = evWrapped.length > 0 ? evWrapped.length * EV_LH + 5 : 0

    checkPage(TAG_H + evBlockH + 8)

    doc.setFillColor(...C.tagFnBg)
    doc.rect(colX, y, COL_W, TAG_H, 'F')

    sf(doc, T.tag.style, T.tag.pt)
    doc.setTextColor(...C.tagFnText)
    doc.text(label, colX + TAG_PX, y + TAG_H / 2 + lh(T.tag.pt, 0.38))

    sf(doc, T.tagYears.style, T.tagYears.pt)
    doc.setTextColor(...C.tagFnYears)
    doc.text(`${yearsVal}y`, colX + COL_W - TAG_PX, y + TAG_H / 2 + lh(T.tagYears.pt, 0.38), { align: 'right' })

    y += TAG_H + 5.5

    if (evWrapped.length > 0) {
      sf(doc, T.evidence.style, T.evidence.pt)
      doc.setTextColor(...C.evidenceText)
      evWrapped.forEach(line => { doc.text(line, colX + 4, y); y += EV_LH })
      y += 3
    }
    y += 5
  }

  // Style A — left accent bar (knowledge area + industry)
  function barRow(label, yearsVal, barColor, labelColor, evidence) {
    const BAR_W  = 3.5
    const BAR_R  = 1
    const ROW_H  = lh(T.barLabel.pt, 1.9)
    const EV_LH  = lh(T.evidence.pt, 1.6)

    const evLines = parseEvidence(evidence)
    let evWrapped = []
    if (evLines.length > 0) {
      sf(doc, T.evidence.style, T.evidence.pt)
      evWrapped = evLines.flatMap(line => doc.splitTextToSize(line, COL_W - BAR_W - 7))
    }
    const evBlockH = evWrapped.length > 0 ? evWrapped.length * EV_LH + 4 : 0

    checkPage(ROW_H + evBlockH + 8)

    doc.setFillColor(...barColor)
    doc.roundedRect(colX, y, BAR_W, ROW_H, BAR_R, BAR_R, 'F')

    sf(doc, T.barLabel.style, T.barLabel.pt)
    doc.setTextColor(...labelColor)
    doc.text(label, colX + BAR_W + 5, y + ROW_H / 2 + lh(T.barLabel.pt, 0.38))

    sf(doc, T.barYears.style, T.barYears.pt)
    doc.setTextColor(...C.years)
    doc.text(`${yearsVal}y`, colX + COL_W, y + ROW_H / 2 + lh(T.barYears.pt, 0.38), { align: 'right' })

    y += ROW_H + 5.5

    if (evWrapped.length > 0) {
      sf(doc, T.evidence.style, T.evidence.pt)
      doc.setTextColor(...C.evidenceText)
      evWrapped.forEach(line => { doc.text(line, colX + BAR_W + 5, y); y += EV_LH })
      y += 3
    }
    y += 5
  }

  return {
    setY:      v  => { y = v },
    getY:      () => y,
    getPage:   () => page,
    goToPage,
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

  // ── Page 1 background ─────────────────────────────────────────────────────
  paintBodyBg(doc)

  // ── Header — measure summary first ────────────────────────────────────────
  sf(doc, T.summary.style, T.summary.pt)
  const sumLines = doc.splitTextToSize(summary, PAGE_W - MARGIN * 2 - 2)
  const SUM_LH   = lh(T.summary.pt, 1.5)
  const PAD_T    = 8
  const PAD_M    = 5
  const PAD_B    = 8
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

  doc.setFillColor(...C.accent)
  doc.rect(0, HDR_H, PAGE_W, ACC_H, 'F')

  const BODY_Y = HDR_H + ACC_H + 10

  // ── LEFT column — drawn first, reusePages=false (creates pages as needed) ─
  const left = makeColumn(doc, COL_L, 1, false)
  left.setY(BODY_Y)

  if (functions.length) {
    left.section('Function')
    functions.forEach(fn =>
      left.tagRow(getSeniorityLabel(fn.name, fn.years), fn.years, fn.evidence)
    )
    left.setY(left.getY() + 2)
  }

  if (knowledge_areas.length) {
    left.section('Knowledge Area')
    knowledge_areas.forEach(ka =>
      left.barRow(ka.name, ka.years, C.barKa, C.labelKa, ka.evidence)
    )
  }

  // ── RIGHT column — reset to page 1, reuse pages left column created ───────
  const right = makeColumn(doc, COL_R, 1, true)
  doc.setPage(1)         // jump back to page 1 before drawing right column
  right.setY(BODY_Y)

  if (industries.length) {
    right.section('Industry')
    industries.forEach(ind =>
      right.barRow(ind.name, ind.years, C.barInd, C.labelInd, ind.evidence)
    )
    right.setY(right.getY() + 2)
  }

  if (strengths) {
    right.checkPage(24)
    let ry = right.getY()

    sf(doc, T.section.style, T.section.pt)
    doc.setTextColor(...C.sectionLabel)
    doc.text('STRENGTHS', COL_R, ry)
    doc.setDrawColor(...C.divider)
    doc.setLineWidth(0.3)
    doc.line(COL_R, ry + 3, COL_R + COL_W, ry + 3)
    ry += 9

    sf(doc, T.strengths.style, T.strengths.pt)
    const strLines = doc.splitTextToSize(strengths, COL_W - 9)
    const STR_LH   = lh(T.strengths.pt, 1.55)
    const BOX_PY   = 5.5
    const boxH     = strLines.length * STR_LH + BOX_PY * 2

    doc.setFillColor(...C.strengthsBg)
    doc.rect(COL_R, ry, COL_W, boxH, 'F')
    sf(doc, T.strengths.style, T.strengths.pt)
    doc.setTextColor(...C.strengthsTxt)
    strLines.forEach((line, i) =>
      doc.text(line, COL_R + 5, ry + BOX_PY + STR_LH * 0.82 + i * STR_LH)
    )
    right.setY(ry + boxH + 7)
  }

  if (tools.length) {
    right.checkPage(24)
    let ry = right.getY()

    sf(doc, T.section.style, T.section.pt)
    doc.setTextColor(...C.sectionLabel)
    doc.text('TOOLING & METHODS', COL_R, ry)
    doc.setDrawColor(...C.divider)
    doc.setLineWidth(0.3)
    doc.line(COL_R, ry + 3, COL_R + COL_W, ry + 3)
    right.setY(ry + 9)

    const CHIP_H   = 7
    const CHIP_PX  = 5
    const CHIP_GAP = 3
    let tx = COL_R

    tools.forEach(tool => {
      sf(doc, T.tool.style, T.tool.pt)
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
      sf(doc, T.tool.style, T.tool.pt)
      doc.text(tool, tx + tw / 2, ry + CHIP_H / 2 + lh(T.tool.pt, 0.38), { align: 'center' })
      tx += tw + CHIP_GAP
    })
    right.setY(right.getY() + CHIP_H + 7)
  }

  if (credentials.length) {
    right.checkPage(22)
    let ry = right.getY()

    sf(doc, T.section.style, T.section.pt)
    doc.setTextColor(...C.sectionLabel)
    doc.text('EDUCATION & CREDENTIALS', COL_R, ry)
    doc.setDrawColor(...C.divider)
    doc.setLineWidth(0.3)
    doc.line(COL_R, ry + 3, COL_R + COL_W, ry + 3)
    ry += 9
    right.setY(ry)

    credentials.forEach(cred => {
      right.checkPage(16)
      ry = right.getY()

      const typeLabel = (cred.type || '').toUpperCase()
      const name      = cred.name || ''
      const sub       = [cred.institution, cred.year].filter(Boolean).join(' · ')

      sf(doc, T.credType.style, T.credType.pt)
      doc.setTextColor(...C.credType)
      doc.text(typeLabel, COL_R, ry)
      ry += lh(T.credType.pt, 1.7)

      sf(doc, T.credName.style, T.credName.pt)
      doc.setTextColor(...C.credName)
      const nameLines = doc.splitTextToSize(name, COL_W)
      nameLines.forEach(nl => { doc.text(nl, COL_R, ry); ry += lh(T.credName.pt, 1.4) })

      if (sub) {
        sf(doc, T.credSub.style, T.credSub.pt)
        doc.setTextColor(...C.credSub)
        const subLines = doc.splitTextToSize(sub, COL_W - 4)
        subLines.forEach(sl => { doc.text(sl, COL_R + 4, ry); ry += lh(T.credSub.pt, 1.4) })
      }

      ry += 5
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
