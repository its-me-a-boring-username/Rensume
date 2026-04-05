// src/lib/classifier.js
// Rensume resume classifier.
// Makes two API calls — shared dimensions first, then SOC Minor knowledge areas.
// Both calls go through the Vercel /api/chat proxy to keep the API key off the client.

import { fetchTaxonomy, formatKAList, formatIndustryList, formatFunctionLevels } from './taxonomy.js'

// ─── Prompts ──────────────────────────────────────────────────────────────────

function buildSharedSystem(functionLevels, industries) {
  return `///TASK DESCRIPTION///
You are a resume taxonomy classifier for Rensume, a recruiting platform that helps recruiters understand the strengths and competencies of candidates who've had non-linear careers.

Extract all dimensions and respond ONLY with valid JSON, no markdown, no preamble, no backticks.

///THE RULES///
//math//
total_months: calculate from actual work history dates, not self-reported summaries. Return as total months (e.g. 8 years = 96 months).
Function months: reflect time spent operating at that level — they do NOT need to sum to total_months. A candidate can operate at multiple function levels within the same role simultaneously.
Industry months: do NOT need to sum to total_months. A company can map to multiple industries simultaneously (e.g. a fintech company counts toward both Information and Finance & Insurance).
Knowledge Area months: do NOT need to sum to total_months. A single role may require expertise in multiple knowledge areas at once. It is also possible for someone to hold multiple roles at one time.

//evidence handling//
For ALL Evidence: 
- Only use AI synthesis (clearly marked with 'Based on...') when no specific resume text supports the classification.
- Do NOT reuse the same quote across multiple functions or knowledge areas
For function field evidence: 
- ALWAYS prefer a direct quote or paraphrase from the resume. 
- Use single quotes not double quotes inside evidence text. 
For knowledge area evidence: 
- provide 2-4 bullet points of evidence using partial quotes from the resume, each tagged with company and role. Format as: "· Company (Role): 'partial quote or paraphrase'" separated by the · character. 
For industry evidence: 
- One sentence explaining which companies map to this industry and why.

//function levels//
CRITICAL for function evidence: The evidence must justify WHY this specific function level applies.
CRITICAL for function classification: Function levels are independent and mutually exclusive in what they describe. Do NOT infer a higher function level by combining evidence from two lower levels. Each function level must be justified by its own direct evidence. If a candidate shows both People Manager work and Strategic Advisor work, credit both separately — do not upgrade either to Strategic Manager. Do NOT suppress a valid lower-level function tag because a higher one is also present.
Function levels list:
${formatFunctionLevels(functionLevels)}

//knowledge areas//
Classification handled in a separate call. See buildKnowledgeAreaSystem in classifier.js

//Industry//
Industry classification is based on the following NAICS sectors (use the exact name as listed):
${formatIndustryList(industries)}

Respond ONLY with valid JSON matching this exact structure:
{
  "summary": "one plain sentence describing what this person actually does — maximum 160 characters, no exceptions",
  "total_months": 0,
  "strengths": "1-2 sentences highlighting what genuinely sets this candidate apart, referencing specific experience",
  "functions": [{"name": "Function level name", "months": 0, "evidence": "evidence text"}],
  "industries": [{"name": "NAICS sector", "months": 0, "evidence": "which companies map here and why"}],
  "tools": ["tool or method name"],
  "credentials": [{"type": "Degree|Certification|License", "name": "", "institution": "", "year": ""}]
}`
}

function buildKnowledgeAreaSystem(knowledgeAreas, totalMonths) {
  return `///TASK DESCRIPTION///
You are a resume taxonomy classifier for Rensume, a recruiting platform that helps recruiters understand the strengths and competencies of candidates who've had non-linear careers.

Extract Knowledge Area / Discipline using SOC 2018 minor group names.

///THE RULES///
- Map what the candidate demonstrably knows and has done. Focus on work performed, not job title.
- DO NOT collapse distinct types of work into a single category. Each meaningfully different domain must appear as its own entry. Treat overlap as separate dimensions, not a reason to consolidate.
- DO NOT create additional catch-all categories — compliance, customer operations, and data analysis are separate.
- Return between 3 and 6 knowledge areas — no more, no fewer.
- Knowledge area months do NOT need to sum to total_months. A role can draw on multiple knowledge areas simultaneously.
- The candidate has ${totalMonths} total professional months for context when estimating time in each area.

Use only these SOC 2018 minor group names (use the exact name as listed):
${formatKAList(knowledgeAreas)}

Respond ONLY with valid JSON:
{"knowledge_areas": [{"name": "", "months": 0, "evidence": ""}]}`
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Convert months to display years (1 decimal place).
 * e.g. 10 months → 0.8y, 18 months → 1.5y
 */
function monthsToYears(months) {
  return Math.round((Number(months) / 12) * 10) / 10
}

/**
 * Convert all months fields on an array of items to display years.
 */
function convertMonthsToYears(items) {
  if (!items?.length) return items
  return items.map(i => ({
    ...i,
    years: monthsToYears(i.months),
  }))
}

/**
 * Apply seniority band prefix to a function level name.
 * e.g. "Process Manager" + 4 years → "Experienced Process Manager"
 */
export function getSeniorityLabel(functionName, years) {
  const n = Number(years) || 0
  let band
  if (n < 2)       band = 'Junior'
  else if (n < 5)  band = 'Experienced'
  else if (n < 8)  band = 'Senior'
  else             band = 'Mature'
  return `${band} ${functionName}`
}

/**
 * Low-level API call through the Vercel proxy.
 */
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
    throw new Error('Could not parse classifier response — try again.')
  }
}

// ─── Main classifier ──────────────────────────────────────────────────────────

/**
 * Classify a resume text using the Rensume taxonomy.
 *
 * Fetches live taxonomy from Supabase, then makes two API calls:
 *   1. Shared dimensions (summary, functions, industries, tools, credentials, strengths)
 *   2. Knowledge areas
 *
 * Returns a profile object ready to be stored in the `cards` table.
 *
 * @param {string} resumeText - Raw resume text pasted by the candidate
 * @param {function} onProgress - Optional callback for progress messages
 * @returns {Promise<object>} Classified profile
 */
export async function classifyResume(resumeText, onProgress = () => {}) {
  if (!resumeText?.trim()) {
    throw new Error('No resume text provided.')
  }

  // Fetch live taxonomy from Supabase (cached within session)
  onProgress('Loading taxonomy...')
  const { knowledgeAreas, functionLevels, industries } = await fetchTaxonomy()

  const prompt = 'Classify this resume:\n\n' + resumeText

  // Call 1 — shared dimensions
  onProgress('Extracting your profile...')
  const shared = await callAPI(buildSharedSystem(functionLevels, industries), prompt)
  const totalMonths = Number(shared.total_months) || 0
  const totalYears  = monthsToYears(totalMonths)

  // Call 2 — knowledge areas
  onProgress('Classifying knowledge areas...')
  const kaResult = await callAPI(buildKnowledgeAreaSystem(knowledgeAreas, totalMonths), prompt)

  // Convert months to display years
  shared.industries    = convertMonthsToYears(shared.industries)
  shared.functions     = convertMonthsToYears(shared.functions)
  const knowledgeAreasResult = convertMonthsToYears(kaResult.knowledge_areas)

  // Return a profile shaped to match the `cards` table schema
  return {
    summary:         shared.summary   || '',
    strengths:       shared.strengths || '',
    total_years:     totalYears,
    total_months:    totalMonths,
    functions:       shared.functions      || [],
    knowledge_areas: knowledgeAreasResult  || [],
    industries:      shared.industries     || [],
    tools:           shared.tools          || [],
    credentials:     shared.credentials    || [],
    framework:       'soc_minor',
  }
}
