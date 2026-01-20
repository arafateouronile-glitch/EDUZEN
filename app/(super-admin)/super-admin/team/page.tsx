'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
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
  DialogFooter,
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
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Checkbox } from '@/components/ui/checkbox'
import { StatsCard } from '@/components/super-admin/dashboard/stats-card'
import {
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  Mail,
  Shield,
  Users,
  UserPlus,
  UserCheck,
  UserX,
  Clock,
  CheckCircle2,
  XCircle,
  Send,
  Key,
} from 'lucide-react'
import { toast } from 'sonner'
import type {
  PlatformAdmin,
  PlatformAdminRole,
  InviteAdminInput,
  AdminPermissions,
} from '@/types/super-admin.types'


const roleConfig: Record<PlatformAdminRole, { label: string; color: string; description: string }> = {
  super_admin: {
    label: 'Super Admin',
    color: 'bg-red-100 text-red-700 border-red-200',
    description: 'Accès complet à toutes les fonctionnalités',
  },
  content_admin: {
    label: 'Content Admin',
    color: 'bg-purple-100 text-purple-700 border-purple-200',
    description: 'Gestion du blog et des contenus',
  },
  support_admin: {
    label: 'Support Admin',
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    description: 'Accès au support client',
  },
  finance_admin: {
    label: 'Finance Admin',
    color: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    description: 'Accès aux métriques financières',
  },
}

const permissionsList: { key: keyof AdminPermissions; label: string; description: string }[] = [
  { key: 'view_dashboard', label: 'Voir le dashboard', description: 'Accès au tableau de bord' },
  { key: 'view_revenue', label: 'Voir les revenus', description: 'Accès aux métriques financières' },
  { key: 'manage_subscriptions', label: 'Gérer les abonnements', description: 'Modifier les abonnements' },
  { key: 'manage_invoices', label: 'Gérer les factures', description: 'Accès à la facturation' },
  { key: 'manage_promo_codes', label: 'Gérer les codes promo', description: 'Créer et modifier les codes' },
  { key: 'manage_referrals', label: 'Gérer les parrainages', description: 'Accès au programme de parrainage' },
  { key: 'manage_blog', label: 'Gérer le blog', description: 'Créer et modifier les articles' },
  { key: 'publish_posts', label: 'Publier les articles', description: 'Publier directement' },
  { key: 'moderate_comments', label: 'Modérer les commentaires', description: 'Approuver/supprimer les commentaires' },
  { key: 'manage_team', label: 'Gérer l\'équipe', description: 'Inviter et révoquer des admins' },
]

const inviteSchema = z.object({
  email: z.string().email('Email invalide'),
  role: z.enum(['super_admin', 'content_admin', 'support_admin', 'finance_admin']),
  permissions: z.record(z.boolean()).optional(),
})

type InviteFormData = z.infer<typeof inviteSchema>

export default function TeamPage() {
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false)
  const [editingAdmin, setEditingAdmin] = useState<PlatformAdmin | null>(null)
  const [revokingAdmin, setRevokingAdmin] = useState<PlatformAdmin | null>(null)
  const queryClient = useQueryClient()

  const form = useForm<InviteFormData>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      email: '',
      role: 'content_admin',
      permissions: undefined,
    },
  })

  const watchedRole = form.watch('role')

  // Fetch admins
  const { data: adminsData, isLoading } = useQuery({
    queryKey: ['platform-admins'],
    queryFn: async () => {
      const response = await fetch('/api/super-admin/admins')
      if (!response.ok) {
        throw new Error('Erreur lors de la récupération des administrateurs')
      }
      return response.json() as Promise<{ admins: PlatformAdmin[] }>
    },
    staleTime: 1000 * 60 * 5,
  })

  const admins = adminsData?.admins || []

  // Stats
  const stats = {
    totalAdmins: admins.length,
    activeAdmins: admins.filter((a) => a.is_active).length,
    pendingInvites: admins.filter((a) => !a.accepted_at).length,
  }

  // Invite mutation
  const inviteMutation = useMutation({
    mutationFn: async (data: InviteFormData) => {
      const response = await fetch('/api/super-admin/admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erreur lors de l\'invitation')
      }
      return response.json()
    },
    onSuccess: (data) => {
      toast.success(data.message || `Invitation envoyée à ${form.getValues('email')}`)
      setInviteDialogOpen(false)
      form.reset()
      queryClient.invalidateQueries({ queryKey: ['platform-admins'] })
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erreur lors de l\'envoi de l\'invitation')
    },
  })

  // Revoke mutation
  const revokeMutation = useMutation({
    mutationFn: async ({ adminId, reason }: { adminId: string; reason?: string }) => {
      const response = await fetch(`/api/super-admin/admins/${adminId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erreur lors de la révocation')
      }
      return response.json()
    },
    onSuccess: () => {
      toast.success('Accès révoqué')
      setRevokingAdmin(null)
      queryClient.invalidateQueries({ queryKey: ['platform-admins'] })
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erreur lors de la révocation')
    },
  })

  const handleInvite = async (data: InviteFormData) => {
    inviteMutation.mutate(data)
  }

  const handleRevoke = async () => {
    if (!revokingAdmin) return
    revokeMutation.mutate({ adminId: revokingAdmin.id })
  }

  const formatDate = (date: string | null) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  const getRelativeTime = (date: string | null) => {
    if (!date) return 'Jamais'
    const now = new Date()
    const then = new Date(date)
    const diff = now.getTime() - then.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 60) return `il y a ${minutes} min`
    if (hours < 24) return `il y a ${hours}h`
    if (days < 7) return `il y a ${days}j`
    return formatDate(date)
  }

  return (
    <PlatformAdminGuard requiredPermission="manage_team">
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <motion.h1
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-2xl font-bold tracking-tight"
            >
              Gestion de l'Équipe
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-muted-foreground"
            >
              Gérez les administrateurs de la plateforme
            </motion.p>
          </div>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Button onClick={() => setInviteDialogOpen(true)} className="gap-2">
              <UserPlus className="h-4 w-4" />
              Inviter un admin
            </Button>
          </motion.div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          <StatsCard
            title="Total administrateurs"
            value={stats.totalAdmins}
            icon={<Users className="h-6 w-6 text-brand-blue" />}
            iconBgColor="bg-brand-blue/10"
          />
          <StatsCard
            title="Admins actifs"
            value={stats.activeAdmins}
            icon={<UserCheck className="h-6 w-6 text-emerald-600" />}
            iconBgColor="bg-emerald-500/10"
          />
          <StatsCard
            title="Invitations en attente"
            value={stats.pendingInvites}
            icon={<Clock className="h-6 w-6 text-amber-600" />}
            iconBgColor="bg-amber-500/10"
          />
        </div>

        {/* Roles Overview */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(Object.entries(roleConfig) as [PlatformAdminRole, typeof roleConfig[PlatformAdminRole]][]).map(
            ([role, config]) => {
              const count = admins.filter((a) => a.role === role && a.is_active).length
              return (
                <Card key={role} className="relative overflow-hidden">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <Badge className={cn('mb-2', config.color)}>{config.label}</Badge>
                        <p className="text-2xl font-bold">{count}</p>
                        <p className="text-xs text-muted-foreground">{config.description}</p>
                      </div>
                      <Shield className="h-8 w-8 text-muted-foreground/20" />
                    </div>
                  </CardContent>
                </Card>
              )
            }
          )}
        </div>

        {/* Team Table */}
        <Card>
          <CardHeader>
            <CardTitle>Membres de l'équipe</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-8 text-center text-muted-foreground">Chargement...</div>
            ) : admins.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">Aucun administrateur</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Membre</TableHead>
                    <TableHead>Rôle</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Dernière activité</TableHead>
                    <TableHead>Invité le</TableHead>
                    <TableHead className="w-[50px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {admins.map((admin) => {
                    const role = roleConfig[admin.role]
                    return (
                      <TableRow key={admin.id} className="group">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={admin.user?.avatar_url || undefined} />
                              <AvatarFallback className="bg-muted text-xs font-medium">
                                {admin.user?.full_name
                                  ?.split(' ')
                                  .map((n) => n[0])
                                  .join('')
                                  .toUpperCase() || admin.user?.email?.[0].toUpperCase() || '?'}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{admin.user?.full_name || admin.user?.email || 'Invité'}</p>
                              <p className="text-sm text-muted-foreground">{admin.user?.email || 'En attente d\'acceptation'}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={cn(role.color)}>{role.label}</Badge>
                        </TableCell>
                        <TableCell>
                          {admin.is_active ? (
                            <Badge
                              variant="outline"
                              className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1"
                            >
                              <CheckCircle2 className="h-3 w-3" />
                              Actif
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="bg-gray-50 text-gray-500 border-gray-200 gap-1"
                            >
                              <XCircle className="h-3 w-3" />
                              Révoqué
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{getRelativeTime(admin.last_active_at)}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {formatDate(admin.invited_at)}
                          </span>
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
                              <DropdownMenuItem onClick={() => setEditingAdmin(admin)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Modifier les permissions
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Key className="mr-2 h-4 w-4" />
                                Réinitialiser le mot de passe
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Mail className="mr-2 h-4 w-4" />
                                Envoyer un email
                              </DropdownMenuItem>
                              {admin.is_active && admin.role !== 'super_admin' && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => setRevokingAdmin(admin)}
                                    className="text-red-600"
                                  >
                                    <UserX className="mr-2 h-4 w-4" />
                                    Révoquer l'accès
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Invite Dialog */}
        <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Inviter un administrateur</DialogTitle>
              <DialogDescription>
                Envoyez une invitation par email pour rejoindre l'équipe d'administration
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleInvite)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Adresse email</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="admin@exemple.com" type="email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rôle</FormLabel>
                      <Select onValueChange={(value: string) => field.onChange(value)} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {(Object.entries(roleConfig) as [PlatformAdminRole, typeof roleConfig[PlatformAdminRole]][]).map(
                            ([role, config]) => (
                              <SelectItem key={role} value={role}>
                                <div className="flex items-center gap-2">
                                  <Badge className={cn('text-xs', config.color)}>{config.label}</Badge>
                                </div>
                              </SelectItem>
                            )
                          )}
                        </SelectContent>
                      </Select>
                      <FormDescription>{roleConfig[watchedRole]?.description}</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Custom permissions (for non-super_admin roles) */}
                {watchedRole !== 'super_admin' && (
                  <div className="space-y-4">
                    <FormLabel>Permissions personnalisées</FormLabel>
                    <div className="grid gap-3 max-h-48 overflow-y-auto border rounded-lg p-3">
                      {permissionsList.map((permission) => (
                        <FormField
                          key={permission.key}
                          control={form.control}
                          name={`permissions.${permission.key}`}
                          render={({ field }) => (
                            <FormItem className="flex items-center space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <div className="space-y-0.5">
                                <FormLabel className="text-sm font-normal cursor-pointer">
                                  {permission.label}
                                </FormLabel>
                                <FormDescription className="text-xs">
                                  {permission.description}
                                </FormDescription>
                              </div>
                            </FormItem>
                          )}
                        />
                      ))}
                    </div>
                  </div>
                )}

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setInviteDialogOpen(false)}
                  >
                    Annuler
                  </Button>
                  <Button type="submit" disabled={inviteMutation.isPending} className="gap-2">
                    <Send className="h-4 w-4" />
                    {inviteMutation.isPending ? 'Envoi...' : 'Envoyer l\'invitation'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Revoke Confirmation */}
        <AlertDialog open={!!revokingAdmin} onOpenChange={() => setRevokingAdmin(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Révoquer l'accès?</AlertDialogTitle>
              <AlertDialogDescription>
                Êtes-vous sûr de vouloir révoquer l'accès de{' '}
                <span className="font-semibold">{revokingAdmin?.user?.full_name}</span>?
                Cette personne n'aura plus accès à l'espace d'administration.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleRevoke}
                disabled={revokeMutation.isPending}
                className="bg-red-600 hover:bg-red-700"
              >
                {revokeMutation.isPending ? 'Révocation...' : 'Révoquer'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </PlatformAdminGuard>
  )
}
