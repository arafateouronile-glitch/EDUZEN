'use client'

import React, { useState, useMemo } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Download, CreditCard, CheckCircle, AlertCircle } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/format'
import { toast } from 'sonner'

export interface PendingCommission {
  affiliate_id: string
  name: string
  email: string
  iban: string
  total_amount: number
  count: number
}

interface AffiliatePayoutsDashboardProps {
  data: PendingCommission[]
  cycleLabel?: string
}

export function AffiliatePayoutsDashboard({ data, cycleLabel }: AffiliatePayoutsDashboardProps) {
  const [isExporting, setIsExporting] = useState(false)

  const grandTotal = useMemo(
    () => data.reduce((acc, curr) => acc + curr.total_amount, 0),
    [data]
  )

  const handleExportSEPA = async () => {
    setIsExporting(true)
    try {
      const res = await fetch('/api/super-admin/affiliation/sepa-xml', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payments: data
            .filter((a) => a.iban && a.total_amount > 0)
            .map((a) => ({
              affiliate_id: a.affiliate_id,
              name: a.name,
              iban: a.iban,
              amount: a.total_amount,
            })),
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || res.statusText)
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `sepa-affiliation-${new Date().toISOString().slice(0, 10)}.xml`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Fichier SEPA généré. Importez-le dans votre interface bancaire.')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur lors de la génération SEPA')
    } finally {
      setIsExporting(false)
    }
  }

  const monthLabel =
    cycleLabel ||
    new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Commissions à régler</h2>
          <p className="text-muted-foreground">Cycle de paiement : {monthLabel}</p>
        </div>
        <Button
          onClick={handleExportSEPA}
          disabled={isExporting || data.length === 0 || data.every((a) => !a.iban)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          {isExporting ? (
            'Génération…'
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Générer Virement SEPA XML
            </>
          )}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total à payer</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {formatCurrency(grandTotal, 'EUR')}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Partenaires à régler</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alertes IBAN manquants</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {data.filter((a) => !a.iban).length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Partenaire</TableHead>
                <TableHead>Coordonnées bancaires</TableHead>
                <TableHead className="text-right">Nb commissions</TableHead>
                <TableHead className="text-right">Montant dû</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    Aucune commission en attente
                  </TableCell>
                </TableRow>
              ) : (
                data.map((affiliate) => (
                  <TableRow key={affiliate.affiliate_id}>
                    <TableCell>
                      <div className="font-medium">{affiliate.name}</div>
                      <div className="text-xs text-muted-foreground">{affiliate.email}</div>
                    </TableCell>
                    <TableCell>
                      {affiliate.iban ? (
                        <code className="text-xs bg-muted px-2 py-1 rounded block max-w-[220px] truncate">
                          {affiliate.iban.replace(/(.{4})/g, '$1 ').trim()}
                        </code>
                      ) : (
                        <Badge variant="destructive">IBAN manquant</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">{affiliate.count}</TableCell>
                    <TableCell className="text-right font-bold">
                      {formatCurrency(affiliate.total_amount, 'EUR')}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <a href="/super-admin/affiliation/affiliates">Détails</a>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
