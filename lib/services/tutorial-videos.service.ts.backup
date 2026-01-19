import { createClient } from '@/lib/supabase/client'
import { Database } from '@/types/database.types'
import type { TableRow, TableInsert, TableUpdate } from '@/lib/types/supabase-helpers'

type TutorialModule = TableRow<'tutorial_modules'>
type TutorialVideo = TableRow<'tutorial_videos'>
type TutorialProgress = TableRow<'tutorial_progress'>

export class TutorialVideosService {
  private supabase = createClient()

  // ========== MODULES ==========

  async getModules() {
    const { data, error } = await this.supabase
      .from('tutorial_modules')
      .select('*')
      .eq('is_active', true)
      .order('order_index', { ascending: true })

    if (error) throw error
    return data
  }

  async getModuleBySlug(slug: string) {
    const { data, error } = await this.supabase
      .from('tutorial_modules')
      .select('*')
      .eq('slug', slug)
      .eq('is_active', true)
      .single()

    if (error) throw error
    return data
  }

  // ========== VIDEOS ==========

  async getVideos(filters?: {
    moduleId?: string
    moduleSlug?: string
    search?: string
    difficultyLevel?: string
    isPublished?: boolean
  }) {
    let query = this.supabase
      .from('tutorial_videos')
      .select(`
        *,
        module:tutorial_modules(*)
      `)

    if (filters?.moduleId) {
      query = query.eq('module_id', filters.moduleId)
    }

    if (filters?.moduleSlug) {
      query = query.eq('module:tutorial_modules.slug', filters.moduleSlug)
    }

    if (filters?.search) {
      query = query.or(
        `title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`
      )
    }

    if (filters?.difficultyLevel) {
      query = query.eq('difficulty_level', filters.difficultyLevel)
    }

    if (filters?.isPublished !== undefined) {
      query = query.eq('is_published', filters.isPublished)
    } else {
      query = query.eq('is_published', true)
    }

    const { data, error } = await query.order('order_index', { ascending: true })

    if (error) throw error
    return data
  }

  async getVideoBySlug(moduleSlug: string, videoSlug: string) {
    const { data, error } = await this.supabase
      .from('tutorial_videos')
      .select(`
        *,
        module:tutorial_modules(*)
      `)
      .eq('slug', videoSlug)
      .eq('module:tutorial_modules.slug', moduleSlug)
      .eq('is_published', true)
      .single()

    if (error) throw error
    return data
  }

  async createVideo(video: TableInsert<'tutorial_videos'>) {
    const { data, error } = await this.supabase
      .from('tutorial_videos')
      .insert(video)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async updateVideo(videoId: string, updates: TableUpdate<'tutorial_videos'>) {
    const { data, error } = await this.supabase
      .from('tutorial_videos')
      .update(updates)
      .eq('id', videoId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async deleteVideo(videoId: string) {
    const { error } = await this.supabase
      .from('tutorial_videos')
      .delete()
      .eq('id', videoId)

    if (error) throw error
  }

  // ========== PROGRESS ==========

  async getProgress(userId: string, videoId?: string) {
    let query = this.supabase
      .from('tutorial_progress')
      .select('*, video:tutorial_videos(*)')
      .eq('user_id', userId)

    if (videoId) {
      query = query.eq('video_id', videoId).maybeSingle()
    }

    const { data, error } = await query

    if (error) throw error
    return data
  }

  async updateProgress(
    userId: string,
    videoId: string,
    watchedSeconds: number,
    completionPercentage: number
  ) {
    const video = await this.getVideoById(videoId)
    if (!video) throw new Error('Video not found')

    const isCompleted = completionPercentage >= 90 // Considéré complété à 90%

    const { data, error } = await this.supabase
      .from('tutorial_progress')
      .upsert(
        {
          user_id: userId,
          video_id: videoId,
          watched_seconds: watchedSeconds,
          completion_percentage: completionPercentage,
          is_completed: isCompleted,
          completed_at: isCompleted ? new Date().toISOString() : null,
          last_watched_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,video_id',
        }
      )
      .select()
      .single()

    if (error) throw error
    return data
  }

  async getVideoById(videoId: string) {
    const { data, error } = await this.supabase
      .from('tutorial_videos')
      .select('*')
      .eq('id', videoId)
      .single()

    if (error) throw error
    return data
  }

  async getUserProgress(userId: string) {
    const { data, error } = await this.supabase
      .from('tutorial_progress')
      .select('*, video:tutorial_videos(*, module:tutorial_modules(*))')
      .eq('user_id', userId)
      .order('last_watched_at', { ascending: false })

    if (error) throw error
    return data
  }

  async getCompletionStats(userId: string) {
    const { data: progress } = await this.getUserProgress(userId)
    const { data: allVideos } = await this.getVideos({ isPublished: true })

    const completed = progress?.filter((p: { is_completed: boolean }) => p.is_completed).length || 0
    const total = allVideos?.length || 0
    const inProgress = progress?.filter((p: { is_completed: boolean; watched_seconds: number }) => !p.is_completed && p.watched_seconds > 0).length || 0

    return {
      completed,
      total,
      inProgress,
      completionRate: total > 0 ? (completed / total) * 100 : 0,
    }
  }

  // ========== NOTES ==========

  async getNotes(userId: string, videoId?: string) {
    let query = this.supabase
      .from('tutorial_notes')
      .select('*, video:tutorial_videos(*)')
      .eq('user_id', userId)

    if (videoId) {
      query = query.eq('video_id', videoId)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) throw error
    return data
  }

  async createNote(note: TableInsert<'tutorial_notes'>) {
    const { data, error } = await this.supabase
      .from('tutorial_notes')
      .insert(note)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async updateNote(noteId: string, updates: TableUpdate<'tutorial_notes'>) {
    const { data, error } = await this.supabase
      .from('tutorial_notes')
      .update(updates)
      .eq('id', noteId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async deleteNote(noteId: string) {
    const { error } = await this.supabase
      .from('tutorial_notes')
      .delete()
      .eq('id', noteId)

    if (error) throw error
  }

  // ========== FAVORITES ==========

  async addToFavorites(userId: string, videoId: string) {
    const { data, error } = await this.supabase
      .from('tutorial_favorites')
      .insert({
        user_id: userId,
        video_id: videoId,
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  async removeFromFavorites(userId: string, videoId: string) {
    const { error } = await this.supabase
      .from('tutorial_favorites')
      .delete()
      .eq('user_id', userId)
      .eq('video_id', videoId)

    if (error) throw error
  }

  async isFavorite(userId: string, videoId: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('tutorial_favorites')
      .select('id')
      .eq('user_id', userId)
      .eq('video_id', videoId)
      .maybeSingle()

    if (error) throw error
    return !!data
  }

  async getFavorites(userId: string) {
    const { data, error } = await this.supabase
      .from('tutorial_favorites')
      .select('*, video:tutorial_videos(*, module:tutorial_modules(*))')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  }

  // ========== PLAYLISTS ==========

  async getPlaylists(userId?: string, isPublic?: boolean) {
    let query = this.supabase
      .from('tutorial_playlists')
      .select('*, user:users(id, full_name, email)')

    if (userId) {
      query = query.eq('user_id', userId)
    }

    if (isPublic !== undefined) {
      query = query.eq('is_public', isPublic)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) throw error
    return data
  }

  async createPlaylist(playlist: TableInsert<'tutorial_playlists'>) {
    const { data, error } = await this.supabase
      .from('tutorial_playlists')
      .insert(playlist)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async addVideoToPlaylist(playlistId: string, videoId: string) {
    const { data, error } = await this.supabase
      .from('tutorial_playlist_videos')
      .insert({
        playlist_id: playlistId,
        video_id: videoId,
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  // ========== COMMENTS ==========

  async getComments(videoId: string) {
    const { data, error } = await this.supabase
      .from('tutorial_comments')
      .select('*, user:users(id, full_name, email), replies:tutorial_comments(*)')
      .eq('video_id', videoId)
      .eq('is_approved', true)
      .is('parent_id', null) // Seulement les commentaires principaux
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  }

  async createComment(comment: TableInsert<'tutorial_comments'>) {
    const { data, error } = await this.supabase
      .from('tutorial_comments')
      .insert(comment)
      .select()
      .single()

    if (error) throw error
    return data
  }
}

export const tutorialVideosService = new TutorialVideosService()
