'use client'

import { motion, useInView } from '@/components/ui/motion'
import React, { useRef, useState } from 'react'
import {
  Sparkles, Zap, Shield, BarChart3, FileCheck, Users,
  MessageSquare, ArrowRight, CheckCircle2, Bot,
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
    description: 'Génère et envoie automatiquement attestations, devis et conventions pour signature électronique.',
  },
  {
    icon: BarChart3,
    title: 'Rapport financier instantané',
    description: 'CA par formation, taux de remplissage, performance mensuelle — demandez et obtenez un tableau en secondes.',
  },
  {
    icon: Shield,
    title: 'Conformité Qualiopi',
    description: 'Consultez l\'état de vos 32 indicateurs et préparez vos audits sans effort.',
  },
  {
    icon: CheckCircle2,
    title: 'Données cloisonnées',
    description: 'Chaque organisation n\'accède qu\'à ses propres données. Isolation totale entre les comptes.',
  },
]

const chatMessages = [
  { role: 'user', content: 'Envoie la convention à tous les apprenants de la session "Management Jan 2025"' },
  { role: 'assistant', content: '✅ **Conventions envoyées en masse**\n• 8 apprenants — 8 envois réussis\n• Signature électronique en attente' },
  { role: 'user', content: 'Génère le rapport financier de janvier 2025' },
  { role: 'assistant', content: '**Rapport financier — janvier 2025**\n• CA total : 12 400 EUR\n• Sessions : 4\n• Taux de remplissage : 87%' },
]

function renderBold(text: string): React.ReactNode[] {
  return text.split(/\*\*(.*?)\*\*/g).map((part, i) =>
    i % 2 === 1 ? <strong key={i}>{part}</strong> : part
  )
}

function ChatBubble({ message, index }: { message: typeof chatMessages[0]; index: number }) {
  const isUser = message.role === 'user'
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.15, duration: 0.35 }}
      className={`flex gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      {!isUser && (
        <div className="h-6 w-6 rounded-full bg-gradient-to-br from-brand-blue to-brand-cyan flex items-center justify-center flex-shrink-0 mt-0.5">
          <Bot className="h-3.5 w-3.5 text-white" />
        </div>
      )}
      <div
        className={`max-w-[78%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
          isUser
            ? 'bg-brand-blue text-white rounded-tr-sm'
            : 'bg-white border border-gray-100 text-gray-700 rounded-tl-sm shadow-sm'
        }`}
      >
        {message.content.split('\n').map((line, i) => (
          <p key={i}>{renderBold(line)}</p>
        ))}
      </div>
    </motion.div>
  )
}

function ChatMockup() {
  return (
    <div className="relative bg-gray-50 rounded-2xl overflow-hidden border border-gray-200/80 shadow-2xl shadow-brand-blue/10">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-brand-blue to-brand-cyan">
        <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center">
          <Sparkles className="h-4 w-4 text-white" />
        </div>
        <div>
          <p className="text-white text-sm font-semibold leading-none">Jeane</p>
          <p className="text-white/70 text-[11px] mt-0.5">Agente IA · 26 outils disponibles</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-green-300 animate-pulse" />
          <span className="text-white/70 text-[11px]">En ligne</span>
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
          <div className="h-5 w-5 rounded-full bg-brand-blue flex items-center justify-center">
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
      className="relative py-20 md:py-28 overflow-hidden bg-gradient-to-b from-white via-gray-50/20 to-white"
    >
      {/* Background decorations — same pattern as Features/ProductShowcase */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[10%] right-[-5%] w-[500px] h-[500px] bg-gradient-to-br from-brand-blue/8 to-brand-cyan/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-[10%] left-[-10%] w-[600px] h-[600px] bg-gradient-to-tr from-brand-cyan/6 to-brand-blue/4 rounded-full blur-[120px]" />
      </div>

      <div className="container mx-auto px-4 md:px-6 lg:px-8 max-w-7xl relative">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-brand-blue-ghost border border-brand-blue-pale mb-8">
            <Sparkles className="h-4 w-4 text-brand-blue" />
            <span className="text-brand-blue-darker text-sm font-semibold">Nouveau — Intelligence Artificielle</span>
          </div>

          <h2 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-gray-900 mb-6 leading-tight">
            Jeane pilote
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-blue to-brand-cyan">
              votre organisme de formation
            </span>
          </h2>

          <p className="text-lg text-gray-500 max-w-2xl mx-auto">
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
                <div key={i} className="bg-white border border-gray-100 rounded-xl p-3 text-center shadow-sm">
                  <p className="text-transparent bg-clip-text bg-gradient-to-r from-brand-blue to-brand-cyan text-xl font-black">{stat.value}</p>
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
              const isHovered = hoveredCard === i
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 16 }}
                  animate={isInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.5, delay: 0.3 + i * 0.07 }}
                  onMouseEnter={() => setHoveredCard(i)}
                  onMouseLeave={() => setHoveredCard(null)}
                  className="group bg-white border border-gray-100 hover:border-brand-blue-pale rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-300 cursor-default"
                >
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-colors duration-300 ${
                      isHovered
                        ? 'bg-gradient-to-br from-brand-blue to-brand-cyan'
                        : 'bg-brand-blue-ghost'
                    }`}
                  >
                    <Icon className={`h-5 w-5 transition-colors duration-300 ${isHovered ? 'text-white' : 'text-brand-blue'}`} />
                  </div>
                  <p className="text-gray-900 font-semibold text-sm mb-1">{cap.title}</p>
                  <p className="text-gray-500 text-xs leading-relaxed">{cap.description}</p>
                </motion.div>
              )
            })}
          </motion.div>
        </div>

      </div>
    </section>
  )
}
