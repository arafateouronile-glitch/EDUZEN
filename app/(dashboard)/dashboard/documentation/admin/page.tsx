'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/use-auth'
import { documentationService } from '@/lib/services/documentation.service.client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  Plus,
  Edit,
  Trash2,
  BookOpen,
  FileText,
  Settings,
  Eye,
  Save,
  X,
  ArrowLeft,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select-shadcn'

export default function DocumentationAdminPage() {
  const { user } = useAuth()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('categories')

  // États pour les modals
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false)
  const [articleDialogOpen, setArticleDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<any>(null)
  const [editingArticle, setEditingArticle] = useState<any>(null)

  // Récupérer les catégories
  const { data: categories } = useQuery({
    queryKey: ['documentation-categories', user?.organization_id],
    queryFn: () => documentationService.getCategories(user?.organization_id || ''),
    enabled: !!user?.organization_id,
  })

  // Récupérer tous les articles (y compris les brouillons)
  const { data: allArticles } = useQuery({
    queryKey: ['documentation-all-articles', user?.organization_id],
    queryFn: async () => {
      if (!categories || categories.length === 0) return []
      
      const articlesPromises = categories.map((cat: any) =>
        documentationService.getArticlesByCategory(cat.id, 'draft').catch(() => [])
      )
      const articlesArrays = await Promise.all(articlesPromises)
      return articlesArrays.flat()
    },
    enabled: !!categories && categories.length > 0,
  })

  // Créer une catégorie
  const createCategoryMutation = useMutation({
    mutationFn: async (data: any) => {
      return documentationService.createCategory({
        ...data,
        organization_id: user?.organization_id,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documentation-categories'] })
      setCategoryDialogOpen(false)
      setEditingCategory(null)
    },
  })

  // Mettre à jour une catégorie
  const updateCategoryMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return documentationService.updateCategory(id, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documentation-categories'] })
      setCategoryDialogOpen(false)
      setEditingCategory(null)
    },
  })

  // Supprimer une catégorie
  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: string) => {
      return documentationService.deleteCategory(id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documentation-categories'] })
    },
  })

  // Créer un article
  const createArticleMutation = useMutation({
    mutationFn: async (data: any) => {
      return documentationService.createArticle({
        ...data,
        organization_id: user?.organization_id,
        author_id: user?.id,
        status: 'draft',
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documentation-all-articles'] })
      setArticleDialogOpen(false)
      setEditingArticle(null)
    },
  })

  // Mettre à jour un article
  const updateArticleMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return documentationService.updateArticle(id, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documentation-all-articles'] })
      setArticleDialogOpen(false)
      setEditingArticle(null)
    },
  })

  // Supprimer un article
  const deleteArticleMutation = useMutation({
    mutationFn: async (id: string) => {
      return documentationService.deleteArticle(id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documentation-all-articles'] })
    },
  })

  const handleCategorySubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const data = {
      name: formData.get('name') as string,
      slug: formData.get('slug') as string,
      description: formData.get('description') as string,
      icon: formData.get('icon') as string,
      order_index: parseInt(formData.get('order_index') as string) || 0,
      is_public: formData.get('is_public') === 'on',
    }

    if (editingCategory) {
      updateCategoryMutation.mutate({ id: editingCategory.id, data })
    } else {
      createCategoryMutation.mutate(data)
    }
  }

  const handleArticleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const data = {
      category_id: formData.get('category_id') as string,
      title: formData.get('title') as string,
      slug: formData.get('slug') as string,
      content: formData.get('content') as string,
      excerpt: formData.get('excerpt') as string,
      status: formData.get('status') as 'draft' | 'published' | 'archived',
      is_featured: formData.get('is_featured') === 'on',
      order_index: parseInt(formData.get('order_index') as string) || 0,
      tags: (formData.get('tags') as string)?.split(',').map((t) => t.trim()).filter(Boolean) || [],
      meta_title: formData.get('meta_title') as string,
      meta_description: formData.get('meta_description') as string,
      published_at: formData.get('status') === 'published' ? new Date().toISOString() : null,
    }

    if (editingArticle) {
      updateArticleMutation.mutate({ id: editingArticle.id, data })
    } else {
      createArticleMutation.mutate(data)
    }
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-6">
        <Link href="/dashboard/documentation">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour à la documentation
          </Button>
        </Link>
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <Settings className="h-8 w-8" />
          Administration de la documentation
        </h1>
        <p className="text-muted-foreground">
          Gérez les catégories et articles de la documentation
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="categories">
            <BookOpen className="h-4 w-4 mr-2" />
            Catégories
          </TabsTrigger>
          <TabsTrigger value="articles">
            <FileText className="h-4 w-4 mr-2" />
            Articles
          </TabsTrigger>
        </TabsList>

        {/* Onglet Catégories */}
        <TabsContent value="categories">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Catégories</CardTitle>
                <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      onClick={() => {
                        setEditingCategory(null)
                        setCategoryDialogOpen(true)
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Nouvelle catégorie
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>
                        {editingCategory ? 'Modifier la catégorie' : 'Nouvelle catégorie'}
                      </DialogTitle>
                      <DialogDescription>
                        Créez ou modifiez une catégorie de documentation
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCategorySubmit}>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="name">Nom *</Label>
                          <Input
                            id="name"
                            name="name"
                            defaultValue={editingCategory?.name}
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="slug">Slug *</Label>
                          <Input
                            id="slug"
                            name="slug"
                            defaultValue={editingCategory?.slug}
                            required
                            placeholder="exemple-categorie"
                          />
                        </div>
                        <div>
                          <Label htmlFor="description">Description</Label>
                          <Textarea
                            id="description"
                            name="description"
                            defaultValue={editingCategory?.description}
                            rows={3}
                          />
                        </div>
                        <div>
                          <Label htmlFor="icon">Icône (nom lucide-react)</Label>
                          <Input
                            id="icon"
                            name="icon"
                            defaultValue={editingCategory?.icon}
                            placeholder="BookOpen"
                          />
                        </div>
                        <div>
                          <Label htmlFor="order_index">Ordre d'affichage</Label>
                          <Input
                            id="order_index"
                            name="order_index"
                            type="number"
                            defaultValue={editingCategory?.order_index || 0}
                          />
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={editingCategory?.is_public || false}
                            onCheckedChange={(checked) => {
                              if (editingCategory) {
                                setEditingCategory({ ...editingCategory, is_public: checked })
                              }
                            }}
                          />
                          <Label htmlFor="is_public">Documentation publique</Label>
                        </div>
                      </div>
                      <DialogFooter className="mt-6">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setCategoryDialogOpen(false)
                            setEditingCategory(null)
                          }}
                        >
                          Annuler
                        </Button>
                        <Button type="submit" disabled={createCategoryMutation.isPending}>
                          {editingCategory ? 'Modifier' : 'Créer'}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {categories && categories.length > 0 ? (
                <div className="space-y-2">
                  {categories.map((category: any) => (
                    <div
                      key={category.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex-1">
                        <h3 className="font-semibold">{category.name}</h3>
                        {category.description && (
                          <p className="text-sm text-muted-foreground">{category.description}</p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span>Slug: {category.slug}</span>
                          <span>Ordre: {category.order_index}</span>
                          <span>{category.is_public ? 'Publique' : 'Privée'}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingCategory(category)
                            setCategoryDialogOpen(true)
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (confirm('Êtes-vous sûr de vouloir supprimer cette catégorie ?')) {
                              deleteCategoryMutation.mutate(category.id)
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  Aucune catégorie. Créez-en une pour commencer.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Onglet Articles */}
        <TabsContent value="articles">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Articles</CardTitle>
                <Dialog open={articleDialogOpen} onOpenChange={setArticleDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      onClick={() => {
                        setEditingArticle(null)
                        setArticleDialogOpen(true)
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Nouvel article
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>
                        {editingArticle ? 'Modifier l\'article' : 'Nouvel article'}
                      </DialogTitle>
                      <DialogDescription>
                        Créez ou modifiez un article de documentation
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleArticleSubmit}>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="article_category_id">Catégorie *</Label>
                          <Select
                            value={editingArticle?.category_id || ''}
                            onValueChange={(value) => {
                              if (editingArticle) {
                                setEditingArticle({ ...editingArticle, category_id: value })
                              }
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionner une catégorie" />
                            </SelectTrigger>
                            <SelectContent>
                              {categories?.map((cat: any) => (
                                <SelectItem key={cat.id} value={cat.id}>
                                  {cat.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="article_title">Titre *</Label>
                          <Input
                            id="article_title"
                            name="title"
                            defaultValue={editingArticle?.title}
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="article_slug">Slug *</Label>
                          <Input
                            id="article_slug"
                            name="slug"
                            defaultValue={editingArticle?.slug}
                            required
                            placeholder="exemple-article"
                          />
                        </div>
                        <div>
                          <Label htmlFor="article_excerpt">Résumé</Label>
                          <Textarea
                            id="article_excerpt"
                            name="excerpt"
                            defaultValue={editingArticle?.excerpt}
                            rows={2}
                          />
                        </div>
                        <div>
                          <Label htmlFor="article_content">Contenu (Markdown) *</Label>
                          <Textarea
                            id="article_content"
                            name="content"
                            defaultValue={editingArticle?.content}
                            required
                            rows={15}
                            className="font-mono text-sm"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="article_status">Statut</Label>
                            <Select
                              value={editingArticle?.status || 'draft'}
                              onValueChange={(value) => {
                                if (editingArticle) {
                                  setEditingArticle({ ...editingArticle, status: value })
                                }
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="draft">Brouillon</SelectItem>
                                <SelectItem value="published">Publié</SelectItem>
                                <SelectItem value="archived">Archivé</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="article_order_index">Ordre d'affichage</Label>
                            <Input
                              id="article_order_index"
                              name="order_index"
                              type="number"
                              defaultValue={editingArticle?.order_index || 0}
                            />
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="article_tags">Tags (séparés par des virgules)</Label>
                          <Input
                            id="article_tags"
                            name="tags"
                            defaultValue={editingArticle?.tags?.join(', ')}
                            placeholder="tag1, tag2, tag3"
                          />
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={editingArticle?.is_featured || false}
                            onCheckedChange={(checked) => {
                              if (editingArticle) {
                                setEditingArticle({ ...editingArticle, is_featured: checked })
                              }
                            }}
                          />
                          <Label htmlFor="article_is_featured">Article en vedette</Label>
                        </div>
                        <div>
                          <Label htmlFor="article_meta_title">Titre SEO</Label>
                          <Input
                            id="article_meta_title"
                            name="meta_title"
                            defaultValue={editingArticle?.meta_title}
                          />
                        </div>
                        <div>
                          <Label htmlFor="article_meta_description">Description SEO</Label>
                          <Textarea
                            id="article_meta_description"
                            name="meta_description"
                            defaultValue={editingArticle?.meta_description}
                            rows={2}
                          />
                        </div>
                      </div>
                      <DialogFooter className="mt-6">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setArticleDialogOpen(false)
                            setEditingArticle(null)
                          }}
                        >
                          Annuler
                        </Button>
                        <Button type="submit" disabled={createArticleMutation.isPending}>
                          {editingArticle ? 'Modifier' : 'Créer'}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {allArticles && allArticles.length > 0 ? (
                <div className="space-y-2">
                  {allArticles.map((article: any) => (
                    <div
                      key={article.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{article.title}</h3>
                          <span
                            className={`text-xs px-2 py-1 rounded ${
                              article.status === 'published'
                                ? 'bg-green-100 text-green-800'
                                : article.status === 'draft'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {article.status === 'published'
                              ? 'Publié'
                              : article.status === 'draft'
                              ? 'Brouillon'
                              : 'Archivé'}
                          </span>
                          {article.is_featured && (
                            <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-800">
                              En vedette
                            </span>
                          )}
                        </div>
                        {article.excerpt && (
                          <p className="text-sm text-muted-foreground mt-1">{article.excerpt}</p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span>Slug: {article.slug}</span>
                          <span>{article.view_count} vues</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {article.status === 'published' && (
                          <Link href={`/dashboard/documentation/${article.category?.slug}/${article.slug}`}>
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingArticle(article)
                            setArticleDialogOpen(true)
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (confirm('Êtes-vous sûr de vouloir supprimer cet article ?')) {
                              deleteArticleMutation.mutate(article.id)
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  Aucun article. Créez-en un pour commencer.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
