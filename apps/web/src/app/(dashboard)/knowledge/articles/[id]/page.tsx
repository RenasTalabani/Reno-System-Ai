'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, Eye, ThumbsUp, Clock, Tag, Edit3,
  BookOpen, ChevronRight, History, Share2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Article {
  id: string
  title: string
  slug: string
  content: string
  excerpt?: string
  status: string
  tags: string[]
  isPublic: boolean
  isPinned: boolean
  viewCount: number
  helpfulCount: number
  currentVersion: number
  publishedAt?: string
  updatedAt: string
  createdAt: string
  category?: { id: string; name: string; slug: string; color?: string }
  _count: { versions: number }
}

export default function ArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [article, setArticle] = useState<Article | null>(null)
  const [loading, setLoading] = useState(true)
  const [helpful, setHelpful] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    fetch(`/api/v1/kb/articles/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => {
        if (data.success) setArticle(data.data)
        else setError(data.error ?? 'Article not found')
      })
      .catch(() => setError('Failed to load article'))
      .finally(() => setLoading(false))
  }, [id])

  const markHelpful = async () => {
    if (helpful) return
    const token = localStorage.getItem('accessToken')
    await fetch(`/api/v1/kb/articles/${id}/helpful`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
    setHelpful(true)
    if (article) setArticle({ ...article, helpfulCount: article.helpfulCount + 1 })
  }

  const publishArticle = async () => {
    const token = localStorage.getItem('accessToken')
    const res = await fetch(`/api/v1/kb/articles/${id}/publish`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await res.json()
    if (data.success && article) setArticle({ ...article, status: 'published', publishedAt: new Date().toISOString() })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !article) {
    return (
      <div className="text-center py-16">
        <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">{error ?? 'Article not found'}</p>
        <Link href="/knowledge" className="mt-3 inline-block text-indigo-600 hover:text-indigo-700 text-sm">
          Back to Knowledge Base
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/knowledge" className="hover:text-indigo-600 flex items-center gap-1">
          <BookOpen className="w-4 h-4" /> Knowledge Base
        </Link>
        {article.category && (
          <>
            <ChevronRight className="w-4 h-4" />
            <span>{article.category.name}</span>
          </>
        )}
        <ChevronRight className="w-4 h-4" />
        <span className="text-gray-800 font-medium truncate">{article.title}</span>
      </nav>

      {/* Header card */}
      <div className="bg-white border border-gray-100 rounded-2xl p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              {article.category && (
                <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                  {article.category.name}
                </span>
              )}
              <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', {
                'bg-green-100 text-green-700': article.status === 'published',
                'bg-yellow-100 text-yellow-700': article.status === 'draft',
                'bg-gray-100 text-gray-500': article.status === 'archived',
              })}>
                {article.status}
              </span>
              {article.isPinned && (
                <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded">Pinned</span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{article.title}</h1>
            {article.excerpt && <p className="text-gray-600">{article.excerpt}</p>}
            <div className="flex items-center gap-4 mt-3 text-xs text-gray-400 flex-wrap">
              <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {article.viewCount} views</span>
              <span className="flex items-center gap-1"><ThumbsUp className="w-3 h-3" /> {article.helpfulCount} found helpful</span>
              <span className="flex items-center gap-1"><History className="w-3 h-3" /> v{article.currentVersion} ({article._count.versions} versions)</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Updated {new Date(article.updatedAt).toLocaleDateString()}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {article.status === 'draft' && (
              <button
                onClick={publishArticle}
                className="px-3 py-1.5 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 transition-colors"
              >
                Publish
              </button>
            )}
            <Link
              href={`/knowledge/articles/${id}/edit`}
              className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 text-gray-700 text-xs rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Edit3 className="w-3 h-3" /> Edit
            </Link>
            <button className="p-1.5 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors">
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {article.tags.length > 0 && (
          <div className="flex items-center gap-1 mt-4 pt-4 border-t border-gray-50 flex-wrap">
            <Tag className="w-3 h-3 text-gray-400" />
            {article.tags.map(tag => (
              <span key={tag} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">#{tag}</span>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="bg-white border border-gray-100 rounded-2xl p-8">
        <div className="prose prose-sm max-w-none">
          {/* Render content as preformatted for now — integrate rich editor in Phase 13+ */}
          <pre className="whitespace-pre-wrap font-sans text-gray-800 leading-relaxed text-sm">
            {article.content}
          </pre>
        </div>
      </div>

      {/* Helpful + Back */}
      <div className="flex items-center justify-between bg-white border border-gray-100 rounded-xl p-4">
        <Link href="/knowledge" className="flex items-center gap-2 text-sm text-gray-500 hover:text-indigo-600">
          <ArrowLeft className="w-4 h-4" /> Back to Knowledge Base
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">Was this article helpful?</span>
          <button
            onClick={markHelpful}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors',
              helpful
                ? 'bg-green-100 text-green-700 cursor-default'
                : 'border border-gray-200 hover:bg-green-50 hover:text-green-600 hover:border-green-200',
            )}
          >
            <ThumbsUp className="w-4 h-4" />
            {helpful ? 'Thanks!' : 'Yes, helpful!'}
          </button>
        </div>
      </div>
    </div>
  )
}
