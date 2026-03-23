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
  evidenceText: [120, 108, 96],
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
const COL_W   = (PAGE_W - MARGIN * 2 - GUTTER) / 2   // ~88.5mm each
const COL_L   = MARGIN
const COL_R   = MARGIN + COL_W + GUTTER
const ACC_H   = 2
const FOOT_H  = 9
const FOOT_Y  = PAGE_H - FOOT_H
const FONT    = 'helvetica'

// ─── Typography scale ─────────────────────────────────────────────────────────
// All sizes in pt. 1pt = 0.3528mm.
// Vertical centering formula for text in a box of height H (mm):
//   baseline_offset = H/2 + (fontSize_pt * 0.3528 * 0.38)
//   The 0.38 factor approximates cap-height as 38% of em in Helvetica.

const T = {
  logoLabel:    { style: 'bold',   pt: 8   },
  summary:      { style: 'normal', pt: 11  },
  sectionLabel: { style: 'bold',   pt: 7   },
  pill:         { style: 'bold',   pt: 10  },
  years:        { style: 'normal', pt: 9   },
  evidence:     { style: 'normal', pt: 7.5 },
  strengths:    { style: 'normal', pt: 9   },
  tool:         { style: 'bold',   pt: 7.5 },
  credType:     { style: 'bold',   pt: 6.5 },
  credName:     { style: 'bold',   pt: 9   },
  credSub:      { style: 'normal', pt: 8   },
  footer:       { style: 'normal', pt: 7   },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sf(doc, style, pt) {
  doc.setFont(FONT, style)
  doc.setFontSize(pt)
}

// Vertical baseline offset to center text in a box of height H mm
function vcenter(H, pt) {
  return H / 2 + (pt * 0.3528 * 0.40)
}

function drawFooter(doc) {
  doc.setDrawColor(...C.divider)
  doc.setLineWidth(0.3)
  doc.line(MARGIN, FOOT_Y, MARGIN + COL_W * 2 + GUTTER, FOOT_Y)
  sf(doc, 'normal', T.footer.pt)
  doc.setTextColor(...C.footerLeft)
  doc.text('Candidate-owned · read-only for recruiters', MARGIN, FOOT_Y + 6)
  sf(doc, 'bold', T.footer.pt)
  doc.setTextColor(...C.footerRight)
  doc.text('RENSUME', MARGIN + COL_W * 2 + GUTTER, FOOT_Y + 6, { align: 'right' })
}

// Parse evidence string into individual bullet lines
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

  function checkPage(neededMm = 16) {
    if (y + neededMm > FOOT_Y - 4) {
      drawFooter(doc)
      doc.addPage()
      doc.setFillColor(...C.bodyBg)
      doc.rect(0, 0, PAGE_W, PAGE_H, 'F')
      y = MARGIN + 4
    }
  }

  function section(label) {
    checkPage(20)
    sf(doc, T.sectionLabel.style, T.sectionLabel.pt)
    doc.setTextColor(...C.sectionLabel)
    doc.text(label.toUpperCase(), colX, y)
    doc.setDrawColor(...C.divider)
    doc.setLineWidth(0.3)
    doc.line(colX, y + 2.5, colX + COL_W, y + 2.5)
    y += 9    // section label + underline + gap before first pill
  }

  function pillRow(label, yearsVal, bgRgb, textRgb, borderRgb, evidence) {
    const PILL_H   = 9      // mm — tall enough for 10pt text with breathing room
    const PILL_PX  = 6      // horizontal padding each side
    const EV_PT    = T.evidence.pt
    const EV_LH    = 4.2
    const EV_IND   = 3

    // Font BEFORE getTextWidth — always
    sf(doc, T.pill.style, T.pill.pt)
    const labelW = doc.getTextWidth(label)
    const pillW  = Math.min(labelW + PILL_PX * 2, COL_W * 0.80)

    // Pre-measure evidence to give checkPage an accurate height estimate
    const evLines = parseEvidence(evidence)
    let evWrapped = []
    if (evLines.length > 0) {
      sf(doc, T.evidence.style, EV_PT)
      evWrapped = evLines.flatMap(line => doc.splitTextToSize(line, COL_W - EV_IND))
    }
    const evBlockH = evWrapped.length > 0 ? evWrapped.length * EV_LH + 5 : 0

    checkPage(PILL_H + evBlockH + 6)

    // ── Draw pill ──────────────────────────────────────────────────────────
    doc.setFillColor(...bgRgb)
    doc.roundedRect(colX, y, pillW, PILL_H, 2, 2, 'F')

    if (borderRgb) {
      doc.setDrawColor(...borderRgb)
      doc.setLineWidth(0.3)
      doc.roundedRect(colX, y, pillW, PILL_H, 2, 2, 'S')
    }

    // Pill label — font already set, so measurement was accurate
    doc.setTextColor(...textRgb)
    sf(doc, T.pill.style, T.pill.pt)
    doc.text(label, colX + pillW / 2, y + vcenter(PILL_H, T.pill.pt), { align: 'center' })

    // Years
    sf(doc, T.years.style, T.years.pt)
    doc.setTextColor(...C.years)
    doc.text(`${yearsVal}y`, colX + COL_W, y + vcenter(PILL_H, T.years.pt), { align: 'right' })

    y += PILL_H + 4.5   // gap between pill bottom and evidence

    // ── Evidence ──────────────────────────────────────────────────────────
    if (evWrapped.length > 0) {
      sf(doc, T.evidence.style, EV_PT)
      doc.setTextColor(...C.evidenceText)
      evWrapped.forEach(line => {
        doc.text(line, colX + EV_IND, y)
        y += EV_LH
      })
      y += 3   // gap after evidence block
    }

    y += 4   // gap before next pill
  }

  return {
    setY:      (v) => { y = v },
    getY:      () => y,
    section,
    pillRow,
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

  // ── Full-page body background ──────────────────────────────────────────────
  doc.setFillColor(...C.bodyBg)
  doc.rect(0, 0, PAGE_W, PAGE_H, 'F')

  // ── Measure summary first so header height is exact ───────────────────────
  sf(doc, T.summary.style, T.summary.pt)
  const sumLines  = doc.splitTextToSize(summary, PAGE_W - MARGIN * 2 - 2)
  const SUM_LH    = T.summary.pt * 0.3528 * 1.55   // line-height ≈ 1.55× em
  const PAD_TOP   = 7
  const PAD_MID   = 5    // logo label → summary
  const PAD_BOT   = 7
  const LOGO_PT   = T.logoLabel.pt
  const LOGO_H_MM = LOGO_PT * 0.3528
  const HDR_H     = PAD_TOP + LOGO_H_MM + PAD_MID + sumLines.length * SUM_LH + PAD_BOT

  // ── Header ─────────────────────────────────────────────────────────────────
  doc.setFillColor(...C.headerBg)
  doc.rect(0, 0, PAGE_W, HDR_H, 'F')

  // Logo label
  const logoBaselineY = PAD_TOP + LOGO_H_MM
  sf(doc, T.logoLabel.style, LOGO_PT)
  doc.setTextColor(...C.logoText)
  doc.text('RENSUME · TAXONOMY PROFILE', MARGIN, logoBaselineY)

  // Summary
  const sumBaselineY = logoBaselineY + PAD_MID + SUM_LH * 0.85
  sf(doc, T.summary.style, T.summary.pt)
  doc.setTextColor(...C.summaryText)
  sumLines.forEach((line, i) =>
    doc.text(line, MARGIN, sumBaselineY + i * SUM_LH)
  )

  // ── Accent rule ────────────────────────────────────────────────────────────
  doc.setFillColor(...C.accent)
  doc.rect(0, HDR_H, PAGE_W, ACC_H, 'F')

  // ── Body start ─────────────────────────────────────────────────────────────
  const BODY_Y = HDR_H + ACC_H + 10

  const left  = makeColumn(doc, COL_L)
  const right = makeColumn(doc, COL_R)
  left.setY(BODY_Y)
  right.setY(BODY_Y)

  // ── LEFT: Function ─────────────────────────────────────────────────────────
  if (functions.length) {
    left.section('Function')
    functions.forEach(fn =>
      left.pillRow(
        getSeniorityLabel(fn.name, fn.years),
        fn.years,
        C.pillFnBg, C.pillFnText, null,
        fn.evidence
      )
    )
    left.setY(left.getY() + 2)
  }

  // ── LEFT: Knowledge Area ───────────────────────────────────────────────────
  if (knowledge_areas.length) {
    left.section('Knowledge Area')
    knowledge_areas.forEach(ka =>
      left.pillRow(
        ka.name, ka.years,
        C.pillKaBg, C.pillKaText, null,
        ka.evidence
      )
    )
  }

  // ── RIGHT: Industry ────────────────────────────────────────────────────────
  if (industries.length) {
    right.section('Industry')
    industries.forEach(ind =>
      right.pillRow(
        ind.name, ind.years,
        C.pillIndBg, C.pillIndText, C.pillIndBdr,
        ind.evidence
      )
    )
    right.setY(right.getY() + 2)
  }

  // ── RIGHT: Strengths ───────────────────────────────────────────────────────
  if (strengths) {
    right.checkPage(22)
    let ry = right.getY()

    sf(doc, T.sectionLabel.style, T.sectionLabel.pt)
    doc.setTextColor(...C.sectionLabel)
    doc.text('STRENGTHS', COL_R, ry)
    doc.setDrawColor(...C.divider)
    doc.setLineWidth(0.3)
    doc.line(COL_R, ry + 2.5, COL_R + COL_W, ry + 2.5)
    ry += 9

    sf(doc, T.strengths.style, T.strengths.pt)
    const strLines = doc.splitTextToSize(strengths, COL_W - 8)
    const STR_LH   = T.strengths.pt * 0.3528 * 1.55
    const BOX_PY   = 5.5
    const boxH     = strLines.length * STR_LH + BOX_PY * 2

    doc.setFillColor(...C.strengthsBg)
    doc.rect(COL_R, ry, COL_W, boxH, 'F')
    sf(doc, T.strengths.style, T.strengths.pt)
    doc.setTextColor(...C.strengthsTxt)
    strLines.forEach((line, i) =>
      doc.text(line, COL_R + 4.5, ry + BOX_PY + STR_LH * 0.85 + i * STR_LH)
    )
    right.setY(ry + boxH + 6)
  }

  // ── RIGHT: Tooling & Methods ───────────────────────────────────────────────
  if (tools.length) {
    right.checkPage(22)
    let ry = right.getY()

    sf(doc, T.sectionLabel.style, T.sectionLabel.pt)
    doc.setTextColor(...C.sectionLabel)
    doc.text('TOOLING & METHODS', COL_R, ry)
    doc.setDrawColor(...C.divider)
    doc.setLineWidth(0.3)
    doc.line(COL_R, ry + 2.5, COL_R + COL_W, ry + 2.5)
    ry += 9

    const CHIP_H   = 7
    const CHIP_PX  = 5
    const CHIP_GAP = 3
    let tx = COL_R

    tools.forEach(tool => {
      sf(doc, T.tool.style, T.tool.pt)    // font before getTextWidth
      const tw = doc.getTextWidth(tool) + CHIP_PX * 2
      if (tx + tw > COL_R + COL_W) {
        tx  = COL_R
        ry += CHIP_H + CHIP_GAP
        right.checkPage(CHIP_H + 4)
        ry = right.getY()
      }
      doc.setFillColor(...C.toolBg)
      doc.roundedRect(tx, ry, tw, CHIP_H, 1.5, 1.5, 'F')
      doc.setDrawColor(...C.toolBdr)
      doc.setLineWidth(0.2)
      doc.roundedRect(tx, ry, tw, CHIP_H, 1.5, 1.5, 'S')
      doc.setTextColor(...C.toolText)
      sf(doc, T.tool.style, T.tool.pt)
      doc.text(tool, tx + tw / 2, ry + vcenter(CHIP_H, T.tool.pt), { align: 'center' })
      tx += tw + CHIP_GAP
    })
    right.setY(ry + CHIP_H + 6)
  }

  // ── RIGHT: Education & Credentials ────────────────────────────────────────
  if (credentials.length) {
    right.checkPage(20)
    let ry = right.getY()

    sf(doc, T.sectionLabel.style, T.sectionLabel.pt)
    doc.setTextColor(...C.sectionLabel)
    doc.text('EDUCATION & CREDENTIALS', COL_R, ry)
    doc.setDrawColor(...C.divider)
    doc.setLineWidth(0.3)
    doc.line(COL_R, ry + 2.5, COL_R + COL_W, ry + 2.5)
    ry += 9

    credentials.forEach(cred => {
      right.checkPage(12)
      ry = right.getY()

      const typeLabel  = (cred.type || '').toUpperCase()
      const name       = cred.name || ''
      const institution = cred.institution || ''
      const year        = cred.year || ''

      // ── Row 1: TYPE badge + credential name on same baseline ──────────────
      const row1Y = ry + 4.5

      // TYPE badge — measure width first
      sf(doc, T.credType.style, T.credType.pt)
      doc.setTextColor(...C.credType)
      doc.text(typeLabel, COL_R, row1Y)
      const typeW  = doc.getTextWidth(typeLabel)
      const nameX  = COL_R + typeW + 3

      // Credential name
      sf(doc, T.credName.style, T.credName.pt)
      doc.setTextColor(...C.credName)
      // Wrap name if it's too long
      const nameMaxW = COL_W - typeW - 3
      const nameLines = doc.splitTextToSize(name, nameMaxW)
      nameLines.forEach((nl, i) => {
        doc.text(nl, nameX, row1Y + i * (T.credName.pt * 0.3528 * 1.4))
      })
      const nameBlockH = nameLines.length > 1
        ? (nameLines.length - 1) * (T.credName.pt * 0.3528 * 1.4)
        : 0

      ry += 4.5 + nameBlockH + 2   // baseline + any name wrapping + small gap

      // ── Row 2: Institution · year — indented, muted ───────────────────────
      if (institution || year) {
        const subStr = [institution, year].filter(Boolean).join(' · ')
        sf(doc, T.credSub.style, T.credSub.pt)
        doc.setTextColor(...C.credSub)
        const subLines = doc.splitTextToSize(subStr, COL_W - 4)
        subLines.forEach((sl, i) => {
          doc.text(sl, COL_R + 4, ry + i * (T.credSub.pt * 0.3528 * 1.45))
        })
        ry += subLines.length * (T.credSub.pt * 0.3528 * 1.45) + 4
      } else {
        ry += 4
      }

      right.setY(ry)
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
