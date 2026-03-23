// src/lib/generatePdf.js

import { jsPDF } from 'jspdf'
import html2canvas from 'html2canvas'

export async function downloadCardPdf(cardElement, themeName = 'bordeaux') {
  // ── Loud failure so we know exactly what's wrong ──────────────────────────
  if (!cardElement) {
    alert('PDF error: cardElement is null. The ref is not attached to the Card component yet. Check that Card uses forwardRef and that ref={cardRef} is on the Card in GeneratePage.')
    return
  }

  try {
    const canvas = await html2canvas(cardElement, {
      scale: 3,
      useCORS: true,
      backgroundColor: null,
      logging: false,
    })

    const A4_W    = 210
    const A4_H    = 297
    const MARGIN  = 14
    const imgW    = A4_W - MARGIN * 2
    const imgH    = imgW * (canvas.height / canvas.width)
    const topY    = imgH < A4_H - MARGIN * 2 ? (A4_H - imgH) / 2 : MARGIN

    const doc = new jsPDF({ unit: 'mm', format: 'a4' })
    doc.addImage(canvas.toDataURL('image/png'), 'PNG', MARGIN, topY, imgW, imgH)
    doc.save(`rensume-card-${themeName}-${Date.now()}.pdf`)

  } catch (e) {
    alert(`PDF error: ${e.message}\n\nCheck the browser console for details.`)
    console.error('PDF generation failed:', e)
  }
}
