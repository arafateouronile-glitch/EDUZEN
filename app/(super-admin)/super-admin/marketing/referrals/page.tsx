'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { usePlatformAdmin } from '@/lib/hooks/use-platform-admin'
import { motion } from '@/components/ui/motion'
import {
  Share2,
  UserPlus,
  Gift,
  TrendingUp,
  RefreshCw,
  Download,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'
import type { Referral, ReferralStatus } from '@/types/super-admin.types'

const statusConfig: Record<ReferralStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: 'En attente', variant: 'secondary' },
  signed_up: { label: 'Inscrit', variant: 'default' },
  subscribed: { label: 'Abonné', variant: 'default' },
  rewarded: { label: 'Récompensé', variant: 'default' },
  expired: { label: 'Expiré', variant: 'outline' },
}

export default function ReferralsPage() {
  const { canManageReferrals, isSuperAdmin } = usePlatformAdmin()
  const supabase = createClient()

  // Vérifier les permissions
  if (!canManageReferrals && !isSuperAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Accès restreint</CardTitle>
            <CardDescription>
              Vous n'avez pas les permissions nécessaires pour gérer les parrainages.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  // Fetch referrals
  const { data: referrals, isLoading, refetch } = useQuery({
    queryKey: ['referrals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('referrals')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) throw error
      return (data || []) as Referral[]
    },
    staleTime: 1000 * 60 * 5,
  })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-muted animate-pulse rounded w-64" />
        <Card>
          <CardHeader>
            <div className="h-6 bg-muted animate-pulse rounded w-32" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-16 bg-muted animate-pulse rounded" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const stats = {
    total: referrals?.length || 0,
    pending: referrals?.filter((r) => r.status === 'pending').length || 0,
    subscribed: referrals?.filter((r) => r.status === 'subscribed').length || 0,
    rewarded: referrals?.filter((r) => r.status === 'rewarded').length || 0,
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl font-bold tracking-tight"
          >
            Programme de Parrainage
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-muted-foreground"
          >
            Suivez les parrainages et les récompenses attribuées
          </motion.p>
        </div>
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="flex gap-2"
        >
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Actualiser
          </Button>
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="h-4 w-4" />
            Exporter
          </Button>
        </motion.div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Parrainages</CardTitle>
            <Share2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En attente</CardTitle>
            <UserPlus className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Abonnés</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.subscribed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Récompensés</CardTitle>
            <Gift className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats.rewarded}</div>
          </CardContent>
        </Card>
      </div>

      {/* Referrals List */}
      <Card>
        <CardHeader>
          <CardTitle>Liste des Parrainages</CardTitle>
          <CardDescription>
            Tous les parrainages et leur statut actuel
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {referrals && referrals.length > 0 ? (
              referrals.map((referral) => (
                <div
                  key={referral.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Share2 className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold">Code: {referral.referral_code}</span>
                        <Badge variant={statusConfig[referral.status].variant}>
                          {statusConfig[referral.status].label}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Parrainé: {referral.referred_email} • {formatDate(referral.created_at)}
                      </div>
                      {referral.referred_organization_id && (
                        <div className="text-xs text-green-600 mt-1">
                          ✓ Organisation créée
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    {referral.referrer_reward_value && (
                      <div className="text-sm font-semibold text-primary">
                        Récompense: {referral.referrer_reward_value}
                        {referral.referrer_reward_type === 'credit' && '€'}
                        {referral.referrer_reward_type === 'free_months' && ' mois'}
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12">
                <Share2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Aucun parrainage</h3>
                <p className="text-sm text-muted-foreground">
                  Les parrainages apparaîtront ici une fois créés.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
