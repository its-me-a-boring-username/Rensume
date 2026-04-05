// ============================================================
// Rensume — taxonomy.js
// Fetches active taxonomy lists from Supabase at runtime.
// Used by classifier.js to build prompts dynamically.
// ============================================================
// Usage:
//   import { fetchTaxonomy } from './taxonomy.js'
//   const { knowledgeAreas, functionLevels, industries } = await fetchTaxonomy()
// ============================================================

const SUPABASE_URL     = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

console.log('SUPABASE_URL:', SUPABASE_URL)
console.log('SUPABASE_ANON_KEY:', SUPABASE_ANON_KEY)

async function fetchTable(table, select = '*', order = 'display_order') {
  console.log('Fetching:', table)
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/${table}?select=${select}&order=${order}&active=eq.true`,
    {
      headers: {
        'apikey':        SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
    }
  )
  if (!res.ok) throw new Error(`Failed to fetch ${table}: ${res.status}`)
  return res.json()
}

// Simple in-memory cache — avoids re-fetching on every classification
// within the same browser session. Clears on page reload.
let _cache = null

export async function fetchTaxonomy() {
  if (_cache) return _cache

  const [knowledgeAreas, functionLevels, industries] = await Promise.all([
    fetchTable('taxonomy_knowledge_areas', 'name,display_order'),
    fetchTable('taxonomy_function_levels', 'name,definition,display_order'),
    fetchTable('taxonomy_industries',      'name,display_order'),
  ])

  _cache = { knowledgeAreas, functionLevels, industries }
  return _cache
}

// Call this if you need to force a refresh after a taxonomy update
export function clearTaxonomyCache() {
  _cache = null
}

// ── Prompt formatters ─────────────────────────────────────────────────────────
// These produce the numbered list format the classifier expects.

export function formatKAList(knowledgeAreas) {
  return knowledgeAreas
    .map((ka, i) => `${i + 1}. ${ka.name}`)
    .join('\n')
}

export function formatIndustryList(industries) {
  return industries
    .map((ind, i) => `${i + 1}. ${ind.name}`)
    .join('\n')
}

export function formatFunctionLevels(functionLevels) {
  return functionLevels
    .map(fn => `${fn.name} - ${fn.definition}`)
    .join('\n')
}
