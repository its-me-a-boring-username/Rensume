// src/lib/researchClassifier.js
// Classifier logic for the Rensume research tool.
// Prompt is assembled from 4 independently selectable components:
//   - classification_rules
//   - evidence_instructions
//   - extract_prompt
//   - function_level_definitions
// Each has 6 placeholder options to be populated and migrated to Supabase later.

// ─── Models ───────────────────────────────────────────────────────────────────

export const AVAILABLE_MODELS = [
  { key: 'opus_4_6',   label: 'Opus 4.6',   model: 'claude-opus-4-6',            price: '$5 / $25 per MTok'     },
  { key: 'opus_4_5',   label: 'Opus 4.5',   model: 'claude-opus-4-5',            price: '$5 / $25 per MTok'     },
  { key: 'sonnet_4_6', label: 'Sonnet 4.6', model: 'claude-sonnet-4-6',          price: '$3 / $15 per MTok'     },
  { key: 'sonnet_4_5', label: 'Sonnet 4.5', model: 'claude-sonnet-4-5-20251001', price: '$3 / $15 per MTok'     },
  { key: 'sonnet_4',   label: 'Sonnet 4',   model: 'claude-sonnet-4-20250514',   price: '$3 / $15 per MTok'     },
  { key: 'haiku_4_5',  label: 'Haiku 4.5',  model: 'claude-haiku-4-5-20251001',  price: '$1 / $5 per MTok'      },
  { key: 'haiku_3_5',  label: 'Haiku 3.5',  model: 'claude-haiku-3-5-20241022',  price: '$0.80 / $4 per MTok'   },
  { key: 'haiku_3',    label: 'Haiku 3',    model: 'claude-haiku-3-20240307',    price: '$0.25 / $1.25 per MTok'},
]

// ─── Constants ────────────────────────────────────────────────────────────────

export const CURRENT_DATE = new Date(2026, 2, 31) // March 31, 2026

export const ALL_FN_NAMES = [
  'Processing Specialist', 'Process Manager', 'People Manager',
  'Strategic Advisor', 'Strategic Manager', 'Strategic Executive', 'Chief Executive',
]

// ─── Component banks ──────────────────────────────────────────────────────────
// Four banks, each with 6 independently selectable options.
// Any combination is valid. The classifier assembles them at runtime.
// To be seeded into Supabase and fetched at runtime in a future iteration.

// ── Classification rules ──────────────────────────────────────────────────────

export const CLASSIFICATION_RULES = [
  {
    key:         'rules_v1_standard',
    name:        'Rules v1 — Standard',
    description: 'Current baseline rules.',
    content: `- Apply only labels supported by the work described in that role — do not infer from title
- Function levels are independent — a role can have multiple labels simultaneously
- Do not suppress lower levels when higher ones are present
- Review each evidence field for accuracy before responding`,
  },
  {
    key:         'rules_v2_strict',
    name:        'Rules v2 — Strict',
    description: 'No guessing. No combining evidence across bullet points. Omit rather than infer.',
    content: `- Apply only labels supported by the work described in that role — do not infer from title
- Function levels are independent — a role can have multiple labels simultaneously
- Do not suppress lower levels when higher ones are present
- Do not assign a label if you cannot find direct, unambiguous evidence — omit rather than guess
- Evidence must come from a single bullet point or sentence — do not combine evidence across multiple points
- Review each evidence field for accuracy before responding`,
  },
  {
    key:         'rules_v3_placeholder',
    name:        'Rules v3 — Placeholder',
    description: 'To be defined.',
    content:     'PLACEHOLDER — replace with content before use',
  },
  {
    key:         'rules_v4_placeholder',
    name:        'Rules v4 — Placeholder',
    description: 'To be defined.',
    content:     'PLACEHOLDER — replace with content before use',
  },
  {
    key:         'rules_v5_placeholder',
    name:        'Rules v5 — Placeholder',
    description: 'To be defined.',
    content:     'PLACEHOLDER — replace with content before use',
  },
  {
    key:         'rules_v6_placeholder',
    name:        'Rules v6 — Placeholder',
    description: 'To be defined.',
    content:     'PLACEHOLDER — replace with content before use',
  },
]

// ── Evidence instructions ─────────────────────────────────────────────────────

export const EVIDENCE_INSTRUCTIONS = [
  {
    key:         'evidence_v1_strict',
    name:        'Evidence v1 — Strict (verbatim)',
    description: 'Exact words from the resume only. No paraphrase.',
    content:     `Evidence must be a verbatim quote from the role text — copy the exact words. Use single quotes inside evidence strings. Do not paraphrase or synthesise.`,
  },
  {
    key:         'evidence_v2_moderate',
    name:        'Evidence v2 — Moderate (paraphrase ok)',
    description: 'Direct quote or close paraphrase. Meaning must be preserved exactly.',
    content:     `Evidence should be a direct quote or close paraphrase from the role text. Minor rewording is acceptable but the meaning must be preserved exactly. Use single quotes inside evidence strings.`,
  },
  {
    key:         'evidence_v3_loose',
    name:        'Evidence v3 — Loose (synthesis ok)',
    description: 'Quote, paraphrase, or synthesis. Capture the substance of the work.',
    content:     `Evidence may be a quote, paraphrase, or synthesis of the role text. Capture the substance of the work performed rather than exact wording. Use single quotes inside evidence strings.`,
  },
  {
    key:         'evidence_v4_placeholder',
    name:        'Evidence v4 — Placeholder',
    description: 'To be defined.',
    content:     'PLACEHOLDER — replace with content before use',
  },
  {
    key:         'evidence_v5_placeholder',
    name:        'Evidence v5 — Placeholder',
    description: 'To be defined.',
    content:     'PLACEHOLDER — replace with content before use',
  },
  {
    key:         'evidence_v6_placeholder',
    name:        'Evidence v6 — Placeholder',
    description: 'To be defined.',
    content:     'PLACEHOLDER — replace with content before use',
  },
]

// ── Extract prompts ───────────────────────────────────────────────────────────

export const EXTRACT_PROMPTS = [
  {
    key:         'extract_v1_standard',
    name:        'Extract v1 — Standard',
    description: 'Current baseline extraction prompt.',
    content: `You are a resume parser. Extract every role from this resume and return a JSON array. Return ONLY valid JSON with no markdown, no preamble, no backticks.

For each role return:
- title: job title as written
- employer: company name
- start_raw: start date exactly as written, or null if absent
- end_raw: end date exactly as written, or null if absent
- text: full role description text including all bullet points

Rules:
- Copy dates exactly — do not interpret or reformat them
- If one employer has multiple roles, return each separately
- Include all roles including short contracts and military service

Respond ONLY with: [{"title":"","employer":"","start_raw":"","end_raw":"","text":""}]`,
  },
  {
    key:         'extract_v2_placeholder',
    name:        'Extract v2 — Placeholder',
    description: 'To be defined.',
    content:     'PLACEHOLDER — replace with content before use',
  },
  {
    key:         'extract_v3_placeholder',
    name:        'Extract v3 — Placeholder',
    description: 'To be defined.',
    content:     'PLACEHOLDER — replace with content before use',
  },
  {
    key:         'extract_v4_placeholder',
    name:        'Extract v4 — Placeholder',
    description: 'To be defined.',
    content:     'PLACEHOLDER — replace with content before use',
  },
  {
    key:         'extract_v5_placeholder',
    name:        'Extract v5 — Placeholder',
    description: 'To be defined.',
    content:     'PLACEHOLDER — replace with content before use',
  },
  {
    key:         'extract_v6_placeholder',
    name:        'Extract v6 — Placeholder',
    description: 'To be defined.',
    content:     'PLACEHOLDER — replace with content before use',
  },
]

// ── Function level definitions ────────────────────────────────────────────────

export const FN_DEFINITIONS = [
  {
    key:         'fn_v1_current',
    name:        'Definitions v1 — Current',
    description: 'Locked definitions matching taxonomy_function_levels in Supabase.',
    content: `Processing Specialist - Executes clearly defined processes created by someone else. Routine work that may include a wide range of tasks
Process Manager - Defines the work. Translates policy into actionable processes. Manages and modifies existing processes
People Manager - Manages people who execute defined processes
Strategic Advisor - Surfaces problems through analysis, investigation, or research. Suggests processes and policies that should be implemented to align with strategic goals
Strategic Manager - Manages multiple teams with direct reporting relationships toward specific strategy-linked goals
Strategic Executive - Sets initiatives and determines priority within a defined scope. Has binding authority over outcomes, resources, or direction within a product, division, or organization
Chief Executive - Accountable for organizational performance as a whole. Sets the vision and strategic direction within which Strategic Executives operate`,
  },
  {
    key:         'fn_v2_placeholder',
    name:        'Definitions v2 — Placeholder',
    description: 'To be defined.',
    content:     'PLACEHOLDER — replace with content before use',
  },
  {
    key:         'fn_v3_placeholder',
    name:        'Definitions v3 — Placeholder',
    description: 'To be defined.',
    content:     'PLACEHOLDER — replace with content before use',
  },
  {
    key:         'fn_v4_placeholder',
    name:        'Definitions v4 — Placeholder',
    description: 'To be defined.',
    content:     'PLACEHOLDER — replace with content before use',
  },
  {
    key:         'fn_v5_placeholder',
    name:        'Definitions v5 — Placeholder',
    description: 'To be defined.',
    content:     'PLACEHOLDER — replace with content before use',
  },
  {
    key:         'fn_v6_placeholder',
    name:        'Definitions v6 — Placeholder',
    description: 'To be defined.',
    content:     'PLACEHOLDER — replace with content before use',
  },
]

// ─── Default selections ───────────────────────────────────────────────────────

export const DEFAULT_SETTINGS = {
  rulesKey:    CLASSIFICATION_RULES[0].key,
  evidenceKey: EVIDENCE_INSTRUCTIONS[0].key,
  extractKey:  EXTRACT_PROMPTS[0].key,
  fnDefsKey:   FN_DEFINITIONS[0].key,
}

// ─── Prompt assembly ──────────────────────────────────────────────────────────

export function buildClassifySystem(rules, evidence, fnDefs) {
  return `You are a resume taxonomy classifier for Rensume. You will receive a list of roles. For each role, classify which function levels apply based on the work described. Respond ONLY with valid JSON, no markdown, no preamble, no backticks.

Rules:
${rules.content}

Evidence:
${evidence.content}

Function levels:
${fnDefs.content}

Respond ONLY with a JSON array — one entry per role in the same order as input:
[{"role_index":0,"labels":[{"name":"","evidence":""}]}]`
}

// ─── Date parser ──────────────────────────────────────────────────────────────

const PRESENT_PATTERNS = [
  /^present$/i, /^current$/i, /^now$/i, /^ongoing$/i,
  /^today$/i, /^till\s+date$/i, /^to\s+date$/i,
  /^-+$/, /^–+$/, /^—+$/,
]

const MONTH_NAMES = {
  jan:0,january:0,feb:1,february:1,mar:2,march:2,apr:3,april:3,may:4,
  jun:5,june:5,jul:6,july:6,aug:7,august:7,sep:8,sept:8,september:8,
  oct:9,october:9,nov:10,november:10,dec:11,december:11,
}

function lastDay(year, month) { return new Date(year, month + 1, 0).getDate() }

export function parseRawDate(raw) {
  if (raw === null || raw === undefined || raw.toString().trim() === '') return { type: 'null' }
  const cleaned = raw.toString().trim().replace(/^(to|through|until|–|-)\s*/i, '').trim()
  for (const p of PRESENT_PATTERNS) if (p.test(cleaned)) return { type: 'present' }

  const mny = cleaned.match(/^([a-z]+)\.?\s+(\d{4})$/i)
  if (mny) {
    const month = MONTH_NAMES[mny[1].toLowerCase()]
    const year  = parseInt(mny[2])
    if (month !== undefined && !isNaN(year)) return { type: 'date', year, month }
  }
  const iso = cleaned.match(/^(\d{4})[-/](\d{1,2})$/)
  if (iso) {
    const year = parseInt(iso[1]), month = parseInt(iso[2]) - 1
    if (month >= 0 && month <= 11) return { type: 'date', year, month }
  }
  const msy = cleaned.match(/^(\d{1,2})\/(\d{4})$/)
  if (msy) {
    const month = parseInt(msy[1]) - 1, year = parseInt(msy[2])
    if (month >= 0 && month <= 11) return { type: 'date', year, month }
  }
  if (/^\d{4}$/.test(cleaned)) return { type: 'year_only', year: parseInt(cleaned) }
  return { type: 'unknown', raw: cleaned }
}

function toStart(p) { return p.type === 'date' ? new Date(p.year, p.month, 1) : p.type === 'present' ? CURRENT_DATE : null }
function toEnd(p)   { return p.type === 'date' ? new Date(p.year, p.month, lastDay(p.year, p.month)) : p.type === 'present' ? CURRENT_DATE : null }
function monthsBetween(s, e) { return Math.max(0, (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth()) + 1) }

export function processRole(role) {
  const sp = parseRawDate(role.start_raw)
  const ep = parseRawDate(role.end_raw)

  let flagged = false, flag_reason = null

  if (sp.type === 'null') {
    flagged = true
    flag_reason = ep.type === 'null' ? 'no dates found' : 'missing start date'
  } else if (sp.type === 'year_only') {
    flagged = true; flag_reason = 'start date has year only — month required'
  } else if (sp.type === 'unknown') {
    flagged = true; flag_reason = `unrecognized start date: "${sp.raw}"`
  } else if (ep.type === 'year_only') {
    flagged = true; flag_reason = 'end date has year only — month required'
  } else if (ep.type === 'unknown') {
    flagged = true; flag_reason = `unrecognized end date: "${ep.raw}"`
  }

  if (flagged) return { ...role, start: null, end: null, months: null, flagged: true, flag_reason }

  const startDate = toStart(sp)
  const endDate   = ep.type === 'null' ? CURRENT_DATE : toEnd(ep)
  return {
    ...role,
    start:       startDate.toISOString().split('T')[0],
    end:         endDate.toISOString().split('T')[0],
    months:      monthsBetween(startDate, endDate),
    flagged:     false,
    flag_reason: null,
  }
}

// ─── API ──────────────────────────────────────────────────────────────────────

export async function callAPI(system, content, model) {
  const res = await fetch('/api/anthropic/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, max_tokens: 4000, system, messages: [{ role: 'user', content }] }),
  })
  const data = await res.json()
  if (data.error) throw new Error(data.error.message)
  const raw = (data.content || []).map(b => b.text || '').join('').replace(/```json|```/g, '').trim()
  return JSON.parse(raw)
}

export async function extractRoles(resumeText, extractPrompt) {
  return callAPI(extractPrompt.content, 'Extract all roles:\n\n' + resumeText, 'claude-haiku-4-5-20251001')
}

export async function classifyRoles(roles, model, blind = false, rules, evidence, fnDefs) {
  const rolesInput = roles.map((r, i) => ({
    role_index: i,
    ...(blind ? { role_id: 'Role ' + (i + 1) } : { title: r.title, employer: r.employer }),
    months:  r.months,
    flagged: r.flagged,
    text:    r.text,
  }))
  return callAPI(
    buildClassifySystem(rules, evidence, fnDefs),
    'Classify these roles:\n\n' + JSON.stringify(rolesInput, null, 2),
    model
  )
}

export async function getSummary(resumeText, model) {
  const system = `You are a resume writer for Rensume. Given a resume, write a one-sentence summary (max 160 chars) and 1-2 sentence strengths. Respond ONLY with valid JSON: {"summary":"","strengths":""}`
  return callAPI(system, resumeText, model)
}

export function aggregateLabels(roles, classifications) {
  const labelAccum = {}
  for (const roleClass of classifications) {
    const role = roles[roleClass.role_index]
    if (!role || role.flagged || !role.months) continue
    for (const label of (roleClass.labels || [])) {
      if (!labelAccum[label.name]) {
        labelAccum[label.name] = { name: label.name, months: 0, evidences: [] }
      }
      labelAccum[label.name].months += role.months
      if (label.evidence) labelAccum[label.name].evidences.push(label.evidence)
    }
  }
  return Object.values(labelAccum).map(l => ({
    name:     l.name,
    months:   l.months,
    evidence: l.evidences.slice(0, 2).join(' and '),
  }))
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function m2y(m) { return Math.round((Number(m) / 12) * 10) / 10 }

export function seniority(name, months) {
  const y = m2y(months)
  const b = y < 2 ? 'Junior' : y < 5 ? 'Experienced' : y < 8 ? 'Senior' : 'Mature'
  return b + ' ' + name
}
