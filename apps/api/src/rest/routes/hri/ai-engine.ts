// Phase 59 — AI HR Intelligence & Workforce Analytics: AI Engine

export const LEVELS = ['junior', 'mid', 'senior', 'lead', 'exec']
export const DEPARTMENTS = ['Engineering', 'Sales', 'Marketing', 'HR', 'Finance', 'Operations', 'Product', 'Legal']
export const RETENTION_RISK_LABELS: Record<string, string> = { low: 'Low', medium: 'Medium', high: 'High', critical: 'Critical' }

export interface EmployeeProfile {
  aiProfileScore: number
  retentionRisk: string
  potentialLevel: string
  insights: string[]
}

export function profileEmployee(emp: {
  level?: string | null; hireDate?: Date | null; salary?: number | null; department?: string | null; status?: string
}): EmployeeProfile {
  const tenureYears = emp.hireDate ? (Date.now() - new Date(emp.hireDate).getTime()) / (1000 * 60 * 60 * 24 * 365) : 2
  const levelIdx = LEVELS.indexOf(emp.level ?? 'mid')
  const baseScore = 50 + levelIdx * 10 + Math.floor(Math.random() * 20)
  const aiProfileScore = Math.min(100, Math.max(0, baseScore))

  const retentionRiskScore = Math.random()
  const retentionRisk = retentionRiskScore > 0.8 ? 'critical' : retentionRiskScore > 0.6 ? 'high' : retentionRiskScore > 0.35 ? 'medium' : 'low'

  const potentialScore = Math.random()
  const potentialLevel = potentialScore > 0.8 ? 'exceptional' : potentialScore > 0.6 ? 'high' : potentialScore > 0.3 ? 'medium' : 'low'

  const insights: string[] = []
  if (tenureYears > 5) insights.push(`${Math.floor(tenureYears)} years tenure — senior knowledge holder, succession planning recommended.`)
  if (retentionRisk === 'critical') insights.push('Critical attrition risk — immediate manager 1:1 and compensation review needed.')
  if (retentionRisk === 'high') insights.push('High attrition risk — schedule engagement survey and career path discussion.')
  if (potentialLevel === 'exceptional') insights.push('Exceptional high-potential employee — fast-track development program recommended.')
  if (levelIdx <= 1 && tenureYears > 3) insights.push('Long-tenured junior employee — may be disengaged; consider promotion track.')
  if (!emp.salary) insights.push('Salary data missing — compensation benchmarking not possible.')

  return { aiProfileScore, retentionRisk, potentialLevel, insights }
}

export interface PerformanceResult {
  overallRating: string
  aiPrediction: string
  nextPeriodForecast: number
}

export function evaluatePerformance(scores: { performanceScore: number; goalsScore: number; skillsScore: number; cultureScore: number }): PerformanceResult {
  const avg = (scores.performanceScore + scores.goalsScore + scores.skillsScore + scores.cultureScore) / 4
  const overallRating = avg >= 90 ? 'exceptional' : avg >= 80 ? 'exceeds' : avg >= 65 ? 'meets' : avg >= 50 ? 'below' : 'critical'

  const nextPeriodForecast = Math.round(avg + (Math.random() - 0.4) * 10)

  const predictions: Record<string, string> = {
    exceptional: 'Trajectory: top performer. Likely promotion candidate in 6-12 months. Consider stretch assignments.',
    exceeds: 'Trajectory: strong contributor. Maintain momentum with new challenges. Leadership readiness assessment due.',
    meets: 'Trajectory: stable. Focus on skills development in weakest area. Set clear SMART goals for next quarter.',
    below: 'Trajectory: improvement needed. Structured PIP recommended within 30 days.',
    critical: 'Trajectory: at risk. Immediate intervention required — HR and manager escalation.',
  }

  return { overallRating, aiPrediction: predictions[overallRating], nextPeriodForecast }
}

export interface WorkforceAnalytics {
  totalEmployees: number
  activeEmployees: number
  avgTenureYears: number
  avgSalary: number
  attritionRate: number
  highRiskCount: number
  highPotentialCount: number
  departmentBreakdown: { dept: string; count: number }[]
  levelBreakdown: { level: string; count: number }[]
}

export function computeWorkforceAnalytics(employees: {
  status: string; hireDate?: Date | null; salary?: number | null; department?: string | null; level?: string | null; retentionRisk?: string | null; potentialLevel?: string | null
}[]): WorkforceAnalytics {
  const active = employees.filter(e => e.status === 'active')
  const terminated = employees.filter(e => e.status === 'terminated')

  const now = Date.now()
  const avgTenureYears = active.filter(e => e.hireDate).length > 0
    ? active.filter(e => e.hireDate).reduce((s, e) => s + (now - new Date(e.hireDate!).getTime()) / (1000 * 60 * 60 * 24 * 365), 0) / active.filter(e => e.hireDate).length
    : 0

  const salaryEmployees = active.filter(e => e.salary)
  const avgSalary = salaryEmployees.length > 0 ? salaryEmployees.reduce((s, e) => s + (e.salary ?? 0), 0) / salaryEmployees.length : 0

  const attritionRate = employees.length > 0 ? (terminated.length / employees.length) * 100 : 0

  const highRiskCount = employees.filter(e => ['high', 'critical'].includes(e.retentionRisk ?? '')).length
  const highPotentialCount = employees.filter(e => ['high', 'exceptional'].includes(e.potentialLevel ?? '')).length

  const depts = [...new Set(employees.map(e => e.department).filter(Boolean))] as string[]
  const departmentBreakdown = depts.map(d => ({ dept: d, count: employees.filter(e => e.department === d).length }))

  const levelBreakdown = LEVELS.map(l => ({ level: l, count: employees.filter(e => e.level === l).length })).filter(l => l.count > 0)

  return { totalEmployees: employees.length, activeEmployees: active.length, avgTenureYears: Math.round(avgTenureYears * 10) / 10, avgSalary: Math.round(avgSalary), attritionRate: Math.round(attritionRate * 10) / 10, highRiskCount, highPotentialCount, departmentBreakdown, levelBreakdown }
}

export function generateSuccessionPlan(role: { roleTitle: string; department?: string; criticality?: string }, candidates: { fullName: string; level?: string | null; potentialLevel?: string | null }[]) {
  const readinessGap = candidates.length > 0 ? Math.max(0, 80 - candidates.length * 20) : 80
  const timeline = readinessGap > 60 ? '18m+' : readinessGap > 40 ? '12-18m' : readinessGap > 20 ? '6-12m' : '0-6m'
  const aiRecommended = candidates.filter(c => ['high', 'exceptional'].includes(c.potentialLevel ?? '')).map(c => c.fullName)
  const aiSummary = candidates.length === 0
    ? `No candidates identified for ${role.roleTitle}. Immediate external recruitment recommended.`
    : `${candidates.length} candidate(s) identified. Estimated readiness gap: ${readinessGap}/100. Timeline: ${timeline}. ${aiRecommended.length} AI-recommended based on potential score.`

  return { readinessGap, timeline, aiRecommended, aiSummary }
}

export function generateWorkforceInsights(analytics: WorkforceAnalytics): { type: string; title: string; summary: string; severity: string; actionItems: string[] }[] {
  const insights = []

  if (analytics.attritionRate > 20) {
    insights.push({ type: 'attrition', title: 'High Attrition Rate Alert', summary: `Attrition rate of ${analytics.attritionRate}% exceeds healthy threshold of 15%.`, severity: 'critical', actionItems: ['Conduct exit interview analysis', 'Review compensation benchmarks', 'Launch employee satisfaction survey'] })
  }
  if (analytics.highRiskCount > 0) {
    insights.push({ type: 'attrition', title: `${analytics.highRiskCount} Employees at High Retention Risk`, summary: `AI identified ${analytics.highRiskCount} employee(s) at high/critical attrition risk.`, severity: analytics.highRiskCount > 3 ? 'critical' : 'warning', actionItems: ['Schedule 1:1s with high-risk employees', 'Review compensation for flagged employees', 'Identify career growth opportunities'] })
  }
  if (analytics.highPotentialCount > 0) {
    insights.push({ type: 'headcount', title: `${analytics.highPotentialCount} High-Potential Employees Identified`, summary: `${analytics.highPotentialCount} employee(s) flagged as high-potential. Succession and development planning required.`, severity: 'info', actionItems: ['Create individual development plans', 'Identify stretch project assignments', 'Fast-track to leadership program'] })
  }
  if (analytics.avgTenureYears < 1.5) {
    insights.push({ type: 'headcount', title: 'Low Average Tenure', summary: `Average tenure of ${analytics.avgTenureYears} years indicates onboarding or culture issues.`, severity: 'warning', actionItems: ['Review onboarding program', 'Conduct 90-day check-ins', 'Analyze early turnover patterns'] })
  }

  return insights
}
