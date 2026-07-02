// Phase 63 — Operations AI Engine

export function analyzeProcess(process: {
  cycleDays: number; automationPct: number; errorRate: number; throughput: number
}) {
  // Score 0-100
  let score = 0
  score += Math.min(25, ((10 - Math.min(10, process.cycleDays)) / 10) * 25) // shorter cycle = better
  score += Math.min(30, (process.automationPct / 100) * 30) // automation
  score += Math.min(25, ((5 - Math.min(5, process.errorRate)) / 5) * 25) // lower error = better
  score += Math.min(20, Math.min(20, process.throughput / 100 * 20)) // throughput

  const aiEfficiencyScore = Math.min(100, Math.round(score))
  const aiMaturityLevel =
    aiEfficiencyScore >= 85 ? 'optimized' : aiEfficiencyScore >= 70 ? 'advanced' : aiEfficiencyScore >= 50 ? 'intermediate' : aiEfficiencyScore >= 30 ? 'basic' : 'manual'

  const recommendations: string[] = []
  if (process.automationPct < 30) recommendations.push('Process is below 30% automated — evaluate RPA or workflow tools')
  if (process.errorRate > 3) recommendations.push(`Error rate ${process.errorRate}% exceeds threshold — implement error prevention checks`)
  if (process.cycleDays > 5) recommendations.push(`Cycle time ${process.cycleDays} days is high — map and eliminate non-value steps`)
  if (process.throughput < 50) recommendations.push('Low throughput — consider parallel processing or resource allocation')
  if (recommendations.length === 0) recommendations.push('Process is well-optimized — focus on continuous monitoring')

  return { aiEfficiencyScore, aiMaturityLevel, recommendations }
}

export function detectBottlenecks(process: {
  name: string; cycleDays: number; errorRate: number; automationPct: number; throughput: number
}) {
  const bottlenecks: Array<{ step: string; severity: string; aiRootCause: string; aiSolution: string }> = []

  if (process.cycleDays > 7) {
    bottlenecks.push({ step: 'Approval Gates', severity: 'high', aiRootCause: `Total cycle time of ${process.cycleDays} days suggests excessive approval steps`, aiSolution: 'Implement parallel approvals and auto-approve low-risk items' })
  }
  if (process.errorRate > 5) {
    bottlenecks.push({ step: 'Data Entry / Validation', severity: 'critical', aiRootCause: `Error rate of ${process.errorRate}% indicates manual data entry issues`, aiSolution: 'Implement form validation, dropdowns, and barcode/OCR input to reduce manual errors' })
  }
  if (process.automationPct < 20) {
    bottlenecks.push({ step: 'Manual Handoffs', severity: 'medium', aiRootCause: 'Only ' + process.automationPct + '% automation suggests heavy manual handoffs', aiSolution: 'Map handoff points and prioritize RPA for repetitive tasks' })
  }
  if (process.throughput < 30) {
    bottlenecks.push({ step: 'Resource Constraint', severity: 'high', aiRootCause: 'Low throughput indicates resource bottleneck or capacity issues', aiSolution: 'Conduct capacity analysis and consider load balancing across teams' })
  }

  return bottlenecks
}

export function predictKpi(kpi: { kpiCode: string; kpiName: string; actual: number; target: number }) {
  const attainment = kpi.target > 0 ? (kpi.actual / kpi.target) * 100 : 0
  const trend = attainment >= 100 ? 'improving' : attainment >= 80 ? 'stable' : 'declining'
  const aiPredicted = Math.max(0, kpi.actual * (1 + (attainment >= 100 ? 0.05 : attainment >= 80 ? 0.02 : -0.03)))
  const gap = kpi.target - kpi.actual

  const aiSummary = `${kpi.kpiName} at ${attainment.toFixed(0)}% of target. ` +
    (gap > 0 ? `Gap of ${Math.abs(gap).toFixed(1)} units. ` : 'Target exceeded. ') +
    `AI predicts ${aiPredicted.toFixed(1)} next period. Trend: ${trend}.`

  return { aiPredicted: Math.round(aiPredicted * 10) / 10, trend, aiSummary }
}

export function generateEfficiencyInsights(processes: Array<{ name: string; aiEfficiencyScore: number; automationPct: number; cycleDays: number }>, kpis: Array<{ kpiName: string; actual: number; target: number; trend: string }>) {
  const insights: Array<{ type: string; title: string; summary: string; savingsEst: number; priority: string; actionItems: string[] }> = []

  if (processes.length > 0) {
    const lowEfficiency = processes.filter(p => p.aiEfficiencyScore < 50)
    if (lowEfficiency.length > 0) {
      insights.push({
        type: 'process',
        title: `${lowEfficiency.length} Process(es) Need Optimization`,
        summary: `${lowEfficiency.map(p => p.name).join(', ')} scored below 50 on efficiency. Immediate attention required.`,
        savingsEst: lowEfficiency.length * 15000,
        priority: 'high',
        actionItems: ['Conduct process mapping workshops', 'Identify automation opportunities', 'Set improvement targets with owners'],
      })
    }

    const avgAutomation = processes.reduce((s, p) => s + p.automationPct, 0) / processes.length
    if (avgAutomation < 40) {
      insights.push({
        type: 'automation',
        title: `Low Automation Rate: ${avgAutomation.toFixed(0)}%`,
        summary: 'Average automation across processes is below the 40% threshold. Significant efficiency gains available.',
        savingsEst: Math.round((40 - avgAutomation) * 500),
        priority: 'medium',
        actionItems: ['Evaluate RPA vendors', 'Pilot automation on highest-volume process', 'Track automation ROI'],
      })
    }
  }

  if (kpis.length > 0) {
    const declining = kpis.filter(k => k.trend === 'declining')
    if (declining.length > 0) {
      insights.push({
        type: 'kpi',
        title: `${declining.length} KPI(s) Declining`,
        summary: `${declining.map(k => k.kpiName).join(', ')} trending negative. Intervention needed to prevent target miss.`,
        savingsEst: 0,
        priority: 'high',
        actionItems: ['Root cause analysis for each declining KPI', 'Set 30-day recovery plans', 'Weekly performance reviews'],
      })
    }
  }

  return insights
}

export function computeOpsKpis(processes: Array<{ aiEfficiencyScore: number; automationPct: number; errorRate: number; cycleDays: number; throughput: number }>) {
  if (processes.length === 0) return { totalProcesses: 0, avgEfficiency: 0, avgAutomation: 0, avgErrorRate: 0, avgCycleDays: 0, totalThroughput: 0, optimizedCount: 0 }
  const avg = (arr: number[]) => arr.reduce((s, v) => s + v, 0) / arr.length
  return {
    totalProcesses: processes.length,
    avgEfficiency: Math.round(avg(processes.map(p => p.aiEfficiencyScore))),
    avgAutomation: Math.round(avg(processes.map(p => p.automationPct)) * 10) / 10,
    avgErrorRate: Math.round(avg(processes.map(p => p.errorRate)) * 100) / 100,
    avgCycleDays: Math.round(avg(processes.map(p => p.cycleDays)) * 10) / 10,
    totalThroughput: Math.round(processes.reduce((s, p) => s + p.throughput, 0)),
    optimizedCount: processes.filter(p => p.aiEfficiencyScore >= 80).length,
  }
}
