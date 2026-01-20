'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { PlatformAdminGuard } from '@/components/super-admin/platform-admin-guard'
import { motion } from '@/components/ui/motion'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { StatsCard } from '@/components/super-admin/dashboard/stats-card'
import { PromoCodeForm } from '@/components/super-admin/marketing/promo-code-form'
import {
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Copy,
  Check,
  Percent,
  Tag,
  Calendar,
  Users,
  TrendingUp,
  Power,
  PowerOff,
} from 'lucide-react'
import { toast } from 'sonner'
import type { PromoCode, CreatePromoCodeInput } from '@/types/super-admin.types'

// Sample data
const samplePromoCodes: PromoCode[] = [
  {
    id: '1',
    code: 'SUMMER2024',
    description: 'Promotion été 2024 - 20% de réduction',
    discount_type: 'percentage',
    discount_value: 20,
    currency: 'EUR',
    valid_from: '2024-06-01T00:00:00Z',
    valid_until: '2024-08-31T23:59:59Z',
    max_uses: 100,
    max_uses_per_user: 1,
    current_uses: 45,
    min_subscription_amount: null,
    applicable_plans: [],
    first_subscription_only: true,
    is_active: true,
    created_by: null,
    metadata: {},
    created_at: '2024-05-15T10:00:00Z',
    updated_at: '2024-06-20T14:30:00Z',
  },
  {
    id: '2',
    code: 'WELCOME10',
    description: 'Code de bienvenue pour nouveaux utilisateurs',
    discount_type: 'percentage',
    discount_value: 10,
    currency: 'EUR',
    valid_from: '2024-01-01T00:00:00Z',
    valid_until: null,
    max_uses: null,
    max_uses_per_user: 1,
    current_uses: 234,
    min_subscription_amount: null,
    applicable_plans: [],
    first_subscription_only: true,
    is_active: true,
    created_by: null,
    metadata: {},
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: '3',
    code: 'PARTNER50',
    description: 'Réduction partenaire - 50€ de réduction',
    discount_type: 'fixed_amount',
    discount_value: 50,
    currency: 'EUR',
    valid_from: '2024-01-01T00:00:00Z',
    valid_until: '2024-12-31T23:59:59Z',
    max_uses: 50,
    max_uses_per_user: 1,
    current_uses: 12,
    min_subscription_amount: 99,
    applicable_plans: [],
    first_subscription_only: false,
    is_active: true,
    created_by: null,
    metadata: {},
    created_at: '2024-02-15T10:00:00Z',
    updated_at: '2024-02-15T10:00:00Z',
  },
  {
    id: '4',
    code: 'TRIAL30',
    description: 'Extension période essai de 30 jours',
    discount_type: 'trial_extension',
    discount_value: 30,
    currency: null,
    valid_from: '2024-03-01T00:00:00Z',
    valid_until: null,
    max_uses: null,
    max_uses_per_user: 1,
    current_uses: 67,
    min_subscription_amount: null,
    applicable_plans: [],
    first_subscription_only: true,
    is_active: false,
    created_by: null,
    metadata: {},
    created_at: '2024-03-01T00:00:00Z',
    updated_at: '2024-04-15T09:00:00Z',
  },
]

export default function PromoCodesPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editingCode, setEditingCode] = useState<PromoCode | null>(null)
  const [deletingCode, setDeletingCode] = useState<PromoCode | null>(null)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  const queryClient = useQueryClient()

  // Filter promo codes
  const filteredCodes = samplePromoCodes.filter(
    (code) =>
      searchQuery === '' ||
      code.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      code.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Stats
  const stats = {
    totalCodes: samplePromoCodes.length,
    activeCodes: samplePromoCodes.filter((c) => c.is_active).length,
    totalUsage: samplePromoCodes.reduce((sum, c) => sum + c.current_uses, 0),
    totalSavings: 3450, // This would be calculated from actual usage
  }

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
    toast.success('Code copié!')
  }

  const handleCreate = async (data: CreatePromoCodeInput) => {
    // In production, this would call the API
    console.log('Creating promo code:', data)
    setCreateDialogOpen(false)
    toast.success('Code promo créé avec succès')
  }

  const handleEdit = async (data: CreatePromoCodeInput) => {
    // In production, this would call the API
    console.log('Editing promo code:', editingCode?.id, data)
    setEditingCode(null)
    toast.success('Code promo modifié avec succès')
  }

  const handleDelete = async () => {
    // In production, this would call the API
    console.log('Deleting promo code:', deletingCode?.id)
    setDeletingCode(null)
    toast.success('Code promo supprimé')
  }

  const handleToggleActive = async (code: PromoCode) => {
    // In production, this would call the API
    console.log('Toggling active status:', code.id, !code.is_active)
    toast.success(code.is_active ? 'Code désactivé' : 'Code activé')
  }

  const formatDate = (date: string | null) => {
    if (!date) return 'Illimité'
    return new Date(date).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  const getDiscountDisplay = (code: PromoCode) => {
    switch (code.discount_type) {
      case 'percentage':
        return `-${code.discount_value}%`
      case 'fixed_amount':
        return `-${code.discount_value}€`
      case 'trial_extension':
        return `+${code.discount_value} jours`
      default:
        return code.discount_value.toString()
    }
  }

  return (
    <PlatformAdminGuard requiredPermission="manage_promo_codes">
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <motion.h1
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-2xl font-bold tracking-tight"
            >
              Codes Promotionnels
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-muted-foreground"
            >
              Créez et gérez vos codes de réduction
            </motion.p>
          </div>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Nouveau code
            </Button>
          </motion.div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Total codes"
            value={stats.totalCodes}
            icon={<Tag className="h-6 w-6 text-brand-blue" />}
            iconBgColor="bg-brand-blue/10"
          />
          <StatsCard
            title="Codes actifs"
            value={stats.activeCodes}
            icon={<Power className="h-6 w-6 text-emerald-600" />}
            iconBgColor="bg-emerald-500/10"
          />
          <StatsCard
            title="Utilisations totales"
            value={stats.totalUsage}
            icon={<Users className="h-6 w-6 text-purple-600" />}
            iconBgColor="bg-purple-500/10"
          />
          <StatsCard
            title="Économies générées"
            value={stats.totalSavings}
            prefix=""
            suffix="€"
            icon={<TrendingUp className="h-6 w-6 text-amber-600" />}
            iconBgColor="bg-amber-500/10"
          />
        </div>

        {/* Table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Liste des codes</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Réduction</TableHead>
                  <TableHead>Validité</TableHead>
                  <TableHead>Utilisation</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="w-[50px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCodes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Tag className="h-8 w-8 text-muted-foreground/50" />
                        <p className="text-muted-foreground">Aucun code trouvé</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCodes.map((code) => (
                    <TableRow key={code.id} className="group">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-semibold text-base">
                            {code.code}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => handleCopyCode(code.code)}
                          >
                            {copiedCode === code.code ? (
                              <Check className="h-3 w-3 text-emerald-500" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                        {code.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 max-w-xs truncate">
                            {code.description}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={cn(
                            'font-mono font-semibold',
                            code.discount_type === 'percentage' &&
                              'bg-purple-100 text-purple-700 dark:bg-purple-950/50',
                            code.discount_type === 'fixed_amount' &&
                              'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50',
                            code.discount_type === 'trial_extension' &&
                              'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/50'
                          )}
                        >
                          {getDiscountDisplay(code)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p>{formatDate(code.valid_from)}</p>
                          <p className="text-muted-foreground">
                            → {formatDate(code.valid_until)}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-brand-blue rounded-full transition-all"
                              style={{
                                width: `${
                                  code.max_uses
                                    ? Math.min((code.current_uses / code.max_uses) * 100, 100)
                                    : 50
                                }%`,
                              }}
                            />
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {code.current_uses}
                            {code.max_uses ? `/${code.max_uses}` : ''}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            code.is_active
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-gray-50 text-gray-500 border-gray-200'
                          )}
                        >
                          {code.is_active ? 'Actif' : 'Inactif'}
                        </Badge>
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
                            <DropdownMenuItem onClick={() => setEditingCode(code)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Modifier
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleToggleActive(code)}>
                              {code.is_active ? (
                                <>
                                  <PowerOff className="mr-2 h-4 w-4" />
                                  Désactiver
                                </>
                              ) : (
                                <>
                                  <Power className="mr-2 h-4 w-4" />
                                  Activer
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => setDeletingCode(code)}
                              className="text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Supprimer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Create Dialog */}
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Créer un code promo</DialogTitle>
              <DialogDescription>
                Créez un nouveau code promotionnel pour vos clients
              </DialogDescription>
            </DialogHeader>
            <PromoCodeForm
              onSubmit={handleCreate}
              onCancel={() => setCreateDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={!!editingCode} onOpenChange={() => setEditingCode(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Modifier le code promo</DialogTitle>
              <DialogDescription>
                Modifiez les paramètres du code {editingCode?.code}
              </DialogDescription>
            </DialogHeader>
            {editingCode && (
              <PromoCodeForm
                onSubmit={handleEdit}
                onCancel={() => setEditingCode(null)}
                initialData={{
                  code: editingCode.code,
                  description: editingCode.description || '',
                  discount_type: editingCode.discount_type,
                  discount_value: editingCode.discount_value,
                  valid_from: new Date(editingCode.valid_from),
                  valid_until: editingCode.valid_until ? new Date(editingCode.valid_until) : null,
                  max_uses: editingCode.max_uses,
                  max_uses_per_user: editingCode.max_uses_per_user,
                  min_subscription_amount: editingCode.min_subscription_amount,
                  first_subscription_only: editingCode.first_subscription_only,
                }}
                isEditing
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={!!deletingCode} onOpenChange={() => setDeletingCode(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer le code promo?</AlertDialogTitle>
              <AlertDialogDescription>
                Cette action est irréversible. Le code{' '}
                <span className="font-mono font-semibold">{deletingCode?.code}</span> sera
                définitivement supprimé et ne pourra plus être utilisé.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-red-600 hover:bg-red-700"
              >
                Supprimer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </PlatformAdminGuard>
  )
}
