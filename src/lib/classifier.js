// src/lib/classifier.js
// Rensume resume classifier.
// Makes two API calls — shared dimensions first, then SOC Minor knowledge areas.
// Both calls go through the Vercel /api/chat proxy to keep the API key off the client.

// ─── Constants ────────────────────────────────────────────────────────────────

const NAICS_SECTORS = [
  'Agriculture', 'Mining', 'Utilities', 'Construction', 'Manufacturing',
  'Wholesale Trade', 'Retail Sales', 'Transportation and Warehousing',
  'Information & Technology', 'Fintech, Banking & Finance,'Insurance', 'Real Estate',
  'Professional and Technical Services', 'Management of Companies',
  'Administrative and Support Services', 'Educational Services',
  'Health Care and Social Assistance', 'Arts and Entertainment',
  'Accommodation and Food Services', 'Government',
  'Nonprofit and Social Services', 'Other',
]

const SOC_MINOR_GROUPS = [
  'Adult Education & Training',
'Agricultural Work',
'Air Transportation',
'Animal Care and Service',
'Architectural Surveying and Cartography',
'Art and Design',
'Assembling and Fabrication',
'Business Operations',
'Construction',
'Counseling, Social Work, and Community Service',
'Drafting and Architectural Engineering',
'Electrical and Electronic Equipment Repair',
'Engineering',
'Entertainment and Live Performances',
'Extraction',
'Financial Clerks',
'Financial Services & Compliance',
'Firefighting and Prevention',
'Food Preparation and Serving',
'Food Processing',
'Forest Conservation and Logging',
'Health Diagnosis & Treatment',
'Health Technology',
'Home Health and Personal Care',
'Information and Record Keeping',
'Installation Maintenance and Repair',
'Law',
'Law Enforcement',
'Legal Support',
'Library Curation and Archival Work',
'Life Sciences',
'Material Moving',
'Mathematical Science',
'Media and Communication',
'Media and Communication Equipment',
'Metal and Plastic Fabrication',
'Motor Vehicle Operation',
'Occupational and Physical Therapy',
'Occupational Health and Safety',
'Office and Administrative Support',
'Other Healthcare Support',
'Other Personal Care and Service',
'Other Production Work',
'Other Protective Service Work',
'Other Sales Work',
'Personal Appearance ',
'Physical Scientists',
'Plant and System Operators',
'Postsecondary Education',
'Primary and Secondary Education',
'Rail Transportation',
'Religious Work',
'Retail Sales',
'Sales - General Services',
'Sales - Wholesale and Manufacturing ',
'Secretarial and Administrative Work',
'Social Scientists and Related Work',
'Vehicle and Mobile Equipment Mechanics',
'Water Transportation']

// ─── Prompts ──────────────────────────────────────────────────────────────────

const SHARED_SYSTEM = `///TASK DESCRIPTION///
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
Process Specialist - Executes defined processes
Process Manager - Improves and manages processes
People Manager - Manages a team of individual contributors who execute defined processes
Strategic Manager - Manages multiple teams or managers executing strategy-linked initiatives
Strategic Advisor - Recommends what should happen. No binding authority
Strategic Executive - Decides what should happen. Binding authority

//knowledge areas//
Classification handled in a separate call using SOC 2018 minor group names. See buildKnowledgeAreaSystem in classifier.js

//Industry//
Industry classification is based on the following NAICS sectors: ${NAICS_SECTORS.join(', ')}

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

function buildKnowledgeAreaSystem(totalMonths) {
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

Use only these SOC 2018 minor group names:
${SOC_MINOR_GROUPS.join(', ')}

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
  const totalYears  = monthsToYears(totalMonths)

  // Call 2 — knowledge areas
  onProgress('Classifying knowledge areas...')
  const kaResult = await callAPI(buildKnowledgeAreaSystem(totalMonths), prompt)

  // Convert months to display years
  shared.industries    = convertMonthsToYears(shared.industries)
  shared.functions     = convertMonthsToYears(shared.functions)
  const knowledgeAreas = convertMonthsToYears(kaResult.knowledge_areas)

  // Return a profile shaped to match the `cards` table schema
  return {
    summary:         shared.summary   || '',
    strengths:       shared.strengths || '',
    total_years:     totalYears,
    total_months:    totalMonths,
    functions:       shared.functions      || [],
    knowledge_areas: knowledgeAreas        || [],
    industries:      shared.industries     || [],
    tools:           shared.tools          || [],
    credentials:     shared.credentials    || [],
    framework:       'soc_minor',
  }
}
