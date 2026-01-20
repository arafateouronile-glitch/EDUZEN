'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { usePlatformAdmin } from '@/lib/hooks/use-platform-admin'
import { motion } from '@/components/ui/motion'
import {
  FolderOpen,
  Plus,
  Edit,
  Trash2,
  Check,
  X,
  RefreshCw,
  FolderTree,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'
import type { BlogCategory, BlogCategoryRow } from '@/types/super-admin.types'

export default function BlogCategoriesPage() {
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
              Vous n'avez pas les permissions nécessaires pour gérer les catégories.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  // Fetch categories
  const { data: categories, isLoading, refetch } = useQuery<BlogCategoryRow[]>({
    queryKey: ['blog-categories'],
    queryFn: async (): Promise<BlogCategoryRow[]> => {
      const { data, error } = await supabase
        .from('blog_categories')
        .select('*')
        .order('display_order', { ascending: true })

      if (error) throw error
      return (data || []) as BlogCategoryRow[]
    },
    staleTime: 1000 * 60 * 5,
  })

  // Toggle category active status
  const toggleCategoryMutation = useMutation({
    mutationFn: async ({ categoryId, isActive }: { categoryId: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('blog_categories')
        .update({ is_active: !isActive })
        .eq('id', categoryId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blog-categories'] })
    },
  })

  // Delete category
  const deleteCategoryMutation = useMutation({
    mutationFn: async (categoryId: string) => {
      const { error } = await supabase
        .from('blog_categories')
        .delete()
        .eq('id', categoryId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blog-categories'] })
    },
  })

  // Organize categories by parent
  const organizedCategories = categories
    ? categories.reduce(
        (acc, cat) => {
          if (!cat.parent_id) {
            acc.parents.push(cat)
          } else {
            if (!acc.children[cat.parent_id]) {
              acc.children[cat.parent_id] = []
            }
            acc.children[cat.parent_id].push(cat)
          }
          return acc
        },
        {
          parents: [] as BlogCategoryRow[],
          children: {} as Record<string, BlogCategoryRow[]>,
        }
      )
    : { parents: [], children: {} }

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
            Catégories du Blog
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-muted-foreground"
          >
            Organisez vos articles par catégories et sous-catégories
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
            Nouvelle Catégorie
          </Button>
        </motion.div>
      </div>

      {/* Categories List */}
      <div className="space-y-4">
        {organizedCategories.parents.length > 0 ? (
          organizedCategories.parents.map((parent) => (
            <Card key={parent.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FolderTree className="h-5 w-5 text-primary" />
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg">{parent.name}</CardTitle>
                        <Badge variant={parent.is_active ? 'default' : 'secondary'}>
                          {parent.is_active ? (
                            <>
                              <Check className="h-3 w-3 mr-1" />
                              Actif
                            </>
                          ) : (
                            <>
                              <X className="h-3 w-3 mr-1" />
                              Inactif
                            </>
                          )}
                        </Badge>
                      </div>
                      <CardDescription className="mt-1">
                        {parent.slug} {parent.description && `• ${parent.description}`}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        // TODO: Open edit dialog
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={parent.is_active ? 'secondary' : 'default'}
                      size="sm"
                      onClick={() => {
                        toggleCategoryMutation.mutate({
                          categoryId: parent.id,
                          isActive: parent.is_active,
                        })
                      }}
                      disabled={toggleCategoryMutation.isPending}
                    >
                      {parent.is_active ? (
                        <X className="h-4 w-4" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (confirm('Êtes-vous sûr de vouloir supprimer cette catégorie ?')) {
                          deleteCategoryMutation.mutate(parent.id)
                        }
                      }}
                      disabled={deleteCategoryMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              {organizedCategories.children[parent.id] &&
                organizedCategories.children[parent.id].length > 0 && (
                  <CardContent className="pt-0">
                    <div className="pl-8 space-y-2 border-l-2 border-muted">
                      {organizedCategories.children[parent.id].map((child) => (
                        <div
                          key={child.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                        >
                          <div className="flex items-center gap-3">
                            <FolderOpen className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{child.name}</span>
                                <Badge variant={child.is_active ? 'default' : 'secondary'} className="text-xs">
                                  {child.is_active ? 'Actif' : 'Inactif'}
                                </Badge>
                              </div>
                              <div className="text-xs text-muted-foreground mt-0.5">
                                {child.slug}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                // TODO: Open edit dialog
                              }}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                toggleCategoryMutation.mutate({
                                  categoryId: child.id,
                                  isActive: child.is_active,
                                })
                              }}
                              disabled={toggleCategoryMutation.isPending}
                            >
                              {child.is_active ? (
                                <X className="h-3 w-3" />
                              ) : (
                                <Check className="h-3 w-3" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (confirm('Êtes-vous sûr de vouloir supprimer cette sous-catégorie ?')) {
                                  deleteCategoryMutation.mutate(child.id)
                                }
                              }}
                              disabled={deleteCategoryMutation.isPending}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                )}
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Aucune catégorie</h3>
              <p className="text-sm text-muted-foreground mb-4 text-center max-w-md">
                Créez votre première catégorie pour organiser vos articles de blog.
              </p>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Créer une catégorie
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
