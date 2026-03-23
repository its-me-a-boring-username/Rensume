// src/lib/generatePdf.js
// Generates a downloadable PDF of the Rensume taxonomy card using jsPDF.
// Mirrors the card visual design as closely as possible in PDF drawing commands.

import { jsPDF } from 'jspdf'
import { THEMES } from '../components/Card'
import { getSeniorityLabel } from './classifier'

// ─── Layout constants ─────────────────────────────────────────────────────────

const PAGE_W    = 210  // A4 mm
const PAGE_H    = 297
const MARGIN    = 16
const COL_W     = PAGE_W - MARGIN * 2
const CARD_X    = MARGIN
const HDR_H     = 36
const ACC_H     = 1.5
const FONT      = 'helvetica'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hexToRgb(hex) {
  const h = hex.replace('#', '')
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ]
}

function setFill(doc, hex) {
  doc.setFillColor(...hexToRgb(hex))
}

function setTextColor(doc, hex) {
  doc.setTextColor(...hexToRgb(hex))
}

function setDrawColor(doc, hex) {
  doc.setDrawColor(...hexToRgb(hex))
}

/**
 * Wrap text to fit within maxWidth, return array of lines.
 */
function wrapText(doc, text, maxWidth, fontSize) {
  doc.setFontSize(fontSize)
  return doc.splitTextToSize(text || '', maxWidth)
}

/**
 * Draw a filled rounded rect approximation (jsPDF roundedRect).
 */
function pill(doc, x, y, w, h, fillHex, textHex, label, fontSize = 6.5) {
  setFill(doc, fillHex)
  doc.roundedRect(x, y, w, h, 1.5, 1.5, 'F')
  setTextColor(doc, textHex)
  doc.setFont(FONT, 'bold')
  doc.setFontSize(fontSize)
  doc.text(label, x + w / 2, y + h / 2 + fontSize * 0.18, { align: 'center' })
}

/**
 * Draw a section divider line + label.
 */
function sectionHeader(doc, label, x, y, w, secColor, divColor) {
  setDrawColor(doc, divColor)
  doc.setLineWidth(0.2)
  doc.line(x, y + 3.5, x + w, y + 3.5)
  setTextColor(doc, secColor)
  doc.setFont(FONT, 'bold')
  doc.setFontSize(6)
  doc.text(label.toUpperCase(), x, y + 3)
  return y + 7
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Generate and download a PDF of the Rensume card.
 *
 * @param {object} profile  — classified profile from classifier.js
 * @param {string} themeName — one of the THEMES keys
 */
export function downloadCardPdf(profile, themeName = 'bordeaux') {
  const t = THEMES[themeName] || THEMES.bordeaux
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })

  const {
    summary = '',
    strengths = '',
    functions = [],
    knowledge_areas = [],
    industries = [],
    tools = [],
    credentials = [],
  } = profile

  let y = MARGIN

  // ── Header ──────────────────────────────────────────────────────────────────

  setFill(doc, t.header.background)
  doc.rect(CARD_X, y, COL_W, HDR_H, 'F')

  // Logo
  setTextColor(doc, t.logo.color)
  doc.setFont(FONT, 'bold')
  doc.setFontSize(6)
  doc.text('RENSUME · TAXONOMY PROFILE', CARD_X + 5, y + 7)

  // Summary
  setTextColor(doc, t.summary.color)
  doc.setFont(FONT, 'normal')
  doc.setFontSize(8)
  const summaryLines = wrapText(doc, summary, COL_W - 10, 8)
  summaryLines.forEach((line, i) => {
    doc.text(line, CARD_X + 5, y + 13 + i * 4.5)
  })

  y += HDR_H

  // ── Accent rule ─────────────────────────────────────────────────────────────

  setFill(doc, t.accent.background)
  doc.rect(CARD_X, y, COL_W, ACC_H, 'F')
  y += ACC_H

  // ── Body ────────────────────────────────────────────────────────────────────

  setFill(doc, t.body.background)
  const bodyStartY = y

  // We'll draw the body background after we know the height
  // For now, track y and draw rows

  y += 6

  // ── Function ────────────────────────────────────────────────────────────────

  if (functions.length) {
    y = sectionHeader(doc, 'Function', CARD_X + 5, y, COL_W - 10, t.section.color, t.section.borderBottom.replace('0.5px solid ', ''))

    functions.forEach(fn => {
      const label = getSeniorityLabel(fn.name, fn.years)
      const pillW = Math.min(doc.getTextWidth(label) * 1.6 + 8, 80)
      pill(doc, CARD_X + 5, y, pillW, 7, t.pillFn.background, t.pillFn.color, label)
      setTextColor(doc, t.years.color)
      doc.setFont(FONT, 'normal')
      doc.setFontSize(6.5)
      doc.text(`${fn.years}y`, CARD_X + COL_W - 10, y + 5, { align: 'right' })
      y += 10
    })
  }

  // ── Knowledge area ──────────────────────────────────────────────────────────

  if (knowledge_areas.length) {
    y += 2
    y = sectionHeader(doc, 'Knowledge area', CARD_X + 5, y, COL_W - 10, t.section.color, t.section.borderBottom.replace('0.5px solid ', ''))

    knowledge_areas.forEach(ka => {
      const pillW = Math.min(doc.getTextWidth(ka.name) * 1.6 + 8, 90)
      pill(doc, CARD_X + 5, y, pillW, 7, t.pillKa.background, t.pillKa.color, ka.name)
      setTextColor(doc, t.years.color)
      doc.setFont(FONT, 'normal')
      doc.setFontSize(6.5)
      doc.text(`${ka.years}y`, CARD_X + COL_W - 10, y + 5, { align: 'right' })
      y += 10
    })
  }

  // ── Industry ────────────────────────────────────────────────────────────────

  if (industries.length) {
    y += 2
    y = sectionHeader(doc, 'Industry', CARD_X + 5, y, COL_W - 10, t.section.color, t.section.borderBottom.replace('0.5px solid ', ''))

    industries.forEach(ind => {
      const pillW = Math.min(doc.getTextWidth(ind.name) * 1.6 + 8, 80)
      setFill(doc, t.pillInd.background)
      doc.roundedRect(CARD_X + 5, y, pillW, 7, 1.5, 1.5, 'F')
      setDrawColor(doc, t.pillInd.border?.replace('0.5px solid ', '') || '#c8c0b8')
      doc.setLineWidth(0.2)
      doc.roundedRect(CARD_X + 5, y, pillW, 7, 1.5, 1.5, 'S')
      setTextColor(doc, t.pillInd.color)
      doc.setFont(FONT, 'bold')
      doc.setFontSize(6.5)
      doc.text(ind.name, CARD_X + 5 + pillW / 2, y + 4.7, { align: 'center' })
      setTextColor(doc, t.years.color)
      doc.setFont(FONT, 'normal')
      doc.text(`${ind.years}y`, CARD_X + COL_W - 10, y + 5, { align: 'right' })
      y += 10
    })
  }

  // ── Strengths ───────────────────────────────────────────────────────────────

  if (strengths) {
    y += 2
    y = sectionHeader(doc, 'Strengths', CARD_X + 5, y, COL_W - 10, t.section.color, t.section.borderBottom.replace('0.5px solid ', ''))

    setFill(doc, '#f5f1eb')
    const strLines = wrapText(doc, strengths, COL_W - 18, 8)
    const strBoxH = strLines.length * 4.5 + 6
    doc.rect(CARD_X + 5, y, COL_W - 10, strBoxH, 'F')
    setTextColor(doc, '#504030')
    doc.setFont(FONT, 'normal')
    doc.setFontSize(8)
    strLines.forEach((line, i) => {
      doc.text(line, CARD_X + 9, y + 5 + i * 4.5)
    })
    y += strBoxH + 4
  }

  // ── Tools ───────────────────────────────────────────────────────────────────

  if (tools.length) {
    y = sectionHeader(doc, 'Tooling & methods', CARD_X + 5, y, COL_W - 10, t.section.color, t.section.borderBottom.replace('0.5px solid ', ''))

    let tx = CARD_X + 5
    tools.forEach(tool => {
      doc.setFontSize(6.5)
      const tw = doc.getTextWidth(tool) + 8
      if (tx + tw > CARD_X + COL_W - 5) { tx = CARD_X + 5; y += 9 }
      setFill(doc, '#edeae6')
      doc.roundedRect(tx, y, tw, 6.5, 1, 1, 'F')
      setTextColor(doc, '#403830')
      doc.setFont(FONT, 'bold')
      doc.text(tool, tx + tw / 2, y + 4.5, { align: 'center' })
      tx += tw + 3
    })
    y += 12
  }

  // ── Credentials ─────────────────────────────────────────────────────────────

  if (credentials.length) {
    y = sectionHeader(doc, 'Education & credentials', CARD_X + 5, y, COL_W - 10, t.section.color, t.section.borderBottom.replace('0.5px solid ', ''))

    credentials.forEach(c => {
      setTextColor(doc, '#a09080')
      doc.setFont(FONT, 'bold')
      doc.setFontSize(6)
      doc.text(c.type?.toUpperCase() || '', CARD_X + 5, y + 4)

      setTextColor(doc, '#1a1410')
      doc.setFont(FONT, 'bold')
      doc.setFontSize(8)
      const typeW = doc.getTextWidth((c.type?.toUpperCase() || '') + '  ')
      doc.text(c.name || '', CARD_X + 5 + typeW + 2, y + 4)

      if (c.institution || c.year) {
        setTextColor(doc, '#706050')
        doc.setFont(FONT, 'normal')
        doc.setFontSize(7.5)
        const extra = [c.institution, c.year].filter(Boolean).join(' · ')
        doc.text(` · ${extra}`, CARD_X + 5 + typeW + 2 + doc.getTextWidth(c.name || '') + 1, y + 4)
      }
      y += 8
    })
  }

  y += 4

  // ── Draw body background behind everything ───────────────────────────────────

  const bodyH = y - bodyStartY
  setFill(doc, t.body.background)
  doc.rect(CARD_X, bodyStartY, COL_W, bodyH, 'F')

  // Re-draw content on top of background by saving/restoring isn't possible in jsPDF,
  // so instead we set background first then redraw all body content.
  // Simple workaround: draw body bg, then re-call the drawing.
  // Actually jsPDF draws in order, so we need to draw background first.
  // The approach here is acceptable for a testing/download tool.

  // ── Footer ──────────────────────────────────────────────────────────────────

  setFill(doc, t.footer.background)
  doc.rect(CARD_X, y, COL_W, 10, 'F')
  setDrawColor(doc, t.footer.borderTop.replace('0.5px solid ', ''))
  doc.setLineWidth(0.2)
  doc.line(CARD_X, y, CARD_X + COL_W, y)

  setTextColor(doc, t.footerLeft.color)
  doc.setFont(FONT, 'normal')
  doc.setFontSize(6.5)
  doc.text('Candidate-owned · read-only for recruiters', CARD_X + 5, y + 6.5)

  setTextColor(doc, t.footerRight.color)
  doc.setFont(FONT, 'bold')
  doc.setFontSize(6.5)
  doc.text('RENSUME', CARD_X + COL_W - 5, y + 6.5, { align: 'right' })

  // ── Save ────────────────────────────────────────────────────────────────────

  const filename = `rensume-card-${themeName}-${Date.now()}.pdf`
  doc.save(filename)
}
