'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
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
} from 'lucide-react'
import { toast } from 'sonner'
import type { BlogPost, BlogPostStatus } from '@/types/super-admin.types'

// Sample data
const samplePosts: BlogPost[] = [
  {
    id: '1',
    title: 'Guide complet Qualiopi 2024 : Tout ce que vous devez savoir',
    slug: 'guide-complet-qualiopi-2024',
    excerpt: 'Découvrez toutes les nouveautés de la certification Qualiopi pour 2024...',
    content: 'Lorem ipsum...',
    featured_image_url: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173',
    meta_title: 'Guide Qualiopi 2024 | EDUZEN',
    meta_description: 'Guide complet sur la certification Qualiopi en 2024',
    canonical_url: null,
    status: 'published',
    published_at: '2024-01-15T10:00:00Z',
    scheduled_for: null,
    author_id: 'user-1',
    category_id: '3',
    views_count: 1234,
    likes_count: 45,
    shares_count: 23,
    allow_comments: true,
    is_featured: true,
    reading_time_minutes: 8,
    metadata: {},
    created_at: '2024-01-10T08:00:00Z',
    updated_at: '2024-01-15T10:00:00Z',
    author: { id: 'user-1', full_name: 'Sophie Martin', avatar_url: null, email: 'sophie@eduzen.io' },
    category: { id: '3', name: 'Qualiopi', slug: 'qualiopi', description: null, parent_id: null, display_order: 2, is_active: true, created_at: '', updated_at: '' },
    tags: [
      { id: '1', name: 'Qualiopi', slug: 'qualiopi', color: '#6366f1', created_at: '' },
      { id: '2', name: 'Certification', slug: 'certification', color: '#10b981', created_at: '' },
    ],
    comments_count: 12,
  },
  {
    id: '2',
    title: 'Comment optimiser vos formations avec l\'IA',
    slug: 'optimiser-formations-ia',
    excerpt: 'L\'intelligence artificielle révolutionne la formation professionnelle...',
    content: 'Lorem ipsum...',
    featured_image_url: 'https://images.unsplash.com/photo-1677442135703-1787eea5ce01',
    meta_title: 'IA et Formation | EDUZEN',
    meta_description: 'Découvrez comment l\'IA peut améliorer vos formations',
    canonical_url: null,
    status: 'published',
    published_at: '2024-01-08T14:00:00Z',
    scheduled_for: null,
    author_id: 'user-2',
    category_id: '2',
    views_count: 856,
    likes_count: 32,
    shares_count: 15,
    allow_comments: true,
    is_featured: false,
    reading_time_minutes: 5,
    metadata: {},
    created_at: '2024-01-05T10:00:00Z',
    updated_at: '2024-01-08T14:00:00Z',
    author: { id: 'user-2', full_name: 'Thomas Durand', avatar_url: null, email: 'thomas@eduzen.io' },
    category: { id: '2', name: 'Tutoriels', slug: 'tutoriels', description: null, parent_id: null, display_order: 1, is_active: true, created_at: '', updated_at: '' },
    tags: [
      { id: '4', name: 'Digital', slug: 'digital', color: '#3b82f6', created_at: '' },
    ],
    comments_count: 8,
  },
  {
    id: '3',
    title: 'Les nouveautés EDOF 2024 pour les organismes de formation',
    slug: 'nouveautes-edof-2024',
    excerpt: 'Découvrez les dernières mises à jour de la plateforme EDOF...',
    content: 'Lorem ipsum...',
    featured_image_url: null,
    meta_title: null,
    meta_description: null,
    canonical_url: null,
    status: 'draft',
    published_at: null,
    scheduled_for: null,
    author_id: 'user-1',
    category_id: '1',
    views_count: 0,
    likes_count: 0,
    shares_count: 0,
    allow_comments: true,
    is_featured: false,
    reading_time_minutes: 6,
    metadata: {},
    created_at: '2024-01-18T09:00:00Z',
    updated_at: '2024-01-18T09:00:00Z',
    author: { id: 'user-1', full_name: 'Sophie Martin', avatar_url: null, email: 'sophie@eduzen.io' },
    category: { id: '1', name: 'Actualités', slug: 'actualites', description: null, parent_id: null, display_order: 0, is_active: true, created_at: '', updated_at: '' },
    tags: [],
    comments_count: 0,
  },
  {
    id: '4',
    title: 'Financer ses formations : CPF, OPCO et autres dispositifs',
    slug: 'financer-formations-cpf-opco',
    excerpt: 'Tour d\'horizon complet des dispositifs de financement...',
    content: 'Lorem ipsum...',
    featured_image_url: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c',
    meta_title: 'Financement Formation | EDUZEN',
    meta_description: 'Guide des financements formation : CPF, OPCO, etc.',
    canonical_url: null,
    status: 'scheduled',
    published_at: null,
    scheduled_for: '2024-01-25T09:00:00Z',
    author_id: 'user-2',
    category_id: '4',
    views_count: 0,
    likes_count: 0,
    shares_count: 0,
    allow_comments: true,
    is_featured: false,
    reading_time_minutes: 10,
    metadata: {},
    created_at: '2024-01-17T15:00:00Z',
    updated_at: '2024-01-17T15:00:00Z',
    author: { id: 'user-2', full_name: 'Thomas Durand', avatar_url: null, email: 'thomas@eduzen.io' },
    category: { id: '4', name: 'Formation', slug: 'formation', description: null, parent_id: null, display_order: 3, is_active: true, created_at: '', updated_at: '' },
    tags: [
      { id: '5', name: 'Financement', slug: 'financement', color: '#ec4899', created_at: '' },
    ],
    comments_count: 0,
  },
]

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
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')

  // Stats
  const stats = {
    totalPosts: samplePosts.length,
    publishedPosts: samplePosts.filter((p) => p.status === 'published').length,
    totalViews: samplePosts.reduce((sum, p) => sum + p.views_count, 0),
    totalComments: samplePosts.reduce((sum, p) => sum + (p.comments_count || 0), 0),
  }

  // Filter posts
  const filteredPosts = samplePosts.filter((post) => {
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
          >
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
                                  .split(' ')
                                  .map((n) => n[0])
                                  .join('')}
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
                              <DropdownMenuItem className="text-red-600">
                                <Trash2 className="mr-2 h-4 w-4" />
                                Supprimer
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
