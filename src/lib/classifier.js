// src/lib/classifier.js
// Rensume live classifier.
// Flow: extract roles -> classify role-level labels/evidence -> deterministic month aggregation in code.

import { fetchTaxonomy, formatKAList, formatIndustryList, formatFunctionLevels } from './taxonomy.js'

// --- Prompts ---------------------------------------------------------------

function buildExtractSystem() {
  return `You are a resume parser for Rensume. Extract every professional role and return ONLY valid JSON.

Return this exact structure:
{"roles":[{"title":"","employer":"","start_raw":"","end_raw":"","text":""}]}

Rules:
- Copy start_raw and end_raw exactly as written in the resume.
- Keep each role separate. Do not merge roles from the same employer.
- Include all role text and bullet points in "text".
- If end date is missing but role appears current, set end_raw to "Present".
- If a field is unknown, use an empty string.
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
- Evidence should be a direct quote or close paraphrase from the role text.
- Use single quotes inside evidence strings.

Function levels list:
${formatFunctionLevels(functionLevels)}

Industry list (exact NAICS sector names):
${formatIndustryList(industries)}

Respond ONLY with this exact JSON structure:
{
  "summary": "one plain sentence, max 160 chars",
  "strengths": "1-2 sentences highlighting differentiators",
  "tools": ["tool or method name"],
  "credentials": [{"type": "Degree|Certification|License", "name": "", "institution": "", "year": ""}],
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
- Evidence should be direct quote or close paraphrase from role text.
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
  if (n < 2) band = 'Junior'
  else if (n < 5) band = 'Experienced'
  else if (n < 8) band = 'Senior'
  else band = 'Mature'
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

function toStart(p, nowDate) { return p.type === 'date' ? new Date(p.year, p.month, 1) : p.type === 'present' ? nowDate : null }
function toEnd(p, nowDate) { return p.type === 'date' ? new Date(p.year, p.month, lastDay(p.year, p.month)) : p.type === 'present' ? nowDate : null }
function monthsBetween(s, e) { return Math.max(0, (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth()) + 1) }

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
    title: String(r?.title || '').trim(),
    employer: String(r?.employer || '').trim(),
    start_raw: String(r?.start_raw || '').trim(),
    end_raw: String(r?.end_raw || '').trim(),
    text: String(r?.text || '').trim(),
  }))
}

function buildRolePayload(roles) {
  const clean = (Array.isArray(roles) ? roles : []).filter(r => !r.flagged && (Number(r.months) || 0) > 0)
  return {
    roles: clean.map((r, roleIndex) => ({
      role_index: roleIndex,
      title: r.title || '',
      employer: r.employer || '',
      start_raw: r.start_raw || '',
      end_raw: r.end_raw || '',
      start: r.start || '',
      end: r.end || '',
      months: Number(r.months) || 0,
      text: r.text || '',
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

function aggregateRoleAssignments(roles, roleAssignments, fieldKey, allowedNames) {
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
        byName.set(canonicalName, { name: canonicalName, months: 0, evidenceRows: [] })
      }

      const dedupeKey = `${roleIndex}::${canonicalName}`
      if (!monthsAdded.has(dedupeKey)) {
        byName.get(canonicalName).months += Number(role.months) || 0
        monthsAdded.add(dedupeKey)
      }

      const evidence = String(label?.evidence || '').trim()
      if (evidence) {
        byName.get(canonicalName).evidenceRows.push({ role_index: roleIndex, evidence })
      }
    }
  }

  const toEvidence = (rows) => {
    const seen = new Set()
    const picked = []
    for (const row of rows || []) {
      const t = String(row?.evidence || '').trim()
      if (!t) continue
      const k = t.toLowerCase()
      if (seen.has(k)) continue
      seen.add(k)
      picked.push(t)
      if (picked.length >= 2) break
    }
    return picked.join(' • ')
  }

  return Array.from(byName.values())
    .map((x) => ({ name: x.name, months: x.months, evidence: toEvidence(x.evidenceRows) }))
    .sort((a, b) => (b.months - a.months) || a.name.localeCompare(b.name))
}

async function callAPI(system, userContent) {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      max_tokens: 2000,
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

  onProgress('Parsing clean role data...')
  const extracted = await callAPI(buildExtractSystem(), 'Parse this resume text:\n\n' + resumeText)
  const processedRoles = normalizeExtractedRoles(extracted)
  const rolePayload = buildRolePayload(processedRoles)

  if (!rolePayload.roles.length) {
    throw new Error('Could not parse roles from this resume. Please revise formatting and try again.')
  }

  const totalMonths = rolePayload.roles.reduce((sum, r) => sum + (Number(r.months) || 0), 0)
  const totalYears = monthsToYears(totalMonths)
  const rolePrompt = 'Classify this parsed resume role data:\n\n' + JSON.stringify(rolePayload, null, 2)

  onProgress('Classifying functions and industries...')
  const shared = await callAPI(buildSharedSystem(functionLevels, industries), rolePrompt)

  onProgress('Classifying knowledge areas...')
  const kaResult = await callAPI(buildKnowledgeAreaSystem(knowledgeAreas), rolePrompt)

  const functionNames = (functionLevels || []).map((f) => f.name)
  const industryNames = (industries || []).map((i) => i.name)
  const knowledgeAreaNames = (knowledgeAreas || []).map((k) => k.name)

  const sharedAssignments = Array.isArray(shared?.role_assignments) ? shared.role_assignments : []
  const kaAssignments = Array.isArray(kaResult?.role_assignments) ? kaResult.role_assignments : []

  const functions = convertMonthsToYears(
    aggregateRoleAssignments(rolePayload.roles, sharedAssignments, 'functions', functionNames)
  )
  const industriesOut = convertMonthsToYears(
    aggregateRoleAssignments(rolePayload.roles, sharedAssignments, 'industries', industryNames)
  )
  const knowledgeAreasOut = convertMonthsToYears(
    aggregateRoleAssignments(rolePayload.roles, kaAssignments, 'knowledge_areas', knowledgeAreaNames)
  )

  return {
    summary: String(shared?.summary || ''),
    strengths: String(shared?.strengths || ''),
    total_years: totalYears,
    total_months: totalMonths,
    functions,
    knowledge_areas: knowledgeAreasOut,
    industries: industriesOut,
    tools: Array.isArray(shared?.tools) ? shared.tools : [],
    credentials: Array.isArray(shared?.credentials) ? shared.credentials : [],
    framework: 'soc_minor',
  }
}
