'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { MessageParam } from '@anthropic-ai/sdk/resources/messages'

const MAX_STORED_MESSAGES = 20

type AgentStep = {
  id: string
  tool: string
  status: 'running' | 'done' | 'error'
  summary?: string
}

type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
  steps?: AgentStep[]
  createdAt: number
}

const TOOL_LABELS: Record<string, string> = {
  list_sessions: 'Sessions',
  list_formations: 'Formations',
  list_programs: 'Programmes',
  create_session: 'Création session',
  create_formation: 'Création formation',
  create_program: 'Création programme',
  search_students: 'Apprenants',
  check_attendance: 'Émargements',
  get_qualiopi_status: 'Qualiopi',
  list_calendar_events: 'Calendrier',
  get_dashboard_stats: 'Statistiques',
  create_student: 'Création apprenant',
  enroll_student: 'Inscription session',
  send_document_for_signature: 'Envoi pour signature',
  get_session_details: 'Détails session',
  update_entity_status: 'Mise à jour statut',
  list_enrollments: 'Inscriptions',
  send_bulk_documents: 'Envoi en masse',
  search_sessions: 'Recherche session',
  update_session: 'Modification session',
  update_formation: 'Modification formation',
  get_student_details: 'Fiche apprenant',
  send_reminder: 'Rappel signature',
  generate_certificate: 'Génération attestation',
  get_financial_report: 'Rapport financier',
}

function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts
  if (diff < 60_000) return "à l'instant"
  if (diff < 3_600_000) return `il y a ${Math.floor(diff / 60_000)} min`
  if (diff < 86_400_000) return `il y a ${Math.floor(diff / 3_600_000)} h`
  return new Date(ts).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

const DEFAULT_SUGGESTIONS = [
  'Crée un programme "Management" (PROG-MG), une formation de 35h et une session en juin',
  'Quelles sessions sont prévues cette semaine ?',
  'Montre-moi les émargements non clôturés',
  'État de ma conformité Qualiopi',
]

type ProactiveAction = { label: string; message: string }

function getProactiveActions(pathname: string): ProactiveAction[] {
  const segments = pathname.split('/').filter(Boolean)
  const section = segments[1]
  const entityId = segments[2]
  if (!entityId || !/^[0-9a-f-]{36}$/i.test(entityId)) return []

  if (section === 'sessions') return [
    { label: '👥 Inscrits & résumé', message: `Donne-moi le résumé complet de la session ${entityId}` },
    { label: '📄 Conventions non envoyées', message: `Vérifie quels apprenants n'ont pas encore reçu de convention pour la session ${entityId} et envoie-les` },
    { label: '✍️ Émargements', message: `Montre-moi les émargements de la session ${entityId}` },
    { label: '✅ Passer en cours', message: `Passe la session ${entityId} au statut "En cours"` },
  ]
  if (section === 'formations') return [
    { label: '📅 Sessions', message: `Liste les sessions de la formation ${entityId}` },
    { label: '👥 Inscrits', message: `Combien d'apprenants sont inscrits aux sessions de la formation ${entityId} ?` },
    { label: '✏️ Modifier le prix', message: `Je veux modifier le prix de la formation ${entityId}` },
  ]
  if (section === 'students' || section === 'my-students') return [
    { label: '📚 Historique', message: `Montre-moi l'historique de formations de l'apprenant ${entityId}` },
    { label: '➕ Inscrire', message: `Je veux inscrire l'apprenant ${entityId} à une session` },
    { label: '📄 Envoyer un devis', message: `Envoie un devis à l'apprenant ${entityId}` },
  ]
  if (section === 'programs') return [
    { label: '📋 Formations', message: `Liste les formations du programme ${entityId}` },
    { label: '✏️ Modifier', message: `Je veux modifier le programme ${entityId}` },
  ]
  return []
}

function getContextualSuggestions(pathname: string): string[] {
  const segments = pathname.split('/').filter(Boolean)
  const section = segments[1]
  const entityId = segments[2]
  const isEntity = !!entityId && /^[0-9a-f-]{36}$/i.test(entityId)

  if (section === 'sessions' && isEntity) return [
    'Qui est inscrit à cette session ?',
    'Envoie la convention à tous les apprenants de cette session',
    'Montre-moi les émargements de cette session',
    'Passe cette session en statut "En cours"',
  ]
  if (section === 'sessions') return [
    'Recherche une session par nom',
    'Quelles sessions ont encore des places disponibles ?',
    'Y a-t-il des sessions avec des émargements non clôturés ?',
    'Crée une nouvelle session pour le mois prochain',
  ]
  if (section === 'formations' && isEntity) return [
    'Quelles sessions ont été créées pour cette formation ?',
    'Crée une nouvelle session pour cette formation',
    'Modifie le prix de cette formation',
    'Désactive cette formation',
  ]
  if (section === 'formations') return [
    'Liste toutes les formations actives',
    'Crée une nouvelle formation',
    'Quelle formation a le plus de sessions ?',
  ]
  if (section === 'programs' && isEntity) return [
    'Quelles formations sont rattachées à ce programme ?',
    'Modifie le prix de ce programme',
  ]
  if (section === 'students' && isEntity) return [
    "Quel est l'historique de formations de cet apprenant ?",
    'Inscris cet apprenant à une session',
    'Envoie un devis à cet apprenant',
  ]
  if (section === 'students' || section === 'my-students') return [
    'Cherche un apprenant par nom ou email',
    'Crée un nouvel apprenant',
    "Quels apprenants ont des inscriptions en attente ?",
  ]
  if (section === 'qualiopi') return [
    'Quel est mon état de conformité Qualiopi ?',
    'Quels indicateurs sont non conformes ou à améliorer ?',
    "Comment améliorer mon score sur le critère 1 ?",
  ]
  if (section === 'attendance') return [
    "Quels émargements ne sont pas encore clôturés ?",
    'Y a-t-il des sessions sans émargement cette semaine ?',
  ]
  if (section === 'calendar') return [
    'Quels événements sont prévus ce mois-ci ?',
    'Y a-t-il des sessions planifiées la semaine prochaine ?',
  ]
  if (section === 'crm') return [
    'Cherche un contact par nom ou entreprise',
    'Combien de prospects actifs avons-nous ?',
  ]
  return DEFAULT_SUGGESTIONS
}

function buildPageContext(pathname: string): string | undefined {
  const segments = pathname.split('/').filter(Boolean)
  // e.g. ['dashboard', 'sessions', '<uuid>']
  const section = segments[1]
  const entityId = segments[2]

  const sectionLabels: Record<string, string> = {
    sessions: 'Session',
    formations: 'Formation',
    programs: 'Programme',
    students: 'Apprenant',
    'my-students': 'Apprenant',
    attendance: 'Émargement',
    qualiopi: 'Qualiopi',
    calendar: 'Calendrier',
    crm: 'CRM',
    payments: 'Paiements',
    documents: 'Documents',
  }

  const label = sectionLabels[section]
  if (!label) return undefined

  let ctx = `L'utilisateur se trouve sur la page ${label}.`
  if (entityId && /^[0-9a-f-]{36}$/i.test(entityId)) {
    ctx += ` ID de l'entité consultée : ${entityId}.`
  }
  ctx += ` URL : ${pathname}`
  return ctx
}

export function AiChatWidget() {
  const [open, setOpen] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  // In-progress message while streaming
  const [draftContent, setDraftContent] = useState('')
  const [draftSteps, setDraftSteps] = useState<AgentStep[]>([])

  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const pathname = usePathname()
  const openRef = useRef(open)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => { openRef.current = open }, [open])

  // Load persisted messages from Supabase on first mount
  useEffect(() => {
    fetch('/api/ai-chat/history')
      .then((r) => r.ok ? r.json() : null)
      .then((body: { messages: Message[] } | null) => {
        if (body?.messages && Array.isArray(body.messages) && body.messages.length > 0) {
          setMessages(body.messages)
        }
      })
      .catch(() => { /* silently ignore */ })
  }, [])

  // Persist messages to Supabase (debounced 2 s, skip welcome-only)
  useEffect(() => {
    const real = messages.filter((m) => m.id !== 'welcome')
    if (real.length === 0) return
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      const toStore = messages.slice(-MAX_STORED_MESSAGES)
      fetch('/api/ai-chat/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: toStore }),
      }).catch(() => { /* silently ignore */ })
    }, 2000)
  }, [messages])

  useEffect(() => {
    if (open) setUnreadCount(0)
  }, [open])

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: 'Bonjour ! Je suis Jeane, votre assistante IA EDUZEN. Je peux créer des programmes, formations et sessions, vérifier les émargements, suivre votre conformité Qualiopi et bien plus — en mode agent, je chaîne les actions automatiquement. Que puis-je faire pour vous ?',
        createdAt: Date.now(),
      }])
    }
  }, [open, messages.length])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, draftContent, draftSteps])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100)
  }, [open])

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isStreaming) return

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: text, createdAt: Date.now() }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setIsStreaming(true)
    setDraftContent('')
    setDraftSteps([])

    const history: MessageParam[] = messages
      .filter((m) => m.id !== 'welcome')
      .map((m) => ({ role: m.role, content: m.content }))
    history.push({ role: 'user', content: text })

    const ctrl = new AbortController()
    abortRef.current = ctrl

    const pageContext = buildPageContext(pathname)

    try {
      const res = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history, pageContext }),
        signal: ctrl.signal,
      })

      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`)

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let accumulated = ''
      const steps: AgentStep[] = []

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          let event: Record<string, unknown>
          try {
            event = JSON.parse(line.slice(6))
          } catch {
            continue
          }

          if (event.type === 'text_delta') {
            accumulated += event.content as string
            setDraftContent(accumulated)
          } else if (event.type === 'tool_start') {
            const step: AgentStep = {
              id: event.id as string,
              tool: event.name as string,
              status: 'running',
            }
            steps.push(step)
            setDraftSteps([...steps])
          } else if (event.type === 'tool_done') {
            const idx = steps.findIndex((s) => s.id === event.id)
            if (idx !== -1) {
              steps[idx] = { ...steps[idx], status: 'done', summary: event.summary as string }
              setDraftSteps([...steps])
            }
          } else if (event.type === 'error') {
            accumulated += `\n\n*Erreur : ${event.message}*`
            setDraftContent(accumulated)
          } else if (event.type === 'done') {
            const now = Date.now()
            setMessages((prev) => [
              ...prev,
              {
                id: now.toString(),
                role: 'assistant',
                content: accumulated || '*(aucune réponse)*',
                steps: steps.length > 0 ? [...steps] : undefined,
                createdAt: now,
              },
            ])
            if (!openRef.current) setUnreadCount((c) => c + 1)
            setDraftContent('')
            setDraftSteps([])
            break
          }
        }
      }
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') return
      setMessages((prev) => [
        ...prev,
        { id: Date.now().toString(), role: 'assistant', content: 'Désolé, une erreur est survenue. Veuillez réessayer.', createdAt: Date.now() },
      ])
      setDraftContent('')
      setDraftSteps([])
    } finally {
      setIsStreaming(false)
      abortRef.current = null
    }
  }, [messages, isStreaming])

  const stopStream = () => {
    abortRef.current?.abort()
    setIsStreaming(false)
    if (draftContent) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'assistant',
          content: draftContent + ' *(interrompu)*',
          steps: draftSteps.length > 0 ? draftSteps : undefined,
          createdAt: Date.now(),
        },
      ])
    }
    setDraftContent('')
    setDraftSteps([])
  }

  useEffect(() => {
    function handleOpen(e: Event) {
      const msg = (e as CustomEvent<{ message: string }>).detail?.message
      setOpen(true)
      if (msg) {
        setTimeout(() => sendMessage(msg), 150)
      }
    }
    window.addEventListener('ai-chat:open', handleOpen)
    return () => window.removeEventListener('ai-chat:open', handleOpen)
  }, [sendMessage])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  const showSuggestions = messages.length <= 1 && !isStreaming

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg',
          'flex items-center justify-center transition-all duration-200',
          'bg-gradient-to-br from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800',
          'text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
          open && 'scale-95'
        )}
        aria-label="Jeane — Assistante IA"
      >
        {open ? <XIcon /> : <SparkleIcon />}
        {isStreaming && (
          <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-green-400 animate-pulse" />
        )}
        {!open && !isStreaming && unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 flex items-center justify-center text-[10px] font-bold leading-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Chat panel */}
      <div
        className={cn(
          'fixed z-50 flex flex-col bg-white border border-gray-200 overflow-hidden shadow-2xl',
          'transition-all duration-300',
          fullscreen
            ? 'inset-[5%] rounded-2xl'
            : 'bottom-24 right-6 w-[400px] max-w-[calc(100vw-24px)] rounded-2xl origin-bottom-right',
          open ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none'
        )}
        style={fullscreen ? undefined : { height: '560px' }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-700 text-white flex-shrink-0">
          <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center">
            <SparkleIcon className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">Jeane</p>
            <p className="text-xs text-blue-100 flex items-center gap-1">
              {isStreaming
                ? <><span className="h-1.5 w-1.5 rounded-full bg-green-300 animate-pulse inline-block" /> En cours...</>
                : 'Alimenté par Claude'}
            </p>
          </div>
          <button
            onClick={() => {
              setMessages([])
              setDraftContent('')
              setDraftSteps([])
              fetch('/api/ai-chat/history', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: [] }),
              }).catch(() => { /* ignore */ })
            }}
            className="text-blue-200 hover:text-white text-xs transition-colors"
            title="Nouvelle conversation"
          >
            Réinitialiser
          </button>
          <button
            onClick={() => setFullscreen((v) => !v)}
            className="text-blue-200 hover:text-white transition-colors ml-1"
            title={fullscreen ? 'Réduire' : 'Plein écran'}
          >
            {fullscreen ? <CompressIcon /> : <ExpandIcon />}
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 scroll-smooth">
          {messages.map((msg) => (
            <ChatMessage key={msg.id} message={msg} />
          ))}

          {/* Draft message (streaming) */}
          {isStreaming && (
            <div className="flex flex-col gap-2">
              {/* Agent steps */}
              {draftSteps.length > 0 && (
                <div className="flex flex-wrap gap-1.5 ml-8">
                  {draftSteps.map((step) => (
                    <AgentStepBadge key={step.id} step={step} />
                  ))}
                </div>
              )}

              {draftContent ? (
                <div className="flex gap-2">
                  <AssistantAvatar />
                  <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-3 py-2 max-w-[85%] text-sm">
                    <FormattedMessage content={draftContent} />
                    <span className="inline-block w-0.5 h-4 bg-blue-500 animate-pulse ml-0.5 align-text-bottom" />
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <AssistantAvatar />
                  <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-3 py-3">
                    <div className="flex gap-1 items-center">
                      <span className="h-2 w-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="h-2 w-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="h-2 w-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {showSuggestions && (() => {
            const proactive = getProactiveActions(pathname)
            const suggestions = getContextualSuggestions(pathname)
            return (
              <div className="pt-1 space-y-3">
                {proactive.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[10px] text-gray-400 text-center uppercase tracking-wide font-medium">⚡ Actions rapides sur cette page</p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {proactive.map((a) => (
                        <button
                          key={a.label}
                          onClick={() => sendMessage(a.message)}
                          className="text-left text-xs px-2.5 py-2 rounded-xl border border-indigo-100 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors leading-snug"
                        >
                          {a.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="space-y-1.5">
                  {proactive.length === 0 && (
                    <p className="text-xs text-gray-400 text-center">Suggestions</p>
                  )}
                  <div className="flex flex-col gap-1.5">
                    {suggestions.map((s) => (
                      <button
                        key={s}
                        onClick={() => sendMessage(s)}
                        className="text-left text-xs px-3 py-2 rounded-xl border border-blue-100 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )
          })()}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="border-t border-gray-100 px-3 py-2.5 flex-shrink-0">
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Décrivez la tâche à effectuer..."
              rows={1}
              disabled={isStreaming}
              className={cn(
                'flex-1 resize-none rounded-xl border border-gray-200 px-3 py-2',
                'text-sm focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400',
                'placeholder:text-gray-400 transition-colors max-h-24 overflow-y-auto',
                'disabled:opacity-50'
              )}
              style={{ lineHeight: '1.4' }}
            />
            {isStreaming ? (
              <Button
                onClick={stopStream}
                size="sm"
                className="h-9 w-9 p-0 rounded-xl bg-red-500 hover:bg-red-600 flex-shrink-0"
                title="Arrêter"
              >
                <StopIcon />
              </Button>
            ) : (
              <Button
                onClick={() => sendMessage(input)}
                disabled={!input.trim()}
                size="sm"
                className="h-9 w-9 p-0 rounded-xl bg-blue-600 hover:bg-blue-700 flex-shrink-0"
              >
                <SendIcon />
              </Button>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-1.5 text-center">
            Entrée pour envoyer · Maj+Entrée pour un saut de ligne
          </p>
        </div>
      </div>
    </>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ChatMessage({ message }: { message: Message }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  if (message.role === 'user') {
    return (
      <div className="flex flex-col items-end gap-0.5">
        <div className="bg-blue-600 text-white rounded-2xl rounded-tr-sm px-3 py-2 max-w-[85%] text-sm leading-relaxed">
          {message.content}
        </div>
        {message.createdAt && (
          <span className="text-[10px] text-gray-400 pr-1">{formatRelativeTime(message.createdAt)}</span>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {message.steps && message.steps.length > 0 && (
        <div className="flex flex-wrap gap-1.5 ml-8">
          {message.steps.map((step) => (
            <AgentStepBadge key={step.id} step={step} />
          ))}
        </div>
      )}
      <div className="flex gap-2 group">
        <AssistantAvatar />
        <div className="flex flex-col gap-0.5 max-w-[85%]">
          <div className="bg-gray-100 text-gray-800 rounded-2xl rounded-tl-sm px-3 py-2 text-sm leading-relaxed relative">
            <FormattedMessage content={message.content} />
            <button
              onClick={handleCopy}
              className={cn(
                'absolute -bottom-2 -right-2 h-6 w-6 rounded-full border bg-white shadow-sm',
                'flex items-center justify-center transition-all duration-150',
                'opacity-0 group-hover:opacity-100',
                copied ? 'text-green-600 border-green-200' : 'text-gray-400 border-gray-200 hover:text-gray-600'
              )}
              title={copied ? 'Copié !' : 'Copier'}
            >
              {copied ? <CheckIcon /> : <CopyIcon />}
            </button>
          </div>
          {message.createdAt && (
            <span className="text-[10px] text-gray-400 pl-1">{formatRelativeTime(message.createdAt)}</span>
          )}
        </div>
      </div>
    </div>
  )
}

function AgentStepBadge({ step }: { step: AgentStep }) {
  const label = TOOL_LABELS[step.tool] ?? step.tool

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium',
        step.status === 'running' && 'bg-blue-50 border-blue-200 text-blue-700',
        step.status === 'done' && 'bg-green-50 border-green-200 text-green-700',
        step.status === 'error' && 'bg-red-50 border-red-200 text-red-700',
      )}
      title={step.summary}
    >
      {step.status === 'running' && (
        <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse flex-shrink-0" />
      )}
      {step.status === 'done' && (
        <svg className="h-3 w-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      )}
      {step.status === 'error' && '✗'}
      {label}
    </span>
  )
}

function formatInline(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/`(.*?)`/g, '<code class="bg-gray-200 px-1 rounded text-[11px] font-mono">$1</code>')
    .replace(
      /\[([^\]]+)\]\((\/[^)]*)\)/g,
      '<a href="$2" class="text-blue-600 hover:text-blue-800 underline underline-offset-2 font-medium" target="_self">$1</a>'
    )
}

type MdBlock =
  | { t: 'heading'; level: 1 | 2 | 3; text: string }
  | { t: 'list'; items: string[] }
  | { t: 'table'; headers: string[]; rows: string[][] }
  | { t: 'hr' }
  | { t: 'para'; text: string }
  | { t: 'blank' }

function parseMd(content: string): MdBlock[] {
  const lines = content.split('\n')
  const blocks: MdBlock[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    if (!line.trim()) { blocks.push({ t: 'blank' }); i++; continue }

    // Heading
    const hm = line.match(/^(#{1,3})\s+(.+)$/)
    if (hm) {
      blocks.push({ t: 'heading', level: Math.min(hm[1].length, 3) as 1|2|3, text: hm[2] })
      i++; continue
    }

    // HR
    if (/^---+$/.test(line.trim())) { blocks.push({ t: 'hr' }); i++; continue }

    // List (-, *, •, numbered 1.)
    if (/^[-*•]\s|^\d+\.\s/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^[-*•]\s|^\d+\.\s/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*•]\s+|^\d+\.\s+/, ''))
        i++
      }
      blocks.push({ t: 'list', items }); continue
    }

    // Table (line has | and next non-empty line is a separator)
    if (line.includes('|')) {
      const sep = lines[i + 1]?.trim()
      if (sep && /^\|?[-\s|:]+\|?$/.test(sep)) {
        const headers = line.split('|').map(s => s.trim()).filter(Boolean)
        i += 2
        const rows: string[][] = []
        while (i < lines.length && lines[i].includes('|')) {
          rows.push(lines[i].split('|').map(s => s.trim()).filter(Boolean))
          i++
        }
        blocks.push({ t: 'table', headers, rows }); continue
      }
    }

    blocks.push({ t: 'para', text: line }); i++
  }
  return blocks
}

function FormattedMessage({ content }: { content: string }) {
  const blocks = parseMd(content)
  return (
    <div className="space-y-1 text-sm leading-relaxed">
      {blocks.map((b, i) => {
        if (b.t === 'blank') return <div key={i} className="h-1" />
        if (b.t === 'hr') return <hr key={i} className="border-gray-300 my-1" />
        if (b.t === 'heading') {
          const cls = b.level === 1
            ? 'font-bold text-gray-900 text-base mt-2 mb-0.5'
            : b.level === 2
              ? 'font-semibold text-gray-800 text-sm mt-1.5 mb-0.5'
              : 'font-medium text-gray-700 text-sm mt-1'
          return <p key={i} className={cls} dangerouslySetInnerHTML={{ __html: formatInline(b.text) }} />
        }
        if (b.t === 'list') return (
          <ul key={i} className="space-y-0.5 pl-1">
            {b.items.map((item, j) => (
              <li key={j} className="flex gap-1.5">
                <span className="text-gray-400 flex-shrink-0 select-none">•</span>
                <span dangerouslySetInnerHTML={{ __html: formatInline(item) }} />
              </li>
            ))}
          </ul>
        )
        if (b.t === 'table') return (
          <div key={i} className="overflow-x-auto rounded border border-gray-200 my-1">
            <table className="text-xs w-full border-collapse">
              <thead className="bg-gray-50">
                <tr>
                  {b.headers.map((h, j) => (
                    <th key={j} className="px-2 py-1.5 text-left font-semibold text-gray-700 border-b border-gray-200"
                      dangerouslySetInnerHTML={{ __html: formatInline(h) }} />
                  ))}
                </tr>
              </thead>
              <tbody>
                {b.rows.map((row, j) => (
                  <tr key={j} className={j % 2 === 1 ? 'bg-gray-50' : ''}>
                    {row.map((cell, k) => (
                      <td key={k} className="px-2 py-1 border-b border-gray-100"
                        dangerouslySetInnerHTML={{ __html: formatInline(cell) }} />
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
        return <p key={i} dangerouslySetInnerHTML={{ __html: formatInline(b.text) }} />
      })}
    </div>
  )
}

function AssistantAvatar() {
  return (
    <div className="h-6 w-6 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0 mt-0.5">
      <SparkleIcon className="h-3.5 w-3.5 text-white" />
    </div>
  )
}

function SparkleIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={cn('h-6 w-6', className)}>
      <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
    </svg>
  )
}

function XIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

function SendIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
    </svg>
  )
}

function StopIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
      <rect x="6" y="6" width="12" height="12" rx="1" />
    </svg>
  )
}

function CopyIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  )
}

function ExpandIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
    </svg>
  )
}

function CompressIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
    </svg>
  )
}
