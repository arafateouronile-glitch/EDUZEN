'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { usePlatformAdmin } from '@/lib/hooks/use-platform-admin'
import { PlatformAdminGuard } from '@/components/super-admin/platform-admin-guard'
import { motion } from '@/components/ui/motion'
import { Building2, CreditCard, AlertTriangle, TrendingUp, Clock } from 'lucide-react'
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
import { Separator } from '@/components/ui/separator'
import type { OrganizationSubscription } from '@/types/super-admin.types'

export default function SubscriptionsPage() {
  const [selectedSubscription, setSelectedSubscription] = useState<OrganizationSubscription | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)

  // Sample stats - in production, fetch from API
  const stats = {
    total: 193,
    active: 128,
    trial: 35,
    pastDue: 12,
    growthPercent: 8.5,
  }

  const handleViewDetails = (subscription: OrganizationSubscription) => {
    setSelectedSubscription(subscription)
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
              onViewDetails={handleViewDetails}
              onEdit={(sub) => console.log('Edit', sub)}
              onSendReminder={(sub) => console.log('Send reminder', sub)}
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
                          {selectedSubscription.payment_method.brand} •••• {selectedSubscription.payment_method.last4}
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
              </div>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </PlatformAdminGuard>
  )
}
