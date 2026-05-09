'use client'

import { motion, useInView } from '@/components/ui/motion'
import { useRef, useState } from 'react'
import {
  Sparkles, Zap, Shield, BarChart3, FileCheck, Users,
  MessageSquare, ArrowRight, CheckCircle2, Bot, ChevronRight,
} from 'lucide-react'

const capabilities = [
  {
    icon: Zap,
    title: 'Mode agent autonome',
    description: 'Demandez "crée un programme, une formation et une session" — l\'IA enchaîne les trois actions sans s\'arrêter.',
  },
  {
    icon: Users,
    title: 'Gestion apprenants & sessions',
    description: 'Inscriptions, envoi de conventions en masse, rappels de signature — tout en une seule phrase.',
  },
  {
    icon: FileCheck,
    title: 'Documents & attestations',
    description: 'Génère et envoie automatiquement attestations de formation, devis et conventions pour signature électronique.',
  },
  {
    icon: BarChart3,
    title: 'Rapport financier instantané',
    description: 'CA par formation, taux de remplissage, performance mensuelle — demandez et obtenez un tableau en secondes.',
  },
  {
    icon: Shield,
    title: 'Conformité Qualiopi',
    description: 'Consultez l\'état de vos 32 indicateurs, identifiez les points à améliorer avant votre prochain audit.',
  },
  {
    icon: CheckCircle2,
    title: 'Cloisonnement des données',
    description: 'Chaque organisation n\'accède qu\'à ses propres données. Isolation totale entre les comptes.',
  },
]

const chatMessages = [
  { role: 'user', content: 'Envoie la convention à tous les apprenants de la session "Management Jan 2025"' },
  { role: 'assistant', content: '✅ **Conventions envoyées en masse**\n• 8 apprenants — 8 envois réussis\n• Signature électronique en attente' },
  { role: 'user', content: 'Génère le rapport financier de janvier 2025' },
  { role: 'assistant', content: '## Rapport financier — janvier 2025\n| Indicateur | Valeur |\n|---|---|\n| CA total | **12 400 EUR** |\n| Sessions | 4 |\n| Taux de remplissage | 87% |' },
]

function ChatBubble({ message, index }: { message: typeof chatMessages[0]; index: number }) {
  const isUser = message.role === 'user'
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.15, duration: 0.35 }}
      className={`flex gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      {!isUser && (
        <div className="h-6 w-6 rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Bot className="h-3.5 w-3.5 text-white" />
        </div>
      )}
      <div
        className={`max-w-[78%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
          isUser
            ? 'bg-blue-600 text-white rounded-tr-sm'
            : 'bg-white border border-gray-100 text-gray-800 rounded-tl-sm shadow-sm'
        }`}
      >
        {message.content.split('\n').map((line, i) => {
          if (line.startsWith('## ')) return <p key={i} className="font-semibold mb-1">{line.slice(3)}</p>
          if (line.startsWith('|')) return <p key={i} className="font-mono text-[10px] opacity-80">{line}</p>
          const bold = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          return <p key={i} dangerouslySetInnerHTML={{ __html: bold }} />
        })}
      </div>
    </motion.div>
  )
}

function ChatMockup() {
  return (
    <div className="relative bg-gray-50 rounded-2xl overflow-hidden border border-gray-200 shadow-2xl">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-700">
        <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center">
          <Sparkles className="h-4 w-4 text-white" />
        </div>
        <div>
          <p className="text-white text-sm font-semibold leading-none">Assistant EDUZEN</p>
          <p className="text-white/60 text-[11px] mt-0.5">Agent IA · 26 outils disponibles</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-white/60 text-[11px]">En ligne</span>
        </div>
      </div>

      {/* Messages */}
      <div className="p-4 space-y-3 min-h-[220px]">
        {chatMessages.map((msg, i) => (
          <ChatBubble key={i} message={msg} index={i} />
        ))}
      </div>

      {/* Input */}
      <div className="px-4 pb-4">
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-sm">
          <MessageSquare className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
          <span className="text-xs text-gray-400 flex-1">Demandez quelque chose à l&apos;IA…</span>
          <div className="h-5 w-5 rounded-full bg-blue-600 flex items-center justify-center">
            <ArrowRight className="h-3 w-3 text-white" />
          </div>
        </div>
      </div>
    </div>
  )
}

export function AiAgent() {
  const sectionRef = useRef<HTMLElement>(null)
  const isInView = useInView(sectionRef, { once: true, margin: '-100px' })
  const [hoveredCard, setHoveredCard] = useState<number | null>(null)

  return (
    <section
      ref={sectionRef}
      className="py-24 md:py-32 bg-gradient-to-b from-gray-950 via-blue-950/40 to-gray-950 overflow-hidden"
    >
      <div className="container mx-auto px-4 md:px-6 lg:px-8 max-w-7xl">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-1.5 mb-6">
            <Sparkles className="h-3.5 w-3.5 text-blue-400" />
            <span className="text-blue-300 text-sm font-medium">Nouveau — Intelligence Artificielle</span>
          </div>

          <h2 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-white mb-6 leading-tight">
            Un agent IA qui pilote
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
              votre organisme de formation
            </span>
          </h2>

          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Donnez un ordre en langage naturel — l&apos;agent planifie et exécute les actions en chaîne,
            sans que vous ayez à naviguer dans les menus.
          </p>
        </motion.div>

        {/* Grid : mockup + capabilities */}
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">

          {/* Chat mockup */}
          <motion.div
            initial={{ opacity: 0, x: -32 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.15 }}
          >
            <ChatMockup />

            {/* Stats sous le mockup */}
            <div className="grid grid-cols-3 gap-4 mt-6">
              {[
                { value: '26', label: 'outils disponibles' },
                { value: '< 2s', label: 'temps de réponse' },
                { value: '100%', label: 'données isolées' },
              ].map((stat, i) => (
                <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                  <p className="text-white text-xl font-black">{stat.value}</p>
                  <p className="text-gray-500 text-[11px] mt-0.5">{stat.label}</p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Capability cards */}
          <motion.div
            initial={{ opacity: 0, x: 32 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.25 }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-4"
          >
            {capabilities.map((cap, i) => {
              const Icon = cap.icon
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 16 }}
                  animate={isInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.5, delay: 0.3 + i * 0.07 }}
                  onMouseEnter={() => setHoveredCard(i)}
                  onMouseLeave={() => setHoveredCard(null)}
                  className="group relative bg-white/5 hover:bg-white/8 border border-white/10 hover:border-blue-500/40 rounded-2xl p-5 cursor-default transition-all duration-300"
                >
                  <div className="flex items-start gap-3">
                    <div className={`h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors duration-300 ${
                      hoveredCard === i ? 'bg-blue-600' : 'bg-white/10'
                    }`}>
                      <Icon className="h-4.5 w-4.5 text-white" size={18} />
                    </div>
                    <div>
                      <p className="text-white font-semibold text-sm leading-snug mb-1">{cap.title}</p>
                      <p className="text-gray-400 text-xs leading-relaxed">{cap.description}</p>
                    </div>
                  </div>
                  {hoveredCard === i && (
                    <ChevronRight className="absolute bottom-4 right-4 h-3.5 w-3.5 text-blue-400 opacity-60" />
                  )}
                </motion.div>
              )
            })}
          </motion.div>
        </div>

      </div>
    </section>
  )
}
