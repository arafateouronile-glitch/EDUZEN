'use client'

import { useState, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  Link2,
  Image,
  Code,
  Quote,
  Heading1,
  Heading2,
  Heading3,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Undo,
  Redo,
  Eye,
  Save,
  Send,
  Clock,
  CalendarIcon,
  FileText,
  Settings,
  Search,
  X,
  Plus,
  Hash,
} from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { toast } from 'sonner'
import type {
  BlogPost,
  BlogCategory,
  BlogTag,
  CreateBlogPostInput,
  BlogPostStatus,
} from '@/types/super-admin.types'

const blogPostSchema = z.object({
  title: z.string().min(5, 'Le titre doit contenir au moins 5 caractères'),
  slug: z.string().optional(),
  excerpt: z.string().max(300, 'L\'extrait ne peut pas dépasser 300 caractères').optional(),
  content: z.string().min(100, 'Le contenu doit contenir au moins 100 caractères'),
  featured_image_url: z.string().url().optional().or(z.literal('')),
  meta_title: z.string().max(70, 'Le titre SEO ne peut pas dépasser 70 caractères').optional(),
  meta_description: z.string().max(160, 'La description SEO ne peut pas dépasser 160 caractères').optional(),
  status: z.enum(['draft', 'pending_review', 'scheduled', 'published', 'archived']),
  scheduled_for: z.date().optional().nullable(),
  category_id: z.string().optional(),
  tag_ids: z.array(z.string()).optional(),
  allow_comments: z.boolean().default(true),
  is_featured: z.boolean().default(false),
})

type BlogPostFormData = z.infer<typeof blogPostSchema>

interface BlogPostEditorProps {
  post?: BlogPost
  categories?: BlogCategory[]
  tags?: BlogTag[]
  onSave: (data: CreateBlogPostInput) => Promise<void>
  onPublish: (data: CreateBlogPostInput) => Promise<void>
}

// Sample categories and tags
const sampleCategories: BlogCategory[] = [
  { id: '1', name: 'Actualités', slug: 'actualites', description: null, parent_id: null, display_order: 0, is_active: true, created_at: '', updated_at: '' },
  { id: '2', name: 'Tutoriels', slug: 'tutoriels', description: null, parent_id: null, display_order: 1, is_active: true, created_at: '', updated_at: '' },
  { id: '3', name: 'Qualiopi', slug: 'qualiopi', description: null, parent_id: null, display_order: 2, is_active: true, created_at: '', updated_at: '' },
  { id: '4', name: 'Formation', slug: 'formation', description: null, parent_id: null, display_order: 3, is_active: true, created_at: '', updated_at: '' },
]

const sampleTags: BlogTag[] = [
  { id: '1', name: 'Qualiopi', slug: 'qualiopi', color: '#6366f1', created_at: '' },
  { id: '2', name: 'Certification', slug: 'certification', color: '#10b981', created_at: '' },
  { id: '3', name: 'Pédagogie', slug: 'pedagogie', color: '#f59e0b', created_at: '' },
  { id: '4', name: 'Digital', slug: 'digital', color: '#3b82f6', created_at: '' },
  { id: '5', name: 'Financement', slug: 'financement', color: '#ec4899', created_at: '' },
]

export function BlogPostEditor({
  post,
  categories = sampleCategories,
  tags = sampleTags,
  onSave,
  onPublish,
}: BlogPostEditorProps) {
  const [activeTab, setActiveTab] = useState('editor')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedTags, setSelectedTags] = useState<string[]>(post?.tags?.map((t) => t.id) || [])
  const [showPreview, setShowPreview] = useState(false)

  const form = useForm<BlogPostFormData>({
    resolver: zodResolver(blogPostSchema),
    defaultValues: {
      title: post?.title || '',
      slug: post?.slug || '',
      excerpt: post?.excerpt || '',
      content: post?.content || '',
      featured_image_url: post?.featured_image_url || '',
      meta_title: post?.meta_title || '',
      meta_description: post?.meta_description || '',
      status: post?.status || 'draft',
      scheduled_for: post?.scheduled_for ? new Date(post.scheduled_for) : null,
      category_id: post?.category_id || '',
      tag_ids: post?.tags?.map((t) => t.id) || [],
      allow_comments: post?.allow_comments ?? true,
      is_featured: post?.is_featured ?? false,
    },
  })

  const watchedTitle = form.watch('title')
  const watchedContent = form.watch('content')
  const watchedStatus = form.watch('status')

  // Auto-generate slug from title
  const generateSlug = useCallback((title: string) => {
    return title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '')
  }, [])

  const handleTitleChange = (value: string) => {
    form.setValue('title', value)
    if (!form.getValues('slug') || form.getValues('slug') === generateSlug(watchedTitle)) {
      form.setValue('slug', generateSlug(value))
    }
  }

  const toggleTag = (tagId: string) => {
    setSelectedTags((prev) => {
      const newTags = prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId]
      form.setValue('tag_ids', newTags)
      return newTags
    })
  }

  const handleSave = async (data: BlogPostFormData) => {
    setIsSubmitting(true)
    try {
      await onSave({
        ...data,
        tag_ids: selectedTags,
        scheduled_for: data.scheduled_for?.toISOString(),
      })
      toast.success('Brouillon sauvegardé')
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePublish = async (data: BlogPostFormData) => {
    setIsSubmitting(true)
    try {
      await onPublish({
        ...data,
        status: 'published',
        tag_ids: selectedTags,
        scheduled_for: data.scheduled_for?.toISOString(),
      })
      toast.success('Article publié!')
    } catch (error) {
      toast.error('Erreur lors de la publication')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Calculate reading time
  const wordCount = watchedContent.split(/\s+/).filter(Boolean).length
  const readingTime = Math.max(1, Math.ceil(wordCount / 200))

  // SEO score simulation
  const getSeoScore = () => {
    let score = 0
    if (form.watch('meta_title')?.length) score += 25
    if (form.watch('meta_description')?.length) score += 25
    if (form.watch('excerpt')?.length) score += 20
    if (wordCount >= 300) score += 15
    if (form.watch('featured_image_url')?.length) score += 15
    return score
  }

  return (
    <Form {...form}>
      <form className="space-y-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Main Editor */}
          <div className="flex-1 space-y-6">
            {/* Title */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      {...field}
                      onChange={(e) => handleTitleChange(e.target.value)}
                      placeholder="Titre de l'article"
                      className="text-2xl font-bold h-14 border-0 shadow-none focus-visible:ring-0 px-0"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Toolbar */}
            <Card className="sticky top-0 z-10">
              <CardContent className="p-2">
                <div className="flex flex-wrap items-center gap-1">
                  <div className="flex items-center gap-0.5 border-r pr-2 mr-2">
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8">
                      <Bold className="h-4 w-4" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8">
                      <Italic className="h-4 w-4" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8">
                      <Underline className="h-4 w-4" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8">
                      <Strikethrough className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-0.5 border-r pr-2 mr-2">
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8">
                      <Heading1 className="h-4 w-4" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8">
                      <Heading2 className="h-4 w-4" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8">
                      <Heading3 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-0.5 border-r pr-2 mr-2">
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8">
                      <List className="h-4 w-4" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8">
                      <ListOrdered className="h-4 w-4" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8">
                      <Quote className="h-4 w-4" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8">
                      <Code className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-0.5 border-r pr-2 mr-2">
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8">
                      <Link2 className="h-4 w-4" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8">
                      <Image className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-0.5 ml-auto">
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8">
                      <Undo className="h-4 w-4" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8">
                      <Redo className="h-4 w-4" />
                    </Button>
                    <Separator orientation="vertical" className="h-6 mx-2" />
                    <Button
                      type="button"
                      variant={showPreview ? 'secondary' : 'ghost'}
                      size="sm"
                      onClick={() => setShowPreview(!showPreview)}
                      className="gap-2"
                    >
                      <Eye className="h-4 w-4" />
                      Aperçu
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Content Editor */}
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Commencez à écrire votre article..."
                      className="min-h-[400px] text-base leading-relaxed resize-none border-0 shadow-none focus-visible:ring-0"
                    />
                  </FormControl>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{wordCount} mots</span>
                    <span>{readingTime} min de lecture</span>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Excerpt */}
            <FormField
              control={form.control}
              name="excerpt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Extrait</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Résumé court de l'article (affiché dans les listes)..."
                      rows={3}
                    />
                  </FormControl>
                  <FormDescription>
                    {(field.value?.length || 0)}/300 caractères
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Sidebar */}
          <div className="w-full lg:w-80 space-y-6">
            {/* Actions */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Publication</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Statut</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="draft">Brouillon</SelectItem>
                          <SelectItem value="pending_review">En attente de révision</SelectItem>
                          <SelectItem value="scheduled">Programmé</SelectItem>
                          <SelectItem value="published">Publié</SelectItem>
                          <SelectItem value="archived">Archivé</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />

                {watchedStatus === 'scheduled' && (
                  <FormField
                    control={form.control}
                    name="scheduled_for"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Date de publication</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  'justify-start text-left font-normal',
                                  !field.value && 'text-muted-foreground'
                                )}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {field.value
                                  ? format(field.value, 'dd MMM yyyy HH:mm', { locale: fr })
                                  : 'Sélectionner'}
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value || undefined}
                              onSelect={field.onChange}
                              locale={fr}
                              disabled={(date) => date < new Date()}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </FormItem>
                    )}
                  />
                )}

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 gap-2"
                    onClick={form.handleSubmit(handleSave)}
                    disabled={isSubmitting}
                  >
                    <Save className="h-4 w-4" />
                    Sauvegarder
                  </Button>
                  <Button
                    type="button"
                    className="flex-1 gap-2"
                    onClick={form.handleSubmit(handlePublish)}
                    disabled={isSubmitting}
                  >
                    <Send className="h-4 w-4" />
                    Publier
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Category */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Catégorie</CardTitle>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="category_id"
                  render={({ field }) => (
                    <FormItem>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Tags */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Tags</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <Badge
                      key={tag.id}
                      variant={selectedTags.includes(tag.id) ? 'default' : 'outline'}
                      className={cn(
                        'cursor-pointer transition-colors',
                        selectedTags.includes(tag.id) && 'bg-brand-blue'
                      )}
                      onClick={() => toggleTag(tag.id)}
                    >
                      <Hash className="h-3 w-3 mr-1" />
                      {tag.name}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Featured Image */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Image mise en avant</CardTitle>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="featured_image_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input {...field} placeholder="URL de l'image..." />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {form.watch('featured_image_url') && (
                  <div className="mt-3 rounded-lg overflow-hidden border">
                    <img
                      src={form.watch('featured_image_url')}
                      alt="Preview"
                      className="w-full h-32 object-cover"
                      onError={(e) => {
                        ;(e.target as HTMLImageElement).style.display = 'none'
                      }}
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* SEO */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">SEO</CardTitle>
                  <Badge
                    variant="outline"
                    className={cn(
                      getSeoScore() >= 80
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : getSeoScore() >= 50
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-red-50 text-red-700 border-red-200'
                    )}
                  >
                    {getSeoScore()}%
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="slug"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Slug URL</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="mon-article" />
                      </FormControl>
                      <FormDescription className="text-xs">
                        /blog/{field.value || 'slug'}
                      </FormDescription>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="meta_title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Meta Title</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Titre pour les moteurs de recherche" />
                      </FormControl>
                      <FormDescription className="text-xs">
                        {(field.value?.length || 0)}/70
                      </FormDescription>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="meta_description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Meta Description</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Description pour les moteurs de recherche"
                          rows={2}
                        />
                      </FormControl>
                      <FormDescription className="text-xs">
                        {(field.value?.length || 0)}/160
                      </FormDescription>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Options */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Options</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="allow_comments"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between">
                      <FormLabel className="text-sm">Autoriser les commentaires</FormLabel>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="is_featured"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between">
                      <FormLabel className="text-sm">Article mis en avant</FormLabel>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </Form>
  )
}
