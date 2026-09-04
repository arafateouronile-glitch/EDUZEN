'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { PlatformAdminGuard } from '@/components/super-admin/platform-admin-guard'
import { motion } from '@/components/ui/motion'
import { Building2, CreditCard, AlertTriangle, Clock } from 'lucide-react'
import { StatsCard } from '@/components/super-admin/dashboard/stats-card'
import { SubscriptionsTable } from '@/components/super-admin/subscriptions/subscriptions-table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import type { OrganizationSubscription } from '@/types/super-admin.types'
import { logger } from '@/lib/utils/logger'

type RepairState = { status: 'idle' | 'loading' | 'success' | 'error'; message?: string }

export default function SubscriptionsPage() {
  const [selectedSubscription, setSelectedSubscription] = useState<OrganizationSubscription | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [repair, setRepair] = useState<RepairState>({ status: 'idle' })
  const supabase = createClient()

  const handleRepairOnboarding = async (organizationId: string) => {
    setRepair({ status: 'loading' })
    try {
      const res = await fetch(`/api/super-admin/organizations/${organizationId}/repair-onboarding`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markPaymentAdded: true }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Échec de la réparation')
      setRepair({ status: 'success', message: `Onboarding réparé — ${json.usersRefreshed} utilisateur(s) rafraîchi(s). Le client doit recharger sa page.` })
    } catch (err) {
      setRepair({ status: 'error', message: (err as Error).message })
    }
  }

  const { data: subscriptions = [], isLoading: subsLoading } = useQuery({
    queryKey: ['super-admin-subscriptions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organization_subscriptions')
        .select(`
          *,
          plan:subscription_plans(*),
          organization:organizations(id, name, code, logo_url, country, created_at)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      return (data ?? []) as import('@/types/super-admin.types').OrganizationSubscription[]
    },
    staleTime: 1000 * 60 * 5,
  })

  const stats = {
    total: subscriptions.length,
    active: subscriptions.filter(s => s.status === 'active').length,
    trial: subscriptions.filter(s => s.status === 'trial').length,
    pastDue: subscriptions.filter(s => s.status === 'past_due').length,
    growthPercent: 0,
  }

  const handleViewDetails = (subscription: OrganizationSubscription) => {
    setSelectedSubscription(subscription)
    setRepair({ status: 'idle' })
    setDetailsOpen(true)
  }

  return (
    <PlatformAdminGuard requiredPermission="manage_subscriptions">
      <div className="space-y-8">
        {/* Header */}
        <div>
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl font-bold tracking-tight"
          >
            Gestion des Abonnements
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-muted-foreground"
          >
            Visualisez et gérez les abonnements de toutes les organisations
          </motion.p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Total organisations"
            value={stats.total}
            change={stats.growthPercent}
            changeLabel="vs mois dernier"
            icon={<Building2 className="h-6 w-6 text-brand-blue" />}
            iconBgColor="bg-brand-blue/10"
            trend="up"
          />
          <StatsCard
            title="Abonnements actifs"
            value={stats.active}
            icon={<CreditCard className="h-6 w-6 text-emerald-600" />}
            iconBgColor="bg-emerald-500/10"
          />
          <StatsCard
            title="En période d'essai"
            value={stats.trial}
            icon={<Clock className="h-6 w-6 text-brand-cyan" />}
            iconBgColor="bg-brand-cyan/10"
          />
          <StatsCard
            title="Paiements en retard"
            value={stats.pastDue}
            icon={<AlertTriangle className="h-6 w-6 text-amber-600" />}
            iconBgColor="bg-amber-500/10"
          />
        </div>

        {/* Subscriptions Table */}
        <Card>
          <CardHeader>
            <CardTitle>Liste des abonnements</CardTitle>
          </CardHeader>
          <CardContent>
            <SubscriptionsTable
              subscriptions={subscriptions}
              loading={subsLoading}
              onViewDetails={handleViewDetails}
              onEdit={(sub) => logger.debug('Edit', { subscription: sub })}
              onSendReminder={(sub) => logger.debug('Send reminder', { subscription: sub })}
            />
          </CardContent>
        </Card>

        {/* Details Sheet */}
        <Sheet open={detailsOpen} onOpenChange={setDetailsOpen}>
          <SheetContent className="sm:max-w-lg">
            <SheetHeader>
              <SheetTitle>Détails de l'abonnement</SheetTitle>
              <SheetDescription>
                Informations complètes sur l'abonnement et l'organisation
              </SheetDescription>
            </SheetHeader>

            {selectedSubscription && (
              <div className="mt-6 space-y-6">
                {/* Organization Info */}
                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground mb-3">
                    ORGANISATION
                  </h3>
                  <div className="space-y-2">
                    <p className="font-medium text-lg">
                      {selectedSubscription.organization?.name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Code: {selectedSubscription.organization?.code}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Pays: {selectedSubscription.organization?.country}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Créé le: {new Date(selectedSubscription.organization?.created_at || '').toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                </div>

                <Separator />

                {/* Subscription Info */}
                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground mb-3">
                    ABONNEMENT
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Plan</span>
                      <Badge variant="outline">
                        {selectedSubscription.plan?.name}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Statut</span>
                      <Badge
                        className={
                          selectedSubscription.status === 'active'
                            ? 'bg-emerald-100 text-emerald-700'
                            : selectedSubscription.status === 'trial'
                            ? 'bg-cyan-100 text-cyan-700'
                            : selectedSubscription.status === 'past_due'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-red-100 text-red-700'
                        }
                      >
                        {selectedSubscription.status}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Cycle de facturation</span>
                      <span className="text-sm font-medium">
                        {selectedSubscription.billing_cycle === 'monthly' ? 'Mensuel' : 'Annuel'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Prix</span>
                      <span className="text-sm font-medium">
                        {selectedSubscription.billing_cycle === 'monthly'
                          ? `${selectedSubscription.plan?.price_monthly}€/mois`
                          : `${selectedSubscription.plan?.price_yearly}€/an`}
                      </span>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Period Info */}
                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground mb-3">
                    PÉRIODE
                  </h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Début</span>
                      <span className="text-sm">
                        {new Date(selectedSubscription.current_period_start).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Fin</span>
                      <span className="text-sm">
                        {new Date(selectedSubscription.current_period_end).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                    {selectedSubscription.trial_ends_at && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Fin essai</span>
                        <span className="text-sm text-amber-600">
                          {new Date(selectedSubscription.trial_ends_at).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Payment Method */}
                {selectedSubscription.payment_method && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="font-semibold text-sm text-muted-foreground mb-3">
                        MOYEN DE PAIEMENT
                      </h3>
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          {(selectedSubscription.payment_method as { brand?: string; last4?: string })?.brand ?? 'N/A'} •••• {(selectedSubscription.payment_method as { brand?: string; last4?: string })?.last4 ?? '****'}
                        </span>
                      </div>
                    </div>
                  </>
                )}

                {/* Cancel Info */}
                {selectedSubscription.canceled_at && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="font-semibold text-sm text-muted-foreground mb-3">
                        ANNULATION
                      </h3>
                      <div className="space-y-2">
                        <p className="text-sm">
                          Annulé le: {new Date(selectedSubscription.canceled_at).toLocaleDateString('fr-FR')}
                        </p>
                        {selectedSubscription.cancel_reason && (
                          <p className="text-sm text-muted-foreground">
                            Raison: {selectedSubscription.cancel_reason}
                          </p>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {/* Réparation onboarding */}
                <Separator />
                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground mb-3">
                    DÉPANNAGE
                  </h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Force <code>onboarding_completed</code> + <code>payment_method_added</code> si le
                    client a payé mais reste bloqué sur l&apos;onboarding.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={repair.status === 'loading' || !selectedSubscription.organization?.id}
                    onClick={() => selectedSubscription.organization?.id && handleRepairOnboarding(selectedSubscription.organization.id)}
                  >
                    {repair.status === 'loading' ? 'Réparation…' : 'Réparer l\'onboarding'}
                  </Button>
                  {repair.status === 'success' && (
                    <p className="text-sm text-emerald-600 mt-2">{repair.message}</p>
                  )}
                  {repair.status === 'error' && (
                    <p className="text-sm text-red-600 mt-2">{repair.message}</p>
                  )}
                </div>
              </div>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </PlatformAdminGuard>
  )
}
