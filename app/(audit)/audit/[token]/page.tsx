'use client'

/**
 * Page publique du Portail Auditeur
 * Accessible via un lien temporaire sécurisé (token)
 * URL: /audit/[token]
 */

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { AuditorPortal } from '@/components/auditor-portal/AuditorPortal'
import { Shield, AlertCircle, Clock, RefreshCw, Lock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type {
  AuditorPortalData,
  ComplianceEvidenceAutomated,
} from '@/lib/services/auditor-portal.service'

// États possibles de la page
type PageState = 'loading' | 'ready' | 'expired' | 'invalid' | 'error'

export default function AuditorPage() {
  const params = useParams()
  const token = params.token as string

  const [pageState, setPageState] = useState<PageState>('loading')
  const [data, setData] = useState<AuditorPortalData | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Charger les données du portail
  useEffect(() => {
    async function loadData() {
      if (!token) {
        setPageState('invalid')
        return
      }

      try {
        const response = await fetch(`/api/auditor/public?token=${encodeURIComponent(token)}`)
        const result = await response.json()

        if (!response.ok) {
          if (response.status === 404) {
            setPageState('expired')
          } else {
            setError(result.error || 'Erreur lors du chargement')
            setPageState('error')
          }
          return
        }

        setData(result.data)
        setPageState('ready')
      } catch (err) {
        setError('Erreur de connexion au serveur')
        setPageState('error')
      }
    }

    loadData()
  }, [token])

  // Recherche par échantillon
  const handleSearch = useCallback(
    async (searchTerm: string): Promise<ComplianceEvidenceAutomated[]> => {
      try {
        const response = await fetch(`/api/auditor/public?token=${encodeURIComponent(token)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ searchTerm }),
        })

        if (!response.ok) {
          return []
        }

        const result = await response.json()
        return result.data?.results || []
      } catch {
        return []
      }
    },
    [token]
  )

  // Export PDF
  const handleExportPdf = useCallback(() => {
    // TODO: Implémenter l'export PDF
    // Pour l'instant, on ouvre une version imprimable
    window.print()
  }, [])

  // Visualiser un document
  const handleViewDocument = useCallback((url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer')
  }, [])

  // Affichage selon l'état
  if (pageState === 'loading') {
    return (
      <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-slate-600">Chargement du portail auditeur...</p>
        </div>
      </div>
    )
  }

  if (pageState === 'expired') {
    return (
      <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-amber-100 flex items-center justify-center">
              <Clock className="h-8 w-8 text-amber-600" />
            </div>
            <CardTitle className="text-xl">Lien expiré</CardTitle>
            <CardDescription>
              Ce lien d'accès auditeur n'est plus valide.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-slate-500 mb-6">
              Les liens d'accès auditeur sont temporaires et expirent après la durée
              définie par l'organisme de formation. Veuillez contacter l'organisme
              pour obtenir un nouveau lien.
            </p>
            <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
              <Lock className="h-3 w-3" />
              <span>Sécurité EDUZEN</span>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (pageState === 'invalid') {
    return (
      <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-red-100 flex items-center justify-center">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
            <CardTitle className="text-xl">Lien invalide</CardTitle>
            <CardDescription>
              Ce lien d'accès n'est pas reconnu par notre système.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-slate-500 mb-6">
              Vérifiez que vous avez copié l'intégralité du lien fourni par
              l'organisme de formation. Si le problème persiste, contactez
              l'organisme pour obtenir un nouveau lien.
            </p>
            <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
              <Shield className="h-3 w-3" />
              <span>Portail sécurisé EDUZEN</span>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (pageState === 'error') {
    return (
      <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-red-100 flex items-center justify-center">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
            <CardTitle className="text-xl">Erreur</CardTitle>
            <CardDescription>
              Une erreur s'est produite lors du chargement du portail.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-slate-500 mb-6">
              {error || 'Erreur inconnue'}
            </p>
            <Button
              onClick={() => window.location.reload()}
              variant="outline"
              className="mx-auto"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Réessayer
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // État prêt - Afficher le portail
  if (data) {
    return (
      <AuditorPortal
        data={data}
        onSearch={data.link.permissions.sampling_mode ? handleSearch : undefined}
        onExportPdf={data.link.permissions.export_pdf ? handleExportPdf : undefined}
        onViewDocument={handleViewDocument}
      />
    )
  }

  return null
}
