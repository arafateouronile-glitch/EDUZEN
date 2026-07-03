'use client'

import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/use-auth'
import { createClient } from '@/lib/supabase/client'
import { elearningService } from '@/lib/services/elearning.service.client'
import {
  ArrowLeft, Save, X, Monitor, Smartphone, GripVertical,
  ChevronDown, Plus, Image as ImageIcon, Bold, Italic,
  AlignLeft, List, Palette, Type, Video, Zap, HelpCircle,
  BarChart2, BookOpen, Camera, Check, FileText, Eye, Loader2,
} from 'lucide-react'
import dynamic from 'next/dynamic'
import { cn } from '@/lib/utils'

const ScormUploader = dynamic(
  () => import('@/components/elearning/ScormUploader').then(m => m.ScormUploader),
  { ssr: false }
)
const QuizBuilder = dynamic(
  () => import('@/components/elearning/QuizBuilder').then(m => m.QuizBuilder),
  { ssr: false }
)
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

// ─── Types ──────────────────────────────────────────────────────────

interface TextBlockData { emoji: string; heading: string; body: string }
interface QuizOption { text: string; correct: boolean }
interface QuizBlockData { question: string; options: QuizOption[]; explanation: string }
interface ImageBlockData { url: string; caption: string }
interface MediaBlockData { url: string; caption: string }
interface InteractionBlockData { emoji: string; text: string }
interface PollOption { text: string }
interface PollBlockData { question: string; options: PollOption[] }

type ContentBlock =
  | { id: string; type: 'text'; data: TextBlockData }
  | { id: string; type: 'quiz'; data: QuizBlockData }
  | { id: string; type: 'image'; data: ImageBlockData }
  | { id: string; type: 'media'; data: MediaBlockData }
  | { id: string; type: 'interaction'; data: InteractionBlockData }
  | { id: string; type: 'poll'; data: PollBlockData }

interface LessonSettings {
  replayable?: boolean
  show_score?: boolean
  show_correction?: boolean
  // Conditions d'accès au module suivant
  require_completion?: boolean   // quand le module est fini
  available_from?: string        // à partir de la date (ISO date string)
  unlock_after_days?: number     // X jours après la fin du module (null = désactivé)
  min_score?: number             // score minimum pour continuer (0–100, null = désactivé)
}

interface LessonItem {
  id: string
  title: string
  lesson_type: string | null
  order_index: number
  section_id: string | null
  video_duration_minutes: number | null
  content?: string | null
  resources?: LessonSettings | null
  scorm_packages?: {
    id: string
    title: string | null
    scorm_version: string
    entry_point: string
  }[] | null
}

function parseBlocks(raw: string | null | undefined): ContentBlock[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed as ContentBlock[]
  } catch { /* invalid JSON, return empty */ }
  return []
}

function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'lecon'
  )
}

// ─── ToggleSwitch ────────────────────────────────────────────────────

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none',
        checked ? 'bg-brand-blue' : 'bg-gray-200',
      )}
    >
      <span
        className={cn(
          'inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform',
          checked ? 'translate-x-4' : 'translate-x-0.5',
        )}
      />
    </button>
  )
}

// ─── Left panel — Settings ───────────────────────────────────────────

function SettingsPanel({
  title, setTitle, description, setDescription,
  scoreVisible, setScoreVisible, isPublished, setIsPublished,
  thumbnailUrl, onSave, isSaving,
}: {
  title: string
  setTitle: (v: string) => void
  description: string
  setDescription: (v: string) => void
  scoreVisible: boolean
  setScoreVisible: (v: boolean) => void
  isPublished: boolean
  setIsPublished: (v: boolean) => void
  thumbnailUrl: string | null
  onSave: () => void
  isSaving: boolean
}) {
  const [category, setCategory] = useState('')

  return (
    <div className="h-full overflow-y-auto bg-white border-r border-gray-200">
      <div className="p-4 space-y-5">

        {/* Catégorie */}
        <section>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
            Catégorie
          </p>
          <div className="flex gap-2">
            <input
              value={category}
              onChange={e => setCategory(e.target.value)}
              placeholder="Ajouter..."
              className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-brand-blue/50 focus:ring-1 focus:ring-brand-blue/20"
            />
            <button
              type="button"
              className="px-2.5 py-1.5 bg-brand-blue text-white rounded-lg hover:bg-brand-blue-dark transition-colors"
            >
              <Check className="h-3.5 w-3.5" />
            </button>
          </div>
        </section>

        {/* Image de couverture */}
        <section>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
            Image de couverture
          </p>
          <div className="relative aspect-video bg-gray-100 rounded-xl overflow-hidden group cursor-pointer border border-gray-200">
            {thumbnailUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={thumbnailUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-300">
                <ImageIcon className="h-7 w-7 mb-1" />
                <span className="text-xs">Aucune image</span>
              </div>
            )}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <span className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-lg text-xs font-medium text-gray-700">
                <Camera className="h-3.5 w-3.5" />
                Modifier l'image
              </span>
            </div>
          </div>
        </section>

        {/* Titre */}
        <section>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
            Titre
          </p>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full text-sm font-medium border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-brand-blue/50 focus:ring-1 focus:ring-brand-blue/20"
          />
        </section>

        {/* Description */}
        <section>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
            Description
          </p>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={4}
            placeholder="Décrivez votre séquence..."
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 resize-none focus:outline-none focus:border-brand-blue/50 focus:ring-1 focus:ring-brand-blue/20"
          />
          <button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            className="mt-2 w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Sauvegarder
          </button>
        </section>

        <div className="border-t border-gray-100" />

        {/* Visibilité */}
        <section>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
            Visibilité
          </p>
          <select
            value={isPublished ? 'public' : 'private'}
            onChange={e => setIsPublished(e.target.value === 'public')}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:border-brand-blue/50 focus:ring-1 focus:ring-brand-blue/20"
          >
            <option value="public">Public</option>
            <option value="private">Privé</option>
          </select>
        </section>

        {/* Score toggle */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-700">Affichage du score</span>
          <ToggleSwitch checked={scoreVisible} onChange={setScoreVisible} />
        </div>

      </div>
    </div>
  )
}

// ─── Dock items ──────────────────────────────────────────────────────

const DOCK_ITEMS = [
  { id: 'text',        label: 'Textes',       icon: Type       },
  { id: 'image',       label: 'Images',       icon: ImageIcon  },
  { id: 'media',       label: 'Médias',       icon: Video      },
  { id: 'interaction', label: 'Interactions', icon: Zap        },
  { id: 'quiz',        label: 'Quiz',         icon: HelpCircle },
  { id: 'poll',        label: 'Sondage',      icon: BarChart2  },
]

// ─── Floating toolbar ────────────────────────────────────────────────

function FloatingToolbar({ visible }: { visible: boolean }) {
  if (!visible) return null
  const tools = [
    { icon: Bold,      label: 'Gras'       },
    { icon: Italic,    label: 'Italique'   },
    { icon: Palette,   label: 'Couleur'    },
    { icon: List,      label: 'Liste'      },
    { icon: AlignLeft, label: 'Alignement' },
  ]
  return (
    <div className="flex items-center gap-0.5 w-fit px-1.5 py-1 bg-gray-900 rounded-lg shadow-xl mb-3 mx-auto">
      {tools.map(({ icon: Icon, label }) => (
        <button
          key={label}
          type="button"
          title={label}
          className="p-1.5 rounded hover:bg-white/10 text-white/80 hover:text-white transition-colors"
        >
          <Icon className="h-3.5 w-3.5" />
        </button>
      ))}
    </div>
  )
}

// ─── Editable text block ─────────────────────────────────────────────

function EditableTextBlock({
  block, onChange,
}: {
  block: { id: string; type: 'text'; data: TextBlockData }
  onChange: (id: string, data: TextBlockData) => void
}) {
  return (
    <>
      <div className="flex items-center gap-1.5 mb-1.5">
        <input
          value={block.data.emoji ?? ''}
          onChange={e => onChange(block.id, { ...block.data, emoji: e.target.value })}
          className="w-8 text-base bg-transparent focus:outline-none"
        />
        <input
          value={block.data.heading ?? ''}
          onChange={e => onChange(block.id, { ...block.data, heading: e.target.value })}
          placeholder="Titre du bloc"
          className="flex-1 text-base font-semibold text-gray-800 bg-transparent focus:outline-none border-b border-transparent focus:border-gray-200"
        />
      </div>
      <textarea
        value={block.data.body ?? ''}
        onChange={e => onChange(block.id, { ...block.data, body: e.target.value })}
        placeholder="Contenu du bloc..."
        rows={3}
        className="text-sm text-gray-600 leading-relaxed w-full bg-transparent focus:outline-none resize-none"
      />
    </>
  )
}

// ─── Editable QCM block ──────────────────────────────────────────────

function EditableQCMBlock({
  block, onChange,
}: {
  block: { id: string; type: 'quiz'; data: QuizBlockData }
  onChange: (id: string, data: QuizBlockData) => void
}) {
  const [selected, setSelected] = useState<Set<number>>(new Set())

  const toggleSelected = (i: number) =>
    setSelected(prev => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })

  const toggleCorrect = (i: number) => {
    const newOptions = block.data.options.map((o, j) =>
      j === i ? { ...o, correct: !o.correct } : o
    )
    onChange(block.id, { ...block.data, options: newOptions })
  }

  const addOption = () =>
    onChange(block.id, { ...block.data, options: [...block.data.options, { text: '', correct: false }] })

  const removeOption = (i: number) => {
    if (block.data.options.length <= 2) return
    onChange(block.id, { ...block.data, options: block.data.options.filter((_, j) => j !== i) })
  }

  const isAnswered = selected.size > 0

  return (
    <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
      <textarea
        value={block.data.question ?? ''}
        onChange={e => onChange(block.id, { ...block.data, question: e.target.value })}
        placeholder="Question..."
        rows={2}
        className="text-sm font-semibold text-gray-800 mb-3 w-full bg-transparent focus:outline-none resize-none"
      />
      <div className="space-y-2 mb-3">
        {block.data.options.map((opt, i) => {
          const isSelected = selected.has(i)
          const rowColor = isAnswered && isSelected
            ? opt.correct ? 'border-green-300 bg-green-50' : 'border-red-200 bg-red-50'
            : isAnswered && !isSelected && opt.correct
            ? 'border-green-200 bg-green-50/40'
            : 'border-gray-200 bg-white hover:border-gray-300'
          const textColor = isAnswered && isSelected
            ? opt.correct ? 'text-green-800' : 'text-red-700'
            : 'text-gray-700'

          return (
            <div key={i} className={cn('flex items-center gap-3 p-2.5 rounded-lg border transition-colors text-sm', rowColor)}>
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => toggleSelected(i)}
                className="accent-brand-blue flex-shrink-0 rounded"
              />
              <input
                value={opt.text ?? ''}
                onChange={e => {
                  const newOptions = block.data.options.map((o, j) =>
                    j === i ? { ...o, text: e.target.value } : o
                  )
                  onChange(block.id, { ...block.data, options: newOptions })
                }}
                placeholder={`Option ${i + 1}`}
                className={cn('flex-1 bg-transparent focus:outline-none text-sm', textColor)}
              />
              <button
                type="button"
                onClick={() => toggleCorrect(i)}
                className={cn(
                  'px-2 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wide transition-colors flex-shrink-0',
                  opt.correct ? 'bg-brand-blue text-white' : 'bg-gray-100 text-gray-400 hover:bg-gray-200',
                )}
              >
                Correct
              </button>
              <button
                type="button"
                onClick={() => removeOption(i)}
                disabled={block.data.options.length <= 2}
                className="text-gray-300 hover:text-red-400 transition-colors disabled:opacity-0 flex-shrink-0"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )
        })}
      </div>
      <div className="flex items-center gap-3 mb-4">
        <button
          type="button"
          onClick={addOption}
          className="flex items-center gap-1 text-xs text-brand-blue hover:text-brand-blue-dark transition-colors"
        >
          <Plus className="h-3 w-3" />
          Ajouter une option
        </button>
        {isAnswered && (
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors ml-auto"
          >
            Réinitialiser
          </button>
        )}
      </div>
      {block.data.explanation !== undefined && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <p className="text-xs font-semibold text-green-700 mb-1">✓ Correction</p>
          <textarea
            value={block.data.explanation ?? ''}
            onChange={e => onChange(block.id, { ...block.data, explanation: e.target.value })}
            placeholder="Expliquer la bonne réponse..."
            rows={2}
            className="text-xs text-green-800 w-full bg-transparent focus:outline-none resize-none"
          />
        </div>
      )}
    </div>
  )
}

// ─── Editable image block ────────────────────────────────────────────

function EditableImageBlock({
  block, onChange, onUpload,
}: {
  block: { id: string; type: 'image'; data: ImageBlockData }
  onChange: (id: string, data: ImageBlockData) => void
  onUpload?: (file: File) => Promise<string>
}) {
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !onUpload) return
    setUploading(true)
    try {
      const url = await onUpload(file)
      onChange(block.id, { ...block.data, url })
    } catch {
      // silently ignore — user keeps the URL field
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
      {block.data.url ? (
        <div className="relative group mb-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={block.data.url} alt={block.data.caption} className="w-full rounded-xl object-cover max-h-64" />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/40 rounded-xl transition-all opacity-0 group-hover:opacity-100 text-white text-xs font-semibold gap-1.5"
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            {uploading ? 'Import...' : 'Changer'}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="w-full border-2 border-dashed border-gray-200 hover:border-brand-blue/40 hover:bg-brand-blue/5 rounded-xl p-8 flex flex-col items-center text-gray-300 hover:text-brand-blue/60 mb-2 transition-all cursor-pointer disabled:cursor-wait"
        >
          {uploading ? (
            <Loader2 className="h-8 w-8 mb-2 animate-spin" />
          ) : (
            <ImageIcon className="h-8 w-8 mb-2" />
          )}
          <p className="text-xs font-medium">{uploading ? 'Import en cours…' : 'Cliquez pour importer une image'}</p>
          <p className="text-[10px] mt-0.5 text-gray-300">ou entrez une URL ci-dessous</p>
        </button>
      )}
      <input
        value={block.data.url ?? ''}
        onChange={e => onChange(block.id, { ...block.data, url: e.target.value })}
        placeholder="https://exemple.com/image.jpg"
        className="w-full text-xs border border-gray-200 rounded-lg px-3 py-1.5 mb-1 focus:outline-none focus:border-brand-blue/50 focus:ring-1 focus:ring-brand-blue/20"
      />
      <input
        value={block.data.caption ?? ''}
        onChange={e => onChange(block.id, { ...block.data, caption: e.target.value })}
        placeholder="Légende de l'image..."
        className="w-full text-xs text-gray-400 text-center bg-transparent focus:outline-none border-b border-transparent focus:border-gray-200"
      />
    </>
  )
}

// ─── Editable media (video) block ────────────────────────────────────

function EditableMediaBlock({
  block, onChange,
}: {
  block: { id: string; type: 'media'; data: MediaBlockData }
  onChange: (id: string, data: MediaBlockData) => void
}) {
  // Local draft URL — only commit (and load iframe) on blur or Enter
  const [urlDraft, setUrlDraft] = useState(block.data.url ?? '')
  const [embedUrl, setEmbedUrl] = useState(block.data.url ?? '')

  // Sync if the block is replaced (e.g. lesson switch)
  useEffect(() => {
    setUrlDraft(block.data.url ?? '')
    setEmbedUrl(block.data.url ?? '')
  }, [block.id]) // intentionally only on block.id change

  const getEmbedUrl = (url: string) => {
    // Capture exactement 11 caractères de l'ID YouTube (format fixe), ignore ?si= et autres params
    const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/)
    if (yt) return `https://www.youtube.com/embed/${yt[1]}?rel=0`
    const vimeo = url.match(/vimeo\.com\/(\d+)/)
    if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`
    return url
  }

  const commit = () => {
    setEmbedUrl(urlDraft)
    onChange(block.id, { ...block.data, url: urlDraft })
  }

  return (
    <>
      <input
        value={urlDraft}
        onChange={e => setUrlDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); commit() } }}
        placeholder="URL vidéo (YouTube, Vimeo...) puis Entrée"
        className="w-full text-xs border border-gray-200 rounded-lg px-3 py-1.5 mb-2 focus:outline-none focus:border-brand-blue/50 focus:ring-1 focus:ring-brand-blue/20"
      />
      {embedUrl ? (
        <div className="aspect-video rounded-xl overflow-hidden bg-gray-100">
          <iframe
            src={getEmbedUrl(embedUrl)}
            title="Vidéo"
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      ) : (
        <div className="aspect-video rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-300">
          <Video className="h-8 w-8 mb-2" />
          <p className="text-xs">Collez une URL puis appuyez sur Entrée</p>
        </div>
      )}
      <input
        value={block.data.caption ?? ''}
        onChange={e => onChange(block.id, { ...block.data, caption: e.target.value })}
        placeholder="Légende..."
        className="mt-1 w-full text-xs text-gray-400 text-center bg-transparent focus:outline-none border-b border-transparent focus:border-gray-200"
      />
    </>
  )
}

// ─── Editable interaction (callout) block ────────────────────────────

function EditableInteractionBlock({
  block, onChange,
}: {
  block: { id: string; type: 'interaction'; data: InteractionBlockData }
  onChange: (id: string, data: InteractionBlockData) => void
}) {
  return (
    <div className="flex gap-3 p-4 bg-brand-blue-ghost border border-brand-blue/20 rounded-xl">
        <input
          value={block.data.emoji ?? ''}
          onChange={e => onChange(block.id, { ...block.data, emoji: e.target.value })}
          className="w-8 text-lg bg-transparent focus:outline-none flex-shrink-0 self-start"
        />
        <textarea
          value={block.data.text ?? ''}
          onChange={e => onChange(block.id, { ...block.data, text: e.target.value })}
          placeholder="Message à mettre en valeur..."
          rows={2}
          className="flex-1 text-sm text-brand-blue-dark bg-transparent focus:outline-none resize-none"
        />
    </div>
  )
}

// ─── Editable poll (sondage) block ───────────────────────────────────

function EditablePollBlock({
  block, onChange,
}: {
  block: { id: string; type: 'poll'; data: PollBlockData }
  onChange: (id: string, data: PollBlockData) => void
}) {
  const addOption = () =>
    onChange(block.id, { ...block.data, options: [...block.data.options, { text: '' }] })

  const updateOption = (i: number, text: string) => {
    const newOptions = block.data.options.map((o, j) => j === i ? { text } : o)
    onChange(block.id, { ...block.data, options: newOptions })
  }

  return (
    <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
      <textarea
        value={block.data.question ?? ''}
        onChange={e => onChange(block.id, { ...block.data, question: e.target.value })}
        placeholder="Question du sondage..."
        rows={2}
        className="text-sm font-semibold text-gray-800 mb-3 w-full bg-transparent focus:outline-none resize-none"
      />
      <div className="space-y-2 mb-3">
        {block.data.options.map((opt, i) => (
          <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg border border-gray-200 bg-white">
            <div className="h-4 w-4 rounded-full border-2 border-gray-300 flex-shrink-0" />
            <input
              value={opt.text ?? ''}
              onChange={e => updateOption(i, e.target.value)}
              placeholder={`Option ${i + 1}`}
              className="flex-1 text-sm text-gray-700 bg-transparent focus:outline-none"
            />
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={addOption}
        className="flex items-center gap-1 text-xs text-brand-blue hover:text-brand-blue-dark transition-colors"
      >
        <Plus className="h-3 w-3" />
        Ajouter une option
      </button>
    </div>
  )
}

// ─── Sortable block wrapper ──────────────────────────────────────────

function SortableBlockItem({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      className={cn('group/blk relative pl-7', isDragging && 'opacity-30')}
    >
      <div
        {...listeners}
        className="absolute left-0 top-1 opacity-0 group-hover/blk:opacity-100 cursor-grab active:cursor-grabbing touch-none"
      >
        <GripVertical className="h-5 w-5 text-gray-300 hover:text-gray-400" />
      </div>
      {children}
    </div>
  )
}

// ─── Center — Block editor ───────────────────────────────────────────

function BlockEditor({
  lessonTitle, setLessonTitle, blocks, onChangeBlock, onAddBlock, onReorderBlocks,
  onSave, onCancel, isSaving, isDirty, hasLesson, onImageUpload,
}: {
  lessonTitle: string
  setLessonTitle: (v: string) => void
  blocks: ContentBlock[]
  onChangeBlock: (id: string, data: unknown) => void
  onAddBlock: (type: string) => void
  onReorderBlocks: (blocks: ContentBlock[]) => void
  onSave: () => void
  onCancel: () => void
  isSaving: boolean
  isDirty: boolean
  hasLesson: boolean
  onImageUpload?: (file: File) => Promise<string>
}) {
  const [view, setView] = useState<'desktop' | 'mobile'>('desktop')
  const [toolbarVisible, setToolbarVisible] = useState(false)
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null)

  const blockSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const handleBlockDragStart = useCallback((event: DragStartEvent) => {
    setActiveBlockId(String(event.active.id))
  }, [])

  const handleBlockDragEnd = useCallback((event: DragEndEvent) => {
    setActiveBlockId(null)
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = blocks.findIndex(b => b.id === active.id)
    const newIndex = blocks.findIndex(b => b.id === over.id)
    if (oldIndex !== -1 && newIndex !== -1) {
      onReorderBlocks(arrayMove(blocks, oldIndex, newIndex))
    }
  }, [blocks, onReorderBlocks])

  const activeBlock = activeBlockId ? blocks.find(b => b.id === activeBlockId) : null

  return (
    <div className="flex flex-col h-full">

      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-white border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onSave}
            disabled={isSaving || !isDirty || !hasLesson}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-brand-blue text-white text-sm font-medium rounded-lg hover:bg-brand-blue-dark transition-colors disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Enregistrer
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={!isDirty}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white text-gray-600 text-sm font-medium rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-40"
          >
            <X className="h-3.5 w-3.5" />
            Annuler
          </button>
        </div>
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          <button
            type="button"
            onClick={() => setView('desktop')}
            className={cn(
              'p-1.5 rounded-md transition-colors',
              view === 'desktop' ? 'bg-white shadow-sm text-brand-blue' : 'text-gray-400 hover:text-gray-600',
            )}
          >
            <Monitor className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setView('mobile')}
            className={cn(
              'p-1.5 rounded-md transition-colors',
              view === 'mobile' ? 'bg-white shadow-sm text-brand-blue' : 'text-gray-400 hover:text-gray-600',
            )}
          >
            <Smartphone className="h-4 w-4" />
          </button>
        </div>
        <button
          type="button"
          onClick={() => setToolbarVisible(v => !v)}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-colors',
            toolbarVisible
              ? 'border-brand-blue/40 text-brand-blue bg-brand-blue/5'
              : 'border-gray-200 text-gray-400 hover:text-gray-600',
          )}
        >
          <Eye className="h-3.5 w-3.5" />
          Toolbar
        </button>
      </div>

      {/* Scrollable canvas */}
      <div className="flex-1 overflow-y-auto bg-gray-50 py-8 px-6">
        {!hasLesson ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-300">
            <BookOpen className="h-12 w-12 mb-3" />
            <p className="text-sm">Sélectionnez ou créez une activité</p>
          </div>
        ) : (
          <div
            className={cn(
              'mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 transition-all duration-300',
              view === 'mobile' ? 'max-w-[380px]' : 'max-w-2xl',
            )}
          >
            <div className="px-12 py-8 space-y-4">

              <FloatingToolbar visible={toolbarVisible} />

              {/* Header zone */}
              <div className="text-center space-y-1 pb-3">
                <input
                  value={lessonTitle}
                  onChange={e => setLessonTitle(e.target.value)}
                  className="w-full text-2xl font-bold text-gray-900 text-center bg-transparent focus:outline-none border-none"
                  placeholder="Titre de la leçon"
                />
                <p className="text-sm italic text-gray-400">Sous-titre de la séquence</p>
                <div className="pt-2 flex justify-center">
                  <div className="h-0.5 w-16 bg-brand-blue rounded-full" />
                </div>
              </div>

              {/* Blocks */}
              {blocks.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-gray-300">
                  <Type className="h-10 w-10 mb-2" />
                  <p className="text-sm">Ajoutez un bloc depuis le dock ci-dessous</p>
                </div>
              )}
              <DndContext
                sensors={blockSensors}
                collisionDetection={closestCenter}
                onDragStart={handleBlockDragStart}
                onDragEnd={handleBlockDragEnd}
              >
                <SortableContext items={blocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
                  {blocks.map(block => (
                    <SortableBlockItem key={block.id} id={block.id}>
                      {block.type === 'text' && <EditableTextBlock block={block} onChange={(id, data) => onChangeBlock(id, data)} />}
                      {block.type === 'image' && <EditableImageBlock block={block} onChange={(id, data) => onChangeBlock(id, data)} onUpload={onImageUpload} />}
                      {block.type === 'media' && <EditableMediaBlock block={block} onChange={(id, data) => onChangeBlock(id, data)} />}
                      {block.type === 'interaction' && <EditableInteractionBlock block={block} onChange={(id, data) => onChangeBlock(id, data)} />}
                      {block.type === 'quiz' && <EditableQCMBlock block={block} onChange={(id, data) => onChangeBlock(id, data)} />}
                      {block.type === 'poll' && <EditablePollBlock block={block} onChange={(id, data) => onChangeBlock(id, data)} />}
                    </SortableBlockItem>
                  ))}
                </SortableContext>
                <DragOverlay>
                  {activeBlock && (
                    <div className="bg-white rounded-xl border border-brand-blue/30 shadow-lg px-4 py-3 opacity-95">
                      <p className="text-xs text-gray-400 font-medium">Déplacement du bloc…</p>
                    </div>
                  )}
                </DragOverlay>
              </DndContext>

            </div>
          </div>
        )}
      </div>

      {/* Bottom dock */}
      <div className="flex-shrink-0 bg-white border-t border-gray-200 px-4 py-2.5">
        <div className="flex items-center justify-center gap-8">
          {DOCK_ITEMS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => onAddBlock(id)}
              disabled={!hasLesson}
              className="flex flex-col items-center gap-1 text-gray-400 hover:text-brand-blue transition-colors group disabled:opacity-40"
            >
              <div className="p-2 rounded-lg bg-gray-50 group-hover:bg-brand-blue-ghost transition-colors">
                <Icon className="h-4 w-4" />
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-wider">{label}</span>
            </button>
          ))}
        </div>
      </div>

    </div>
  )
}

// ─── Right panel — Activity list with drag & drop ────────────────────

const ADD_ACTIVITY_LABELS = [
  'Bibliothèque',
  'E-learning',
  'Réalisations',
  'Scorm',
  'Classe virtuelle',
]

function lessonMeta(lesson: LessonItem) {
  const duration = lesson.video_duration_minutes ? `${lesson.video_duration_minutes}'` : '—'

  // Dériver le label depuis les blocs de contenu réels
  let label = 'Mixte'
  let Icon: React.ElementType = FileText

  if (lesson.content) {
    try {
      const blocks: { type: string }[] = JSON.parse(lesson.content)
      if (Array.isArray(blocks) && blocks.length > 0) {
        const types = new Set(blocks.map(b => b.type))
        if (types.size === 1) {
          switch ([...types][0]) {
            case 'text':        label = 'Texte';      Icon = Type;       break
            case 'image':       label = 'Image';      Icon = ImageIcon;  break
            case 'media':       label = 'Vidéo';      Icon = Video;      break
            case 'quiz':        label = 'Quiz';       Icon = HelpCircle; break
            case 'poll':        label = 'Sondage';    Icon = BarChart2;  break
            case 'interaction': label = 'Info';       Icon = Zap;        break
          }
        }
        // sinon → Mixte / FileText (défaut)
      } else {
        label = ''
      }
    } catch { /* contenu non parsable → Mixte */ }
  } else {
    label = ''
  }

  return { Icon, label, duration }
}

// Rendu statique d'une carte (utilisé par DragOverlay)
function LessonCardStatic({ lesson, isSelected }: { lesson: LessonItem; isSelected: boolean }) {
  const { Icon, label, duration } = lessonMeta(lesson)
  return (
    <div className={cn(
      'w-full text-left rounded-xl border p-3',
      isSelected ? 'border-brand-blue/30 bg-brand-blue-ghost' : 'border-gray-200 bg-white',
    )}>
      <div className="flex items-center gap-2">
        <GripVertical className="h-4 w-4 text-gray-300 flex-shrink-0" />
        <div className="p-1 bg-gray-100 rounded-md flex-shrink-0">
          <Icon className="h-3.5 w-3.5 text-gray-500" />
        </div>
        {label && (
          <span className="text-[10px] font-bold bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded uppercase tracking-wide flex-shrink-0">
            {label}
          </span>
        )}
        <span className="flex-1 text-xs font-medium text-gray-700 truncate">{lesson.title}</span>
        <span className="text-xs font-bold text-gray-600 flex-shrink-0">{duration}</span>
        <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />
      </div>
    </div>
  )
}

// Carte sortable (avec poignée + zone cliquable séparées)
function SortableLessonCard({
  lesson, isSelected, isExpanded, onSelect, onToggleExpand,
  onUpdateDuration, onUpdateSettings, onEdit, onDuplicate, onDelete,
}: {
  lesson: LessonItem
  isSelected: boolean
  isExpanded: boolean
  onSelect: (id: string) => void
  onToggleExpand: (id: string) => void
  onUpdateDuration: (id: string, minutes: number | null) => void
  onUpdateSettings: (id: string, settings: LessonSettings) => void
  onEdit: (id: string) => void
  onDuplicate: (id: string) => void
  onDelete: (id: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: lesson.id })
  const { Icon, label, duration } = lessonMeta(lesson)
  const settings: LessonSettings = (lesson.resources as LessonSettings) ?? {}

  const borderClass = isSelected
    ? 'border-brand-blue/30 bg-brand-blue-ghost'
    : isExpanded
    ? 'border-brand-blue/20 bg-brand-blue-ghost/50'
    : 'border-gray-200 bg-white hover:border-gray-300'

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      className={cn('mb-1.5', isDragging && 'opacity-30')}
    >
      <button
        type="button"
        onClick={() => { onSelect(lesson.id); onToggleExpand(lesson.id) }}
        className={cn(
          'w-full text-left border p-3 transition-colors',
          isExpanded ? 'rounded-t-xl' : 'rounded-xl',
          borderClass,
        )}
      >
        <div className="flex items-center gap-2">
          <div
            {...listeners}
            className="cursor-grab active:cursor-grabbing touch-none flex-shrink-0 p-0.5 -ml-0.5 rounded hover:bg-gray-100"
          >
            <GripVertical className="h-4 w-4 text-gray-300" />
          </div>
          <div className="p-1 bg-gray-100 rounded-md flex-shrink-0">
            <Icon className="h-3.5 w-3.5 text-gray-500" />
          </div>
          <span className="text-[10px] font-bold bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded uppercase tracking-wide flex-shrink-0">
            {label}
          </span>
          <span className="flex-1 text-xs font-medium text-gray-700 truncate">{lesson.title}</span>
          <span className="text-xs font-bold text-gray-600 flex-shrink-0">{duration}</span>
          <ChevronDown
            className={cn('h-4 w-4 text-gray-400 transition-transform flex-shrink-0', isExpanded && 'rotate-180')}
          />
        </div>
      </button>

      {isExpanded && (
        <div className={cn('rounded-b-xl border-x border-b px-3 pb-3 pt-2.5 transition-colors', borderClass)}>
          <div className="border-t border-gray-100 pt-2.5 space-y-3">

            {/* Actions */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => onEdit(lesson.id)}
                className="flex-1 flex items-center justify-center gap-1 text-[11px] font-medium text-gray-600 bg-white border border-gray-200 rounded-lg px-2 py-1.5 hover:border-brand-blue/40 hover:text-brand-blue transition-colors"
              >
                <Check className="h-3 w-3" />
                Modifier
              </button>
              <button
                type="button"
                onClick={() => onDuplicate(lesson.id)}
                className="flex-1 flex items-center justify-center gap-1 text-[11px] font-medium text-gray-600 bg-white border border-gray-200 rounded-lg px-2 py-1.5 hover:border-brand-blue/40 hover:text-brand-blue transition-colors"
              >
                <Plus className="h-3 w-3" />
                Dupliquer
              </button>
              <button
                type="button"
                onClick={() => onDelete(lesson.id)}
                className="flex items-center justify-center gap-1 text-[11px] font-medium text-red-400 bg-white border border-gray-200 rounded-lg px-2 py-1.5 hover:border-red-300 hover:text-red-500 hover:bg-red-50 transition-colors"
              >
                <X className="h-3 w-3" />
                Supprimer
              </button>
            </div>

            {/* Durée */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 flex-shrink-0 w-20">Durée</span>
              <input
                type="number"
                min="0"
                value={lesson.video_duration_minutes ?? ''}
                onChange={e => onUpdateDuration(lesson.id, e.target.value === '' ? null : Number(e.target.value))}
                placeholder="0"
                className="w-16 text-xs text-gray-700 bg-white border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:border-brand-blue/40"
              />
              <span className="text-xs text-gray-400">min</span>
            </div>

            {/* Toggles comportement */}
            {[
              { key: 'replayable' as const, label: 'Rejouable' },
              { key: 'show_score' as const, label: 'Afficher le score à la fin' },
              { key: 'show_correction' as const, label: 'Afficher la correction' },
            ].map(({ key, label: toggleLabel }) => (
              <label key={key} className="flex items-center gap-2 cursor-pointer group/toggle">
                <div
                  onClick={() => onUpdateSettings(lesson.id, { ...settings, [key]: !settings[key] })}
                  className={cn(
                    'relative w-7 h-4 rounded-full transition-colors flex-shrink-0',
                    settings[key] ? 'bg-brand-blue' : 'bg-gray-200 group-hover/toggle:bg-gray-300',
                  )}
                >
                  <div className={cn(
                    'absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform',
                    settings[key] ? 'translate-x-3.5' : 'translate-x-0.5',
                  )} />
                </div>
                <span className="text-xs text-gray-500 select-none">{toggleLabel}</span>
              </label>
            ))}

            {/* ── Conditions pour passer au module suivant ── */}
            <div className="pt-2 border-t border-gray-100">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2.5">
                Passer au module suivant
              </p>
              <div className="space-y-2.5">

                {/* Quand le module est fini */}
                <label className="flex items-center gap-2 cursor-pointer group/toggle">
                  <div
                    onClick={() => onUpdateSettings(lesson.id, { ...settings, require_completion: !settings.require_completion })}
                    className={cn(
                      'relative w-7 h-4 rounded-full transition-colors flex-shrink-0',
                      settings.require_completion ? 'bg-brand-blue' : 'bg-gray-200 group-hover/toggle:bg-gray-300',
                    )}
                  >
                    <div className={cn(
                      'absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform',
                      settings.require_completion ? 'translate-x-3.5' : 'translate-x-0.5',
                    )} />
                  </div>
                  <span className="text-xs text-gray-500 select-none">Quand le module est fini</span>
                </label>

                {/* À partir de la date de... */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 flex-shrink-0 w-[5.5rem] leading-tight">À partir du</span>
                  <input
                    type="date"
                    value={settings.available_from ?? ''}
                    onChange={e => onUpdateSettings(lesson.id, { ...settings, available_from: e.target.value || undefined })}
                    className="flex-1 text-xs text-gray-700 bg-white border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:border-brand-blue/40"
                  />
                </div>

                {/* Après X jours de la fin du module */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 flex-shrink-0 w-[5.5rem] leading-tight">Après la fin</span>
                  <input
                    type="number"
                    min="0"
                    value={settings.unlock_after_days ?? ''}
                    onChange={e => onUpdateSettings(lesson.id, {
                      ...settings,
                      unlock_after_days: e.target.value === '' ? undefined : Number(e.target.value),
                    })}
                    placeholder="—"
                    className="w-14 text-xs text-gray-700 bg-white border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:border-brand-blue/40"
                  />
                  <span className="text-xs text-gray-400">jours</span>
                </div>

                {/* Score minimum */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 flex-shrink-0 w-[5.5rem] leading-tight">Score min.</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={settings.min_score ?? ''}
                    onChange={e => onUpdateSettings(lesson.id, {
                      ...settings,
                      min_score: e.target.value === '' ? undefined : Number(e.target.value),
                    })}
                    placeholder="—"
                    className="w-14 text-xs text-gray-700 bg-white border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:border-brand-blue/40"
                  />
                  <span className="text-xs text-gray-400">%</span>
                </div>

              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}

function ActivityList({
  lessons, selectedId, onSelect, onCreateLesson, isCreating, onReorder,
  onUpdateDuration, onUpdateSettings, onDelete, onDuplicate,
}: {
  lessons: LessonItem[]
  selectedId: string | null
  onSelect: (id: string) => void
  onCreateLesson: (type: string) => void
  isCreating: boolean
  onReorder: (updates: { id: string; order_index: number }[]) => void
  onUpdateDuration: (id: string, minutes: number | null) => void
  onUpdateSettings: (id: string, settings: LessonSettings) => void
  onDelete: (id: string) => void
  onDuplicate: (id: string) => void
}) {
  const [expanded, setExpanded] = useState<string | null>(null)
  const [localLessons, setLocalLessons] = useState<LessonItem[]>(lessons)
  const [activeId, setActiveId] = useState<string | null>(null)

  useEffect(() => { setLocalLessons(lessons) }, [lessons])

  const handleUpdateDuration = useCallback((id: string, minutes: number | null) => {
    setLocalLessons(prev => prev.map(l => l.id === id ? { ...l, video_duration_minutes: minutes } : l))
    onUpdateDuration(id, minutes)
  }, [onUpdateDuration])

  const handleUpdateSettings = useCallback((id: string, settings: LessonSettings) => {
    setLocalLessons(prev => prev.map(l => l.id === id ? { ...l, resources: settings } : l))
    onUpdateSettings(id, settings)
  }, [onUpdateSettings])

  const totalMinutes = localLessons.reduce((sum, l) => sum + (l.video_duration_minutes ?? 0), 0)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const activeLesson = activeId ? localLessons.find(l => l.id === activeId) ?? null : null

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null)
    const { active, over } = event
    if (!over || active.id === over.id) return
    setLocalLessons(prev => {
      const oldIndex = prev.findIndex(l => l.id === active.id)
      const newIndex = prev.findIndex(l => l.id === over.id)
      const reordered = arrayMove(prev, oldIndex, newIndex)
      onReorder(reordered.map((l, i) => ({ id: l.id, order_index: i })))
      return reordered
    })
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="h-full flex flex-col bg-white border-l border-gray-200">

        <div className="p-4 border-b border-gray-100 flex-shrink-0">
          <h2 className="text-sm font-semibold text-gray-800">Activités</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {localLessons.length} modules
            {totalMinutes > 0 && (
              <span className="ml-1.5 font-medium text-brand-blue">
                · {totalMinutes >= 60
                  ? `${Math.floor(totalMinutes / 60)}h${totalMinutes % 60 > 0 ? String(totalMinutes % 60).padStart(2, '0') : ''}`
                  : `${totalMinutes} min`}
              </span>
            )}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {localLessons.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-gray-300">
              <BookOpen className="h-8 w-8 mb-2" />
              <p className="text-xs text-center">Aucune activité.<br />Ajoutez-en une ci-dessous.</p>
            </div>
          )}
          <SortableContext items={localLessons.map(l => l.id)} strategy={verticalListSortingStrategy}>
            {localLessons.map(lesson => (
              <SortableLessonCard
                key={lesson.id}
                lesson={lesson}
                isSelected={selectedId === lesson.id}
                isExpanded={expanded === lesson.id}
                onSelect={onSelect}
                onToggleExpand={id => setExpanded(prev => prev === id ? null : id)}
                onUpdateDuration={handleUpdateDuration}
                onUpdateSettings={handleUpdateSettings}
                onEdit={id => { onSelect(id); setExpanded(null) }}
                onDuplicate={onDuplicate}
                onDelete={id => { onDelete(id); if (expanded === id) setExpanded(null) }}
              />
            ))}
          </SortableContext>
        </div>

        <div className="p-3 border-t border-gray-100 flex-shrink-0 space-y-2">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            Ajouter une activité
          </p>
          <div className="flex flex-wrap gap-1.5">
            {ADD_ACTIVITY_LABELS.map(lbl => (
              <button
                key={lbl}
                type="button"
                onClick={() => onCreateLesson(lbl)}
                disabled={isCreating}
                className="flex items-center gap-1 text-xs text-gray-500 border border-gray-200 rounded-full px-2.5 py-1 hover:border-brand-blue/40 hover:text-brand-blue transition-colors disabled:opacity-50"
              >
                {isCreating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                {lbl}
              </button>
            ))}
          </div>
        </div>

      </div>

      {/* Ghost rendu en dehors de tout overflow via portal */}
      <DragOverlay dropAnimation={null}>
        {activeLesson && (
          <div className="shadow-lg rounded-xl opacity-95 w-full">
            <LessonCardStatic lesson={activeLesson} isSelected={selectedId === activeLesson.id} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}

// ─── Main page ───────────────────────────────────────────────────────

export default function EditPage() {
  const params = useParams()
  const slug = params.slug as string
  const { user } = useAuth()
  const queryClient = useQueryClient()

  // ── Course data ──────────────────────────────────────────────────
  const { data: course, isLoading } = useQuery({
    queryKey: ['course-edit', slug],
    queryFn: () => elearningService.getCourseBySlug(slug, user?.organization_id || '') as Promise<any>,
    enabled: !!user?.organization_id,
  })

  // ── Scorm packages — requête séparée pour éviter la dépendance au join lessons
  const [selectedLessonIdForScorm, setSelectedLessonIdForScorm] = useState<string | null>(null)
  const { data: scormPackageForLesson, refetch: refetchScormPackage } = useQuery({
    queryKey: ['scorm-package', selectedLessonIdForScorm],
    queryFn: async () => {
      if (!selectedLessonIdForScorm) return null
      const res = await fetch(`/api/elearning/scorm/package?lesson_id=${selectedLessonIdForScorm}`)
      if (!res.ok) return null
      const json = await res.json()
      return json.package ?? null
    },
    enabled: !!selectedLessonIdForScorm,
    staleTime: 0,
  })

  // ── Course form state (left panel) ────────────────────────────────
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [isPublished, setIsPublished] = useState(false)
  const [scoreVisible, setScoreVisible] = useState(false)
  const [courseLoaded, setCourseLoaded] = useState(false)

  useEffect(() => {
    if (course && !courseLoaded) {
      setTitle(course.title || '')
      setDescription(course.description || course.short_description || '')
      setIsPublished(course.is_published ?? false)
      setScoreVisible(course.scores_enabled ?? false)
      setCourseLoaded(true)
    }
  }, [course, courseLoaded])

  // ── Lessons list (right panel) ───────────────────────────────────
  const lessons: LessonItem[] = useMemo(() => {
    if (!course) return []
    const raw = (course as any).lessons as LessonItem[] | undefined
    return raw ? [...raw].sort((a, b) => a.order_index - b.order_index) : []
  }, [course])

  // Sync estimated_duration_hours with actual lesson sum on load
  useEffect(() => {
    if (!course?.id || !courseLoaded || lessons.length === 0) return
    const totalMinutes = lessons.reduce((sum, l) => sum + (l.video_duration_minutes ?? 0), 0)
    const totalHours = totalMinutes > 0 ? Math.round((totalMinutes / 60) * 100) / 100 : 0
    if (Math.abs(((course as any).estimated_duration_hours ?? 0) - totalHours) > 0.01) {
      elearningService.updateCourse(course.id, { estimated_duration_hours: totalHours })
    }
  // Run only once after initial load
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseLoaded])

  // Stable org_id ref — ne se perd pas quand course est null pendant un refetch
  const orgIdRef = useRef<string>('')
  useEffect(() => {
    if (course?.organization_id) orgIdRef.current = course.organization_id
  }, [course?.organization_id])

  // ── Lesson editor state (center panel) ───────────────────────────
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null)
  const [loadedLessonId, setLoadedLessonId] = useState<string | null>(null)
  const [lessonTitle, setLessonTitle] = useState('')
  const [blocks, setBlocks] = useState<ContentBlock[]>([])
  const [savedBlocks, setSavedBlocks] = useState<ContentBlock[]>([])
  const [savedLessonTitle, setSavedLessonTitle] = useState('')
  const [quizContent, setQuizContent] = useState<import('@/lib/types/quiz.types').QuizContent | null>(null)
  const [savedQuizContent, setSavedQuizContent] = useState<import('@/lib/types/quiz.types').QuizContent | null>(null)

  const isDirty =
    lessonTitle !== savedLessonTitle ||
    JSON.stringify(blocks) !== JSON.stringify(savedBlocks) ||
    JSON.stringify(quizContent) !== JSON.stringify(savedQuizContent)

  // Load lesson into editor when selection or lessons data changes
  useEffect(() => {
    if (!selectedLessonId) return
    const lesson = lessons.find(l => l.id === selectedLessonId)
    if (!lesson) return
    if (lesson.id === loadedLessonId) return
    setLessonTitle(lesson.title)
    setSavedLessonTitle(lesson.title)
    if (lesson.lesson_type === 'quiz') {
      let qc = null
      try { qc = lesson.content ? JSON.parse(lesson.content) : null } catch { qc = null }
      setQuizContent(qc)
      setSavedQuizContent(qc)
      setBlocks([])
      setSavedBlocks([])
    } else {
      const parsed = parseBlocks(lesson.content)
      setBlocks(parsed)
      setSavedBlocks(parsed)
      setQuizContent(null)
      setSavedQuizContent(null)
    }
    setLoadedLessonId(lesson.id)
  }, [selectedLessonId, lessons, loadedLessonId])

  // Auto-select first lesson on initial load
  useEffect(() => {
    if (lessons.length > 0 && !selectedLessonId) {
      setSelectedLessonId(lessons[0].id)
    }
  }, [lessons, selectedLessonId])

  // Sync selected lesson ID for scorm query when lesson type is scorm
  useEffect(() => {
    if (!selectedLessonId) { setSelectedLessonIdForScorm(null); return }
    const lesson = lessons.find(l => l.id === selectedLessonId)
    setSelectedLessonIdForScorm(lesson?.lesson_type === 'scorm' ? selectedLessonId : null)
  }, [selectedLessonId, lessons])

  // ── Block operations ────────────────────────────────────────────
  const handleChangeBlock = useCallback((id: string, data: unknown) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, data } as ContentBlock : b))
  }, [])

  const handleImageUpload = useCallback(async (file: File): Promise<string> => {
    const supabase = createClient()
    const fileExt = file.name.split('.').pop()
    const fileName = `${user?.organization_id}/courses/images/${Date.now()}.${fileExt}`
    const tryBuckets = ['course-thumbnails', 'elearning-media', 'course-media']
    for (const bucket of tryBuckets) {
      const { error } = await supabase.storage.from(bucket).upload(fileName, file, { cacheControl: '3600', upsert: false })
      if (!error) {
        const { data } = supabase.storage.from(bucket).getPublicUrl(fileName)
        return data.publicUrl
      }
    }
    throw new Error("Impossible d'uploader l'image")
  }, [user?.organization_id])

  const handleAddBlock = useCallback((type: string) => {
    const id = crypto.randomUUID()
    switch (type) {
      case 'text':
        setBlocks(prev => [...prev, { id, type: 'text', data: { emoji: '📝', heading: '', body: '' } }])
        break
      case 'image':
        setBlocks(prev => [...prev, { id, type: 'image', data: { url: '', caption: '' } }])
        break
      case 'media':
        setBlocks(prev => [...prev, { id, type: 'media', data: { url: '', caption: '' } }])
        break
      case 'interaction':
        setBlocks(prev => [...prev, { id, type: 'interaction', data: { emoji: '💡', text: '' } }])
        break
      case 'quiz':
        setBlocks(prev => [...prev, {
          id, type: 'quiz', data: {
            question: '',
            options: [
              { text: '', correct: false },
              { text: '', correct: false },
              { text: '', correct: true },
              { text: '', correct: false },
            ],
            explanation: '',
          },
        }])
        break
      case 'poll':
        setBlocks(prev => [...prev, {
          id, type: 'poll', data: {
            question: '',
            options: [{ text: '' }, { text: '' }],
          },
        }])
        break
    }
  }, [])

  // ── Mutations ───────────────────────────────────────────────────
  const updateCourseMutation = useMutation({
    mutationFn: () => {
      if (!course) throw new Error('Cours non chargé')
      return elearningService.updateCourse(course.id, {
        title,
        description,
        is_published: isPublished,
        scores_enabled: scoreVisible,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course-edit', slug] })
    },
  })

  const updateLessonMutation = useMutation({
    mutationFn: () => {
      if (!selectedLessonId) throw new Error('Aucune leçon sélectionnée')
      const selectedLesson = lessons.find(l => l.id === selectedLessonId)
      const isQuiz = selectedLesson?.lesson_type === 'quiz'
      return elearningService.updateLesson(selectedLessonId, {
        title: lessonTitle,
        content: isQuiz ? JSON.stringify(quizContent) : JSON.stringify(blocks),
      })
    },
    onSuccess: () => {
      setSavedBlocks(blocks)
      setSavedLessonTitle(lessonTitle)
      setSavedQuizContent(quizContent)
      queryClient.invalidateQueries({ queryKey: ['course-edit', slug] })
    },
  })

  const reorderLessonsMutation = useMutation({
    mutationFn: (updates: { id: string; order_index: number }[]) =>
      Promise.all(updates.map(u => elearningService.updateLesson(u.id, { order_index: u.order_index }))),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course-edit', slug] })
    },
  })

  const syncCourseDuration = async (updatedLessons: LessonItem[]) => {
    if (!course?.id) return
    const totalMinutes = updatedLessons.reduce((sum, l) => sum + (l.video_duration_minutes ?? 0), 0)
    const totalHours = totalMinutes > 0 ? Math.round((totalMinutes / 60) * 100) / 100 : 0
    await elearningService.updateCourse(course.id, { estimated_duration_hours: totalHours })
  }

  const updateDurationMutation = useMutation({
    mutationFn: ({ id, minutes }: { id: string; minutes: number | null }) =>
      elearningService.updateLesson(id, { video_duration_minutes: minutes }),
    onSuccess: async (_, { id, minutes }) => {
      const updatedLessons = lessons.map(l => l.id === id ? { ...l, video_duration_minutes: minutes } : l)
      await syncCourseDuration(updatedLessons)
      queryClient.invalidateQueries({ queryKey: ['course-edit', slug] })
    },
  })

  const updateSettingsMutation = useMutation({
    mutationFn: ({ id, settings }: { id: string; settings: LessonSettings }) =>
      elearningService.updateLesson(id, { resources: settings as any }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['course-edit', slug] }),
  })

  const deleteLessonMutation = useMutation({
    mutationFn: (id: string) => elearningService.deleteLesson(id),
    onSuccess: async (_, deletedId) => {
      if (selectedLessonId === deletedId) {
        setSelectedLessonId(null)
        setLoadedLessonId(null)
        setBlocks([])
        setSavedBlocks([])
        setLessonTitle('')
        setSavedLessonTitle('')
      }
      await syncCourseDuration(lessons.filter(l => l.id !== deletedId))
      queryClient.invalidateQueries({ queryKey: ['course-edit', slug] })
    },
  })

  const duplicateLessonMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!course) throw new Error('Cours non chargé')
      const source = lessons.find(l => l.id === id)
      if (!source) throw new Error('Leçon introuvable')
      const newTitle = `${source.title} (copie)`
      const uniqueSlug = `${slugify(newTitle)}-${Date.now()}`
      return elearningService.createLesson({
        course_id: course.id,
        title: newTitle,
        slug: uniqueSlug,
        lesson_type: source.lesson_type ?? 'mixed',
        order_index: lessons.length,
        content: source.content ?? JSON.stringify([]),
        video_duration_minutes: source.video_duration_minutes,
        resources: source.resources as any,
      })
    },
    onSuccess: async (newLesson) => {
      if (newLesson?.video_duration_minutes) {
        await syncCourseDuration([...lessons, newLesson as LessonItem])
      }
      queryClient.invalidateQueries({ queryKey: ['course-edit', slug] })
      if (newLesson?.id) setSelectedLessonId(newLesson.id)
    },
  })

  const createLessonMutation = useMutation({
    mutationFn: (label: string) => {
      if (!course) throw new Error('Cours non chargé')
      const newTitle = `Nouvelle leçon`
      const uniqueSlug = `${slugify(newTitle)}-${Date.now()}`
      const lessonType =
        label === 'E-learning' ? 'elearning'
        : label === 'Scorm' ? 'scorm'
        : 'mixed'
      const firstSectionId = (course as any).sections?.[0]?.id as string | undefined
      return elearningService.createLesson({
        course_id: course.id,
        title: newTitle,
        slug: uniqueSlug,
        lesson_type: lessonType,
        order_index: lessons.length,
        content: JSON.stringify([]),
        ...(firstSectionId ? { section_id: firstSectionId } : {}),
      })
    },
    onSuccess: (newLesson) => {
      queryClient.invalidateQueries({ queryKey: ['course-edit', slug] })
      if (newLesson?.id) {
        setSelectedLessonId(newLesson.id)
        setLoadedLessonId(null)
      }
    },
  })

  // ── Render ──────────────────────────────────────────────────────
  if (isLoading || !user) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-blue" />
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-gray-50">

      {/* Top nav */}
      <header className="flex items-center gap-3 px-4 h-12 bg-white border-b border-gray-200 flex-shrink-0 z-20">
        <Link
          href="/dashboard/elearning"
          className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="h-4 w-px bg-gray-200" />
        <nav className="flex items-center gap-1.5 text-sm text-gray-400">
          <Link href="/dashboard/elearning" className="hover:text-gray-700 transition-colors">
            E-Learning
          </Link>
          <span>/</span>
          <span className="font-medium text-gray-800 truncate max-w-xs">{title || slug}</span>
        </nav>
      </header>

      {/* Three-panel body */}
      <div className="flex-1 flex overflow-hidden">

        {/* Left — Settings (w-64) */}
        <aside className="w-64 flex-shrink-0 overflow-hidden">
          <SettingsPanel
            title={title}
            setTitle={setTitle}
            description={description}
            setDescription={setDescription}
            scoreVisible={scoreVisible}
            setScoreVisible={setScoreVisible}
            isPublished={isPublished}
            setIsPublished={setIsPublished}
            thumbnailUrl={course?.thumbnail_url ?? null}
            onSave={() => updateCourseMutation.mutate()}
            isSaving={updateCourseMutation.isPending}
          />
        </aside>

        {/* Center — Block editor or SCORM uploader (flex-1) */}
        <main className="flex-1 overflow-hidden">
          {(() => {
            const selectedLesson = lessons.find(l => l.id === selectedLessonId)
            const isScorm = selectedLesson?.lesson_type === 'scorm'
            const isQuiz = selectedLesson?.lesson_type === 'quiz'
            const organizationId = orgIdRef.current || course?.organization_id

            if (isQuiz && selectedLessonId) {
              return (
                <div className="h-full flex flex-col">
                  <div className="px-6 py-3 border-b border-gray-200 bg-white flex items-center gap-3">
                    <input
                      type="text"
                      value={lessonTitle}
                      onChange={e => setLessonTitle(e.target.value)}
                      onBlur={() => { if (lessonTitle !== savedLessonTitle) updateLessonMutation.mutate() }}
                      onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }}
                      className="flex-1 text-base font-semibold text-gray-900 border-0 focus:outline-none focus:ring-0 bg-transparent placeholder:text-gray-400"
                      placeholder="Titre du quiz"
                    />
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <QuizBuilder
                      key={selectedLessonId}
                      content={quizContent}
                      onChange={setQuizContent}
                      onSave={() => updateLessonMutation.mutate()}
                      isSaving={updateLessonMutation.isPending}
                      isDirty={isDirty}
                    />
                  </div>
                </div>
              )
            }

            if (isScorm && selectedLessonId && organizationId) {
              const existingPkg = scormPackageForLesson ?? selectedLesson?.scorm_packages?.[0] ?? null
              const titleDirty = lessonTitle !== savedLessonTitle
              return (
                <div className="h-full flex flex-col">
                  {/* Titre de la leçon SCORM */}
                  <div className="px-6 py-3 border-b border-gray-200 bg-white flex items-center gap-3">
                    <input
                      type="text"
                      value={lessonTitle}
                      onChange={e => setLessonTitle(e.target.value)}
                      onBlur={() => { if (titleDirty) updateLessonMutation.mutate() }}
                      onKeyDown={e => { if (e.key === 'Enter') { e.currentTarget.blur() } }}
                      className="flex-1 text-base font-semibold text-gray-900 border-0 focus:outline-none focus:ring-0 bg-transparent placeholder:text-gray-400"
                      placeholder="Titre de la leçon"
                    />
                    {titleDirty && (
                      <button
                        type="button"
                        onClick={() => updateLessonMutation.mutate()}
                        disabled={updateLessonMutation.isPending}
                        className="text-xs text-brand-blue hover:underline disabled:opacity-50 whitespace-nowrap"
                      >
                        {updateLessonMutation.isPending ? 'Sauvegarde…' : 'Sauvegarder'}
                      </button>
                    )}
                  </div>
                  <div className="flex-1 overflow-auto">
                    <ScormUploader
                      key={selectedLessonId}
                      lessonId={selectedLessonId}
                      organizationId={organizationId}
                      existingPackage={existingPkg ? {
                        id: existingPkg.id,
                        title: existingPkg.title ?? null,
                        scorm_version: existingPkg.scorm_version,
                        entry_point: existingPkg.entry_point,
                        file_count: 0,
                      } : null}
                      onSuccess={() => {
                        refetchScormPackage()
                        queryClient.invalidateQueries({ queryKey: ['course-edit', slug] })
                      }}
                    />
                  </div>
                </div>
              )
            }
            return (
              <BlockEditor
                lessonTitle={lessonTitle}
                setLessonTitle={setLessonTitle}
                blocks={blocks}
                onChangeBlock={handleChangeBlock}
                onAddBlock={handleAddBlock}
                onReorderBlocks={setBlocks}
                onSave={() => updateLessonMutation.mutate()}
                onCancel={() => {
                  setBlocks(savedBlocks)
                  setLessonTitle(savedLessonTitle)
                }}
                isSaving={updateLessonMutation.isPending}
                isDirty={isDirty}
                hasLesson={!!selectedLessonId}
                onImageUpload={handleImageUpload}
              />
            )
          })()}
        </main>

        {/* Right — Activity list (w-72) */}
        <aside className="w-72 flex-shrink-0">
          <ActivityList
            lessons={lessons}
            selectedId={selectedLessonId}
            onSelect={id => {
              if (id !== selectedLessonId) {
                setSelectedLessonId(id)
                setLoadedLessonId(null)
              }
            }}
            onCreateLesson={label => createLessonMutation.mutate(label)}
            isCreating={createLessonMutation.isPending}
            onReorder={updates => reorderLessonsMutation.mutate(updates)}
            onUpdateDuration={(id, minutes) => updateDurationMutation.mutate({ id, minutes })}
            onUpdateSettings={(id, settings) => updateSettingsMutation.mutate({ id, settings })}
            onDelete={id => deleteLessonMutation.mutate(id)}
            onDuplicate={id => duplicateLessonMutation.mutate(id)}
          />
        </aside>

      </div>
    </div>
  )
}
