'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { usePlatformAdmin } from '@/lib/hooks/use-platform-admin'
import { motion } from '@/components/ui/motion'
import {
  Tag,
  Plus,
  Edit,
  Trash2,
  RefreshCw,
  Hash,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'
import type { BlogTag } from '@/types/super-admin.types'

export default function BlogTagsPage() {
  const { canManageBlog, isSuperAdmin } = usePlatformAdmin()
  const supabase = createClient()
  const queryClient = useQueryClient()

  // Vérifier les permissions
  if (!canManageBlog && !isSuperAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Accès restreint</CardTitle>
            <CardDescription>
              Vous n'avez pas les permissions nécessaires pour gérer les tags.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  // Fetch tags
  const { data: tags, isLoading, refetch } = useQuery<BlogTag[]>({
    queryKey: ['blog-tags'],
    queryFn: async (): Promise<BlogTag[]> => {
      const { data, error } = await supabase
        .from('blog_tags')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      return (data || []) as BlogTag[]
    },
    staleTime: 1000 * 60 * 5,
  })

  // Delete tag
  const deleteTagMutation = useMutation({
    mutationFn: async (tagId: string) => {
      const { error } = await supabase
        .from('blog_tags')
        .delete()
        .eq('id', tagId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blog-tags'] })
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
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div key={i} className="h-8 bg-muted animate-pulse rounded w-24" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
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
            Tags du Blog
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-muted-foreground"
          >
            Gérez les tags pour étiqueter et organiser vos articles
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
          <Button size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            Nouveau Tag
          </Button>
        </motion.div>
      </div>

      {/* Tags Grid */}
      <Card>
        <CardHeader>
          <CardTitle>Tags ({tags?.length || 0})</CardTitle>
          <CardDescription>
            Cliquez sur un tag pour le modifier ou le supprimer
          </CardDescription>
        </CardHeader>
        <CardContent>
          {tags && tags.length > 0 ? (
            <div className="flex flex-wrap gap-3">
              {tags.map((tag) => (
                <div
                  key={tag.id}
                  className="group relative flex items-center gap-2 p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => {
                    // TODO: Open edit dialog
                  }}
                >
                  <Hash className="h-4 w-4 text-muted-foreground" />
                  <Badge
                    variant="outline"
                    style={{
                      borderColor: tag.color || undefined,
                      color: tag.color || undefined,
                    }}
                    className="font-medium"
                  >
                    {tag.name}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{tag.slug}</span>
                  <div className="absolute top-0 right-0 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={(e) => {
                        e.stopPropagation()
                        // TODO: Open edit dialog
                      }}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation()
                        if (confirm(`Êtes-vous sûr de vouloir supprimer le tag "${tag.name}" ?`)) {
                          deleteTagMutation.mutate(tag.id)
                        }
                      }}
                      disabled={deleteTagMutation.isPending}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Tag className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Aucun tag</h3>
              <p className="text-sm text-muted-foreground mb-4 text-center max-w-md">
                Créez votre premier tag pour commencer à étiqueter vos articles.
              </p>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Créer un tag
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
