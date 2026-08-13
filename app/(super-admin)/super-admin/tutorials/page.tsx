'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { tutorialVideosService } from '@/lib/services/tutorial-videos.service.client'
import { getYouTubeThumbnailUrl } from '@/lib/utils/youtube'
import { PlatformAdminGuard } from '@/components/super-admin/platform-admin-guard'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select-shadcn'
import { Plus, Edit, Trash2, PlayCircle, Video } from 'lucide-react'
import { toast } from 'sonner'

const generateSlug = (title: string): string =>
  title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')

const difficultyLabels: Record<string, string> = {
  beginner: 'Débutant',
  intermediate: 'Intermédiaire',
  advanced: 'Avancé',
}

type TutorialVideoRow = {
  id: string
  module_id: string
  title: string
  slug: string
  description: string | null
  video_url: string
  duration_seconds: number | null
  difficulty_level: string | null
  order_index: number | null
  is_published: boolean | null
  module?: { name?: string | null } | null
}

const emptyForm = {
  module_id: '',
  title: '',
  slug: '',
  description: '',
  video_url: '',
  duration_seconds: '',
  difficulty_level: 'beginner',
  order_index: '0',
  is_published: false,
}

export default function SuperAdminTutorialsPage() {
  const supabase = createClient()
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingVideoId, setEditingVideoId] = useState<string | null>(null)
  const [slugTouched, setSlugTouched] = useState(false)
  const [form, setForm] = useState(emptyForm)

  const { data: modules } = useQuery({
    queryKey: ['tutorial-modules'],
    queryFn: () => tutorialVideosService.getModules(),
  })

  // Requête directe (comme super-admin/blog) : le service getVideos() ne
  // renvoie que les vidéos publiées, il faut voir aussi les brouillons ici.
  const { data: videos, isLoading } = useQuery({
    queryKey: ['super-admin-tutorial-videos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tutorial_videos')
        .select('*, module:tutorial_modules(name)')
        .order('order_index', { ascending: true })

      if (error) throw error
      return data as TutorialVideoRow[]
    },
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['super-admin-tutorial-videos'] })
    queryClient.invalidateQueries({ queryKey: ['tutorial-videos'] })
  }

  const createMutation = useMutation({
    mutationFn: (data: typeof emptyForm) =>
      tutorialVideosService.createVideo({
        module_id: data.module_id,
        title: data.title,
        slug: data.slug,
        description: data.description || null,
        video_url: data.video_url,
        video_type: 'youtube',
        duration_seconds: data.duration_seconds ? parseInt(data.duration_seconds, 10) : null,
        difficulty_level: data.difficulty_level,
        order_index: parseInt(data.order_index, 10) || 0,
        is_published: data.is_published,
        published_at: data.is_published ? new Date().toISOString() : null,
      }),
    onSuccess: () => {
      invalidate()
      toast.success('Vidéo créée')
      closeDialog()
    },
    onError: (e: Error) => toast.error(e.message || 'Erreur lors de la création'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: typeof emptyForm }) =>
      tutorialVideosService.updateVideo(id, {
        module_id: data.module_id,
        title: data.title,
        slug: data.slug,
        description: data.description || null,
        video_url: data.video_url,
        duration_seconds: data.duration_seconds ? parseInt(data.duration_seconds, 10) : null,
        difficulty_level: data.difficulty_level,
        order_index: parseInt(data.order_index, 10) || 0,
        is_published: data.is_published,
        published_at: data.is_published ? new Date().toISOString() : null,
      }),
    onSuccess: () => {
      invalidate()
      toast.success('Vidéo mise à jour')
      closeDialog()
    },
    onError: (e: Error) => toast.error(e.message || 'Erreur lors de la mise à jour'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => tutorialVideosService.deleteVideo(id),
    onSuccess: () => {
      invalidate()
      toast.success('Vidéo supprimée')
    },
    onError: (e: Error) => toast.error(e.message || 'Erreur lors de la suppression'),
  })

  const closeDialog = () => {
    setDialogOpen(false)
    setEditingVideoId(null)
    setSlugTouched(false)
    setForm(emptyForm)
  }

  const openCreateDialog = () => {
    setEditingVideoId(null)
    setSlugTouched(false)
    setForm({ ...emptyForm, module_id: modules?.[0]?.id ?? '' })
    setDialogOpen(true)
  }

  const openEditDialog = (video: TutorialVideoRow) => {
    setEditingVideoId(video.id)
    setSlugTouched(true)
    setForm({
      module_id: video.module_id,
      title: video.title,
      slug: video.slug,
      description: video.description ?? '',
      video_url: video.video_url,
      duration_seconds: video.duration_seconds != null ? String(video.duration_seconds) : '',
      difficulty_level: video.difficulty_level ?? 'beginner',
      order_index: video.order_index != null ? String(video.order_index) : '0',
      is_published: !!video.is_published,
    })
    setDialogOpen(true)
  }

  const handleTitleChange = (title: string) => {
    setForm((f) => ({
      ...f,
      title,
      slug: slugTouched ? f.slug : generateSlug(title),
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.module_id || !form.title || !form.slug || !form.video_url) {
      toast.error('Module, titre, slug et URL vidéo sont obligatoires')
      return
    }
    if (editingVideoId) {
      updateMutation.mutate({ id: editingVideoId, data: form })
    } else {
      createMutation.mutate(form)
    }
  }

  const handleDelete = (id: string, title: string) => {
    if (confirm(`Supprimer la vidéo "${title}" ?`)) {
      deleteMutation.mutate(id)
    }
  }

  const thumbnailPreview = getYouTubeThumbnailUrl(form.video_url)
  const isSaving = createMutation.isPending || updateMutation.isPending

  return (
    <PlatformAdminGuard>
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Video className="h-6 w-6" />
              Tutoriels vidéo
            </h1>
            <p className="text-muted-foreground text-sm">
              Gérer les vidéos tutoriels visibles sur /dashboard/tutorials
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => (open ? openCreateDialog() : closeDialog())}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nouvelle vidéo
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingVideoId ? 'Modifier la vidéo' : 'Nouvelle vidéo'}</DialogTitle>
                <DialogDescription>
                  L&apos;URL doit être un lien YouTube (vidéo non répertoriée acceptée).
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="module_id">Module *</Label>
                    <Select value={form.module_id} onValueChange={(v) => setForm((f) => ({ ...f, module_id: v }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un module" />
                      </SelectTrigger>
                      <SelectContent>
                        {modules?.map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="title">Titre *</Label>
                    <Input
                      id="title"
                      value={form.title}
                      onChange={(e) => handleTitleChange(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="slug">Slug *</Label>
                    <Input
                      id="slug"
                      value={form.slug}
                      onChange={(e) => {
                        setSlugTouched(true)
                        setForm((f) => ({ ...f, slug: e.target.value }))
                      }}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={form.description}
                      onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label htmlFor="video_url">URL YouTube *</Label>
                    <Input
                      id="video_url"
                      value={form.video_url}
                      onChange={(e) => setForm((f) => ({ ...f, video_url: e.target.value }))}
                      placeholder="https://www.youtube.com/watch?v=..."
                      required
                    />
                    {thumbnailPreview && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={thumbnailPreview}
                        alt="Aperçu miniature"
                        className="mt-2 rounded-md border h-28 object-cover"
                      />
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="duration_seconds">Durée (secondes)</Label>
                      <Input
                        id="duration_seconds"
                        type="number"
                        min={0}
                        value={form.duration_seconds}
                        onChange={(e) => setForm((f) => ({ ...f, duration_seconds: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="order_index">Ordre d&apos;affichage</Label>
                      <Input
                        id="order_index"
                        type="number"
                        value={form.order_index}
                        onChange={(e) => setForm((f) => ({ ...f, order_index: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="difficulty_level">Niveau</Label>
                    <Select
                      value={form.difficulty_level}
                      onValueChange={(v) => setForm((f) => ({ ...f, difficulty_level: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="beginner">Débutant</SelectItem>
                        <SelectItem value="intermediate">Intermédiaire</SelectItem>
                        <SelectItem value="advanced">Avancé</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <Label htmlFor="is_published">Publiée</Label>
                      <p className="text-xs text-muted-foreground">
                        Visible sur /dashboard/tutorials si activé
                      </p>
                    </div>
                    <Switch
                      id="is_published"
                      checked={form.is_published}
                      onCheckedChange={(checked) => setForm((f) => ({ ...f, is_published: checked }))}
                    />
                  </div>
                </div>
                <DialogFooter className="mt-6">
                  <Button type="button" variant="outline" onClick={closeDialog}>
                    Annuler
                  </Button>
                  <Button type="submit" disabled={isSaving}>
                    {editingVideoId ? 'Enregistrer' : 'Créer'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Vidéos ({videos?.length ?? 0})</CardTitle>
            <CardDescription>Toutes les vidéos, publiées et brouillons</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground text-sm py-8 text-center">Chargement...</p>
            ) : videos && videos.length > 0 ? (
              <div className="space-y-2">
                {videos.map((video) => (
                  <div
                    key={video.id}
                    className="flex items-center justify-between gap-4 rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <PlayCircle className="h-5 w-5 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium truncate">{video.title}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                          {video.module?.name && <span>{video.module.name}</span>}
                          {video.difficulty_level && (
                            <span>· {difficultyLabels[video.difficulty_level] ?? video.difficulty_level}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={video.is_published ? 'default' : 'outline'}>
                        {video.is_published ? 'Publiée' : 'Brouillon'}
                      </Badge>
                      <Button variant="ghost" size="icon" onClick={() => openEditDialog(video)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(video.id, video.title)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm py-8 text-center">
                Aucune vidéo. Créez-en une pour commencer.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </PlatformAdminGuard>
  )
}
