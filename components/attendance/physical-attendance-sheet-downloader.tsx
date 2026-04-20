'use client'

import { useState, useCallback } from 'react'
import { logger } from '@/lib/utils/logger'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
  FileDown,
  Loader2,
  Calendar,
  Clock,
  MapPin,
  Users,
  Printer,
  CheckCircle,
  Download,
} from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { generatePDFBlobFromHTML } from '@/lib/utils/pdf-generator'
import { escapeHtml } from '@/lib/utils/sanitize-html'
import { cn, formatDate } from '@/lib/utils'
import type { TableRow } from '@/lib/types/supabase-helpers'

type SessionSlot = TableRow<'session_slots'>

interface Student {
  id: string
  first_name: string | null
  last_name: string | null
  student_number: string | null
  email: string | null
}

interface PhysicalAttendanceSheetDownloaderProps {
  sessionId: string
  sessionName: string
  sessionSlots: SessionSlot[]
  students: Student[]
  organizationName: string
  organizationAddress?: string
  formationName?: string
}

const DEEP_BLUE = '#274472'
const ELECTRIC_CYAN = '#34B9EE'

export function PhysicalAttendanceSheetDownloader({
  sessionId,
  sessionName,
  sessionSlots,
  students,
  organizationName,
  organizationAddress,
  formationName,
}: PhysicalAttendanceSheetDownloaderProps) {
  const [selectedSlots, setSelectedSlots] = useState<Set<string>>(new Set())
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatingSlotId, setGeneratingSlotId] = useState<string | null>(null)

  const sortedSlots = [...sessionSlots].sort((a, b) => {
    const dateCompare = new Date(a.date).getTime() - new Date(b.date).getTime()
    if (dateCompare !== 0) return dateCompare
    return (a.start_time || '').localeCompare(b.start_time || '')
  })

  const toggleSlot = (slotId: string) => {
    setSelectedSlots((prev) => {
      const next = new Set(prev)
      if (next.has(slotId)) {
        next.delete(slotId)
      } else {
        next.add(slotId)
      }
      return next
    })
  }

  const toggleAll = () => {
    if (selectedSlots.size === sortedSlots.length) {
      setSelectedSlots(new Set())
    } else {
      setSelectedSlots(new Set(sortedSlots.map((s) => s.id)))
    }
  }

  const getTimeSlotLabel = (slot: SessionSlot) => {
    if (slot.time_slot === 'morning') return 'Matin'
    if (slot.time_slot === 'afternoon') return 'Après-midi'
    return 'Journée complète'
  }

  const generateSheetHTML = (slot: SessionSlot) => {
    const formattedDate = format(new Date(slot.date), 'EEEE d MMMM yyyy', { locale: fr })
    const timeLabel = getTimeSlotLabel(slot)
    const timeRange = slot.start_time && slot.end_time ? `${slot.start_time} - ${slot.end_time}` : ''

    const studentRows = students
      .map((s, i) => {
        const hasStudentNumber = students.some((st) => st.student_number)
        return `
          <tr style="border-bottom: 1px solid #e5e7eb; ${i % 2 === 0 ? 'background: white;' : 'background: #f9fafb;'}">
            <td style="padding: 14px 12px; text-align: center; font-weight: 500; color: #374151;">${i + 1}</td>
            <td style="padding: 14px 12px; font-weight: 600; color: #111827;">${escapeHtml(s.last_name)}</td>
            <td style="padding: 14px 12px; color: #374151;">${escapeHtml(s.first_name)}</td>
            ${hasStudentNumber ? `<td style="padding: 14px 12px; color: #6b7280; font-size: 0.9em;">${escapeHtml(s.student_number) || '—'}</td>` : ''}
            <td style="padding: 14px 12px; width: 180px;">
              <div style="height: 40px; border: 1px dashed #d1d5db; border-radius: 6px; background: #fafafa;"></div>
            </td>
          </tr>
        `
      })
      .join('')

    const hasStudentNumber = students.some((s) => s.student_number)

    return `
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8">
        <style>
          @page {
            size: A4;
            margin: 15mm;
          }
          body {
            font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif;
            font-size: 11pt;
            color: #333;
            line-height: 1.4;
            margin: 0;
            padding: 0;
          }
          table {
            border-collapse: collapse;
            width: 100%;
          }
        </style>
      </head>
      <body>
        <!-- Header -->
        <div style="border-bottom: 3px solid ${ELECTRIC_CYAN}; padding-bottom: 20px; margin-bottom: 20px;">
          <h1 style="margin: 0 0 4px 0; font-size: 18pt; font-weight: 700; color: ${DEEP_BLUE}; text-transform: uppercase; letter-spacing: 0.5px;">
            Feuille d'émargement
          </h1>
          <p style="margin: 0; font-size: 11pt; color: #4b5563; font-weight: 500;">${escapeHtml(organizationName)}</p>
          ${organizationAddress ? `<p style="margin: 2px 0 0 0; font-size: 9pt; color: #6b7280;">${escapeHtml(organizationAddress)}</p>` : ''}
        </div>

        <!-- Session Info -->
        <div style="background: linear-gradient(135deg, ${DEEP_BLUE} 0%, #41729F 100%); color: white; padding: 16px 20px; border-radius: 8px; margin-bottom: 20px;">
          <div style="display: flex; flex-wrap: wrap; gap: 20px;">
            <div style="flex: 1; min-width: 200px;">
              <p style="margin: 0 0 2px 0; font-size: 8pt; text-transform: uppercase; letter-spacing: 1px; opacity: 0.8;">Formation</p>
              <p style="margin: 0; font-size: 13pt; font-weight: 600;">${escapeHtml(formationName || sessionName)}</p>
            </div>
          </div>
        </div>

        <!-- Slot Info -->
        <div style="background: #f8fafc; padding: 14px 16px; border-radius: 8px; margin-bottom: 24px; border: 1px solid #e2e8f0;">
          <div style="display: flex; flex-wrap: wrap; gap: 24px; align-items: center;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="color: ${DEEP_BLUE}; font-size: 14pt;">📅</span>
              <div>
                <p style="margin: 0; font-size: 8pt; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Date</p>
                <p style="margin: 0; font-weight: 600; color: #1e293b; text-transform: capitalize;">${formattedDate}</p>
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="color: ${DEEP_BLUE}; font-size: 14pt;">🕐</span>
              <div>
                <p style="margin: 0; font-size: 8pt; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Horaires</p>
                <p style="margin: 0; font-weight: 600; color: #1e293b;">${timeLabel}${timeRange ? ` (${timeRange})` : ''}</p>
              </div>
            </div>
            ${slot.location ? `
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="color: ${DEEP_BLUE}; font-size: 14pt;">📍</span>
                <div>
                  <p style="margin: 0; font-size: 8pt; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Lieu</p>
                  <p style="margin: 0; font-weight: 600; color: #1e293b;">${escapeHtml(slot.location)}</p>
                </div>
              </div>
            ` : ''}
          </div>
        </div>

        <!-- Students Table -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
          <thead>
            <tr style="background: ${DEEP_BLUE}; color: white;">
              <th style="padding: 12px; text-align: center; font-weight: 600; font-size: 9pt; width: 50px;">N°</th>
              <th style="padding: 12px; text-align: left; font-weight: 600; font-size: 9pt;">NOM</th>
              <th style="padding: 12px; text-align: left; font-weight: 600; font-size: 9pt;">PRÉNOM</th>
              ${hasStudentNumber ? '<th style="padding: 12px; text-align: left; font-weight: 600; font-size: 9pt;">N° STAGIAIRE</th>' : ''}
              <th style="padding: 12px; text-align: center; font-weight: 600; font-size: 9pt; width: 180px;">SIGNATURE</th>
            </tr>
          </thead>
          <tbody>
            ${studentRows}
            ${students.length === 0 ? `
              <tr>
                <td colspan="${hasStudentNumber ? 5 : 4}" style="padding: 40px; text-align: center; color: #9ca3af;">
                  Aucun apprenant inscrit
                </td>
              </tr>
            ` : ''}
          </tbody>
        </table>

        <!-- Footer Section -->
        <div style="display: flex; gap: 20px; margin-top: 30px;">
          <div style="flex: 1;">
            <p style="margin: 0 0 8px 0; font-size: 9pt; color: #6b7280;">Signature du formateur :</p>
            <div style="height: 60px; border: 1px dashed #d1d5db; border-radius: 6px; background: #fafafa;"></div>
          </div>
          <div style="flex: 1;">
            <p style="margin: 0 0 8px 0; font-size: 9pt; color: #6b7280;">Observations :</p>
            <div style="height: 60px; border: 1px dashed #d1d5db; border-radius: 6px; background: #fafafa;"></div>
          </div>
        </div>

        <!-- Legal Footer -->
        <div style="margin-top: 30px; padding-top: 16px; border-top: 2px solid ${DEEP_BLUE}; background: rgba(39,68,114,0.04);">
          <p style="margin: 0 0 6px 0; font-size: 8pt; font-weight: 600; color: ${DEEP_BLUE}; text-transform: uppercase; letter-spacing: 0.5px;">
            Mentions légales
          </p>
          <p style="margin: 0; font-size: 8pt; color: #6b7280; line-height: 1.5;">
            La signature de cette feuille atteste de la présence effective du stagiaire à la formation.
            Document conforme aux exigences Qualiopi et OPCO.
          </p>
          <p style="margin: 8px 0 0 0; font-size: 8pt; color: #9ca3af;">
            Généré le ${format(new Date(), "d MMMM yyyy 'à' HH:mm", { locale: fr })} — EDUZEN
          </p>
        </div>
      </body>
      </html>
    `
  }

  const downloadSingleSheet = async (slot: SessionSlot) => {
    setGeneratingSlotId(slot.id)
    try {
      const html = generateSheetHTML(slot)
      const filename = `Emargement_${sessionName.replace(/[^a-zA-Z0-9]/g, '_')}_${format(new Date(slot.date), 'yyyy-MM-dd')}_${slot.time_slot}.pdf`

      // Créer un élément temporaire pour le rendu
      const containerId = `attendance-sheet-${slot.id}-${Date.now()}`
      const container = document.createElement('div')
      container.id = containerId
      // Utiliser DOMParser pour éviter l'exécution de scripts injectés (XSS)
      const parsed = new DOMParser().parseFromString(html, 'text/html')
      container.appendChild(parsed.documentElement)
      container.style.position = 'absolute'
      container.style.left = '-9999px'
      container.style.top = '0'
      container.style.width = '210mm'
      container.style.minHeight = '297mm'
      container.style.backgroundColor = 'white'
      document.body.appendChild(container)

      // Attendre que le DOM soit mis à jour
      await new Promise((resolve) => setTimeout(resolve, 100))

      try {
        const blob = await generatePDFBlobFromHTML(containerId)
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        a.click()
        URL.revokeObjectURL(url)
      } finally {
        document.body.removeChild(container)
      }
    } catch (error) {
      logger.error('Erreur lors de la génération du PDF', error instanceof Error ? error : new Error(String(error)))
    } finally {
      setGeneratingSlotId(null)
    }
  }

  const downloadSelectedSheets = async () => {
    if (selectedSlots.size === 0) return

    setIsGenerating(true)
    try {
      const slotsToDownload = sortedSlots.filter((s) => selectedSlots.has(s.id))

      // Pour chaque séance, générer et télécharger un PDF
      for (const slot of slotsToDownload) {
        await downloadSingleSheet(slot)
        // Petit délai entre les téléchargements pour éviter les problèmes
        await new Promise((resolve) => setTimeout(resolve, 500))
      }
    } finally {
      setIsGenerating(false)
    }
  }

  const downloadAllSheets = async () => {
    setIsGenerating(true)
    try {
      for (const slot of sortedSlots) {
        await downloadSingleSheet(slot)
        await new Promise((resolve) => setTimeout(resolve, 500))
      }
    } finally {
      setIsGenerating(false)
    }
  }

  if (sortedSlots.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center p-8 text-center">
          <Calendar className="h-12 w-12 text-gray-300 mb-4" />
          <p className="text-gray-600 font-medium">Aucune séance configurée</p>
          <p className="text-sm text-gray-400 mt-1">
            Configurez les séances dans l'onglet "Dates & Prix" pour pouvoir télécharger les feuilles d'émargement.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Description */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-amber-50 rounded-xl">
              <Printer className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-1">Feuilles d'émargement physiques</h3>
              <p className="text-sm text-gray-600">
                Téléchargez les feuilles d'émargement au format PDF pour les faire signer physiquement par les apprenants.
                Chaque feuille inclut la liste des apprenants inscrits avec une case signature.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions globales */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Checkbox
            id="select-all"
            checked={selectedSlots.size === sortedSlots.length}
            onCheckedChange={toggleAll}
          />
          <Label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
            {selectedSlots.size === sortedSlots.length ? 'Tout désélectionner' : 'Tout sélectionner'}
          </Label>
          {selectedSlots.size > 0 && (
            <Badge variant="secondary" className="ml-2">
              {selectedSlots.size} séance{selectedSlots.size > 1 ? 's' : ''} sélectionnée{selectedSlots.size > 1 ? 's' : ''}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {selectedSlots.size > 0 && (
            <Button
              onClick={downloadSelectedSheets}
              disabled={isGenerating}
              className="gap-2"
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Télécharger la sélection
            </Button>
          )}
          <Button
            variant="outline"
            onClick={downloadAllSheets}
            disabled={isGenerating}
            className="gap-2"
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileDown className="h-4 w-4" />
            )}
            Tout télécharger
          </Button>
        </div>
      </div>

      {/* Liste des séances */}
      <div className="space-y-3">
        {sortedSlots.map((slot) => {
          const formattedDate = format(new Date(slot.date), 'EEEE d MMMM yyyy', { locale: fr })
          const isSelected = selectedSlots.has(slot.id)
          const isCurrentlyGenerating = generatingSlotId === slot.id

          return (
            <Card
              key={slot.id}
              className={cn(
                'transition-all duration-200',
                isSelected && 'ring-2 ring-brand-blue ring-offset-2'
              )}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleSlot(slot.id)}
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-brand-blue" />
                        <span className="font-medium capitalize">{formattedDate}</span>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn(
                          slot.time_slot === 'morning' && 'bg-blue-50 text-blue-700 border-blue-200',
                          slot.time_slot === 'afternoon' && 'bg-orange-50 text-orange-700 border-orange-200',
                          slot.time_slot === 'full_day' && 'bg-brand-blue-ghost text-brand-blue border-brand-blue/20'
                        )}
                      >
                        {getTimeSlotLabel(slot)}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      {slot.start_time && slot.end_time && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {slot.start_time} - {slot.end_time}
                        </span>
                      )}
                      {slot.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {slot.location}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        {students.length} apprenant{students.length > 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadSingleSheet(slot)}
                    disabled={isCurrentlyGenerating || isGenerating}
                    className="gap-2"
                  >
                    {isCurrentlyGenerating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <FileDown className="h-4 w-4" />
                    )}
                    PDF
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Info */}
      <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg border border-blue-100">
        <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
        <div className="text-sm text-blue-700">
          <p className="font-medium mb-1">Conformité Qualiopi</p>
          <p className="text-blue-600">
            Les feuilles d'émargement générées sont conformes aux exigences Qualiopi et OPCO.
            Elles incluent tous les champs requis : date, horaires, liste nominative et signature.
          </p>
        </div>
      </div>
    </div>
  )
}
