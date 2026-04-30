// src/lib/generatePdf.js
// Rensume card PDF — jsPDF, A4, Bordeaux theme.
// Font: IBM Plex Sans (embedded via ibmPlexFonts.js)

import { jsPDF } from 'jspdf'
import QRCode from 'qrcode'
import { registerIBMPlexSans } from './ibmPlexFonts'
import { getSeniorityLabel } from './classifier'

// ─── Colors ──────────────────────────────────────────────────────────────────

function h(hex) {
  const v = hex.replace('#', '')
  return [parseInt(v.slice(0,2),16), parseInt(v.slice(2,4),16), parseInt(v.slice(4,6),16)]
}

const THEME_COLORS = {
  bordeaux: {
    headerBg:    h('#2c3038'), accent:      h('#904060'), logoText:    h('#904060'),
    summaryText: h('#909aa8'), bodyBg:      h('#faf8f4'), sectionLabel:h('#605850'),
    divider:     h('#d8d0c8'),
    barFn: h('#2c3038'), labelFn: h('#2c3038'),
    barKa: h('#904060'), labelKa: h('#904060'),
    barInd:h('#c8c0b8'), labelInd:h('#403830'),
    evidenceText:h('#706050'), strengthsBg:h('#edeae6'), strengthsTxt:h('#504030'),
    toolBg:h('#edeae6'), toolText:h('#403830'), toolBdr:h('#c8c0b8'),
    credType:h('#a09080'), credName:h('#1a1410'), credSub:h('#706050'),
    footerLeft:h('#b0a898'), footerRight:h('#682848'),
  },
  ember: {
    headerBg:    h('#2c3038'), accent:      h('#a84040'), logoText:    h('#a84040'),
    summaryText: h('#909aa8'), bodyBg:      h('#faf8f4'), sectionLabel:h('#605850'),
    divider:     h('#d8d0c8'),
    barFn: h('#2c3038'), labelFn: h('#2c3038'),
    barKa: h('#a84040'), labelKa: h('#a84040'),
    barInd:h('#c8c0b8'), labelInd:h('#403830'),
    evidenceText:h('#706050'), strengthsBg:h('#edeae6'), strengthsTxt:h('#504030'),
    toolBg:h('#edeae6'), toolText:h('#403830'), toolBdr:h('#c8c0b8'),
    credType:h('#a09080'), credName:h('#1a1410'), credSub:h('#706050'),
    footerLeft:h('#b0a898'), footerRight:h('#802828'),
  },
  oxford: {
    headerBg:    h('#182030'), accent:      h('#3a6aaa'), logoText:    h('#3a6aaa'),
    summaryText: h('#8090a8'), bodyBg:      h('#f7f9fb'), sectionLabel:h('#485868'),
    divider:     h('#c8d0d8'),
    barFn: h('#182030'), labelFn: h('#182030'),
    barKa: h('#3a6aaa'), labelKa: h('#3a6aaa'),
    barInd:h('#b8c0c8'), labelInd:h('#303848'),
    evidenceText:h('#485868'), strengthsBg:h('#e8eaed'), strengthsTxt:h('#283848'),
    toolBg:h('#e8eaed'), toolText:h('#303848'), toolBdr:h('#b8c0c8'),
    credType:h('#8898a8'), credName:h('#1a1410'), credSub:h('#485868'),
    footerLeft:h('#90a0b0'), footerRight:h('#284880'),
  },
  gilt: {
    headerBg:    h('#111111'), accent:      h('#c8a96e'), logoText:    h('#c8a96e'),
    summaryText: h('#909090'), bodyBg:      h('#faf8f4'), sectionLabel:h('#706050'),
    divider:     h('#d8d0c4'),
    barFn: h('#111111'), labelFn: h('#111111'),
    barKa: h('#c8a96e'), labelKa: h('#7a6030'),
    barInd:h('#ccc8c0'), labelInd:h('#484038'),
    evidenceText:h('#706050'), strengthsBg:h('#eeece8'), strengthsTxt:h('#504030'),
    toolBg:h('#eeece8'), toolText:h('#484038'), toolBdr:h('#ccc8c0'),
    credType:h('#a09070'), credName:h('#1a1410'), credSub:h('#706050'),
    footerLeft:h('#b0a890'), footerRight:h('#906830'),
  },
  sterling: {
    headerBg:    h('#252a30'), accent:      h('#8898a8'), logoText:    h('#8898a8'),
    summaryText: h('#8090a0'), bodyBg:      h('#f8f9fa'), sectionLabel:h('#505860'),
    divider:     h('#c8ccd0'),
    barFn: h('#252a30'), labelFn: h('#252a30'),
    barKa: h('#8898a8'), labelKa: h('#505860'),
    barInd:h('#c0c4c8'), labelInd:h('#383c42'),
    evidenceText:h('#505860'), strengthsBg:h('#eaecee'), strengthsTxt:h('#383c42'),
    toolBg:h('#eaecee'), toolText:h('#383c42'), toolBdr:h('#c0c4c8'),
    credType:h('#8898a8'), credName:h('#1a1410'), credSub:h('#505860'),
    footerLeft:h('#9098a0'), footerRight:h('#506070'),
  },
}

// ─── Active theme colors (set at start of downloadCardPdf) ─────────────────
let C = {}

// ─── Layout ──────────────────────────────────────────────────────────────────

const PAGE_W = 210
const PAGE_H = 297
const MARGIN = 14
const GUTTER = 7
const COL_W  = (PAGE_W - MARGIN * 2 - GUTTER) / 2
const COL_L  = MARGIN
const COL_R  = MARGIN + COL_W + GUTTER
const ACC_H  = 2
const FOOT_H = 9
const FOOT_Y = PAGE_H - FOOT_H
const IBM    = 'IBMPlexSans'

// ─── Spacing ─────────────────────────────────────────────────────────────────

function lhFn(pt, ratio) { return pt * 0.3528 * ratio }

const SP = {
  barH:           lhFn(10, 1.5),   // compact bar height
  barToEvidence:  2.5,             // gap bar -> evidence
  evidenceLH:     lhFn(9, 1.4),   // evidence line height
  evidenceToNext: 1.25,            // gap after evidence block
  noEvidenceGap:  2,               // gap between items without evidence
  sectionToFirst: 4,
  sectionGap:     3,
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
  doc.text('Generated by Rensume from candidate-supplied resume text', MARGIN, FOOT_Y + 5.5)
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
  let y = 0
  let page = startPage

  function goToPage(p) { page = p; doc.setPage(p) }

  function checkPage(needed = 18) {
    if (y + needed > FOOT_Y - 1) {
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
    sf(doc, 'bold', 'normal', 9)
    doc.setTextColor(...C.sectionLabel)
    doc.text(label.toUpperCase(), colX, y)
    doc.setDrawColor(...C.divider)
    doc.setLineWidth(0.3)
    doc.line(colX, y + 4, colX + COL_W, y + 4)
    y += SP.sectionToFirst + 2
  }

  function barRow(label, yearsVal, barColor, labelColor, evidence) {
    const BAR_W = 3.5
    const BAR_R = 1
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

    doc.setFillColor(...barColor)
    doc.rect(colX, y + (ROW_H - ROW_H * 0.7) / 2, 2, ROW_H * 0.7, 'F')

    sf(doc, 'bold', 'normal', 10)
    doc.setTextColor(...labelColor)
    doc.text(label, colX + BAR_W + 5, y + ROW_H / 2 + lh(10, 0.28))

    sf(doc, 'bold', 'normal', 10)
    doc.setTextColor(...labelColor)
    doc.text(`${yearsVal}y`, colX + COL_W, y + ROW_H / 2 + lh(10, 0.28), { align: 'right' })

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

  return {
    setY:    v => { y = v },
    getY:    () => y,
    getPage: () => page,
    goToPage,
    section,
    barRow,
    checkPage,
  }
}

// ─── Main export ─────────────────────────────────────────────────────────────

export async function downloadCardPdf(profile, themeName = 'bordeaux', cardUrl = 'https://rensume.com') {
  try {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' })
    C = THEME_COLORS[themeName] || THEME_COLORS.bordeaux

    registerIBMPlexSans(doc)

    // Generate QR code as base64 PNG
    const qrDataUrl = await QRCode.toDataURL(cardUrl, {
      margin: 1,
      width: 200,
      color: { dark: '#000000', light: '#ffffff' }
    })

    const {
      summary         = '',
      strengths       = '',
      functions       = [],
      knowledge_areas = [],
      industries      = [],
      tools           = [],
      credentials     = [],
    } = profile

    // ── Page background ─────────────────────────────────────────────────────
    paintBodyBg(doc)

    // ── Header ───────────────────────────────────────────────────────────────
    sf(doc, 'bold', 'normal', 11)
    const QR_TOTAL = 18 + 2 * 2 + 4    // QR size + padding + gap
    const safeSummary = (() => {
      if (summary.length <= 175) return summary
      const cut = summary.slice(0, 174)
      const lastSpace = cut.lastIndexOf(' ')
      return (lastSpace > 87 ? cut.slice(0, lastSpace) : cut) + '…'
    })()
    const sumLines = doc.splitTextToSize(safeSummary, PAGE_W - MARGIN * 2 - QR_TOTAL)
    const SUM_LH   = lh(11, 1.45)
    const PAD_T    = 5
    const PAD_M    = 4
    const PAD_B    = 5
    const LOGO_H   = lh(7, 1)
    const HDR_H    = PAD_T + LOGO_H + PAD_M + sumLines.length * SUM_LH + PAD_B

    doc.setFillColor(...C.headerBg)
    doc.rect(0, 0, PAGE_W, HDR_H, 'F')

    sf(doc, 'bold', 'normal', 7)
    doc.setTextColor(...C.logoText)
    doc.text('RENSUME · TAXONOMY PROFILE', MARGIN, PAD_T + LOGO_H)

    sf(doc, 'bold', 'normal', 11)
    doc.setTextColor(...C.summaryText)
    const sumY = PAD_T + LOGO_H + PAD_M + SUM_LH * 0.82
    sumLines.forEach((line, i) => doc.text(line, MARGIN, sumY + i * SUM_LH))

    // QR code — flush to right edge of page, vertically centered in header
    const QR_SIZE   = 18    // mm — compact but scannable
    const QR_PAD    = 2     // mm white padding inside box, same all sides
    const BOX_W     = QR_SIZE + QR_PAD * 2
    const BOX_H     = QR_SIZE + QR_PAD * 2
    const QR_X      = PAGE_W - QR_PAD - BOX_W               // QR_PAD margin from page edge, matches internal padding
    const QR_Y      = (HDR_H - BOX_H) / 2      // vertically centered in header
    doc.setFillColor(255, 255, 255)
    doc.rect(QR_X, QR_Y, BOX_W, BOX_H, 'F')
    doc.addImage(qrDataUrl, 'PNG', QR_X + QR_PAD, QR_Y + QR_PAD, QR_SIZE, QR_SIZE)

    // ── Accent rule ──────────────────────────────────────────────────────────
    doc.setFillColor(...C.accent)
    doc.rect(0, HDR_H, PAGE_W, ACC_H, 'F')

    // ── Strengths band (below accent rule) ───────────────────────────────────
    let strengthsBandH = 0
    if (strengths) {
      const LABEL_H = lh(7, 1.8)
      const STR_LH  = lh(9, 1.55)
      const BOX_PY  = 4
      const TEXT_X  = MARGIN + 5
      const TEXT_W  = PAGE_W - MARGIN * 2 - 10
      const STR_Y   = HDR_H + ACC_H + 6

      sf(doc, 'normal', 'normal', 9)
      const strLines = doc.splitTextToSize(strengths, TEXT_W)
      strengthsBandH = LABEL_H + BOX_PY + strLines.length * STR_LH + BOX_PY

      doc.setFillColor(...C.strengthsBg)
      doc.rect(MARGIN, STR_Y, PAGE_W - MARGIN * 2, strengthsBandH, 'F')
      doc.setDrawColor(...C.divider)
      doc.setLineWidth(0.25)
      doc.line(MARGIN, STR_Y + strengthsBandH, PAGE_W - MARGIN, STR_Y + strengthsBandH)

      // Label
      sf(doc, 'bold', 'normal', 7)
      doc.setTextColor(...C.sectionLabel)
      doc.text('STRENGTHS', TEXT_X, STR_Y + BOX_PY + lh(7, 0.8))
      doc.setDrawColor(...C.divider)
      doc.setLineWidth(0.25)
      doc.line(TEXT_X, STR_Y + BOX_PY + lh(7, 1.1), PAGE_W - MARGIN - 5, STR_Y + BOX_PY + lh(7, 1.1))

      // Paragraph
      sf(doc, 'normal', 'normal', 9)
      doc.setTextColor(...C.strengthsTxt)
      const sy = STR_Y + BOX_PY + LABEL_H + STR_LH * 0.82
      strLines.forEach((line, i) => doc.text(line, TEXT_X, sy + i * STR_LH))
    }

    const BODY_Y = HDR_H + ACC_H + (strengthsBandH > 0 ? 6 + strengthsBandH + 4 : 0) + 7

    // ── Columns ──────────────────────────────────────────────────────────────
    // Draw order:
    //   1. LEFT: Function Levels (with evidence)
    //   2. Measure remaining left space, split KA into left-fits / right-overflow
    //   3. LEFT: KA items that fit
    //   4. RIGHT: KA overflow items (if any)
    //   5. RIGHT: Industries
    //   6. RIGHT: Tools
    //   7. RIGHT: Credentials

    const left  = makeColumn(doc, COL_L, 1, false)
    const right = makeColumn(doc, COL_R, 1, true)
    left.setY(BODY_Y)

    // ── 1. LEFT: Function Levels ──────────────────────────────────────────────

    // Sort functions highest level first
    const LEVEL_ORDER = ['Strategic Executive', 'Strategic Advisor', 'Strategic Manager', 'People Manager', 'Process Manager', 'Process Specialist']
    const sortedFunctions = [...functions].sort((a, b) => {
      const ai = LEVEL_ORDER.findIndex(l => a.name.includes(l))
      const bi = LEVEL_ORDER.findIndex(l => b.name.includes(l))
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
    })

    if (functions.length) {
      left.section('Function Levels')
      sortedFunctions.forEach(fn =>
        left.barRow(getSeniorityLabel(fn.name, fn.years), fn.years, C.barFn, C.labelFn, fn.evidence)
      )
      left.setY(left.getY() + SP.sectionGap)
    }

    // ── 2. Measure & split KA ─────────────────────────────────────────────────
    function kaItemHeight(ka) {
      const evLines = parseEvidence(ka.evidence)
      if (evLines.length === 0) return SP.barH + SP.noEvidenceGap
      sf(doc, 'normal', 'normal', 9)
      const wrapped = evLines.flatMap(l => doc.splitTextToSize(l, COL_W - 3.5 - 7))
      return SP.barH + SP.barToEvidence + wrapped.length * SP.evidenceLH + SP.evidenceToNext
    }

    const leftSpace   = FOOT_Y - 4 - left.getY()
    const kaLeft  = []
    const kaRight = []
    let usedH = SP.sectionToFirst + 6  // section heading height
    let overflowed = false

    for (const ka of knowledge_areas) {
      const h = kaItemHeight(ka)
      if (usedH + h <= leftSpace) {
        kaLeft.push(ka); usedH += h
      } else {
        kaRight.push(ka)
      }
    }

    // ── 3. LEFT: KA items that fit ────────────────────────────────────────────
    if (kaLeft.length > 0) {
      left.section('Knowledge Areas')
      kaLeft.forEach(ka => left.barRow(ka.name, ka.years, C.barKa, C.labelKa, ka.evidence))
    }

    // ── 4–7. RIGHT column ─────────────────────────────────────────────────────
    doc.setPage(1)
    right.setY(BODY_Y)

    // 4. KA overflow
    if (kaRight.length > 0) {
      right.section(kaLeft.length > 0 ? 'Knowledge Areas (cont.)' : 'Knowledge Areas')
      kaRight.forEach(ka => right.barRow(ka.name, ka.years, C.barKa, C.labelKa, ka.evidence))
      right.setY(right.getY() + SP.sectionGap)
    }

    // 5. Industries
    if (industries.length) {
      right.section('Industries')
      industries.forEach(ind =>
        right.barRow(ind.name, ind.years, C.barInd, C.labelInd, ind.evidence)
      )
      right.setY(right.getY() + SP.sectionGap)
    }

    // 6. Tools
    if (tools.length) {
      right.checkPage(24)
      let ry = right.getY()

      sf(doc, 'bold', 'normal', 9)
      doc.setTextColor(...C.sectionLabel)
      doc.text('TOOLING & METHODS', COL_R, ry)
      doc.setDrawColor(...C.divider)
      doc.setLineWidth(0.3)
      doc.line(COL_R, ry + 3, COL_R + COL_W, ry + 3)
      right.setY(ry + SP.sectionToFirst)

      const CHIP_H   = 6.5
      const CHIP_PX  = 4.5
      const CHIP_GAP = 2.5
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
        doc.text(tool, tx + tw / 2, ry + CHIP_H / 2 + lh(7.5, 0.28), { align: 'center' })
        tx += tw + CHIP_GAP
      })
      right.setY(right.getY() + CHIP_H + SP.sectionGap * 3)
    }

    // 7. Credentials
    if (credentials.length) {
      right.checkPage(10)
      let ry = right.getY()

      sf(doc, 'bold', 'normal', 9)
      doc.setTextColor(...C.sectionLabel)
      doc.text('EDUCATION & CREDENTIALS', COL_R, ry)
      doc.setDrawColor(...C.divider)
      doc.setLineWidth(0.3)
      doc.line(COL_R, ry + 3, COL_R + COL_W, ry + 3)
      ry += SP.sectionToFirst
      right.setY(ry)

      credentials.forEach(cred => {
        right.checkPage(9)
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
          doc.text(nl, COL_R, ry)
          ry += lh(9.5, 1.4)
        })

        if (sub) {
          sf(doc, 'normal', 'normal', 8.5)
          doc.setTextColor(...C.credSub)
          doc.splitTextToSize(sub, COL_W - 4).forEach(sl => {
            doc.text(sl, COL_R + 4, ry)
            ry += lh(8.5, 1.4)
          })
        }

        ry += 5
        right.setY(ry)
      })
    }

    // ── Footer on every page ─────────────────────────────────────────────────
    const total = doc.getNumberOfPages()
    for (let p = 1; p <= total; p++) {
      doc.setPage(p)
      drawFooter(doc)
    }

    doc.save(`rensume-card-${themeName}-${Date.now()}.pdf`)

  } catch (e) {
    alert('PDF error: ' + e.message)
    console.error('PDF generation error:', e)
  }
}
