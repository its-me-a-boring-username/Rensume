// src/lib/classifier.js
// Rensume resume classifier.
// Makes two API calls — shared dimensions first, then SOC Minor knowledge areas.
// Both calls go through the Vercel /api/chat proxy to keep the API key off the client.

// ─── Constants ────────────────────────────────────────────────────────────────

const NAICS_SECTORS = [
  'Agriculture', 'Mining', 'Utilities', 'Construction', 'Manufacturing',
  'Wholesale Trade', 'Retail Trade', 'Transportation and Warehousing',
  'Information', 'Finance and Insurance', 'Real Estate',
  'Professional and Technical Services', 'Management of Companies',
  'Administrative and Support Services', 'Educational Services',
  'Health Care and Social Assistance', 'Arts and Entertainment',
  'Accommodation and Food Services', 'Government',
  'Nonprofit and Social Services', 'Other',
]

const SOC_MINOR_GROUPS = [
  'Business Operations Specialists', 'Financial Specialists',
  'Computer Occupations', 'Mathematical Science Occupations',
  'Architects Surveyors and Cartographers', 'Engineers',
  'Drafters and Engineering Technicians', 'Life Scientists',
  'Physical Scientists', 'Social Scientists and Related Workers',
  'Occupational Health and Safety Specialists',
  'Counselors Social Workers and Community Service Specialists',
  'Religious Workers', 'Lawyers Judges and Related Workers',
  'Legal Support Workers', 'Postsecondary Teachers',
  'Primary and Secondary School Teachers', 'Other Teachers and Instructors',
  'Librarians Curators and Archivists', 'Art and Design Workers',
  'Entertainers and Performers', 'Media and Communication Workers',
  'Media and Communication Equipment Workers',
  'Health Diagnosing and Treating Practitioners',
  'Health Technologists and Technicians',
  'Home Health and Personal Care Aides',
  'Occupational and Physical Therapist Assistants',
  'Other Healthcare Support', 'Firefighting and Prevention Workers',
  'Law Enforcement Workers', 'Other Protective Service Workers',
  'Food Preparation and Serving Workers', 'Personal Appearance Workers',
  'Animal Care and Service Workers', 'Entertainment Attendants',
  'Other Personal Care and Service Workers', 'Retail Sales Workers',
  'Sales Representatives Services',
  'Sales Representatives Wholesale and Manufacturing', 'Other Sales Workers',
  'Financial Clerks', 'Information and Record Clerks',
  'Secretaries and Administrative Assistants',
  'Other Office and Administrative Support', 'Agricultural Workers',
  'Forest Conservation and Logging Workers', 'Construction Trades Workers',
  'Extraction Workers',
  'Electrical and Electronic Equipment Mechanics and Repairers',
  'Vehicle and Mobile Equipment Mechanics',
  'Other Installation Maintenance and Repair', 'Plant and System Operators',
  'Assemblers and Fabricators', 'Food Processing Workers',
  'Metal Workers and Plastic Workers', 'Other Production Workers',
  'Air Transportation Workers', 'Motor Vehicle Operators',
  'Rail Transportation Workers', 'Water Transportation Workers',
  'Material Moving Workers',
]

// ─── Prompts ──────────────────────────────────────────────────────────────────

const SHARED_SYSTEM = `You are a resume taxonomy classifier for Rensume, a recruiting platform that helps non-linear career candidates get fairly evaluated.

Extract all dimensions and respond ONLY with valid JSON, no markdown, no preamble, no backticks.

Rules:
- total_years: calculate from actual work history dates, not self-reported summaries
- For evidence fields: ALWAYS prefer a direct quote or paraphrase from the resume. Use single quotes not double quotes inside evidence text. Only use AI synthesis (clearly marked with 'Based on...') when no specific resume text supports the classification.
- CRITICAL for function evidence: The evidence must justify WHY this specific function level applies. Process Specialist = executing defined processes. Process Manager = designing/improving processes. People Manager = managing direct reports. Strategic = setting direction. Provide 2-4 bullet points of evidence using partial quotes from the resume, each tagged with company and role. Format as: "· Company (Role): 'partial quote or paraphrase'" separated by the · character. Do NOT reuse the same quote across multiple functions.
- For knowledge area evidence: provide 2-3 bullet points tagged by company and role, NO quotes needed. Format as: "· Company (Role): brief description of relevant work" separated by the · character.
- For industry evidence: one sentence explaining which companies map to this industry and why.
- Years across industries MUST sum to total_years.
- Function years reflect time spent operating at that level — they do NOT need to sum to total_years. A candidate can operate at multiple function levels within the same role simultaneously.

Function levels: Process Specialist | Process Manager | People Manager | Strategic Manager | Strategic Advisor | Strategic Executive

NAICS sectors: ${NAICS_SECTORS.join(', ')}

Respond ONLY with valid JSON matching this exact structure:
{
  "summary": "one plain sentence describing what this person actually does",
  "total_years": 0,
  "strengths": "1-2 sentences highlighting what genuinely sets this candidate apart, referencing specific experience",
  "functions": [{"name": "Function level name", "years": 0, "evidence": "evidence text"}],
  "industries": [{"name": "NAICS sector", "years": 0, "evidence": "which companies map here and why"}],
  "tools": ["tool or method name"],
  "credentials": [{"type": "Degree|Certification|License", "name": "", "institution": "", "year": ""}]
}`

function buildKnowledgeAreaSystem(totalYears) {
  return `You are a resume taxonomy classifier for Rensume. Extract Knowledge Area / Discipline using SOC 2018 minor group names.
Map what the candidate demonstrably knows and has done — focus on work performed, not job title.

Use only these SOC 2018 minor group names:
${SOC_MINOR_GROUPS.join(', ')}

Rules:
1. Return between 3 and 6 knowledge areas — no more, no fewer.
2. DO NOT collapse distinct types of work into a single broad category. Each meaningfully different domain must appear as its own entry.
3. DO NOT create catch-all categories — compliance, customer operations, and data analysis are separate.
4. Treat overlap as separate dimensions, not a reason to consolidate.
5. CRITICAL MATH: The candidate has exactly ${totalYears} total professional years. Years across all knowledge areas MUST sum to exactly ${totalYears}.

For each area include evidence: a direct quote or paraphrase from the resume tagged by company and role.
Use single quotes not double quotes within evidence text.
Use "Based on [company]: [synthesis]" only if no direct quote is available.

Respond ONLY with valid JSON:
{"knowledge_areas": [{"name": "", "years": 0, "evidence": ""}]}`
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Normalise years so they sum to totalYears.
 * Handles floating point drift from the AI.
 */
function normalizeYears(items, totalYears) {
  if (!items?.length || !totalYears) return items
  const sum = items.reduce((s, i) => s + (Number(i.years) || 0), 0)
  if (sum === 0) return items
  return items.map(i => ({
    ...i,
    years: Math.round((Number(i.years) / sum) * totalYears * 10) / 10,
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
 * Makes two API calls:
 *   1. Shared dimensions (summary, functions, industries, tools, credentials, strengths)
 *   2. Knowledge areas (SOC Minor Groups)
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

  const prompt = 'Classify this resume:\n\n' + resumeText

  // Call 1 — shared dimensions
  onProgress('Extracting your profile...')
  const shared = await callAPI(SHARED_SYSTEM, prompt)
  const totalYears = Number(shared.total_years) || 0

  // Call 2 — knowledge areas
  onProgress('Classifying knowledge areas...')
  const kaResult = await callAPI(buildKnowledgeAreaSystem(totalYears), prompt)

  // Normalise years
  shared.industries    = normalizeYears(shared.industries,         totalYears)
  shared.functions     = normalizeYears(shared.functions,          totalYears)
  const knowledgeAreas = normalizeYears(kaResult.knowledge_areas,  totalYears)

  // Return a profile shaped to match the `cards` table schema
  return {
    summary:        shared.summary        || '',
    strengths:      shared.strengths      || '',
    total_years:    totalYears,
    functions:      shared.functions      || [],
    knowledge_areas: knowledgeAreas       || [],
    industries:     shared.industries     || [],
    tools:          shared.tools          || [],
    credentials:    shared.credentials    || [],
    framework:      'soc_minor',
  }
}
