// Phase 56 — AI Predictive Analytics & Forecasting Engine: AI Engine

export const ALGORITHM_TYPES = [
  { id: 'linear', name: 'Linear Regression', desc: 'Fast, interpretable baseline for trend data', bestFor: 'sales | revenue | headcount' },
  { id: 'arima', name: 'ARIMA', desc: 'Auto-regressive model for stationary time-series', bestFor: 'inventory | demand | traffic' },
  { id: 'prophet', name: 'Prophet (Meta)', desc: 'Handles seasonality, holidays, and trend changes', bestFor: 'revenue | user growth | bookings' },
  { id: 'lstm', name: 'LSTM Neural Net', desc: 'Deep learning for complex sequential patterns', bestFor: 'stock price | sensor data | usage' },
  { id: 'xgboost', name: 'XGBoost', desc: 'Gradient boosted trees for tabular data', bestFor: 'churn | lead score | fraud' },
  { id: 'ensemble', name: 'AI Ensemble', desc: 'Combines all models for highest accuracy', bestFor: 'critical forecasts | enterprise KPIs' },
]

export const BUILT_IN_DATASETS = [
  {
    slug: 'monthly_revenue', name: 'Monthly Revenue', dataType: 'timeseries', source: 'finance',
    description: 'Simulated monthly revenue data for the last 24 months',
    columns: [{ name: 'month', type: 'date' }, { name: 'revenue', type: 'number' }, { name: 'cost', type: 'number' }, { name: 'profit', type: 'number' }],
    rowCount: 24,
  },
  {
    slug: 'weekly_leads', name: 'Weekly Leads', dataType: 'timeseries', source: 'crm',
    description: 'Weekly lead counts from CRM pipeline',
    columns: [{ name: 'week', type: 'date' }, { name: 'leads', type: 'number' }, { name: 'qualified', type: 'number' }, { name: 'converted', type: 'number' }],
    rowCount: 52,
  },
  {
    slug: 'hr_headcount', name: 'HR Headcount', dataType: 'timeseries', source: 'hr',
    description: 'Monthly employee headcount and attrition',
    columns: [{ name: 'month', type: 'date' }, { name: 'headcount', type: 'number' }, { name: 'hired', type: 'number' }, { name: 'left', type: 'number' }],
    rowCount: 24,
  },
]

// ── Training Simulation ───────────────────────────────────────────────────────

export interface TrainingResult {
  accuracy: number
  maeScore: number
  rmseScore: number
  r2Score: number
  trainingMs: number
  details: Record<string, unknown>
}

export function simulateTraining(algorithmType: string, rowCount: number): TrainingResult {
  const baseAccuracy: Record<string, number> = {
    linear: 72, arima: 78, prophet: 83, lstm: 87, xgboost: 85, ensemble: 91,
  }
  const base = baseAccuracy[algorithmType] ?? 75
  const noise = (Math.random() - 0.5) * 8
  const accuracy = Math.max(50, Math.min(99, base + noise + Math.min(rowCount / 100, 5)))

  const mae = Math.round((100 - accuracy) * 1.2 * (1 + Math.random() * 0.3) * 10) / 10
  const rmse = Math.round(mae * 1.35 * 10) / 10
  const r2 = Math.round((accuracy / 100) * 0.98 * 100) / 100
  const ms = { linear: 120, arima: 350, prophet: 800, lstm: 2200, xgboost: 600, ensemble: 3500 }[algorithmType] ?? 500
  const trainingMs = ms + Math.floor(Math.random() * ms * 0.3)

  return {
    accuracy: Math.round(accuracy * 100) / 100,
    maeScore: mae,
    rmseScore: rmse,
    r2Score: r2,
    trainingMs,
    details: { algorithm: algorithmType, rows: rowCount, epochs: algorithmType === 'lstm' ? 50 : undefined, trees: algorithmType === 'xgboost' ? 200 : undefined },
  }
}

// ── Forecasting Simulation ────────────────────────────────────────────────────

export interface ForecastPoint {
  period: string
  predictedAt: Date
  value: number
  lowerBound: number
  upperBound: number
  confidence: number
  isAnomaly: boolean
  anomalyScore?: number
}

export interface ForecastResult {
  points: ForecastPoint[]
  insights: string[]
  aiSummary: string
  runMs: number
  trend: 'up' | 'down' | 'flat' | 'volatile'
  peakPeriod: string
  peakValue: number
}

export function generateForecast(
  modelAccuracy: number,
  horizon: number,
  granularity: string,
  targetColumn: string,
  seed = Math.random() * 1000,
): ForecastResult {
  const baseValue = 1000 + seed * 10
  const trendFactor = (Math.random() > 0.6 ? 1 : -0.3) * (0.01 + Math.random() * 0.03)
  const seasonalAmplitude = baseValue * 0.12

  const points: ForecastPoint[] = []
  const now = new Date()
  let peakValue = 0
  let peakPeriod = ''

  for (let i = 0; i < horizon; i++) {
    const predictedAt = new Date(now)
    const periodMs = { hourly: 3600000, daily: 86400000, weekly: 604800000, monthly: 2592000000 }[granularity] ?? 86400000
    predictedAt.setTime(now.getTime() + i * periodMs)

    const trend = baseValue * (1 + trendFactor * i)
    const seasonal = seasonalAmplitude * Math.sin((i * 2 * Math.PI) / (granularity === 'monthly' ? 12 : granularity === 'weekly' ? 52 : 7))
    const noise = (Math.random() - 0.5) * baseValue * 0.05
    const value = Math.max(0, trend + seasonal + noise)

    const interval = value * (1 - modelAccuracy / 100) * (0.5 + i / horizon)
    const lowerBound = Math.max(0, value - interval * 1.96)
    const upperBound = value + interval * 1.96

    const anomalyScore = Math.random()
    const isAnomaly = anomalyScore > 0.97

    const period = `${granularity}_${i + 1}`

    if (value > peakValue) { peakValue = value; peakPeriod = period }

    points.push({
      period, predictedAt, value: Math.round(value * 100) / 100,
      lowerBound: Math.round(lowerBound * 100) / 100,
      upperBound: Math.round(upperBound * 100) / 100,
      confidence: 0.95, isAnomaly,
      ...(isAnomaly && { anomalyScore: Math.round(anomalyScore * 100) / 100 }),
    })
  }

  const firstVal = points[0]?.value ?? 0
  const lastVal = points[points.length - 1]?.value ?? 0
  const changePct = ((lastVal - firstVal) / firstVal) * 100
  const trend = Math.abs(changePct) < 2 ? 'flat' : changePct > 5 ? 'up' : changePct < -5 ? 'down' : 'volatile'
  const anomalies = points.filter(p => p.isAnomaly).length

  const insights = [
    `${targetColumn} is expected to ${trend === 'up' ? 'grow' : trend === 'down' ? 'decline' : 'remain stable'} by ${Math.abs(changePct).toFixed(1)}% over the forecast horizon.`,
    `Peak ${targetColumn} value of ${peakValue.toFixed(0)} forecast at ${peakPeriod}.`,
    anomalies > 0 ? `${anomalies} anomalous period${anomalies > 1 ? 's' : ''} detected — review ${peakPeriod} closely.` : 'No anomalies detected in the forecast window.',
    modelAccuracy >= 85 ? 'High model confidence — suitable for operational planning.' : 'Moderate confidence — use as directional signal.',
  ]

  const aiSummary = `AI forecast for ${targetColumn} (${granularity}, ${horizon} periods): ${trend === 'up' ? '↑ Upward' : trend === 'down' ? '↓ Downward' : '→ Stable'} trend with ${changePct.toFixed(1)}% projected change. Model accuracy ${modelAccuracy.toFixed(0)}%.`

  return { points, insights, aiSummary, runMs: 200 + Math.floor(Math.random() * 600), trend, peakPeriod, peakValue }
}

// ── Dashboard Stats ───────────────────────────────────────────────────────────

export interface ApaStats {
  totalDatasets: number
  totalModels: number
  trainedModels: number
  totalForecasts: number
  avgAccuracy: number
  anomaliesDetected: number
  grade: string
}

export function computeApaGrade(stats: ApaStats): string {
  const score = (
    (stats.trainedModels / Math.max(stats.totalModels, 1)) * 40 +
    (Math.min(stats.avgAccuracy, 100) / 100) * 40 +
    (stats.totalForecasts > 0 ? 20 : 0)
  )
  return score >= 90 ? 'A' : score >= 75 ? 'B' : score >= 60 ? 'C' : score >= 40 ? 'D' : 'F'
}
