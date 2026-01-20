'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { usePlatformAdmin } from '@/lib/hooks/use-platform-admin'
import { motion } from '@/components/ui/motion'
import {
  MessageSquare,
  CheckCircle,
  XCircle,
  Trash2,
  AlertTriangle,
  RefreshCw,
  Search,
  Filter,
  Eye,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'
import type { BlogComment, CommentStatus } from '@/types/super-admin.types'

const statusConfig: Record<CommentStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: 'En attente', variant: 'secondary' },
  approved: { label: 'Approuvé', variant: 'default' },
  spam: { label: 'Spam', variant: 'destructive' },
  deleted: { label: 'Supprimé', variant: 'outline' },
}

export default function BlogCommentsPage() {
  const { canModerateComments, isSuperAdmin } = usePlatformAdmin()
  const supabase = createClient()
  const queryClient = useQueryClient()

  // Vérifier les permissions
  if (!canModerateComments && !isSuperAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Accès restreint</CardTitle>
            <CardDescription>
              Vous n'avez pas les permissions nécessaires pour modérer les commentaires.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  // Fetch comments
  const { data: comments, isLoading, refetch } = useQuery<BlogComment[]>({
    queryKey: ['blog-comments'],
    queryFn: async (): Promise<BlogComment[]> => {
      const { data, error } = await supabase
        .from('blog_comments')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) throw error
      return (data || []) as BlogComment[]
    },
    staleTime: 1000 * 60 * 5,
  })

  // Update comment status
  const updateCommentStatusMutation = useMutation({
    mutationFn: async ({ commentId, status }: { commentId: string; status: CommentStatus }) => {
      const { error } = await supabase
        .from('blog_comments')
        .update({ status })
        .eq('id', commentId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blog-comments'] })
    },
  })

  // Delete comment
  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      const { error } = await supabase
        .from('blog_comments')
        .update({ status: 'deleted' })
        .eq('id', commentId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blog-comments'] })
    },
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
                <div key={i} className="h-24 bg-muted animate-pulse rounded" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const stats = {
    total: comments?.length || 0,
    pending: comments?.filter((c) => c.status === 'pending').length || 0,
    approved: comments?.filter((c) => c.status === 'approved').length || 0,
    spam: comments?.filter((c) => c.status === 'spam').length || 0,
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
            Modération des Commentaires
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-muted-foreground"
          >
            Gérez et modérez les commentaires de vos articles de blog
          </motion.p>
        </div>
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Actualiser
          </Button>
        </motion.div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En attente</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approuvés</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Spam</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.spam}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Commentaires</CardTitle>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher..."
                  className="pl-10 w-64"
                />
              </div>
              <Button variant="outline" size="sm" className="gap-2">
                <Filter className="h-4 w-4" />
                Filtres
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {comments && comments.length > 0 ? (
              comments.map((comment) => (
                <div
                  key={comment.id}
                  className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">
                          {comment.user_id
                            ? comment.user?.full_name || comment.user?.email || 'Utilisateur'
                            : comment.guest_name || 'Invité'}
                        </span>
                        <Badge variant={statusConfig[comment.status].variant}>
                          {statusConfig[comment.status].label}
                        </Badge>
                        {comment.parent_id && (
                          <Badge variant="outline" className="text-xs">
                            Réponse
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{comment.content}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>{formatDate(comment.created_at)}</span>
                        {comment.ip_address && <span>IP: {comment.ip_address}</span>}
                        {comment.likes_count > 0 && (
                          <span>❤️ {comment.likes_count} j'aime</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {comment.status === 'pending' && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              updateCommentStatusMutation.mutate({
                                commentId: comment.id,
                                status: 'approved',
                              })
                            }}
                            disabled={updateCommentStatusMutation.isPending}
                            className="gap-1"
                          >
                            <CheckCircle className="h-4 w-4" />
                            Approuver
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              updateCommentStatusMutation.mutate({
                                commentId: comment.id,
                                status: 'spam',
                              })
                            }}
                            disabled={updateCommentStatusMutation.isPending}
                            className="gap-1"
                          >
                            <AlertTriangle className="h-4 w-4" />
                            Spam
                          </Button>
                        </>
                      )}
                      {comment.status === 'approved' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            updateCommentStatusMutation.mutate({
                              commentId: comment.id,
                              status: 'pending',
                            })
                            }}
                            disabled={updateCommentStatusMutation.isPending}
                        >
                          Modifier
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (confirm('Êtes-vous sûr de vouloir supprimer ce commentaire ?')) {
                            deleteCommentMutation.mutate(comment.id)
                          }
                        }}
                        disabled={deleteCommentMutation.isPending}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12">
                <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Aucun commentaire</h3>
                <p className="text-sm text-muted-foreground">
                  Les commentaires apparaîtront ici une fois publiés.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
