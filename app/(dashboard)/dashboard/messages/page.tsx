'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/use-auth'
import { messagingService } from '@/lib/services/messaging.service'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Search, MessageSquare, Users, Plus, MoreVertical, Loader2, AlertCircle, Trash2, Archive } from 'lucide-react'
import Link from 'next/link'
import { formatRelativeTime } from '@/lib/utils'
import { useToast } from '@/components/ui/toast'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export default function MessagesPage() {
  const router = useRouter()
  const { user } = useAuth()
  const supabase = createClient()
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const [searchQuery, setSearchQuery] = useState('')
  const [showNewConversationDialog, setShowNewConversationDialog] = useState(false)
  const [userSearchQuery, setUserSearchQuery] = useState('')
  const [conversationType, setConversationType] = useState<'group' | 'personal'>('personal')
  const [selectedSessionId, setSelectedSessionId] = useState<string>('')
  const [selectedStudentId, setSelectedStudentId] = useState<string>('')

  // Récupérer les conversations
  const { data: conversations } = useQuery({
    queryKey: ['conversations', user?.id, user?.organization_id],
    queryFn: () =>
      messagingService.getConversations(user?.id || '', user?.organization_id || ''),
    enabled: !!user?.id && !!user?.organization_id,
  })

  // Mutation pour archiver/supprimer une conversation
  const deleteConversationMutation = useMutation({
    mutationFn: async (conversationId: string) => {
      return messagingService.deleteConversation(conversationId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
      addToast({
        type: 'success',
        title: 'Conversation supprimée',
        description: 'La conversation a été supprimée avec succès.',
      })
    },
    onError: (error) => {
      addToast({
        type: 'error',
        title: 'Erreur',
        description: 'Impossible de supprimer la conversation. Veuillez réessayer.',
      })
    },
  })

  // Récupérer les sessions pour les messages groupés
  const { data: sessions, isLoading: isLoadingSessions } = useQuery({
    queryKey: ['sessions-for-messages', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return []
      const { data, error } = await supabase
        .from('sessions')
        .select('id, name, start_date, end_date, formations(name)')
        .eq('organization_id', user.organization_id)
        .order('start_date', { ascending: false })
        .limit(100)
      
      if (error) throw error
      return data || []
    },
    enabled: !!user?.organization_id && showNewConversationDialog,
  })

  // Récupérer les étudiants (candidats) d'une session sélectionnée
  const { data: sessionStudents, isLoading: isLoadingStudents } = useQuery({
    queryKey: ['session-students', selectedSessionId],
    queryFn: async () => {
      if (!selectedSessionId) return []
      
      // Récupérer les inscriptions avec les étudiants
      const { data: enrollments, error: enrollmentsError } = await supabase
        .from('enrollments')
        .select(`
          student_id,
          status,
          students!inner(id, first_name, last_name, student_number, email)
        `)
        .eq('session_id', selectedSessionId)
      
      if (enrollmentsError) {
        console.error('Erreur récupération inscriptions:', enrollmentsError)
        throw enrollmentsError
      }
      
      if (!enrollments || enrollments.length === 0) return []
      
      // Filtrer les inscriptions annulées/rejetées/abandonnées côté client
      const validEnrollments = enrollments.filter((e: any) => {
        const status = e.status
        return status !== 'cancelled' && status !== 'rejected' && status !== 'dropped'
      })
      
      if (validEnrollments.length === 0) return []
      
      // Retourner les étudiants directement (on n'a plus besoin de créer des comptes utilisateur)
      // Les conversations peuvent maintenant être liées directement aux étudiants via student_id
      const result = validEnrollments.map((enrollment: any) => {
        const student = enrollment.students
        return {
          student,
          user: null, // On n'a plus besoin de chercher un utilisateur
          enrollmentId: enrollment.student_id,
        }
      })
      
      return result
    },
    enabled: !!selectedSessionId && conversationType === 'personal',
  })

  // Récupérer les utilisateurs de l'organisation pour créer une conversation (fallback)
  const { data: organizationUsers, isLoading: isLoadingUsers } = useQuery({
    queryKey: ['organization-users', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return []
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, email, avatar_url, role')
        .eq('organization_id', user.organization_id)
        .neq('id', user.id) // Exclure l'utilisateur actuel
        .order('full_name')
      
      if (error) throw error
      return data || []
    },
    enabled: !!user?.organization_id && showNewConversationDialog && conversationType === 'personal' && !selectedSessionId,
  })

  // Mutation pour créer une conversation directe
  const createDirectConversationMutation = useMutation({
    mutationFn: async ({ userId, studentId }: { userId?: string; studentId?: string }) => {
      if (!user?.id || !user?.organization_id) {
        throw new Error('Utilisateur non authentifié')
      }
      if (!userId && !studentId) {
        throw new Error('Either userId or studentId must be provided')
      }
      
      try {
        const conversation = await messagingService.createDirectConversation(
          user.id,
          userId || null,
          user.organization_id,
          studentId || null
        )
        return conversation
      } catch (error) {
        throw error
      }
    },
    onSuccess: (conversation) => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
      setShowNewConversationDialog(false)
      resetDialogState()
      router.push(`/dashboard/messages/${conversation.id}`)
      addToast({
        type: 'success',
        title: 'Conversation créée',
        description: 'La conversation a été créée avec succès.',
      })
    },
    onError: (error) => {
      addToast({
        type: 'error',
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Une erreur est survenue lors de la création de la conversation.',
      })
    },
  })

  // Mutation pour créer une conversation de groupe
  const createGroupConversationMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id || !user?.organization_id) {
        throw new Error('Utilisateur non authentifié')
      }
      if (!selectedSessionId) {
        throw new Error('Veuillez sélectionner une session')
      }

      // Récupérer tous les étudiants de la session
      const { data: enrollments, error } = await supabase
        .from('enrollments')
        .select(`
          student_id,
          status,
          students!inner(id, email)
        `)
        .eq('session_id', selectedSessionId)

      if (error) throw error

      // Filtrer les inscriptions annulées/rejetées/abandonnées côté client
      const validEnrollments = (enrollments || []).filter((e: any) => {
        const status = e.status
        return status !== 'cancelled' && status !== 'rejected' && status !== 'dropped'
      })

      // Extraire les IDs des étudiants
      const allStudentIds = validEnrollments
        .map((e: any) => e.students?.id)
        .filter((id: string | null) => id)

      // Récupérer les utilisateurs qui ont un compte (pour ceux qui en ont un)
      let userIds: string[] = []
      if (allStudentIds.length > 0) {
        const { data: users, error: usersError } = await supabase
          .from('users')
          .select('id')
          .in('id', allStudentIds)
          .eq('organization_id', user.organization_id)
        
        if (!usersError && users) {
          userIds = users
            .map((u: any) => u.id)
            .filter((id: string) => id !== user.id) // Exclure l'utilisateur actuel
        }
      }

      // Filtrer les étudiants qui n'ont pas de compte utilisateur
      // Ceux-ci seront ajoutés directement avec leur student_id
      const studentIdsWithoutUser = allStudentIds.filter((studentId: string) => {
        // Si l'étudiant n'est pas dans la liste des userIds trouvés, il n'a pas de compte
        return !userIds.includes(studentId) && studentId !== user.id
      })

      // Ajouter l'utilisateur actuel
      const allUserIds = [user.id, ...userIds]

      // Récupérer le nom de la session
      const session = sessions?.find((s: any) => s.id === selectedSessionId)
      const sessionName = session ? `Session: ${(session as any).name}` : 'Groupe de session'

      return messagingService.createGroupConversation(
        sessionName,
        allUserIds,
        user.organization_id,
        user.id,
        studentIdsWithoutUser // Passer les studentIds des étudiants sans compte
      )
    },
    onSuccess: (conversation) => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
      setShowNewConversationDialog(false)
      resetDialogState()
      router.push(`/dashboard/messages/${conversation.id}`)
      addToast({
        type: 'success',
        title: 'Conversation de groupe créée',
        description: 'La conversation de groupe a été créée avec succès.',
      })
    },
    onError: (error) => {
      addToast({
        type: 'error',
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Une erreur est survenue lors de la création de la conversation de groupe.',
      })
    },
  })

  const resetDialogState = () => {
    setUserSearchQuery('')
    setConversationType('personal')
    setSelectedSessionId('')
    setSelectedStudentId('')
  }

  const filteredUsers = organizationUsers?.filter((u) => {
    if (!userSearchQuery) return true
    const searchLower = userSearchQuery.toLowerCase()
    return (
      (u as any).full_name?.toLowerCase().includes(searchLower) ||
      (u as any).email?.toLowerCase().includes(searchLower)
    )
  })

  const getConversationName = (conversation: any) => {
    if (conversation.conversation_type === 'group' && conversation.name) {
      return conversation.name
    }
    // Pour les conversations directes, afficher le nom de l'autre participant (admin ou étudiant)
    if (conversation.participants) {
      const otherParticipant = conversation.participants.find(
        (p: any) => p.user_id !== user?.id
      )
      
      // Si c'est un utilisateur (admin)
      if (otherParticipant?.user) {
        return otherParticipant.user.full_name || otherParticipant.user.email || 'Conversation'
      }
      
      // Si c'est un étudiant
      if (otherParticipant?.student) {
        const studentName = `${otherParticipant.student.first_name || ''} ${otherParticipant.student.last_name || ''}`.trim()
        return studentName || otherParticipant.student.email || `Candidat ${otherParticipant.student.student_number || ''}` || 'Conversation'
      }
    }
    return 'Conversation'
  }

  const getConversationAvatar = (conversation: any) => {
    if (conversation.avatar_url) {
      return conversation.avatar_url
    }
    if (conversation.conversation_type === 'direct' && conversation.participants) {
      const otherParticipant = conversation.participants.find(
        (p: any) => p.user_id !== user?.id
      )
      // Si c'est un utilisateur (admin)
      if (otherParticipant?.user) {
        return otherParticipant.user.avatar_url
      }
      // Si c'est un étudiant, pas d'avatar pour l'instant
      return null
    }
    return null
  }

  const getUnreadCount = (conversation: any) => {
    // TODO: Implémenter le comptage des messages non lus
    return 0
  }

  const filteredConversations = conversations?.filter((conv: any) => {
    if (!searchQuery) return true
    const name = getConversationName(conv).toLowerCase()
    return name.includes(searchQuery.toLowerCase())
  })

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-3 mb-2">
              <div className="p-2.5 bg-gradient-to-br from-brand-blue to-brand-cyan rounded-xl shadow-lg">
                <MessageSquare className="h-7 w-7 text-white" />
              </div>
              <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-brand-blue to-brand-cyan bg-clip-text text-transparent">
                Messages
              </h1>
            </div>
            <p className="text-gray-600 text-sm lg:text-base ml-1">
              Communiquez avec vos collègues et candidats
            </p>
          </div>
          <Button
            onClick={() => setShowNewConversationDialog(true)}
            className="bg-gradient-to-r from-brand-blue to-brand-cyan hover:from-brand-blue-dark hover:to-brand-cyan shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle conversation
          </Button>
        </div>

        {/* Barre de recherche */}
        <Card className="border-brand-blue/20 bg-gradient-to-br from-brand-blue-ghost/30 to-brand-cyan-ghost/30 backdrop-blur-sm shadow-sm hover:shadow-md transition-all duration-300">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-brand-blue" />
              <Input
                type="text"
                placeholder="Rechercher une conversation..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 border-brand-blue/20 focus:border-brand-blue focus:ring-brand-blue"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Liste des conversations */}
      <div className="space-y-3">
        {filteredConversations && filteredConversations.length > 0 ? (
          filteredConversations.map((conversation: any) => {
            const name = getConversationName(conversation)
            const avatar = getConversationAvatar(conversation)
            const unreadCount = getUnreadCount(conversation)
            // Le last_message peut être un objet ou un tableau selon la requête Supabase
            const lastMessage = Array.isArray(conversation.last_message)
              ? conversation.last_message[0]
              : conversation.last_message

            return (
              <div key={conversation.id}>
                <Card className="group border-brand-blue/10 hover:border-brand-blue/30 hover:shadow-lg transition-all duration-300 hover:scale-[1.02] cursor-pointer bg-gradient-to-br from-white to-brand-blue-ghost/20">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-4">
                      <Link href={`/dashboard/messages/${conversation.id}`} className="flex-1 flex items-center gap-4">
                        {/* Avatar */}
                        <div className="flex-shrink-0 relative">
                          {avatar ? (
                            <img
                              src={avatar}
                              alt={name}
                              className="h-14 w-14 rounded-full object-cover ring-2 ring-brand-blue/20 group-hover:ring-brand-blue/40 transition-all"
                            />
                          ) : (
                            <div className="h-14 w-14 rounded-full bg-gradient-to-br from-brand-blue-ghost to-brand-cyan-ghost flex items-center justify-center ring-2 ring-brand-blue/20 group-hover:ring-brand-blue/40 transition-all">
                              {conversation.conversation_type === 'group' ? (
                                <Users className="h-7 w-7 text-brand-blue" />
                              ) : (
                                <MessageSquare className="h-7 w-7 text-brand-cyan" />
                              )}
                            </div>
                          )}
                          {unreadCount > 0 && (
                            <div className="absolute -top-1 -right-1 h-5 w-5 bg-brand-cyan rounded-full flex items-center justify-center shadow-lg">
                              <span className="text-white text-xs font-bold">{unreadCount}</span>
                            </div>
                          )}
                        </div>

                        {/* Contenu */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold text-gray-900 truncate text-lg group-hover:text-brand-blue transition-colors">
                              {name}
                            </h3>
                            {conversation.last_message_at && (
                              <span className="text-xs text-gray-500 flex-shrink-0 ml-2 font-medium">
                                {formatRelativeTime(conversation.last_message_at)}
                              </span>
                            )}
                          </div>
                          {lastMessage && (
                            <div className="flex items-center gap-2">
                              <p className="text-sm text-gray-600 truncate">
                                <span className="font-medium text-gray-700">
                                  {lastMessage.sender?.full_name || lastMessage.sender?.email ||
                                   (lastMessage.student_sender ?
                                     `${lastMessage.student_sender.first_name || ''} ${lastMessage.student_sender.last_name || ''}`.trim() ||
                                     lastMessage.student_sender.email ||
                                     `Candidat ${lastMessage.student_sender.student_number || ''}` :
                                     'Expéditeur')}
                                </span>
                                :{' '}
                                {lastMessage.content}
                              </p>
                            </div>
                          )}
                          {conversation.conversation_type === 'group' && conversation.participants && (
                            <div className="flex items-center gap-1.5 mt-1.5">
                              <Users className="h-3.5 w-3.5 text-brand-cyan" />
                              <p className="text-xs text-gray-500 font-medium">
                                {conversation.participants.length} participants
                              </p>
                            </div>
                          )}
                        </div>
                      </Link>

                      {/* Actions */}
                      <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="hover:bg-brand-blue-ghost" onClick={(e) => e.stopPropagation()}>
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                if (confirm('Êtes-vous sûr de vouloir supprimer cette conversation ?')) {
                                  deleteConversationMutation.mutate(conversation.id)
                                }
                              }}
                              disabled={deleteConversationMutation.isPending}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Supprimer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )
          })
        ) : (
          <Card className="border-brand-blue/20 bg-gradient-to-br from-brand-blue-ghost/30 to-brand-cyan-ghost/30">
            <CardContent className="py-16">
              <div className="text-center space-y-4">
                <div className="relative inline-block">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-24 h-24 bg-gradient-to-br from-brand-blue-ghost to-brand-cyan-ghost rounded-full opacity-50 blur-2xl"></div>
                  </div>
                  <div className="relative p-6 bg-gradient-to-br from-brand-blue-ghost to-brand-cyan-ghost rounded-2xl inline-block">
                    <MessageSquare className="h-16 w-16 mx-auto text-brand-blue" />
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold text-gray-900">
                    {searchQuery ? 'Aucune conversation trouvée' : 'Aucune conversation'}
                  </h3>
                  <p className="text-gray-600">
                    {searchQuery
                      ? 'Essayez de modifier votre recherche'
                      : 'Commencez une nouvelle conversation pour échanger avec vos collègues et candidats'}
                  </p>
                </div>
                {!searchQuery && (
                  <Button
                    onClick={() => setShowNewConversationDialog(true)}
                    className="mt-4 bg-gradient-to-r from-brand-blue to-brand-cyan hover:from-brand-blue-dark hover:to-brand-cyan shadow-md hover:shadow-lg transition-all"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Créer une conversation
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Dialog pour créer une nouvelle conversation */}
      <Dialog 
        open={showNewConversationDialog} 
        onOpenChange={(open) => {
          setShowNewConversationDialog(open)
          if (!open) resetDialogState()
        }}
      >
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Nouvelle conversation</DialogTitle>
            <DialogDescription>
              Choisissez le type de conversation que vous souhaitez créer
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            {/* Sélection du type de conversation */}
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => {
                  setConversationType('personal')
                  setSelectedSessionId('')
                  setSelectedStudentId('')
                }}
                className={`group p-5 border-2 rounded-xl transition-all duration-300 ${
                  conversationType === 'personal'
                    ? 'border-brand-blue bg-gradient-to-br from-brand-blue-ghost to-brand-blue-ghost/50 shadow-md scale-105'
                    : 'border-gray-200 hover:border-brand-blue/40 hover:bg-brand-blue-ghost/30'
                }`}
              >
                <div className={`p-2.5 rounded-lg mb-3 inline-flex ${
                  conversationType === 'personal'
                    ? 'bg-brand-blue/20'
                    : 'bg-brand-blue/10 group-hover:bg-brand-blue/20'
                }`}>
                  <MessageSquare className="h-6 w-6 text-brand-blue" />
                </div>
                <h3 className="font-semibold mb-1 text-gray-900">Message personnel</h3>
                <p className="text-sm text-gray-600">
                  Envoyer un message à un candidat spécifique
                </p>
              </button>
              <button
                type="button"
                onClick={() => {
                  setConversationType('group')
                  setSelectedStudentId('')
                }}
                className={`group p-5 border-2 rounded-xl transition-all duration-300 ${
                  conversationType === 'group'
                    ? 'border-brand-cyan bg-gradient-to-br from-brand-cyan-ghost to-brand-cyan-ghost/50 shadow-md scale-105'
                    : 'border-gray-200 hover:border-brand-cyan/40 hover:bg-brand-cyan-ghost/30'
                }`}
              >
                <div className={`p-2.5 rounded-lg mb-3 inline-flex ${
                  conversationType === 'group'
                    ? 'bg-brand-cyan/20'
                    : 'bg-brand-cyan/10 group-hover:bg-brand-cyan/20'
                }`}>
                  <Users className="h-6 w-6 text-brand-cyan" />
                </div>
                <h3 className="font-semibold mb-1 text-gray-900">Message groupé</h3>
                <p className="text-sm text-gray-600">
                  Envoyer un message à tous les candidats d'une session
                </p>
              </button>
            </div>

            {/* Sélection de la session */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Session {conversationType === 'group' ? '*' : '(optionnel)'}
              </label>
              {isLoadingSessions ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <select
                  value={selectedSessionId}
                  onChange={(e) => {
                    setSelectedSessionId(e.target.value)
                    setSelectedStudentId('')
                  }}
                  required={conversationType === 'group'}
                  className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-brand-blue focus:border-transparent"
                >
                  <option value="">Sélectionner une session</option>
                  {sessions?.map((session: any) => (
                    <option key={session.id} value={session.id}>
                      {session.name} {session.formations?.name ? `- ${session.formations.name}` : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Pour message personnel : sélection du candidat */}
            {conversationType === 'personal' && selectedSessionId && (
              <div>
                <label className="block text-sm font-medium mb-2">Candidat *</label>
                {isLoadingStudents ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : sessionStudents && sessionStudents.length > 0 ? (
                  <div className="max-h-[300px] overflow-y-auto space-y-2 border rounded-lg p-2">
                    {sessionStudents.map((item: any) => {
                      const student = item.student
                      const displayName = `${student?.first_name || ''} ${student?.last_name || ''}`.trim() ||
                                        student?.email ||
                                        `Candidat ${student?.student_number || ''}`
                      const displayEmail = student?.email

                      return (
                        <button
                          key={student?.id}
                          type="button"
                          onClick={() => {
                            const studentId = student?.id || null
                            if (studentId) {
                              createDirectConversationMutation.mutate({ userId: undefined, studentId })
                            } else {
                              addToast({
                                type: 'error',
                                title: 'Erreur',
                                description: 'Impossible de trouver l\'identifiant de ce candidat.',
                              })
                            }
                          }}
                          disabled={createDirectConversationMutation.isPending || !student?.id}
                          className="group w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-300 text-left hover:bg-gradient-to-br hover:from-brand-blue-ghost hover:to-brand-cyan-ghost cursor-pointer border border-transparent hover:border-brand-blue/20 hover:shadow-md"
                          title="Cliquer pour démarrer une conversation"
                        >
                          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-brand-blue-ghost to-brand-cyan-ghost flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Users className="h-5 w-5 text-brand-blue" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate text-gray-900 group-hover:text-brand-blue transition-colors">{displayName}</p>
                            {displayEmail && (
                              <p className="text-sm text-gray-600 truncate">
                                {displayEmail}
                              </p>
                            )}
                            {student?.student_number && (
                              <p className="text-xs text-gray-500">
                                N°: {student.student_number}
                              </p>
                            )}
                          </div>
                          {createDirectConversationMutation.isPending && (
                            <Loader2 className="h-4 w-4 animate-spin text-brand-blue" />
                          )}
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground text-sm">
                    Aucun candidat trouvé dans cette session
                  </div>
                )}
              </div>
            )}

            {/* Pour message groupé : bouton de création */}
            {conversationType === 'group' && selectedSessionId && (
              <div className="flex justify-end">
                <Button
                  onClick={() => createGroupConversationMutation.mutate()}
                  disabled={createGroupConversationMutation.isPending || !selectedSessionId}
                  className="bg-gradient-to-r from-brand-cyan to-brand-blue hover:from-brand-cyan-dark hover:to-brand-blue-dark shadow-md hover:shadow-lg transition-all"
                >
                  {createGroupConversationMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Création...
                    </>
                  ) : (
                    <>
                      <Users className="mr-2 h-4 w-4" />
                      Créer la conversation de groupe
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* Fallback : liste des utilisateurs si pas de session sélectionnée pour message personnel */}
            {conversationType === 'personal' && !selectedSessionId && (
              <>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Rechercher un utilisateur..."
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <div className="max-h-[300px] overflow-y-auto space-y-2">
                  {isLoadingUsers ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : organizationUsers && organizationUsers.length > 0 ? (
                    organizationUsers
                      .filter((u) => {
                        if (!userSearchQuery) return true
                        const searchLower = userSearchQuery.toLowerCase()
                        return (
                          (u as any).full_name?.toLowerCase().includes(searchLower) ||
                          (u as any).email?.toLowerCase().includes(searchLower)
                        )
                      })
                      .map((orgUser) => (
                        <button
                          key={(orgUser as any).id}
                          onClick={() => createDirectConversationMutation.mutate((orgUser as any).id)}
                          disabled={createDirectConversationMutation.isPending}
                          className="group w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gradient-to-br hover:from-brand-blue-ghost hover:to-brand-cyan-ghost transition-all duration-300 text-left border border-transparent hover:border-brand-blue/20 hover:shadow-md"
                        >
                          {(orgUser as any).avatar_url ? (
                            <img
                              src={(orgUser as any).avatar_url}
                              alt={(orgUser as any).full_name || (orgUser as any).email}
                              className="h-10 w-10 rounded-full object-cover ring-2 ring-brand-blue/20 group-hover:ring-brand-blue/40 transition-all"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-brand-blue-ghost to-brand-cyan-ghost flex items-center justify-center group-hover:scale-110 transition-transform">
                              <Users className="h-5 w-5 text-brand-blue" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate text-gray-900 group-hover:text-brand-blue transition-colors">
                              {(orgUser as any).full_name || (orgUser as any).email}
                            </p>
                            {(orgUser as any).full_name && (
                              <p className="text-sm text-gray-600 truncate">
                                {(orgUser as any).email}
                              </p>
                            )}
                            {(orgUser as any).role && (
                              <p className="text-xs text-gray-500 capitalize">
                                {(orgUser as any).role}
                              </p>
                            )}
                          </div>
                          {createDirectConversationMutation.isPending && (
                            <Loader2 className="h-4 w-4 animate-spin text-brand-blue" />
                          )}
                        </button>
                      ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      {userSearchQuery
                        ? 'Aucun utilisateur trouvé'
                        : 'Aucun utilisateur disponible'}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
