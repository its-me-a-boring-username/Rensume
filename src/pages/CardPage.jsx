// src/pages/CardPage.jsx
// Public digital card page — fetched by url_token, shown to recruiters via QR code.

import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Card from '../components/Card'

const NAV_STYLE = {
  background: '#2c3038',
  borderBottom: '0.5px solid #404850',
  padding: '0 40px',
  height: 52,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  flexShrink: 0,
}

const FOOTER_STYLE = {
  background: '#2c3038',
  borderTop: '0.5px solid #404850',
  padding: '14px 40px',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
}

export default function CardPage() {
  const { token } = useParams()
  const [card, setCard] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!token) return
    supabase
      .from('cards')
      .select('*')
      .eq('url_token', token)
      .is('deleted_at', null)
      .single()
      .then(({ data, error }) => {
        if (error || !data) setError('Card not found.')
        else setCard(data)
      })
  }, [token])

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', fontFamily: "'IBM Plex Sans', Arial, sans-serif", background: '#faf8f4' }}>

      {/* Site nav */}
      <nav style={NAV_STYLE}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.18em', color: '#904060', textTransform: 'uppercase' }}>
          Rensume
        </span>
        <span style={{ fontSize: 10, color: '#909aa8' }}>Taxonomy Profiles</span>
      </nav>

      {/* Body */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 24px', gap: 20, maxWidth: 860, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>

        {/* Recruiter CTA */}
        <div style={{
          width: '100%', maxWidth: 800,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: '#fff', border: '0.5px solid #d8d0c4', borderRadius: 4,
          padding: '14px 20px', gap: 24,
        }}>
          <span style={{ fontSize: 11, color: '#706050', lineHeight: 1.6 }}>
            <strong style={{ color: '#1a1410' }}>Are you a recruiter?</strong> Get structured taxonomy profiles for all your candidates.
          </span>
          <a
            href="/"
            style={{
              fontSize: 10, fontWeight: 700, color: '#904060',
              border: '1px solid #904060', borderRadius: 3,
              padding: '8px 16px', whiteSpace: 'nowrap', textDecoration: 'none', flexShrink: 0,
            }}
          >
            For recruiters →
          </a>
        </div>

        {/* Card */}
        {error && (
          <div style={{ fontSize: 12, color: '#a09080', marginTop: 40 }}>{error}</div>
        )}
        {!card && !error && (
          <div style={{ fontSize: 12, color: '#a09080', marginTop: 40 }}>Loading…</div>
        )}
        {card && (
          <Card
            profile={{
              summary:         card.summary,
              strengths:       card.strengths,
              functions:       card.functions,
              knowledge_areas: card.knowledge_areas,
              industries:      card.industries,
              tools:           card.tools || [],
              credentials:     card.credentials || [],
            }}
            theme={card.theme}
            showEvidence={true}
            web={true}
            style={{ width: '100%' }}
          />
        )}
      </main>

      {/* Site footer */}
      <footer style={FOOTER_STYLE}>
        <span style={{ fontSize: 9, color: '#909aa8' }}>© 2026 Rensume</span>
        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.12em', color: '#904060' }}>RENSUME</span>
      </footer>
    </div>
  )
}
