// src/lib/generatePdf.js
// Renders the live Card DOM node to a canvas via html2canvas,
// then embeds it in a jsPDF document. The PDF will look exactly
// like the on-screen card — no manual drawing required.
//
// Dependencies (add to package.json if not already present):
//   npm install html2canvas jspdf

import { jsPDF } from 'jspdf'
import html2canvas from 'html2canvas'

/**
 * Generate and download a PDF of the Rensume card.
 *
 * @param {HTMLElement} cardElement  - The DOM node of the rendered Card component.
 *                                     Pass a ref.current from the parent.
 * @param {string}      themeName    - Used only in the filename.
 */
export async function downloadCardPdf(cardElement, themeName = 'bordeaux') {
  if (!cardElement) throw new Error('No card element provided')

  // ── 1. Capture the card as a high-resolution canvas ──────────────────────
  const canvas = await html2canvas(cardElement, {
    scale: 3,           // 3× for crisp text on retina + print quality
    useCORS: true,
    backgroundColor: null,  // preserve card's own background
    logging: false,
  })

  // ── 2. Work out dimensions to fill A4 width with correct aspect ratio ─────
  const A4_W_MM  = 210
  const A4_H_MM  = 297
  const MARGIN   = 14   // mm each side

  const imgW_MM  = A4_W_MM - MARGIN * 2
  const aspect   = canvas.height / canvas.width
  const imgH_MM  = imgW_MM * aspect

  // ── 3. Create PDF and embed the image ─────────────────────────────────────
  const orientation = imgH_MM > A4_H_MM - MARGIN * 2 ? 'p' : 'p'
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation })

  // If the card is taller than one page, jsPDF will clip it.
  // For now we let it flow — multi-page support can be added later
  // by slicing the canvas into page-height chunks.
  const imgData = canvas.toDataURL('image/png')

  // Centre vertically if shorter than the page; otherwise top-align
  const topY = imgH_MM < A4_H_MM - MARGIN * 2
    ? (A4_H_MM - imgH_MM) / 2
    : MARGIN

  doc.addImage(imgData, 'PNG', MARGIN, topY, imgW_MM, imgH_MM)

  doc.save(`rensume-card-${themeName}-${Date.now()}.pdf`)
}
