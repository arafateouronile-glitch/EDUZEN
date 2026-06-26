'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Loader2,
  Plus,
  Send,
  CheckCircle,
  XCircle,
  Clock,
  Mail,
  MapPin,
  Download,
  Link2,
  Copy,
  QrCode,
  RefreshCw,
  Users,
  ClipboardList,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { QRCodeModal } from '@/components/ui/QRCodeModal'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ElectronicAttendanceManagerProps {
  sessionId: string
  organizationId: string
  sessionName?: string
}

interface AttendanceRequest {
  id: string
  student_id: string
  student_name: string
  student_email: string
  status: 'pending' | 'signed' | 'expired' | 'declined'
  signed_at: string | null
  signed_via: 'email' | 'public_link' | 'manual' | null
  location_verified: boolean | null
  signature_data?: string | null
}

interface AttendanceSession {
  id: string
  title: string
  date: string
  start_time: string | null
  end_time: string | null
  status: 'draft' | 'active' | 'closed' | 'cancelled'
  mode: 'electronic' | 'manual' | 'hybrid'
  total_expected: number
  total_signed: number
  require_geolocation: boolean
  public_emargement_token: string | null
  public_emargement_active: boolean
  public_emargement_expires_at: string | null
  created_at: string
  requests?: AttendanceRequest[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function publicUrl(token: string) {
  const base = process.env.NEXT_PUBLIC_APP_URL
    || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000')
  return `${base}/p/${token}`
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ElectronicAttendanceManager({
  sessionId,
  organizationId,
  sessionName,
}: ElectronicAttendanceManagerProps) {
  const [sessions, setSessions] = useState<AttendanceSession[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  // Dialog create
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createForm, setCreateForm] = useState({
    title: '',
    date: new Date().toISOString().split('T')[0],
    startTime: '',
    endTime: '',
    requireGeolocation: false,
    allowedRadiusMeters: 100,
  })

  // Modal sélection apprenants
  const [sendModalOpen, setSendModalOpen] = useState(false)
  const [sendTarget, setSendTarget] = useState<AttendanceSession | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [customMessage, setCustomMessage] = useState('')
  const [sending, setSending] = useState(false)

  // QR Code modal
  const [qrModal, setQrModal] = useState<{ url: string; title: string } | null>(null)

  // Modal signature
  const [sigModal, setSigModal] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3500)
  }

  const [quickCreating, setQuickCreating] = useState(false)

  const handleQuickCreate = async () => {
    setQuickCreating(true)
    setError(null)
    const today = new Date().toISOString().split('T')[0]
    const title = sessionName
      ? `Émargement — ${sessionName}`
      : `Émargement du ${new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`
    try {
      const response = await fetch('/api/electronic-attendance/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          organizationId,
          title,
          date: today,
          mode: 'electronic',
          requireGeolocation: false,
          allowedRadiusMeters: 100,
        }),
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erreur lors de la création')
      }
      loadSessions()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setQuickCreating(false)
    }
  }

  // ─── Load sessions + Realtime ──────────────────────────────────────────────

  const loadSessions = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch(`/api/electronic-attendance/sessions?sessionId=${sessionId}`)
      if (!response.ok) throw new Error('Erreur lors du chargement')
      const data = await response.json()
      setSessions(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }, [sessionId])

  useEffect(() => {
    loadSessions()
  }, [loadSessions])

  // Realtime : écoute les mises à jour des demandes d'émargement
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('attendance-requests-realtime')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'electronic_attendance_requests',
        },
        (payload) => {
          setSessions((prev) =>
            prev.map((s) => {
              if (!s.requests) return s
              const updatedRequests = s.requests.map((r) =>
                r.id === payload.new.id
                  ? {
                      ...r,
                      status: payload.new.status,
                      signed_at: payload.new.signed_at,
                      signed_via: payload.new.signed_via,
                      location_verified: payload.new.location_verified,
                      signature_data: payload.new.signature_data,
                    }
                  : r
              )
              const totalSigned = updatedRequests.filter((r) => r.status === 'signed').length
              return { ...s, requests: updatedRequests, total_signed: totalSigned }
            })
          )
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // ─── CRUD Actions ──────────────────────────────────────────────────────────

  const handleCreateSession = async () => {
    try {
      setCreating(true)
      setError(null)
      const response = await fetch('/api/electronic-attendance/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          organizationId,
          title: createForm.title,
          date: createForm.date,
          startTime: createForm.startTime || null,
          endTime: createForm.endTime || null,
          mode: 'electronic',
          requireGeolocation: createForm.requireGeolocation,
          allowedRadiusMeters: createForm.allowedRadiusMeters,
        }),
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erreur lors de la création')
      }
      setCreateDialogOpen(false)
      setCreateForm({
        title: '',
        date: new Date().toISOString().split('T')[0],
        startTime: '',
        endTime: '',
        requireGeolocation: false,
        allowedRadiusMeters: 100,
      })
      loadSessions()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setCreating(false)
    }
  }

  const handleCloseSession = async (attendanceSessionId: string) => {
    if (!confirm('Voulez-vous fermer cette session d\'émargement ? Les demandes non signées seront marquées comme expirées.')) return
    try {
      const response = await fetch(`/api/electronic-attendance/sessions/${attendanceSessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'close' }),
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erreur lors de la fermeture')
      }
      loadSessions()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    }
  }

  const handleSendReminder = async (requestId: string) => {
    try {
      const response = await fetch(`/api/electronic-attendance/requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'remind' }),
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erreur lors de l\'envoi du rappel')
      }
      showToast('Rappel envoyé avec succès')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    }
  }

  const handleExportAttendance = (session: AttendanceSession) => {
    const rows = session.requests ?? []
    const header = 'Apprenant;Email;Statut;Date de signature;Canal;Géolocalisation'
    const statusLabel = (s: string) =>
      s === 'signed' ? 'Signé' : s === 'pending' ? 'En attente' : s === 'expired' ? 'Expiré' : s === 'declined' ? 'Refusé' : s
    const viaLabel = (v: string | null) =>
      v === 'email' ? 'Email' : v === 'public_link' ? 'Lien public' : v === 'manual' ? 'Manuel' : '-'
    const lines = [
      header,
      ...rows.map((r) =>
        [
          `"${(r.student_name ?? '').replace(/"/g, '""')}"`,
          `"${(r.student_email ?? '').replace(/"/g, '""')}"`,
          statusLabel(r.status),
          r.signed_at ? new Date(r.signed_at).toLocaleString('fr-FR') : '-',
          viaLabel(r.signed_via),
          r.location_verified ? 'Oui' : 'Non',
        ].join(';')
      ),
    ]
    const csv = '﻿' + lines.join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `emargements_${(session.title ?? 'session').replace(/[^a-zA-Z0-9-_]/g, '_')}_${session.date}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ─── Modal sélection ───────────────────────────────────────────────────────

  const openSendModal = (session: AttendanceSession) => {
    setSendTarget(session)
    // Pré-sélection : tout cocher sauf ceux déjà signés
    const ids = new Set(
      (session.requests ?? [])
        .filter((r) => r.status !== 'signed' && r.student_email)
        .map((r) => r.student_id)
    )
    setSelectedIds(ids)
    setCustomMessage('')
    setSendModalOpen(true)
  }

  const handleSendSelected = async () => {
    if (!sendTarget || selectedIds.size === 0) return
    setSending(true)
    try {
      const response = await fetch('/api/electronic-attendance/send-selected', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attendanceSessionId: sendTarget.id,
          learnerIds: Array.from(selectedIds),
          customMessage: customMessage.trim() || undefined,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Erreur lors de l\'envoi')
      showToast(`Émargements envoyés à ${data.successful} apprenant${data.successful > 1 ? 's' : ''}`)
      setSendModalOpen(false)
      loadSessions()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setSending(false)
    }
  }

  // ─── Lien public ───────────────────────────────────────────────────────────

  const handleTogglePublicLink = async (session: AttendanceSession, active: boolean) => {
    try {
      const response = await fetch(`/api/electronic-attendance/sessions/${session.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle-public-link', active }),
      })
      if (!response.ok) throw new Error('Erreur lors de la mise à jour')
      loadSessions()
      showToast(active ? 'Lien public activé' : 'Lien public désactivé')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    }
  }

  const handleRegenerateToken = async (sessionId: string) => {
    if (!confirm('Régénérer le token invalidera le lien et QR Code existants. Continuer ?')) return
    try {
      const response = await fetch(`/api/electronic-attendance/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'regenerate-public-token' }),
      })
      if (!response.ok) throw new Error('Erreur')
      loadSessions()
      showToast('Token régénéré')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    }
  }

  const handleCopyLink = (token: string) => {
    navigator.clipboard.writeText(publicUrl(token))
    showToast('Lien copié dans le presse-papier')
  }

  // ─── Status badges ─────────────────────────────────────────────────────────

  const getSessionStatusBadge = (status: string) => {
    switch (status) {
      case 'draft': return <Badge variant="secondary">Brouillon</Badge>
      case 'active': return <Badge className="bg-green-500">Active</Badge>
      case 'closed': return <Badge variant="outline">Fermée</Badge>
      case 'cancelled': return <Badge variant="destructive">Annulée</Badge>
      default: return <Badge>{status}</Badge>
    }
  }

  const getRequestStatusBadge = (request: AttendanceRequest) => {
    const { status, signed_via } = request
    if (status === 'signed') {
      const viaIcon = signed_via === 'email'
        ? '📧'
        : signed_via === 'public_link'
          ? '🔗'
          : signed_via === 'manual'
            ? '✏️'
            : ''
      return (
        <div className="flex items-center gap-1.5">
          <Badge className="bg-green-500 text-xs">Signé</Badge>
          {viaIcon && <span className="text-sm" title={signed_via === 'email' ? 'Via email' : signed_via === 'public_link' ? 'Via lien public' : 'Manuel'}>{viaIcon}</span>}
        </div>
      )
    }
    if (status === 'pending') return <Badge variant="secondary">En attente</Badge>
    if (status === 'expired') return <Badge variant="outline">Expiré</Badge>
    return <Badge>{status}</Badge>
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  if (loading && sessions.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  const sendTargetRequests = sendTarget?.requests ?? []
  const alreadySigned = sendTargetRequests.filter((r) => r.status === 'signed')
  const withoutEmail = sendTargetRequests.filter((r) => !r.student_email)

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-green-600 text-white text-sm px-4 py-2.5 rounded-lg shadow-lg flex items-center gap-2">
          <CheckCircle className="h-4 w-4" />
          {toast}
        </div>
      )}

      {/* Description */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold mb-2">Gestion des émargements</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 border rounded-lg bg-blue-50 border-blue-200">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-blue-900 mb-1">Émargement manuel</h4>
                    <p className="text-sm text-blue-700">Cochez directement les présences depuis l'interface.</p>
                  </div>
                </div>
              </div>
              <div className="p-4 border rounded-lg bg-green-50 border-green-200">
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-green-900 mb-1">Émargement numérique</h4>
                    <p className="text-sm text-green-700">Envoi par email avec signature électronique, ou lien public QR Code.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Sessions d'émargement numérique</h3>
          <p className="text-sm text-gray-500">Créez et gérez les sessions d'émargement avec envoi d'emails aux apprenants</p>
        </div>

        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle session
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nouvelle session d'émargement numérique</DialogTitle>
              <DialogDescription>Créez une session avec envoi automatique d'emails aux apprenants inscrits</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Titre *</Label>
                <Input
                  id="title"
                  value={createForm.title}
                  onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                  placeholder="Ex: Émargement du 15 janvier"
                />
              </div>
              <div>
                <Label htmlFor="date">Date *</Label>
                <Input id="date" type="date" value={createForm.date} onChange={(e) => setCreateForm({ ...createForm, date: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startTime">Heure de début</Label>
                  <Input id="startTime" type="time" value={createForm.startTime} onChange={(e) => setCreateForm({ ...createForm, startTime: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="endTime">Heure de fin</Label>
                  <Input id="endTime" type="time" value={createForm.endTime} onChange={(e) => setCreateForm({ ...createForm, endTime: e.target.value })} />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="requireGeolocation"
                  checked={createForm.requireGeolocation}
                  onCheckedChange={(checked) => setCreateForm({ ...createForm, requireGeolocation: checked as boolean })}
                />
                <Label htmlFor="requireGeolocation" className="cursor-pointer">Exiger la géolocalisation</Label>
              </div>
              {createForm.requireGeolocation && (
                <div>
                  <Label htmlFor="allowedRadiusMeters">Rayon autorisé (mètres)</Label>
                  <Input
                    id="allowedRadiusMeters"
                    type="number"
                    min="10"
                    value={createForm.allowedRadiusMeters}
                    onChange={(e) => setCreateForm({ ...createForm, allowedRadiusMeters: parseInt(e.target.value) || 100 })}
                  />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)} disabled={creating}>Annuler</Button>
              <Button onClick={handleCreateSession} disabled={creating || !createForm.title}>
                {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Créer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Sessions list */}
      {sessions.length === 0 ? (
        <Card className="border-2 border-dashed border-blue-200 bg-blue-50/40">
          <CardContent className="p-8">
            <div className="flex flex-col items-center text-center gap-5">
              <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center">
                <ClipboardList className="h-7 w-7 text-blue-600" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-800 mb-1">
                  Aucune session d'émargement créée
                </h3>
                <p className="text-sm text-gray-500 max-w-md">
                  Pour émarger vos apprenants, créez d'abord une session. Vous pourrez ensuite
                  leur envoyer un lien individuel par email, ou partager un QR code en salle.
                </p>
              </div>

              {/* 2 workflows expliqués */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-md text-left">
                <div className="p-3 bg-white rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2 mb-1">
                    <Mail className="h-4 w-4 text-blue-500" />
                    <span className="text-sm font-medium text-gray-700">Par email</span>
                  </div>
                  <p className="text-xs text-gray-500">Chaque apprenant reçoit un lien personnel pour signer depuis son appareil.</p>
                </div>
                <div className="p-3 bg-white rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2 mb-1">
                    <QrCode className="h-4 w-4 text-blue-500" />
                    <span className="text-sm font-medium text-gray-700">QR Code / lien public</span>
                  </div>
                  <p className="text-xs text-gray-500">Un seul lien à afficher : chaque apprenant choisit son nom et signe.</p>
                </div>
              </div>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={handleQuickCreate}
                  disabled={quickCreating}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {quickCreating
                    ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Création…</>
                    : <><Plus className="h-4 w-4 mr-2" />Créer la session du jour</>
                  }
                </Button>
                <Button variant="outline" onClick={() => setCreateDialogOpen(true)}>
                  Personnaliser la session
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {sessions.map((session) => {
            const signed = session.total_signed
            const total = session.total_expected || 1
            const pct = Math.round((signed / total) * 100)

            return (
              <Card key={session.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{session.title}</CardTitle>
                      <CardDescription>
                        {new Date(session.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                        {session.start_time && ` • ${session.start_time}`}
                        {session.require_geolocation && (
                          <span className="inline-flex items-center ml-2">
                            <MapPin className="h-3 w-3 mr-1" />
                            Géolocalisation requise
                          </span>
                        )}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      {getSessionStatusBadge(session.status)}
                      <Badge variant="outline">{session.total_signed}/{session.total_expected}</Badge>
                    </div>
                  </div>

                  {/* Barre de progression */}
                  {session.total_expected > 0 && (
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                        <span>Présences : {signed} / {session.total_expected}</span>
                        <span>{pct}%</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )}
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Actions principales */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {(session.status === 'draft' || session.status === 'active') && (
                      <Button onClick={() => openSendModal(session)} size="sm">
                        <Send className="h-4 w-4 mr-2" />
                        Envoyer les émargements
                      </Button>
                    )}
                    {session.status === 'active' && (
                      <Button onClick={() => handleCloseSession(session.id)} size="sm" variant="outline">
                        Fermer
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => handleExportAttendance(session)}>
                      <Download className="h-4 w-4 mr-2" />
                      Exporter
                    </Button>
                  </div>

                  {/* ─── Section lien public ─────────────────────────────── */}
                  <div className="border rounded-lg p-4 bg-gray-50 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Link2 className="h-4 w-4 text-gray-600" />
                        <span className="font-medium text-sm">Lien public de présence</span>
                      </div>
                      <Switch
                        checked={session.public_emargement_active}
                        onCheckedChange={(active) => handleTogglePublicLink(session, active)}
                      />
                    </div>

                    <p className="text-xs text-gray-500">
                      Partagez ce lien ou affichez le QR code en salle. Les apprenants choisissent leur nom et signent depuis leur téléphone.
                    </p>

                    {session.public_emargement_token && (
                      <div className="flex items-center gap-2">
                        <code className="flex-1 text-xs bg-white border rounded px-2 py-1.5 text-gray-700 truncate">
                          {publicUrl(session.public_emargement_token)}
                        </code>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleCopyLink(session.public_emargement_token!)}
                          title="Copier le lien"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            setQrModal({
                              url: publicUrl(session.public_emargement_token!),
                              title: `Émargement — ${session.title}`,
                            })
                          }
                          title="Afficher le QR code"
                        >
                          <QrCode className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRegenerateToken(session.id)}
                          title="Régénérer le token"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      </div>
                    )}

                    {!session.public_emargement_active && (
                      <p className="text-xs text-amber-600">
                        Activez le toggle pour rendre le lien accessible aux apprenants.
                      </p>
                    )}
                  </div>

                  {/* ─── Tableau apprenants ──────────────────────────────── */}
                  {session.requests && session.requests.length > 0 && (
                    <div className="border rounded-lg">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Apprenant</TableHead>
                            <TableHead>Statut</TableHead>
                            <TableHead>Signé</TableHead>
                            <TableHead>Signature</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {session.requests.map((request) => (
                            <TableRow key={request.id}>
                              <TableCell>
                                <div className="font-medium text-sm">{request.student_name}</div>
                                <div className="text-xs text-gray-400">{request.student_email}</div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1.5">
                                  {getRequestStatusBadge(request)}
                                  {request.status === 'pending' && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-6 w-6 p-0"
                                      onClick={() => handleSendReminder(request.id)}
                                      title="Envoyer un rappel"
                                    >
                                      <Mail className="h-3.5 w-3.5 text-gray-400" />
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-xs text-gray-500">
                                {request.signed_at
                                  ? new Date(request.signed_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
                                  : '-'}
                              </TableCell>
                              <TableCell>
                                {request.signature_data ? (
                                  <img
                                    src={request.signature_data}
                                    alt={`Signature ${request.student_name}`}
                                    className="h-10 max-w-[120px] object-contain border border-gray-200 rounded bg-white cursor-pointer"
                                    onClick={() => setSigModal(request.signature_data!)}
                                    title="Cliquer pour agrandir"
                                  />
                                ) : (
                                  <span className="text-xs text-gray-300 italic">—</span>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* ─── Modal sélection apprenants ──────────────────────────────────── */}
      <Dialog open={sendModalOpen} onOpenChange={(v) => !v && setSendModalOpen(false)}>
        <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Envoyer les émargements par email</DialogTitle>
            <DialogDescription>Sélectionnez les apprenants destinataires</DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-3 py-2">
            {/* Boutons rapides */}
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setSelectedIds(
                    new Set(
                      sendTargetRequests
                        .filter((r) => r.student_email)
                        .map((r) => r.student_id)
                    )
                  )
                }
              >
                <Users className="h-3.5 w-3.5 mr-1.5" />
                Tout sélectionner
              </Button>
              <Button size="sm" variant="outline" onClick={() => setSelectedIds(new Set())}>
                Tout désélectionner
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setSelectedIds(
                    new Set(
                      sendTargetRequests
                        .filter((r) => r.status !== 'signed' && r.student_email)
                        .map((r) => r.student_id)
                    )
                  )
                }
              >
                <Clock className="h-3.5 w-3.5 mr-1.5" />
                Sans signature
              </Button>
            </div>

            {/* Liste apprenants */}
            <div className="space-y-2">
              {sendTargetRequests.map((req) => {
                const noEmail = !req.student_email
                const signed = req.status === 'signed'
                const checked = selectedIds.has(req.student_id)

                const statusBadge = signed
                  ? <Badge className="bg-green-100 text-green-700 text-xs">✅ Déjà signé</Badge>
                  : req.status === 'pending' && req.student_email === undefined
                    ? null
                    : noEmail
                      ? <Badge variant="secondary" className="text-xs">❌ Pas d'email</Badge>
                      : checked && req.status === 'pending'
                        ? <Badge className="bg-blue-100 text-blue-700 text-xs">📩 Pas encore contacté</Badge>
                        : <Badge className="bg-orange-100 text-orange-700 text-xs">⏳ Email envoyé</Badge>

                return (
                  <div
                    key={req.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border ${noEmail ? 'opacity-50 bg-gray-50' : 'bg-white hover:bg-gray-50'}`}
                  >
                    <Checkbox
                      checked={checked}
                      disabled={noEmail || signed}
                      onCheckedChange={(c) => {
                        const next = new Set(selectedIds)
                        if (c) next.add(req.student_id)
                        else next.delete(req.student_id)
                        setSelectedIds(next)
                      }}
                    />
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                      {req.student_name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{req.student_name}</p>
                      <p className="text-xs text-gray-500 truncate">
                        {req.student_email || 'Aucun email renseigné'}
                      </p>
                    </div>
                    {statusBadge}
                  </div>
                )
              })}
            </div>

            {/* Résumé */}
            <div className="text-xs text-gray-500 pt-1 space-y-0.5">
              <p>{selectedIds.size} apprenant{selectedIds.size > 1 ? 's' : ''} sélectionné{selectedIds.size > 1 ? 's' : ''} sur {sendTargetRequests.length}</p>
              {alreadySigned.length > 0 && (
                <p>{alreadySigned.length} ont déjà signé et sont exclus</p>
              )}
            </div>

            {/* Message personnalisé */}
            <div className="space-y-1.5 pt-2">
              <Label htmlFor="customMessage" className="text-sm">Message personnalisé (optionnel)</Label>
              <Textarea
                id="customMessage"
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value.slice(0, 300))}
                placeholder="Ex: Merci de signer votre feuille de présence avant le début de la séance."
                rows={3}
                className="resize-none text-sm"
              />
              <p className="text-xs text-gray-400 text-right">{customMessage.length}/300</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSendModalOpen(false)} disabled={sending}>
              Annuler
            </Button>
            <Button
              onClick={handleSendSelected}
              disabled={selectedIds.size === 0 || sending}
            >
              {sending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Envoyer à {selectedIds.size} apprenant{selectedIds.size > 1 ? 's' : ''} →
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Modal QR code ──────────────────────────────────────────────── */}
      {qrModal && (
        <QRCodeModal
          open={!!qrModal}
          onClose={() => setQrModal(null)}
          url={qrModal.url}
          title={qrModal.title}
        />
      )}

      {/* ─── Modal signature ────────────────────────────────────────────── */}
      <Dialog open={!!sigModal} onOpenChange={(v) => !v && setSigModal(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Signature</DialogTitle>
          </DialogHeader>
          {sigModal && (
            <div className="flex justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={sigModal}
                alt="Signature"
                className="border rounded-lg max-w-full"
                style={{ background: '#fff' }}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
