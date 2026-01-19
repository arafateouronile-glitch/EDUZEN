'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { GlassCard } from '@/components/ui/glass-card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Upload,
  X,
  Search,
  Image as ImageIcon,
  FileText,
  Video,
  Music,
  Star,
  StarOff,
  Trash2,
  Edit,
  Tag,
  Filter,
  Grid3x3,
  List,
  CheckCircle,
  Loader2,
} from 'lucide-react'
import { motion, AnimatePresence } from '@/components/ui/motion'
import { cn } from '@/lib/utils'
import {
  mediaLibraryService,
  type MediaItem,
  type MediaCategory,
} from '@/lib/services/media-library.service'
import { useAuth } from '@/lib/hooks/use-auth'
import { useToast } from '@/components/ui/toast'

interface MediaLibraryProps {
  onSelect?: (media: MediaItem) => void
  onInsert?: (mediaUrl: string, altText?: string) => void
  category?: MediaCategory
  multiple?: boolean
  showUpload?: boolean
}

type ViewMode = 'grid' | 'list'

export function MediaLibrary({
  onSelect,
  onInsert,
  category,
  multiple = false,
  showUpload = true,
}: MediaLibraryProps) {
  const { user } = useAuth()
  const { addToast } = useToast()
  const [open, setOpen] = useState(false)
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [selectedMedia, setSelectedMedia] = useState<Set<string>>(new Set())
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<MediaCategory | 'all'>(
    category || 'all'
  )
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false)
  const [showLogosOnly, setShowLogosOnly] = useState(false)

  // Charger les médias
  const loadMedia = useCallback(async () => {
    if (!user?.organization_id) return

    setLoading(true)
    try {
      const filters: Record<string, string | boolean> = {}
      if (selectedCategory !== 'all') {
        filters.category = selectedCategory
      }
      if (showFavoritesOnly) {
        filters.is_favorite = true
      }
      if (showLogosOnly) {
        filters.is_logo = true
      }
      if (searchQuery) {
        filters.search = searchQuery
      }

      const media = await mediaLibraryService.getAll(user.organization_id, filters)
      setMediaItems(media)
    } catch (error) {
      console.error('Erreur lors du chargement des médias:', error)
      addToast({
        type: 'error',
        title: 'Erreur',
        description: 'Impossible de charger les médias',
      })
    } finally {
      setLoading(false)
    }
  }, [user?.organization_id, selectedCategory, showFavoritesOnly, showLogosOnly, searchQuery, addToast])

  useEffect(() => {
    if (open && user?.organization_id) {
      loadMedia()
    }
  }, [open, loadMedia, user?.organization_id])

  // Gérer l'upload de fichiers
  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0 || !user?.organization_id || !user?.id) return

    setUploading(true)
    try {
      const uploadPromises = Array.from(files).map((file) =>
        mediaLibraryService.uploadFile(file, user.organization_id!, user.id!, {
          category: selectedCategory !== 'all' ? selectedCategory : undefined,
        })
      )

      await Promise.all(uploadPromises)
      addToast({
        type: 'success',
        title: 'Succès',
        description: `${files.length} fichier(s) uploadé(s) avec succès`,
      })
      await loadMedia()
    } catch (error) {
      console.error('Erreur lors de l\'upload:', error)
      addToast({
        type: 'error',
        title: 'Erreur',
        description: 'Impossible d\'uploader les fichiers',
      })
    } finally {
      setUploading(false)
    }
  }

  // Gérer la sélection d'un média
  const handleSelect = (media: MediaItem) => {
    if (multiple) {
      const newSelected = new Set(selectedMedia)
      if (newSelected.has(media.id)) {
        newSelected.delete(media.id)
      } else {
        newSelected.add(media.id)
      }
      setSelectedMedia(newSelected)
    } else {
      if (onSelect) {
        onSelect(media)
      }
      if (onInsert) {
        const url = mediaLibraryService.getPublicUrl(media.file_path)
        onInsert(url, media.alt_text || media.title)
      }
      setOpen(false)
    }
  }

  // Toggle favori
  const handleToggleFavorite = async (media: MediaItem, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await mediaLibraryService.toggleFavorite(media.id, !media.is_favorite)
      await loadMedia()
    } catch (error) {
      console.error('Erreur:', error)
      addToast({
        type: 'error',
        title: 'Erreur',
        description: 'Impossible de modifier le favori',
      })
    }
  }

  // Supprimer un média
  const handleDelete = async (media: MediaItem, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm(`Êtes-vous sûr de vouloir supprimer "${media.title || media.file_name}" ?`)) {
      return
    }

    try {
      await mediaLibraryService.delete(media.id)
      addToast({
        type: 'success',
        title: 'Succès',
        description: 'Média supprimé avec succès',
      })
      await loadMedia()
    } catch (error) {
      console.error('Erreur:', error)
      addToast({
        type: 'error',
        title: 'Erreur',
        description: 'Impossible de supprimer le média',
      })
    }
  }

  // Obtenir l'icône selon la catégorie
  const getCategoryIcon = (category: MediaCategory) => {
    switch (category) {
      case 'image':
      case 'logo':
        return ImageIcon
      case 'document':
        return FileText
      case 'video':
        return Video
      case 'audio':
        return Music
      default:
        return FileText
    }
  }

  // Formater la taille du fichier
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const categories: Array<{ value: MediaCategory | 'all'; label: string }> = [
    { value: 'all', label: 'Tous' },
    { value: 'image', label: 'Images' },
    { value: 'logo', label: 'Logos' },
    { value: 'document', label: 'Documents' },
    { value: 'video', label: 'Vidéos' },
    { value: 'audio', label: 'Audio' },
    { value: 'other', label: 'Autres' },
  ]

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <ImageIcon className="h-4 w-4 mr-2" />
          Bibliothèque de médias
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Bibliothèque de médias
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {/* Barre d'outils */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Upload */}
            {showUpload && (
              <label className="cursor-pointer">
                <input
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => handleUpload(e.target.files)}
                  accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
                />
                <Button
                  variant="outline"
                  size="sm"
                  disabled={uploading}
                  className="cursor-pointer"
                >
                  {uploading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
                  )}
                  Uploader
                </Button>
              </label>
            )}

            {/* Recherche */}
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Rechercher..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            {/* Filtres */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as MediaCategory | 'all')}
              className="px-3 py-2 border rounded-md text-sm"
            >
              {categories.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>

            {/* Favoris uniquement */}
            <Button
              variant={showFavoritesOnly ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
            >
              <Star className={cn('h-4 w-4', showFavoritesOnly && 'fill-current')} />
            </Button>

            {/* Logos uniquement */}
            <Button
              variant={showLogosOnly ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowLogosOnly(!showLogosOnly)}
            >
              <Tag className={cn('h-4 w-4', showLogosOnly && 'fill-current')} />
            </Button>

            {/* Mode d'affichage */}
            <div className="flex border rounded-md">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="rounded-r-none"
              >
                <Grid3x3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="rounded-l-none"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Liste des médias */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-brand-blue" />
              </div>
            ) : mediaItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                <ImageIcon className="h-12 w-12 mb-4 opacity-50" />
                <p>Aucun média trouvé</p>
                {showUpload && (
                  <p className="text-sm mt-2">Commencez par uploader un fichier</p>
                )}
              </div>
            ) : (
              <div
                className={cn(
                  viewMode === 'grid'
                    ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4'
                    : 'space-y-2'
                )}
              >
                <AnimatePresence>
                  {mediaItems.map((media) => {
                    const Icon = getCategoryIcon(media.category)
                    const isSelected = selectedMedia.has(media.id)
                    const mediaUrl = mediaLibraryService.getPublicUrl(media.file_path)

                    return (
                      <motion.div
                        key={media.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className={cn(
                          'relative group cursor-pointer',
                          viewMode === 'grid' ? '' : 'flex items-center gap-4 p-2 border rounded-lg'
                        )}
                        onClick={() => handleSelect(media)}
                      >
                        {viewMode === 'grid' ? (
                          <Card
                            className={cn(
                              'overflow-hidden transition-all',
                              isSelected && 'ring-2 ring-brand-blue'
                            )}
                          >
                            <div className="aspect-square relative bg-gray-100">
                              {media.category === 'image' || media.category === 'logo' ? (
                                <img
                                  src={mediaUrl}
                                  alt={media.alt_text || media.title || media.file_name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Icon className="h-12 w-12 text-gray-400" />
                                </div>
                              )}
                              {isSelected && (
                                <div className="absolute top-2 right-2">
                                  <CheckCircle className="h-6 w-6 text-brand-blue fill-white" />
                                </div>
                              )}
                            </div>
                            <CardContent className="p-2">
                              <p className="text-xs font-medium truncate">
                                {media.title || media.file_name}
                              </p>
                              <p className="text-xs text-gray-500">
                                {formatFileSize(media.file_size)}
                              </p>
                            </CardContent>
                            <div className="absolute top-2 left-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 bg-white/90"
                                onClick={(e) => handleToggleFavorite(media, e)}
                              >
                                {media.is_favorite ? (
                                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                ) : (
                                  <Star className="h-3 w-3" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 bg-white/90"
                                onClick={(e) => handleDelete(media, e)}
                              >
                                <Trash2 className="h-3 w-3 text-red-600" />
                              </Button>
                            </div>
                          </Card>
                        ) : (
                          <>
                            <div className="w-16 h-16 flex-shrink-0 bg-gray-100 rounded overflow-hidden">
                              {media.category === 'image' || media.category === 'logo' ? (
                                <img
                                  src={mediaUrl}
                                  alt={media.alt_text || media.title || media.file_name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Icon className="h-6 w-6 text-gray-400" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">
                                {media.title || media.file_name}
                              </p>
                              <p className="text-sm text-gray-500">
                                {formatFileSize(media.file_size)} • {media.category}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              {media.is_favorite && (
                                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                              )}
                              {media.is_logo && (
                                <Tag className="h-4 w-4 text-brand-blue" />
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => handleToggleFavorite(media, e)}
                              >
                                <Star className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => handleDelete(media, e)}
                              >
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </Button>
                            </div>
                          </>
                        )}
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* Actions multiples */}
          {multiple && selectedMedia.size > 0 && (
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <span>{selectedMedia.size} média(s) sélectionné(s)</span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    const selected = mediaItems.filter((m) => selectedMedia.has(m.id))
                    selected.forEach((media) => {
                      if (onInsert) {
                        const url = mediaLibraryService.getPublicUrl(media.file_path)
                        onInsert(url, media.alt_text || media.title)
                      }
                    })
                    setOpen(false)
                  }}
                >
                  Insérer {selectedMedia.size} média(s)
                </Button>
                <Button variant="outline" onClick={() => setSelectedMedia(new Set())}>
                  Annuler
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
