// api/save-card.js
// Vercel edge function — saves a classified card to Supabase and returns its public URL.
// Uses the publishable key with an RLS insert policy for anonymous users.

export const config = { runtime: 'edge' }

const ALLOWED_THEMES = new Set(['bordeaux', 'ember', 'oxford', 'gilt', 'sterling'])

function generateToken() {
  const bytes = new Uint8Array(8)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('').slice(0, 10)
}

export default async function handler(req) {
  const origin = req.headers.get('origin') || ''
  const corsHeaders = {
    'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }

  let body
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }

  const { profile, theme = 'bordeaux' } = body

  if (!profile?.summary || !Array.isArray(profile.functions) || !Array.isArray(profile.knowledge_areas) || !Array.isArray(profile.industries)) {
    return new Response(JSON.stringify({ error: 'Missing required profile fields' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }

  const resolvedTheme = ALLOWED_THEMES.has(theme) ? theme : 'bordeaux'
  const totalYears = profile.functions.length > 0
    ? Math.max(...profile.functions.map(f => Number(f.years) || 0))
    : 0

  const url_token = generateToken()

  const SUPABASE_URL = process.env.VITE_SUPABASE_URL
  const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return new Response(JSON.stringify({ error: 'Server configuration error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/cards`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Prefer': 'return=representation',
      },
      body: JSON.stringify({
        url_token,
        theme: resolvedTheme,
        summary: profile.summary,
        strengths: profile.strengths || null,
        functions: profile.functions,
        knowledge_areas: profile.knowledge_areas,
        industries: profile.industries,
        tools: profile.tools || [],
        credentials: profile.credentials || [],
        total_years: totalYears,
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('Supabase insert error:', res.status, err)
      return new Response(JSON.stringify({ error: 'Failed to save card' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    const [card] = await res.json()
    const cardUrl = `${process.env.ALLOWED_ORIGIN || 'https://rensume.com'}/card/${card.url_token}`

    return new Response(JSON.stringify({ url: cardUrl, token: card.url_token }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  } catch (err) {
    console.error('Save card error:', err)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }
}
