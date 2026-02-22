'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { usePlatformAdmin } from '@/lib/hooks/use-platform-admin'
import { motion } from '@/components/ui/motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Eye, Link2, Percent, Euro, BarChart3 } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/format'
import type { Affiliate } from '@/types/super-admin.types'

const BASE_URL = typeof window !== 'undefined' ? window.location.origin : 'https://eduzen.fr'

export default function AffiliationPreviewPage() {
  const { canManageAffiliates, isSuperAdmin } = usePlatformAdmin()
  const supabase = createClient()
  const [selectedId, setSelectedId] = useState<string>('')

  const { data: affiliates } = useQuery({
    queryKey: ['affiliates-preview'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('affiliates')
        .select('*')
        .order('full_name')
      if (error) throw error
      return (data || []) as Affiliate[]
    },
  })

  const { data: stats } = useQuery({
    queryKey: ['affiliate-preview-stats', selectedId],
    queryFn: async () => {
      if (!selectedId) return null
      const { data: refs, error } = await supabase
        .from('affiliate_referrals')
        .select('type, mrr_contribution, commission_amount')
        .eq('affiliate_id', selectedId)
      if (error) throw error
      const rows = (refs || []) as { type: string; mrr_contribution: number; commission_amount: number }[]
      const clicks = rows.filter((r) => r.type === 'click').length
      const conversions = rows.filter((r) => r.type === 'conversion').length
      const mrr = rows.reduce((s, r) => s + (Number(r.mrr_contribution) || 0), 0)
      const commission = rows.reduce((s, r) => s + (Number(r.commission_amount) || 0), 0)
      return { clicks, conversions, mrr, commission }
    },
    enabled: !!selectedId,
  })

  const { data: promoCode } = useQuery({
    queryKey: ['affiliate-promo-code', selectedId],
    queryFn: async () => {
      if (!selectedId) return null
      const { data, error } = await supabase
        .from('promo_codes')
        .select('code, discount_value')
        .eq('affiliate_id', selectedId)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle()
      if (error) throw error
      return data as { code: string; discount_value: number } | null
    },
    enabled: !!selectedId,
  })

  const affiliate = affiliates?.find((a) => a.id === selectedId)

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
    <div className="space-y-6">
      <div>
        <motion.h1 initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-2xl font-bold flex items-center gap-2">
          <Eye className="h-7 w-7 text-brand-blue" />
          Aperçu Portail Affilié
        </motion.h1>
        <p className="text-muted-foreground">
          Vue de ce que l&apos;affilié voit de son côté : gains, liens, ressources marketing
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Choisir un affilié</CardTitle>
          <CardDescription>Prévisualiser le dashboard partenaire</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedId} onValueChange={setSelectedId}>
            <SelectTrigger className="max-w-sm">
              <SelectValue placeholder="Sélectionner un affilié" />
            </SelectTrigger>
            <SelectContent>
              {affiliates?.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.full_name || a.company_name || a.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedId && affiliate && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-xl border-2 border-dashed border-brand-blue/30 bg-slate-50/50 dark:bg-slate-900/30 p-6"
        >
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">
            Aperçu · Espace Partenaire
          </p>
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Link2 className="h-5 w-5" />
                  Mon lien unique
                </CardTitle>
                <CardDescription>Partagez ce lien pour suivre vos conversions</CardDescription>
              </CardHeader>
              <CardContent>
                <code className="block p-3 rounded-lg bg-muted text-sm break-all">
                  {BASE_URL}?ref={affiliate.id}
                </code>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Percent className="h-5 w-5" />
                  Mon code promo
                </CardTitle>
                <CardDescription>Offrez une réduction à vos contacts</CardDescription>
              </CardHeader>
              <CardContent>
                {promoCode ? (
                  <p className="text-2xl font-mono font-bold text-brand-blue">
                    {promoCode.code}
                    <span className="text-base font-normal text-muted-foreground ml-2">
                      ({promoCode.discount_value}% de réduction)
                    </span>
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">Aucun code promo actif</p>
                )}
              </CardContent>
            </Card>
          </div>
          <div className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Mes performances
                </CardTitle>
                <CardDescription>Résumé des clics, conversions et commissions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-4">
                  <div className="rounded-lg border p-4">
                    <p className="text-sm text-muted-foreground">Clics</p>
                    <p className="text-2xl font-bold">{stats?.clicks ?? 0}</p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <p className="text-sm text-muted-foreground">Conversions</p>
                    <p className="text-2xl font-bold text-emerald-600">{stats?.conversions ?? 0}</p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <p className="text-sm text-muted-foreground">MRR généré</p>
                    <p className="text-2xl font-bold">{formatCurrency(stats?.mrr ?? 0)}</p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Euro className="h-4 w-4" />
                      Commission due
                    </p>
                    <p className="text-2xl font-bold text-brand-blue">
                      {formatCurrency(stats?.commission ?? 0)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="mt-6 p-4 rounded-lg bg-muted/50">
            <p className="text-sm font-medium mb-2">Ressources marketing (kit)</p>
            <p className="text-sm text-muted-foreground">
              Bannières et VSL (vidéo démo) seront envoyées par email avec le lien et le code lors du &quot;Générer Kit Marketing&quot;.
            </p>
          </div>
        </motion.div>
      )}
    </div>
  )
}
