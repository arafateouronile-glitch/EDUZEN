'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { usePlatformAdmin } from '@/lib/hooks/use-platform-admin'
import { motion } from '@/components/ui/motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Percent, Plus, Copy, Check } from 'lucide-react'
import { toast } from 'sonner'
import type { Affiliate } from '@/types/super-admin.types'

const BASE_URL = typeof window !== 'undefined' ? window.location.origin : 'https://eduzen.fr'

export default function AffiliationPromoCodesPage() {
  const { canManageAffiliates, isSuperAdmin } = usePlatformAdmin()
  const queryClient = useQueryClient()
  const supabase = createClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [code, setCode] = useState('')
  const [affiliateId, setAffiliateId] = useState<string>('')
  const [discountValue, setDiscountValue] = useState('10')
  const [copied, setCopied] = useState<string | null>(null)

  const { data: affiliates } = useQuery({
    queryKey: ['affiliates-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('affiliates')
        .select('id, email, full_name, company_name')
        .eq('status', 'approved')
        .order('full_name')
      if (error) throw error
      return (data || []) as Affiliate[]
    },
  })

  const { data: promoCodes, isLoading } = useQuery({
    queryKey: ['promo-codes-affiliate'],
    queryFn: async () => {
      // eslint-disable-next-line
      const q: any = supabase
        .from('promo_codes')
        .select('*, affiliates(id, email, full_name, company_name)')
        .not('affiliate_id', 'is', null)
        .order('created_at', { ascending: false })
      const { data, error } = await q
      if (error) throw error
      return (data || []) as Array<{
        id: string
        code: string
        discount_type: string
        discount_value: number
        current_uses: number
        max_uses: number | null
        is_active: boolean
        affiliate_id: string | null
        affiliates?: { email: string; full_name: string | null; company_name: string | null } | null
      }>
    },
    staleTime: 1000 * 60,
  })

  const handleCreate = async () => {
    const value = parseFloat(discountValue)
    if (!code.trim()) {
      toast.error('Code requis')
      return
    }
    if (!affiliateId) {
      toast.error('Choisir un affilié')
      return
    }
    if (isNaN(value) || value <= 0 || value > 100) {
      toast.error('Réduction entre 1 et 100%')
      return
    }
    const { error } = await supabase.from('promo_codes').insert({
      code: code.trim().toUpperCase(),
      discount_type: 'percentage',
      discount_value: value,
      currency: 'EUR',
      valid_from: new Date().toISOString(),
      max_uses_per_user: 1,
      first_subscription_only: true,
      is_active: true,
      affiliate_id: affiliateId,
    })
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success('Code promo créé et lié à l\'affilié')
    setCreateOpen(false)
    setCode('')
    setAffiliateId('')
    setDiscountValue('10')
    queryClient.invalidateQueries({ queryKey: ['promo-codes-affiliate'] })
  }

  const copyLink = (affiliateId: string) => {
    const url = `${BASE_URL}?ref=${affiliateId}`
    navigator.clipboard.writeText(url)
    setCopied(affiliateId)
    toast.success('Lien copié')
    setTimeout(() => setCopied(null), 2000)
  }

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <motion.h1 initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-2xl font-bold flex items-center gap-2">
            <Percent className="h-7 w-7 text-brand-blue" />
            Codes Promo Affiliation
          </motion.h1>
          <p className="text-muted-foreground">Générateur de codes promos uniques liés à un affilié (ex: CODE10 pour Arafate)</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Générer un code
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Codes promos liés aux affiliés</CardTitle>
          <CardDescription>Attribution même sans lien : le code attribue la conversion à l&apos;affilié</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : !promoCodes?.length ? (
            <p className="text-center text-muted-foreground py-8">Aucun code promo affilié. Créez-en un ci-dessus.</p>
          ) : (
            <div className="space-y-3">
              {promoCodes.map((pc) => (
                <div
                  key={pc.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div>
                    <p className="font-mono font-semibold">{pc.code}</p>
                    <p className="text-sm text-muted-foreground">
                      {pc.discount_value}% · {pc.current_uses} utilisation{pc.current_uses !== 1 ? 's' : ''}
                      {pc.max_uses != null ? ` / ${pc.max_uses}` : ''}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Affilié : {pc.affiliates?.full_name || pc.affiliates?.company_name || pc.affiliates?.email || pc.affiliate_id}
                    </p>
                  </div>
                  <Badge variant={pc.is_active ? 'default' : 'secondary'}>
                    {pc.is_active ? 'Actif' : 'Inactif'}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouveau code promo affilié</DialogTitle>
            <DialogDescription>Le code sera attribué à l&apos;affilié pour les conversions</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">Code *</label>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="CODE10"
                className="mt-1 font-mono"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Affilié *</label>
              <Select value={affiliateId} onValueChange={setAffiliateId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Choisir un affilié" />
                </SelectTrigger>
                <SelectContent>
                  {affiliates?.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.full_name || a.company_name || a.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Réduction (%)</label>
              <Input
                type="number"
                min={1}
                max={100}
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Annuler</Button>
              <Button onClick={handleCreate}>Créer</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
