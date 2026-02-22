'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { usePlatformAdmin } from '@/lib/hooks/use-platform-admin'
import { motion } from '@/components/ui/motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
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
import { Target, Plus, Percent, Calendar } from 'lucide-react'
import { toast } from 'sonner'
import { createAffiliateCampaign } from '@/lib/actions/affiliate-actions'
import type { AffiliateCampaign, AffiliateCommissionType } from '@/types/super-admin.types'

export default function AffiliationCampaignsPage() {
  const { canManageAffiliates, isSuperAdmin } = usePlatformAdmin()
  const queryClient = useQueryClient()
  const supabase = createClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [commissionType, setCommissionType] = useState<AffiliateCommissionType>('recurring')
  const [commissionPercent, setCommissionPercent] = useState('30')
  const [cookieDays, setCookieDays] = useState('60')

  const { data: campaigns, isLoading } = useQuery({
    queryKey: ['affiliate-campaigns'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('affiliate_campaigns')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data || []) as AffiliateCampaign[]
    },
    staleTime: 1000 * 60,
  })

  const handleCreate = async () => {
    const num = parseFloat(commissionPercent)
    const days = parseInt(cookieDays, 10)
    if (!name.trim()) {
      toast.error('Nom de la campagn requis')
      return
    }
    if (isNaN(num) || num <= 0 || num > 100) {
      toast.error('Commission entre 1 et 100%')
      return
    }
    const res = await createAffiliateCampaign({
      name: name.trim(),
      description: description.trim() || null,
      commission_type: commissionType,
      commission_percent: num,
      cookie_days: isNaN(days) || days < 1 ? 60 : days,
      is_active: true,
    })
    if (res.success) {
      toast.success('Campagne créée')
      setCreateOpen(false)
      setName('')
      setDescription('')
      setCommissionPercent('30')
      setCookieDays('60')
      queryClient.invalidateQueries({ queryKey: ['affiliate-campaigns'] })
    } else {
      toast.error(res.error)
    }
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
            <Target className="h-7 w-7 text-brand-blue" />
            Campagnes
          </motion.h1>
          <p className="text-muted-foreground">Créer et gérer les campagnes d&apos;affiliation (ex: Consultants Qualiopi 30% à vie)</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Nouvelle campagne
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Liste des campagnes</CardTitle>
          <CardDescription>Taux de commission, durée des cookies, codes promos associés</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : !campaigns?.length ? (
            <p className="text-center text-muted-foreground py-8">Aucune campagne. Créez-en une pour commencer.</p>
          ) : (
            <div className="space-y-3">
              {campaigns.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-lg bg-brand-blue/10">
                      <Percent className="h-5 w-5 text-brand-blue" />
                    </div>
                    <div>
                      <p className="font-semibold">{c.name}</p>
                      {c.description && (
                        <p className="text-sm text-muted-foreground">{c.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={c.is_active ? 'default' : 'secondary'}>
                          {c.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {c.commission_percent}% · {c.commission_type === 'recurring' ? 'Récurrent' : 'Ponctuel'} · Cookie {c.cookie_days}j
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nouvelle campagne</DialogTitle>
            <DialogDescription>Ex: &quot;Campagne Consultants Qualiopi - 30% à vie&quot;</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Nom *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Consultants Qualiopi - 30%"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Commission à vie pour partenaires Qualiopi"
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Type de commission</Label>
                <Select value={commissionType} onValueChange={(v) => setCommissionType(v as AffiliateCommissionType)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recurring">Récurrent (à vie)</SelectItem>
                    <SelectItem value="one_time">Ponctuel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Taux (%)</Label>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={commissionPercent}
                  onChange={(e) => setCommissionPercent(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <Label>Durée cookie (jours)</Label>
              <Input
                type="number"
                min={1}
                value={cookieDays}
                onChange={(e) => setCookieDays(e.target.value)}
                placeholder="60"
                className="mt-1"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Annuler</Button>
              <Button onClick={handleCreate}>Créer la campagne</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
