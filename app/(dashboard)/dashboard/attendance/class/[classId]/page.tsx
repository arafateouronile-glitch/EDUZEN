'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { useQuery, useMutation } from '@tanstack/react-query'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { attendanceService } from '@/lib/services/attendance.service.client'
import { useAuth } from '@/lib/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Save, CheckCircle, XCircle, Clock, AlertCircle, Pen, Trash2, Upload } from 'lucide-react'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'
import type { AttendanceWithRelations } from '@/lib/types/query-types'
import type { TableRow } from '@/lib/types/supabase-helpers'

type Student = TableRow<'students'>

type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused'

interface AttendanceRecord {
  status: AttendanceStatus
  lateMinutes?: number | null
  notes?: string | null
}

// ── Upload signature vers Supabase Storage ────────────────────────────────────

async function uploadSignature(
  supabase: ReturnType<typeof createClient>,
  classId: string,
  date: string,
  teacherId: string,
  dataUrl: string
): Promise<string | null> {
  try {
    // Convertir dataURL en Blob
    const res = await fetch(dataUrl)
    const blob = await res.blob()
    const file = new File([blob], 'signature.png', { type: 'image/png' })

    const path = `class/${classId}/${date}/${teacherId}.png`
    const { error } = await supabase.storage
      .from('attendance-signatures')
      .upload(path, file, { upsert: true, contentType: 'image/png' })

    if (error) {
      // Bucket manquant ou autre erreur non bloquante
      console.warn('[signature] upload échoué:', error.message)
      return null
    }

    const { data: { publicUrl } } = supabase.storage
      .from('attendance-signatures')
      .getPublicUrl(path)

    return publicUrl
  } catch {
    return null
  }
}

// ── Composant canvas signature ────────────────────────────────────────────────

function SignatureCanvas({
  onClear,
  existingUrl,
  canvasRef,
}: {
  onClear: () => void
  existingUrl: string | null | undefined
  canvasRef: React.RefObject<HTMLCanvasElement | null>
}) {
  const isDrawingRef = useRef(false)

  // Initialiser le style du canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.strokeStyle = '#1a1a1a'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }, [canvasRef])

  const getPos = (e: MouseEvent | Touch, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    }
  }

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    isDrawingRef.current = true
    const { x, y } = getPos(e.nativeEvent, canvas)
    ctx.beginPath()
    ctx.moveTo(x, y)
  }, [canvasRef])

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const { x, y } = getPos(e.nativeEvent, canvas)
    ctx.lineTo(x, y)
    ctx.stroke()
  }, [canvasRef])

  const stopDrawing = useCallback(() => {
    isDrawingRef.current = false
  }, [])

  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    isDrawingRef.current = true
    const touch = e.touches[0]
    const { x, y } = getPos(touch, canvas)
    ctx.beginPath()
    ctx.moveTo(x, y)
  }, [canvasRef])

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    if (!isDrawingRef.current) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const touch = e.touches[0]
    const { x, y } = getPos(touch, canvas)
    ctx.lineTo(x, y)
    ctx.stroke()
  }, [canvasRef])

  return (
    <div className="space-y-3">
      {existingUrl && (
        <div className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
          <CheckCircle className="h-4 w-4 shrink-0" />
          <span>Signature enregistrée pour cette séance</span>
          <Image src={existingUrl} alt="Signature existante" width={80} height={30} className="ml-auto h-8 w-auto object-contain rounded" />
        </div>
      )}
      <div className="border-2 border-dashed border-slate-200 rounded-xl p-1 bg-white">
        <canvas
          ref={canvasRef}
          width={800}
          height={160}
          className="w-full rounded-lg cursor-crosshair touch-none bg-white"
          style={{ height: '120px' }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={stopDrawing}
        />
      </div>
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500 flex items-center gap-1.5">
          <Pen className="h-3.5 w-3.5" />
          Signez dans la zone ci-dessus (souris ou stylet)
        </p>
        <Button variant="outline" size="sm" onClick={onClear} className="gap-1.5">
          <Trash2 className="h-3.5 w-3.5" />
          Effacer
        </Button>
      </div>
    </div>
  )
}

// ── Page principale ───────────────────────────────────────────────────────────

export default function ClassAttendancePage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const classId = params.classId as string
  const date = searchParams.get('date') || new Date().toISOString().split('T')[0]
  const { user } = useAuth()
  const supabase = createClient()
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // ── Données ──────────────────────────────────────────────────────────────────

  const { data: classData } = useQuery<TableRow<'classes'> | null>({
    queryKey: ['class', classId],
    queryFn: async () => {
      const { data, error } = await supabase.from('classes').select('*').eq('id', classId).single()
      if (error) throw error
      return data
    },
  })

  const { data: students } = useQuery({
    queryKey: ['class-students', classId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('id, first_name, last_name, photo_url, student_number')
        .eq('class_id', classId)
        .eq('status', 'active')
        .order('last_name')
      if (error) throw error
      return data || []
    },
  })

  const { data: existingAttendance, refetch: refetchAttendance } = useQuery({
    queryKey: ['attendance', classId, date],
    queryFn: () => attendanceService.getByClassAndDate(classId, date),
  })

  // Signature existante — teacher_signature_url est dans TableRow<'attendance'>
  const existingSignatureUrl =
    (existingAttendance as AttendanceWithRelations[] | undefined)
      ?.find(a => a.teacher_signature_url)
      ?.teacher_signature_url ?? null

  // ── État présences ────────────────────────────────────────────────────────

  const [attendance, setAttendance] = useState<Record<string, AttendanceRecord>>({})

  useEffect(() => {
    if (!students) return
    const initial: Record<string, AttendanceRecord> = {}

    if (existingAttendance) {
      ;(existingAttendance as AttendanceWithRelations[]).forEach((att) => {
        if (att.student_id) {
          initial[att.student_id] = {
            status: att.status as AttendanceStatus,
            lateMinutes: att.late_minutes,
            notes: att.notes || '',
          }
        }
      })
    }

    ;(students as Student[]).forEach((student) => {
      if (!initial[student.id]) {
        initial[student.id] = { status: 'present', lateMinutes: 0, notes: '' }
      }
    })

    setAttendance(initial)
  }, [existingAttendance, students])

  const updateAttendance = (studentId: string, field: keyof AttendanceRecord, value: string | number) => {
    setAttendance(prev => ({ ...prev, [studentId]: { ...prev[studentId], [field]: value } }))
  }

  // ── Sauvegarde ───────────────────────────────────────────────────────────

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user?.organization_id || !students) throw new Error('Données manquantes')

      const records = (students as Student[]).map((student) => ({
        student_id: student.id,
        class_id: classId,
        date,
        status: attendance[student.id]?.status || 'present',
        late_minutes: attendance[student.id]?.lateMinutes || 0,
        teacher_id: user.id,
        notes: attendance[student.id]?.notes || undefined,
      }))

      // Sauvegarder les présences
      const saved = await attendanceService.markMultiple(user.organization_id, records)

      // Upload signature si le canvas a du contenu
      const canvas = canvasRef.current
      let signatureUrl: string | null = null

      if (canvas) {
        // Vérifier si le canvas n'est pas vide (comparer avec un canvas blanc)
        const blank = document.createElement('canvas')
        blank.width = canvas.width
        blank.height = canvas.height
        const isBlank = canvas.toDataURL() === blank.toDataURL()

        if (!isBlank) {
          signatureUrl = await uploadSignature(supabase, classId, date, user.id, canvas.toDataURL('image/png'))
        }
      }

      // Mettre à jour la signature sur tous les records du jour pour cette classe
      if (signatureUrl && saved?.length) {
        const ids = (saved as Array<{ id: string }>).map(r => r.id)
        await supabase
          .from('attendance')
          .update({ teacher_signature_url: signatureUrl })
          .in('id', ids)
      }

      return { count: saved?.length ?? 0, signatureUrl }
    },
    onSuccess: () => {
      refetchAttendance()
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    },
  })

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height)
  }, [])

  // ── Helpers UI ───────────────────────────────────────────────────────────

  const statusConfig: Record<AttendanceStatus, { icon: React.ReactNode; label: string; activeClass: string }> = {
    present: { icon: <CheckCircle className="h-4 w-4" />, label: 'Présent', activeClass: 'bg-emerald-500 text-white' },
    absent:  { icon: <XCircle className="h-4 w-4" />, label: 'Absent', activeClass: 'bg-red-500 text-white' },
    late:    { icon: <Clock className="h-4 w-4" />, label: 'Retard', activeClass: 'bg-amber-500 text-white' },
    excused: { icon: <AlertCircle className="h-4 w-4" />, label: 'Justifié', activeClass: 'bg-blue-500 text-white' },
  }

  const stats = students ? {
    total:   (students as Student[]).length,
    present: Object.values(attendance).filter(a => a.status === 'present').length,
    absent:  Object.values(attendance).filter(a => a.status === 'absent').length,
    late:    Object.values(attendance).filter(a => a.status === 'late').length,
    excused: Object.values(attendance).filter(a => a.status === 'excused').length,
  } : null

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/attendance">
            <Button variant="ghost" size="icon" className="rounded-xl">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Émargement — {classData?.name}
            </h1>
            <p className="text-sm text-slate-500">{formatDate(date)}</p>
          </div>
        </div>
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="gap-2"
        >
          {saveMutation.isPending ? (
            <Upload className="h-4 w-4 animate-pulse" />
          ) : saveSuccess ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {saveMutation.isPending ? 'Enregistrement…' : saveSuccess ? 'Enregistré !' : 'Enregistrer'}
        </Button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-5 gap-3">
          {[
            { label: 'Total', value: stats.total, color: 'text-slate-700' },
            { label: 'Présents', value: stats.present, color: 'text-emerald-600' },
            { label: 'Absents', value: stats.absent, color: 'text-red-600' },
            { label: 'Retards', value: stats.late, color: 'text-amber-600' },
            { label: 'Justifiés', value: stats.excused, color: 'text-blue-600' },
          ].map(({ label, value, color }) => (
            <Card key={label}>
              <CardContent className="pt-4 pb-3 text-center">
                <div className={`text-2xl font-bold ${color}`}>{value}</div>
                <div className="text-xs text-slate-500 mt-0.5">{label}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Liste des élèves */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Apprenants</CardTitle>
        </CardHeader>
        <CardContent>
          {!students || (students as Student[]).length === 0 ? (
            <p className="text-center py-10 text-slate-400 text-sm">Aucun apprenant dans cette classe</p>
          ) : (
            <div className="space-y-2">
              {(students as Student[]).map((student) => {
                const att = attendance[student.id] ?? { status: 'present' as AttendanceStatus, lateMinutes: 0, notes: '' }
                return (
                  <div
                    key={student.id}
                    className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:bg-slate-50/60 transition-colors"
                  >
                    {/* Avatar */}
                    {student.photo_url ? (
                      <Image
                        src={student.photo_url}
                        alt={`${student.first_name} ${student.last_name}`}
                        width={40}
                        height={40}
                        className="h-10 w-10 rounded-full object-cover shrink-0"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-brand-blue text-white flex items-center justify-center text-sm font-semibold shrink-0">
                        {student.first_name.charAt(0)}{student.last_name.charAt(0)}
                      </div>
                    )}

                    {/* Nom */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm leading-snug">
                        {student.last_name} {student.first_name}
                      </p>
                      <p className="text-xs text-slate-400">{student.student_number}</p>
                    </div>

                    {/* Boutons statut */}
                    <div className="flex gap-1.5">
                      {(Object.entries(statusConfig) as Array<[AttendanceStatus, typeof statusConfig[AttendanceStatus]]>).map(([status, cfg]) => (
                        <button
                          key={status}
                          type="button"
                          title={cfg.label}
                          onClick={() => updateAttendance(student.id, 'status', status)}
                          className={`h-8 w-8 rounded-lg flex items-center justify-center transition-colors
                            ${att.status === status ? cfg.activeClass : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                        >
                          {cfg.icon}
                        </button>
                      ))}
                    </div>

                    {/* Minutes retard */}
                    {att.status === 'late' && (
                      <input
                        type="number"
                        min="0"
                        value={att.lateMinutes ?? 0}
                        onChange={e => updateAttendance(student.id, 'lateMinutes', parseInt(e.target.value) || 0)}
                        className="w-16 px-2 py-1 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500/30 focus:outline-none"
                        placeholder="min"
                      />
                    )}

                    {/* Notes */}
                    <input
                      type="text"
                      value={att.notes ?? ''}
                      onChange={e => updateAttendance(student.id, 'notes', e.target.value)}
                      className="w-28 px-2 py-1 text-xs border rounded-lg focus:ring-2 focus:ring-blue-500/30 focus:outline-none text-slate-600 placeholder:text-slate-300"
                      placeholder="Note…"
                    />
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Signature */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Pen className="h-4 w-4 text-slate-500" />
            Signature de l&apos;enseignant
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SignatureCanvas
            canvasRef={canvasRef}
            existingUrl={existingSignatureUrl}
            onClear={clearCanvas}
          />
        </CardContent>
      </Card>

      {/* Erreur */}
      {saveMutation.isError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
          {saveMutation.error instanceof Error
            ? saveMutation.error.message
            : 'Une erreur est survenue lors de l\'enregistrement'}
        </div>
      )}
    </div>
  )
}
