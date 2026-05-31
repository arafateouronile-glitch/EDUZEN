'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
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
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { StatsCard } from '@/components/super-admin/dashboard/stats-card'
import {
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  Copy,
  ExternalLink,
  FileText,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Archive,
  Star,
  MessageSquare,
  TrendingUp,
  Calendar,
  Filter,
  Upload,
} from 'lucide-react'
import { toast } from 'sonner'
import type { BlogPost, BlogPostStatus } from '@/types/super-admin.types'

const statusConfig: Record<BlogPostStatus, { label: string; color: string; icon: React.ReactNode }> = {
  draft: {
    label: 'Brouillon',
    color: 'bg-gray-100 text-gray-700 border-gray-200',
    icon: <FileText className="h-3 w-3" />,
  },
  pending_review: {
    label: 'En révision',
    color: 'bg-amber-100 text-amber-700 border-amber-200',
    icon: <AlertTriangle className="h-3 w-3" />,
  },
  scheduled: {
    label: 'Programmé',
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    icon: <Clock className="h-3 w-3" />,
  },
  published: {
    label: 'Publié',
    color: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
  archived: {
    label: 'Archivé',
    color: 'bg-slate-100 text-slate-700 border-slate-200',
    icon: <Archive className="h-3 w-3" />,
  },
}

export default function BlogPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const supabase = createClient()
  const [searchQuery, setSearchQuery] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [isImporting, setIsImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleHtmlFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    setIsImporting(true)
    try {
      const html = await file.text()
      const parser = new DOMParser()
      const doc = parser.parseFromString(html, 'text/html')

      // Extract title
      const titleEl = doc.querySelector('title')
      const h1El = doc.querySelector('h1')
      const title =
        titleEl?.textContent?.trim() ||
        h1El?.textContent?.trim() ||
        file.name.replace(/\.html?$/i, '')

      // Extract body content (full doc) or use as-is (fragment)
      const bodyContent = doc.body ? doc.body.innerHTML : html

      const response = await fetch('/api/super-admin/blog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content: bodyContent, status: 'draft' }),
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Erreur lors de l\'import')
      }

      const result = await response.json()
      toast.success('Article importé — brouillon créé')
      router.push(`/super-admin/blog/${result.post.id}`)
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Erreur lors de l\'import')
    } finally {
      setIsImporting(false)
    }
  }

  const { data: allPosts = [] } = useQuery({
    queryKey: ['super-admin-blog-posts'],
    queryFn: async (): Promise<BlogPost[]> => {
      const { data, error } = await supabase
        .from('blog_posts')
        .select(`
          id, title, slug, excerpt, featured_image_url, status,
          published_at, scheduled_for, author_id, category_id,
          views_count, likes_count, shares_count, allow_comments,
          is_featured, reading_time_minutes, metadata, created_at, updated_at,
          meta_title, meta_description, canonical_url, content,
          category:blog_categories(id, name, slug, description, parent_id, display_order, is_active, created_at, updated_at),
          tags:blog_post_tags(tag:blog_tags(id, name, slug, color, created_at))
        `)
        .order('created_at', { ascending: false })

      if (error || !data) return []

      return data.map((p: any) => ({
        ...p,
        tags: (p.tags ?? []).map((t: any) => t.tag).filter(Boolean),
        comments_count: 0,
      })) as BlogPost[]
    },
    staleTime: 1000 * 60 * 2,
  })

  const stats = {
    totalPosts: allPosts.length,
    publishedPosts: allPosts.filter((p) => p.status === 'published').length,
    totalViews: allPosts.reduce((sum, p) => sum + p.views_count, 0),
    totalComments: allPosts.reduce((sum, p) => sum + (p.comments_count || 0), 0),
  }

  const filteredPosts = allPosts.filter((post) => {
    const matchesSearch =
      searchQuery === '' ||
      post.title.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || post.status === statusFilter
    const matchesCategory = categoryFilter === 'all' || post.category_id === categoryFilter

    return matchesSearch && matchesStatus && matchesCategory
  })

  const formatDate = (date: string | null) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  const handleDelete = async (post: BlogPost) => {
    if (!window.confirm(`Supprimer définitivement "${post.title}" ?`)) return
    setDeletingId(post.id)
    try {
      const res = await fetch(`/api/super-admin/blog/${post.id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Erreur inconnue')
      toast.success('Article supprimé')
      queryClient.invalidateQueries({ queryKey: ['super-admin-blog-posts'] })
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Erreur lors de la suppression')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <PlatformAdminGuard requiredPermission="manage_blog">
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <motion.h1
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-2xl font-bold tracking-tight"
            >
              Blog CMS
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-muted-foreground"
            >
              Gérez vos articles et contenus éditoriaux
            </motion.p>
          </div>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="flex items-center gap-2"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".html,.htm"
              className="hidden"
              onChange={handleHtmlFileImport}
            />
            <Button
              variant="outline"
              className="gap-2"
              disabled={isImporting}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-4 w-4" />
              {isImporting ? 'Import...' : 'Importer HTML'}
            </Button>
            <Button onClick={() => router.push('/super-admin/blog/new')} className="gap-2">
              <Plus className="h-4 w-4" />
              Nouvel article
            </Button>
          </motion.div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Total articles"
            value={stats.totalPosts}
            icon={<FileText className="h-6 w-6 text-brand-blue" />}
            iconBgColor="bg-brand-blue/10"
          />
          <StatsCard
            title="Articles publiés"
            value={stats.publishedPosts}
            icon={<CheckCircle2 className="h-6 w-6 text-emerald-600" />}
            iconBgColor="bg-emerald-500/10"
          />
          <StatsCard
            title="Vues totales"
            value={stats.totalViews}
            icon={<TrendingUp className="h-6 w-6 text-purple-600" />}
            iconBgColor="bg-purple-500/10"
          />
          <StatsCard
            title="Commentaires"
            value={stats.totalComments}
            icon={<MessageSquare className="h-6 w-6 text-amber-600" />}
            iconBgColor="bg-amber-500/10"
          />
        </div>

        {/* Table */}
        <Card>
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle>Articles</CardTitle>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[150px]">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  {Object.entries(statusConfig).map(([value, { label }]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Article</TableHead>
                  <TableHead>Auteur</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Stats</TableHead>
                  <TableHead className="w-[50px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPosts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <FileText className="h-8 w-8 text-muted-foreground/50" />
                        <p className="text-muted-foreground">Aucun article trouvé</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPosts.map((post) => {
                    const status = statusConfig[post.status]
                    return (
                      <TableRow key={post.id} className="group">
                        <TableCell className="max-w-md">
                          <div className="flex items-start gap-3">
                            {post.featured_image_url ? (
                              <img
                                src={post.featured_image_url}
                                alt=""
                                className="h-12 w-16 rounded object-cover flex-shrink-0"
                              />
                            ) : (
                              <div className="h-12 w-16 rounded bg-muted flex items-center justify-center flex-shrink-0">
                                <FileText className="h-5 w-5 text-muted-foreground" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-medium truncate">{post.title}</p>
                                {post.is_featured && (
                                  <Star className="h-4 w-4 text-amber-500 flex-shrink-0" />
                                )}
                              </div>
                              {post.category && (
                                <Badge variant="outline" className="mt-1 text-xs">
                                  {post.category.name}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-7 w-7">
                              <AvatarImage src={post.author?.avatar_url || undefined} />
                              <AvatarFallback className="text-xs">
                                {post.author?.full_name
                                  ?.split(' ')
                                  .map((n) => n?.[0] || '')
                                  .join('') || 'U'}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm">{post.author?.full_name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={cn('gap-1', status.color)}>
                            {status.icon}
                            {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {post.status === 'published' ? (
                              <p>{formatDate(post.published_at)}</p>
                            ) : post.status === 'scheduled' ? (
                              <div className="flex items-center gap-1 text-blue-600">
                                <Calendar className="h-3 w-3" />
                                {formatDate(post.scheduled_for)}
                              </div>
                            ) : (
                              <p className="text-muted-foreground">
                                Modifié {formatDate(post.updated_at)}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Eye className="h-3 w-3" />
                              {post.views_count}
                            </span>
                            <span className="flex items-center gap-1">
                              <MessageSquare className="h-3 w-3" />
                              {post.comments_count}
                            </span>
                          </div>
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
                              <DropdownMenuItem
                                onClick={() => router.push(`/super-admin/blog/${post.id}`)}
                              >
                                <Edit className="mr-2 h-4 w-4" />
                                Modifier
                              </DropdownMenuItem>
                              {post.status === 'published' && (
                                <DropdownMenuItem asChild>
                                  <Link
                                    href={`/blog/${post.slug}`}
                                    target="_blank"
                                  >
                                    <ExternalLink className="mr-2 h-4 w-4" />
                                    Voir sur le site
                                  </Link>
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                onClick={() => {
                                  navigator.clipboard.writeText(
                                    `${window.location.origin}/blog/${post.slug}`
                                  )
                                  toast.success('Lien copié')
                                }}
                              >
                                <Copy className="mr-2 h-4 w-4" />
                                Copier le lien
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-red-600"
                                disabled={deletingId === post.id}
                                onClick={() => handleDelete(post)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                {deletingId === post.id ? 'Suppression...' : 'Supprimer'}
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
          </CardContent>
        </Card>
      </div>
    </PlatformAdminGuard>
  )
}
