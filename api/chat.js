// api/chat.js
// Vercel serverless function — proxies requests to the Anthropic API.
// Keeps the API key off the client. Called from the frontend as POST /api/chat.

export const config = { runtime: 'edge' }

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'
const MAX_TOKENS_CAP = 4000

const ALLOWED_MODELS = new Set([
  'claude-opus-4-6',
  'claude-opus-4-5',
  'claude-sonnet-4-6',
  'claude-sonnet-4-5-20250929',
  'claude-haiku-4-5-20251001',
  'claude-haiku-3-5-20241022',
  'claude-haiku-3-20240307',
])

const DEFAULT_MODEL = 'claude-sonnet-4-5-20250929'

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const origin = req.headers.get('origin') || ''
  const corsHeaders = {
    'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || origin,
    'Access-Control-Allow-Methods': 'POST',
    'Access-Control-Allow-Headers': 'Content-Type',
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

  const { system, messages, max_tokens, model } = body

  if (!system || !messages || !Array.isArray(messages)) {
    return new Response(JSON.stringify({ error: 'Missing required fields: system, messages' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }

  // Use requested model if in whitelist, otherwise fall back to default
  const resolvedModel = ALLOWED_MODELS.has(model) ? model : DEFAULT_MODEL

  const tokens = Math.min(Number(max_tokens) || 2000, MAX_TOKENS_CAP)

  try {
    const response = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: resolvedModel,
        max_tokens: tokens,
        temperature: 0,
        system,
        messages,
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      console.error('Anthropic API error:', response.status, err)
      return new Response(JSON.stringify({ error: 'Classification service error', status: response.status }), {
        status: 502,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    const data = await response.json()
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  } catch (err) {
    console.error('Proxy error:', err)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }
}
