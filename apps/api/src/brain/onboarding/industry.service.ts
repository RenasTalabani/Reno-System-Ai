import { prisma } from '@reno/database'

export interface IndustryTemplate {
  id: string
  slug: string
  name: string
  description: string
  modules: string[]
  roles: Array<{ name: string; permissions: string[] }>
  workflows: Array<{ name: string; description: string }>
  dashboards: Array<{ name: string; widgets: string[] }>
  reports: string[]
  agents: string[]
  keywords: string[]
  isActive: boolean
}

export async function listTemplates(): Promise<IndustryTemplate[]> {
  const rows = await prisma.aiIndustryTemplate.findMany({
    where: { isActive: true },
    orderBy: { slug: 'asc' },
  })
  return rows.map(normalizeTemplate)
}

export async function getTemplate(slug: string): Promise<IndustryTemplate | null> {
  const row = await prisma.aiIndustryTemplate.findUnique({ where: { slug } })
  return row ? normalizeTemplate(row) : null
}

export function detectIndustryFromAnswers(answers: Record<string, unknown>): {
  industry: string
  confidence: number
} {
  const companyType = String(answers['company_type'] ?? '').toLowerCase()
  const servicesArr = (answers['services'] as string[] | undefined) ?? []
  const productsArr = (answers['products'] as string[] | undefined) ?? []
  const goalsArr = (answers['goals'] as string[] | undefined) ?? []

  const searchText = [
    companyType,
    ...servicesArr,
    ...productsArr,
    ...goalsArr,
  ].join(' ').toLowerCase()

  const KEYWORD_MAP: Array<{ slug: string; keywords: RegExp[] }> = [
    {
      slug: 'gym',
      keywords: [/gym|fitness|membership|training|workout|yoga|pilates|sports club|health club/],
    },
    {
      slug: 'logistics',
      keywords: [/logistic|shipping|freight|transport|delivery|fleet|trucking|cargo|warehouse|supply chain|courier/],
    },
    {
      slug: 'manufacturing',
      keywords: [/manufactur|factory|production|assembly|fabricat|machining|plant|quality control|mrp|industrial/],
    },
    {
      slug: 'retail',
      keywords: [/retail|shop|store|ecommerce|e-commerce|boutique|supermarket|market|point of sale|pos|merchandise/],
    },
    {
      slug: 'healthcare',
      keywords: [/health|clinic|hospital|medical|doctor|patient|pharmacy|dental|nurs|physiotherapy|diagnostic/],
    },
    {
      slug: 'education',
      keywords: [/education|school|university|college|academy|training center|e-learning|student|course|tutoring|institute|campus/],
    },
    {
      slug: 'services',
      keywords: [/consult|agency|professional service|law firm|accounting|marketing agency|it service|staffing|advisory|outsourcing/],
    },
  ]

  let bestSlug = 'services'
  let bestScore = 0

  for (const entry of KEYWORD_MAP) {
    let score = 0
    for (const re of entry.keywords) {
      const matches = searchText.match(new RegExp(re.source, 'gi'))
      score += matches ? matches.length * 10 : 0
    }
    // Exact company_type match gets big boost
    if (companyType && entry.keywords.some(re => re.test(companyType))) {
      score += 50
    }
    if (score > bestScore) {
      bestScore = score
      bestSlug = entry.slug
    }
  }

  const confidence = bestScore === 0 ? 0.3 : Math.min(0.99, bestScore / 100)
  return { industry: bestSlug, confidence }
}

function normalizeTemplate(row: any): IndustryTemplate {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    modules: row.modules as string[],
    roles: row.roles as any[],
    workflows: row.workflows as any[],
    dashboards: row.dashboards as any[],
    reports: row.reports as string[],
    agents: row.agents as string[],
    keywords: row.keywords as string[],
    isActive: row.isActive,
  }
}
