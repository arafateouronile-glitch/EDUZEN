'use client'

import { useState, useCallback, useEffect } from 'react'
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
  PenLine,
  Send,
  Link2,
  Copy,
  QrCode,
} from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { QRCodeModal } from '@/components/ui/QRCodeModal'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { DigitalAttendanceSheet, type AttendancePerson } from './digital-attendance-sheet'
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

interface ElectronicRequest {
  id: string
  student_id: string | null
  student_name: string
  student_email: string
  status: string
  signed_at: string | null
  signature_data: string | null
  location_verified: boolean | null
}

interface ElectronicSession {
  id: string
  date: string
  start_time: string | null
  time_slot?: string | null
  status?: string | null
  public_emargement_token: string | null
  public_emargement_active: boolean | null
  requests: ElectronicRequest[]
}

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
  const [generatingDigitalSlotId, setGeneratingDigitalSlotId] = useState<string | null>(null)
  const [electronicSessions, setElectronicSessions] = useState<ElectronicSession[]>([])
  const [sendingSlotId, setSendingSlotId] = useState<string | null>(null)
  const [sendError, setSendError] = useState<string | null>(null)
  const [creatingLinkSlotId, setCreatingLinkSlotId] = useState<string | null>(null)
  const [togglingLinkSessionId, setTogglingLinkSessionId] = useState<string | null>(null)
  const [qrModal, setQrModal] = useState<{ url: string; title: string } | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const publicUrl = (token: string) => {
    const base = process.env.NEXT_PUBLIC_APP_URL
      || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000')
    return `${base}/p/${token}`
  }

  const refreshElectronicSessions = useCallback(() => {
    fetch(`/api/electronic-attendance/sessions?sessionId=${sessionId}`)
      .then((r) => r.ok ? r.json() : [])
      .then((data: ElectronicSession[]) => setElectronicSessions(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [sessionId])

  const handleCreatePublicLink = async (slot: SessionSlot) => {
    setCreatingLinkSlotId(slot.id)
    try {
      const timeLabel = getTimeSlotLabel(slot)
      const dateStr = format(new Date(slot.date), 'd MMMM yyyy', { locale: fr })
      const res = await fetch('/api/electronic-attendance/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          title: `Émargement ${timeLabel} — ${dateStr}`,
          date: slot.date,
          startTime: slot.start_time || undefined,
          endTime: slot.end_time || undefined,
          mode: 'electronic',
          requireGeolocation: false,
          allowedRadiusMeters: 100,
        }),
      })
      if (!res.ok) throw new Error('Erreur création session')
      // Activer le lien public immédiatement
      const created = await res.json()
      await fetch(`/api/electronic-attendance/sessions/${created.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle-public-link', active: true }),
      })
      refreshElectronicSessions()
    } catch {
      setSendError('Erreur lors de la création du lien public')
    } finally {
      setCreatingLinkSlotId(null)
    }
  }

  const handleTogglePublicLink = async (eSessionId: string, active: boolean) => {
    setTogglingLinkSessionId(eSessionId)
    try {
      await fetch(`/api/electronic-attendance/sessions/${eSessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle-public-link', active }),
      })
      refreshElectronicSessions()
    } finally {
      setTogglingLinkSessionId(null)
    }
  }

  const handleCopyLink = (token: string) => {
    navigator.clipboard.writeText(publicUrl(token)).then(() => showToast('Lien copié !')).catch(() => {})
  }

  useEffect(() => {
    refreshElectronicSessions()
  }, [refreshElectronicSessions])

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

  const generateDigitalSheetHTML = (slot: SessionSlot, learners: AttendancePerson[]) => {
    const formattedDate = format(new Date(slot.date), 'EEEE d MMMM yyyy', { locale: fr })
    const timeLabel = getTimeSlotLabel(slot)

    const rows = learners.map((p, i) => {
      const isAbsent = p.status === 'absent'
      const hasTimestamp = !!p.timestamp
      const parts = hasTimestamp && p.timestamp.includes(' - ') ? p.timestamp.split(' - ') : [p.timestamp, '']
      const date = parts[0]
      const time = parts[1] ?? ''

      const signatureCell = isAbsent
        ? `<span style="border:1px solid #ef4444;color:#ef4444;font-size:10px;font-weight:700;padding:2px 8px;border-radius:100px;letter-spacing:2px;display:inline-block;">ABSENT</span>`
        : p.signatureUrl
          ? `<img src="${p.signatureUrl}" alt="Signature" style="max-width:80px;max-height:36px;object-fit:contain;display:block;margin:auto;">`
          : `<div style="height:36px;"></div>`

      return `
        <tr style="border-bottom:1px solid #f3f4f6;${i % 2 === 0 ? 'background:white;' : 'background:#fafafa;'}">
          <td style="padding:14px 16px;font-weight:600;color:#1f2937;font-size:10pt;">${escapeHtml(p.name)}</td>
          <td style="padding:14px 16px;color:#9ca3af;font-size:9pt;">${escapeHtml(p.email)}</td>
          <td style="padding:14px 16px;text-align:center;width:120px;">${signatureCell}</td>
          <td style="padding:14px 16px;text-align:right;font-size:9pt;color:${isAbsent ? '#ef4444' : '#9ca3af'};white-space:nowrap;line-height:1.4;">${hasTimestamp ? `${date}${time ? `<br>${time}` : ''}` : ''}</td>
        </tr>`
    }).join('')

    return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <style>
    @page { size: A4; margin: 15mm; }
    body { font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif; font-size: 11pt; color: #333; line-height: 1.4; margin: 0; padding: 0; }
    table { border-collapse: collapse; width: 100%; }
  </style>
</head>
<body>
  <div style="border-bottom:3px solid ${ELECTRIC_CYAN};padding-bottom:20px;margin-bottom:20px;">
    <h1 style="margin:0 0 4px 0;font-size:18pt;font-weight:700;color:${DEEP_BLUE};text-transform:uppercase;letter-spacing:0.5px;">Émargement Numérique</h1>
    <p style="margin:0;font-size:11pt;color:#4b5563;font-weight:500;">${escapeHtml(organizationName)}</p>
    ${organizationAddress ? `<p style="margin:2px 0 0 0;font-size:9pt;color:#6b7280;">${escapeHtml(organizationAddress)}</p>` : ''}
  </div>
  <div style="background:linear-gradient(135deg,${DEEP_BLUE} 0%,#41729F 100%);color:white;padding:16px 20px;border-radius:8px;margin-bottom:16px;">
    <p style="margin:0 0 2px 0;font-size:8pt;text-transform:uppercase;letter-spacing:1px;opacity:0.8;">Formation</p>
    <p style="margin:0;font-size:13pt;font-weight:600;">${escapeHtml(formationName || sessionName)}</p>
  </div>
  <div style="background:#f8fafc;padding:12px 16px;border-radius:8px;margin-bottom:24px;border:1px solid #e2e8f0;display:flex;gap:24px;align-items:center;">
    <div>
      <p style="margin:0;font-size:8pt;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Date</p>
      <p style="margin:0;font-weight:600;color:#1e293b;text-transform:capitalize;">${formattedDate}</p>
    </div>
    <div>
      <p style="margin:0;font-size:8pt;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Horaire</p>
      <p style="margin:0;font-weight:600;color:#1e293b;">${timeLabel}${slot.start_time ? ` (${slot.start_time}${slot.end_time ? ` – ${slot.end_time}` : ''})` : ''}</p>
    </div>
    ${slot.location ? `<div><p style="margin:0;font-size:8pt;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Lieu</p><p style="margin:0;font-weight:600;color:#1e293b;">${escapeHtml(slot.location)}</p></div>` : ''}
  </div>
  <p style="font-size:8pt;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:${DEEP_BLUE};margin:0 0 8px 0;">Apprenants <span style="color:${ELECTRIC_CYAN};">(${learners.length})</span></p>
  <table style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-bottom:30px;">
    <thead>
      <tr style="background:${DEEP_BLUE};color:white;">
        <th style="padding:10px 16px;text-align:left;font-weight:600;font-size:9pt;">NOM</th>
        <th style="padding:10px 16px;text-align:left;font-weight:600;font-size:9pt;">EMAIL</th>
        <th style="padding:10px 16px;text-align:center;font-weight:600;font-size:9pt;width:120px;">SIGNATURE</th>
        <th style="padding:10px 16px;text-align:right;font-weight:600;font-size:9pt;white-space:nowrap;">DATE / HEURE</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
      ${learners.length === 0 ? `<tr><td colspan="4" style="padding:40px;text-align:center;color:#9ca3af;">Aucun apprenant inscrit</td></tr>` : ''}
    </tbody>
  </table>
  <div style="margin-top:30px;padding:12px 16px;border-top:2px solid ${DEEP_BLUE};background:rgba(39,68,114,0.04);">
    <p style="margin:0 0 4px 0;font-size:8pt;font-weight:600;color:${DEEP_BLUE};text-transform:uppercase;letter-spacing:0.5px;">Mentions légales</p>
    <p style="margin:0;font-size:8pt;color:#6b7280;line-height:1.5;">La signature de cette feuille atteste de la présence effective du stagiaire à la formation. Document conforme aux exigences Qualiopi et OPCO.</p>
    <p style="margin:8px 0 0 0;font-size:8pt;color:#9ca3af;">Généré le ${format(new Date(), "d MMMM yyyy 'à' HH:mm", { locale: fr })} — EDUZEN</p>
  </div>
</body>
</html>`
  }

  const downloadDigitalSheet = async (slot: SessionSlot, learners: AttendancePerson[]) => {
    setGeneratingDigitalSlotId(slot.id)
    try {
      const html = generateDigitalSheetHTML(slot, learners)
      const filename = `Emargement_Numerique_${sessionName.replace(/[^a-zA-Z0-9]/g, '_')}_${format(new Date(slot.date), 'yyyy-MM-dd')}_${slot.time_slot}.pdf`

      const containerId = `digital-attendance-${slot.id}-${Date.now()}`
      const container = document.createElement('div')
      container.id = containerId
      const parsed = new DOMParser().parseFromString(html, 'text/html')
      container.appendChild(parsed.documentElement)
      container.style.cssText = 'position:absolute;left:-9999px;top:0;width:210mm;min-height:297mm;background:white;'
      document.body.appendChild(container)

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
      logger.error('Erreur génération PDF numérique', error instanceof Error ? error : new Error(String(error)))
    } finally {
      setGeneratingDigitalSlotId(null)
    }
  }

  const launchSlot = async (slot: SessionSlot) => {
    setSendingSlotId(slot.id)
    setSendError(null)
    try {
      const res = await fetch('/api/electronic-attendance/launch-slot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          date: slot.date,
          startTime: slot.start_time,
          endTime: slot.end_time,
          timeSlot: slot.time_slot,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur envoi')
      // Rafraîchir les sessions électroniques pour mettre à jour l'état du bouton
      const refreshed = await fetch(`/api/electronic-attendance/sessions?sessionId=${sessionId}`)
      if (refreshed.ok) {
        const updatedSessions: ElectronicSession[] = await refreshed.json()
        setElectronicSessions(Array.isArray(updatedSessions) ? updatedSessions : [])
      }
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setSendingSlotId(null)
    }
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
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-green-600 text-white text-sm px-4 py-2.5 rounded-lg shadow-lg flex items-center gap-2">
          <CheckCircle className="h-4 w-4" />
          {toast}
        </div>
      )}

      {/* QR Code Modal */}
      {qrModal && (
        <QRCodeModal
          open={!!qrModal}
          onClose={() => setQrModal(null)}
          url={qrModal.url}
          title={qrModal.title}
        />
      )}

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
      <div className="space-y-4">
        {sortedSlots.map((slot) => {
          const formattedDate = format(new Date(slot.date), 'EEEE d MMMM yyyy', { locale: fr })
          const isSelected = selectedSlots.has(slot.id)
          const isCurrentlyGenerating = generatingSlotId === slot.id

          // Trouver la session électronique correspondant à ce créneau (par date)
          const eSession = electronicSessions.find((es) => es.date === slot.date)
          const eRequests = eSession?.requests ?? []

          const learners = students.map((s) => {
            // Correspondance par student_id, puis par email, puis par nom
            const req = eRequests.find(
              (r) =>
                (s.id && r.student_id === s.id) ||
                (s.email && r.student_email?.toLowerCase() === s.email.toLowerCase()) ||
                (s.last_name &&
                  r.student_name
                    ?.toLowerCase()
                    .includes(s.last_name.toLowerCase()))
            )
            const isSigned = req?.status === 'signed'
            const signedAt = req?.signed_at
              ? format(new Date(req.signed_at), 'dd/MM/yyyy - HH:mm')
              : null

            return {
              id: s.id,
              name: `${(s.last_name || '').toUpperCase()} ${s.first_name || ''}`.trim(),
              email: s.email || '',
              status: (isSigned ? 'present' : req ? 'absent' : 'present') as 'present' | 'absent',
              timestamp: signedAt ?? '',
              signatureUrl: isSigned && req?.signature_data ? req.signature_data : undefined,
            }
          })

          return (
            <Card
              key={slot.id}
              className={cn(
                'overflow-hidden transition-all duration-200',
                isSelected && 'ring-2 ring-brand-blue ring-offset-2'
              )}
            >
              {/* Header de séance */}
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

                  <div className="flex items-center gap-2">
                    {/* Bouton envoi demandes d'émargement numérique */}
                    {(() => {
                      const isSending = sendingSlotId === slot.id
                      const isActive = eSession?.status === 'active'
                      const isClosed = eSession?.status === 'closed'

                      if (isActive || isClosed) {
                        return (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled
                            className="gap-2 border-green-200 text-green-700 bg-green-50"
                          >
                            <CheckCircle className="h-4 w-4" />
                            {isActive ? 'Envoyé' : 'Terminé'}
                          </Button>
                        )
                      }

                      return (
                        <Button
                          size="sm"
                          onClick={() => launchSlot(slot)}
                          disabled={isSending}
                          className="gap-2 bg-brand-blue hover:bg-brand-blue/90 text-white"
                          title="Envoyer les demandes d'émargement aux apprenants et formateurs"
                        >
                          {isSending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Send className="h-4 w-4" />
                          )}
                          {isSending ? 'Envoi…' : 'Envoyer'}
                        </Button>
                      )
                    })()}

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadSingleSheet(slot)}
                      disabled={isCurrentlyGenerating || isGenerating}
                      className="gap-2"
                      title="Télécharger la feuille physique"
                    >
                      {isCurrentlyGenerating && generatingDigitalSlotId !== slot.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <FileDown className="h-4 w-4" />
                      )}
                      PDF
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadDigitalSheet(slot, learners)}
                      disabled={generatingDigitalSlotId === slot.id || isGenerating}
                      className="gap-2"
                      title="Télécharger l'émargement numérique signé"
                    >
                      {generatingDigitalSlotId === slot.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <PenLine className="h-4 w-4" />
                      )}
                      PDF signé
                    </Button>
                  </div>
                </div>
              </CardContent>

              {/* Lien public QR / email */}
              <div className="border-t border-gray-100 px-4 py-3 bg-gray-50/30">
                {eSession?.public_emargement_token ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Link2 className="h-4 w-4 text-brand-blue" />
                        <span className="text-sm font-medium text-gray-700">Lien public de présence</span>
                        <Switch
                          checked={!!eSession.public_emargement_active}
                          onCheckedChange={(v) => handleTogglePublicLink(eSession.id, v)}
                          disabled={togglingLinkSessionId === eSession.id}
                        />
                        <span className="text-xs text-gray-500">
                          {eSession.public_emargement_active ? 'Actif' : 'Inactif'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1" onClick={() => handleCopyLink(eSession.public_emargement_token!)}>
                          <Copy className="h-3.5 w-3.5" />Copier
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1"
                          onClick={() => setQrModal({ url: publicUrl(eSession.public_emargement_token!), title: `Émargement — ${sessionName}` })}>
                          <QrCode className="h-3.5 w-3.5" />QR Code
                        </Button>
                      </div>
                    </div>
                    {eSession.public_emargement_active && (
                      <code className="block text-xs text-gray-500 bg-white border rounded px-2 py-1 truncate">
                        {publicUrl(eSession.public_emargement_token)}
                      </code>
                    )}
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-2 text-xs h-7"
                    disabled={creatingLinkSlotId === slot.id}
                    onClick={() => handleCreatePublicLink(slot)}
                  >
                    {creatingLinkSlotId === slot.id
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : <QrCode className="h-3.5 w-3.5" />
                    }
                    Créer le lien public / QR Code
                  </Button>
                )}
              </div>

              {/* Émargement numérique — toujours visible */}
              <div className="border-t border-gray-100 bg-gray-50/50">
                <DigitalAttendanceSheet learners={learners} trainers={[]} />
              </div>
            </Card>
          )
        })}
      </div>

      {sendError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {sendError}
        </div>
      )}

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
