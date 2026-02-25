'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { usePlatformAdmin } from '@/lib/hooks/use-platform-admin'
import { motion } from '@/components/ui/motion'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import { Users, Search, MoreHorizontal, Check, Ban, Clock, Plus, Mail } from 'lucide-react'
import { toast } from 'sonner'
import { updateAffiliateStatus, createAffiliate, sendAffiliateMarketingKit } from '@/lib/actions/affiliate-actions'
import { formatCurrency } from '@/lib/utils/format'
import type { Affiliate, AffiliateStatus } from '@/types/super-admin.types'

const statusConfig: Record<AffiliateStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: 'En attente', variant: 'secondary' },
  approved: { label: 'Validé', variant: 'default' },
  banned: { label: 'Banni', variant: 'destructive' },
}

export default function AffiliatesPage() {
  const { canManageAffiliates, isSuperAdmin } = usePlatformAdmin()
  const queryClient = useQueryClient()
  const supabase = createClient()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [createOpen, setCreateOpen] = useState(false)
  const [createEmail, setCreateEmail] = useState('')
  const [createName, setCreateName] = useState('')
  const [createCompany, setCreateCompany] = useState('')

  const { data: affiliates, isLoading } = useQuery({
    queryKey: ['affiliates', search, statusFilter],
    queryFn: async () => {
      // eslint-disable-next-line
      let q: any = supabase
        .from('affiliates')
        .select('*, affiliate_campaigns(name, commission_percent)')
        .order('created_at', { ascending: false })

      if (search.trim()) {
        q = q.or(`email.ilike.%${search}%,full_name.ilike.%${search}%,company_name.ilike.%${search}%`)
      }
      if (statusFilter !== 'all') {
        q = q.eq('status', statusFilter)
      }
      const { data, error } = await q
      if (error) throw error
      return (data || []) as (Affiliate & { affiliate_campaigns?: { name: string; commission_percent: number } | null })[]
    },
    staleTime: 1000 * 60,
  })

  const handleStatusChange = async (id: string, newStatus: AffiliateStatus) => {
    const res = await updateAffiliateStatus(id, newStatus)
    if (res.success) {
      toast.success('Statut mis à jour')
      queryClient.invalidateQueries({ queryKey: ['affiliates'] })
    } else {
      toast.error(res.error)
    }
  }

  const handleSendKit = async (id: string) => {
    const res = await sendAffiliateMarketingKit(id)
    if (res.success) {
      toast.success('Kit marketing envoyé par email')
    } else {
      toast.error(res.error)
    }
  }

  const handleCreate = async () => {
    if (!createEmail.trim()) {
      toast.error('Email requis')
      return
    }
    const res = await createAffiliate({
      email: createEmail.trim(),
      full_name: createName.trim() || null,
      company_name: createCompany.trim() || null,
    })
    if (res.success) {
      toast.success('Affilié créé')
      setCreateOpen(false)
      setCreateEmail('')
      setCreateName('')
      setCreateCompany('')
      queryClient.invalidateQueries({ queryKey: ['affiliates'] })
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
            <Users className="h-7 w-7 text-brand-blue" />
            Affiliés
          </motion.h1>
          <p className="text-muted-foreground">Gérer les partenaires et leur statut</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Nouvel affilié
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Liste des affiliés</CardTitle>
          <CardDescription>Filtres avancés et actions sur le statut</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 mb-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher (email, nom, société…)"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                {Object.entries(statusConfig).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contact</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Campagne</TableHead>
                  <TableHead>Commission</TableHead>
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
                ) : !affiliates?.length ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                      Aucun affilié
                    </TableCell>
                  </TableRow>
                ) : (
                  affiliates.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{a.full_name || a.company_name || a.email}</p>
                          <p className="text-sm text-muted-foreground">{a.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusConfig[a.status].variant}>
                          {statusConfig[a.status].label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {a.affiliate_campaigns?.name ?? '—'}
                      </TableCell>
                      <TableCell>
                        {a.commission_rate_override != null
                          ? `${a.commission_rate_override}%`
                          : a.affiliate_campaigns ? `${a.affiliate_campaigns.commission_percent}%` : '—'}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {a.status === 'approved' && (
                              <DropdownMenuItem onClick={() => handleSendKit(a.id)}>
                                <Mail className="h-4 w-4 mr-2" />
                                Générer Kit Marketing
                              </DropdownMenuItem>
                            )}
                            {a.status !== 'approved' && (
                              <DropdownMenuItem onClick={() => handleStatusChange(a.id, 'approved')}>
                                <Check className="h-4 w-4 mr-2" />
                                Valider
                              </DropdownMenuItem>
                            )}
                            {a.status !== 'pending' && (
                              <DropdownMenuItem onClick={() => handleStatusChange(a.id, 'pending')}>
                                <Clock className="h-4 w-4 mr-2" />
                                En attente
                              </DropdownMenuItem>
                            )}
                            {a.status !== 'banned' && (
                              <DropdownMenuItem onClick={() => handleStatusChange(a.id, 'banned')} className="text-destructive">
                                <Ban className="h-4 w-4 mr-2" />
                                Bannir
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouvel affilié</DialogTitle>
            <DialogDescription>Créer un partenaire. Un lien unique sera généré.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">Email *</label>
              <Input
                type="email"
                value={createEmail}
                onChange={(e) => setCreateEmail(e.target.value)}
                placeholder="partenaire@exemple.fr"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Nom</label>
              <Input
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="Jean Dupont"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Société</label>
              <Input
                value={createCompany}
                onChange={(e) => setCreateCompany(e.target.value)}
                placeholder="Consultant Qualiopi"
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
