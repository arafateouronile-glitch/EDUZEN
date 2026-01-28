'use client'

/**
 * Page de Prévisualisation Mode Auditeur
 * Permet de voir les données comme un auditeur externe le ferait
 * URL: /dashboard/qualiopi/audit-preview
 */

import { useState, useCallback, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/use-auth'
import { qualiopiService } from '@/lib/services/qualiopi.service'
import {
  QUALIOPI_REFERENTIAL,
  type AuditorPortalData,
} from '@/lib/services/auditor-portal.service'
import { createClient } from '@/lib/supabase/client'
import { AuditorPortal } from '@/components/auditor-portal/AuditorPortal'
import { motion } from '@/components/ui/motion'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Shield,
  RefreshCw,
  AlertTriangle,
  Info,
} from 'lucide-react'
import Link from 'next/link'

export default function AuditPreviewPage() {
  const { user } = useAuth()
  const supabase = createClient()
  const [showPreviewBanner, setShowPreviewBanner] = useState(true)

  // Récupérer les données de l'organisation
  const { data: organization } = useQuery({
    queryKey: ['organization', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return null
      const { data } = await supabase
        .from('organizations')
        .select('id, name, logo_url')
        .eq('id', user.organization_id)
        .single()
      return data
    },
    enabled: !!user?.organization_id,
  })

  // Récupérer les indicateurs
  const { data: indicators = [], isLoading: loadingIndicators } = useQuery({
    queryKey: ['qualiopi-indicators-preview', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return []
      return qualiopiService.getIndicators(user.organization_id)
    },
    enabled: !!user?.organization_id,
  })

  // Récupérer les preuves automatisées
  const { data: evidence = [] } = useQuery({
    queryKey: ['compliance-evidence-preview', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return []
      const { data, error } = await (supabase as any)
        .from('compliance_evidence_automated' as any)
        .select('*')
        .eq('organization_id', user.organization_id)
        .eq('status', 'valid')
        .order('event_date', { ascending: false })
        .limit(500)

      if (error) return []
      return (data || []) as any[]
    },
    enabled: !!user?.organization_id,
  })

  // Construire les données au format AuditorPortalData
  const portalData: AuditorPortalData | null = useMemo(() => {
    if (!organization || !user?.organization_id) return null

    // Enrichir les indicateurs avec les comptages de preuves
    const enrichedIndicators = indicators.map((ind: any) => {
      const indNumber = parseInt(ind.indicator_code, 10)
      const indEvidence = evidence.filter(
        (e: any) => e.indicator_number === indNumber
      )
      const autoEvidence = indEvidence.filter(
        (e: any) => e.source === 'system' || e.source === 'automated_detection'
      )

      return {
        id: ind.id,
        indicator_code: ind.indicator_code,
        indicator_name: ind.indicator_name,
        category: ind.category,
        status: ind.status,
        compliance_rate: ind.compliance_rate,
        evidence_count: indEvidence.length,
        auto_evidence_count: autoEvidence.length,
        manual_evidence_count: indEvidence.length - autoEvidence.length,
      }
    })

    // Stats globales
    const compliantIndicators = indicators.filter(
      (i: any) => i.status === 'compliant'
    ).length
    const autoEvidence = evidence.filter(
      (e: any) => e.source === 'system' || e.source === 'automated_detection'
    )

    return {
      organization: {
        id: organization.id,
        name: organization.name,
        logo_url: organization.logo_url ?? undefined,
      },
      criteria: QUALIOPI_REFERENTIAL,
      indicators: enrichedIndicators,
      evidence: evidence,
      stats: {
        total_indicators: indicators.length,
        compliant_indicators: compliantIndicators,
        compliance_rate:
          indicators.length > 0
            ? Math.round((compliantIndicators / indicators.length) * 100)
            : 0,
        total_evidence: evidence.length,
        auto_evidence_percentage:
          evidence.length > 0
            ? Math.round((autoEvidence.length / evidence.length) * 100)
            : 0,
      },
      link: {
        auditor_name: 'Mode Prévisualisation',
        auditor_organization: 'Interne',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        permissions: {
          view_indicators: true,
          view_evidence: true,
          view_corrective_actions: true,
          export_pdf: true,
          sampling_mode: true,
        },
      },
    }
  }, [organization, indicators, evidence, user?.organization_id])

  // Handlers pour la simulation (pas de vraie fonctionnalité en mode preview)
  const handleSearch = useCallback(async () => {
    return []
  }, [])

  const handleExportPdf = useCallback(() => {
    window.print()
  }, [])

  const handleViewDocument = useCallback((url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer')
  }, [])

  if (loadingIndicators) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB]">
        <div className="text-center">
          <RefreshCw className="h-12 w-12 animate-spin text-[#34B9EE] mx-auto mb-4" />
          <p className="text-slate-600">Chargement de la prévisualisation...</p>
        </div>
      </div>
    )
  }

  if (!portalData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB] p-4">
        <div className="text-center max-w-md">
          <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-800 mb-2">
            Données non disponibles
          </h2>
          <p className="text-slate-600 mb-4">
            Impossible de charger les données de prévisualisation. Vérifiez que
            votre organisation est correctement configurée.
          </p>
          <Button asChild>
            <Link href="/dashboard/qualiopi">Retour au dashboard</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      {/* Banner de prévisualisation */}
      {showPreviewBanner && (
        <motion.div
          className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-[#274472] to-[#34B9EE] text-white py-3 px-4"
          initial={{ y: -100 }}
          animate={{ y: 0 }}
          transition={{ type: 'spring', stiffness: 100 }}
        >
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Eye className="h-5 w-5" />
              <span className="font-medium">Mode Prévisualisation Auditeur</span>
              <Badge variant="outline" className="bg-white/10 text-white border-white/20">
                Interne
              </Badge>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 text-sm text-white/80 mr-4">
                <Info className="h-4 w-4" />
                <span>Ceci est une simulation de la vue auditeur</span>
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/10"
                asChild
              >
                <Link href="/dashboard/qualiopi/premium">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Retour
                </Link>
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/10 h-8 w-8"
                onClick={() => setShowPreviewBanner(false)}
              >
                <EyeOff className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Portail Auditeur */}
      <div className={showPreviewBanner ? 'pt-14' : ''}>
        <AuditorPortal
          data={portalData}
          onSearch={handleSearch}
          onExportPdf={handleExportPdf}
          onViewDocument={handleViewDocument}
        />
      </div>

      {/* Bouton flottant pour réafficher le banner */}
      {!showPreviewBanner && (
        <motion.button
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-2 bg-[#274472] text-white rounded-full shadow-lg hover:bg-[#1a2f4a] transition-colors"
          onClick={() => setShowPreviewBanner(true)}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <Eye className="h-4 w-4" />
          <span className="text-sm font-medium">Mode Prévisualisation</span>
        </motion.button>
      )}
    </div>
  )
}
