'use client'

import { useState, useEffect } from 'react'
import {
  FileText, FolderOpen, Upload, Search, MoreVertical, Download,
  Plus, ChevronRight, Grid3X3, List, Clock, HardDrive, Eye,
  FileImage, FileVideo, FileArchive, FileCode, Folder, ArrowUpCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface DocFile {
  id: string
  name: string
  mimeType: string
  sizeBytes: number
  storageKey: string
  updatedAt: string
  downloadCount: number
  viewCount: number
  approvalStatus?: string
  folder?: { name: string }
}

interface DocFolder {
  id: string
  name: string
  description?: string
  color?: string
  path?: string
  _count?: { files: number; children: number }
}

interface DashboardData {
  documents: {
    totalFiles: number
    totalFolders: number
    totalSizeBytes: number
    mimeBreakdown: { mimeType: string; count: number }[]
  }
  knowledge: { totalArticles: number; publishedArticles: number }
  recentFiles: DocFile[]
  recentActivity: { id: string; action: string; entityName: string; entityType: string; occurredAt: string }[]
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

function getMimeIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return FileImage
  if (mimeType.startsWith('video/')) return FileVideo
  if (mimeType.includes('zip') || mimeType.includes('compressed')) return FileArchive
  if (mimeType.includes('javascript') || mimeType.includes('json') || mimeType.includes('html') || mimeType.includes('css')) return FileCode
  return FileText
}

function getMimeColor(mimeType: string): string {
  if (mimeType.startsWith('image/')) return 'text-green-500'
  if (mimeType.startsWith('video/')) return 'text-purple-500'
  if (mimeType.includes('pdf')) return 'text-red-500'
  if (mimeType.includes('word') || mimeType.includes('document')) return 'text-blue-500'
  if (mimeType.includes('sheet') || mimeType.includes('excel')) return 'text-emerald-500'
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'text-orange-500'
  return 'text-gray-500'
}

const FOLDER_COLORS = ['bg-indigo-100 text-indigo-600', 'bg-amber-100 text-amber-600', 'bg-green-100 text-green-600', 'bg-pink-100 text-pink-600']

export default function DocumentsPage() {
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [search, setSearch] = useState('')
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [folders, setFolders] = useState<DocFolder[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    const headers = { Authorization: `Bearer ${token}` }

    Promise.all([
      fetch('/api/v1/docs/dashboard', { headers }).then(r => r.json()),
      fetch('/api/v1/docs/folders', { headers }).then(r => r.json()),
    ]).then(([dash, foldersRes]) => {
      if (dash.success) setDashboard(dash.data)
      if (foldersRes.success) setFolders(foldersRes.data)
    }).finally(() => setLoading(false))
  }, [])

  const createFolder = async () => {
    if (!newFolderName.trim()) return
    const token = localStorage.getItem('accessToken')
    const res = await fetch('/api/v1/docs/folders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: newFolderName.trim() }),
    })
    const data = await res.json()
    if (data.success) {
      setFolders(prev => [...prev, data.data])
      setNewFolderName('')
      setShowNewFolder(false)
    }
  }

  const stats = [
    { label: 'Total Files', value: dashboard?.documents.totalFiles ?? 0, icon: FileText, color: 'bg-blue-50 text-blue-600' },
    { label: 'Folders', value: dashboard?.documents.totalFolders ?? 0, icon: FolderOpen, color: 'bg-amber-50 text-amber-600' },
    { label: 'Storage Used', value: formatBytes(dashboard?.documents.totalSizeBytes ?? 0), icon: HardDrive, color: 'bg-green-50 text-green-600' },
    { label: 'KB Articles', value: dashboard?.knowledge.totalArticles ?? 0, icon: FileText, color: 'bg-purple-50 text-purple-600' },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Document Center</h1>
          <p className="text-sm text-gray-500 mt-1">Manage files, folders, and company documents</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowNewFolder(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-sm hover:bg-gray-50 transition-colors"
          >
            <Folder className="w-4 h-4" />
            New Folder
          </button>
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm hover:bg-indigo-700 transition-colors">
            <Upload className="w-4 h-4" />
            Upload File
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {stats.map((s) => {
          const Icon = s.icon
          return (
            <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-3">
              <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', s.color)}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900">{s.value}</p>
                <p className="text-xs text-gray-500">{s.label}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Search + View Toggle */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search files and folders..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="flex items-center bg-gray-100 rounded-lg p-1">
          <button onClick={() => setView('grid')} className={cn('p-1.5 rounded', view === 'grid' ? 'bg-white shadow-sm' : 'text-gray-500')}>
            <Grid3X3 className="w-4 h-4" />
          </button>
          <button onClick={() => setView('list')} className={cn('p-1.5 rounded', view === 'list' ? 'bg-white shadow-sm' : 'text-gray-500')}>
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* New Folder Input */}
      {showNewFolder && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
          <Folder className="w-5 h-5 text-amber-600 shrink-0" />
          <input
            autoFocus
            type="text"
            placeholder="Folder name..."
            value={newFolderName}
            onChange={e => setNewFolderName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') createFolder(); if (e.key === 'Escape') setShowNewFolder(false) }}
            className="flex-1 bg-transparent text-sm focus:outline-none"
          />
          <div className="flex items-center gap-2">
            <button onClick={createFolder} className="px-3 py-1 bg-amber-600 text-white text-xs rounded-lg">Create</button>
            <button onClick={() => setShowNewFolder(false)} className="px-3 py-1 bg-gray-200 text-gray-700 text-xs rounded-lg">Cancel</button>
          </div>
        </div>
      )}

      {/* Folders */}
      {folders.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <FolderOpen className="w-4 h-4" /> Folders
          </h2>
          <div className={cn(view === 'grid' ? 'grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3' : 'space-y-2')}>
            {folders.map((folder, i) => (
              <div
                key={folder.id}
                className={cn(
                  'group cursor-pointer border border-gray-100 rounded-xl p-3 hover:shadow-md transition-all',
                  view === 'grid' ? 'flex flex-col items-center gap-2 text-center' : 'flex items-center gap-3 bg-white',
                )}
              >
                <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', FOLDER_COLORS[i % FOLDER_COLORS.length])}>
                  <Folder className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{folder.name}</p>
                  {folder._count && (
                    <p className="text-xs text-gray-400">{folder._count.files} files</p>
                  )}
                </div>
                {view === 'list' && <ChevronRight className="w-4 h-4 text-gray-400" />}
              </div>
            ))}
            <button
              onClick={() => setShowNewFolder(true)}
              className={cn(
                'border-2 border-dashed border-gray-200 rounded-xl p-3 hover:border-indigo-300 hover:bg-indigo-50 transition-colors text-gray-400 hover:text-indigo-500',
                view === 'grid' ? 'flex flex-col items-center gap-2 text-center' : 'flex items-center gap-3',
              )}
            >
              <Plus className="w-5 h-5" />
              <span className="text-xs">New folder</span>
            </button>
          </div>
        </section>
      )}

      {/* Recent Files */}
      <section>
        <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4" /> Recent Files
        </h2>
        {!dashboard?.recentFiles.length ? (
          <div className="bg-white border border-gray-100 rounded-xl p-16 text-center">
            <ArrowUpCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No files yet</p>
            <p className="text-sm text-gray-400 mt-1">Upload your first document to get started</p>
            <button className="mt-4 px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors">
              Upload File
            </button>
          </div>
        ) : (
          <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Size</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Folder</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Views</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Modified</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {dashboard.recentFiles.map((file) => {
                  const Icon = getMimeIcon(file.mimeType)
                  const color = getMimeColor(file.mimeType)
                  return (
                    <tr key={file.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Icon className={cn('w-4 h-4 shrink-0', color)} />
                          <span className="font-medium text-gray-800 truncate max-w-xs">{file.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{file.mimeType.split('/')[1] ?? file.mimeType}</td>
                      <td className="px-4 py-3 text-gray-500">{formatBytes(file.sizeBytes)}</td>
                      <td className="px-4 py-3 text-gray-500">{file.folder?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-500">
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          {file.viewCount}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{new Date(file.updatedAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button className="p-1 hover:bg-gray-100 rounded">
                            <Download className="w-4 h-4 text-gray-500" />
                          </button>
                          <button className="p-1 hover:bg-gray-100 rounded">
                            <MoreVertical className="w-4 h-4 text-gray-500" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Recent Activity */}
      {dashboard?.recentActivity && dashboard.recentActivity.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Recent Activity</h2>
          <div className="bg-white border border-gray-100 rounded-xl overflow-hidden divide-y divide-gray-50">
            {dashboard.recentActivity.slice(0, 5).map((log) => (
              <div key={log.id} className="px-4 py-3 flex items-center gap-3 text-sm">
                <span className="w-16 text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{log.action}</span>
                <span className="text-gray-700">{log.entityName}</span>
                <span className="ml-auto text-xs text-gray-400">{new Date(log.occurredAt).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
