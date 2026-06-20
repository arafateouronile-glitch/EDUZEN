'use client'

import { useState, useEffect, useRef } from 'react'
import { use } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/use-auth'
import { supportService } from '@/lib/services/support.service.client'
import { PlatformAdminGuard } from '@/components/super-admin/platform-admin-guard'
import { motion } from '@/components/ui/motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select-shadcn'
import {
  ArrowLeft,
  Send,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  User,
  Lock,
  MessageSquare,
  Building2,
  Tag,
  Calendar,
} from 'lucide-react'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'
import { toast } from 'sonner'

const statusLabels: Record<string, string> = {
  open: 'Ouvert',
  in_progress: 'En cours',
  waiting_customer: 'En attente client',
  resolved: 'Résolu',
  closed: 'Fermé',
}

const priorityLabels: Record<string, string> = {
  low: 'Basse',
  medium: 'Moyenne',
  high: 'Élevée',
  urgent: 'Urgente',
}

const statusColors: Record<string, string> = {
  open: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  waiting_customer: 'bg-orange-100 text-orange-800',
  resolved: 'bg-green-100 text-green-800',
  closed: 'bg-gray-100 text-gray-800',
}

const priorityColors: Record<string, string> = {
  low: 'bg-slate-100 text-slate-700',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-orange-100 text-orange-800',
  urgent: 'bg-red-100 text-red-800',
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'open': return <AlertCircle className="h-4 w-4 text-blue-600" />
    case 'in_progress': return <Clock className="h-4 w-4 text-yellow-600" />
    case 'waiting_customer': return <Clock className="h-4 w-4 text-orange-600" />
    case 'resolved': return <CheckCircle className="h-4 w-4 text-green-600" />
    case 'closed': return <XCircle className="h-4 w-4 text-gray-600" />
    default: return null
  }
}

export default function SuperAdminTicketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: ticketId } = use(params)
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [replyText, setReplyText] = useState('')
  const [noteText, setNoteText] = useState('')
  const [isInternalNote, setIsInternalNote] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const { data: ticket, isLoading: ticketLoading } = useQuery({
    queryKey: ['super-admin-ticket', ticketId],
    queryFn: () => supportService.getTicketById(ticketId),
    enabled: !!ticketId,
  })

  const { data: messages = [] } = useQuery({
    queryKey: ['super-admin-ticket-messages', ticketId],
    queryFn: () => supportService.getTicketMessages(ticketId),
    enabled: !!ticketId,
    refetchInterval: 5000,
  })

  const { data: notes = [] } = useQuery({
    queryKey: ['super-admin-ticket-notes', ticketId],
    queryFn: () => supportService.getTicketNotes(ticketId),
    enabled: !!ticketId,
  })

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendReplyMutation = useMutation({
    mutationFn: async (content: string) =>
      supportService.createMessage({
        ticket_id: ticketId,
        user_id: user?.id || '',
        content,
        message_type: 'text',
        is_internal: false,
      }),
    onSuccess: () => {
      setReplyText('')
      queryClient.invalidateQueries({ queryKey: ['super-admin-ticket-messages', ticketId] })
      toast.success('Réponse envoyée')
    },
    onError: () => toast.error('Erreur lors de l\'envoi'),
  })

  const addNoteMutation = useMutation({
    mutationFn: async (content: string) =>
      supportService.createNote({
        ticket_id: ticketId,
        user_id: user?.id || '',
        content,
        is_private: true,
      }),
    onSuccess: () => {
      setNoteText('')
      queryClient.invalidateQueries({ queryKey: ['super-admin-ticket-notes', ticketId] })
      toast.success('Note ajoutée')
    },
    onError: () => toast.error('Erreur lors de l\'ajout de la note'),
  })

  const updateStatusMutation = useMutation({
    mutationFn: async (status: string) => {
      const updates: Record<string, string> = { status }
      if (status === 'resolved') updates.resolved_at = new Date().toISOString()
      if (status === 'closed') updates.closed_at = new Date().toISOString()
      return supportService.updateTicket(ticketId, updates as Parameters<typeof supportService.updateTicket>[1])
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-admin-ticket', ticketId] })
      queryClient.invalidateQueries({ queryKey: ['super-admin-support-tickets'] })
      toast.success('Statut mis à jour')
    },
    onError: () => toast.error('Erreur lors de la mise à jour du statut'),
  })

  type Message = {
    id: string
    user_id?: string | null
    user?: { role?: string | null; full_name?: string | null; email?: string | null } | null
    content?: string | null
    created_at?: string | null
    is_internal?: boolean | null
  }

  type Note = {
    id: string
    content?: string | null
    user?: { full_name?: string | null; email?: string | null } | null
    created_at?: string | null
  }

  return (
    <PlatformAdminGuard>
      <div className="space-y-6">
        {ticketLoading ? (
          <div className="space-y-4">
            <div className="h-8 bg-muted animate-pulse rounded w-64" />
            <div className="h-[500px] bg-muted animate-pulse rounded" />
          </div>
        ) : !ticket ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <p className="text-lg font-semibold">Ticket introuvable</p>
            <Button variant="outline" asChild>
              <Link href="/super-admin/support"><ArrowLeft className="mr-2 h-4 w-4" />Retour</Link>
            </Button>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-start gap-4">
              <Button variant="ghost" size="icon" asChild>
                <Link href="/super-admin/support"><ArrowLeft className="h-5 w-5" /></Link>
              </Button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="font-mono text-sm text-muted-foreground">{ticket.ticket_number}</span>
                  <motion.h1
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-xl font-bold truncate"
                  >
                    {ticket.subject}
                  </motion.h1>
                </div>
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    {getStatusIcon(ticket.status || '')}
                    <span>{statusLabels[ticket.status || ''] || ticket.status}</span>
                  </div>
                  <Badge variant="outline" className={priorityColors[ticket.priority || '']}>
                    {priorityLabels[ticket.priority || ''] || ticket.priority}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    Créé le {formatDate(ticket.created_at || '')}
                  </span>
                </div>
              </div>

              {/* Changer le statut */}
              <Select
                value={ticket.status || ''}
                onValueChange={(value) => updateStatusMutation.mutate(value)}
              >
                <SelectTrigger className="w-44 shrink-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Ouvert</SelectItem>
                  <SelectItem value="in_progress">En cours</SelectItem>
                  <SelectItem value="waiting_customer">En attente client</SelectItem>
                  <SelectItem value="resolved">Résolu</SelectItem>
                  <SelectItem value="closed">Fermé</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Conversation */}
              <div className="lg:col-span-2 space-y-4">
                <Card className="flex flex-col" style={{ minHeight: '500px' }}>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <MessageSquare className="h-4 w-4" />
                      Conversation
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col">
                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-1" style={{ maxHeight: '380px' }}>
                      {/* Description initiale */}
                      <div className="flex justify-start">
                        <div className="max-w-[80%] rounded-lg p-3 bg-gray-100">
                          <div className="flex items-center gap-2 mb-1">
                            <User className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs font-medium text-muted-foreground">
                              {(ticket as { user?: { full_name?: string; email?: string } }).user?.full_name ||
                               (ticket as { user?: { full_name?: string; email?: string } }).user?.email ||
                               'Client'}
                            </span>
                            <span className="text-xs text-muted-foreground opacity-70">
                              {formatDate(ticket.created_at || '')}
                            </span>
                            <Badge variant="outline" className="text-xs py-0 px-1">Description</Badge>
                          </div>
                          <p className="text-sm whitespace-pre-wrap">{ticket.description}</p>
                        </div>
                      </div>

                      {/* Messages de la conversation */}
                      {(messages as Message[]).map((msg) => {
                        const isMine = msg.user_id === user?.id
                        const isSupport =
                          msg.user?.role === 'admin' ||
                          msg.user?.role === 'super_admin' ||
                          msg.user?.role === 'support'

                        return (
                          <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                            <div
                              className={`max-w-[80%] rounded-lg p-3 ${
                                isMine
                                  ? 'bg-primary text-primary-foreground'
                                  : isSupport
                                  ? 'bg-blue-50 border border-blue-200'
                                  : 'bg-gray-100'
                              }`}
                            >
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <User className="h-3 w-3 opacity-70" />
                                <span className="text-xs font-medium opacity-90">
                                  {msg.user?.full_name || msg.user?.email || 'Utilisateur'}
                                </span>
                                {isSupport && !isMine && (
                                  <Badge variant="outline" className="text-xs py-0 px-1 bg-blue-100 text-blue-700 border-blue-300">
                                    Support
                                  </Badge>
                                )}
                                <span className="text-xs opacity-60">{formatDate(msg.created_at || '')}</span>
                              </div>
                              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                            </div>
                          </div>
                        )
                      })}
                      <div ref={messagesEndRef} />
                    </div>

                    {/* Zone de réponse */}
                    {ticket.status !== 'closed' && (
                      <div className="border-t pt-4 space-y-2">
                        <div className="flex items-center gap-2 mb-2">
                          <button
                            type="button"
                            onClick={() => setIsInternalNote(false)}
                            className={`text-xs px-3 py-1 rounded-full transition-colors ${
                              !isInternalNote
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted text-muted-foreground hover:bg-muted/80'
                            }`}
                          >
                            Répondre au client
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsInternalNote(true)}
                            className={`text-xs px-3 py-1 rounded-full transition-colors flex items-center gap-1 ${
                              isInternalNote
                                ? 'bg-amber-500 text-white'
                                : 'bg-muted text-muted-foreground hover:bg-muted/80'
                            }`}
                          >
                            <Lock className="h-3 w-3" />
                            Note interne
                          </button>
                        </div>

                        {isInternalNote ? (
                          <div className="flex gap-2">
                            <Textarea
                              value={noteText}
                              onChange={(e) => setNoteText(e.target.value)}
                              placeholder="Note interne (visible uniquement par l'équipe support)…"
                              rows={3}
                              className="flex-1 border-amber-300 focus-visible:ring-amber-400"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && noteText.trim()) {
                                  addNoteMutation.mutate(noteText)
                                }
                              }}
                            />
                            <Button
                              onClick={() => addNoteMutation.mutate(noteText)}
                              disabled={addNoteMutation.isPending || !noteText.trim()}
                              variant="outline"
                              className="self-end border-amber-300"
                            >
                              <Send className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <Textarea
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              placeholder="Tapez votre réponse… (Ctrl+Entrée pour envoyer)"
                              rows={3}
                              className="flex-1"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && replyText.trim()) {
                                  sendReplyMutation.mutate(replyText)
                                }
                              }}
                            />
                            <Button
                              onClick={() => sendReplyMutation.mutate(replyText)}
                              disabled={sendReplyMutation.isPending || !replyText.trim()}
                              className="self-end"
                            >
                              <Send className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    )}

                    {ticket.status === 'closed' && (
                      <p className="text-sm text-muted-foreground text-center border-t pt-4">
                        Ce ticket est fermé.
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Notes internes */}
                {(notes as Note[]).length > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-base text-amber-700">
                        <Lock className="h-4 w-4" />
                        Notes internes ({(notes as Note[]).length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {(notes as Note[]).map((note) => (
                        <div key={note.id} className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                          <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                          <p className="text-xs text-muted-foreground mt-2">
                            Par {note.user?.full_name || note.user?.email} — {formatDate(note.created_at || '')}
                          </p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Sidebar */}
              <div className="space-y-4">
                {/* Infos ticket */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Informations</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="flex items-start gap-2">
                      <User className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">Demandeur</p>
                        <p className="font-medium">
                          {(ticket as { user?: { full_name?: string; email?: string } }).user?.full_name ||
                           (ticket as { user?: { full_name?: string; email?: string } }).user?.email || '—'}
                        </p>
                        {(ticket as { user?: { full_name?: string; email?: string } }).user?.email &&
                         (ticket as { user?: { full_name?: string; email?: string } }).user?.full_name && (
                          <p className="text-xs text-muted-foreground">
                            {(ticket as { user?: { full_name?: string; email?: string } }).user?.email}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">Organisation</p>
                        <p className="font-medium">
                          {(ticket as { organization?: { name?: string } }).organization?.name ||
                           ticket.organization_id?.slice(0, 8) + '…'}
                        </p>
                      </div>
                    </div>

                    {ticket.category && (
                      <div className="flex items-start gap-2">
                        <Tag className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs text-muted-foreground">Catégorie</p>
                          <p className="font-medium">
                            {(ticket.category as { name?: string }).name}
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="flex items-start gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">Créé le</p>
                        <p className="font-medium">{formatDate(ticket.created_at || '')}</p>
                      </div>
                    </div>

                    {ticket.first_response_at && (
                      <div className="flex items-start gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs text-muted-foreground">Première réponse</p>
                          <p className="font-medium">{formatDate(ticket.first_response_at)}</p>
                        </div>
                      </div>
                    )}

                    {ticket.resolved_at && (
                      <div className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs text-muted-foreground">Résolu le</p>
                          <p className="font-medium">{formatDate(ticket.resolved_at)}</p>
                        </div>
                      </div>
                    )}

                    {ticket.assigned_to && (
                      <div className="flex items-start gap-2">
                        <User className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs text-muted-foreground">Assigné à</p>
                          <p className="font-medium">
                            {(ticket as { assigned_user?: { full_name?: string; email?: string } }).assigned_user?.full_name ||
                             (ticket as { assigned_user?: { full_name?: string; email?: string } }).assigned_user?.email || '—'}
                          </p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Statut actuel */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Statut</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Badge className={`${statusColors[ticket.status || '']} w-full justify-center py-1.5`}>
                      {getStatusIcon(ticket.status || '')}
                      <span className="ml-1">{statusLabels[ticket.status || ''] || ticket.status}</span>
                    </Badge>
                    <div className="grid grid-cols-2 gap-2">
                      {ticket.status !== 'resolved' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-green-700 border-green-300 hover:bg-green-50"
                          onClick={() => updateStatusMutation.mutate('resolved')}
                          disabled={updateStatusMutation.isPending}
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Résoudre
                        </Button>
                      )}
                      {ticket.status !== 'closed' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-gray-600 border-gray-300 hover:bg-gray-50"
                          onClick={() => updateStatusMutation.mutate('closed')}
                          disabled={updateStatusMutation.isPending}
                        >
                          <XCircle className="h-3 w-3 mr-1" />
                          Fermer
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </>
        )}
      </div>
    </PlatformAdminGuard>
  )
}
