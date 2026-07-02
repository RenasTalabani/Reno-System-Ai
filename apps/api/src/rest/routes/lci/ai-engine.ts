// Phase 64 — Legal & Contract AI Engine

const CLAUSE_RISK_MAP: Record<string, number> = {
  liability: 25,
  indemnity: 30,
  ip: 20,
  termination: 15,
  payment: 10,
  confidentiality: 10,
  dispute: 15,
  other: 5,
}

const CONTRACT_TYPE_RISK: Record<string, number> = {
  msa: 15,
  employment: 20,
  vendor: 15,
  lease: 10,
  sow: 8,
  nda: 5,
  other: 10,
}

export function analyzeContract(contract: {
  contractType: string
  status: string
  value?: number | null
  endDate?: Date | null
  counterparty?: string | null
}) {
  let riskScore = CONTRACT_TYPE_RISK[contract.contractType] ?? 10

  // High value = higher risk
  if (contract.value && contract.value > 100000) riskScore += 20
  else if (contract.value && contract.value > 10000) riskScore += 10

  // Expiring soon
  if (contract.endDate) {
    const daysToExpiry = (contract.endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    if (daysToExpiry < 0) riskScore += 25 // expired
    else if (daysToExpiry < 30) riskScore += 20
    else if (daysToExpiry < 90) riskScore += 10
  }

  if (contract.status === 'terminated') riskScore += 15
  if (!contract.counterparty) riskScore += 5

  const aiRiskScore = Math.min(100, Math.round(riskScore))
  const aiRiskLevel = aiRiskScore >= 70 ? 'critical' : aiRiskScore >= 45 ? 'high' : aiRiskScore >= 25 ? 'medium' : 'low'

  const keyObligations: string[] = []
  const redFlags: string[] = []

  if (contract.contractType === 'msa') keyObligations.push('Service delivery milestones', 'SLA compliance', 'Payment terms')
  if (contract.contractType === 'employment') { keyObligations.push('Non-compete obligations', 'IP assignment', 'Confidentiality'); if (aiRiskScore > 30) redFlags.push('Review non-compete enforceability by jurisdiction') }
  if (contract.contractType === 'vendor') keyObligations.push('Delivery schedule', 'Quality standards', 'Warranty terms')

  if (contract.endDate) {
    const days = (contract.endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    if (days < 0) redFlags.push('CONTRACT EXPIRED — immediate action required')
    else if (days < 30) redFlags.push(`Contract expires in ${Math.round(days)} days — initiate renewal now`)
  }
  if (contract.value && contract.value > 100000) redFlags.push('High-value contract — enhanced legal review recommended')

  const aiSummary = `${contract.contractType.toUpperCase()} contract with ${contract.counterparty ?? 'unknown party'}. ` +
    `AI risk: ${aiRiskLevel} (${aiRiskScore}/100). ${redFlags.length > 0 ? redFlags[0] : 'No critical issues detected.'}`

  return { aiRiskScore, aiRiskLevel, aiSummary, keyObligations, redFlags }
}

export function analyzeClause(clause: {
  clauseType: string
  title: string
  content?: string | null
}) {
  const baseRisk = CLAUSE_RISK_MAP[clause.clauseType] ?? 10

  const riskKeywords = ['unlimited', 'indemnify all', 'sole discretion', 'irrevocable', 'in perpetuity', 'exclusive', 'liquidated damages']
  const protectiveKeywords = ['reasonable', 'mutual', 'limited to', 'cap', 'waiver']

  let riskMod = 0
  const content = (clause.content ?? '' + clause.title).toLowerCase()
  riskKeywords.forEach(k => { if (content.includes(k)) riskMod += 10 })
  protectiveKeywords.forEach(k => { if (content.includes(k)) riskMod -= 5 })

  const aiRiskScore = Math.min(100, Math.max(0, baseRisk + riskMod))
  const aiRiskLevel = aiRiskScore >= 60 ? 'high' : aiRiskScore >= 35 ? 'medium' : 'low'
  const flagged = aiRiskScore >= 50

  const annotations: Record<string, string> = {
    liability: 'Review liability caps — ensure they are mutual and reasonable',
    indemnity: 'Broad indemnification clauses can create unlimited exposure',
    ip: 'Verify IP ownership and licensing scope is clearly defined',
    termination: 'Check termination for convenience clauses and notice periods',
    payment: 'Verify payment terms, late fees, and dispute resolution',
    confidentiality: 'Confirm duration and scope of confidentiality obligations',
    dispute: 'Check jurisdiction, arbitration requirements, and governing law',
  }

  const aiAnnotation = annotations[clause.clauseType] ?? `${clause.clauseType} clause requires standard legal review`

  return { aiRiskScore, aiRiskLevel, flagged, aiAnnotation }
}

export function assessCompliance(item: { framework: string; requirement: string; status: string; dueDate?: Date | null }) {
  let aiRiskScore = 0

  if (item.status === 'non_compliant') aiRiskScore = 85
  else if (item.status === 'pending') aiRiskScore = 40
  else if (item.status === 'compliant') aiRiskScore = 5

  if (item.dueDate) {
    const days = (item.dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    if (days < 0 && item.status !== 'compliant') aiRiskScore = Math.min(100, aiRiskScore + 20)
    else if (days < 7 && item.status !== 'compliant') aiRiskScore = Math.min(100, aiRiskScore + 10)
  }

  const fwkGuidance: Record<string, string> = {
    gdpr: 'Ensure data processing agreements and privacy notices are updated',
    hipaa: 'Verify PHI handling procedures and BAA agreements are in place',
    sox: 'Document financial controls and audit trails per SOX requirements',
    iso27001: 'Maintain ISMS documentation and evidence of controls',
    pci_dss: 'Verify cardholder data environment and scan reports',
    ccpa: 'Update privacy policy and implement opt-out mechanisms',
  }

  const aiGuidance = fwkGuidance[item.framework] ?? `Review ${item.framework} requirements and gather compliance evidence`

  return { aiRiskScore: Math.min(100, aiRiskScore), aiGuidance }
}

export function generateLegalInsights(contracts: Array<{ title: string; aiRiskLevel: string; endDate?: Date | null; status: string }>, compliance: Array<{ framework: string; status: string; aiRiskScore: number }>) {
  const insights: Array<{ type: string; title: string; summary: string; severity: string; actionItems: string[] }> = []

  // Expiring contracts
  const expiring = contracts.filter(c => c.endDate && c.status === 'active' && (c.endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24) < 90)
  if (expiring.length > 0) {
    insights.push({ type: 'expiry_alert', title: `${expiring.length} Contract(s) Expiring Soon`, summary: `${expiring.map(c => c.title).join(', ')} expire within 90 days.`, severity: 'warning', actionItems: ['Initiate renewal negotiations', 'Notify contract owners', 'Review terms for updates'] })
  }

  // High risk contracts
  const highRisk = contracts.filter(c => c.aiRiskLevel === 'high' || c.aiRiskLevel === 'critical')
  if (highRisk.length > 0) {
    insights.push({ type: 'contract_risk', title: `${highRisk.length} High-Risk Contract(s) Detected`, summary: `Critical/high risk contracts require immediate legal review.`, severity: 'critical', actionItems: ['Schedule legal review', 'Negotiate risk-reducing amendments', 'Consider addenda for liability caps'] })
  }

  // Non-compliant items
  const nonCompliant = compliance.filter(c => c.status === 'non_compliant')
  if (nonCompliant.length > 0) {
    insights.push({ type: 'compliance_gap', title: `${nonCompliant.length} Compliance Gap(s) Found`, summary: `Non-compliant items in: ${[...new Set(nonCompliant.map(c => c.framework))].join(', ')}.`, severity: 'critical', actionItems: ['Assign compliance remediation owners', 'Set 30-day fix deadlines', 'Document corrective actions'] })
  }

  return insights
}
