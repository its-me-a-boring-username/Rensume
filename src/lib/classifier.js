// src/lib/classifier.js
// Rensume live classifier.
// Flow: extract roles -> classify role-level labels/evidence -> deterministic month aggregation in code.

import { fetchTaxonomy, formatKAList, formatIndustryList, formatFunctionLevels } from './taxonomy.js'

const MAX_EVIDENCE_LINES_PER_LABEL = 3
const MAX_EVIDENCE_CHARS           = 100
const MAX_INDUSTRY_EVIDENCE_CHARS  = 50
const MAX_INDUSTRIES_RETURNED      = 3
const MAX_KNOWLEDGE_AREAS_RETURNED = 6

const PEOPLE_MANAGER_DEFINITION =
  'Manages people who execute defined processes. This includes guiding or directing the work of other employees, contractors, and BPOs (business process outsourcing partners) who may or may not be direct reports'


// --- Prompts ---------------------------------------------------------------

function buildExtractSystem() {
  return `You are a resume parser for Rensume. Extract roles, tools, and credentials, then return ONLY valid JSON.

Return this exact structure:
{
  "roles": [{"title":"","employer":"","start_raw":"","end_raw":"","text":""}],
  "tools": ["tool name"],
  "credentials": [{"type":"Degree|Certification|License","name":"","institution":"","year":""}]
}

Rules:
- roles: extract every professional role. Copy start_raw and end_raw exactly as written. Keep each role separate. Include all bullet points in "text". If end date is missing but role appears current, set end_raw to "Present".
- tools: extract ONLY items explicitly listed in a dedicated Tools, Skills, or Software section. Do NOT infer tools or methods from role descriptions. If no tools section exists, return [].
- credentials: extract degrees, certifications, and licenses from Education or Credentials sections only. Do not infer from role descriptions.
- No markdown, no backticks, no commentary.`
}

function buildSharedSystem(functionLevels, industries) {
  return `///TASK DESCRIPTION///
You are a resume taxonomy classifier for Rensume.
You will receive parsed role data. Classify labels per role and provide evidence.

Return ONLY valid JSON. No markdown, no preamble, no backticks.

///CRITICAL RULES///
- Use only the provided parsed role data.
- For each role_index, assign zero or more function labels and zero or more industry labels.
- Function levels are independent. Do not infer a higher level by combining two lower-level signals.
- Use exact label names from the provided lists.
- Evidence must be a direct quote or close paraphrase from the role text. Maximum 100 characters per evidence string.
- Use single quotes inside evidence strings.

Function levels list:
${formatFunctionLevels(functionLevels)}

Industry list (exact NAICS sector names):
${formatIndustryList(industries)}

Respond ONLY with this exact JSON structure:
{
  "summary": "one plain sentence, max 160 chars",
  "strengths": "1-2 sentences highlighting differentiators",
  "role_assignments": [
    {
      "role_index": 0,
      "functions": [{"name": "", "evidence": ""}],
      "industries": [{"name": "", "evidence": ""}]
    }
  ]
}`
}

function buildKnowledgeAreaSystem(knowledgeAreas) {
  return `///TASK DESCRIPTION///
You are a resume taxonomy classifier for Rensume.
You will receive parsed role data. Classify Knowledge Areas per role using SOC 2018 minor group names.

Return ONLY valid JSON. No markdown, no preamble, no backticks.

///CRITICAL RULES///
- Use only the provided parsed role data.
- For each role_index, assign zero or more knowledge area labels.
- Use exact names from the provided list.
- Evidence must be a direct quote or close paraphrase from role text. Maximum 100 characters per evidence string.
- Keep coverage broad but precise; avoid collapsing distinct domains.

Allowed knowledge area names (exact):
${formatKAList(knowledgeAreas)}

Respond ONLY with this exact JSON:
{
  "role_assignments": [
    {
      "role_index": 0,
      "knowledge_areas": [{"name": "", "evidence": ""}]
    }
  ]
}`
}

// --- Helpers ---------------------------------------------------------------

function monthsToYears(months) {
  return Math.round((Number(months) / 12) * 10) / 10
}

function convertMonthsToYears(items) {
  if (!items?.length) return items
  return items.map(i => ({ ...i, years: monthsToYears(i.months) }))
}

export function getSeniorityLabel(functionName, years) {
  const n = Number(years) || 0
  let band
  if (n < 2)      band = 'Junior'
  else if (n < 5) band = 'Experienced'
  else if (n < 8) band = 'Senior'
  else            band = 'Mature'
  return `${band} ${functionName}`
}

const PRESENT_PATTERNS = [
  /^present$/i, /^current$/i, /^now$/i, /^ongoing$/i,
  /^today$/i, /^till\s+date$/i, /^to\s+date$/i,
  /^-+$/i, /^–+$/i, /^—+$/i,
]

const MONTH_NAMES = {
  jan:0,january:0,feb:1,february:1,mar:2,march:2,apr:3,april:3,may:4,
  jun:5,june:5,jul:6,july:6,aug:7,august:7,sep:8,sept:8,september:8,
  oct:9,october:9,nov:10,november:10,dec:11,december:11,
}

function lastDay(year, month) { return new Date(year, month + 1, 0).getDate() }

function parseRawDate(raw) {
  if (raw === null || raw === undefined || raw.toString().trim() === '') return { type: 'null' }
  const cleaned = raw.toString().trim().replace(/^(to|through|until|–|-)\s*/i, '').trim()
  for (const p of PRESENT_PATTERNS) if (p.test(cleaned)) return { type: 'present' }

  const mny = cleaned.match(/^([a-z]+)\.?\s+(\d{4})$/i)
  if (mny) {
    const month = MONTH_NAMES[mny[1].toLowerCase()]
    const year = parseInt(mny[2], 10)
    if (month !== undefined && !Number.isNaN(year)) return { type: 'date', year, month }
  }

  const iso = cleaned.match(/^(\d{4})[-/](\d{1,2})$/)
  if (iso) {
    const year = parseInt(iso[1], 10)
    const month = parseInt(iso[2], 10) - 1
    if (month >= 0 && month <= 11) return { type: 'date', year, month }
  }

  const msy = cleaned.match(/^(\d{1,2})\/(\d{4})$/)
  if (msy) {
    const month = parseInt(msy[1], 10) - 1
    const year = parseInt(msy[2], 10)
    if (month >= 0 && month <= 11) return { type: 'date', year, month }
  }

  if (/^\d{4}$/.test(cleaned)) return { type: 'year_only', year: parseInt(cleaned, 10) }
  return { type: 'unknown', raw: cleaned }
}

function toStart(p, nowDate) {
  return p.type === 'date' ? new Date(p.year, p.month, 1) : p.type === 'present' ? nowDate : null
}
function toEnd(p, nowDate) {
  return p.type === 'date' ? new Date(p.year, p.month, lastDay(p.year, p.month)) : p.type === 'present' ? nowDate : null
}
function monthsBetween(s, e) {
  return Math.max(0, (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth()) + 1)
}

function processExtractedRole(role, nowDate = new Date()) {
  const sp = parseRawDate(role.start_raw)
  const ep = parseRawDate(role.end_raw)

  if (sp.type === 'unknown' || ep.type === 'unknown') {
    return { ...role, months: 0, flagged: true, flag_reason: 'unparsed date', start: null, end: null }
  }
  if (sp.type === 'null') {
    return { ...role, months: 0, flagged: true, flag_reason: 'missing start date', start: null, end: null }
  }

  const startDate = toStart(sp, nowDate)
  const endDate = ep.type === 'null' ? nowDate : toEnd(ep, nowDate)

  if (!startDate || !endDate || startDate > endDate) {
    return { ...role, months: 0, flagged: true, flag_reason: 'invalid date range', start: null, end: null }
  }

  return {
    ...role,
    months: monthsBetween(startDate, endDate),
    start: startDate.toISOString().slice(0, 10),
    end: endDate.toISOString().slice(0, 10),
    flagged: false,
    flag_reason: null,
  }
}

function normalizeExtractedRoles(parsed) {
  const rawRoles = Array.isArray(parsed?.roles) ? parsed.roles : []
  return rawRoles.map((r) => processExtractedRole({
    title:     String(r?.title     || '').trim(),
    employer:  String(r?.employer  || '').trim(),
    start_raw: String(r?.start_raw || '').trim(),
    end_raw:   String(r?.end_raw   || '').trim(),
    text:      String(r?.text      || '').trim(),
  }))
}

function buildRolePayload(roles) {
  const clean = (Array.isArray(roles) ? roles : []).filter(r => !r.flagged && (Number(r.months) || 0) > 0)
  return {
    roles: clean.map((r, roleIndex) => ({
      role_index: roleIndex,
      title:      r.title    || '',
      employer:   r.employer || '',
      months:     Number(r.months) || 0,
      text:       r.text     || '',
    })),
  }
}

function buildCanonicalNameMap(names) {
  const map = new Map()
  for (const n of names || []) {
    const name = String(n || '').trim()
    if (!name) continue
    map.set(name.toLowerCase(), name)
  }
  return map
}

function truncateEvidence(str, maxChars = MAX_EVIDENCE_CHARS) {
  const t = String(str || '').trim()
  return t.length > maxChars ? t.slice(0, maxChars - 3) + '...' : t
}

function aggregateRoleAssignments(roles, roleAssignments, fieldKey, allowedNames, maxChars = MAX_EVIDENCE_CHARS) {
  const canonical = buildCanonicalNameMap(allowedNames)
  const byName = new Map()
  const monthsAdded = new Set()

  for (const row of Array.isArray(roleAssignments) ? roleAssignments : []) {
    const roleIndex = Number(row?.role_index)
    if (!Number.isFinite(roleIndex)) continue
    const role = roles[roleIndex]
    if (!role) continue

    const labels = Array.isArray(row?.[fieldKey]) ? row[fieldKey] : []
    for (const label of labels) {
      const rawName = String(label?.name || '').trim()
      if (!rawName) continue
      const key = rawName.toLowerCase()
      const canonicalName = canonical.get(key)
      if (!canonicalName) continue

      if (!byName.has(canonicalName)) {
        byName.set(canonicalName, {
          name: canonicalName,
          months: 0,
          evidenceRows: [],
          roleIndexes: new Set(),
          latestRoleIndex: Number.POSITIVE_INFINITY,
        })
      }
      const agg = byName.get(canonicalName)
      agg.roleIndexes.add(roleIndex)
      if (roleIndex < agg.latestRoleIndex) agg.latestRoleIndex = roleIndex

      const dedupeKey = `${roleIndex}::${canonicalName}`
      if (!monthsAdded.has(dedupeKey)) {
        agg.months += Number(role.months) || 0
        monthsAdded.add(dedupeKey)
      }

      const evidence = String(label?.evidence || '').trim()
      if (evidence) agg.evidenceRows.push({ role_index: roleIndex, evidence })
    }
  }

  const toEvidence = (rows) => {
    const seen = new Set()
    const picked = []
    for (const row of rows || []) {
      const t = truncateEvidence(row?.evidence, maxChars)
      if (!t) continue
      const k = t.toLowerCase()
      if (seen.has(k)) continue
      seen.add(k)
      picked.push(t)
      if (picked.length >= MAX_EVIDENCE_LINES_PER_LABEL) break
    }
    return picked.join(' • ')
  }

  return Array.from(byName.values())
    .map((x) => ({
      name: x.name,
      months: x.months,
      evidence: toEvidence(x.evidenceRows),
      _role_count: x.roleIndexes.size,
      _latest_role_index: Number.isFinite(x.latestRoleIndex) ? x.latestRoleIndex : Number.MAX_SAFE_INTEGER,
    }))
    .sort((a, b) =>
      (b.months - a.months) ||
      (b._role_count - a._role_count) ||
      (a._latest_role_index - b._latest_role_index) ||
      a.name.localeCompare(b.name)
    )
    .map(({ _role_count, _latest_role_index, ...row }) => row)
}

function capTopLabels(labels, maxCount) {
  if (!Array.isArray(labels) || maxCount <= 0) return []
  return labels.slice(0, maxCount)
}

async function callAPI(system, userContent, model) {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      max_tokens: 2000,
      model,
      system,
      messages: [{ role: 'user', content: userContent }],
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `API error ${res.status}`)
  }

  const data = await res.json()
  const raw = (data.content || [])
    .map(b => b.text || '')
    .join('')
    .replace(/```json|```/g, '')
    .trim()

  try {
    return JSON.parse(raw)
  } catch {
    throw new Error('Could not parse classifier response. Please try again.')
  }
}

// --- Main classifier -------------------------------------------------------

export async function classifyResume(resumeText, onProgress = () => {}) {
  if (!resumeText?.trim()) {
    throw new Error('No resume text provided.')
  }

  onProgress('Loading taxonomy...')
  const { knowledgeAreas, functionLevels, industries } = await fetchTaxonomy()

  // Patch function level definitions
  const patchedFunctionLevels = functionLevels.map(fl =>
    fl.name === 'People Manager' ? { ...fl, definition: PEOPLE_MANAGER_DEFINITION } : fl
  )

  onProgress('Parsing clean role data...')
  let extracted
  try {
    extracted = await callAPI(
      buildExtractSystem(),
      'Parse this resume text:\n\n' + resumeText,
      'claude-haiku-4-5-20251001'
    )
  } catch (e) {
    throw new Error(`Role parsing failed: ${e.message || 'unknown error'}`)
  }

  const processedRoles = normalizeExtractedRoles(extracted)
  const extractedTools       = Array.isArray(extracted?.tools)       ? extracted.tools.filter(Boolean)       : []
  const extractedCredentials = Array.isArray(extracted?.credentials) ? extracted.credentials.filter(Boolean) : []
  const rolePayload = buildRolePayload(processedRoles)

  if (!rolePayload.roles.length) {
    throw new Error('Could not parse roles from this resume. Please revise formatting and try again.')
  }

  const totalMonths = processedRoles
    .filter(r => !r.flagged)
    .reduce((sum, r) => sum + (Number(r.months) || 0), 0)
  const totalYears = monthsToYears(totalMonths)
  const rolePrompt = 'Classify this parsed resume role data:\n\n' + JSON.stringify(rolePayload)

  onProgress('Classifying functions and industries...')
  let shared
  try {
    shared = await callAPI(buildSharedSystem(patchedFunctionLevels, industries), rolePrompt)
  } catch (e) {
    throw new Error(`Function/industry classification failed: ${e.message || 'unknown error'}`)
  }

  onProgress('Classifying knowledge areas...')
  let kaResult
  try {
    kaResult = await callAPI(buildKnowledgeAreaSystem(knowledgeAreas), rolePrompt)
  } catch (e) {
    throw new Error(`Knowledge area classification failed: ${e.message || 'unknown error'}`)
  }

  const functionNames      = (functionLevels  || []).map(f => f.name)
  const industryNames      = (industries      || []).map(i => i.name)
  const knowledgeAreaNames = (knowledgeAreas  || []).map(k => k.name)

  const sharedAssignments = Array.isArray(shared?.role_assignments)   ? shared.role_assignments   : []
  const kaAssignments     = Array.isArray(kaResult?.role_assignments) ? kaResult.role_assignments : []

  const functions       = convertMonthsToYears(aggregateRoleAssignments(rolePayload.roles, sharedAssignments, 'functions',       functionNames))
  const industriesOut   = convertMonthsToYears(aggregateRoleAssignments(rolePayload.roles, sharedAssignments, 'industries',      industryNames, MAX_INDUSTRY_EVIDENCE_CHARS))
  const knowledgeAreasOut = convertMonthsToYears(aggregateRoleAssignments(rolePayload.roles, kaAssignments,   'knowledge_areas', knowledgeAreaNames))

  return {
    summary:         String(shared?.summary || ''),
    strengths:       String(shared?.strengths || ''),
    total_years:     totalYears,
    total_months:    totalMonths,
    functions,
    knowledge_areas: capTopLabels(knowledgeAreasOut, MAX_KNOWLEDGE_AREAS_RETURNED),
    industries:      capTopLabels(industriesOut,     MAX_INDUSTRIES_RETURNED),
    tools:           extractedTools,
    credentials:     extractedCredentials,
    framework:       'soc_minor',
  }
}
