// Phase 62 — Marketing AI Engine

export function analyzeCampaign(campaign: {
  budget: number; spent: number; impressions: number; clicks: number; conversions: number; revenue: number; channel: string
}) {
  const ctr = campaign.impressions > 0 ? (campaign.clicks / campaign.impressions) * 100 : 0
  const cvr = campaign.clicks > 0 ? (campaign.conversions / campaign.clicks) * 100 : 0
  const roi = campaign.spent > 0 ? ((campaign.revenue - campaign.spent) / campaign.spent) * 100 : 0
  const cpa = campaign.conversions > 0 ? campaign.spent / campaign.conversions : 0

  // Score 0-100
  let score = 0
  score += Math.min(30, (ctr / 5) * 30) // CTR up to 5% = 30 pts
  score += Math.min(25, (cvr / 10) * 25) // CVR up to 10% = 25 pts
  score += roi > 0 ? Math.min(30, (roi / 200) * 30) : 0 // ROI up to 200% = 30 pts
  score += campaign.budget > 0 ? Math.min(15, ((campaign.budget - campaign.spent) / campaign.budget) * 15) : 0 // budget efficiency

  const aiRoiScore = Math.min(100, Math.round(score))
  const aiPerformance =
    aiRoiScore >= 80 ? 'excellent' : aiRoiScore >= 65 ? 'good' : aiRoiScore >= 45 ? 'average' : aiRoiScore >= 25 ? 'below_avg' : 'poor'

  const recommendations: string[] = []
  if (ctr < 1) recommendations.push('CTR below 1% — test new ad creatives and headlines')
  if (cvr < 2) recommendations.push(`Conversion rate ${cvr.toFixed(1)}% is low — optimize landing pages`)
  if (roi < 0) recommendations.push('Negative ROI — reduce spend or improve targeting')
  else if (roi > 100) recommendations.push('High ROI detected — increase budget allocation for this campaign')
  if (campaign.spent > campaign.budget * 0.9) recommendations.push('Near budget limit — plan next cycle allocation')
  if (recommendations.length === 0) recommendations.push('Campaign performing well — maintain current strategy')

  return { aiRoiScore, aiPerformance, recommendations, metrics: { ctr: Math.round(ctr * 100) / 100, cvr: Math.round(cvr * 100) / 100, roi: Math.round(roi * 10) / 10, cpa: Math.round(cpa * 100) / 100 } }
}

export function scoreAudience(audience: { size: number; engagementRate: number; conversionRate: number; segmentType: string }) {
  let aiScore = 0
  aiScore += Math.min(25, (audience.engagementRate / 20) * 25)  // eng up to 20% = 25pts
  aiScore += Math.min(40, (audience.conversionRate / 5) * 40)   // cvr up to 5% = 40pts
  aiScore += Math.min(20, Math.log10(audience.size + 1) * 5)    // size logarithmic = up to 20pts
  if (audience.segmentType === 'lookalike') aiScore += 10
  else if (audience.segmentType === 'retargeting') aiScore += 15

  const score = Math.min(100, Math.round(aiScore))

  const insights: string[] = []
  if (audience.engagementRate > 10) insights.push('Highly engaged audience — prioritize for premium campaigns')
  else if (audience.engagementRate < 2) insights.push('Low engagement — refine targeting criteria')
  if (audience.conversionRate > 3) insights.push(`Strong converter at ${audience.conversionRate.toFixed(1)}% — expand this segment`)
  if (audience.size < 1000) insights.push('Small audience — consider lookalike expansion to scale reach')
  if (insights.length === 0) insights.push('Audience performing within normal parameters')

  return { aiScore: score, insights }
}

export function scoreContent(content: { title: string; wordCount: number; contentType: string; channel: string }) {
  let seoScore = 0, readabilityScore = 0, engagementScore = 0

  // SEO
  seoScore += content.wordCount >= 300 ? 25 : (content.wordCount / 300) * 25
  seoScore += content.wordCount >= 1500 ? 25 : content.wordCount >= 800 ? 15 : 5
  seoScore += content.title.length >= 30 && content.title.length <= 60 ? 25 : 10
  seoScore += content.channel === 'seo' || content.channel === 'web' ? 25 : 15
  seoScore = Math.min(100, Math.round(seoScore))

  // Readability
  readabilityScore = content.wordCount >= 150 ? 70 + Math.random() * 20 : 40 + Math.random() * 20
  readabilityScore = Math.min(100, Math.round(readabilityScore))

  // Engagement prediction
  const typeBonus: Record<string, number> = { video: 30, social: 20, email: 15, blog: 10, ad: 5 }
  engagementScore = 40 + (typeBonus[content.contentType] ?? 10) + Math.random() * 20
  engagementScore = Math.min(100, Math.round(engagementScore))

  const aiOverallScore = Math.round((seoScore * 0.35 + readabilityScore * 0.3 + engagementScore * 0.35))
  const aiGrade = aiOverallScore >= 90 ? 'A+' : aiOverallScore >= 80 ? 'A' : aiOverallScore >= 70 ? 'B' : aiOverallScore >= 60 ? 'C' : aiOverallScore >= 50 ? 'D' : 'F'

  const suggestions: string[] = []
  if (seoScore < 60) suggestions.push('Improve SEO: add more keywords, increase word count to 800+')
  if (readabilityScore < 65) suggestions.push('Simplify sentences and use more subheadings for readability')
  if (engagementScore < 55) suggestions.push(`${content.contentType} content could benefit from multimedia elements`)
  if (content.title.length > 70) suggestions.push('Shorten title to under 60 chars for better CTR')
  if (suggestions.length === 0) suggestions.push('Content quality is strong — ready for distribution')

  return { seoScore, readabilityScore, engagementScore, aiOverallScore, aiGrade, suggestions }
}

export function generateMarketingInsights(campaigns: Array<{ channel: string; aiRoiScore: number; revenue: number; spent: number }>, audiences: Array<{ aiScore: number; size: number }>) {
  const insights: Array<{ type: string; title: string; summary: string; impact: string; actionItems: string[] }> = []

  if (campaigns.length > 0) {
    const topChannel = campaigns.reduce((best, c) => c.aiRoiScore > best.aiRoiScore ? c : best, campaigns[0])
    insights.push({ type: 'channel', title: `Top Performing Channel: ${topChannel.channel}`, summary: `${topChannel.channel} campaigns achieve ROI score of ${topChannel.aiRoiScore}. Prioritize budget allocation here.`, impact: 'high', actionItems: [`Increase ${topChannel.channel} budget by 20%`, 'Scale winning campaigns', 'Create lookalike campaigns'] })

    const totalRevenue = campaigns.reduce((s, c) => s + c.revenue, 0)
    const totalSpent = campaigns.reduce((s, c) => s + c.spent, 0)
    const overallRoi = totalSpent > 0 ? ((totalRevenue - totalSpent) / totalSpent) * 100 : 0
    insights.push({ type: 'budget', title: 'Marketing Budget ROI Analysis', summary: `Overall marketing ROI is ${overallRoi.toFixed(0)}%. Total revenue generated: $${totalRevenue.toLocaleString()}.`, impact: overallRoi > 100 ? 'high' : overallRoi > 0 ? 'medium' : 'low', actionItems: ['Reallocate budget from low-performers', 'Set up attribution modeling', 'Test new channels'] })
  }

  if (audiences.length > 0) {
    const totalReach = audiences.reduce((s, a) => s + a.size, 0)
    const avgScore = audiences.reduce((s, a) => s + a.aiScore, 0) / audiences.length
    insights.push({ type: 'audience', title: 'Audience Intelligence Summary', summary: `Total addressable audience: ${totalReach.toLocaleString()}. Average audience quality score: ${avgScore.toFixed(0)}/100.`, impact: 'medium', actionItems: ['Expand high-scoring segments', 'Suppress low-quality audiences', 'Build lookalike models'] })
  }

  return insights
}

export function computeMarketingKpis(campaigns: Array<{ budget: number; spent: number; impressions: number; clicks: number; conversions: number; revenue: number; aiRoiScore: number; status: string }>) {
  const active = campaigns.filter(c => c.status === 'active')
  const totalBudget = campaigns.reduce((s, c) => s + c.budget, 0)
  const totalSpent = campaigns.reduce((s, c) => s + c.spent, 0)
  const totalImpressions = campaigns.reduce((s, c) => s + c.impressions, 0)
  const totalClicks = campaigns.reduce((s, c) => s + c.clicks, 0)
  const totalConversions = campaigns.reduce((s, c) => s + c.conversions, 0)
  const totalRevenue = campaigns.reduce((s, c) => s + c.revenue, 0)
  const overallRoi = totalSpent > 0 ? ((totalRevenue - totalSpent) / totalSpent) * 100 : 0
  const avgRoiScore = campaigns.length > 0 ? campaigns.reduce((s, c) => s + c.aiRoiScore, 0) / campaigns.length : 0

  return {
    totalCampaigns: campaigns.length,
    activeCampaigns: active.length,
    totalBudget: Math.round(totalBudget),
    totalSpent: Math.round(totalSpent),
    totalImpressions,
    totalClicks,
    totalConversions,
    totalRevenue: Math.round(totalRevenue),
    overallRoi: Math.round(overallRoi * 10) / 10,
    avgRoiScore: Math.round(avgRoiScore),
    overallCtr: totalImpressions > 0 ? Math.round((totalClicks / totalImpressions) * 10000) / 100 : 0,
  }
}
