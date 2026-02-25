'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { usePlatformAdmin } from '@/lib/hooks/use-platform-admin'
import { motion } from '@/components/ui/motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Banknote, MoreHorizontal, Check, Download } from 'lucide-react'
import { toast } from 'sonner'
import { approvePayout } from '@/lib/actions/affiliate-actions'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import { AffiliatePayoutsDashboard } from '@/components/super-admin/affiliation/affiliate-payouts-dashboard'
import type { AffiliatePayout, AffiliatePayoutStatus } from '@/types/super-admin.types'
import type { PendingCommission } from '@/components/super-admin/affiliation/affiliate-payouts-dashboard'

const statusConfig: Record<AffiliatePayoutStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: 'En attente', variant: 'secondary' },
  approved: { label: 'Approuvé', variant: 'default' },
  processing: { label: 'En cours', variant: 'default' },
  paid: { label: 'Payé', variant: 'outline' },
  failed: { label: 'Échoué', variant: 'destructive' },
  cancelled: { label: 'Annulé', variant: 'outline' },
}

function exportPayoutsCSV(payouts: (AffiliatePayout & { affiliates?: { email: string; full_name: string | null; payment_iban: string | null; payment_holder_name: string | null } | null })[]) {
  const headers = ['Affilié', 'Email', 'IBAN', 'Titulaire', 'Montant', 'Période', 'Référence']
  const rows = payouts.map((p) => [
    p.affiliates?.full_name ?? '',
    p.affiliates?.email ?? '',
    p.affiliates?.payment_iban ?? '',
    p.affiliates?.payment_holder_name ?? '',
    p.amount,
    `${p.period_start} / ${p.period_end}`,
    p.reference ?? '',
  ])
  const csv = [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n')
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `paiements-affiliation-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function AffiliationPayoutsPage() {
  const { canManageAffiliates, isSuperAdmin } = usePlatformAdmin()
  const queryClient = useQueryClient()
  const supabase = createClient()

  const { data: payouts, isLoading } = useQuery({
    queryKey: ['affiliate-payouts'],
    queryFn: async () => {
      // eslint-disable-next-line
      const q: any = supabase
        .from('affiliate_payouts')
        .select('*, affiliates(email, full_name, payment_iban, payment_holder_name)')
        .order('created_at', { ascending: false })
      const { data, error } = await q
      if (error) throw error
      type Row = AffiliatePayout & { affiliates?: { email: string; full_name: string | null; payment_iban: string | null; payment_holder_name: string | null } | null }
      return (data || []) as Row[]
    },
    staleTime: 1000 * 60,
  })

  const handleApprove = async (id: string) => {
    const res = await approvePayout(id)
    if (res.success) {
      toast.success('Paiement approuvé')
      queryClient.invalidateQueries({ queryKey: ['affiliate-payouts'] })
    } else toast.error(res.error)
  }

  const { data: pendingCommissions } = useQuery({
    queryKey: ['affiliation-pending-commissions'],
    queryFn: async () => {
      const res = await fetch('/api/super-admin/affiliation/pending-commissions')
      if (!res.ok) throw new Error(await res.text())
      const json = await res.json()
      return (json.data || []) as PendingCommission[]
    },
    staleTime: 1000 * 60,
  })

  const pendingList = payouts?.filter((p) => p.status === 'pending') ?? []

  if (!canManageAffiliates && !isSuperAdmin) {
    return (
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Accès restreint</CardTitle>
          <CardDescription>Permissions insuffisantes.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <motion.h1 initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-2xl font-bold flex items-center gap-2">
            <Banknote className="h-7 w-7 text-brand-blue" />
            Paiements
          </motion.h1>
          <p className="text-muted-foreground">Commissions dues, virement SEPA groupé, historique des paiements</p>
        </div>
      </div>

      <AffiliatePayoutsDashboard
        data={pendingCommissions ?? []}
        cycleLabel={new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
      />

      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Historique des paiements</h3>
        {pendingList.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => exportPayoutsCSV(pendingList)}
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Historique des paiements</CardTitle>
          <CardDescription>Valider un paiement pour le marquer comme approuvé, puis payé après virement</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Affilié</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead>Période</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="w-[80px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                      Chargement…
                    </TableCell>
                  </TableRow>
                ) : !payouts?.length ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                      Aucun paiement
                    </TableCell>
                  </TableRow>
                ) : (
                  payouts.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{p.affiliates?.full_name || p.affiliates?.email}</p>
                          <p className="text-sm text-muted-foreground">{p.affiliates?.email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(p.amount, p.currency)}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatDate(p.period_start)} → {formatDate(p.period_end)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusConfig[p.status].variant}>
                          {statusConfig[p.status].label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {p.status === 'pending' && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleApprove(p.id)}>
                                <Check className="h-4 w-4 mr-2" />
                                Approuver
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
