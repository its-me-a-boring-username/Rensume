// src/lib/researchClassifier.js
// Classifier logic for the Rensume research tool.
// Prompt is assembled from 4 independently selectable components:
//   - classification_rules
//   - evidence_instructions
//   - extract_prompt
//   - function_level_definitions
// Each bank has 10 slots. Placeholders are greyed out in the UI.

export const VARIABLE_DEFINITIONS = {
  evidence_display_settings_key: "Controls fixed canonical evidence selection strategy (hidden from UI for now).",
  evidence_quality_assessment_key: "Controls relevance scoring weights used when evidence display strategy is relevance-first.",
  evidence_max_snippets: "Controls the maximum number of canonical snippets included per function label.",
  evidence_joiner: "Controls the delimiter used to join canonical snippets into one display string.",
}

// â”€â”€â”€ Models â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const AVAILABLE_MODELS = [
  { key: 'opus_4_6',   label: 'Opus 4.6',   model: 'claude-opus-4-6',            price: '$5 / $25 per MTok'     },
  { key: 'opus_4_5',   label: 'Opus 4.5',   model: 'claude-opus-4-5',            price: '$5 / $25 per MTok'     },
  { key: 'sonnet_4_6', label: 'Sonnet 4.6', model: 'claude-sonnet-4-6',          price: '$3 / $15 per MTok'     },
  { key: 'sonnet_4_5', label: 'Sonnet 4.5', model: 'claude-sonnet-4-5-20251001', price: '$3 / $15 per MTok'     },
  { key: 'haiku_4_5',  label: 'Haiku 4.5',  model: 'claude-haiku-4-5-20251001',  price: '$1 / $5 per MTok'      },
  { key: 'haiku_3_5',  label: 'Haiku 3.5',  model: 'claude-haiku-3-5-20241022',  price: '$0.80 / $4 per MTok'   },
  { key: 'haiku_3',    label: 'Haiku 3',    model: 'claude-haiku-3-20240307',    price: '$0.25 / $1.25 per MTok'},
]

// â”€â”€â”€ Constants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const CURRENT_DATE = new Date(2026, 2, 31) // March 31, 2026

export const ALL_FN_NAMES = [
  'Processing Specialist', 'Process Manager', 'People Manager',
  'Strategic Advisor', 'Strategic Manager', 'Strategic Executive', 'Chief Executive',
]

// â”€â”€â”€ Placeholder helper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const placeholder = (n) => ({
  key:         `placeholder_v${n}`,
  name:        `v${n} â€” Placeholder`,
  description: 'To be defined.',
  content:     'PLACEHOLDER â€” replace with content before use',
})

// â”€â”€â”€ Classification rules â€” 10 slots â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const CLASSIFICATION_RULES = [
  {
    key:         'rules_v1_standard',
    name:        'v1 â€” Standard',
    description: 'Baseline rules.',
    content: `- Apply only labels supported by the work described in that role â€” do not infer from title
- Function levels are independent â€” a role can have multiple labels simultaneously
- Do not suppress lower levels when higher ones are present
- Review each evidence field for accuracy before responding`,
  },
  {
    key:         'rules_v2_strict',
    name:        'v2 â€” Strict',
    description: 'No guessing. No combining evidence across bullet points. Omit rather than infer.',
    content: `- Apply only labels supported by the work described in that role â€” do not infer from title
- Function levels are independent â€” a role can have multiple labels simultaneously
- Do not suppress lower levels when higher ones are present
- Do not assign a label if you cannot find direct, unambiguous evidence â€” omit rather than guess
- Evidence must come from a single bullet point or sentence â€” do not combine evidence across multiple points
- Review each evidence field for accuracy before responding`,
  },
  {
    key:         'rules_v3_concise',
    name:        'v3 â€” Concise',
    description: 'Simplified version of standard. Shorter phrasing, fewer rules.',
    content: `- Apply only labels supported by the work described in a role
- A role can have multiple function levels simultaneously
- Do not assign a label if you cannot find direct, unambiguous evidence
- Review each evidence field for accuracy before responding`,
  },
  placeholder(4),
  placeholder(5),
  placeholder(6),
  placeholder(7),
  placeholder(8),
  placeholder(9),
  placeholder(10),
]

// â”€â”€â”€ Evidence instructions â€” 10 slots â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const EVIDENCE_INSTRUCTIONS = [
  {
    key:         'evidence_v1_strict',
    name:        'v1 â€” Strict (verbatim)',
    description: 'Exact words from the resume only. No paraphrase.',
    content:     `Evidence must be a verbatim quote from the resume text. Use single quotes inside evidence strings. Do not paraphrase or synthesise.`,
  },
  {
    key:         'evidence_v2_moderate',
    name:        'v2 â€” Moderate (paraphrase ok)',
    description: 'Direct quote or close paraphrase. Original meaning must be preserved.',
    content:     `Evidence should be a direct quote or close paraphrase from the role text. Minor rewording is acceptable but the original meaning must be preserved. Use single quotes inside evidence strings.`,
  },
  {
    key:         'evidence_v3_loose',
    name:        'v3 â€” Loose (synthesis ok)',
    description: 'Quote, paraphrase, or synthesis. Capture the substance of the work.',
    content:     `Evidence may be a quote, paraphrase, or synthesis of the role text. Capture the substance of the work performed. Use single quotes inside evidence strings.`,
  },
  {
    key:         'evidence_v4_strict_concise',
    name:        'v4 â€” Strict-Concise (verbatim)',
    description: 'Verbatim only. Shorter instruction than v1.',
    content:     `Evidence must be a verbatim quote from the resume text. Use single quotes inside evidence strings.`,
  },
  {
    key:         'evidence_v5_moderate_concise',
    name:        'v5 â€” Moderate-Concise (paraphrase ok)',
    description: 'Paraphrase ok. Shorter instruction than v2.',
    content:     `Evidence should be a direct quote or close paraphrase. Original meaning must be preserved. Use single quotes inside evidence strings.`,
  },
  {
    key:         'evidence_v6_loose_concise',
    name:        'v6 â€” Loose-Concise (synthesis ok)',
    description: 'Synthesis ok. Shorter instruction than v3.',
    content:     `Evidence may be a quote, paraphrase, or synthesis of the role text. Use single quotes inside evidence strings.`,
  },
  {
    key:         'evidence_v7_rich_all',
    name:        'v7 â€” Rich (All Sources)',
    description: 'Moderate + use high quality evidence from all roles that support a label.',
    content:     `Evidence should be a direct quote or close paraphrase from the role text. Minor rewording is acceptable but the original meaning must be preserved. Use high quality evidence from all roles that support a label. Use single quotes inside evidence strings.`,
  },
  {
    key:         'evidence_v8_rich_mixed',
    name:        'v8 â€” Rich (Mixed Sources)',
    description: 'Moderate + use evidence from different roles that support a label.',
    content:     `Evidence should be a direct quote or close paraphrase from the role text. Minor rewording is acceptable but the original meaning must be preserved. Use high quality evidence from different roles that support a label. Use single quotes inside evidence strings.`,
  },
  {
    key:         'evidence_v9_rich_best',
    name:        'v9 â€” Rich (Best Sources)',
    description: 'Moderate + use the best and most relevant evidence from different roles.',
    content:     `Evidence should be a direct quote or close paraphrase from the role text. Minor rewording is acceptable but the original meaning must be preserved. Use the best and most relevant evidence from different roles that support a label. Use single quotes inside evidence strings.`,
  },
  placeholder(10),
]

// â”€â”€â”€ Extract prompts â€” 10 slots â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const EXTRACT_PROMPTS = [
  {
    key:         'extract_v1_standard',
    name:        'v1 â€” Standard',
    description: 'Baseline extraction prompt with rules.',
    content: `You are a resume parser. Extract every role from this resume and return a JSON array. Return ONLY valid JSON with no markdown, no preamble, no backticks.

For each role return:
- title: job title as written
- employer: company name
- start_raw: start date exactly as written, or null if absent
- end_raw: end date exactly as written, or null if absent
- text: full role description text including all bullet points

Rules:
- Copy dates exactly â€” do not interpret or reformat them
- If one employer has multiple roles, return each separately
- Include all roles including short contracts and military service

Respond ONLY with: [{"title":"","employer":"","start_raw":"","end_raw":"","text":""}]`,
  },
  {
    key:         'extract_v2_no_rules',
    name:        'v2 â€” No Rules',
    description: 'Same structure as v1 but without the Rules section.',
    content: `You are a resume parser. Extract every role from this resume and return a JSON array. Return ONLY valid JSON with no markdown, no preamble, no backticks.

For each role return:
- title: job title as written
- employer: company name
- start_raw: start date exactly as written, or null if absent
- end_raw: end date exactly as written, or null if absent
- text: full role description text including all bullet points

Respond ONLY with: [{"title":"","employer":"","start_raw":"","end_raw":"","text":""}]`,
  },
  placeholder(3),
  placeholder(4),
  placeholder(5),
  placeholder(6),
  placeholder(7),
  placeholder(8),
  placeholder(9),
  placeholder(10),
]

// â”€â”€â”€ Function level definitions â€” 10 slots â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const FN_DEFINITIONS = [
  {
    key:         'fn_v1_rich_current',
    name:        'v1 â€” Rich (Live & Current)',
    description: 'Full definitions matching taxonomy_function_levels in Supabase.',
    content: `Processing Specialist - Executes clearly defined processes created by someone else. Routine work that may include a wide range of tasks
Process Manager - Defines the work. Translates policy into actionable processes. Manages and modifies existing processes
People Manager - Manages people who execute defined processes
Strategic Advisor - Surfaces problems through analysis, investigation, or research. Suggests processes and policies that should be implemented to align with strategic goals
Strategic Manager - Manages multiple teams with direct reporting relationships toward specific strategy-linked goals
Strategic Executive - Sets initiatives and determines priority within a defined scope. Has binding authority over outcomes, resources, or direction within a product, division, or organization
Chief Executive - Accountable for organizational performance as a whole. Sets the vision and strategic direction within which Strategic Executives operate`,
  },
  {
    key:         'fn_v2_label_only',
    name:        'v2 â€” Label Only',
    description: 'Label names only. No definitions. Tests whether the model uses its own understanding.',
    content: `Processing Specialist
Process Manager
People Manager
Strategic Advisor
Strategic Manager
Strategic Executive
Chief Executive`,
  },
  {
    key:         'fn_v3_simple',
    name:        'v3 â€” Simple (Original Definitions)',
    description: 'Shorter, simpler definitions from the original taxonomy.',
    content: `Processing Specialist - Executes defined processes
Process Manager - Improves and manages processes
People Manager - Manages a team of individual contributors
Strategic Advisor - Recommends what should happen. No binding authority
Strategic Manager - Manages multiple teams executing strategy-linked initiatives
Strategic Executive - Decides what should happen. Binding authority
Chief Executive - Accountable for organizational performance as a whole. Sets the vision and strategic direction`,
  },
  placeholder(4),
  placeholder(5),
  placeholder(6),
  placeholder(7),
  placeholder(8),
  placeholder(9),
  placeholder(10),
]

export const EVIDENCE_SELECTION_PRESETS = [
  {
    key: "strict_single_best",
    name: "Strict â€” Single Best",
    description: "Single canonical snippet. Relevance-first, no diversity constraint.",
    strategy: "relevance_first",
    coverage: "allow_same_role",
  },
  {
    key: "standard_balanced",
    name: "Standard â€” Balanced",
    description: "Up to 2 snippets. Relevance-first with distinct-role preference.",
    strategy: "relevance_first",
    coverage: "distinct_roles_preferred",
  },
  {
    key: "simple_website_style",
    name: "Simple â€” Website Style",
    description: "Up to 2 snippets by role order, joined with legacy 'and'.",
    strategy: "role_order",
    coverage: "allow_same_role",
  },
  {
    key: "broad_coverage",
    name: "Broad â€” Coverage First",
    description: "Up to 3 snippets with strict role diversity first.",
    strategy: "relevance_first",
    coverage: "strict_distinct_roles",
  },
]

export const EVIDENCE_QUALITY_ASSESSMENTS = [
  {
    key: "quality_v1_balanced",
    name: "Balanced",
    description: "Balanced weighting across specificity and action signals.",
    maxLength: 220,
    lengthWeight: 1,
    numberBonus: 10,
    quoteBonus: 4,
    actionVerbBonus: 8,
  },
  {
    key: "quality_v2_relevance_heavy",
    name: "Relevance Heavy",
    description: "Strongly rewards concrete and action-oriented evidence.",
    maxLength: 260,
    lengthWeight: 1,
    numberBonus: 14,
    quoteBonus: 6,
    actionVerbBonus: 12,
  },
  {
    key: "quality_v3_light_touch",
    name: "Light Touch",
    description: "Minimal scoring influence for softer ranking behavior.",
    maxLength: 180,
    lengthWeight: 1,
    numberBonus: 4,
    quoteBonus: 2,
    actionVerbBonus: 4,
  },
]

// â”€â”€â”€ Default selections â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const DEFAULT_SETTINGS = {
  rulesKey:    CLASSIFICATION_RULES[0].key,
  evidenceKey: EVIDENCE_INSTRUCTIONS[0].key,
  extractKey:  EXTRACT_PROMPTS[0].key,
  fnDefsKey:   FN_DEFINITIONS[0].key,
  evidenceDisplaySettingsKey: "standard_balanced",
  evidenceQualityAssessmentKey: "quality_v1_balanced",
  evidenceMaxSnippets: "2",
  evidenceJoiner: " • ",
}

export function getEvidenceDisplaySettingsByKey(key) {
  return EVIDENCE_SELECTION_PRESETS.find((p) => p.key === key) || EVIDENCE_SELECTION_PRESETS[2]
}

export function getEvidenceQualityAssessmentByKey(key) {
  return EVIDENCE_QUALITY_ASSESSMENTS.find((q) => q.key === key) || EVIDENCE_QUALITY_ASSESSMENTS[0]
}

export function isPlaceholderOption(option) {
  return String(option?.content || "").startsWith("PLACEHOLDER")
}

// â”€â”€â”€ Prompt assembly â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function buildClassifySystem(rules, evidence, fnDefs) {
  return `You are a resume taxonomy classifier for Rensume. You will receive a list of roles. For each role, classify which function levels apply based on the work described. Respond ONLY with valid JSON, no markdown, no preamble, no backticks.

Rules:
${rules.content}

Evidence:
${evidence.content}

Function levels:
${fnDefs.content}

Respond ONLY with a JSON array â€” one entry per role in the same order as input:
[{"role_index":0,"labels":[{"name":"","evidence":""}]}]`
}

// â”€â”€â”€ Date parser â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const PRESENT_PATTERNS = [
  /^present$/i, /^current$/i, /^now$/i, /^ongoing$/i,
  /^today$/i, /^till\s+date$/i, /^to\s+date$/i,
  /^-+$/, /^â€“+$/, /^â€”+$/,
]

const MONTH_NAMES = {
  jan:0,january:0,feb:1,february:1,mar:2,march:2,apr:3,april:3,may:4,
  jun:5,june:5,jul:6,july:6,aug:7,august:7,sep:8,sept:8,september:8,
  oct:9,october:9,nov:10,november:10,dec:11,december:11,
}

function lastDay(year, month) { return new Date(year, month + 1, 0).getDate() }

export function parseRawDate(raw) {
  if (raw === null || raw === undefined || raw.toString().trim() === '') return { type: 'null' }
  const cleaned = raw.toString().trim().replace(/^(to|through|until|â€“|-)\s*/i, '').trim()
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
    flagged = true; flag_reason = 'start date has year only â€” month required'
  } else if (sp.type === 'unknown') {
    flagged = true; flag_reason = `unrecognized start date: "${sp.raw}"`
  } else if (ep.type === 'year_only') {
    flagged = true; flag_reason = 'end date has year only â€” month required'
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

// â”€â”€â”€ API â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function callAPI(system, content, model) {
  const res = await fetch('/api/chat', {
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
  const raw = await callAPI(
    buildClassifySystem(rules, evidence, fnDefs),
    'Classify these roles:\n\n' + JSON.stringify(rolesInput, null, 2),
    model
  )
  return normalizeClassifications(raw)
}

export function normalizeClassifications(classifications) {
  const byRole = new Map()
  for (const row of Array.isArray(classifications) ? classifications : []) {
    const roleIndex = Number(row?.role_index)
    if (!Number.isFinite(roleIndex)) continue
    if (!byRole.has(roleIndex)) byRole.set(roleIndex, new Map())
    const labelMap = byRole.get(roleIndex)
    for (const label of Array.isArray(row?.labels) ? row.labels : []) {
      const name = String(label?.name || "").trim()
      const evidence = String(label?.evidence || "").trim()
      if (!name) continue
      if (!labelMap.has(name)) {
        labelMap.set(name, { name, evidence })
        continue
      }
      const existing = labelMap.get(name)
      if (!existing.evidence && evidence) existing.evidence = evidence
    }
  }
  return [...byRole.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([role_index, labelsMap]) => ({
      role_index,
      labels: [...labelsMap.values()],
    }))
}

export async function getSummary(resumeText, model) {
  const system = `You are a resume writer for Rensume. Given a resume, write a one-sentence summary (max 160 chars) and 1-2 sentence strengths. Respond ONLY with valid JSON: {"summary":"","strengths":""}`
  return callAPI(system, resumeText, model)
}

export function aggregateLabels(
  roles,
  classifications,
  evidenceDisplaySettingsKey = DEFAULT_SETTINGS.evidenceDisplaySettingsKey,
  evidenceQualityAssessmentKey = DEFAULT_SETTINGS.evidenceQualityAssessmentKey,
  evidenceMaxSnippets = DEFAULT_SETTINGS.evidenceMaxSnippets,
  evidenceJoiner = DEFAULT_SETTINGS.evidenceJoiner
) {
  const preset = getEvidenceDisplaySettingsByKey(evidenceDisplaySettingsKey)
  const quality = getEvidenceQualityAssessmentByKey(evidenceQualityAssessmentKey)
  const scoreEvidence = (text) => {
    const source = String(text || "")
    let s = Math.min(source.length, Number(quality.maxLength) || 220) * (Number(quality.lengthWeight) || 1)
    if (/\d/.test(source)) s += Number(quality.numberBonus) || 0
    if (/['"]/.test(source)) s += Number(quality.quoteBonus) || 0
    if (/\b(led|managed|built|designed|owned|drove|launched|reduced|improved|increased|defined|directed)\b/i.test(source)) {
      s += Number(quality.actionVerbBonus) || 0
    }
    return s
  }
  const pickEvidence = (items) => {
    const cleaned = []
    const seen = new Set()
    for (const item of Array.isArray(items) ? items : []) {
      const text = (item?.evidence || "").trim()
      if (!text) continue
      const dedupeKey = `${item.role_index}::${text.toLowerCase()}`
      if (seen.has(dedupeKey)) continue
      seen.add(dedupeKey)
      cleaned.push({ ...item, evidence: text })
    }
    if (!cleaned.length) return ""

    const ranked = [...cleaned].sort((a, b) => {
      if (preset.strategy === "role_order") {
        if (a.order !== b.order) return a.order - b.order
        return a.role_index - b.role_index
      }
      const delta = scoreEvidence(b.evidence) - scoreEvidence(a.evidence)
      if (delta !== 0) return delta
      if (a.role_index !== b.role_index) return a.role_index - b.role_index
      return a.order - b.order
    })

    const maxSnippets = Math.max(1, Number(evidenceMaxSnippets) || 1)
    const selected = []
    const usedRoles = new Set()
    for (const row of ranked) {
      if (selected.length >= maxSnippets) break
      const isUsedRole = usedRoles.has(row.role_index)
      if (preset.coverage === "strict_distinct_roles" && isUsedRole) continue
      if (preset.coverage === "distinct_roles_preferred" && isUsedRole) continue
      selected.push(row.evidence)
      usedRoles.add(row.role_index)
    }
    if (selected.length < maxSnippets && preset.coverage === "distinct_roles_preferred") {
      for (const row of ranked) {
        if (selected.length >= maxSnippets) break
        if (selected.includes(row.evidence)) continue
        selected.push(row.evidence)
      }
    }
    return selected.slice(0, maxSnippets).join(String(evidenceJoiner ?? " • "))
  }

  const labelAccum = {}
  let order = 0
  const roleLabelMonthsAdded = new Set()
  for (const roleClass of classifications) {
    const role = roles[roleClass.role_index]
    if (!role || role.flagged || !role.months) continue
    for (const label of (roleClass.labels || [])) {
      const labelName = String(label?.name || "").trim()
      if (!labelName) continue
      if (!labelAccum[labelName]) {
        labelAccum[labelName] = { name: labelName, months: 0, evidenceRows: [] }
      }
      const roleLabelKey = `${roleClass.role_index}::${labelName}`
      if (!roleLabelMonthsAdded.has(roleLabelKey)) {
        labelAccum[labelName].months += role.months
        roleLabelMonthsAdded.add(roleLabelKey)
      }
      if (label.evidence) {
        labelAccum[labelName].evidenceRows.push({
          role_index: Number(roleClass.role_index),
          evidence: label.evidence,
          order: order++,
        })
      }
    }
  }
  return Object.values(labelAccum).map(l => ({
    name:     l.name,
    months:   l.months,
    evidence: pickEvidence(l.evidenceRows),
  }))
}

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function m2y(m) { return Math.round((Number(m) / 12) * 10) / 10 }

export function seniority(name, months) {
  const y = m2y(months)
  const b = y < 2 ? 'Junior' : y < 5 ? 'Experienced' : y < 8 ? 'Senior' : 'Mature'
  return b + ' ' + name
}

