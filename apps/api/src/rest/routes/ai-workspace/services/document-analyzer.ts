import { prisma } from '@reno/database'

export type DocType = 'pdf' | 'word' | 'excel' | 'markdown' | 'text' | 'code'

export interface DocumentAnalysis {
  wordCount: number
  estimatedPages: number
  language: string
  summary: string
  keyPoints: string[]
  sentiment: 'positive' | 'neutral' | 'negative'
  suggestions: string[]
}

export function analyzeContent(content: string, type: DocType): DocumentAnalysis {
  const words = content.trim().split(/\s+/).filter(Boolean)
  const wordCount = words.length
  const estimatedPages = Math.max(1, Math.ceil(wordCount / 250))

  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 10)
  const keyPoints = sentences.slice(0, 3).map(s => s.trim().substring(0, 120))

  const positiveWords = ['great', 'good', 'excellent', 'success', 'improve', 'benefit', 'positive', 'profit']
  const negativeWords = ['fail', 'error', 'problem', 'issue', 'loss', 'risk', 'danger', 'critical']
  const lowerContent = content.toLowerCase()
  const posScore = positiveWords.filter(w => lowerContent.includes(w)).length
  const negScore = negativeWords.filter(w => lowerContent.includes(w)).length
  const sentiment = posScore > negScore ? 'positive' : negScore > posScore ? 'negative' : 'neutral'

  const suggestions: string[] = []
  if (wordCount < 100) suggestions.push('Document is short — consider expanding with more detail.')
  if (wordCount > 5000) suggestions.push('Document is long — consider adding a table of contents.')
  if (type === 'excel') suggestions.push('Consider adding chart visualizations for key metrics.')
  if (type === 'code') suggestions.push('Add inline comments for complex logic sections.')

  const firstWords = words.slice(0, 20).join(' ')
  const summary = `${type.toUpperCase()} document with ${wordCount} words (~${estimatedPages} page${estimatedPages > 1 ? 's' : ''}). ${firstWords}...`

  return { wordCount, estimatedPages, language: 'en', summary, keyPoints, sentiment, suggestions }
}

export async function processDocument(
  docId: string,
  content: string,
  type: DocType,
): Promise<void> {
  const analysis = analyzeContent(content, type)
  await prisma.aiwDocument.update({
    where: { id: docId },
    data: {
      summary: analysis.summary,
      analysis: analysis as never,
      status: 'analyzed',
      approvedAt: new Date(),
    },
  })
}
