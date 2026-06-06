'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from '@/components/ui/motion'
import { X, MessageCircle, Send, Loader2, Calendar, Sparkles } from 'lucide-react'

const CALENDLY = 'https://calendly.com/airtonenile/30min'
const TRIAL_URL = 'https://eduzen.io/auth/register'
const MAX_MESSAGES = 10

const SUGGESTIONS = [
  'Comment ça fonctionne ?',
  'Est-ce adapté à ma structure ?',
  'Qualiopi — vous pouvez m\'aider ?',
  'Quel est le prix ?',
]

type Message = {
  role: 'user' | 'assistant'
  content: string
}

export function SalesChatbot() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showCTA, setShowCTA] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      // Message de bienvenue initial
      setMessages([{
        role: 'assistant',
        content: 'Bonjour ! Je suis l\'assistant EduZen. Vous avez des questions sur la plateforme ou vous souhaitez savoir si elle correspond à votre organisme ? Je suis là pour vous répondre.',
      }])
    }
  }, [isOpen, messages.length])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (messages.filter(m => m.role === 'user').length >= 2) {
      setShowCTA(true)
    }
  }, [messages])

  const send = async (text: string) => {
    if (!text.trim() || isLoading || messages.length >= MAX_MESSAGES * 2) return

    const userMessage: Message = { role: 'user', content: text.trim() }
    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)
    setInput('')
    setIsLoading(true)

    // Placeholder pour le streaming
    setMessages(prev => [...prev, { role: 'assistant', content: '' }])

    try {
      const res = await fetch('/api/landing-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: updatedMessages }),
      })

      if (!res.ok || !res.body) throw new Error('Erreur réseau')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let full = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        full += decoder.decode(value, { stream: true })
        setMessages(prev => [
          ...prev.slice(0, -1),
          { role: 'assistant', content: full },
        ])
      }
    } catch {
      setMessages(prev => [
        ...prev.slice(0, -1),
        { role: 'assistant', content: 'Désolé, une erreur est survenue. Appelez-nous directement au 06 10 44 13 24.' },
      ])
    } finally {
      setIsLoading(false)
      inputRef.current?.focus()
    }
  }

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send(input)
    }
  }

  const userMessageCount = messages.filter(m => m.role === 'user').length
  const isMaxReached = userMessageCount >= MAX_MESSAGES

  return (
    <>
      {/* Bouton flottant */}
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 3, type: 'spring', stiffness: 400, damping: 20 }}
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 left-6 z-50 flex items-center gap-2.5 bg-[#274472] text-white rounded-full shadow-2xl px-4 py-3 text-sm font-semibold hover:bg-[#1e3560] transition-colors ${isOpen ? 'hidden' : ''}`}
        aria-label="Ouvrir le chat"
      >
        <MessageCircle className="h-5 w-5 shrink-0" />
        <span>Une question ?</span>
        <span className="flex h-2 w-2 shrink-0">
          <span className="animate-ping absolute h-2 w-2 rounded-full bg-green-400 opacity-75" />
          <span className="relative rounded-full h-2 w-2 bg-green-400" />
        </span>
      </motion.button>

      {/* Fenêtre de chat */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="fixed bottom-6 left-6 z-50 w-[360px] max-w-[calc(100vw-3rem)] bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden"
            style={{ maxHeight: '520px' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-[#274472] text-white shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-white/20 rounded-lg">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-bold leading-tight">Assistant EduZen</p>
                  <div className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 bg-green-400 rounded-full" />
                    <p className="text-xs text-white/70">En ligne</p>
                  </div>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="p-1 rounded hover:bg-white/20 transition-colors" aria-label="Fermer">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-[#274472] text-white rounded-br-sm'
                      : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                  }`}>
                    {msg.content || (isLoading && i === messages.length - 1
                      ? <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                      : null
                    )}
                  </div>
                </div>
              ))}

              {/* Suggestions initiales */}
              {messages.length === 1 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {SUGGESTIONS.map(s => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="text-xs bg-white border border-gray-200 text-gray-600 rounded-full px-3 py-1.5 hover:border-[#274472] hover:text-[#274472] transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}

              {/* CTA après 2 échanges */}
              {showCTA && !isMaxReached && (
                <div className="bg-gradient-to-r from-[#274472]/5 to-[#34B9EE]/5 rounded-xl p-3 border border-[#274472]/10">
                  <p className="text-xs text-gray-600 mb-2 font-medium">Voir EduZen en action :</p>
                  <div className="flex gap-2">
                    <a
                      href={TRIAL_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 text-center text-xs bg-[#274472] text-white rounded-lg px-3 py-2 font-semibold hover:bg-[#1e3560] transition-colors"
                    >
                      Essai gratuit
                    </a>
                    <a
                      href={CALENDLY}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 text-center text-xs bg-white border border-[#274472] text-[#274472] rounded-lg px-3 py-2 font-semibold hover:bg-[#274472]/5 transition-colors flex items-center justify-center gap-1"
                    >
                      <Calendar className="h-3 w-3" />
                      Appel 30 min
                    </a>
                  </div>
                </div>
              )}

              {isMaxReached && (
                <div className="text-center py-2">
                  <p className="text-xs text-gray-500 mb-2">Pour continuer, parlons directement :</p>
                  <a href={CALENDLY} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs bg-[#274472] text-white rounded-full px-4 py-2 font-semibold">
                    <Calendar className="h-3.5 w-3.5" />
                    Réserver 30 minutes
                  </a>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            {!isMaxReached && (
              <div className="px-3 py-3 border-t border-gray-100 shrink-0">
                <div className="flex items-end gap-2 bg-gray-50 rounded-xl px-3 py-2">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKey}
                    placeholder="Votre question..."
                    rows={1}
                    className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 resize-none focus:outline-none leading-relaxed"
                    style={{ maxHeight: '80px' }}
                    disabled={isLoading}
                  />
                  <button
                    onClick={() => send(input)}
                    disabled={!input.trim() || isLoading}
                    className="shrink-0 p-1.5 bg-[#274472] text-white rounded-lg disabled:opacity-30 hover:bg-[#1e3560] transition-colors"
                    aria-label="Envoyer"
                  >
                    {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  </button>
                </div>
                <p className="text-center text-[10px] text-gray-300 mt-1.5">Propulsé par Claude · EduZen</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
