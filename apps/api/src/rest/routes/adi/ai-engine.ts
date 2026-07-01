// Phase 53 — AI Document Intelligence: AI Engine

export const DOCUMENT_CATEGORIES = [
  'invoice', 'contract', 'receipt', 'report', 'correspondence', 'form', 'id_document',
  'financial_statement', 'hr_document', 'legal', 'technical', 'marketing', 'other',
] as const

export const EXTRACTION_TYPES = ['entity', 'table', 'field', 'signature', 'date', 'amount', 'address', 'custom'] as const

export const PIPELINE_STEP_TYPES = ['ocr', 'classify', 'extract', 'summarize', 'translate', 'validate', 'index', 'notify'] as const

// ── Pipeline Templates ────────────────────────────────────────────────────────

export const PIPELINE_TEMPLATES = [
  {
    name: 'Invoice Processing',
    slug: 'invoice_processing',
    description: 'OCR → Classify → Extract key fields (amount, vendor, date) → Validate → Post to finance',
    steps: [
      { step: 'ocr',      config: { language: 'en' } },
      { step: 'classify', config: { expectedCategory: 'invoice' } },
      { step: 'extract',  config: { fields: ['vendor_name', 'invoice_number', 'amount', 'due_date', 'line_items'] } },
      { step: 'validate', config: { requiredFields: ['amount', 'vendor_name'] } },
    ],
    inputTypes: ['pdf', 'image/jpeg', 'image/png'],
  },
  {
    name: 'Contract Analysis',
    slug: 'contract_analysis',
    description: 'OCR → Classify → Extract clauses → Summarize → Flag risk terms',
    steps: [
      { step: 'ocr',       config: { language: 'en', enhanceResolution: true } },
      { step: 'classify',  config: { expectedCategory: 'contract' } },
      { step: 'extract',   config: { fields: ['parties', 'effective_date', 'termination_date', 'payment_terms', 'jurisdiction'] } },
      { step: 'summarize', config: { maxLength: 500, focusAreas: ['obligations', 'risks', 'termination'] } },
    ],
    inputTypes: ['pdf', 'application/msword'],
  },
  {
    name: 'ID Verification',
    slug: 'id_verification',
    description: 'OCR → Classify → Extract ID fields → Validate format → Flag anomalies',
    steps: [
      { step: 'ocr',      config: { language: 'en', mode: 'id_card' } },
      { step: 'classify', config: { expectedCategory: 'id_document' } },
      { step: 'extract',  config: { fields: ['full_name', 'id_number', 'dob', 'expiry_date', 'nationality'] } },
      { step: 'validate', config: { rules: ['id_format', 'not_expired', 'face_match'] } },
    ],
    inputTypes: ['image/jpeg', 'image/png', 'image/webp'],
  },
]

// ── OCR Simulation ────────────────────────────────────────────────────────────

export function simulateOcr(originalName: string, mimeType: string, fileSize: number): {
  rawText: string; pageCount: number; wordCount: number; confidence: number; language: string
} {
  const isPdf = mimeType === 'application/pdf'
  const pageCount = isPdf ? Math.max(1, Math.floor(fileSize / 40_000)) : 1
  const wordsPerPage = 250 + Math.floor(Math.random() * 150)
  const wordCount = pageCount * wordsPerPage
  const confidence = 0.85 + Math.random() * 0.14

  const sampleTexts: Record<string, string> = {
    invoice: `INVOICE\nVendor: Acme Corp\nInvoice #: INV-2026-001\nDate: 2026-07-01\nAmount Due: $2,450.00\nDue Date: 2026-07-15\nDescription: Professional Services`,
    contract: `SERVICE AGREEMENT\nThis Agreement is made between Client Corp and Service Provider Ltd.\nEffective Date: 2026-07-01\nTerm: 12 months\nPayment: $5,000/month`,
    report: `QUARTERLY REPORT Q2 2026\nRevenue: $1.2M (+15% YoY)\nOperating Income: $340K\nKey Highlights: Strong SaaS growth, new enterprise clients`,
    receipt: `RECEIPT\nMerchant: Office Supplies Plus\nDate: 2026-07-01\nItems: Paper, Pens, Folders\nTotal: $87.45\nPayment: Credit Card`,
  }

  const docType = Object.keys(sampleTexts).find(k => originalName.toLowerCase().includes(k)) ?? 'report'
  const rawText = sampleTexts[docType] ?? sampleTexts['report']!

  return { rawText, pageCount, wordCount, confidence, language: 'en' }
}

// ── Classification Engine ─────────────────────────────────────────────────────

export interface ClassificationResult {
  category: string
  subcategory: string | null
  confidence: number
  labels: string[]
  sentiment: string
  language: string
}

export function classifyDocument(rawText: string, fileName: string): ClassificationResult {
  const text = (rawText + ' ' + fileName).toLowerCase()

  const patterns: Array<{ category: string; keywords: string[]; subcategory?: string }> = [
    { category: 'invoice', keywords: ['invoice', 'bill', 'amount due', 'payment', 'total'], subcategory: 'accounts_payable' },
    { category: 'contract', keywords: ['agreement', 'contract', 'parties', 'terms', 'obligations'], subcategory: 'legal_agreement' },
    { category: 'receipt', keywords: ['receipt', 'purchased', 'merchant', 'transaction'], subcategory: 'expense' },
    { category: 'report', keywords: ['report', 'quarterly', 'annual', 'summary', 'results'], subcategory: 'business_report' },
    { category: 'hr_document', keywords: ['employee', 'salary', 'offer', 'termination', 'payroll'], subcategory: 'hr_record' },
    { category: 'financial_statement', keywords: ['balance sheet', 'income statement', 'revenue', 'assets', 'liabilities'], subcategory: 'financial' },
    { category: 'id_document', keywords: ['passport', 'identity', 'national id', 'driver license', 'dob'], subcategory: 'identity' },
    { category: 'correspondence', keywords: ['dear', 'sincerely', 'regards', 'letter', 'memo'], subcategory: 'letter' },
  ]

  let best = patterns[0]!
  let bestScore = 0
  for (const p of patterns) {
    const score = p.keywords.filter(k => text.includes(k)).length
    if (score > bestScore) { bestScore = score; best = p }
  }

  const confidence = bestScore > 0 ? Math.min(0.95, 0.6 + bestScore * 0.07) : 0.45
  const labels = ['ai_classified', best.category, ...(bestScore > 2 ? ['high_confidence'] : ['low_confidence'])]
  const sentiment = text.includes('urgent') || text.includes('overdue') ? 'negative' : 'neutral'

  return { category: best.category, subcategory: best.subcategory ?? null, confidence, labels, sentiment, language: 'en' }
}

// ── Field Extraction ──────────────────────────────────────────────────────────

export interface ExtractionField {
  fieldName: string
  fieldValue: string
  extractionType: string
  confidence: number
  pageNumber: number
}

export function extractFields(rawText: string, category: string): ExtractionField[] {
  const fieldPatterns: Record<string, Array<{ name: string; pattern: RegExp; type: string }>> = {
    invoice: [
      { name: 'vendor_name', pattern: /(?:vendor|from|supplier):\s*(.+)/i, type: 'entity' },
      { name: 'invoice_number', pattern: /(?:invoice|inv)[# .-]*(\w+-?\d+)/i, type: 'field' },
      { name: 'total_amount', pattern: /(?:total|amount due|subtotal):\s*\$?([\d,]+\.?\d*)/i, type: 'amount' },
      { name: 'due_date', pattern: /due date:\s*(\d{4}-\d{2}-\d{2})/i, type: 'date' },
    ],
    contract: [
      { name: 'effective_date', pattern: /effective date:\s*(\d{4}-\d{2}-\d{2})/i, type: 'date' },
      { name: 'parties', pattern: /between\s+(.+?)\s+and/i, type: 'entity' },
      { name: 'term', pattern: /term:\s*(.+?)(?:\n|$)/i, type: 'field' },
      { name: 'payment', pattern: /payment:\s*(.+?)(?:\n|$)/i, type: 'amount' },
    ],
    receipt: [
      { name: 'merchant', pattern: /merchant:\s*(.+)/i, type: 'entity' },
      { name: 'total', pattern: /total:\s*\$?([\d.]+)/i, type: 'amount' },
      { name: 'date', pattern: /date:\s*(\d{4}-\d{2}-\d{2})/i, type: 'date' },
      { name: 'payment_method', pattern: /payment:\s*(.+)/i, type: 'field' },
    ],
    report: [
      { name: 'period', pattern: /(?:Q\d|quarter|annual|monthly)\s+\d{4}/i, type: 'field' },
      { name: 'revenue', pattern: /revenue:\s*\$?([\d.,]+[KMB]?)/i, type: 'amount' },
    ],
    id_document: [
      { name: 'full_name', pattern: /name:\s*(.+)/i, type: 'entity' },
      { name: 'id_number', pattern: /(?:id|number|passport):\s*([A-Z0-9-]+)/i, type: 'field' },
      { name: 'dob', pattern: /(?:dob|born|birth):\s*(\d{4}-\d{2}-\d{2})/i, type: 'date' },
    ],
  }

  const patterns = fieldPatterns[category] ?? fieldPatterns['invoice']!
  const fields: ExtractionField[] = []

  for (const { name, pattern, type } of patterns) {
    const match = rawText.match(pattern)
    if (match?.[1]) {
      fields.push({
        fieldName: name, fieldValue: match[1].trim(),
        extractionType: type, confidence: 0.80 + Math.random() * 0.15, pageNumber: 1,
      })
    }
  }

  return fields
}

// ── Pipeline Step Execution ───────────────────────────────────────────────────

export function executePipelineStep(
  stepType: string,
  doc: { rawText?: string | null; name: string; mimeType: string; fileSize: number },
  config: Record<string, unknown>,
  context: Record<string, unknown>,
): { output: Record<string, unknown>; durationMs: number } {
  const durationMs = 100 + Math.floor(Math.random() * 500)

  switch (stepType) {
    case 'ocr': {
      const result = simulateOcr(doc.name, doc.mimeType, doc.fileSize)
      return { output: result, durationMs }
    }
    case 'classify': {
      const text = (context.rawText as string) ?? doc.rawText ?? doc.name
      const result = classifyDocument(text, doc.name)
      return { output: result, durationMs }
    }
    case 'extract': {
      const text = (context.rawText as string) ?? doc.rawText ?? ''
      const category = (context.category as string) ?? 'invoice'
      const fields = extractFields(text, category)
      return { output: { fields, totalExtracted: fields.length }, durationMs }
    }
    case 'summarize': {
      const text = ((context.rawText as string) ?? doc.rawText ?? '').substring(0, 200)
      return { output: { summary: `Document summary: ${text}...`, wordCount: text.split(' ').length }, durationMs }
    }
    case 'validate': {
      const fields = (context.fields as ExtractionField[]) ?? []
      const required = (config.requiredFields as string[]) ?? []
      const missing = required.filter(r => !fields.some(f => f.fieldName === r))
      return { output: { valid: missing.length === 0, missingFields: missing, fieldCount: fields.length }, durationMs }
    }
    case 'translate':
      return { output: { translated: true, targetLanguage: config.targetLanguage ?? 'en', status: 'done' }, durationMs }
    case 'index':
      return { output: { indexed: true, searchable: true, documentId: context.documentId }, durationMs }
    case 'notify':
      return { output: { notified: true, channel: config.channel ?? 'email', recipients: config.recipients ?? [] }, durationMs }
    default:
      return { output: { step: stepType, status: 'completed' }, durationMs }
  }
}

// ── Dashboard Summary ─────────────────────────────────────────────────────────

export function generateDocumentSummary(total: number, processed: number, pipelines: number): string {
  if (total === 0) return 'No documents processed yet. Upload a document to start AI extraction.'
  const rate = total > 0 ? Math.round((processed / total) * 100) : 0
  return `${total} documents · ${rate}% processed · ${pipelines} extraction pipelines`
}
