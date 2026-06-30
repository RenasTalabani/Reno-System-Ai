'use client'

import { useState, useEffect } from 'react'

interface Proposal {
  id: string; tool: string; title: string; status: string
  aiExplanation?: string; result?: Record<string, unknown>; createdAt: string
}
interface Summary { pending: number; executed: number; rejected: number; total: number }

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

async function apiFetch(path: string, opts?: RequestInit) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  const res = await fetch(`${API}/v1${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...opts?.headers },
  })
  return res.json()
}

type ActiveTool =
  | 'overview' | 'file' | 'git' | 'code' | 'documents'
  | 'sql' | 'terminal' | 'logs' | 'deploy' | 'docker' | 'k8s'

const TOOLS: { id: ActiveTool; label: string; icon: string; category: string }[] = [
  { id: 'overview', label: 'Overview', icon: '🏠', category: 'main' },
  { id: 'file', label: 'File Explorer', icon: '📁', category: 'Files' },
  { id: 'git', label: 'Git Tools', icon: '🌿', category: 'Git' },
  { id: 'code', label: 'Code Assistant', icon: '💻', category: 'Code' },
  { id: 'documents', label: 'Documents', icon: '📄', category: 'Docs' },
  { id: 'sql', label: 'SQL Assistant', icon: '🗃️', category: 'Data' },
  { id: 'terminal', label: 'Terminal', icon: '⌨️', category: 'System' },
  { id: 'logs', label: 'Live Logs', icon: '📋', category: 'Ops' },
  { id: 'deploy', label: 'Deploy', icon: '🚀', category: 'Ops' },
  { id: 'docker', label: 'Docker', icon: '🐳', category: 'Ops' },
  { id: 'k8s', label: 'Kubernetes', icon: '☸️', category: 'Ops' },
]

const statusColor: Record<string, string> = {
  pending_approval: 'bg-yellow-100 text-yellow-800',
  running: 'bg-blue-100 text-blue-800',
  executed: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  rejected: 'bg-gray-100 text-gray-800',
}

export default function LiveToolsPage() {
  const [active, setActive] = useState<ActiveTool>('overview')
  const [summary, setSummary] = useState<Summary>({ pending: 0, executed: 0, rejected: 0, total: 0 })
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  // Tool-specific inputs
  const [filePath, setFilePath] = useState('')
  const [gitFile, setGitFile] = useState('')
  const [codeSnippet, setCodeSnippet] = useState('')
  const [codeLang, setCodeLang] = useState('typescript')
  const [docFile, setDocFile] = useState('')
  const [docType, setDocType] = useState<'excel' | 'word' | 'pdf' | 'ocr'>('pdf')
  const [sqlQuery, setSqlQuery] = useState('')
  const [termCmd, setTermCmd] = useState('')
  const [termReason, setTermReason] = useState('')
  const [deploySvc, setDeploySvc] = useState('')
  const [deployEnv, setDeployEnv] = useState('staging')
  const [dockerCmd, setDockerCmd] = useState('docker ps')
  const [k8sCmd, setK8sCmd] = useState('kubectl get pods')
  const [prTitle, setPrTitle] = useState('')

  useEffect(() => { loadSummary(); loadProposals() }, [])

  async function loadSummary() {
    const r = await apiFetch('/live-tools/summary').catch(() => null)
    if (r?.success) setSummary(r.data)
  }

  async function loadProposals() {
    const r = await apiFetch('/live-tools/proposals').catch(() => null)
    if (r?.success) setProposals(r.data)
  }

  async function propose(path: string, body: Record<string, unknown>) {
    setLoading(true); setMsg('')
    try {
      const r = await apiFetch(path, { method: 'POST', body: JSON.stringify(body) })
      if (r.success) {
        setMsg(`✅ Proposal created — review and approve in the Proposals panel`)
        loadProposals(); loadSummary()
      } else setMsg(`❌ ${r.error ?? 'Failed'}`)
    } finally { setLoading(false) }
  }

  async function approveProposal(id: string) {
    setLoading(true)
    const r = await apiFetch(`/live-tools/proposals/${id}/approve`, { method: 'POST', body: '{}' })
    if (r.success) {
      setMsg('✅ Executed successfully')
      setSelectedProposal(null)
      loadProposals(); loadSummary()
    } else setMsg(`❌ ${r.error ?? 'Failed'}`)
    setLoading(false)
  }

  async function rejectProposal(id: string) {
    setLoading(true)
    await apiFetch(`/live-tools/proposals/${id}/reject`, { method: 'POST', body: JSON.stringify({ reason: 'User rejected' }) })
    setSelectedProposal(null)
    loadProposals(); loadSummary()
    setLoading(false)
  }

  const pendingProposals = proposals.filter(p => p.status === 'pending_approval')

  return (
    <div className="flex h-full min-h-screen">
      {/* Sidebar */}
      <div className="w-52 bg-gray-900 text-white flex flex-col shrink-0">
        <div className="px-4 py-5 border-b border-gray-700">
          <div className="text-sm font-bold text-white">AI Live Tools</div>
          <div className="text-xs text-gray-400 mt-0.5">Powered by Reno Brain</div>
        </div>
        {pendingProposals.length > 0 && (
          <div className="mx-3 mt-3 px-3 py-2 bg-yellow-900 rounded-lg">
            <div className="text-xs text-yellow-300 font-medium">{pendingProposals.length} pending approval</div>
          </div>
        )}
        <nav className="flex-1 overflow-y-auto py-2">
          {TOOLS.map(t => (
            <button key={t.id} onClick={() => setActive(t.id)}
              className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2.5 transition-colors ${active === t.id ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-800'}`}>
              <span className="text-base">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </nav>
        <div className="px-4 py-3 border-t border-gray-700 text-xs text-gray-500">
          ❌ No auto-execution<br />✅ Approve every action
        </div>
      </div>

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">{TOOLS.find(t => t.id === active)?.label ?? 'AI Live Tools'}</h1>
            <p className="text-xs text-gray-500 mt-0.5">All actions require your approval before execution • Audit logged</p>
          </div>
          {msg && (
            <div className={`text-sm px-3 py-1.5 rounded-lg ${msg.startsWith('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {msg}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
          {/* Overview */}
          {active === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-4 gap-4">
                {[
                  { label: 'Pending Approval', value: summary.pending, color: 'text-yellow-600' },
                  { label: 'Executed', value: summary.executed, color: 'text-green-600' },
                  { label: 'Rejected', value: summary.rejected, color: 'text-gray-500' },
                  { label: 'Total Proposals', value: summary.total, color: 'text-indigo-600' },
                ].map(s => (
                  <div key={s.label} className="bg-white rounded-xl border p-5 text-center">
                    <div className={`text-3xl font-bold ${s.color}`}>{s.value}</div>
                    <div className="text-xs text-gray-500 mt-1">{s.label}</div>
                  </div>
                ))}
              </div>

              {pendingProposals.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-yellow-800 mb-3">Pending Approvals ({pendingProposals.length})</h3>
                  <div className="space-y-2">
                    {pendingProposals.map(p => (
                      <div key={p.id} className="bg-white rounded-lg border p-3 flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium text-gray-800">{p.title}</div>
                          <div className="text-xs text-gray-500">{p.tool} · {new Date(p.createdAt).toLocaleString()}</div>
                          {p.aiExplanation && <div className="text-xs text-indigo-600 mt-1">{p.aiExplanation.substring(0, 120)}</div>}
                        </div>
                        <div className="flex gap-2 shrink-0 ml-4">
                          <button onClick={() => approveProposal(p.id)} disabled={loading}
                            className="px-3 py-1 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 disabled:opacity-50">
                            Approve
                          </button>
                          <button onClick={() => rejectProposal(p.id)} disabled={loading}
                            className="px-3 py-1 bg-red-100 text-red-700 text-xs rounded-lg hover:bg-red-200">
                            Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-white border rounded-xl">
                <div className="px-5 py-3 border-b text-sm font-medium text-gray-700">Recent Activity</div>
                {proposals.slice(0, 10).map(p => (
                  <div key={p.id} className="px-5 py-3 border-b last:border-b-0 flex items-center justify-between">
                    <div>
                      <div className="text-sm text-gray-800">{p.title}</div>
                      <div className="text-xs text-gray-400">{p.tool} · {new Date(p.createdAt).toLocaleString()}</div>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[p.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {p.status.replace('_', ' ')}
                    </span>
                  </div>
                ))}
                {proposals.length === 0 && <div className="text-center text-gray-400 py-8 text-sm">No proposals yet — use a tool to get started</div>}
              </div>
            </div>
          )}

          {/* File Explorer */}
          {active === 'file' && (
            <ToolPanel title="File Explorer & Reader" warning="Files are read-only. Reno Brain never modifies files.">
              <div className="space-y-3">
                <input value={filePath} onChange={e => setFilePath(e.target.value)}
                  placeholder="Directory or file path (e.g. /src or /src/auth.ts)"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                <div className="flex gap-2">
                  <ProposeButton onClick={() => propose('/live-tools/file/explore', { path: filePath })} label="Explore Directory" loading={loading} />
                  <ProposeButton onClick={() => propose('/live-tools/file/read', { path: filePath })} label="Read File" loading={loading} variant="secondary" />
                  <ProposeButton onClick={() => propose('/live-tools/file/permissions', { path: filePath })} label="Check Permissions" loading={loading} variant="secondary" />
                </div>
              </div>
            </ToolPanel>
          )}

          {/* Git Tools */}
          {active === 'git' && (
            <div className="space-y-4">
              <ToolPanel title="Git Status & Diff">
                <div className="space-y-3">
                  <input value={gitFile} onChange={e => setGitFile(e.target.value)}
                    placeholder="File path for diff (leave empty for all files)"
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                  <div className="flex gap-2 flex-wrap">
                    <ProposeButton onClick={() => propose('/live-tools/git/status', {})} label="Git Status" loading={loading} />
                    <ProposeButton onClick={() => propose('/live-tools/git/diff', { file: gitFile || undefined })} label="Git Diff" loading={loading} variant="secondary" />
                    <ProposeButton onClick={() => propose('/live-tools/git/branches', {})} label="View Branches" loading={loading} variant="secondary" />
                  </div>
                </div>
              </ToolPanel>
              <ToolPanel title="Pull Request Draft" warning="PR draft is a suggestion only — not submitted to GitHub automatically.">
                <div className="space-y-3">
                  <input value={prTitle} onChange={e => setPrTitle(e.target.value)}
                    placeholder="PR title (e.g. feat: Add Phase 39 Live Tools)"
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                  <ProposeButton onClick={() => propose('/live-tools/git/pr-draft', { title: prTitle, baseBranch: 'main' })} label="Generate PR Draft" loading={loading} />
                </div>
              </ToolPanel>
            </div>
          )}

          {/* Code Tools */}
          {active === 'code' && (
            <ToolPanel title="Code Assistant" warning="Reno Brain NEVER auto-commits. Suggestions require manual review and application.">
              <div className="space-y-3">
                <div className="flex gap-2">
                  <select value={codeLang} onChange={e => setCodeLang(e.target.value)}
                    className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                    {['typescript', 'javascript', 'python', 'go', 'rust', 'sql', 'bash', 'other'].map(l => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                </div>
                <textarea value={codeSnippet} onChange={e => setCodeSnippet(e.target.value)} rows={8}
                  placeholder="Paste your code here for explanation or refactor suggestion..."
                  className="w-full border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none" />
                <div className="flex gap-2">
                  <ProposeButton onClick={() => propose('/live-tools/code/explain', { code: codeSnippet, language: codeLang })} label="Explain Code" loading={loading} />
                  <ProposeButton onClick={() => propose('/live-tools/code/refactor', { code: codeSnippet, language: codeLang })} label="Refactor Proposal" loading={loading} variant="secondary" />
                </div>
              </div>
            </ToolPanel>
          )}

          {/* Document Tools */}
          {active === 'documents' && (
            <ToolPanel title="Document Reader" warning="All documents are read-only. OCR and extraction only.">
              <div className="space-y-3">
                <div className="flex gap-2">
                  {(['pdf', 'word', 'excel', 'ocr'] as const).map(t => (
                    <button key={t} onClick={() => setDocType(t)}
                      className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${docType === t ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                      {t.toUpperCase()}
                    </button>
                  ))}
                </div>
                <input value={docFile} onChange={e => setDocFile(e.target.value)}
                  placeholder="File name (e.g. report.pdf)"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                <ProposeButton onClick={() => propose(`/live-tools/documents/${docType}`, { fileName: docFile })} label={`Read ${docType.toUpperCase()}`} loading={loading} />
              </div>
            </ToolPanel>
          )}

          {/* SQL */}
          {active === 'sql' && (
            <ToolPanel title="SQL Query Assistant" warning="Queries are PROPOSED only. Destructive queries (DELETE/DROP) require extra review.">
              <div className="space-y-3">
                <textarea value={sqlQuery} onChange={e => setSqlQuery(e.target.value)} rows={6}
                  placeholder="SELECT * FROM aiw_sessions WHERE tenant_id = '...' LIMIT 10"
                  className="w-full border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none" />
                <ProposeButton onClick={() => propose('/live-tools/sql/propose', { query: sqlQuery })} label="Propose SQL Query" loading={loading} />
              </div>
            </ToolPanel>
          )}

          {/* Terminal */}
          {active === 'terminal' && (
            <ToolPanel title="Terminal Command Proposal" warning="Commands are NEVER auto-executed. All require explicit approval.">
              <div className="space-y-3">
                <input value={termCmd} onChange={e => setTermCmd(e.target.value)}
                  placeholder="Command (e.g. ls -la, git log --oneline)"
                  className="w-full border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                <input value={termReason} onChange={e => setTermReason(e.target.value)}
                  placeholder="Why do you need this command? (required for audit)"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                <ProposeButton onClick={() => propose('/live-tools/terminal/propose', { command: termCmd, reason: termReason })} label="Propose Command" loading={loading} />
              </div>
            </ToolPanel>
          )}

          {/* Logs */}
          {active === 'logs' && (
            <ToolPanel title="Live Logs Viewer">
              <ProposeButton onClick={() => propose('/live-tools/logs/view', { source: 'app', lines: 100 })} label="View Application Logs" loading={loading} />
            </ToolPanel>
          )}

          {/* Deploy */}
          {active === 'deploy' && (
            <ToolPanel title="Deployment Assistant" warning="No deployment is triggered without explicit approval. Review all steps before approving.">
              <div className="space-y-3">
                <input value={deploySvc} onChange={e => setDeploySvc(e.target.value)}
                  placeholder="Service name (e.g. reno-api)"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                <select value={deployEnv} onChange={e => setDeployEnv(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                  {['staging', 'production', 'dev'].map(e => <option key={e} value={e}>{e}</option>)}
                </select>
                <ProposeButton onClick={() => propose('/live-tools/deploy/propose', { service: deploySvc, environment: deployEnv })} label="Create Deployment Plan" loading={loading} />
              </div>
            </ToolPanel>
          )}

          {/* Docker */}
          {active === 'docker' && (
            <ToolPanel title="Docker Assistant">
              <div className="space-y-3">
                <input value={dockerCmd} onChange={e => setDockerCmd(e.target.value)}
                  placeholder="Docker command (e.g. docker ps, docker logs reno-api)"
                  className="w-full border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                <ProposeButton onClick={() => propose('/live-tools/docker/assist', { command: dockerCmd })} label="Propose Docker Command" loading={loading} />
              </div>
            </ToolPanel>
          )}

          {/* Kubernetes */}
          {active === 'k8s' && (
            <ToolPanel title="Kubernetes Assistant" warning="kubectl commands require approval. They affect the live cluster.">
              <div className="space-y-3">
                <input value={k8sCmd} onChange={e => setK8sCmd(e.target.value)}
                  placeholder="kubectl command (e.g. kubectl get pods, kubectl describe pod reno-api)"
                  className="w-full border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                <ProposeButton onClick={() => propose('/live-tools/k8s/assist', { command: k8sCmd })} label="Propose kubectl Command" loading={loading} />
              </div>
            </ToolPanel>
          )}
        </div>
      </div>
    </div>
  )
}

function ToolPanel({ title, children, warning }: { title: string; children: React.ReactNode; warning?: string }) {
  return (
    <div className="bg-white border rounded-xl p-5 space-y-4">
      <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
      {warning && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <span className="text-amber-500 shrink-0">⚠️</span>
          <span className="text-xs text-amber-700">{warning}</span>
        </div>
      )}
      {children}
    </div>
  )
}

function ProposeButton({ onClick, label, loading, variant = 'primary' }: {
  onClick: () => void; label: string; loading: boolean; variant?: 'primary' | 'secondary'
}) {
  return (
    <button onClick={onClick} disabled={loading}
      className={`px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors ${
        variant === 'primary'
          ? 'bg-indigo-600 text-white hover:bg-indigo-700'
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      }`}>
      {loading ? 'Processing...' : `Propose: ${label}`}
    </button>
  )
}
