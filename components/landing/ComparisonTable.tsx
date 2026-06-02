'use client'

import { motion, useInView } from '@/components/ui/motion'
import { useRef } from 'react'
import { Check, X, Minus, ArrowRight, Zap, BarChart3 } from 'lucide-react'
import Link from 'next/link'

const competitors = [
  {
    name: 'EduZen',
    highlight: true,
    tag: 'Meilleur choix',
    priceNote: 'Dès 79 €/mois',
  },
  { name: 'Dendreo', highlight: false, priceNote: 'Dès 99 €/mois' },
  { name: 'Digiforma', highlight: false, priceNote: 'Dès 89 €/mois' },
  { name: 'Yparéo', highlight: false, priceNote: 'Sur devis' },
  { name: 'Syforma', highlight: false, priceNote: 'Dès 59 €/mois' },
]

type CellValue = 'yes' | 'no' | 'partial' | string

interface Criterion {
  label: string
  sub: string
  values: CellValue[]
}

const criteria: Criterion[] = [
  {
    label: 'Conformité Qualiopi',
    sub: 'Génération automatique de tous les documents',
    values: ['yes', 'partial', 'partial', 'partial', 'no'],
  },
  {
    label: 'Émargement QR code natif',
    sub: 'Sans module externe, inclus de base',
    values: ['yes', 'no', 'partial', 'no', 'no'],
  },
  {
    label: 'Signature eIDAS incluse',
    sub: 'Valeur juridique, sans option payante',
    values: ['yes', 'partial', 'no', 'partial', 'no'],
  },
  {
    label: 'Facturation CPF / OPCO',
    sub: 'Subrogation et suivi des encaissements',
    values: ['yes', 'yes', 'partial', 'yes', 'no'],
  },
  {
    label: 'Agent IA intégré',
    sub: 'Programmes, bilans pédagogiques, supports',
    values: ['yes', 'no', 'no', 'no', 'no'],
  },
  {
    label: 'Portail e-learning inclus',
    sub: 'LMS sans surcoût dans chaque plan',
    values: ['yes', 'partial', 'partial', 'partial', 'no'],
  },
  {
    label: 'CRM apprenants & entreprises',
    sub: 'Pipeline commercial intégré',
    values: ['yes', 'partial', 'no', 'partial', 'no'],
  },
  {
    label: 'Sans engagement',
    sub: 'Résiliable à tout moment',
    values: ['yes', 'no', 'yes', 'no', 'no'],
  },
  {
    label: 'Essai gratuit',
    sub: 'Sans carte bancaire',
    values: ['14 jours', 'Non', '14 jours', 'Sur démo', 'Non'],
  },
]

const LEGEND = [
  { icon: 'yes', label: 'Inclus' },
  { icon: 'partial', label: 'Option / partiel' },
  { icon: 'no', label: 'Non disponible' },
]

function Cell({ value, highlight }: { value: CellValue; highlight: boolean }) {
  const base = 'flex items-center justify-center h-full py-4 px-3'

  if (value === 'yes') {
    return (
      <div className={base}>
        <span
          className={`inline-flex items-center justify-center w-7 h-7 rounded-full ${
            highlight
              ? 'bg-brand-cyan/20 text-brand-cyan'
              : 'bg-emerald-50 text-emerald-500'
          }`}
        >
          <Check className="w-4 h-4" strokeWidth={2.5} />
        </span>
      </div>
    )
  }

  if (value === 'no') {
    return (
      <div className={base}>
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gray-100 text-gray-300">
          <X className="w-4 h-4" strokeWidth={2} />
        </span>
      </div>
    )
  }

  if (value === 'partial') {
    return (
      <div className={base}>
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-50 text-amber-400">
          <Minus className="w-4 h-4" strokeWidth={2.5} />
        </span>
      </div>
    )
  }

  // Texte libre (ex: prix)
  return (
    <div className={base}>
      <span
        className={`text-sm font-semibold ${
          highlight ? 'text-brand-blue' : 'text-gray-500'
        }`}
      >
        {value}
      </span>
    </div>
  )
}

export function ComparisonTable() {
  const containerRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(containerRef, { once: true, margin: '-80px' })

  return (
    <section className="relative py-24 md:py-32 overflow-hidden bg-gray-950">
      {/* Fond décoratif */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff06_1px,transparent_1px),linear-gradient(to_bottom,#ffffff06_1px,transparent_1px)] bg-[size:32px_32px]" />
        <div className="absolute left-1/2 -translate-x-1/2 top-0 w-[800px] h-[400px] bg-brand-blue/10 rounded-full blur-[120px] opacity-60" />
        <div className="absolute right-0 bottom-0 w-[400px] h-[400px] bg-brand-cyan/5 rounded-full blur-[100px]" />
      </div>

      <div ref={containerRef} className="container mx-auto px-4 md:px-6 lg:px-8 relative z-10">

        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-8"
          >
            <BarChart3 className="w-4 h-4 text-brand-cyan" />
            <span className="text-sm font-medium text-gray-300 tracking-wide uppercase">
              Comparatif 2025
            </span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tightest text-white mb-6 font-display"
          >
            EduZen vs{' '}
            <span className="bg-gradient-to-r from-brand-cyan to-brand-blue bg-clip-text text-transparent">
              la concurrence
            </span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="text-lg text-gray-400 leading-relaxed"
          >
            Le seul logiciel organisme de formation avec IA intégrée, émargement QR natif et
            signature eIDAS incluse — sans option cachée.
          </motion.p>
        </div>

        {/* Tableau */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="overflow-x-auto pb-4 -mx-4 px-4 md:mx-0 md:px-0"
        >
          <div className="min-w-[720px]">
            {/* En-têtes colonnes */}
            <div className="grid grid-cols-[2fr_repeat(5,1fr)] mb-1">
              {/* Cellule vide pour colonne critères */}
              <div />

              {competitors.map((c, i) => (
                <div
                  key={c.name}
                  className={`relative rounded-t-2xl px-3 py-5 text-center ${
                    c.highlight
                      ? 'bg-gradient-to-b from-brand-blue to-brand-blue/80 shadow-xl shadow-brand-blue/30'
                      : 'bg-white/5'
                  }`}
                >
                  {c.highlight && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 px-3 py-1 rounded-full bg-brand-cyan text-gray-950 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap shadow-lg">
                      <Zap className="w-3 h-3 fill-current" />
                      {c.tag}
                    </span>
                  )}
                  <p
                    className={`font-bold text-sm md:text-base ${
                      c.highlight ? 'text-white' : 'text-gray-400'
                    }`}
                  >
                    {c.name}
                  </p>
                  <p
                    className={`text-xs mt-1 font-medium ${
                      c.highlight ? 'text-brand-cyan' : 'text-gray-600'
                    }`}
                  >
                    {c.priceNote}
                  </p>
                </div>
              ))}
            </div>

            {/* Lignes critères */}
            {criteria.map((row, rowIdx) => (
              <div
                key={row.label}
                className={`grid grid-cols-[2fr_repeat(5,1fr)] ${
                  rowIdx % 2 === 0 ? 'bg-white/[0.02]' : 'bg-transparent'
                } hover:bg-white/[0.04] transition-colors group`}
              >
                {/* Colonne critère */}
                <div className="flex flex-col justify-center py-4 pl-4 pr-6 border-r border-white/5">
                  <span className="text-sm font-semibold text-gray-200 leading-snug">
                    {row.label}
                  </span>
                  <span className="text-xs text-gray-500 mt-0.5">{row.sub}</span>
                </div>

                {/* Cellules valeurs */}
                {row.values.map((val, colIdx) => (
                  <div
                    key={colIdx}
                    className={`border-r border-white/5 last:border-r-0 ${
                      competitors[colIdx].highlight
                        ? 'bg-brand-blue/10 group-hover:bg-brand-blue/15'
                        : ''
                    }`}
                  >
                    <Cell value={val} highlight={competitors[colIdx].highlight} />
                  </div>
                ))}
              </div>
            ))}

            {/* Pied de tableau — CTA */}
            <div className="grid grid-cols-[2fr_repeat(5,1fr)] mt-1">
              <div />
              {competitors.map((c) => (
                <div
                  key={c.name}
                  className={`rounded-b-2xl px-3 py-5 flex items-center justify-center ${
                    c.highlight
                      ? 'bg-gradient-to-t from-brand-blue/80 to-brand-blue/60'
                      : 'bg-white/5'
                  }`}
                >
                  {c.highlight ? (
                    <Link
                      href="/auth/register"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-brand-cyan/90 hover:bg-brand-cyan rounded-full px-4 py-2 transition-all hover:shadow-lg hover:shadow-brand-cyan/30"
                    >
                      Essayer
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  ) : (
                    <span className="text-xs text-gray-600 font-medium">—</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Légende */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="flex flex-wrap items-center justify-center gap-6 mt-10"
        >
          {LEGEND.map((item) => (
            <div key={item.label} className="flex items-center gap-2">
              {item.icon === 'yes' && (
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-50 text-emerald-500">
                  <Check className="w-3 h-3" strokeWidth={2.5} />
                </span>
              )}
              {item.icon === 'partial' && (
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-50 text-amber-400">
                  <Minus className="w-3 h-3" strokeWidth={2.5} />
                </span>
              )}
              {item.icon === 'no' && (
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-100 text-gray-300">
                  <X className="w-3 h-3" strokeWidth={2} />
                </span>
              )}
              <span className="text-sm text-gray-500">{item.label}</span>
            </div>
          ))}
          <span className="text-xs text-gray-600 ml-4">
            * Données publiques — juin 2025
          </span>
        </motion.div>

      </div>
    </section>
  )
}
