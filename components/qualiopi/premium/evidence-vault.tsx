'use client'

import { motion, AnimatePresence } from '@/components/ui/motion'
import { cn } from '@/lib/utils'
import {
  FileText,
  Shield,
  Clock,
  Link2,
  ChevronRight,
  Sparkles,
  Upload,
  Zap,
  Eye,
} from 'lucide-react'
import { GlassCardPremium } from './glass-card-premium'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'

// Types d'evidence
type EvidenceSource = 'system' | 'manual_upload' | 'integration' | 'automated_detection'
type EvidenceType =
  | 'document'
  | 'event'
  | 'data_point'
  | 'signature'
  | 'attendance'
  | 'evaluation'
  | 'feedback'
  | 'contract'
  | 'certificate'
  | 'system_generated'

interface Evidence {
  id: string
  title: string
  indicator_number: number
  evidence_type: EvidenceType
  source: EvidenceSource
  entity_name?: string
  event_date: string
  created_at: string
  confidence_score: number
  file_url?: string
}

interface EvidenceVaultProps {
  evidence: Evidence[]
  onViewEvidence?: (evidence: Evidence) => void
  className?: string
}

// Configuration des sources
const SOURCE_CONFIG = {
  system: {
    label: 'Système EDUZEN',
    color: 'bg-[#34B9EE]/10 text-[#34B9EE] border-[#34B9EE]/20',
    icon: Zap,
    description: 'Généré automatiquement par EDUZEN',
  },
  automated_detection: {
    label: 'Détection Auto',
    color: 'bg-purple-100 text-purple-700 border-purple-200',
    icon: Sparkles,
    description: 'Détecté automatiquement',
  },
  integration: {
    label: 'Intégration',
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    icon: Link2,
    description: 'Via intégration externe',
  },
  manual_upload: {
    label: 'Manuel',
    color: 'bg-amber-100 text-amber-700 border-amber-200',
    icon: Upload,
    description: 'Ajouté manuellement',
  },
}

// Configuration des types de preuve
const EVIDENCE_TYPE_ICONS = {
  document: FileText,
  event: Clock,
  data_point: Zap,
  signature: FileText,
  attendance: Clock,
  evaluation: FileText,
  feedback: FileText,
  contract: FileText,
  certificate: Shield,
  system_generated: Sparkles,
}

// Badge de source avec tooltip style
function SourceBadge({ source }: { source: EvidenceSource }) {
  const config = SOURCE_CONFIG[source]
  const Icon = config.icon

  return (
    <Badge
      variant="outline"
      className={cn(
        'flex items-center gap-1 px-2 py-0.5 text-xs font-medium',
        config.color
      )}
    >
      <Icon className="h-3 w-3" />
      <span>{config.label}</span>
    </Badge>
  )
}

// Ligne d'evidence individuelle
function EvidenceRow({
  evidence,
  onView,
  delay = 0,
}: {
  evidence: Evidence
  onView?: () => void
  delay?: number
}) {
  const Icon = EVIDENCE_TYPE_ICONS[evidence.evidence_type] || FileText
  const isAuto = evidence.source === 'system' || evidence.source === 'automated_detection'

  return (
    <motion.div
      className={cn(
        'group relative flex items-center gap-3 rounded-xl p-3',
        'bg-white/50 dark:bg-slate-800/50',
        'border border-slate-200/50 dark:border-slate-700/50',
        'hover:bg-white/80 dark:hover:bg-slate-800/80',
        'hover:shadow-md hover:border-slate-200',
        'transition-all duration-200 cursor-pointer'
      )}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.3 }}
      onClick={onView}
    >
      {/* Icône avec indicateur auto */}
      <div className="relative">
        <div
          className={cn(
            'flex h-9 w-9 items-center justify-center rounded-lg',
            isAuto
              ? 'bg-gradient-to-br from-[#34B9EE] to-[#0EA5E9]'
              : 'bg-slate-100 dark:bg-slate-700'
          )}
        >
          <Icon className={cn('h-4 w-4', isAuto ? 'text-white' : 'text-slate-500')} />
        </div>

        {/* Badge "Liaison Automatique" */}
        {isAuto && (
          <motion.div
            className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#34B9EE] shadow-sm"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: delay + 0.2, type: 'spring' }}
          >
            <Link2 className="h-2.5 w-2.5 text-white" />
          </motion.div>
        )}
      </div>

      {/* Contenu */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm text-slate-800 dark:text-white truncate">
            {evidence.title}
          </span>
          <Badge
            variant="outline"
            className="shrink-0 bg-[#274472]/5 text-[#274472] border-[#274472]/20 text-xs"
          >
            Ind. {evidence.indicator_number}
          </Badge>
        </div>

        <div className="flex items-center gap-2 mt-1">
          <SourceBadge source={evidence.source} />
          {evidence.entity_name && (
            <span className="text-xs text-slate-500 truncate">
              {evidence.entity_name}
            </span>
          )}
        </div>
      </div>

      {/* Timestamp et actions */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-xs text-slate-400">
          {formatDistanceToNow(new Date(evidence.event_date), {
            addSuffix: true,
            locale: fr,
          })}
        </span>

        <div
          className={cn(
            'opacity-0 group-hover:opacity-100',
            'flex items-center justify-center h-7 w-7 rounded-lg',
            'bg-[#274472]/5 hover:bg-[#274472]/10',
            'transition-all duration-200'
          )}
        >
          <Eye className="h-3.5 w-3.5 text-[#274472]" />
        </div>
      </div>

      {/* Confiance indicator */}
      {evidence.confidence_score >= 100 && (
        <div className="absolute -left-0.5 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r-full bg-gradient-to-b from-green-400 to-green-600" />
      )}
    </motion.div>
  )
}

export function EvidenceVault({ evidence, onViewEvidence, className }: EvidenceVaultProps) {
  // Stats rapides
  const autoCount = evidence.filter(
    (e) => e.source === 'system' || e.source === 'automated_detection'
  ).length
  const manualCount = evidence.length - autoCount
  const autoPercentage = evidence.length > 0 ? Math.round((autoCount / evidence.length) * 100) : 0

  return (
    <GlassCardPremium variant="default" className={cn('p-5', className)} delay={0.2}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#274472] to-[#1a2f4a]">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-space-grotesk font-bold text-[#274472]">
              Coffre des Preuves
            </h3>
            <p className="text-xs text-slate-500">
              Dernières preuves collectées
            </p>
          </div>
        </div>

        <Button variant="ghost" size="sm" className="text-[#34B9EE] hover:bg-[#34B9EE]/10">
          Voir tout
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-4 mb-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-[#34B9EE]" />
          <span className="text-sm font-medium">{autoCount} automatiques</span>
        </div>
        <div className="h-4 w-px bg-slate-200" />
        <div className="flex items-center gap-2">
          <Upload className="h-4 w-4 text-amber-500" />
          <span className="text-sm font-medium">{manualCount} manuelles</span>
        </div>
        <div className="flex-1" />
        <Badge
          variant="outline"
          className={cn(
            'font-semibold',
            autoPercentage >= 80
              ? 'bg-green-100 text-green-700 border-green-200'
              : autoPercentage >= 50
              ? 'bg-[#34B9EE]/10 text-[#34B9EE] border-[#34B9EE]/20'
              : 'bg-amber-100 text-amber-700 border-amber-200'
          )}
        >
          {autoPercentage}% auto
        </Badge>
      </div>

      {/* Liste des preuves */}
      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
        <AnimatePresence>
          {evidence.length === 0 ? (
            <motion.div
              className="flex flex-col items-center justify-center py-8 text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <Shield className="h-12 w-12 text-slate-300 mb-3" />
              <p className="text-sm text-slate-500">
                Aucune preuve collectée pour le moment
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Les preuves seront automatiquement ajoutées lors de vos actions
              </p>
            </motion.div>
          ) : (
            evidence.slice(0, 10).map((item, index) => (
              <EvidenceRow
                key={item.id}
                evidence={item}
                onView={() => onViewEvidence?.(item)}
                delay={index * 0.05}
              />
            ))
          )}
        </AnimatePresence>
      </div>

      {evidence.length > 10 && (
        <motion.div
          className="mt-3 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          <Button variant="outline" size="sm" className="text-xs">
            Voir {evidence.length - 10} preuves supplémentaires
          </Button>
        </motion.div>
      )}
    </GlassCardPremium>
  )
}
