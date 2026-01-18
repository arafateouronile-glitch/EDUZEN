'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/use-auth'
import { supportService } from '@/lib/services/support.service'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select-shadcn'
import {
  Plus,
  MessageSquare,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Filter,
  Search,
} from 'lucide-react'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'

export default function SupportPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [newTicketDialogOpen, setNewTicketDialogOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')

  // Récupérer les catégories
  const { data: categories = [] } = useQuery({
    queryKey: ['support-categories', user?.organization_id],
    queryFn: async () => {
      try {
        return await supportService.getCategories(user?.organization_id || '')
      } catch (error: any) {
        // Si la table n'existe pas encore ou erreur 404, retourner un tableau vide
        if (
          error?.code === 'PGRST116' ||
          error?.code === '42P01' ||
          error?.code === 'PGRST301' ||
          error?.status === 404 ||
          error?.code === '404' ||
          error?.message?.includes('relation') ||
          error?.message?.includes('relationship') ||
          error?.message?.includes('does not exist') ||
          error?.message?.includes('schema cache')
        ) {
          console.warn('Error fetching support categories:', error?.message)
          return []
        }
        throw error
      }
    },
    enabled: !!user?.organization_id,
    retry: false,
  })

  // Récupérer les tickets
  const { data: tickets = [] } = useQuery({
    queryKey: ['support-tickets', user?.organization_id, statusFilter, priorityFilter],
    queryFn: async () => {
      try {
        const filters: any = {}
        if (statusFilter !== 'all') filters.status = statusFilter
        if (priorityFilter !== 'all') filters.priority = priorityFilter
        
        // Si l'utilisateur n'est pas admin/support, filtrer par user_id
        if (user?.role !== 'admin' && user?.role !== 'super_admin' && user?.role !== 'support') {
          filters.userId = user?.id
        }
        
        return await supportService.getTickets(user?.organization_id || '', filters)
      } catch (error: any) {
        // Si la table n'existe pas encore ou erreur 404/400, retourner un tableau vide
        if (
          error?.code === 'PGRST116' ||
          error?.code === '42P01' ||
          error?.code === 'PGRST301' ||
          error?.status === 404 ||
          error?.status === 400 ||
          error?.code === '404' ||
          error?.code === '400' ||
          error?.message?.includes('relation') ||
          error?.message?.includes('relationship') ||
          error?.message?.includes('does not exist') ||
          error?.message?.includes('schema cache') ||
          error?.message?.includes('Could not find a relationship')
        ) {
          // Ne pas logger en mode production pour éviter le bruit dans la console
          if (process.env.NODE_ENV === 'development') {
            console.warn('Error fetching support tickets:', error?.message)
          }
          return []
        }
        throw error
      }
    },
    enabled: !!user?.organization_id,
    retry: false,
  })

  // Créer un ticket
  const createTicketMutation = useMutation({
    mutationFn: async (data: any) => {
      return supportService.createTicket({
        ...data,
        organization_id: user?.organization_id,
        user_id: user?.id,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-tickets'] })
      setNewTicketDialogOpen(false)
    },
  })

  const handleCreateTicket = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const data = {
      category_id: formData.get('category_id') as string || null,
      subject: formData.get('subject') as string,
      description: formData.get('description') as string,
      priority: formData.get('priority') as string || 'medium',
      tags: (formData.get('tags') as string)?.split(',').map((t) => t.trim()).filter(Boolean) || [],
    }

    createTicketMutation.mutate(data)
  }

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

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800'
      case 'high':
        return 'bg-orange-100 text-orange-800'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800'
      case 'low':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'Urgent'
      case 'high':
        return 'Élevée'
      case 'medium':
        return 'Moyenne'
      case 'low':
        return 'Basse'
      default:
        return priority
    }
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Support client</h1>
            <p className="text-muted-foreground">
              Gérez vos demandes de support et suivez vos tickets
            </p>
          </div>
          <Dialog open={newTicketDialogOpen} onOpenChange={setNewTicketDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nouveau ticket
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Nouveau ticket de support</DialogTitle>
                <DialogDescription>
                  Créez un nouveau ticket pour obtenir de l'aide
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateTicket}>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="category_id">Catégorie</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner une catégorie" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories?.map((cat: any) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="subject">Sujet *</Label>
                    <Input
                      id="subject"
                      name="subject"
                      required
                      placeholder="Décrivez brièvement votre problème"
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Description *</Label>
                    <Textarea
                      id="description"
                      name="description"
                      required
                      rows={6}
                      placeholder="Décrivez votre problème en détail..."
                    />
                  </div>
                  <div>
                    <Label htmlFor="priority">Priorité</Label>
                    <Select defaultValue="medium">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Basse</SelectItem>
                        <SelectItem value="medium">Moyenne</SelectItem>
                        <SelectItem value="high">Élevée</SelectItem>
                        <SelectItem value="urgent">Urgente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="tags">Tags (séparés par des virgules)</Label>
                    <Input
                      id="tags"
                      name="tags"
                      placeholder="bug, facturation, fonctionnalité"
                    />
                  </div>
                </div>
                <DialogFooter className="mt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setNewTicketDialogOpen(false)}
                  >
                    Annuler
                  </Button>
                  <Button type="submit" disabled={createTicketMutation.isPending}>
                    Créer le ticket
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filtres */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Label>Statut:</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="open">Ouvert</SelectItem>
                  <SelectItem value="in_progress">En cours</SelectItem>
                  <SelectItem value="waiting_customer">En attente</SelectItem>
                  <SelectItem value="resolved">Résolu</SelectItem>
                  <SelectItem value="closed">Fermé</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Label>Priorité:</Label>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes</SelectItem>
                  <SelectItem value="urgent">Urgente</SelectItem>
                  <SelectItem value="high">Élevée</SelectItem>
                  <SelectItem value="medium">Moyenne</SelectItem>
                  <SelectItem value="low">Basse</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Liste des tickets */}
      <Card>
        <CardHeader>
          <CardTitle>Mes tickets</CardTitle>
        </CardHeader>
        <CardContent>
          {tickets && tickets.length > 0 ? (
            <div className="space-y-4">
              {tickets.map((ticket: any) => (
                <Link
                  key={ticket.id}
                  href={`/dashboard/support/${ticket.id}`}
                  className="block"
                >
                  <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="font-mono text-sm text-muted-foreground">
                              {ticket.ticket_number}
                            </span>
                            <h3 className="font-semibold text-lg">{ticket.subject}</h3>
                            <span
                              className={`text-xs px-2 py-1 rounded ${getPriorityColor(
                                ticket.priority
                              )}`}
                            >
                              {getPriorityLabel(ticket.priority)}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                            {ticket.description}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              {getStatusIcon(ticket.status)}
                              <span>{getStatusLabel(ticket.status)}</span>
                            </div>
                            <span>Créé le {formatDate(ticket.created_at)}</span>
                            {ticket.category && (
                              <span>{ticket.category.name}</span>
                            )}
                            {ticket.assigned_user && (
                              <span>Assigné à {ticket.assigned_user.full_name}</span>
                            )}
                          </div>
                        </div>
                        <MessageSquare className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              Aucun ticket trouvé
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
