'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/use-auth'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/toast'
import { RoleGuard, ADMIN_ROLES } from '@/components/auth/role-guard'
import {
  Users,
  Plus,
  Search,
  Mail,
  Phone,
  Shield,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Edit,
  Trash2,
  MoreVertical
} from 'lucide-react'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Administrateur',
  admin: 'Administrateur',
  teacher: 'Enseignant',
  secretary: 'Secrétaire',
  accountant: 'Comptable',
  parent: 'Parent',
  student: 'Étudiant',
}

const ROLE_COLORS: Record<string, string> = {
  super_admin: 'bg-purple-100 text-purple-800',
  admin: 'bg-blue-100 text-blue-800',
  teacher: 'bg-green-100 text-green-800',
  secretary: 'bg-orange-100 text-orange-800',
  accountant: 'bg-yellow-100 text-yellow-800',
  parent: 'bg-gray-100 text-gray-800',
  student: 'bg-cyan-100 text-cyan-800',
}

function UsersSettingsPageContent() {
  const { user } = useAuth()
  const supabase = createClient()
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<string | null>(null)
  
  // Fonction pour forcer le rafraîchissement
  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['organization-users'] })
    queryClient.refetchQueries({ queryKey: ['organization-users'] })
    addToast({
      type: 'info',
      title: 'Actualisation',
      description: 'Liste des utilisateurs actualisée',
    })
  }
  
  // Rafraîchir automatiquement quand on revient sur la page
  useEffect(() => {
    const handleFocus = () => {
      queryClient.invalidateQueries({ queryKey: ['organization-users'] })
    }
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [queryClient])

  // Récupérer TOUS les utilisateurs de l'organisation (tous les rôles)
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['organization-users', user?.organization_id, searchQuery, roleFilter],
    queryFn: async () => {
      if (!user?.organization_id) {
        console.log('⚠️ [USERS] Pas d\'organization_id pour l\'utilisateur:', user?.id)
        return []
      }
      
      console.log('🔍 [USERS] Récupération des utilisateurs pour organization_id:', user.organization_id)
      console.log('🔍 [USERS] Utilisateur actuel:', {
        id: user.id,
        email: user.email,
        role: user.role,
        organization_id: user.organization_id,
      })
      
      // Essayer d'abord avec une requête simple
      let query = supabase
        .from('users')
        .select('id, email, full_name, phone, role, is_active, last_login_at, created_at, updated_at, organization_id')
        .eq('organization_id', user.organization_id)
        .order('created_at', { ascending: false })
      
      console.log('🔍 [USERS] Requête Supabase construite, exécution...')

      if (searchQuery) {
        query = query.or(`full_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`)
      }

      if (roleFilter) {
        query = query.eq('role', roleFilter)
        console.log('🔍 [USERS] Filtre par rôle appliqué:', roleFilter)
      }

      const { data, error } = await query
      
      if (error) {
        console.error('❌ [USERS] Erreur lors de la récupération:', error)
        throw error
      }
      
      console.log('✅ [USERS] Utilisateurs récupérés:', data?.length || 0)
      if (data && data.length > 0) {
        const usersDetails = data.map(u => ({
          id: u.id,
          email: u.email,
          full_name: u.full_name,
          role: u.role,
          organization_id: u.organization_id,
          is_active: u.is_active,
        }))
        console.log('📋 [USERS] Détails des utilisateurs:', usersDetails)
        console.log('📋 [USERS] Détails complets (pour debug):', JSON.stringify(usersDetails, null, 2))
        console.log('📊 [USERS] Répartition par rôle:', {
          teachers: data.filter(u => u.role === 'teacher').length,
          admins: data.filter(u => u.role === 'admin' || u.role === 'super_admin').length,
          secretaries: data.filter(u => u.role === 'secretary').length,
          accountants: data.filter(u => u.role === 'accountant').length,
          others: data.filter(u => !['teacher', 'admin', 'super_admin', 'secretary', 'accountant'].includes(u.role)).length,
        })
      } else {
        console.warn('⚠️ [USERS] Aucun utilisateur trouvé pour organization_id:', user.organization_id)
      }
      
      return data || []
    },
    enabled: !!user?.organization_id,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    staleTime: 0, // Toujours considérer les données comme obsolètes pour forcer le refetch
  })

  // Mutation pour activer/désactiver un utilisateur
  const toggleUserStatusMutation = useMutation({
    mutationFn: async ({ userId, isActive }: { userId: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('users')
        .update({ is_active: !isActive })
        .eq('id', userId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-users'] })
      addToast({
        title: 'Succès',
        description: 'Le statut de l\'utilisateur a été mis à jour',
        variant: 'success',
      })
    },
    onError: (error: any) => {
      addToast({
        title: 'Erreur',
        description: error.message || 'Erreur lors de la mise à jour',
        variant: 'error',
      })
    },
  })

  // Statistiques
  const stats = {
    total: users.length,
    active: users.filter((u) => u.is_active).length,
    inactive: users.filter((u) => !u.is_active).length,
    byRole: Object.keys(ROLE_LABELS).reduce((acc, role) => {
      acc[role] = users.filter((u) => u.role === role).length
      return acc
    }, {} as Record<string, number>),
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-brand-blue" />
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <Users className="h-8 w-8 text-brand-blue" />
          Gestion des utilisateurs
        </h1>
        <p className="text-muted-foreground">
          Gérez les utilisateurs de votre organisation
        </p>
      </div>

      {/* Statistiques générales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total utilisateurs</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Actifs</p>
                <p className="text-2xl font-bold text-green-600">{stats.active}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Inactifs</p>
                <p className="text-2xl font-bold text-red-600">{stats.inactive}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Statistiques par rôle */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Administrateurs</p>
              <p className="text-2xl font-bold text-purple-600">
                {(stats.byRole.admin || 0) + (stats.byRole.super_admin || 0)}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Enseignants</p>
              <p className="text-2xl font-bold text-green-600">
                {stats.byRole.teacher || 0}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Secrétaires</p>
              <p className="text-2xl font-bold text-orange-600">
                {stats.byRole.secretary || 0}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Comptables</p>
              <p className="text-2xl font-bold text-yellow-600">
                {stats.byRole.accountant || 0}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Parents</p>
              <p className="text-2xl font-bold text-gray-600">
                {stats.byRole.parent || 0}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Étudiants</p>
              <p className="text-2xl font-bold text-cyan-600">
                {stats.byRole.student || 0}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtres et recherche */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par nom ou email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant={roleFilter === null ? 'default' : 'outline'}
                onClick={() => setRoleFilter(null)}
              >
                Tous
              </Button>
              {Object.keys(ROLE_LABELS).map((role) => (
                <Button
                  key={role}
                  variant={roleFilter === role ? 'default' : 'outline'}
                  onClick={() => setRoleFilter(roleFilter === role ? null : role)}
                >
                  {ROLE_LABELS[role]}
                </Button>
              ))}
            </div>
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Actualiser
            </Button>
            <Button asChild>
              <Link href="/dashboard/settings/users/new">
                <Plus className="h-4 w-4 mr-2" />
                Nouvel utilisateur
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Liste des utilisateurs */}
      <Card>
        <CardHeader>
          <CardTitle>Liste des utilisateurs</CardTitle>
          <CardDescription>
            {users.length} utilisateur{users.length > 1 ? 's' : ''} trouvé{users.length > 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">
                {searchQuery || roleFilter
                  ? 'Aucun utilisateur ne correspond à vos critères'
                  : 'Aucun utilisateur trouvé'}
              </p>
              {!searchQuery && !roleFilter && (
                <Button asChild>
                  <Link href="/dashboard/settings/users/new">
                    <Plus className="h-4 w-4 mr-2" />
                    Créer le premier utilisateur
                  </Link>
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {users.map((userItem) => (
                <Card key={userItem.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold">
                            {userItem.full_name || 'Sans nom'}
                          </h3>
                          <Badge className={ROLE_COLORS[userItem.role] || 'bg-gray-100 text-gray-800'}>
                            {ROLE_LABELS[userItem.role] || userItem.role}
                          </Badge>
                          {userItem.is_active ? (
                            <Badge className="bg-green-100 text-green-800">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Actif
                            </Badge>
                          ) : (
                            <Badge className="bg-red-100 text-red-800">
                              <XCircle className="h-3 w-3 mr-1" />
                              Inactif
                            </Badge>
                          )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-3">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Mail className="h-4 w-4" />
                            <span>{userItem.email}</span>
                          </div>
                          {userItem.phone && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Phone className="h-4 w-4" />
                              <span>{userItem.phone}</span>
                            </div>
                          )}
                          {userItem.last_login_at && (
                            <div className="text-muted-foreground">
                              Dernière connexion: {formatDate(userItem.last_login_at)}
                            </div>
                          )}
                          <div className="text-muted-foreground">
                            Créé le: {formatDate(userItem.created_at)}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            toggleUserStatusMutation.mutate({
                              userId: userItem.id,
                              isActive: userItem.is_active,
                            })
                          }
                          disabled={toggleUserStatusMutation.isPending}
                        >
                          {userItem.is_active ? (
                            <>
                              <XCircle className="h-4 w-4 mr-2" />
                              Désactiver
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="h-4 w-4 mr-2" />
                              Activer
                            </>
                          )}
                        </Button>
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/dashboard/settings/users/${userItem.id}`}>
                            <Edit className="h-4 w-4 mr-2" />
                            Modifier
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function UsersSettingsPage() {
  return (
    <RoleGuard allowedRoles={ADMIN_ROLES}>
      <UsersSettingsPageContent />
    </RoleGuard>
  )
}
