'use client'

import { useState, useEffect } from 'react'
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
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'

interface ElectronicAttendanceManagerProps {
  sessionId: string
  organizationId: string
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
  created_at: string
  requests?: AttendanceRequest[]
}

interface AttendanceRequest {
  id: string
  student_name: string
  student_email: string
  status: 'pending' | 'signed' | 'expired' | 'declined'
  signed_at: string | null
  location_verified: boolean | null
}

export function ElectronicAttendanceManager({
  sessionId,
  organizationId,
}: ElectronicAttendanceManagerProps) {
  const [sessions, setSessions] = useState<AttendanceSession[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  useEffect(() => {
    loadSessions()
  }, [sessionId])

  const loadSessions = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/electronic-attendance/sessions?sessionId=${sessionId}`)

      if (!response.ok) {
        throw new Error('Erreur lors du chargement')
      }

      const data = await response.json()
      setSessions(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateSession = async () => {
    try {
      setCreating(true)
      setError(null)

      const response = await fetch('/api/electronic-attendance/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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

  const handleLaunchSession = async (attendanceSessionId: string) => {
    if (!confirm('Voulez-vous lancer cette session d\'émargement ? Des emails seront envoyés à tous les apprenants inscrits.')) {
      return
    }

    try {
      const response = await fetch(`/api/electronic-attendance/sessions/${attendanceSessionId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'launch',
          sendEmails: true,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erreur lors du lancement')
      }

      loadSessions()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    }
  }

  const handleCloseSession = async (attendanceSessionId: string) => {
    if (!confirm('Voulez-vous fermer cette session d\'émargement ? Les demandes non signées seront marquées comme expirées.')) {
      return
    }

    try {
      const response = await fetch(`/api/electronic-attendance/sessions/${attendanceSessionId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'close',
        }),
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
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'remind',
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erreur lors de l\'envoi du rappel')
      }

      alert('Rappel envoyé avec succès')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="secondary">Brouillon</Badge>
      case 'active':
        return <Badge className="bg-green-500">Active</Badge>
      case 'closed':
        return <Badge variant="outline">Fermée</Badge>
      case 'cancelled':
        return <Badge variant="destructive">Annulée</Badge>
      case 'signed':
        return <Badge className="bg-green-500">Signé</Badge>
      case 'pending':
        return <Badge variant="secondary">En attente</Badge>
      case 'expired':
        return <Badge variant="outline">Expiré</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  if (loading && sessions.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Description card */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">Gestion des émargements</h3>
              <p className="text-sm text-gray-600 mb-4">
                Deux modes d'émargement sont disponibles pour vos sessions de formation :
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 border rounded-lg bg-blue-50 border-blue-200">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-blue-900 mb-1">Émargement manuel</h4>
                    <p className="text-sm text-blue-700">
                      Cochez directement les présences, absences et retards depuis l'interface. Idéal pour les formations en présentiel avec contrôle direct.
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-4 border rounded-lg bg-green-50 border-green-200">
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-green-900 mb-1">Émargement numérique</h4>
                    <p className="text-sm text-green-700">
                      Envoyez automatiquement des demandes d'émargement par email avec signature électronique. Support de la géolocalisation pour valider la présence physique.
                    </p>
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
          <p className="text-sm text-gray-500">
            Créez et gérez les sessions d'émargement avec envoi d'emails automatiques aux apprenants
          </p>
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
              <DialogDescription>
                Créez une session d'émargement avec envoi automatique d'emails aux apprenants inscrits
              </DialogDescription>
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
                <Input
                  id="date"
                  type="date"
                  value={createForm.date}
                  onChange={(e) => setCreateForm({ ...createForm, date: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startTime">Heure de début</Label>
                  <Input
                    id="startTime"
                    type="time"
                    value={createForm.startTime}
                    onChange={(e) => setCreateForm({ ...createForm, startTime: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="endTime">Heure de fin</Label>
                  <Input
                    id="endTime"
                    type="time"
                    value={createForm.endTime}
                    onChange={(e) => setCreateForm({ ...createForm, endTime: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="requireGeolocation"
                  checked={createForm.requireGeolocation}
                  onCheckedChange={(checked) =>
                    setCreateForm({ ...createForm, requireGeolocation: checked as boolean })
                  }
                />
                <Label htmlFor="requireGeolocation" className="cursor-pointer">
                  Exiger la géolocalisation
                </Label>
              </div>

              {createForm.requireGeolocation && (
                <div>
                  <Label htmlFor="allowedRadiusMeters">Rayon autorisé (mètres)</Label>
                  <Input
                    id="allowedRadiusMeters"
                    type="number"
                    min="10"
                    value={createForm.allowedRadiusMeters}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, allowedRadiusMeters: parseInt(e.target.value) || 100 })
                    }
                  />
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)} disabled={creating}>
                Annuler
              </Button>
              <Button onClick={handleCreateSession} disabled={creating || !createForm.title}>
                {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Créer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Error */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Sessions list */}
      {sessions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-8 text-center">
            <p className="text-gray-500">Aucune session d'émargement</p>
            <p className="text-sm text-gray-400 mt-1">
              Créez une session pour commencer à gérer les émargements
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sessions.map((session) => (
            <Card key={session.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{session.title}</CardTitle>
                    <CardDescription>
                      {new Date(session.date).toLocaleDateString('fr-FR', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
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
                    {getStatusBadge(session.status)}
                    <Badge variant="outline">
                      {session.total_signed}/{session.total_expected}
                    </Badge>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Actions */}
                <div className="flex items-center gap-2">
                  {session.status === 'draft' && (
                    <Button onClick={() => handleLaunchSession(session.id)} size="sm">
                      <Send className="h-4 w-4 mr-2" />
                      Lancer
                    </Button>
                  )}

                  {session.status === 'active' && (
                    <Button onClick={() => handleCloseSession(session.id)} size="sm" variant="outline">
                      Fermer
                    </Button>
                  )}

                  <Button size="sm" variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Exporter
                  </Button>
                </div>

                {/* Requests table */}
                {session.requests && session.requests.length > 0 && (
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Apprenant</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Statut</TableHead>
                          <TableHead>Date de signature</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {session.requests.map((request) => (
                          <TableRow key={request.id}>
                            <TableCell className="font-medium">{request.student_name}</TableCell>
                            <TableCell>{request.student_email}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {getStatusBadge(request.status)}
                                {request.location_verified && (
                                  <MapPin className="h-3 w-3 text-green-500" title="Position vérifiée" />
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {request.signed_at
                                ? formatDistanceToNow(new Date(request.signed_at), {
                                    addSuffix: true,
                                    locale: fr,
                                  })
                                : '-'}
                            </TableCell>
                            <TableCell className="text-right">
                              {request.status === 'pending' && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleSendReminder(request.id)}
                                >
                                  <Mail className="h-4 w-4" />
                                </Button>
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
          ))}
        </div>
      )}
    </div>
  )
}
