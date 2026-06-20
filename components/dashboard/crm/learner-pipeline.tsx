'use client'

import { useEffect, useState } from 'react'
import type {
  DragEndEvent,
  DragStartEvent} from '@dnd-kit/core';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
} from '@dnd-kit/core'
import { useDraggable } from '@dnd-kit/core'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { AlertTriangle, User, Building2 } from 'lucide-react'
import type { CrmStatus, LearnerCard, LearnerPipelineData } from '@/lib/actions/learner-crm-actions'

// ─── Configuration des colonnes ───────────────────────────────────────────────

const COLUMNS: { id: CrmStatus; label: string; color: string; bg: string; border: string }[] = [
  { id: 'prospect',  label: 'Prospects',    color: 'text-gray-600',          bg: 'bg-gray-50',           border: 'border-gray-200' },
  { id: 'inscrit',   label: 'Inscrits',     color: 'text-brand-blue',        bg: 'bg-brand-blue-ghost',  border: 'border-brand-blue-pale' },
  { id: 'en_cours',  label: 'En Formation', color: 'text-brand-cyan-dark',   bg: 'bg-brand-cyan-ghost',  border: 'border-brand-cyan-pale' },
  { id: 'termine',   label: 'Terminés',     color: 'text-brand-blue-dark',   bg: 'bg-brand-blue-pale',   border: 'border-brand-blue-pale' },
  { id: 'abandon',   label: 'Abandons',     color: 'text-red-600',           bg: 'bg-red-50',            border: 'border-red-200' },
]

// ─── Carte apprenant draggable ────────────────────────────────────────────────

function LearnerCardItem({ learner, isDragging = false }: { learner: LearnerCard; isDragging?: boolean }) {
  const initials = `${learner.first_name[0] ?? ''}${learner.last_name[0] ?? ''}`.toUpperCase()

  return (
    <div
      className={`rounded-lg border bg-white p-3 shadow-sm transition-shadow ${
        isDragging ? 'opacity-50 shadow-md' : 'hover:shadow-md'
      }`}
    >
      <div className="flex items-start gap-2.5">
        <Avatar className="h-8 w-8 shrink-0">
          {learner.photo_url && <AvatarImage src={learner.photo_url} />}
          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <Link
            href={`/dashboard/crm/${learner.id}`}
            className="block truncate text-sm font-semibold text-gray-800 hover:text-brand-blue"
            onClick={e => e.stopPropagation()}
          >
            {learner.first_name} {learner.last_name}
          </Link>
          {learner.session_name && (
            <p className="truncate text-xs text-slate-400">{learner.session_name}</p>
          )}
          {learner.formation_name && (
            <p className="mt-0.5 truncate text-xs text-slate-500">{learner.formation_name}</p>
          )}
          {learner.company_name && (
            <div className="mt-0.5 flex items-center gap-1">
              <Building2 className="h-3 w-3 shrink-0 text-slate-300" />
              <p className="truncate text-xs text-slate-400">{learner.company_name}</p>
            </div>
          )}
        </div>
      </div>

      {/* Badge d'alerte Qualiopi */}
      {learner.missing_qualiopi.length > 0 && (
        <div className="mt-2 flex items-center gap-1.5 rounded-md bg-red-50 px-2 py-1">
          <AlertTriangle className="h-3 w-3 shrink-0 text-red-500" />
          <p className="truncate text-xs text-red-600">
            {learner.missing_qualiopi.join(', ')} manquant{learner.missing_qualiopi.length > 1 ? 's' : ''}
          </p>
        </div>
      )}
    </div>
  )
}

// ─── Carte draggable (avec hook useDraggable) ─────────────────────────────────

function DraggableLearnerCard({ learner }: { learner: LearnerCard }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id:   learner.id,
    data: { learner },
  })

  return (
    <div ref={setNodeRef} {...listeners} {...attributes} className="cursor-grab active:cursor-grabbing">
      <LearnerCardItem learner={learner} isDragging={isDragging} />
    </div>
  )
}

// ─── Colonne droppable ────────────────────────────────────────────────────────

function KanbanColumn({
  col,
  learners,
}: {
  col: (typeof COLUMNS)[0]
  learners: LearnerCard[]
}) {
  const { setNodeRef, isOver } = useDroppable({ id: col.id })

  return (
    <div className="flex min-w-[220px] flex-1 flex-col">
      {/* Header colonne */}
      <div className={`mb-2 flex items-center justify-between rounded-t-lg border px-3 py-2 ${col.bg} ${col.border}`}>
        <span className={`text-sm font-semibold ${col.color}`}>{col.label}</span>
        <Badge variant="secondary" className="text-xs">
          {learners.length}
        </Badge>
      </div>

      {/* Zone droppable */}
      <div
        ref={setNodeRef}
        className={`flex-1 rounded-b-lg border border-t-0 p-2 transition-colors ${col.border} ${
          isOver ? `${col.bg} border-dashed` : 'bg-slate-50/50'
        } min-h-[200px] space-y-2`}
      >
        {learners.length === 0 ? (
          <div className="flex h-20 items-center justify-center">
            <div className="flex flex-col items-center gap-1 text-center">
              <User className="h-4 w-4 text-slate-300" />
              <p className="text-xs text-slate-300">Aucun apprenant</p>
            </div>
          </div>
        ) : (
          learners.map(learner => (
            <DraggableLearnerCard key={learner.id} learner={learner} />
          ))
        )}
      </div>
    </div>
  )
}

// ─── Pipeline principal ───────────────────────────────────────────────────────

interface LearnerPipelineProps {
  initialData: LearnerPipelineData
}

export function LearnerPipeline({ initialData }: LearnerPipelineProps) {
  const [data, setData]           = useState<LearnerPipelineData>(initialData)
  const [activeLearner, setActiveLearner] = useState<LearnerCard | null>(null)

  // Sync quand les filtres du parent changent
  useEffect(() => { setData(initialData) }, [initialData])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  function handleDragStart(event: DragStartEvent) {
    const learner = event.active.data.current?.learner as LearnerCard
    setActiveLearner(learner)
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveLearner(null)

    const { active, over } = event
    if (!over) return

    const learnerId   = String(active.id)
    const newStatus   = over.id as CrmStatus
    const fromStatus  = (Object.keys(data) as CrmStatus[]).find(col =>
      data[col].some(l => l.id === learnerId)
    )

    if (!fromStatus || fromStatus === newStatus) return

    // Mise à jour locale optimiste
    const learner = data[fromStatus].find(l => l.id === learnerId)!
    setData(prev => ({
      ...prev,
      [fromStatus]: prev[fromStatus].filter(l => l.id !== learnerId),
      [newStatus]:  [{ ...learner, crm_status: newStatus }, ...prev[newStatus]],
    }))

    // TODO: Appeler une server action pour persister le changement de statut
    // (ex: créer une inscription ou mettre à jour enrollment.status)
  }

  const total = Object.values(data).reduce((sum, col) => sum + col.length, 0)

  return (
    <div className="space-y-4">
      {/* Résumé */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{total} apprenants au total</p>
        <p className="text-xs text-muted-foreground">Glissez-déposez pour changer le statut</p>
      </div>

      {/* Kanban */}
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex gap-3 overflow-x-auto pb-4">
          {COLUMNS.map(col => (
            <KanbanColumn key={col.id} col={col} learners={data[col.id]} />
          ))}
        </div>

        {/* Overlay pendant le drag */}
        <DragOverlay>
          {activeLearner && (
            <div className="w-[220px] rotate-2 opacity-90">
              <LearnerCardItem learner={activeLearner} />
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  )
}
