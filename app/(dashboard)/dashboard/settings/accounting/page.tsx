'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Calculator, Download, RefreshCw } from 'lucide-react'
import { useAuth } from '@/lib/hooks/use-auth'
import { useToast } from '@/components/ui/toast'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'

const ALLOWED_ROLES = ['super_admin', 'admin', 'accountant']

export default function AccountingSettingsPage() {
  const router = useRouter()
  const { addToast } = useToast()
  const { user, isLoading: authLoading } = useAuth()

  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [includePayments, setIncludePayments] = useState(true)
  const [journalCode, setJournalCode] = useState('')
  const [isExporting, setIsExporting] = useState(false)

  useEffect(() => {
    if (!authLoading && user?.role && !ALLOWED_ROLES.includes(user.role)) {
      router.push('/dashboard')
      addToast({
        type: 'error',
        title: 'Accès refusé',
        description: 'Les paramètres comptables ne sont accessibles qu\'aux administrateurs et comptables.',
      })
    }
  }, [authLoading, user?.role, router, addToast])

  const handleExportFEC = async () => {
    setIsExporting(true)
    try {
      const params = new URLSearchParams()
      if (startDate) params.set('startDate', startDate)
      if (endDate) params.set('endDate', endDate)
      params.set('includePayments', String(includePayments))
      if (journalCode.trim()) params.set('journalCode', journalCode.trim())

      const response = await fetch(`/api/accounting/fec-export?${params.toString()}`)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erreur inconnue' }))
        throw new Error(errorData.details || errorData.error || 'Erreur lors de la génération du FEC')
      }

      const blob = await response.blob()
      const disposition = response.headers.get('Content-Disposition') || ''
      const filenameMatch = disposition.match(/filename="?([^"]+)"?/)
      const filename = filenameMatch?.[1] || 'FEC.txt'

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      addToast({
        type: 'success',
        title: 'Export généré',
        description: `Le fichier ${filename} a été téléchargé avec succès.`,
      })
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Une erreur est survenue lors de l\'export FEC.',
      })
    } finally {
      setIsExporting(false)
    }
  }

  if (authLoading) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-brand-blue" />
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Paramètres comptables</h1>
        <p className="text-gray-600 mt-1">
          Configuration des paramètres comptables et de facturation
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-brand-blue" />
            Export FEC
          </CardTitle>
          <CardDescription>
            Génère un Fichier des Écritures Comptables (FEC) au format standard, à transmettre à
            votre expert-comptable ou à l&apos;administration fiscale en cas de contrôle.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault()
              handleExportFEC()
            }}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_date">Date de début</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_date">Date de fin</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
            <p className="text-sm text-muted-foreground -mt-2">
              Laissez les dates vides pour exporter toute la période.
            </p>

            <div className="flex items-center gap-2">
              <Checkbox
                id="include_payments"
                checked={includePayments}
                onCheckedChange={setIncludePayments}
              />
              <Label htmlFor="include_payments" className="cursor-pointer">
                Inclure les paiements (mouvements bancaires)
              </Label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="journal_code">Code journal (optionnel)</Label>
              <Input
                id="journal_code"
                value={journalCode}
                onChange={(e) => setJournalCode(e.target.value)}
                placeholder="VT (par défaut)"
                className="max-w-xs"
              />
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={isExporting}>
                {isExporting ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Génération...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Générer et télécharger le FEC
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
