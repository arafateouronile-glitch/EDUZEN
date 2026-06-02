'use client'

import { motion, useInView } from '@/components/ui/motion'
import { useRef } from 'react'
import { Check, X, Minus, ArrowRight, Zap, BarChart3 } from 'lucide-react'
import Link from 'next/link'

const competitors = [
  { name: 'EduZen',   highlight: true,  tag: 'Meilleur choix', priceNote: 'Dès 79 €/mois' },
  { name: 'Dendreo',  highlight: false, tag: '',               priceNote: 'Dès 119 €/mois' },
  { name: 'Digiforma',highlight: false, tag: '',               priceNote: 'Dès 89 €/mois' },
  { name: 'Yparéo',   highlight: false, tag: '',               priceNote: 'Sur devis' },
  { name: 'Syforma',  highlight: false, tag: '',               priceNote: 'Dès 59 €/mois' },
]

// 'yes'      → ✓ vert  (inclus dans le plan de base)
// 'yes-paid' → ✓ ambre (la fonctionnalité existe mais en option payante)
// 'partial'  → ○ ambre (présent mais limité / basique)
// 'no'       → ✗ gris  (absent)
type CellValue = 'yes' | 'yes-paid' | 'partial' | 'no'

interface Criterion {
  label: string
  sub: string
  values: CellValue[]
  highlight?: boolean // met en avant les critères où EduZen est seul
}

const criteria: Criterion[] = [
  {
    label: 'Conformité Qualiopi',
    sub: 'Génération automatique des documents obligatoires',
    values: ['yes', 'yes', 'yes', 'yes', 'partial'],
  },
  {
    label: 'Émargement QR code',
    sub: 'Signature des présences par QR ou tactile',
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
    label: 'Agent IA intégré',
    sub: 'Programmes pédagogiques, bilans, supports',
    values: ['yes', 'no', 'no', 'no', 'no'],
    highlight: true,
  },
  {
    label: 'Portail e-learning / LMS',
    sub: 'Formations en ligne incluses de base',
    values: ['yes', 'yes-paid', 'yes', 'yes-paid', 'no'],
  },
  {
    label: 'API & intégrations tierces',
    sub: 'Connexion comptabilité, CRM, outils métiers',
    values: ['yes', 'yes', 'partial', 'yes', 'no'],
  },
  {
    label: 'Application mobile',
    sub: 'Gestion et émargement depuis le terrain',
    values: ['yes', 'yes', 'yes', 'yes', 'partial'],
  },
  {
    label: 'Sans engagement mensuel',
    sub: 'Résiliation libre à tout moment',
    values: ['yes', 'no', 'yes', 'no', 'partial'],
  },
]

// Compte uniquement les 'yes' (vraiment inclus) pour la ligne score
function countIncluded(colIdx: number) {
  return criteria.filter((c) => c.values[colIdx] === 'yes').length
}

const LEGEND: { type: CellValue; label: string }[] = [
  { type: 'yes',      label: 'Inclus de base' },
  { type: 'yes-paid', label: 'Option payante' },
  { type: 'partial',  label: 'Limité / basique' },
  { type: 'no',       label: 'Non disponible' },
]

function CellIcon({ value, highlight }: { value: CellValue; highlight: boolean }) {
  if (value === 'yes') {
    return (
      <span
        className={`inline-flex items-center justify-center w-7 h-7 rounded-full ${
          highlight ? 'bg-brand-cyan/20 text-brand-cyan' : 'bg-emerald-500/10 text-emerald-400'
        }`}
      >
        <Check className="w-4 h-4" strokeWidth={2.5} />
      </span>
    )
  }
  if (value === 'yes-paid') {
    return (
      <div className="flex flex-col items-center gap-0.5">
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-500/10 text-amber-400">
          <Check className="w-4 h-4" strokeWidth={2} />
        </span>
        <span className="text-[9px] text-amber-500/60 font-semibold tracking-wide leading-none">
          payant
        </span>
      </div>
    )
  }
  if (value === 'partial') {
    return (
      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-white/5 text-gray-500">
        <Minus className="w-4 h-4" strokeWidth={2} />
      </span>
    )
  }
  // 'no'
  return (
    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-white/[0.03] text-gray-700">
      <X className="w-4 h-4" strokeWidth={1.5} />
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

  return (
    <section className="relative py-24 md:py-32 overflow-hidden bg-gray-950">
      {/* Fond décoratif */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:32px_32px]" />
        <div className="absolute left-1/2 -translate-x-1/2 top-0 w-[900px] h-[500px] bg-brand-blue/10 rounded-full blur-[130px] opacity-50" />
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
              Comparatif objectif 2025
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
            Un comparatif honnête des principaux logiciels du marché.{' '}
            <span className="text-white font-medium">
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
          <div className="min-w-[760px]">

            {/* En-têtes colonnes */}
            <div className="grid grid-cols-[2.2fr_repeat(5,1fr)] mb-1">
              <div />
              {competitors.map((c) => (
                <div
                  key={c.name}
                  className={`relative rounded-t-2xl px-2 py-5 text-center ${
                    c.highlight
                      ? 'bg-gradient-to-b from-brand-blue to-brand-blue/80 shadow-xl shadow-brand-blue/30'
                      : 'bg-white/5'
                  }`}
                >
                  {c.highlight && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-brand-cyan text-gray-950 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap shadow-lg">
                      <Zap className="w-2.5 h-2.5 fill-current" />
                      {c.tag}
                    </span>
                  )}
                  <p className={`font-bold text-sm ${c.highlight ? 'text-white' : 'text-gray-400'}`}>
                    {c.name}
                  </p>
                  <p className={`text-[11px] mt-1 font-medium ${c.highlight ? 'text-brand-cyan' : 'text-gray-600'}`}>
                    {c.priceNote}
                  </p>
                </div>
              ))}
            </div>

            {/* Lignes critères */}
            {criteria.map((row, rowIdx) => (
              <div
                key={row.label}
                className={`grid grid-cols-[2.2fr_repeat(5,1fr)] transition-colors group ${
                  row.highlight
                    ? 'bg-brand-cyan/[0.04] hover:bg-brand-cyan/[0.07]'
                    : rowIdx % 2 === 0
                    ? 'bg-white/[0.02] hover:bg-white/[0.04]'
                    : 'hover:bg-white/[0.03]'
                }`}
              >
                {/* Critère */}
                <div className="flex flex-col justify-center py-4 pl-4 pr-4 border-r border-white/5">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-semibold leading-snug ${row.highlight ? 'text-brand-cyan' : 'text-gray-200'}`}>
                      {row.label}
                    </span>
                    {row.highlight && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-brand-cyan/20 text-brand-cyan uppercase tracking-wider">
                        Exclusif
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-500 mt-0.5">{row.sub}</span>
                </div>

                {/* Cellules */}
                {row.values.map((val, colIdx) => (
                  <div
                    key={colIdx}
                    className={`border-r border-white/5 last:border-r-0 ${
                      competitors[colIdx].highlight ? 'bg-brand-blue/10 group-hover:bg-brand-blue/15' : ''
                    }`}
                  >
                    <Cell value={val} highlight={competitors[colIdx].highlight} />
                  </div>
                ))}
              </div>
            ))}

            {/* Ligne score */}
            <div className="grid grid-cols-[2.2fr_repeat(5,1fr)] mt-1 bg-white/[0.03]">
              <div className="flex flex-col justify-center py-4 pl-4 pr-4 border-r border-white/5">
                <span className="text-sm font-bold text-gray-200">Fonctionnalités incluses</span>
                <span className="text-xs text-gray-500 mt-0.5">Sans option payante</span>
              </div>
              {competitors.map((c, colIdx) => {
                const count = countIncluded(colIdx)
                const total = criteria.length
                return (
                  <div
                    key={c.name}
                    className={`flex items-center justify-center py-4 border-r border-white/5 last:border-r-0 ${
                      c.highlight ? 'bg-brand-blue/10' : ''
                    }`}
                  >
                    <span
                      className={`text-sm font-black ${
                        c.highlight
                          ? 'text-brand-cyan'
                          : count >= 7
                          ? 'text-emerald-400'
                          : count >= 4
                          ? 'text-gray-300'
                          : 'text-gray-600'
                      }`}
                    >
                      {count}
                      <span className="text-xs font-normal opacity-50"> / {total}</span>
                    </span>
                  </div>
                )
              })}
            </div>

            {/* CTA footer */}
            <div className="grid grid-cols-[2.2fr_repeat(5,1fr)] mt-1">
              <div />
              {competitors.map((c) => (
                <div
                  key={c.name}
                  className={`rounded-b-2xl px-2 py-5 flex items-center justify-center ${
                    c.highlight
                      ? 'bg-gradient-to-t from-brand-blue/80 to-brand-blue/60'
                      : 'bg-white/5'
                  }`}
                >
                  {c.highlight ? (
                    <Link
                      href="/auth/register"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-brand-cyan/90 hover:bg-brand-cyan rounded-full px-4 py-2 transition-all hover:shadow-lg hover:shadow-brand-cyan/30 whitespace-nowrap"
                    >
                      Essayer
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  ) : (
                    <span className="text-xs text-gray-700 font-medium">—</span>
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
          className="flex flex-wrap items-center justify-center gap-5 mt-10"
        >
          {LEGEND.map((item) => (
            <div key={item.label} className="flex items-center gap-2">
              <CellIcon value={item.type} highlight={false} />
              <span className="text-xs text-gray-500">{item.label}</span>
            </div>
          ))}
          <span className="text-xs text-gray-700 ml-2">· Sources publiques, juin 2025</span>
        </motion.div>

      </div>
    </section>
  )
}
