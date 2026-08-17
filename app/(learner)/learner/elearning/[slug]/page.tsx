'use client'

import dynamic from 'next/dynamic'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useLearnerContext } from '@/lib/contexts/learner-context'
import { createLearnerClient } from '@/lib/supabase/learner-client'
import { GlassCard } from '@/components/ui/glass-card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/toast'
import { motion, AnimatePresence } from '@/components/ui/motion'
import {
  PlayCircle,
  BookOpen,
  Clock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Play,
  Pause,
  Lock,
  Award,
  FileText,
  Video,
  Image as ImageIcon,
  ListChecks,
  ArrowLeft,
  Download,
  Share2,
  RotateCcw,
  PenLine,
  Timer,
  Code2,
  Info,
  Lightbulb,
  AlertTriangle,
  AlertCircle,
} from 'lucide-react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import React, { useMemo, useState, useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import { logger, maskId, sanitizeError } from '@/lib/utils/logger'
import { toProxiedFileUrl } from '@/lib/utils/elearning-file-proxy'
import { FeatureLocked } from '@/components/quota/feature-locked'
import { sanitizeBlogContent, escapeHtml } from '@/lib/utils/sanitize-html'

/** Détecte un lien YouTube/Vimeo et renvoie son URL d'embed ; sinon renvoie l'URL telle quelle
 *  (fichier vidéo direct, à lire avec une balise <video>). */
function toVideoEmbedUrl(url: string): { embedUrl: string | null; isFile: boolean } {
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/)
  if (yt) return { embedUrl: `https://www.youtube.com/embed/${yt[1]}?rel=0`, isFile: false }
  const vimeo = url.match(/vimeo\.com\/(\d+)/)
  if (vimeo) return { embedUrl: `https://player.vimeo.com/video/${vimeo[1]}`, isFile: false }
  return { embedUrl: null, isFile: true }
}

// Normalise les blocs venus de l'éditeur "studio" (courses/[slug]/edit) — qui
// stocke un format différent (image/interaction en types dédiés, media sans
// mediaType, options de quiz avec `correct`...) — vers le format canonique
// attendu ci-dessous (text/media+mediaType/quiz/poll/code/callout/accordion).
// Les blocs déjà au format canonique traversent inchangés.
function normalizeContentBlock(block: any, idx: number): any {
  const id = block?.id || `block-${idx}`
  switch (block?.type) {
    case 'text': {
      const heading: string = block.data?.heading || ''
      const body: string = block.data?.body || ''
      // Le body peut être du HTML enrichi (gras/couleur/police/listes, saisi
      // via l'éditeur de leçon) : dans ce cas on compose du HTML au lieu de
      // concaténer en texte brut, sinon les balises seraient affichées
      // telles quelles par le rendu Markdown.
      const content = /<[a-z][\s\S]*>/i.test(body)
        ? [heading ? `<h3>${escapeHtml(heading)}</h3>` : '', body].filter(Boolean).join('')
        : [heading, body].filter(Boolean).join('\n\n') || block.data?.content || ''
      return { id, type: 'text', data: { content } }
    }
    case 'image':
      return {
        id, type: 'media',
        data: { mediaType: 'image', mediaUrl: block.data?.url || block.data?.mediaUrl || '', caption: block.data?.caption || '' },
      }
    case 'file':
      return {
        id, type: 'media',
        data: { mediaType: 'file', mediaUrl: block.data?.url || block.data?.mediaUrl || '', caption: block.data?.caption || '' },
      }
    case 'media':
      if (block.data?.mediaType) return block // déjà au format canonique
      return {
        id, type: 'media',
        data: { mediaType: 'video', mediaUrl: block.data?.url || '', caption: block.data?.caption || '' },
      }
    case 'interaction':
      return {
        id, type: 'text',
        data: { content: [block.data?.emoji, block.data?.text].filter(Boolean).join(' ') || '' },
      }
    case 'quiz':
      return {
        id, type: 'quiz',
        data: {
          ...block.data,
          question: block.data?.question || '',
          options: (block.data?.options ?? []).map((opt: any, i: number) => ({
            id: opt.id || `${id}-opt-${i}`,
            text: opt.text || '',
            isCorrect: opt.isCorrect ?? opt.correct ?? false,
          })),
        },
      }
    case 'poll':
      return {
        id, type: 'poll',
        data: {
          pollQuestion: block.data?.question || block.data?.pollQuestion || '',
          pollOptions: (block.data?.options ?? block.data?.pollOptions ?? []).map((opt: any, i: number) => ({
            id: opt.id || `${id}-poll-${i}`,
            text: opt.text || '',
          })),
        },
      }
    default:
      return block
  }
}

// Aperçu PDF chargé à la demande (clic) plutôt qu'au rendu de la page.
// L'iframe pointe vers /api/elearning/file-proxy (same-origin) plutôt que
// directement vers *.supabase.co, car certains navigateurs (Brave Shields,
// Safari ITP...) bloquent silencieusement les iframes tierces même quand une
// navigation directe vers ce même lien fonctionne. Le lien "Ouvrir dans un
// nouvel onglet" pointe lui vers l'URL d'origine et reste en secours.
function PdfBlockView({ url, caption }: { url: string; caption?: string }) {
  const [showPreview, setShowPreview] = useState(false)
  return (
    <div className="space-y-2">
      {showPreview ? (
        <iframe
          src={toProxiedFileUrl(url)}
          title={caption || 'Document PDF'}
          className="w-full h-[600px] rounded-lg border border-gray-200"
        />
      ) : (
        <button
          type="button"
          onClick={() => setShowPreview(true)}
          className="w-full h-32 flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 text-gray-500 hover:border-brand-blue hover:text-brand-blue transition-colors"
        >
          <FileText className="h-6 w-6" />
          <span className="text-sm">Afficher l'aperçu du PDF</span>
        </button>
      )}
      <div className="flex items-center justify-between p-3 border rounded-lg">
        <span className="text-sm font-medium truncate">{caption || 'Document PDF'}</span>
        <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm text-brand-blue hover:underline flex-shrink-0 ml-2">
          Ouvrir dans un nouvel onglet
        </a>
      </div>
    </div>
  )
}

const ScormPlayer = dynamic(
  () => import('@/components/elearning/ScormPlayer').then(m => m.ScormPlayer),
  { ssr: false }
)
const QuizPlayer = dynamic(
  () => import('@/components/elearning/QuizPlayer').then(m => m.QuizPlayer),
  { ssr: false }
)

export default function LearnerCourseDetailPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string
  const { student: studentData, studentId, hasFeature, featuresLoading } = useLearnerContext()
  const supabase = useMemo(() => (studentId ? createLearnerClient(studentId) : null), [studentId])
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  
  const [currentLessonIndex, setCurrentLessonIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const lessonBottomRef = useRef<HTMLDivElement>(null)
  const lessonCardRef = useRef<HTMLDivElement>(null)
  const [scrollProgress, setScrollProgress] = useState(0)
  const [videoPercent, setVideoPercent] = useState(0)
  const [videoDurationSecs, setVideoDurationSecs] = useState(0)
  const [videoCurrentSecs, setVideoCurrentSecs] = useState(0)
  const prevProgressRef = useRef<number | null>(null)
  const [autoAdvanceCountdown, setAutoAdvanceCountdown] = useState<number | null>(null)
  const [openAccordionItems, setOpenAccordionItems] = useState<Record<string, boolean>>({})
  const [lessonNotes, setLessonNotes] = useState<Record<string, string>>({})
  const [timeSpent, setTimeSpent] = useState<Record<string, number>>({})
  const [activeContentTab, setActiveContentTab] = useState<'content' | 'notes'>('content')
  const restoredLastLesson = useRef(false)

  // Réponses aux quiz intégrés dans le contenu des leçons (blocs "quiz")
  // Format: { [lessonId]: { [blockId]: selectedOptionIdOrText } }
  const [inlineQuizAnswers, setInlineQuizAnswers] = useState<Record<string, Record<string, string>>>({})

  // Gating : complétion de chaque bloc de contrôle (quiz inline, vidéo avec seuil)
  const [blockCompletions, setBlockCompletions] = useState<Record<string, boolean>>({})

  const inlineQuizStorageKey = useMemo(() => {
    if (!studentId) return null
    return `eduzen.inlineQuizAnswers.${studentId}`
  }, [studentId])

  const notesStorageKey = useMemo(() => (studentId ? `eduzen.lessonNotes.${studentId}` : null), [studentId])
  const timeStorageKey = useMemo(() => (studentId ? `eduzen.lessonTime.${studentId}` : null), [studentId])
  const lastLessonStorageKey = useMemo(
    () => (studentId && slug ? `eduzen.lastLesson.${studentId}.${slug}` : null),
    [studentId, slug]
  )

  const loadNoteFromStorage = (lessonId: string): string => {
    if (!notesStorageKey) return ''
    try {
      const raw = localStorage.getItem(notesStorageKey)
      if (!raw) return ''
      return JSON.parse(raw)?.[lessonId] || ''
    } catch { return '' }
  }

  const saveNoteToStorage = (lessonId: string, note: string) => {
    if (!notesStorageKey) return
    try {
      const raw = localStorage.getItem(notesStorageKey)
      const parsed = raw ? JSON.parse(raw) : {}
      localStorage.setItem(notesStorageKey, JSON.stringify({ ...parsed, [lessonId]: note }))
    } catch { /* ignore */ }
  }

  const formatTimeSpent = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}min`
    return `${Math.floor(seconds / 3600)}h${Math.floor((seconds % 3600) / 60)}min`
  }

  const formatVideoTime = (secs: number): string => {
    const m = Math.floor(secs / 60)
    const s = Math.floor(secs % 60)
    return `${m}:${String(s).padStart(2, '0')}`
  }

  const loadInlineAnswersFromStorage = (lessonId: string) => {
    if (!inlineQuizStorageKey) return null
    try {
      const raw = localStorage.getItem(inlineQuizStorageKey)
      if (!raw) return null
      const parsed = JSON.parse(raw)
      const lessonAnswers = parsed?.[lessonId]
      if (lessonAnswers && typeof lessonAnswers === 'object') return lessonAnswers as Record<string, string>
      return null
    } catch {
      return null
    }
  }

  const saveInlineAnswersToStorage = (lessonId: string, lessonAnswers: Record<string, string>) => {
    if (!inlineQuizStorageKey) return
    try {
      const raw = localStorage.getItem(inlineQuizStorageKey)
      const parsed = raw ? JSON.parse(raw) : {}
      const next = { ...(parsed || {}), [lessonId]: lessonAnswers }
      localStorage.setItem(inlineQuizStorageKey, JSON.stringify(next))
    } catch {
      // ignore
    }
  }

  // Récupérer le cours
  const { data: course, isLoading: loadingCourse, refetch: refetchCourse } = useQuery({
    queryKey: ['learner-course', slug],
    queryFn: async () => {
      try {
        if (!supabase) return null
        const { data, error } = await supabase
          .from('courses')
          .select(`
            *,
            course_sections(
              id,
              title,
              description,
              order_index,
              lessons(
                id,
                title,
                description,
                content,
                lesson_type,
                video_duration_minutes,
                order_index,
                video_url,
                is_preview,
                quizzes(id),
                scorm_packages(id, entry_point, scorm_version, storage_path)
              )
            )
          `)
          .eq('slug', slug)
          .maybeSingle()
        
        if (error) {
          // Si la table n'existe pas encore ou erreur 400, retourner null
          if (
            error.code === 'PGRST116' ||
            error.code === '42P01' ||
            error.code === 'PGRST301' ||
            (error as any).status === 400 ||
            error.code === '400' ||
            error.message?.includes('relation') ||
            error.message?.includes('relationship') ||
            error.message?.includes('does not exist') ||
            error.message?.includes('schema cache')
          ) {
            logger.warn('Course table or relations do not exist yet or invalid query', {
              slug: slug,
              error: sanitizeError(error),
            })
            return null
          }
          throw error
        }
        return data
      } catch (error: any) {
        // Gérer les erreurs de table inexistante ou erreurs 400
        if (
          error?.code === 'PGRST116' ||
          error?.code === '42P01' ||
          error?.code === 'PGRST301' ||
          error?.status === 400 ||
          error?.code === '400' ||
          error?.message?.includes('relation') ||
          error?.message?.includes('relationship') ||
          error?.message?.includes('does not exist') ||
          error?.message?.includes('schema cache')
        ) {
          logger.warn('Course table or relations do not exist yet or invalid query', {
            slug: slug,
            error: sanitizeError(error),
          })
          return null
        }
        throw error
      }
    },
    enabled: !!slug && !!supabase,
  })

  const scoresEnabled = (course as any)?.scores_enabled !== false

  // Récupérer l'inscription de l'étudiant
  // Table course_enrollments n'existe pas
  const enrollment = null

  // Récupérer la progression des leçons
  const { data: lessonProgress } = useQuery({
    queryKey: ['learner-lesson-progress', course?.id, studentId],
    queryFn: async () => {
      if (!course?.id || !studentId || !supabase) return {}
      
      const { data } = await supabase
        .from('lesson_progress')
        .select('*')
        .eq('student_id', studentId)
      
      const progressMap: Record<string, any> = {}
      data?.forEach((p: any) => {
        progressMap[p.lesson_id] = p
      })
      
      return progressMap
    },
    enabled: !!course?.id && !!studentId && !!supabase,
  })

  // Fallback: leçons sans section (section_id IS NULL) ou si RLS course_sections non appliquée.
  const { data: lessonsFallback } = useQuery({
    queryKey: ['learner-course-lessons-fallback', course?.id],
    queryFn: async () => {
      if (!supabase || !course?.id) return []

      const query = supabase
        .from('lessons')
        .select(
          `
          id,
          title,
          description,
          content,
          lesson_type,
          video_duration_minutes,
          order_index,
          video_url,
          is_preview,
          course_id,
          section_id,
          section:course_sections(title),
          quizzes(id),
          scorm_packages(id, entry_point, scorm_version, storage_path)
        `
        )
        .eq('course_id', course.id)
        .order('order_index', { ascending: true })

      // Si le cours a des sections, ne ramener que les leçons sans section
      if (course?.course_sections?.length) {
        query.is('section_id', null)
      }

      const { data, error } = await query

      if (error) {
        logger.warn('Error fetching lessons fallback', {
          courseId: maskId(course.id),
          error: sanitizeError(error),
        })
        return []
      }

      return data || []
    },
    enabled: !!supabase && !!course?.id,
  })

  // Organiser les leçons — triées par order_index global pour correspondre à l'ordre éditeur
  const allLessons = (() => {
    if (!course?.course_sections?.length) {
      return (lessonsFallback || []).map((lesson: any) => ({
        ...lesson,
        sectionTitle: lesson?.section?.title || 'Sans section',
      }))
    }

    const sectioned = course.course_sections
      .flatMap((section: any) =>
        (section.lessons || []).map((lesson: any) => ({
          ...lesson,
          sectionTitle: section.title,
        }))
      )

    const unsectioned = (lessonsFallback || []).map((lesson: any) => ({
      ...lesson,
      sectionTitle: 'Sans section',
    }))

    // Tri global par order_index pour correspondre à l'ordre de l'éditeur
    return [...sectioned, ...unsectioned].sort(
      (a: any, b: any) => (a.order_index ?? 0) - (b.order_index ?? 0)
    )
  })()

  const currentLesson = allLessons[currentLessonIndex]
  const totalLessons = allLessons.length

  // Quiz attempts pour la leçon quiz courante
  const { data: quizAttempts = [] } = useQuery({
    queryKey: ['quiz-attempts-learner', currentLesson?.id],
    queryFn: async () => {
      if (!currentLesson?.id) return []
      const res = await fetch(`/api/elearning/quiz/attempt?lesson_id=${currentLesson.id}`)
      if (!res.ok) return []
      const json = await res.json()
      return json.attempts ?? []
    },
    enabled: !!currentLesson?.id && currentLesson?.lesson_type === 'quiz',
    staleTime: 0,
  })

  const completedLessons = Object.values(lessonProgress || {}).filter((p: any) => p.is_completed).length
  const progressPercentage = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0

  // ── Gating inline : blocs de contrôle dans le contenu de la leçon ─────────
  const lessonBlocks = useMemo<any[]>(() => {
    if (!currentLesson?.content) return []
    try {
      const p = JSON.parse(currentLesson.content)
      return Array.isArray(p) ? p : []
    } catch { return [] }
  }, [currentLesson?.content])

  const gatingBlocks = useMemo(() =>
    lessonBlocks
      .map((b: any, i: number) => ({
        idx: i,
        id: String(b?.id || `block-${i}`),
        isGating:
          b?.type === 'quiz' ||
          (b?.type === 'media' && b?.data?.mediaType === 'video' && (b?.data?.required_percentage ?? 0) > 0),
      }))
      .filter(g => g.isGating),
  [lessonBlocks])

  // Index à partir duquel les blocs sont verrouillés (= premier bloc-verrou non complété + 1)
  const lockedFromIdx = useMemo(() => {
    for (const g of gatingBlocks) {
      if (!blockCompletions[g.id]) return g.idx + 1
    }
    return Infinity
  }, [gatingBlocks, blockCompletions])

  // Progression du contenu de la leçon (0-100)
  const contentProgress = useMemo(() => {
    if (gatingBlocks.length === 0) return null
    const done = gatingBlocks.filter(g => blockCompletions[g.id]).length
    return Math.round((done / gatingBlocks.length) * 100)
  }, [gatingBlocks, blockCompletions])

  // Sync réponses quiz inline → complétion de bloc
  useEffect(() => {
    if (!currentLesson?.id) return
    const answers = inlineQuizAnswers?.[currentLesson.id]
    if (!answers) return
    setBlockCompletions(prev => {
      const next = { ...prev }
      let changed = false
      for (const [id, val] of Object.entries(answers)) {
        if (val && !next[id]) { next[id] = true; changed = true }
      }
      return changed ? next : prev
    })
  }, [inlineQuizAnswers, currentLesson?.id])

  // Reset gating + progression scroll + vidéo + auto-advance quand on change de leçon
  useEffect(() => {
    setBlockCompletions({})
    setScrollProgress(0)
    setVideoPercent(0)
    setVideoDurationSecs(0)
    setVideoCurrentSecs(0)
    setAutoAdvanceCountdown(null)
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [currentLesson?.id])

  // Barre de progression scroll : 0 → 100% en défilant jusqu'au bas de la leçon
  useEffect(() => {
    const onScroll = () => {
      const card = lessonCardRef.current
      if (!card) return
      const cardTop = card.getBoundingClientRect().top + window.scrollY
      const cardHeight = card.scrollHeight
      const scrollable = cardHeight - window.innerHeight
      if (scrollable <= 0) { setScrollProgress(100); return }
      const scrolled = window.scrollY - cardTop
      setScrollProgress(Math.min(100, Math.max(0, Math.round((scrolled / scrollable) * 100))))
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [currentLesson?.id])

  // Recharger les réponses des quiz inline depuis localStorage à chaque changement de leçon
  useEffect(() => {
    if (!currentLesson?.id) return
    const stored = loadInlineAnswersFromStorage(currentLesson.id)
    if (!stored) return
    setInlineQuizAnswers((prev) => {
      if (prev[currentLesson.id] && Object.keys(prev[currentLesson.id]).length > 0) return prev
      return { ...prev, [currentLesson.id]: stored }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps -- load from storage once when lesson/key change
  }, [currentLesson?.id, inlineQuizStorageKey])

  // Si le nombre de leçons change (RLS/migrations), s'assurer que l'index reste valide
  useEffect(() => {
    if (currentLessonIndex > 0 && currentLessonIndex >= totalLessons) {
      setCurrentLessonIndex(0)
    }
  }, [currentLessonIndex, totalLessons])

  // Reprendre à la première leçon non terminée dès que la progression est chargée
  useEffect(() => {
    if (!allLessons.length || !lastLessonStorageKey || restoredLastLesson.current || !lessonProgress) return
    restoredLastLesson.current = true
    // Priorité 1 : première leçon non terminée
    const firstIncomplete = allLessons.findIndex((l: any) => !lessonProgress?.[l.id]?.is_completed)
    if (firstIncomplete > 0) {
      setCurrentLessonIndex(firstIncomplete)
      return
    }
    // Priorité 2 (tout terminé = révision) : dernière leçon visitée
    try {
      const savedId = localStorage.getItem(lastLessonStorageKey)
      if (savedId) {
        const idx = allLessons.findIndex((l: any) => l.id === savedId)
        if (idx > 0) setCurrentLessonIndex(idx)
      }
    } catch { /* ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allLessons.length, lastLessonStorageKey, !!lessonProgress])

  // Sauvegarder la leçon courante comme "dernière visitée"
  useEffect(() => {
    if (!currentLesson?.id || !lastLessonStorageKey) return
    try { localStorage.setItem(lastLessonStorageKey, currentLesson.id) } catch { /* ignore */ }
  }, [currentLesson?.id, lastLessonStorageKey])

  // Réinitialiser l'onglet contenu et charger les notes à chaque changement de leçon
  useEffect(() => {
    if (!currentLesson?.id) return
    setActiveContentTab('content')
    const note = loadNoteFromStorage(currentLesson.id)
    setLessonNotes((prev) => ({ ...prev, [currentLesson.id]: note }))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentLesson?.id, notesStorageKey])

  // Charger le temps passé depuis localStorage au montage
  useEffect(() => {
    if (!timeStorageKey) return
    try {
      const raw = localStorage.getItem(timeStorageKey)
      if (raw) setTimeSpent(JSON.parse(raw))
    } catch { /* ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeStorageKey])

  // Tracker le temps passé sur la leçon courante (toutes les 10s)
  useEffect(() => {
    if (!currentLesson?.id || !timeStorageKey) return
    const lessonId = currentLesson.id
    const intervalId = setInterval(() => {
      setTimeSpent((prev) => {
        const updated = { ...prev, [lessonId]: (prev[lessonId] || 0) + 10 }
        try {
          const raw = localStorage.getItem(timeStorageKey)
          const stored = raw ? JSON.parse(raw) : {}
          localStorage.setItem(timeStorageKey, JSON.stringify({ ...stored, [lessonId]: (updated as Record<string, number>)[lessonId] }))
        } catch { /* ignore */ }
        return updated
      })
    }, 10000)
    return () => clearInterval(intervalId)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentLesson?.id, timeStorageKey])

  // Mutation pour marquer une leçon comme terminée
  const completeLessonMutation = useMutation({
    mutationFn: async ({ lessonId, durationMinutes }: { lessonId: string; durationMinutes?: number | null }) => {
      if (!studentId || !supabase) throw new Error('Student not found')

      // IMPORTANT:
      // On évite `upsert/on_conflict` (409 selon l'état des contraintes/index).
      // Flow robuste: SELECT -> UPDATE si existe, sinon INSERT. Et si INSERT renvoie 409 (race), on UPDATE.
      const nowIso = new Date().toISOString()
      const timeFields = durationMinutes != null ? { time_spent_minutes: durationMinutes } : {}
      const payloadInsert = {
        student_id: studentId,
        lesson_id: lessonId,
        is_completed: true,
        completed_at: nowIso,
        completion_percentage: 100,
        ...timeFields,
      }

      const payloadUpdate = {
        is_completed: true,
        completed_at: nowIso,
        completion_percentage: 100,
        ...timeFields,
      }

      const { data: existing, error: existingError } = await supabase
        .from('lesson_progress')
        .select('id')
        .eq('lesson_id', lessonId)
        .eq('student_id', studentId)
        .maybeSingle()

      if (existingError && existingError.code !== 'PGRST116') {
        // PGRST116 = no rows
        throw existingError
      }

      if (existing?.id) {
        const { error: updateError } = await supabase
          .from('lesson_progress')
          .update(payloadUpdate)
          .eq('id', existing.id)
        if (updateError) throw updateError
      } else {
        const { error: insertError } = await supabase
          .from('lesson_progress')
          .insert(payloadInsert)

        if (insertError) {
          // Si conflit (ligne créée en parallèle), on retente en update.
          if (insertError.code === '23505' || insertError.message?.toLowerCase().includes('duplicate') || insertError.message?.toLowerCase().includes('conflict')) {
            const { error: updateError } = await supabase
              .from('lesson_progress')
              .update(payloadUpdate)
              .eq('lesson_id', lessonId)
              .eq('student_id', studentId)
            if (updateError) throw updateError
          } else {
            throw insertError
          }
        }
      }
      
      // Mettre à jour la progression globale du cours
      const newCompletedCount = completedLessons + 1
      const newProgress = Math.round((newCompletedCount / totalLessons) * 100)
      
      // NOTE: Table course_enrollments n'existe pas encore - désactivé pour l'instant
      // Fonctionnalité prévue - Nécessite création de la table course_enrollments dans Supabase
      /*
      await supabase
        // Table course_enrollments n'existe pas - désactivé
        // .from('course_enrollments')
        .update({
          progress_percentage: newProgress,
          status: newProgress >= 100 ? 'completed' : 'in_progress',
          completed_at: newProgress >= 100 ? new Date().toISOString() : null,
        })
        .eq('course_id', course?.id)
        .eq('student_id', studentData.id)
      */
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['learner-lesson-progress'] })
      queryClient.invalidateQueries({ queryKey: ['learner-course-enrollment'] })
      // Déclencher l'auto-avance si ce n'est pas la dernière leçon
      setCurrentLessonIndex(currentIdx => {
        if (currentIdx < totalLessons - 1) setAutoAdvanceCountdown(4)
        return currentIdx
      })
    },
    onError: (error: any) => {
      const msg = error?.message || ''
      addToast({
        type: 'error',
        title: 'Impossible d’enregistrer',
        description:
          msg.includes('401') || msg.toLowerCase().includes('unauthorized')
            ? "Accès non autorisé (RLS). Applique la migration '20251217000014_learner_write_lesson_progress.sql' puis réessaie."
            : msg.includes('409') || msg.toLowerCase().includes('conflict')
            ? "Conflit (409). Très souvent: la FK de `lesson_progress.student_id` pointe vers `auth.users` au lieu de `public.students`. Applique '20251217000016_fix_lesson_progress_student_fk.sql' (et éventuellement '20251217000015_lesson_progress_unique_index.sql'), puis réessaie."
            : 'Une erreur est survenue lors de l’enregistrement de votre progression.',
      })
    },
  })

  const handleNextLesson = () => {
    if (currentLessonIndex < totalLessons - 1) {
      setCurrentLessonIndex(currentLessonIndex + 1)
    }
  }

  const handlePrevLesson = () => {
    if (currentLessonIndex > 0) {
      setCurrentLessonIndex(currentLessonIndex - 1)
    }
  }

  // Auto-avance : décompte puis passage à la leçon suivante
  useEffect(() => {
    if (autoAdvanceCountdown === null) return
    if (autoAdvanceCountdown <= 0) {
      setAutoAdvanceCountdown(null)
      setCurrentLessonIndex(i => Math.min(i + 1, totalLessons - 1))
      return
    }
    const t = setTimeout(() => setAutoAdvanceCountdown(c => (c !== null ? c - 1 : null)), 1000)
    return () => clearTimeout(t)
  }, [autoAdvanceCountdown, totalLessons])

  // Célébration quand le cours passe à 100 %
  useEffect(() => {
    if (prevProgressRef.current !== null && prevProgressRef.current < 100 && progressPercentage >= 100) {
      addToast({
        type: 'success',
        title: '🎉 Félicitations !',
        description: 'Vous avez terminé ce cours. Votre certificat est disponible.',
      })
    }
    prevProgressRef.current = progressPercentage
  }, [progressPercentage]) // eslint-disable-line react-hooks/exhaustive-deps

  // Raccourcis clavier : ← → pour naviguer entre leçons, Espace pour play/pause vidéo
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if ((e.target as HTMLElement)?.isContentEditable) return
      if (e.key === 'ArrowRight') {
        setCurrentLessonIndex(i => Math.min(i + 1, totalLessons - 1))
      } else if (e.key === 'ArrowLeft') {
        setCurrentLessonIndex(i => Math.max(i - 1, 0))
      } else if (e.key === ' ' && videoRef.current) {
        e.preventDefault()
        if (videoRef.current.paused) videoRef.current.play().catch(() => {})
        else videoRef.current.pause()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [totalLessons])

  const handleCompleteLesson = () => {
    if (currentLesson) {
      completeLessonMutation.mutate({
        lessonId: currentLesson.id,
        durationMinutes: currentLesson.video_duration_minutes ?? null,
      })
    }
  }

  const getLessonIcon = (type: string) => {
    switch (type) {
      case 'video': return <Video className="h-4 w-4" />
      case 'quiz': return <ListChecks className="h-4 w-4" />
      case 'text': return <FileText className="h-4 w-4" />
      case 'image': return <ImageIcon className="h-4 w-4" />
      default: return <BookOpen className="h-4 w-4" />
    }
  }

  const isLessonCompleted = (lessonId: string) => {
    return lessonProgress?.[lessonId]?.is_completed
  }

  // Auto-complétion quand l'apprenant atteint le bas de la leçon
  const isCurrentLessonCompleted = currentLesson ? isLessonCompleted(currentLesson.id) : false
  useEffect(() => {
    const el = lessonBottomRef.current
    if (!el || !currentLesson || isCurrentLessonCompleted || currentLesson.lesson_type === 'quiz') return
    // Bloquer l'auto-complétion tant que du contenu est encore grisé (quiz non terminés)
    if (lockedFromIdx !== Infinity) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          completeLessonMutation.mutate({
            lessonId: currentLesson.id,
            durationMinutes: currentLesson.video_duration_minutes ?? null,
          })
        }
      },
      { threshold: 1.0 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentLesson?.id, isCurrentLessonCompleted, lockedFromIdx])

  const renderLessonContent = (content?: string | null, lessonId?: string) => {
    if (!content) return null

    try {
      const parsed = JSON.parse(content)
      if (Array.isArray(parsed)) {
        const normalized = parsed.map((block: any, idx: number) => normalizeContentBlock(block, idx))
        return (
          <div className="space-y-4">
            {normalized.map((block: any, idx: number) => {
              if (!block?.type) return null
              const blockId = String(block?.id || `block-${idx}`)
              const isLocked = idx >= lockedFromIdx

              const wrapBlock = (node: React.ReactNode) => (
                <div key={blockId} className="relative">
                  {node}
                  {isLocked && (
                    <div className="absolute inset-0 bg-white/85 backdrop-blur-[2px] rounded-lg flex flex-col items-center justify-center gap-2 z-10 pointer-events-none select-none">
                      <Lock className="h-6 w-6 text-gray-400" />
                      <p className="text-xs text-gray-500 font-medium">Terminez le quiz précédent pour continuer</p>
                    </div>
                  )}
                </div>
              )

              if (block.type === 'text') {
                const textContent = block?.data?.content || ''
                const isHtml = /<[a-z][\s\S]*>/i.test(textContent)
                return wrapBlock(
                  <div className="prose prose-sm max-w-none [&_p]:mb-3 [&_ul]:mb-3 [&_ol]:mb-3">
                    {isHtml
                      ? <div dangerouslySetInnerHTML={{ __html: sanitizeBlogContent(textContent) }} />
                      : <ReactMarkdown>{textContent}</ReactMarkdown>}
                  </div>
                )
              }

              if (block.type === 'separator') {
                return wrapBlock(<hr className="border-gray-200" />)
              }

              if (block.type === 'media') {
                const mediaType = block?.data?.mediaType
                const url = block?.data?.mediaUrl
                const caption = block?.data?.caption
                const requiredPct: number = block?.data?.required_percentage ?? 0
                if (!url) return null

                if (mediaType === 'image') {
                  return wrapBlock(
                    <div className="space-y-2">
                      <img src={url} alt={caption || 'Image'} className="w-full rounded-lg border border-gray-200" />
                      {caption ? <p className="text-sm text-gray-500 text-center italic">{caption}</p> : null}
                    </div>
                  )
                }

                if (mediaType === 'video') {
                  const { embedUrl, isFile } = toVideoEmbedUrl(url)
                  return wrapBlock(
                    <div className="space-y-2">
                      {isFile ? (
                        <video
                          src={url}
                          controls
                          className="w-full rounded-lg"
                          onTimeUpdate={requiredPct > 0 ? (e) => {
                            const v = e.currentTarget
                            if (v.duration > 0 && (v.currentTime / v.duration) * 100 >= requiredPct) {
                              setBlockCompletions(prev => prev[blockId] ? prev : { ...prev, [blockId]: true })
                            }
                          } : undefined}
                        />
                      ) : (
                        // Lien YouTube/Vimeo : lu via iframe, donc pas de suivi de
                        // progression natif possible (currentTime inaccessible).
                        <div className="aspect-video rounded-lg overflow-hidden bg-black">
                          <iframe
                            src={embedUrl!}
                            className="w-full h-full"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        </div>
                      )}
                      {isFile && requiredPct > 0 && !blockCompletions[blockId] && (
                        <p className="text-xs text-amber-600 text-center">
                          Regardez au moins {requiredPct}% de la vidéo pour continuer
                        </p>
                      )}
                      {caption ? <p className="text-sm text-gray-500 text-center italic">{caption}</p> : null}
                    </div>
                  )
                }

                if (mediaType === 'audio') {
                  return wrapBlock(
                    <div className="space-y-2">
                      <audio src={url} controls className="w-full" />
                      {caption ? <p className="text-sm text-gray-500 text-center italic">{caption}</p> : null}
                    </div>
                  )
                }

                // file
                const isPdf = /\.pdf(\?|#|$)/i.test(url)
                if (isPdf) {
                  return wrapBlock(<PdfBlockView url={url} caption={caption} />)
                }
                return wrapBlock(
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <span className="text-sm font-medium truncate">{caption || 'Fichier'}</span>
                      <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm text-brand-blue hover:underline flex-shrink-0 ml-2">
                        Télécharger
                      </a>
                    </div>
                  </div>
                )
              }

              if (block.type === 'quiz') {
                // blockId already defined at top of map (outer scope)
                const selected = (lessonId && inlineQuizAnswers?.[lessonId]?.[blockId]) || ''
                const isVF = block?.data?.quizType === 'true_false'

                // Vrai / Faux
                if (isVF) {
                  const correctAnswer = block?.data?.correctAnswer || ''
                  const isAnswered = !!selected
                  const isCorrect = isAnswered && selected === correctAnswer
                  const isGraded = !!correctAnswer

                  return wrapBlock(
                    <div className="p-4 border rounded-lg bg-white">
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <h4 className="font-semibold text-gray-900">
                          {scoresEnabled && isGraded ? 'Vrai / Faux (noté)' : 'Vrai / Faux'}
                        </h4>
                        {scoresEnabled && isGraded && (
                          <Badge className={isAnswered ? (isCorrect ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700') : 'bg-gray-100 text-gray-700'}>
                            {isAnswered ? (isCorrect ? '1/1' : '0/1') : '0/1'}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-700 mb-3">{block?.data?.question || ''}</p>
                      <div className="grid grid-cols-2 gap-3">
                        {['vrai', 'faux'].map((val) => {
                          const isSelected = selected === val
                          const isAnswerLocked = isAnswered
                          const showAsCorrect = isAnswerLocked && isGraded && val === correctAnswer
                          const showAsWrong = isAnswerLocked && isGraded && isSelected && !isCorrect

                          return (
                            <button
                              key={val}
                              type="button"
                              disabled={isAnswerLocked}
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                if (isAnswerLocked || !lessonId) return
                                const nextLessonAnswers = { ...(inlineQuizAnswers?.[lessonId] || {}), [blockId]: val }
                                saveInlineAnswersToStorage(lessonId, nextLessonAnswers)
                                setInlineQuizAnswers((prev) => ({ ...prev, [lessonId]: nextLessonAnswers }))
                              }}
                              className={`py-3 rounded-xl border-2 text-sm font-semibold capitalize transition-colors ${
                                showAsCorrect
                                  ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                                  : showAsWrong
                                  ? 'border-rose-500 bg-rose-50 text-rose-700'
                                  : isSelected
                                  ? 'border-brand-blue bg-brand-blue/10 text-gray-900'
                                  : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                              }`}
                            >
                              {val === 'vrai' ? '✓ Vrai' : '✗ Faux'}
                            </button>
                          )
                        })}
                      </div>
                      {isAnswered && isGraded && (
                        <p className={`mt-3 text-sm font-medium ${isCorrect ? 'text-emerald-700' : 'text-rose-700'}`}>
                          {isCorrect ? 'Bonne réponse !' : `Mauvaise réponse — la bonne réponse est "${correctAnswer}".`}
                        </p>
                      )}
                      {selected && (
                        <p className="mt-2 text-xs text-gray-500">Réponse verrouillée.</p>
                      )}
                    </div>
                  )
                }

                const options = (block?.data?.options || []).map((opt: any, optIdx: number) => ({
                  id: String(opt?.id || `${blockId}-opt-${optIdx}`),
                  text: String(opt?.text || ''),
                  isCorrect: !!opt?.isCorrect,
                }))

                const correctOptions = options.filter((o: any) => o.isCorrect)
                const selectedOption = options.find((o: any) => (o.id || o.text) === selected)
                const isAnswered = !!selected
                const isGraded = correctOptions.length > 0
                const isCorrect = isAnswered && isGraded ? !!selectedOption?.isCorrect : false

                return wrapBlock(
                  <div className="p-4 border rounded-lg bg-white">
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <h4 className="font-semibold text-gray-900">
                        {scoresEnabled && isGraded ? 'Quiz (noté)' : 'Quiz'}
                      </h4>
                      {scoresEnabled && isGraded && (
                        <Badge className={isAnswered ? (isCorrect ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700') : 'bg-gray-100 text-gray-700'}>
                          {isAnswered ? (isCorrect ? '1/1' : '0/1') : '0/1'}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-700 mb-3">{block?.data?.question || ''}</p>

                    <div className="space-y-2">
                      {options.map((opt: any) => {
                        const value = opt.id || opt.text
                        const isSelected = selected === value
                        const isAnswerLocked = !!selected

                        return (
                          <button
                            key={value}
                            type="button"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              if (!lessonId || isAnswerLocked) return
                              setInlineQuizAnswers((prev) => {
                                const nextLessonAnswers = { ...(prev[lessonId] || {}), [blockId]: value }
                                saveInlineAnswersToStorage(lessonId, nextLessonAnswers)
                                return { ...prev, [lessonId]: nextLessonAnswers }
                              })
                            }}
                            disabled={isAnswerLocked}
                            className={`w-full text-left border rounded-md px-3 py-2 text-sm transition-colors ${
                              isSelected
                                ? 'border-brand-blue bg-brand-blue/10 text-gray-900'
                                : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                            }`}
                          >
                            {opt.text}
                          </button>
                        )
                      })}
                    </div>

                    {scoresEnabled && isAnswered && isGraded && (
                      <div className="mt-3 text-sm">
                        {isCorrect ? (
                          <p className="text-green-700 font-medium">Bonne réponse (+1)</p>
                        ) : (
                          <p className="text-red-700 font-medium">Mauvaise réponse (0)</p>
                        )}
                      </div>
                    )}
                    {selected && (
                      <p className="mt-2 text-xs text-gray-500">Réponse verrouillée (vous ne pouvez plus la modifier).</p>
                    )}
                  </div>
                )
              }

              if (block.type === 'poll') {
                return wrapBlock(
                  <div className="p-4 border rounded-lg bg-white">
                    <h4 className="font-semibold text-gray-900 mb-2">Sondage</h4>
                    <p className="text-sm text-gray-700 mb-3">{block?.data?.pollQuestion || ''}</p>
                    <ul className="space-y-2">
                      {(block?.data?.pollOptions || []).map((opt: any) => (
                        <li key={opt.id} className="text-sm text-gray-600 border rounded-md px-3 py-2">
                          {opt.text}
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              }

              if (block.type === 'code') {
                const lang = block?.data?.language || 'code'
                return wrapBlock(
                  <div className="rounded-xl overflow-hidden border border-gray-700">
                    <div className="flex items-center gap-2 px-4 py-2 bg-gray-800">
                      <div className="flex gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-red-500/80" />
                        <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                        <div className="w-3 h-3 rounded-full bg-green-500/80" />
                      </div>
                      <span className="text-xs text-gray-400 ml-2 font-mono">{lang}</span>
                    </div>
                    <pre className="p-4 bg-gray-900 overflow-x-auto">
                      <code className="text-sm text-green-400 font-mono whitespace-pre">
                        {block?.data?.content || ''}
                      </code>
                    </pre>
                  </div>
                )
              }

              if (block.type === 'callout') {
                const calloutType = block?.data?.calloutType || 'info'
                const calloutStyles: Record<string, { border: string; bg: string; icon: React.ReactNode; titleColor: string }> = {
                  info: { border: 'border-l-sky-500', bg: 'bg-sky-50', titleColor: 'text-sky-700', icon: <Info className="h-5 w-5 text-sky-500 shrink-0 mt-0.5" /> },
                  tip: { border: 'border-l-emerald-500', bg: 'bg-emerald-50', titleColor: 'text-emerald-700', icon: <Lightbulb className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" /> },
                  warning: { border: 'border-l-amber-500', bg: 'bg-amber-50', titleColor: 'text-amber-700', icon: <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" /> },
                  danger: { border: 'border-l-rose-500', bg: 'bg-rose-50', titleColor: 'text-rose-700', icon: <AlertCircle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" /> },
                }
                const style = calloutStyles[calloutType] || calloutStyles.info
                return wrapBlock(
                  <div className={`border-l-4 ${style.border} ${style.bg} rounded-r-xl p-4`}>
                    <div className="flex items-start gap-3">
                      {style.icon}
                      <div className="min-w-0 flex-1">
                        {block?.data?.calloutTitle && (
                          <p className={`font-semibold mb-1 ${style.titleColor}`}>{block.data.calloutTitle}</p>
                        )}
                        <div className="prose prose-sm max-w-none text-gray-700">
                          <ReactMarkdown>{block?.data?.content || ''}</ReactMarkdown>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              }

              if (block.type === 'accordion') {
                return wrapBlock(
                  <div className="space-y-2">
                    {(block?.data?.items || []).map((item: any, itemIdx: number) => {
                      const itemKey = `${blockId}-${item.id || itemIdx}`
                      const isOpen = !!openAccordionItems[itemKey]
                      return (
                        <div key={itemKey} className="border border-gray-200 rounded-xl overflow-hidden">
                          <button
                            type="button"
                            onClick={() => setOpenAccordionItems((prev) => ({ ...prev, [itemKey]: !isOpen }))}
                            className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left bg-white hover:bg-gray-50 transition-colors"
                          >
                            <span className="font-semibold text-gray-900 text-sm">{item.title}</span>
                            {isOpen
                              ? <ChevronUp className="h-4 w-4 text-gray-500 shrink-0" />
                              : <ChevronDown className="h-4 w-4 text-gray-500 shrink-0" />
                            }
                          </button>
                          {isOpen && (
                            <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
                              <div className="prose prose-sm max-w-none">
                                <ReactMarkdown>{item.content || ''}</ReactMarkdown>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )
              }

              return null
            })}
          </div>
        )
      }
    } catch {
      // Not JSON
    }

    return (
      <div className="prose prose-sm max-w-none mt-6 pt-6 border-t">
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>
    )
  }

  // Score global des quiz "inline" de la leçon courante (si des bonnes réponses existent).
  const inlineLessonScore = useMemo(() => {
    if (!currentLesson?.id || !currentLesson?.content) {
      return { total: 0, answered: 0, correct: 0, percentage: 0, graded: false }
    }

    try {
      const parsed = JSON.parse(currentLesson.content)
      if (!Array.isArray(parsed)) return { total: 0, answered: 0, correct: 0, percentage: 0, graded: false }

      const quizBlocks = parsed.filter((b: any) => b?.type === 'quiz')
      if (!quizBlocks.length) return { total: 0, answered: 0, correct: 0, percentage: 0, graded: false }

      const lessonAnswers = inlineQuizAnswers?.[currentLesson.id] || {}

      let total = 0
      let answered = 0
      let correct = 0

      for (let i = 0; i < quizBlocks.length; i++) {
        const block = quizBlocks[i]
        const blockId = String(block?.id || `quiz-${i}`)
        const selected = lessonAnswers[blockId]
        if (selected) answered += 1

        const options = (block?.data?.options || []).map((opt: any, optIdx: number) => ({
          id: String(opt?.id || `${blockId}-opt-${optIdx}`),
          text: String(opt?.text || ''),
          isCorrect: !!opt?.isCorrect,
        }))

        const correctOptions = options.filter((o: any) => o.isCorrect)
        if (!correctOptions.length) {
          // pas de correction => non noté
          continue
        }

        total += 1
        const selectedOption = options.find((o: any) => (o.id || o.text) === selected)
        if (selected && selectedOption?.isCorrect) correct += 1
      }

      const graded = total > 0
      const percentage = graded ? Math.round((correct / total) * 100) : 0
      return { total, answered, correct, percentage, graded }
    } catch {
      return { total: 0, answered: 0, correct: 0, percentage: 0, graded: false }
    }
  }, [currentLesson?.id, currentLesson?.content, inlineQuizAnswers])

  if (loadingCourse) {
    return (
      <div className="pb-24 lg:pb-8">
        {/* Sticky bar skeleton */}
        <div className="sticky top-0 z-30 bg-gradient-to-r from-brand-blue to-brand-blue-dark border-b border-brand-blue-dark/50 px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-3">
          <div className="w-8 h-8 bg-white/20 rounded-lg animate-pulse shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3.5 w-52 bg-white/20 rounded animate-pulse" />
            <div className="h-1.5 w-36 bg-white/20 rounded-full animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] min-h-screen">
          {/* Content skeleton */}
          <div className="max-w-3xl mx-auto px-6 md:px-10 py-8 space-y-5 border-r border-gray-100">
            <div className="h-3.5 w-28 bg-gray-100 rounded animate-pulse" />
            <div className="h-8 w-3/4 bg-gray-100 rounded-lg animate-pulse" />
            <div className="space-y-2 pt-1">
              <div className="h-3 bg-gray-100 rounded animate-pulse" />
              <div className="h-3 bg-gray-100 rounded animate-pulse w-5/6" />
              <div className="h-3 bg-gray-100 rounded animate-pulse w-2/3" />
            </div>
            <div className="h-56 bg-gray-100 rounded-xl animate-pulse" />
            <div className="space-y-2">
              <div className="h-3 bg-gray-100 rounded animate-pulse" />
              <div className="h-3 bg-gray-100 rounded animate-pulse w-4/5" />
            </div>
            <div className="h-32 bg-gray-100 rounded-xl animate-pulse" />
          </div>
          {/* Sidebar skeleton */}
          <div className="hidden lg:block px-4 py-5 space-y-3 border-l border-gray-100">
            <div className="flex justify-between items-center mb-3">
              <div className="h-3 w-24 bg-gray-100 rounded animate-pulse" />
              <div className="h-3 w-8 bg-gray-100 rounded animate-pulse" />
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full animate-pulse" />
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2.5 py-1.5">
                <div className="w-6 h-6 bg-gray-100 rounded-full animate-pulse shrink-0" />
                <div className="flex-1 h-3 bg-gray-100 rounded animate-pulse" style={{ width: `${70 + (i % 3) * 10}%` }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!course) {
    return (
      <div className="text-center py-12">
        <BookOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Cours introuvable</h2>
        <Link href="/learner/elearning">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour aux cours
          </Button>
        </Link>
      </div>
    )
  }

  if (!featuresLoading && !hasFeature('e_learning')) {
    return (
      <FeatureLocked
        featureName="Portail e-learning"
        featureDescription="Cette fonctionnalité n'est pas incluse dans le forfait de votre organisme de formation."
      />
    )
  }

  return (
    <div className="pb-24 lg:pb-8 relative">
      {/* Sticky top bar — top-0 : cette page s'affiche en plein écran, sans
          le header du layout learner (cf. app/(learner)/learner/layout.tsx) */}
      <div className="sticky top-0 z-30 bg-gradient-to-r from-brand-blue to-brand-blue-dark backdrop-blur-xl border-b border-brand-blue-dark/50 px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-3 shadow-lg shadow-brand-blue/20">
        <Link href="/learner/elearning">
          <button className="p-1.5 -ml-1 rounded-lg hover:bg-white/10 transition-colors text-white/70 hover:text-white" title="Retour aux cours">
            <ArrowLeft className="h-5 w-5" />
          </button>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-semibold text-white truncate leading-tight">{course.title}</h1>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex-1 max-w-[180px] h-1 bg-white/20 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-white rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progressPercentage}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
            <span className="text-xs font-bold text-white/90">{progressPercentage}%</span>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-3 text-xs text-white/60 shrink-0">
          <span>
            <span className="font-semibold text-white">{completedLessons}</span><span className="text-white/60">/{totalLessons} leçons</span>
          </span>
          {Object.keys(timeSpent).length > 0 && (
            <span className="flex items-center gap-1 text-white/60">
              <Timer className="h-3 w-3" />
              {formatTimeSpent(Object.values(timeSpent).reduce((a, b) => a + b, 0))}
            </span>
          )}
          {progressPercentage >= 100 && (
            <span className="inline-flex items-center gap-1 bg-white/20 text-white border border-white/30 rounded-full px-2 py-0.5 text-[11px] font-medium">
              <Award className="h-3 w-3" />Terminé
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] min-h-screen">
        {/* Contenu principal */}
        <div className="min-h-screen border-r border-gray-100">
          {currentLesson && (
            <div ref={lessonCardRef} className="bg-white/90 backdrop-blur-sm">
              {/* Barre de progression scroll */}
              <div className="h-0.5 bg-gray-100 overflow-hidden">
                <div
                  className="h-full transition-all duration-200"
                  style={{
                    width: `${scrollProgress}%`,
                    background: scrollProgress === 100
                      ? 'linear-gradient(90deg, #22c55e, #16a34a)'
                      : 'linear-gradient(90deg, #3b82f6, #818cf8)',
                  }}
                />
              </div>

              {/* Bandeau "Leçon terminée" */}
              <AnimatePresence>
                {isLessonCompleted(currentLesson.id) && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <div className="bg-gradient-to-r from-brand-blue/10 to-brand-cyan/10 border-b border-brand-cyan/20 px-6 md:px-10 py-2.5 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-brand-cyan shrink-0" />
                      <span className="text-sm font-medium text-brand-blue">Leçon terminée</span>
                      {autoAdvanceCountdown !== null && currentLessonIndex < totalLessons - 1 && (
                        <span className="ml-auto flex items-center gap-3 text-sm text-brand-blue">
                          <span>Leçon suivante dans <strong>{autoAdvanceCountdown}s</strong></span>
                          <button
                            onClick={() => setAutoAdvanceCountdown(null)}
                            className="text-xs text-brand-blue underline hover:text-brand-blue-dark transition-colors"
                          >
                            Annuler
                          </button>
                          <button
                            onClick={() => { setAutoAdvanceCountdown(null); setCurrentLessonIndex(i => i + 1) }}
                            className="flex items-center gap-1 bg-gradient-to-r from-brand-blue to-brand-cyan text-white text-xs font-semibold px-3 py-1 rounded-full hover:from-brand-blue-dark hover:to-brand-cyan-dark transition-all"
                          >
                            Suivant <ChevronRight className="h-3.5 w-3.5" />
                          </button>
                        </span>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              {/* Video/Content Area */}
              {currentLesson.lesson_type === 'scorm' && currentLesson.scorm_packages?.[0] ? (
                <ScormPlayer
                  lessonId={currentLesson.id}
                  entryPoint={currentLesson.scorm_packages[0].entry_point}
                  scormVersion={currentLesson.scorm_packages[0].scorm_version as '1.2' | '2004'}
                  studentId={studentId || ''}
                  organizationId={(course as any)?.organization_id || ''}
                  onComplete={handleCompleteLesson}
                />
              ) : currentLesson.lesson_type === 'quiz' ? null : currentLesson.video_url ? (
              <div className="bg-gray-900">
                <div className="aspect-video">
                  <video
                    ref={videoRef}
                    src={currentLesson.video_url}
                    className="w-full h-full object-contain"
                    controls
                    onEnded={handleCompleteLesson}
                    onLoadedMetadata={(e) => setVideoDurationSecs(Math.round(e.currentTarget.duration))}
                    onTimeUpdate={(e) => {
                      const v = e.currentTarget
                      if (v.duration > 0) {
                        setVideoPercent(Math.round((v.currentTime / v.duration) * 100))
                        setVideoCurrentSecs(Math.round(v.currentTime))
                      }
                    }}
                  />
                </div>
                {/* Barre de progression vidéo */}
                {videoDurationSecs > 0 && (
                  <div className="px-4 py-2.5 flex items-center gap-3 border-t border-gray-700/50">
                    <span className="text-xs text-gray-400 font-mono w-10 shrink-0 text-right">{formatVideoTime(videoCurrentSecs)}</span>
                    <div className="flex-1 h-1 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${videoPercent}%`,
                          background: videoPercent >= 100 ? '#22c55e' : 'linear-gradient(90deg, #3b82f6, #818cf8)',
                        }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 font-mono w-10 shrink-0">{formatVideoTime(videoDurationSecs)}</span>
                    <span className={`text-[11px] font-semibold w-9 shrink-0 text-right ${videoPercent >= 100 ? 'text-green-400' : 'text-gray-500'}`}>
                      {videoPercent}%
                    </span>
                  </div>
                )}
              </div>
              ) : null}

              {/* Lesson Info */}
              <div className="max-w-3xl mx-auto px-6 md:px-10 pt-7 pb-0">
                {/* Breadcrumb section */}
                {currentLesson.sectionTitle && currentLesson.sectionTitle !== 'Sans section' && (
                  <p className="text-xs font-semibold text-brand-cyan uppercase tracking-wider mb-2">
                    {currentLesson.sectionTitle}
                  </p>
                )}
                <div className="flex items-start justify-between gap-4 mb-1">
                  <h2 className="text-2xl font-bold leading-snug bg-gradient-to-r from-gray-900 to-brand-blue bg-clip-text text-transparent">
                    {currentLesson.title}
                  </h2>
                  <div className="flex items-center gap-2 mt-1 shrink-0">
                    {currentLesson.video_duration_minutes && (
                      <span className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-full px-2.5 py-1">
                        <Clock className="h-3 w-3" />
                        {currentLesson.video_duration_minutes} min
                      </span>
                    )}
                    {isLessonCompleted(currentLesson.id) && (
                      <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 border border-green-100 rounded-full px-2.5 py-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Terminé
                      </span>
                    )}
                  </div>
                </div>

                {currentLesson.description && (
                  <p className="text-gray-500 text-sm leading-relaxed mt-2">{currentLesson.description}</p>
                )}

                {scoresEnabled && inlineLessonScore.graded && (
                  <div className="mt-3">
                    <Badge className="bg-indigo-50 text-indigo-700 border border-indigo-100">
                      Score quiz: {inlineLessonScore.correct}/{inlineLessonScore.total} ({inlineLessonScore.percentage}%)
                    </Badge>
                  </div>
                )}

                {/* Quiz inline progress */}
                {contentProgress !== null && gatingBlocks.length > 0 && (
                  <div className="mt-4 flex items-center gap-3 text-xs text-gray-500 bg-gray-50 rounded-xl p-3 border border-gray-100">
                    <div className="flex-1 bg-gray-200 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="h-1.5 rounded-full transition-all duration-500"
                        style={{
                          width: `${contentProgress}%`,
                          background: contentProgress === 100 ? '#22c55e' : '#6366f1',
                        }}
                      />
                    </div>
                    <span className="shrink-0 font-semibold">
                      {gatingBlocks.filter(g => blockCompletions[g.id]).length}/{gatingBlocks.length} quiz complétés
                      {contentProgress === 100 && <span className="text-green-600 ml-1">✓</span>}
                    </span>
                  </div>
                )}
              </div>

                {/* Onglets contenu / notes */}
                <div className="flex max-w-3xl mx-auto border-b border-gray-100 mt-6 px-6 md:px-10">
                  <button
                    type="button"
                    onClick={() => setActiveContentTab('content')}
                    className={`flex items-center gap-2 px-3 py-3 text-sm font-medium border-b-2 transition-colors mr-1 ${
                      activeContentTab === 'content'
                        ? 'border-brand-cyan text-brand-blue'
                        : 'border-transparent text-gray-400 hover:text-gray-700'
                    }`}
                  >
                    <BookOpen className="h-4 w-4" />
                    Contenu
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveContentTab('notes')}
                    className={`flex items-center gap-2 px-3 py-3 text-sm font-medium border-b-2 transition-colors ${
                      activeContentTab === 'notes'
                        ? 'border-brand-cyan text-brand-blue'
                        : 'border-transparent text-gray-400 hover:text-gray-700'
                    }`}
                  >
                    <PenLine className="h-4 w-4" />
                    Mes notes
                    {lessonNotes[currentLesson.id]?.trim() && (
                      <span className="w-1.5 h-1.5 bg-brand-blue rounded-full shrink-0" />
                    )}
                  </button>
                </div>
              <div className="max-w-3xl mx-auto px-6 md:px-10 py-6">

                {/* Contenu de la leçon */}
                {activeContentTab === 'content' && currentLesson.lesson_type === 'quiz' ? (
                  (() => {
                    let quizContent = null
                    try { if (currentLesson.content) quizContent = JSON.parse(currentLesson.content) } catch { /* ignore */ }
                    return quizContent ? (
                      <QuizPlayer
                        lessonId={currentLesson.id}
                        content={quizContent}
                        studentId={studentId || ''}
                        organizationId={(course as any)?.organization_id || ''}
                        previousAttempts={quizAttempts}
                        onComplete={(passed) => { if (passed) handleCompleteLesson() }}
                      />
                    ) : (
                      <div className="py-12 text-center text-sm text-gray-400">
                        Ce quiz ne contient pas encore de questions.
                      </div>
                    )
                  })()
                ) : activeContentTab === 'content' ? (
                  renderLessonContent(currentLesson.content, currentLesson.id)
                ) : null}

                {/* Notes personnelles */}
                {activeContentTab === 'notes' && (
                  <div className="space-y-3">
                    <p className="text-xs text-gray-400 flex items-center gap-1.5">
                      <Timer className="h-3.5 w-3.5" />
                      Notes sauvegardées localement sur cet appareil
                    </p>
                    <textarea
                      value={lessonNotes[currentLesson.id] || ''}
                      onChange={(e) => {
                        const note = e.target.value
                        setLessonNotes((prev) => ({ ...prev, [currentLesson.id]: note }))
                        saveNoteToStorage(currentLesson.id, note)
                      }}
                      rows={14}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-4 focus:ring-brand-blue/10 focus:border-brand-blue transition-all resize-none text-sm text-gray-800 placeholder-gray-400"
                      placeholder="Prenez vos notes ici (idées, résumés, questions)..."
                    />
                    {lessonNotes[currentLesson.id]?.trim() && (
                      <p className="text-xs text-gray-400 text-right">
                        {lessonNotes[currentLesson.id].length} caractères
                      </p>
                    )}
                  </div>
                )}

              </div>
              {/* Navigation */}
              <div className="flex items-center justify-between max-w-3xl mx-auto px-6 md:px-10 py-5 mt-4 border-t border-gray-100 bg-gray-50/60">
                  <Button
                    variant="outline"
                    onClick={handlePrevLesson}
                    disabled={currentLessonIndex === 0}
                    className="gap-2"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Précédent
                  </Button>

                  {!isLessonCompleted(currentLesson.id) && (
                    <Button
                      onClick={handleCompleteLesson}
                      disabled={completeLessonMutation.isPending}
                      className="bg-green-600 hover:bg-green-700 gap-2"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Marquer comme terminé
                    </Button>
                  )}

                  <Button
                    onClick={handleNextLesson}
                    disabled={currentLessonIndex >= totalLessons - 1}
                    className="gap-2 bg-gradient-to-r from-brand-blue to-brand-cyan hover:from-brand-blue-dark hover:to-brand-cyan-dark text-white border-0 shadow-md shadow-brand-blue/20"
                  >
                    Suivant
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                {/* Sentinel invisible — déclenche l'auto-complétion au scroll */}
                <div ref={lessonBottomRef} className="h-1" aria-hidden="true" />
            </div>
          )}

          {!currentLesson && (
            <div className="m-6 p-6 border border-brand-cyan/20 bg-gradient-to-br from-brand-blue/5 to-brand-cyan/5 rounded-2xl backdrop-blur-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Impossible de démarrer le cours</h3>
              <p className="text-sm text-gray-700 mb-4">
                Ce cours ne contient pas encore de leçons, ou l’accès aux sections/leçons n’est pas encore autorisé.
              </p>
              <div className="flex gap-3">
                <Button
                  onClick={() => refetchCourse()}
                  className="bg-brand-blue hover:bg-brand-blue/90"
                >
                  Réessayer
                </Button>
                <Link href="/learner/elearning">
                  <Button variant="outline">Retour aux cours</Button>
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar - Liste des leçons */}
        <div className="hidden lg:block border-l border-white/20 bg-white/60 backdrop-blur-xl">
          <div className="sticky top-[112px] max-h-[calc(100vh-112px)] overflow-y-auto flex flex-col">
            {/* Progress summary */}
            <div className="px-4 py-4 border-b border-white/20 bg-gradient-to-br from-brand-blue/5 to-brand-cyan/5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-brand-blue uppercase tracking-widest">Progression</span>
                <span className="text-xs font-bold text-brand-cyan">{progressPercentage}%</span>
              </div>
              <div className="h-1.5 bg-brand-blue/10 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-brand-blue to-brand-cyan rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercentage}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-[11px] text-gray-400">
                  <span className="font-semibold text-gray-600">{completedLessons}</span>/{totalLessons} leçons
                </span>
                {Object.keys(timeSpent).length > 0 && (
                  <span className="flex items-center gap-1 text-[11px] text-gray-400">
                    <Timer className="h-3 w-3" />
                    {formatTimeSpent(Object.values(timeSpent).reduce((a, b) => a + b, 0))}
                  </span>
                )}
              </div>
            </div>

            {/* Lesson list */}
            <div className="flex-1 px-3 py-3">
              {allLessons.length ? (
                allLessons.map((lesson: any, idx: number) => {
                  const isActive = idx === currentLessonIndex
                  const isComplete = isLessonCompleted(lesson.id)
                  const prevSectionTitle = idx > 0 ? allLessons[idx - 1].sectionTitle : null
                  const showSectionHeader =
                    lesson.sectionTitle !== prevSectionTitle &&
                    (lesson.sectionTitle !== 'Sans section' || course.course_sections?.length > 0)

                  return (
                    <div key={lesson.id}>
                      {showSectionHeader && (
                        <div className={`px-2 pb-1 ${idx > 0 ? 'mt-5' : 'mt-1'}`}>
                          <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                            {lesson.sectionTitle}
                          </h4>
                        </div>
                      )}
                      <button
                        onClick={() => setCurrentLessonIndex(idx)}
                        className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left transition-all mb-0.5 ${
                          isActive
                            ? 'bg-gradient-to-r from-brand-blue to-brand-cyan shadow-md shadow-brand-blue/30'
                            : isComplete
                            ? 'hover:bg-green-50'
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold ${
                          isActive
                            ? 'bg-white/25 text-white'
                            : isComplete
                            ? 'bg-green-100 text-green-600'
                            : 'bg-gray-100 text-gray-400'
                        }`}>
                          {isComplete && !isActive ? (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          ) : (
                            <span>{idx + 1}</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-medium truncate leading-snug ${
                            isActive ? 'text-white' : isComplete ? 'text-gray-700' : 'text-gray-600'
                          }`}>
                            {lesson.title}
                          </p>
                          {(lesson.video_duration_minutes || timeSpent[lesson.id] > 0) && (
                            <div className={`flex items-center gap-1.5 mt-0.5 text-[10px] ${
                              isActive ? 'text-white/60' : 'text-gray-400'
                            }`}>
                              {lesson.video_duration_minutes && <span>{lesson.video_duration_minutes} min</span>}
                              {timeSpent[lesson.id] > 0 && (
                                <span className="flex items-center gap-0.5">
                                  <Timer className="h-2 w-2" />
                                  {formatTimeSpent(timeSpent[lesson.id])}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        {isActive && <PlayCircle className="h-3.5 w-3.5 text-white/70 shrink-0" />}
                      </button>
                    </div>
                  )
                })
              ) : (
                <div className="text-xs text-gray-400 p-3 text-center">
                  Aucune leçon disponible.
                </div>
              )}
            </div>

            {/* Certificate */}
            {progressPercentage >= 100 && (
              <div className="mx-3 mb-4 p-4 rounded-2xl bg-gradient-to-br from-brand-blue/10 to-brand-cyan/10 border border-brand-cyan/20 backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-1">
                  <Award className="h-5 w-5 text-brand-cyan" />
                  <h4 className="text-sm font-bold text-gray-900">Félicitations !</h4>
                </div>
                <p className="text-xs text-gray-500 mb-3">Vous avez terminé ce cours.</p>
                <Button size="sm" className="w-full text-xs gap-1.5 bg-gradient-to-r from-brand-blue to-brand-cyan text-white border-0 hover:from-brand-blue-dark hover:to-brand-cyan-dark">
                  <Download className="h-3.5 w-3.5" />
                  Télécharger le certificat
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bouton flottant mobile pour ouvrir la liste des leçons */}
      <div className="fixed bottom-20 right-4 z-40 lg:hidden">
        <button
          onClick={() => setMobileDrawerOpen(true)}
          className="flex items-center gap-2 bg-gradient-to-r from-brand-blue to-brand-cyan text-white rounded-full pl-3 pr-4 py-2.5 shadow-lg shadow-brand-blue/30 text-sm font-semibold active:scale-95 transition-transform"
        >
          <BookOpen className="h-4 w-4" />
          <span>{completedLessons}/{totalLessons}</span>
        </button>
      </div>

      {/* Drawer mobile — liste des leçons */}
      <AnimatePresence>
        {mobileDrawerOpen && (
          <>
            <motion.div
              key="drawer-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50 lg:hidden"
              onClick={() => setMobileDrawerOpen(false)}
            />
            <motion.div
              key="drawer-panel"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-white rounded-t-2xl max-h-[78vh] flex flex-col shadow-2xl"
            >
              {/* Handle + header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0 bg-gradient-to-r from-brand-blue/5 to-brand-cyan/5">
                <div>
                  <h3 className="font-bold text-gray-900 text-sm">Contenu du cours</h3>
                  <p className="text-xs text-gray-400 mt-0.5">{completedLessons}/{totalLessons} leçons · {progressPercentage}%</p>
                </div>
                <button
                  onClick={() => setMobileDrawerOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
                >
                  <ChevronDown className="h-5 w-5" />
                </button>
              </div>
              {/* Progress bar */}
              <div className="h-1 bg-gray-100 shrink-0">
                <div
                  className="h-full bg-gradient-to-r from-brand-blue to-brand-cyan transition-all duration-500"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
              {/* Lesson list */}
              <div className="overflow-y-auto flex-1 px-3 py-3">
                {allLessons.map((lesson: any, idx: number) => {
                  const isActive = idx === currentLessonIndex
                  const isComplete = isLessonCompleted(lesson.id)
                  const prevSectionTitle = idx > 0 ? allLessons[idx - 1].sectionTitle : null
                  const showSectionHeader =
                    lesson.sectionTitle !== prevSectionTitle &&
                    (lesson.sectionTitle !== 'Sans section' || course.course_sections?.length > 0)
                  return (
                    <div key={lesson.id}>
                      {showSectionHeader && (
                        <div className={`px-2 pb-1 ${idx > 0 ? 'mt-4' : 'mt-1'}`}>
                          <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                            {lesson.sectionTitle}
                          </h4>
                        </div>
                      )}
                      <button
                        onClick={() => { setCurrentLessonIndex(idx); setMobileDrawerOpen(false) }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all mb-0.5 ${
                          isActive ? 'bg-gradient-to-r from-brand-blue to-brand-cyan shadow-md' : isComplete ? 'hover:bg-green-50' : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                          isActive ? 'bg-white/20 text-white' : isComplete ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
                        }`}>
                          {isComplete && !isActive ? <CheckCircle2 className="h-4 w-4" /> : <span>{idx + 1}</span>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium truncate ${isActive ? 'text-white' : isComplete ? 'text-gray-700' : 'text-gray-600'}`}>
                            {lesson.title}
                          </p>
                          {lesson.video_duration_minutes && (
                            <p className={`text-xs mt-0.5 ${isActive ? 'text-white/60' : 'text-gray-400'}`}>
                              {lesson.video_duration_minutes} min
                            </p>
                          )}
                        </div>
                        {isActive && <PlayCircle className="h-4 w-4 text-white/70 shrink-0" />}
                      </button>
                    </div>
                  )
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}


