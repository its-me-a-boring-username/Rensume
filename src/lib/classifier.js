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

const SHARED_SYSTEM = `///TASK DESCRIPTION///
You are a resume taxonomy classifier for Rensume, a recruiting platform that helps recruiters understand the strengths and competencies of candidates who've had non-linear careers.

Extract all dimensions and respond ONLY with valid JSON, no markdown, no preamble, no backticks.

///THE RULES///
//math//
total_months: calculate from actual work history dates, not self-reported summaries. Return as total months (e.g. 8 years = 96 months).
Function months: reflect time spent operating at that level — they do NOT need to sum to total_months. A candidate can operate at multiple function levels within the same role simultaneously.
// Industry months: do NOT need to sum to total_months. A company can map to multiple industries simultaneously (e.g. a fintech company counts toward both Information and Finance & Insurance).
// Knowledge Area months: do NOT need to sum to total_months. A role can draw on multiple knowledge areas simultaneously.

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
CRITICAL for function evidence: The evidence must justify WHY this specific function level applies
Function levels list:
Process Specialist - Executes defined processes
Process Manager - Improves and manages processes
People Manager - Manages who does the work
Strategic Manager - Manages people executing strategy-linked initiatives
Strategic Advisor - Recommends what should happen. No binding authority
Strategic Executive - Decides what should happen. Binding authority

//knowledge areas//
Classification handled in a separate call using SOC 2018 minor group names. See buildKnowledgeAreaSystem in classifier.js

//Industry//
Industry classification is based on the following NAICS sectors: ${NAICS_SECTORS.join(', ')}

Respond ONLY with valid JSON matching this exact structure:
{
  "summary": "one plain sentence describing what this person actually does",
  "total_months": 0,
  "strengths": "1-2 sentences highlighting what genuinely sets this candidate apart, referencing specific experience",
  "functions": [{"name": "Function level name", "months": 0, "evidence": "evidence text"}],
  "industries": [{"name": "NAICS sector", "months": 0, "evidence": "which companies map here and why"}],
  "tools": ["tool or method name"],
  "credentials": [{"type": "Degree|Certification|License", "name": "", "institution": "", "year": ""}]
}`

function buildKnowledgeAreaSystem(totalMonths) {
  return `///TASK DESCRIPTION///
You are a resume taxonomy classifier for Rensume, a recruiting platform that helps recruiters understand the strengths and competencies of candidates who've had non-linear careers.

Extract Knowledge Area / Discipline using SOC 2018 minor group names.

///THE RULES///
- Map what the candidate demonstrably knows and has done. Focus on work performed, not job title.
- DO NOT collapse distinct types of work into a single category. Each meaningfully different domain must appear as its own entry. Treat overlap as separate dimensions, not a reason to consolidate.
- DO NOT create additional catch-all categories — compliance, customer operations, and data analysis are separate.
- Return between 3 and 6 knowledge areas — no more, no fewer.
// Knowledge area months do NOT need to sum to total_months. A role can draw on multiple knowledge areas simultaneously.

Use only these SOC 2018 minor group names:
${SOC_MINOR_GROUPS.join(', ')}

For each area include evidence: 2-4 bullet points using partial quotes from the resume, each tagged with company and role.
Format as: "· Company (Role): 'partial quote or paraphrase'" separated by the · character.
Use single quotes not double quotes within evidence text.
Use "Based on [company]: [synthesis]" only if no direct quote is available.
Do NOT reuse the same quote across knowledge areas.

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

// normalizeYears is no longer used — months-based calculation eliminates
// the need to force items to sum to a total. Kept here for reference.
// function normalizeYears(items, totalYears) { ... }

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
  const totalMonths = Number(shared.total_months) || 0
  const totalYears = monthsToYears(totalMonths)

  // Call 2 — knowledge areas
  onProgress('Classifying knowledge areas...')
  const kaResult = await callAPI(buildKnowledgeAreaSystem(totalMonths), prompt)

  // Convert months to display years
  shared.industries    = convertMonthsToYears(shared.industries)
  shared.functions     = convertMonthsToYears(shared.functions)
  const knowledgeAreas = convertMonthsToYears(kaResult.knowledge_areas)

  // Return a profile shaped to match the `cards` table schema
  return {
    summary:        shared.summary        || '',
    strengths:      shared.strengths      || '',
    total_years:    totalYears,
    total_months:   totalMonths,
    functions:      shared.functions      || [],
    knowledge_areas: knowledgeAreas       || [],
    industries:     shared.industries     || [],
    tools:          shared.tools          || [],
    credentials:    shared.credentials    || [],
    framework:      'soc_minor',
  }
}
