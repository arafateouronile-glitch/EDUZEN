'use client'

/**
 * BPF Cerfa Export - Export PDF au format Cerfa 10443
 * Génère un PDF reprenant exactement la mise en page du formulaire officiel
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { BPFCerfaData, BPF_CATEGORIES, BPFCategory } from '@/lib/services/bpf.service'
import {
  Download,
  FileText,
  AlertTriangle,
  CheckCircle,
  Printer,
  Loader2,
  Building,
  Calendar,
  Euro,
  Users,
  Clock,
} from 'lucide-react'

interface BPFCerfaExportProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  data: BPFCerfaData | null
  loading?: boolean
  onExport: () => Promise<void>
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(amount)
}

const formatNumber = (num: number) => {
  return new Intl.NumberFormat('fr-FR').format(num)
}

export function BPFCerfaExport({
  open,
  onOpenChange,
  data,
  loading,
  onExport,
}: BPFCerfaExportProps) {
  const [exporting, setExporting] = useState(false)

  const handleExport = async () => {
    setExporting(true)
    try {
      await onExport()
    } finally {
      setExporting(false)
    }
  }

  if (!data) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-auto">
        <DialogHeader className="pb-4 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-md">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-gray-900">
                Export Cerfa BPF {data.year}
              </DialogTitle>
              <DialogDescription className="text-sm">
                Formulaire Cerfa 10443 - Bilan Pédagogique et Financier
              </DialogDescription>
            </div>
          </div>

          {/* Warnings */}
          {(data.hasCriticalIssues || data.hasWarnings) && (
            <div
              className={`mt-4 p-3 rounded-lg border ${
                data.hasCriticalIssues
                  ? 'bg-red-50 border-red-200'
                  : 'bg-amber-50 border-amber-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <AlertTriangle
                  className={`h-5 w-5 ${data.hasCriticalIssues ? 'text-red-500' : 'text-amber-500'}`}
                />
                <span
                  className={`font-medium ${data.hasCriticalIssues ? 'text-red-700' : 'text-amber-700'}`}
                >
                  {data.hasCriticalIssues
                    ? 'Des incohérences critiques ont été détectées'
                    : 'Attention : des données peuvent être incomplètes'}
                </span>
              </div>
              <p
                className={`mt-1 text-sm ${data.hasCriticalIssues ? 'text-red-600' : 'text-amber-600'}`}
              >
                {data.inconsistencies.length} problème{data.inconsistencies.length > 1 ? 's' : ''}{' '}
                détecté{data.inconsistencies.length > 1 ? 's' : ''}. Corrigez-les avant de soumettre
                votre BPF.
              </p>
            </div>
          )}
        </DialogHeader>

        {/* Preview content */}
        <div className="py-6 space-y-6">
          {/* Organization Info */}
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center gap-2 mb-3">
              <Building className="h-4 w-4 text-gray-500" />
              <h3 className="font-semibold text-gray-900">Informations de l'organisme</h3>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Raison sociale</p>
                <p className="font-medium text-gray-900">{data.organization.name || '-'}</p>
              </div>
              <div>
                <p className="text-gray-500">N° SIRET</p>
                <p className="font-medium text-gray-900">{data.organization.siret || '-'}</p>
              </div>
              <div>
                <p className="text-gray-500">N° de déclaration d'activité</p>
                <p className="font-medium text-gray-900">{data.organization.nda_number || '-'}</p>
              </div>
              <div>
                <p className="text-gray-500">Année d'exercice</p>
                <p className="font-medium text-gray-900">{data.year}</p>
              </div>
            </div>
          </div>

          {/* Cadre F - Revenue */}
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-brand-blue-ghost px-4 py-3 border-b">
              <div className="flex items-center gap-2">
                <Euro className="h-4 w-4 text-brand-blue" />
                <h3 className="font-semibold text-gray-900">Cadre F - Origine des produits</h3>
              </div>
            </div>
            <div className="p-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 text-gray-500 font-medium">Ligne</th>
                    <th className="text-left py-2 text-gray-500 font-medium">Source de financement</th>
                    <th className="text-right py-2 text-gray-500 font-medium">Montant</th>
                  </tr>
                </thead>
                <tbody>
                  {(Object.entries(BPF_CATEGORIES) as [BPFCategory, { label: string; cerfaLine: string }][]).map(
                    ([key, config]) => {
                      const amount = data.cadreF[key as keyof typeof data.cadreF] as number
                      return (
                        <tr key={key} className="border-b last:border-0">
                          <td className="py-2 text-gray-600">{config.cerfaLine}</td>
                          <td className="py-2 text-gray-900">{config.label}</td>
                          <td className="py-2 text-right font-medium text-gray-900">
                            {formatCurrency(amount)}
                          </td>
                        </tr>
                      )
                    }
                  )}
                  <tr className="bg-gray-50 font-bold">
                    <td className="py-2 text-gray-700"></td>
                    <td className="py-2 text-gray-900">TOTAL</td>
                    <td className="py-2 text-right text-brand-blue">
                      {formatCurrency(data.cadreF.total)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Cadre G - Students */}
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-brand-cyan-ghost px-4 py-3 border-b">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-brand-cyan" />
                <h3 className="font-semibold text-gray-900">Cadre G - Stagiaires</h3>
              </div>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 uppercase">Total stagiaires</p>
                  <p className="text-2xl font-bold text-gray-900">{formatNumber(data.cadreG.total)}</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-xs text-gray-500 uppercase">Hommes</p>
                  <p className="text-xl font-bold text-blue-700">{formatNumber(data.cadreG.men)}</p>
                </div>
                <div className="p-3 bg-pink-50 rounded-lg">
                  <p className="text-xs text-gray-500 uppercase">Femmes</p>
                  <p className="text-xl font-bold text-pink-700">{formatNumber(data.cadreG.women)}</p>
                </div>
                <div className="p-3 bg-amber-50 rounded-lg">
                  <p className="text-xs text-gray-500 uppercase">Moins de 26 ans</p>
                  <p className="text-xl font-bold text-amber-700">
                    {formatNumber(data.cadreG.under_26)}
                  </p>
                </div>
                <div className="p-3 bg-emerald-50 rounded-lg">
                  <p className="text-xs text-gray-500 uppercase">Plus de 45 ans</p>
                  <p className="text-xl font-bold text-emerald-700">
                    {formatNumber(data.cadreG.over_45)}
                  </p>
                </div>
                <div className="p-3 bg-purple-50 rounded-lg">
                  <p className="text-xs text-gray-500 uppercase">En situation de handicap</p>
                  <p className="text-xl font-bold text-purple-700">
                    {formatNumber(data.cadreG.disabled)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Cadre H - Activity */}
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-green-50 px-4 py-3 border-b">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-green-600" />
                <h3 className="font-semibold text-gray-900">Cadre H - Bilan d'activité</h3>
              </div>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 uppercase">Heures de formation</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatNumber(data.cadreH.total_hours)}h
                  </p>
                </div>
                <div className="p-3 bg-indigo-50 rounded-lg">
                  <p className="text-xs text-gray-500 uppercase">Heures-stagiaires</p>
                  <p className="text-2xl font-bold text-indigo-700">
                    {formatNumber(data.cadreH.trainee_hours)}h
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    (heures × stagiaires présents)
                  </p>
                </div>
                <div className="p-3 bg-cyan-50 rounded-lg">
                  <p className="text-xs text-gray-500 uppercase">Sessions réalisées</p>
                  <p className="text-2xl font-bold text-cyan-700">
                    {formatNumber(data.cadreH.sessions_count)}
                  </p>
                </div>
                <div className="p-3 bg-violet-50 rounded-lg">
                  <p className="text-xs text-gray-500 uppercase">Programmes de formation</p>
                  <p className="text-2xl font-bold text-violet-700">
                    {formatNumber(data.cadreH.programs_count)}
                  </p>
                </div>
                <div className="p-3 bg-emerald-50 rounded-lg col-span-2">
                  <p className="text-xs text-gray-500 uppercase">Taux de présence moyen</p>
                  <p className="text-2xl font-bold text-emerald-700">
                    {data.cadreH.attendance_rate.toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Export info */}
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
            <div className="flex items-start gap-3">
              <FileText className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-700">
                <p className="font-medium mb-1">À propos de l'export</p>
                <p className="text-blue-600">
                  Le PDF généré reprend la structure du Cerfa 10443 officiel. Vous pourrez le
                  consulter avant de recopier les informations sur le formulaire en ligne de la
                  DREETS.
                </p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="border-t pt-4">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              {!data.hasCriticalIssues && !data.hasWarnings ? (
                <Badge className="bg-green-100 text-green-800">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Données validées
                </Badge>
              ) : (
                <Badge className="bg-amber-100 text-amber-800">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Vérifiez les alertes
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Annuler
              </Button>
              <Button onClick={handleExport} disabled={exporting || loading}>
                {exporting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Génération...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Télécharger le PDF
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default BPFCerfaExport
