'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  MoreHorizontal,
  Search,
  Filter,
  Download,
  Eye,
  Edit,
  Mail,
  CreditCard,
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
  Building2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import type { OrganizationSubscription, SubscriptionStatus } from '@/types/super-admin.types'

interface SubscriptionsTableProps {
  subscriptions?: OrganizationSubscription[]
  loading?: boolean
  onViewDetails?: (subscription: OrganizationSubscription) => void
  onEdit?: (subscription: OrganizationSubscription) => void
  onSendReminder?: (subscription: OrganizationSubscription) => void
}

// Sample data
const sampleSubscriptions: OrganizationSubscription[] = [
  {
    id: '1',
    organization_id: 'org-1',
    plan_id: 'plan-pro',
    status: 'active',
    billing_cycle: 'monthly',
    current_period_start: '2024-01-01',
    current_period_end: '2024-02-01',
    trial_ends_at: null,
    canceled_at: null,
    cancel_reason: null,
    payment_method: { type: 'card', brand: 'Visa', last4: '4242' },
    stripe_subscription_id: 'sub_xxx',
    stripe_customer_id: 'cus_xxx',
    metadata: {},
    created_at: '2023-06-15',
    updated_at: '2024-01-01',
    plan: {
      id: 'plan-pro',
      name: 'Pro',
      code: 'pro',
      description: null,
      price_monthly: 49,
      price_yearly: 470,
      currency: 'EUR',
      features: [],
      max_users: 5,
      max_students: 100,
      max_storage_gb: 10,
      is_active: true,
      display_order: 2,
      created_at: '',
      updated_at: '',
    },
    organization: {
      id: 'org-1',
      name: 'Formation Excellence',
      code: 'FORM-EX',
      country: 'FR',
      logo_url: null,
      created_at: '2023-06-15',
    },
  },
  {
    id: '2',
    organization_id: 'org-2',
    plan_id: 'plan-premium',
    status: 'active',
    billing_cycle: 'yearly',
    current_period_start: '2024-01-01',
    current_period_end: '2025-01-01',
    trial_ends_at: null,
    canceled_at: null,
    cancel_reason: null,
    payment_method: { type: 'card', brand: 'Mastercard', last4: '5555' },
    stripe_subscription_id: 'sub_yyy',
    stripe_customer_id: 'cus_yyy',
    metadata: {},
    created_at: '2023-03-10',
    updated_at: '2024-01-01',
    plan: {
      id: 'plan-premium',
      name: 'Premium',
      code: 'premium',
      description: null,
      price_monthly: 99,
      price_yearly: 950,
      currency: 'EUR',
      features: [],
      max_users: 10,
      max_students: null,
      max_storage_gb: 50,
      is_active: true,
      display_order: 3,
      created_at: '',
      updated_at: '',
    },
    organization: {
      id: 'org-2',
      name: 'Centre Pédagogique Alpha',
      code: 'CPA',
      country: 'FR',
      logo_url: null,
      created_at: '2023-03-10',
    },
  },
  {
    id: '3',
    organization_id: 'org-3',
    plan_id: 'plan-trial',
    status: 'trial',
    billing_cycle: 'monthly',
    current_period_start: '2024-01-10',
    current_period_end: '2024-01-24',
    trial_ends_at: '2024-01-24',
    canceled_at: null,
    cancel_reason: null,
    payment_method: null,
    stripe_subscription_id: null,
    stripe_customer_id: null,
    metadata: {},
    created_at: '2024-01-10',
    updated_at: '2024-01-10',
    plan: {
      id: 'plan-trial',
      name: 'Essai Gratuit',
      code: 'trial',
      description: null,
      price_monthly: 0,
      price_yearly: 0,
      currency: 'EUR',
      features: [],
      max_users: 1,
      max_students: 10,
      max_storage_gb: 1,
      is_active: true,
      display_order: 0,
      created_at: '',
      updated_at: '',
    },
    organization: {
      id: 'org-3',
      name: 'Institut Digital',
      code: 'INST-DIG',
      country: 'SN',
      logo_url: null,
      created_at: '2024-01-10',
    },
  },
  {
    id: '4',
    organization_id: 'org-4',
    plan_id: 'plan-pro',
    status: 'past_due',
    billing_cycle: 'monthly',
    current_period_start: '2023-12-01',
    current_period_end: '2024-01-01',
    trial_ends_at: null,
    canceled_at: null,
    cancel_reason: null,
    payment_method: { type: 'card', brand: 'Visa', last4: '1234' },
    stripe_subscription_id: 'sub_zzz',
    stripe_customer_id: 'cus_zzz',
    metadata: {},
    created_at: '2023-09-01',
    updated_at: '2024-01-05',
    plan: {
      id: 'plan-pro',
      name: 'Pro',
      code: 'pro',
      description: null,
      price_monthly: 49,
      price_yearly: 470,
      currency: 'EUR',
      features: [],
      max_users: 5,
      max_students: 100,
      max_storage_gb: 10,
      is_active: true,
      display_order: 2,
      created_at: '',
      updated_at: '',
    },
    organization: {
      id: 'org-4',
      name: 'Académie Web',
      code: 'ACAD-WEB',
      country: 'FR',
      logo_url: null,
      created_at: '2023-09-01',
    },
  },
  {
    id: '5',
    organization_id: 'org-5',
    plan_id: 'plan-free',
    status: 'canceled',
    billing_cycle: 'monthly',
    current_period_start: '2023-11-01',
    current_period_end: '2023-12-01',
    trial_ends_at: null,
    canceled_at: '2023-12-15',
    cancel_reason: 'Trop cher pour notre budget actuel',
    payment_method: null,
    stripe_subscription_id: null,
    stripe_customer_id: null,
    metadata: {},
    created_at: '2023-08-01',
    updated_at: '2023-12-15',
    plan: {
      id: 'plan-free',
      name: 'Free',
      code: 'free',
      description: null,
      price_monthly: 0,
      price_yearly: 0,
      currency: 'EUR',
      features: [],
      max_users: 2,
      max_students: 25,
      max_storage_gb: 2,
      is_active: true,
      display_order: 1,
      created_at: '',
      updated_at: '',
    },
    organization: {
      id: 'org-5',
      name: 'Startup Formation',
      code: 'START-F',
      country: 'CI',
      logo_url: null,
      created_at: '2023-08-01',
    },
  },
]

const statusConfig: Record<SubscriptionStatus, { label: string; color: string; icon: React.ReactNode }> = {
  trial: {
    label: 'Essai',
    color: 'bg-cyan-100 text-cyan-700 border-cyan-200 dark:bg-cyan-950/50 dark:text-cyan-400',
    icon: <Clock className="h-3 w-3" />,
  },
  active: {
    label: 'Actif',
    color: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400',
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
  past_due: {
    label: 'En retard',
    color: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400',
    icon: <AlertTriangle className="h-3 w-3" />,
  },
  canceled: {
    label: 'Annulé',
    color: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-400',
    icon: <XCircle className="h-3 w-3" />,
  },
  expired: {
    label: 'Expiré',
    color: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-950/50 dark:text-gray-400',
    icon: <XCircle className="h-3 w-3" />,
  },
}

export function SubscriptionsTable({
  subscriptions = sampleSubscriptions,
  loading = false,
  onViewDetails,
  onEdit,
  onSendReminder,
}: SubscriptionsTableProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [planFilter, setPlanFilter] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // Filter subscriptions
  const filteredSubscriptions = subscriptions.filter((sub) => {
    const matchesSearch =
      searchQuery === '' ||
      sub.organization?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.organization?.code?.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus = statusFilter === 'all' || sub.status === statusFilter
    const matchesPlan = planFilter === 'all' || sub.plan?.code === planFilter

    return matchesSearch && matchesStatus && matchesPlan
  })

  // Pagination
  const totalPages = Math.ceil(filteredSubscriptions.length / itemsPerPage)
  const paginatedSubscriptions = filteredSubscriptions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  // Format date
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  // Get unique plans for filter
  const uniquePlans = Array.from(new Set(subscriptions.map((s) => s.plan?.code).filter(Boolean)))

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex gap-4">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Organisation</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Période</TableHead>
                <TableHead>Paiement</TableHead>
                <TableHead className="w-[50px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {[1, 2, 3, 4, 5].map((i) => (
                <TableRow key={i}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher une organisation..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            {Object.entries(statusConfig).map(([value, { label }]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={planFilter} onValueChange={setPlanFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Plan" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les plans</SelectItem>
            {uniquePlans.map((plan) => (
              <SelectItem key={plan} value={plan!}>
                {plan!.charAt(0).toUpperCase() + plan!.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Organisation</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Période</TableHead>
              <TableHead>Paiement</TableHead>
              <TableHead className="w-[50px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedSubscriptions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Building2 className="h-8 w-8 text-muted-foreground/50" />
                    <p className="text-muted-foreground">Aucun abonnement trouvé</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              paginatedSubscriptions.map((subscription) => {
                const status = statusConfig[subscription.status]
                return (
                  <TableRow key={subscription.id} className="group">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={subscription.organization?.logo_url || undefined} />
                          <AvatarFallback className="bg-muted text-xs font-medium">
                            {subscription.organization?.name
                              .split(' ')
                              .map((n) => n[0])
                              .join('')
                              .toUpperCase()
                              .slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{subscription.organization?.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {subscription.organization?.code} • {subscription.organization?.country}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-medium">
                        {subscription.plan?.name}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        {subscription.plan?.price_monthly}€/mois
                      </p>
                    </TableCell>
                    <TableCell>
                      <Badge className={cn('gap-1', status.color)}>
                        {status.icon}
                        {status.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm">
                        {formatDate(subscription.current_period_start)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        → {formatDate(subscription.current_period_end)}
                      </p>
                    </TableCell>
                    <TableCell>
                      {subscription.payment_method ? (
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                            {(subscription.payment_method as any)?.brand} •••• {(subscription.payment_method as any)?.last4}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => onViewDetails?.(subscription)}>
                            <Eye className="mr-2 h-4 w-4" />
                            Voir détails
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onEdit?.(subscription)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Modifier
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => onSendReminder?.(subscription)}>
                            <Mail className="mr-2 h-4 w-4" />
                            Envoyer un rappel
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {filteredSubscriptions.length} abonnement(s) trouvé(s)
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">
              Page {currentPage} sur {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
