'use client'
import { useState, useEffect, useCallback } from 'react'
import { Radio, Plus, Trash2, RefreshCw, Play, Pause, SkipForward, AlertTriangle } from 'lucide-react'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/v1'

function useApi() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null
  const hj = { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }
  const hd = { Authorization: 'Bearer ' + token }
  const get = (url: string) => fetch(API + url, { headers: hd as HeadersInit }).then(r => r.json())
  const post = (url: string, body: unknown) => fetch(API + url, { method: 'POST', headers: hj as HeadersInit, body: JSON.stringify(body) }).then(r => r.json())
  const remove = (url: string) => fetch(API + url, { method: 'DELETE', headers: hd as HeadersInit }).then(r => r.json())
  const patch = (url: string, body: unknown) => fetch(API + url, { method: 'PATCH', headers: hj as HeadersInit, body: JSON.stringify(body) }).then(r => r.json())
  return { get, post, remove, patch }
}

const TABS = ['Streams', 'Messages', 'Consumer Groups', 'Dead Letters', 'Stats']

export default function EventBusPage() {
  const api = useApi()
  const [tab, setTab] = useState('Streams')
  const [streams, setStreams] = useState<any[]>([])
  const [selectedStream, setSelectedStream] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [consumerGroups, setConsumerGroups] = useState<any[]>([])
  const [deadLetters, setDeadLetters] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [streamStats, setStreamStats] = useState<any>(null)
  const [msg, setMsg] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [showPublish, setShowPublish] = useState(false)
  const [streamForm, setStreamForm] = useState({ name: '', description: '', partitions: 1 })
  const [publishForm, setPublishForm] = useState({ payload: '{"event":"test","data":{}}', partitionKey: '' })
  const [showGroup, setShowGroup] = useState(false)
  const [groupForm, setGroupForm] = useState({ name: '', maxRetries: 3 })

  const notify = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 3500) }

  const load = useCallback(async () => {
    if (tab === 'Streams') { const d = await api.get('/event-bus/streams'); setStreams(d.streams ?? []) }
    if (tab === 'Messages' && selectedStream) { const d = await api.get('/event-bus/streams/' + selectedStream.id + '/messages?limit=50'); setMessages(d.messages ?? []) }
    if (tab === 'Consumer Groups' && selectedStream) { const d = await api.get('/event-bus/streams/' + selectedStream.id + '/consumer-groups'); setConsumerGroups(d.groups ?? []) }
    if (tab === 'Dead Letters') { const url = selectedStream ? '/event-bus/dead-letters?streamId=' + selectedStream.id : '/event-bus/dead-letters'; const d = await api.get(url); setDeadLetters(d.deadLetters ?? []) }
    if (tab === 'Stats') { const d = await api.get('/event-bus/stats'); setStats(d) }
  }, [tab, selectedStream])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (selectedStream) { api.get('/event-bus/streams/' + selectedStream.id + '/stats').then((d: any) => setStreamStats(d)) }
  }, [selectedStream])

  async function createStream() {
    const res = await api.post('/event-bus/streams', streamForm)
    if (res.id) { notify('Stream created'); setShowCreate(false); load() }
    else notify(res.error ?? 'Error')
  }

  async function publishMessage() {
    if (!selectedStream) return notify('Select a stream first')
    let payload = {}
    try { payload = JSON.parse(publishForm.payload) } catch {}
    const res = await api.post('/event-bus/streams/' + selectedStream.id + '/publish', { payload, partitionKey: publishForm.partitionKey || undefined })
    if (res.id) { notify('Message published'); setShowPublish(false); load() }
    else notify(res.error ?? 'Error')
  }

  async function consumeMessages() {
    if (!selectedStream) return notify('Select a stream first')
    const res = await api.post('/event-bus/streams/' + selectedStream.id + '/consume', { limit: 5 })
    notify('Consumed ' + res.count + ' messages, next offset: ' + res.nextOffset)
    load()
  }

  async function toggleStream(stream: any) {
    const res = await api.post('/event-bus/streams/' + stream.id + '/toggle', {})
    notify('Stream ' + (res.isActive ? 'resumed' : 'paused'))
    load()
  }

  async function purgeStream(stream: any) {
    const res = await api.remove('/event-bus/streams/' + stream.id + '/messages')
    notify('Purged ' + res.purged + ' delivered messages')
    load()
  }

  async function createGroup() {
    if (!selectedStream) return notify('Select a stream first')
    const res = await api.post('/event-bus/streams/' + selectedStream.id + '/consumer-groups', groupForm)
    if (res.id) { notify('Consumer group created'); setShowGroup(false); load() }
    else notify(res.error ?? 'Error')
  }

  async function replayDl(dlId: string) {
    const res = await api.post('/event-bus/dead-letters/' + dlId + '/replay', {})
    notify(res.success ? 'Replayed message ' + res.messageId : 'Error')
    load()
  }

  const statusColor = (s: string) => ({ pending: 'bg-yellow-100 text-yellow-700', processing: 'bg-blue-100 text-blue-700', delivered: 'bg-green-100 text-green-700', failed: 'bg-red-100 text-red-700', dead: 'bg-gray-100 text-gray-700' }[s] ?? 'bg-gray-100')

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center">
            <Radio className="w-5 h-5 text-violet-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Event Bus</h1>
            <p className="text-sm text-gray-500">Real-time pub/sub, streams, consumer groups, and dead letter queue</p>
          </div>
        </div>
        <button type="button" onClick={load} className="flex items-center gap-2 px-3 py-2 text-sm bg-white border rounded-lg hover:bg-gray-50">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {msg && <div className="bg-violet-50 border border-violet-200 text-violet-800 rounded-lg px-4 py-3 text-sm">{msg}</div>}

      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
        {TABS.map(t => (
          <button type="button" key={t} onClick={() => setTab(t)}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg ${tab === t ? 'bg-white text-violet-700 shadow-sm' : 'text-gray-600'}`}>{t}</button>
        ))}
      </div>

      {selectedStream && (
        <div className="bg-violet-50 border border-violet-200 rounded-xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Radio className="w-4 h-4 text-violet-600" />
            <span className="text-sm font-medium">Active stream: <strong>{selectedStream.name}</strong></span>
            {streamStats && <span className="text-xs text-violet-500">{streamStats.pending} pending · {streamStats.delivered} delivered · {streamStats.dead} dead</span>}
          </div>
          <button type="button" onClick={() => setSelectedStream(null)} className="text-xs text-violet-500">Clear</button>
        </div>
      )}

      {tab === 'Streams' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Streams ({streams.length})</h2>
            <button type="button" onClick={() => setShowCreate(!showCreate)} className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg text-sm">
              <Plus className="w-4 h-4" /> New Stream
            </button>
          </div>
          {showCreate && (
            <div className="bg-white border rounded-xl p-5 space-y-3">
              <input placeholder="Stream name (e.g. orders, users)" value={streamForm.name} onChange={e => setStreamForm(f => ({...f, name: e.target.value}))} className="border rounded-lg px-3 py-2 text-sm w-full" />
              <input placeholder="Description" value={streamForm.description} onChange={e => setStreamForm(f => ({...f, description: e.target.value}))} className="border rounded-lg px-3 py-2 text-sm w-full" />
              <div className="flex gap-2">
                <button type="button" onClick={createStream} disabled={!streamForm.name} className="px-4 py-2 bg-violet-600 text-white rounded-lg text-sm disabled:opacity-50">Create</button>
                <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 bg-gray-100 rounded-lg text-sm">Cancel</button>
              </div>
            </div>
          )}
          <div className="grid gap-3">
            {streams.map((stream: any) => (
              <div key={stream.id} onClick={() => setSelectedStream(stream)}
                className={`bg-white border rounded-xl p-4 cursor-pointer ${selectedStream?.id === stream.id ? 'border-violet-400 bg-violet-50' : 'hover:border-violet-200'}`}>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{stream.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${stream.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100'}`}>{stream.isActive ? 'Active' : 'Paused'}</span>
                    </div>
                    {stream.description && <p className="text-xs text-gray-500">{stream.description}</p>}
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      <span>{stream._count?.messages ?? Number(stream.messageCount)} messages</span>
                      <span>{stream._count?.consumerGroups ?? 0} consumer groups</span>
                      <span>{stream.partitions} partition(s)</span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button type="button" onClick={e => { e.stopPropagation(); toggleStream(stream) }} className={`text-xs px-2 py-1 rounded-lg ${stream.isActive ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                      {stream.isActive ? <Pause className="w-3 h-3 inline" /> : <Play className="w-3 h-3 inline" />}
                    </button>
                    <button type="button" onClick={e => { e.stopPropagation(); purgeStream(stream) }} className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-lg">Purge</button>
                    <button type="button" onClick={e => { e.stopPropagation(); api.remove('/event-bus/streams/' + stream.id).then(() => { notify('Deleted'); load() }) }} className="text-red-400 px-1"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>
            ))}
            {streams.length === 0 && <div className="text-center py-12 text-gray-400">No streams yet</div>}
          </div>

          {selectedStream && (
            <div className="bg-white border rounded-xl p-5 space-y-4">
              <h3 className="font-semibold">Publish to {selectedStream.name}</h3>
              <textarea value={publishForm.payload} onChange={e => setPublishForm(f => ({...f, payload: e.target.value}))} placeholder="Payload JSON" className="border rounded-lg px-3 py-2 text-sm w-full h-20 font-mono" />
              <input placeholder="Partition key (optional)" value={publishForm.partitionKey} onChange={e => setPublishForm(f => ({...f, partitionKey: e.target.value}))} className="border rounded-lg px-3 py-2 text-sm w-full" />
              <div className="flex gap-2">
                <button type="button" onClick={publishMessage} className="px-4 py-2 bg-violet-600 text-white rounded-lg text-sm">Publish</button>
                <button type="button" onClick={consumeMessages} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm"><SkipForward className="w-4 h-4" /> Consume 5</button>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'Messages' && (
        <div className="space-y-4">
          {!selectedStream ? <div className="text-center py-12 text-gray-400">Select a stream in the Streams tab</div> : (
            <>
              <h2 className="text-lg font-semibold">Messages in {selectedStream.name} ({messages.length})</h2>
              <div className="grid gap-2">
                {messages.map((m: any) => (
                  <div key={m.id} className="bg-white border rounded-xl p-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-gray-400">offset:{Number(m.offset)}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(m.status)}`}>{m.status}</span>
                          {m.partitionKey && <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">key:{m.partitionKey}</span>}
                        </div>
                        <pre className="text-xs text-gray-600 bg-gray-50 rounded px-2 py-1 overflow-x-auto max-w-xl">{JSON.stringify(m.payload, null, 2)}</pre>
                        <p className="text-xs text-gray-400">{new Date(m.createdAt).toLocaleString()} · attempts: {m.attempts}</p>
                      </div>
                      {m.status !== 'dead' && (
                        <button type="button" onClick={() => api.post('/event-bus/messages/' + m.id + '/dead-letter', { reason: 'Manual DLQ' }).then(() => { notify('Moved to DLQ'); load() })} className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-lg ml-2"><AlertTriangle className="w-3 h-3 inline" /></button>
                      )}
                    </div>
                  </div>
                ))}
                {messages.length === 0 && <div className="text-center py-8 text-gray-400">No messages</div>}
              </div>
            </>
          )}
        </div>
      )}

      {tab === 'Consumer Groups' && (
        <div className="space-y-4">
          {!selectedStream ? <div className="text-center py-12 text-gray-400">Select a stream to manage consumer groups</div> : (
            <>
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold">Consumer Groups — {selectedStream.name}</h2>
                <button type="button" onClick={() => setShowGroup(!showGroup)} className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg text-sm"><Plus className="w-4 h-4" /> Add Group</button>
              </div>
              {showGroup && (
                <div className="bg-white border rounded-xl p-4 space-y-3">
                  <input placeholder="Group name (e.g. analytics-consumer)" value={groupForm.name} onChange={e => setGroupForm(f => ({...f, name: e.target.value}))} className="border rounded-lg px-3 py-2 text-sm w-full" />
                  <div className="flex gap-2">
                    <button type="button" onClick={createGroup} disabled={!groupForm.name} className="px-4 py-2 bg-violet-600 text-white rounded-lg text-sm disabled:opacity-50">Create</button>
                    <button type="button" onClick={() => setShowGroup(false)} className="px-4 py-2 bg-gray-100 rounded-lg text-sm">Cancel</button>
                  </div>
                </div>
              )}
              <div className="grid gap-3">
                {consumerGroups.map((group: any) => (
                  <div key={group.id} className="bg-white border rounded-xl p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{group.name}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${group.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100'}`}>{group.isActive ? 'Active' : 'Inactive'}</span>
                        </div>
                        <div className="text-xs text-gray-400">{group._count?.consumers ?? 0} consumers · max retries: {group.maxRetries}</div>
                        {group.offsets?.length > 0 && <div className="text-xs text-gray-400">offset: {Number(group.offsets[0].offset)} (partition {group.offsets[0].partition})</div>}
                      </div>
                      <div className="flex gap-1">
                        <button type="button" onClick={() => api.post('/event-bus/consumer-groups/' + group.id + '/seek', { seekTo: 'earliest' }).then(() => { notify('Seeked to earliest'); load() })} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-lg">⏮</button>
                        <button type="button" onClick={() => api.post('/event-bus/consumer-groups/' + group.id + '/seek', { seekTo: 'latest' }).then(() => { notify('Seeked to latest'); load() })} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-lg">⏭</button>
                        <button type="button" onClick={() => api.remove('/event-bus/consumer-groups/' + group.id).then(() => { notify('Deleted'); load() })} className="text-red-400 px-1"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                  </div>
                ))}
                {consumerGroups.length === 0 && <div className="text-center py-8 text-gray-400">No consumer groups</div>}
              </div>
            </>
          )}
        </div>
      )}

      {tab === 'Dead Letters' && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-red-500" /> Dead Letter Queue ({deadLetters.length})</h2>
          <div className="grid gap-2">
            {deadLetters.map((dl: any) => (
              <div key={dl.id} className="bg-white border border-red-100 rounded-xl p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-gray-900">{dl.reason}</p>
                    <div className="text-xs text-gray-400">{dl.attempts} attempts · {new Date(dl.createdAt).toLocaleString()}</div>
                    {dl.replayedAt && <div className="text-xs text-green-600">Replayed: {new Date(dl.replayedAt).toLocaleString()}</div>}
                  </div>
                  {!dl.replayedAt && (
                    <button type="button" onClick={() => replayDl(dl.id)} className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-lg"><Play className="w-3 h-3 inline mr-1" />Replay</button>
                  )}
                </div>
              </div>
            ))}
            {deadLetters.length === 0 && <div className="text-center py-12 text-gray-400">Dead letter queue is empty</div>}
          </div>
        </div>
      )}

      {tab === 'Stats' && stats && (
        <div className="space-y-6">
          <h2 className="text-lg font-semibold">Event Bus Statistics</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {([['Streams', stats.streams], ['Messages', stats.messages], ['Consumer Groups', stats.consumerGroups], ['Consumers', stats.consumers]] as [string, number][]).map(([l, v]) => (
              <div key={l} className="bg-white border rounded-xl p-5 text-center">
                <p className="text-2xl font-bold">{v}</p><p className="text-sm text-gray-500 mt-1">{l}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-4 gap-4">
            {([['Delivered', stats.delivered], ['Pending', stats.pending], ['Dead Letters', stats.deadLetters], ['Throughput %', stats.throughputRate + '%']] as [string, any][]).map(([l, v]) => (
              <div key={l} className="bg-white border rounded-xl p-4 text-center">
                <p className="text-xl font-bold">{v}</p><p className="text-xs text-gray-500 mt-1">{l}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      {tab === 'Stats' && !stats && <div className="text-center py-12 text-gray-400">Loading stats...</div>}
    </div>
  )
}
