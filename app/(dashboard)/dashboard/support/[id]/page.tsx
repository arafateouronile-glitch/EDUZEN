'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/use-auth'
import { supportService } from '@/lib/services/support.service'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
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
  Star,
  MessageSquare,
  Paperclip,
} from 'lucide-react'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'

export default function SupportTicketPage() {
  const params = useParams()
  const router = useRouter()
  const ticketId = params.id as string
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [message, setMessage] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Récupérer le ticket
  const { data: ticket } = useQuery({
    queryKey: ['support-ticket', ticketId],
    queryFn: () => supportService.getTicketById(ticketId),
    enabled: !!ticketId,
  })

  // Récupérer les messages
  const { data: messages } = useQuery({
    queryKey: ['support-ticket-messages', ticketId],
    queryFn: () => supportService.getTicketMessages(ticketId),
    enabled: !!ticketId,
    refetchInterval: 5000, // Rafraîchir toutes les 5 secondes
  })

  // Récupérer les notes (si support staff)
  const { data: notes } = useQuery({
    queryKey: ['support-ticket-notes', ticketId],
    queryFn: () => supportService.getTicketNotes(ticketId),
    enabled: !!ticketId && (user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'support'),
  })

  // Récupérer la note (si client)
  const { data: rating } = useQuery({
    queryKey: ['support-ticket-rating', ticketId],
    queryFn: () => supportService.getTicketRating(ticketId),
    enabled: !!ticketId && ticket?.status === 'resolved',
  })

  // Créer un message
  const createMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      return supportService.createMessage({
        ticket_id: ticketId,
        user_id: user?.id || '',
        content,
        message_type: 'text',
        is_internal: false,
      })
    },
    onSuccess: () => {
      setMessage('')
      queryClient.invalidateQueries({ queryKey: ['support-ticket-messages'] })
      queryClient.invalidateQueries({ queryKey: ['support-ticket'] })
    },
  })

  // Mettre à jour le statut
  const updateStatusMutation = useMutation({
    mutationFn: async (status: string) => {
      const updates: any = { status }
      if (status === 'resolved') {
        updates.resolved_at = new Date().toISOString()
      } else if (status === 'closed') {
        updates.closed_at = new Date().toISOString()
      }
      return supportService.updateTicket(ticketId, updates)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-ticket'] })
      queryClient.invalidateQueries({ queryKey: ['support-tickets'] })
    },
  })

  // Assigner le ticket
  const assignTicketMutation = useMutation({
    mutationFn: async (userId: string) => {
      return supportService.assignTicket(ticketId, userId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-ticket'] })
    },
  })

  // Créer une note
  const createNoteMutation = useMutation({
    mutationFn: async (content: string) => {
      return supportService.createNote({
        ticket_id: ticketId,
        user_id: user?.id || '',
        content,
        is_private: true,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-ticket-notes'] })
    },
  })

  // Créer une évaluation
  const createRatingMutation = useMutation({
    mutationFn: async (data: { rating: number; comment?: string }) => {
      return supportService.createRating({
        ticket_id: ticketId,
        user_id: user?.id || '',
        rating: data.rating,
        comment: data.comment,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-ticket-rating'] })
    },
  })

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (message.trim()) {
      createMessageMutation.mutate(message)
    }
  }

  const isSupportStaff = user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'support'
  const isTicketOwner = ticket?.user_id === user?.id

  // Scroll vers le bas quand de nouveaux messages arrivent
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open':
        return <AlertCircle className="h-4 w-4 text-blue-600" />
      case 'in_progress':
        return <Clock className="h-4 w-4 text-yellow-600" />
      case 'waiting_customer':
        return <Clock className="h-4 w-4 text-orange-600" />
      case 'resolved':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'closed':
        return <XCircle className="h-4 w-4 text-gray-600" />
      default:
        return null
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'open':
        return 'Ouvert'
      case 'in_progress':
        return 'En cours'
      case 'waiting_customer':
        return 'En attente client'
      case 'resolved':
        return 'Résolu'
      case 'closed':
        return 'Fermé'
      default:
        return status
    }
  }

  if (!ticket) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        <div className="text-center py-12">Chargement...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-6">
        <Link href="/dashboard/support">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour aux tickets
          </Button>
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="font-mono text-sm text-muted-foreground">
                {ticket.ticket_number}
              </span>
              <h1 className="text-3xl font-bold">{ticket.subject}</h1>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                {getStatusIcon(ticket.status)}
                <span>{getStatusLabel(ticket.status)}</span>
              </div>
              <span>Créé le {formatDate(ticket.created_at || '')}</span>
              {ticket.category && <span>{ticket.category.name}</span>}
            </div>
          </div>
          {isSupportStaff && (
            <div className="flex items-center gap-2">
              <Select
                value={ticket.status || ''}
                onValueChange={(value) => updateStatusMutation.mutate(value)}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Ouvert</SelectItem>
                  <SelectItem value="in_progress">En cours</SelectItem>
                  <SelectItem value="waiting_customer">En attente</SelectItem>
                  <SelectItem value="resolved">Résolu</SelectItem>
                  <SelectItem value="closed">Fermé</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chat / Messages */}
        <div className="lg:col-span-2">
          <Card className="h-[600px] flex flex-col">
            <CardHeader>
              <CardTitle>Conversation</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col overflow-hidden">
              {/* Messages */}
              <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
                {messages && messages.length > 0 ? (
                  messages.map((msg: any) => {
                    const isOwnMessage = msg.user_id === user?.id
                    const isSupportMessage = msg.user?.role === 'admin' || msg.user?.role === 'super_admin' || msg.user?.role === 'support'

                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-lg p-3 ${
                            isOwnMessage
                              ? 'bg-primary text-white'
                              : isSupportMessage
                              ? 'bg-blue-50 border border-blue-200'
                              : 'bg-gray-100'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <User className="h-4 w-4" />
                            <span className="text-sm font-medium">
                              {msg.user?.full_name || msg.user?.email || 'Utilisateur'}
                            </span>
                            <span className="text-xs opacity-70">
                              {formatDate(msg.created_at)}
                            </span>
                          </div>
                          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    Aucun message pour le moment
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Formulaire de message */}
              {(ticket.status !== 'closed' && (isTicketOwner || isSupportStaff)) && (
                <form onSubmit={handleSendMessage} className="border-t pt-4">
                  <div className="flex gap-2">
                    <Textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Tapez votre message..."
                      rows={3}
                      className="flex-1"
                    />
                    <Button type="submit" disabled={createMessageMutation.isPending || !message.trim()}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Informations du ticket */}
          <Card>
            <CardHeader>
              <CardTitle>Informations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground">Priorité</Label>
                <p className="font-medium">{ticket.priority}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Créé par</Label>
                <p className="font-medium">
                  {(ticket as any).user?.full_name || (ticket as any).user?.email || 'Utilisateur'}
                </p>
              </div>
              {ticket.assigned_user && (
                <div>
                  <Label className="text-xs text-muted-foreground">Assigné à</Label>
                  <p className="font-medium">
                    {(ticket as any).assigned_user?.full_name || (ticket as any).assigned_user?.email}
                  </p>
                </div>
              )}
              {ticket.first_response_at && (
                <div>
                  <Label className="text-xs text-muted-foreground">Première réponse</Label>
                  <p className="font-medium">{formatDate(ticket.first_response_at)}</p>
                </div>
              )}
              {ticket.resolved_at && (
                <div>
                  <Label className="text-xs text-muted-foreground">Résolu le</Label>
                  <p className="font-medium">{formatDate(ticket.resolved_at)}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Description originale */}
          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{ticket.description}</p>
            </CardContent>
          </Card>

          {/* Notes internes (support seulement) */}
          {isSupportStaff && (
            <Card>
              <CardHeader>
                <CardTitle>Notes internes</CardTitle>
              </CardHeader>
              <CardContent>
                {notes && notes.length > 0 ? (
                  <div className="space-y-3 mb-4">
                    {notes.map((note: any) => (
                      <div key={note.id} className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                        <p className="text-xs text-muted-foreground mt-2">
                          Par {note.user?.full_name || note.user?.email} le{' '}
                          {formatDate(note.created_at)}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : null}
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    const formData = new FormData(e.currentTarget)
                    const content = formData.get('note') as string
                    if (content.trim()) {
                      createNoteMutation.mutate(content)
                      e.currentTarget.reset()
                    }
                  }}
                >
                  <Textarea
                    name="note"
                    placeholder="Ajouter une note interne..."
                    rows={3}
                    className="mb-2"
                  />
                  <Button type="submit" size="sm" disabled={createNoteMutation.isPending}>
                    Ajouter
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Évaluation (client seulement, ticket résolu) */}
          {isTicketOwner && ticket.status === 'resolved' && !rating && (
            <Card>
              <CardHeader>
                <CardTitle>Évaluer le support</CardTitle>
              </CardHeader>
              <CardContent>
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    const formData = new FormData(e.currentTarget)
                    const rating = parseInt(formData.get('rating') as string)
                    const comment = formData.get('comment') as string
                    createRatingMutation.mutate({ rating, comment })
                  }}
                  className="space-y-4"
                >
                  <div>
                    <Label>Note</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner une note" />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5].map((num) => (
                          <SelectItem key={num} value={num.toString()}>
                            {num} étoile{num > 1 ? 's' : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Commentaire (optionnel)</Label>
                    <Textarea name="comment" rows={3} />
                  </div>
                  <Button type="submit" disabled={createRatingMutation.isPending}>
                    Envoyer l'évaluation
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Afficher l'évaluation si elle existe */}
          {rating && (
            <Card>
              <CardHeader>
                <CardTitle>Votre évaluation</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 mb-2">
                  <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                  <span className="font-semibold">{rating.rating} / 5</span>
                </div>
                {rating.comment && (
                  <p className="text-sm text-muted-foreground">{rating.comment}</p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
