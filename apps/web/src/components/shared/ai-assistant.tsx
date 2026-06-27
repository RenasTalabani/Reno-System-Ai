'use client'

import { useState, useRef, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Sparkles, X, Send, ChevronDown, Loader2, MessageCircle } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { useT } from '@/lib/i18n/use-translations'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface AiAssistantProps {
  initialQuery?: string
  onClear?: () => void
}

const CONTEXT_LABELS: Record<string, string> = {
  '/': 'Dashboard',
  '/hr': 'HR Module',
  '/projects': 'Projects',
  '/crm': 'CRM',
  '/sales': 'Sales',
  '/finance': 'Finance',
  '/inventory': 'Inventory',
  '/analytics': 'Analytics',
  '/helpdesk': 'Helpdesk',
  '/documents': 'Documents',
  '/brain': 'AI Brain',
}

function getPageContext(pathname: string): string {
  for (const [prefix, label] of Object.entries(CONTEXT_LABELS)) {
    if (pathname.startsWith(prefix) && (prefix === '/' || pathname === prefix || pathname.startsWith(prefix + '/'))) {
      return label
    }
  }
  return 'Reno System'
}

export function AiAssistant({ initialQuery, onClear }: AiAssistantProps) {
  const [isOpen, setIsOpen] = useState(Boolean(initialQuery))
  const [isMinimized, setIsMinimized] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState(initialQuery ?? '')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const pathname = usePathname()
  const { t } = useT()
  const pageContext = getPageContext(pathname)

  useEffect(() => {
    if (initialQuery) {
      setIsOpen(true)
      setInput(initialQuery)
    }
  }, [initialQuery])

  useEffect(() => {
    if (isOpen && !isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isOpen, isMinimized])

  useEffect(() => {
    if (isOpen && !isMinimized) {
      inputRef.current?.focus()
    }
  }, [isOpen, isMinimized])

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setIsLoading(true)

    try {
      const API_BASE = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000'
      const res = await fetch(`${API_BASE}/v1/brain/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: userMsg.content,
          context: { page: pageContext, pathname },
        }),
      })

      if (res.ok) {
        const data = await res.json() as { answer?: string; response?: string; message?: string }
        const answer = data.answer ?? data.response ?? data.message ?? 'I could not generate a response.'
        setMessages((prev) => [...prev, {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: String(answer),
          timestamp: new Date(),
        }])
      } else {
        setMessages((prev) => [...prev, {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: 'Sorry, I could not connect to Reno Brain right now. Please try again.',
          timestamp: new Date(),
        }])
      }
    } catch {
      setMessages((prev) => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Connection error. Check that the API is running.',
        timestamp: new Date(),
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setIsOpen(false)
    setMessages([])
    setInput('')
    onClear?.()
  }

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-purple-600 to-blue-600 text-white shadow-lg hover:shadow-purple-500/25 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
          aria-label="Open AI Assistant"
        >
          <Sparkles className="h-6 w-6" aria-hidden="true" />
        </motion.button>
      )}

      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="fixed bottom-6 right-6 z-50 flex flex-col rounded-2xl border border-border bg-background/95 backdrop-blur-md shadow-2xl"
            style={{ width: 380, height: isMinimized ? 'auto' : 520 }}
            role="dialog"
            aria-label="Reno Brain AI Assistant"
            aria-modal="false"
          >
            {/* Header */}
            <div className="flex items-center justify-between rounded-t-2xl border-b border-border bg-gradient-to-r from-purple-600/10 to-blue-600/10 px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-purple-600 to-blue-600">
                  <Sparkles className="h-3.5 w-3.5 text-white" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Reno Brain</p>
                  <p className="text-xs text-muted-foreground">Context: {pageContext}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                  aria-label={isMinimized ? 'Expand assistant' : 'Minimize assistant'}
                >
                  <ChevronDown className={`h-4 w-4 transition-transform ${isMinimized ? 'rotate-180' : ''}`} aria-hidden="true" />
                </button>
                <button
                  onClick={handleClose}
                  className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                  aria-label="Close AI assistant"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>

            {/* Messages */}
            {!isMinimized && (
              <>
                <div className="flex-1 overflow-y-auto p-4 space-y-3" role="log" aria-live="polite" aria-label="Conversation">
                  {messages.length === 0 && (
                    <div className="flex h-full items-center justify-center">
                      <div className="text-center">
                        <MessageCircle className="mx-auto h-10 w-10 text-muted-foreground/30 mb-3" aria-hidden="true" />
                        <p className="text-sm text-muted-foreground">
                          Ask me anything about {pageContext}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          I have context about your current page
                        </p>
                      </div>
                    </div>
                  )}
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm ${
                          msg.role === 'user'
                            ? 'bg-primary text-primary-foreground rounded-br-sm'
                            : 'bg-muted text-foreground rounded-bl-sm'
                        }`}
                        aria-label={msg.role === 'user' ? 'You said' : 'AI responded'}
                      >
                        {msg.content}
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="flex items-center gap-2 rounded-2xl rounded-bl-sm bg-muted px-3.5 py-2.5">
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" aria-hidden="true" />
                        <span className="text-xs text-muted-foreground" aria-live="polite">Thinking...</span>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="border-t border-border p-3">
                  <div className="flex gap-2">
                    <input
                      ref={inputRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void sendMessage() } }}
                      placeholder={String(t('cmd.askBrain'))}
                      className="flex-1 rounded-xl border border-border bg-muted/50 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                      aria-label="Message to Reno Brain"
                    />
                    <button
                      onClick={sendMessage}
                      disabled={!input.trim() || isLoading}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 transition-colors"
                      aria-label="Send message"
                    >
                      <Send className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
