'use client'

import { motion, useInView } from '@/components/ui/motion'
import { useRef } from 'react'
import { Check, X, Minus, ArrowRight, Zap, BarChart3 } from 'lucide-react'
import Link from 'next/link'

const competitors = [
  { name: 'EduZen',    highlight: true,  tag: 'Meilleur choix', priceNote: 'Dès 79 €/mois' },
  { name: 'Dendreo',   highlight: false, tag: '',               priceNote: 'Dès 119 €/mois' },
  { name: 'Digiforma', highlight: false, tag: '',               priceNote: 'Dès 89 €/mois' },
  { name: 'Yparéo',    highlight: false, tag: '',               priceNote: 'Sur devis' },
  { name: 'Syforma',   highlight: false, tag: '',               priceNote: 'Dès 59 €/mois' },
]

type CellValue = 'yes' | 'yes-paid' | 'partial' | 'no' | string

interface Criterion {
  label: string
  sub: string
  values: CellValue[]
  badge?: string
  noScore?: boolean
}

const criteria: Criterion[] = [
  {
    label: 'Conformité Qualiopi',
    sub: 'Génération automatique des documents obligatoires',
    values: ['yes', 'yes', 'yes', 'yes', 'partial'],
  },
  {
    label: 'Émargement QR code',
    sub: 'Signature des présences par QR code ou tactile',
    values: ['yes', 'yes', 'yes', 'yes', 'yes-paid'],
  },
  {
    label: 'Signature électronique eIDAS',
    sub: 'Valeur juridique — incluse ou en option ?',
    values: ['yes', 'yes-paid', 'yes-paid', 'yes-paid', 'yes-paid'],
  },
  {
    label: 'Facturation CPF / OPCO',
    sub: 'Subrogations et suivi des encaissements',
    values: ['yes', 'yes', 'yes', 'yes', 'partial'],
  },
  {
    label: 'Automatisation des relances',
    sub: 'Convocations, rappels J-1, enquêtes de satisfaction',
    values: ['yes', 'yes', 'yes', 'yes', 'partial'],
  },
  {
    label: 'Génération auto post-formation',
    sub: 'Attestations, certificats, bilans après chaque session',
    values: ['yes', 'yes', 'yes', 'yes', 'partial'],
  },
  {
    label: 'Agent IA intégré',
    sub: 'Programmes, bilans pédagogiques, supports de cours',
    values: ['yes', 'no', 'no', 'no', 'no'],
    badge: 'Exclusif',
  },
  {
    label: 'Portail e-learning / LMS',
    sub: 'Formations en ligne incluses de base',
    values: ['yes', 'yes-paid', 'yes', 'yes-paid', 'no'],
  },
  {
    label: 'API & intégrations tierces',
    sub: 'Comptabilité, CRM, outils métiers',
    values: ['yes', 'yes', 'partial', 'yes', 'no'],
  },
  {
    label: 'Support client réactif',
    sub: 'Chat + email en français, réponse sous 24 h',
    values: ['yes', 'yes', 'yes', 'yes-paid', 'partial'],
  },
  {
    label: 'Sans engagement mensuel',
    sub: 'Résiliation libre à tout moment',
    values: ['yes', 'no', 'yes', 'no', 'partial'],
  },
  {
    label: 'Rapport qualité / prix',
    sub: 'Tout inclus vs. options cachées',
    values: ['Excellent', 'Moyen', 'Bon', 'Opaque', 'Basique'],
    noScore: true,
  },
]

function countIncluded(colIdx: number) {
  return criteria.filter((c) => !c.noScore && c.values[colIdx] === 'yes').length
}

function totalScored() {
  return criteria.filter((c) => !c.noScore).length
}

const TEXT_COLORS: Record<string, string> = {
  Excellent: 'text-emerald-600 bg-emerald-50 ring-1 ring-emerald-200',
  Bon:       'text-brand-blue bg-brand-blue/[0.07] ring-1 ring-brand-blue/20',
  Moyen:     'text-amber-600  bg-amber-50  ring-1 ring-amber-200',
  Opaque:    'text-gray-500   bg-gray-100  ring-1 ring-gray-200',
  Basique:   'text-gray-400   bg-gray-50   ring-1 ring-gray-150',
}

const LEGEND = [
  { type: 'yes'      as CellValue, label: 'Inclus de base' },
  { type: 'yes-paid' as CellValue, label: 'Option payante' },
  { type: 'partial'  as CellValue, label: 'Limité / basique' },
  { type: 'no'       as CellValue, label: 'Non disponible' },
]

function CellIcon({ value, highlight }: { value: CellValue; highlight: boolean }) {
  if (value === 'yes') {
    return (
      <span
        className={`inline-flex items-center justify-center w-7 h-7 rounded-full ${
          highlight
            ? 'bg-brand-cyan/20 text-brand-cyan'
            : 'bg-emerald-50 text-emerald-500'
        }`}
      >
        <Check className="w-4 h-4" strokeWidth={2.5} />
      </span>
    )
  }
  if (value === 'yes-paid') {
    return (
      <div className="flex flex-col items-center gap-0.5">
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-50 text-amber-500">
          <Check className="w-4 h-4" strokeWidth={2} />
        </span>
        <span className="text-[9px] text-amber-400 font-semibold tracking-wide leading-none">
          payant
        </span>
      </div>
    )
  }
  if (value === 'partial') {
    return (
      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gray-100 text-gray-400">
        <Minus className="w-4 h-4" strokeWidth={2} />
      </span>
    )
  }
  if (value === 'no') {
    return (
      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-red-50 text-red-300">
        <X className="w-4 h-4" strokeWidth={2} />
      </span>
    )
  }
  const colorClass = TEXT_COLORS[value as string] ?? 'text-gray-500 bg-gray-100'
  return (
    <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${colorClass}`}>
      {value}
    </span>
  )
}

function Cell({ value, highlight }: { value: CellValue; highlight: boolean }) {
  return (
    <div className="flex items-center justify-center h-full py-4 px-2">
      <CellIcon value={value} highlight={highlight} />
    </div>
  )
}

export function ComparisonTable() {
  const containerRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(containerRef, { once: true, margin: '-80px' })
  const total = totalScored()

  return (
    <section className="relative py-24 md:py-32 overflow-hidden bg-[#FDFDFD]">
      {/* Fond décoratif léger */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[400px] bg-gradient-to-b from-brand-blue/[0.04] to-transparent blur-[80px]" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-brand-cyan/[0.03] blur-[100px]" />
      </div>

      <div ref={containerRef} className="container mx-auto px-4 md:px-6 lg:px-8 relative z-10">

        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-blue/[0.06] border border-brand-blue/15 mb-8"
          >
            <BarChart3 className="w-4 h-4 text-brand-blue" />
            <span className="text-[11px] font-bold text-brand-blue uppercase tracking-[0.15em]">
              Comparatif objectif 2025
            </span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tightest text-gray-900 mb-6 font-display"
          >
            EduZen vs{' '}
            <span className="bg-gradient-to-r from-brand-blue to-brand-cyan bg-clip-text text-transparent">
              la concurrence
            </span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="text-lg text-gray-500 leading-relaxed"
          >
            Un comparatif honnête des principaux logiciels du marché.{' '}
            <span className="text-gray-900 font-medium">
              EduZen est le seul à tout inclure d'emblée
            </span>{' '}
            — sans surprises sur la facture.
          </motion.p>
        </div>

        {/* Tableau */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="overflow-x-auto pb-4 -mx-4 px-4 md:mx-0 md:px-0"
        >
          <div className="min-w-[780px] rounded-3xl overflow-hidden border border-gray-100/80 shadow-2xl shadow-gray-900/[0.06]">

            {/* En-têtes colonnes */}
            <div className="grid grid-cols-[2.4fr_repeat(5,1fr)]">
              <div className="bg-gray-50 px-5 py-5 border-b border-gray-100 flex items-end">
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                  Fonctionnalité
                </span>
              </div>
              {competitors.map((c) => (
                <div
                  key={c.name}
                  className={`relative px-2 py-5 text-center border-b ${
                    c.highlight
                      ? 'bg-gradient-to-b from-brand-blue to-brand-blue-dark border-transparent'
                      : 'bg-gray-50 border-gray-100'
                  }`}
                >
                  {c.highlight && (
                    <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 px-3 py-1 rounded-full bg-brand-cyan text-gray-900 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap shadow-lg shadow-brand-cyan/30">
                      <Zap className="w-2.5 h-2.5 fill-current" />
                      {c.tag}
                    </span>
                  )}
                  <p className={`font-bold text-sm ${c.highlight ? 'text-white' : 'text-gray-700'}`}>
                    {c.name}
                  </p>
                  <p className={`text-[11px] mt-1 font-medium ${c.highlight ? 'text-brand-cyan' : 'text-gray-400'}`}>
                    {c.priceNote}
                  </p>
                </div>
              ))}
            </div>

            {/* Lignes critères */}
            {criteria.map((row, rowIdx) => (
              <div
                key={row.label}
                className={`grid grid-cols-[2.4fr_repeat(5,1fr)] group transition-colors ${
                  row.badge
                    ? 'bg-brand-blue/[0.025] hover:bg-brand-blue/[0.05]'
                    : rowIdx % 2 === 0
                    ? 'bg-white hover:bg-gray-50/60'
                    : 'bg-gray-50/50 hover:bg-gray-50'
                }`}
              >
                {/* Critère */}
                <div className="flex flex-col justify-center py-4 pl-5 pr-4 border-r border-gray-100">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-sm font-semibold leading-snug ${
                        row.badge ? 'text-brand-blue' : 'text-gray-800'
                      }`}
                    >
                      {row.label}
                    </span>
                    {row.badge && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-brand-blue/10 text-brand-blue uppercase tracking-wider">
                        {row.badge}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-400 mt-0.5">{row.sub}</span>
                </div>

                {/* Cellules */}
                {row.values.map((val, colIdx) => (
                  <div
                    key={colIdx}
                    className={`border-r border-gray-100/80 last:border-r-0 ${
                      competitors[colIdx].highlight
                        ? 'bg-brand-blue/[0.05] group-hover:bg-brand-blue/[0.09]'
                        : ''
                    }`}
                  >
                    <Cell value={val} highlight={competitors[colIdx].highlight} />
                  </div>
                ))}
              </div>
            ))}

            {/* Ligne score */}
            <div className="grid grid-cols-[2.4fr_repeat(5,1fr)] bg-gray-50 border-t border-gray-100">
              <div className="flex flex-col justify-center py-4 pl-5 pr-4 border-r border-gray-100">
                <span className="text-sm font-bold text-gray-800">Fonctionnalités incluses</span>
                <span className="text-xs text-gray-400 mt-0.5">Sans supplément ni option</span>
              </div>
              {competitors.map((c, colIdx) => {
                const count = countIncluded(colIdx)
                return (
                  <div
                    key={c.name}
                    className={`flex items-center justify-center py-4 border-r border-gray-100 last:border-r-0 ${
                      c.highlight ? 'bg-brand-blue/[0.05]' : ''
                    }`}
                  >
                    <span
                      className={`text-sm font-black tabular-nums ${
                        c.highlight
                          ? 'text-brand-blue'
                          : count >= 8
                          ? 'text-emerald-500'
                          : count >= 5
                          ? 'text-gray-600'
                          : 'text-gray-400'
                      }`}
                    >
                      {count}
                      <span className="text-xs font-normal opacity-40"> /{total}</span>
                    </span>
                  </div>
                )
              })}
            </div>

            {/* CTA footer */}
            <div className="grid grid-cols-[2.4fr_repeat(5,1fr)] border-t border-gray-100">
              <div className="bg-gray-50 px-5 py-5" />
              {competitors.map((c) => (
                <div
                  key={c.name}
                  className={`px-2 py-5 flex items-center justify-center ${
                    c.highlight
                      ? 'bg-gradient-to-t from-brand-blue-dark to-brand-blue'
                      : 'bg-gray-50'
                  }`}
                >
                  {c.highlight ? (
                    <Link
                      href="/auth/register"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-900 bg-brand-cyan hover:bg-brand-cyan/90 rounded-full px-4 py-2 transition-all duration-300 hover:shadow-lg hover:shadow-brand-cyan/40 whitespace-nowrap"
                    >
                      Essayer
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  ) : (
                    <span className="text-xs text-gray-300 font-medium">—</span>
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
          transition={{ duration: 0.6, delay: 0.55 }}
          className="flex flex-wrap items-center justify-center gap-6 mt-10"
        >
          {LEGEND.map((item) => (
            <div key={item.label} className="flex items-center gap-2">
              <CellIcon value={item.type} highlight={false} />
              <span className="text-xs text-gray-400">{item.label}</span>
            </div>
          ))}
          <span className="text-xs text-gray-300 ml-1">· Sources publiques, juin 2025</span>
        </motion.div>

      </div>
    </section>
  )
}
