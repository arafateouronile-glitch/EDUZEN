'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useLearnerContext } from '@/lib/contexts/learner-context'
import { messagingService } from '@/lib/services/messaging.service'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowLeft, Send, Loader2, Users, User, MessageSquare, Trash2, MoreVertical } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { formatRelativeTime } from '@/lib/utils'
import { createLearnerClient } from '@/lib/supabase/learner-client'
import { MessageAttachmentViewer } from '@/components/messaging/message-attachment-viewer'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export default function LearnerConversationPage() {
  const params = useParams()
  const router = useRouter()
  const context = useLearnerContext()
  const queryClient = useQueryClient()
  const conversationId = params.id as string
  
  // Récupérer studentId depuis le contexte ou localStorage en fallback
  const studentId = context.studentId || (typeof window !== 'undefined' ? localStorage.getItem('learner_student_id') || undefined : undefined)
  const organizationId = context.organizationId
  
  const [messageText, setMessageText] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Créer un client Supabase pour l'apprenant
  const supabase = studentId ? createLearnerClient(studentId) : null

  // Récupérer la conversation directement avec le client apprenant
  const { data: conversation, isLoading, error } = useQuery({
    queryKey: ['learner-conversation', conversationId, studentId],
    queryFn: async () => {
      if (!studentId || !conversationId || !supabase) return null
      
      // Récupérer la conversation de base
      const { data: conv, error: convError } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', conversationId)
        .maybeSingle()

      if (convError || !conv) {
        throw convError || new Error('Conversation introuvable')
      }

      // Récupérer les participants
      const { data: participants } = await supabase
        .from('conversation_participants')
        .select('*')
        .eq('conversation_id', conversationId)

      // Enrichir les participants
      const enrichedParticipants = await Promise.all(
        (participants || []).map(async (participant: any) => {
          let user = null
          let student = null

          if (participant.user_id) {
            try {
              // Essayer d'abord avec une fonction RPC si elle existe
              const { data: rpcData, error: rpcError } = await supabase
                .rpc('get_user_name', { p_user_id: participant.user_id })
              
              if (!rpcError && rpcData) {
                user = rpcData
              } else {
                // Fallback : essayer la requête directe
                const { data: userData, error: userError } = await supabase
                  .from('users')
                  .select('id, full_name, email, avatar_url')
                  .eq('id', participant.user_id)
                  .maybeSingle()
                
                if (!userError && userData) {
                  user = userData
                } else {
                  // Si on ne peut pas récupérer les données, créer un objet minimal avec l'ID
                  user = { id: participant.user_id, full_name: null, email: null, avatar_url: null }
                }
              }
              } catch (err) {
                user = { id: participant.user_id, full_name: null, email: null, avatar_url: null }
              }
          }

          if (participant.student_id) {
            try {
              const { data: studentData, error: studentError } = await supabase
                .from('students')
                .select('id, first_name, last_name, email, student_number')
                .eq('id', participant.student_id)
                .maybeSingle()
              
              if (!studentError && studentData) {
                student = studentData
              }
            } catch (err) {
              // Silently handle student fetch error
            }
          }

          return {
            ...participant,
            user,
            student,
          }
        })
      )

      return {
        ...conv,
        participants: enrichedParticipants,
      }
    },
    enabled: !!conversationId && !!studentId,
  })

  // Récupérer les messages directement avec le client apprenant
  const { data: messages, isLoading: isLoadingMessages } = useQuery({
    queryKey: ['learner-messages', conversationId, studentId],
    queryFn: async () => {
      if (!studentId || !conversationId || !supabase) return []
      
      // Récupérer les messages de base
      const { data: msgs, error: msgsError } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(50)

      if (msgsError) {
        throw msgsError
      }

      if (!msgs || msgs.length === 0) {
        return []
      }

      // Enrichir les messages avec les données des expéditeurs
      const enrichedMessages = await Promise.all(
        msgs.map(async (message: any) => {
          let sender = null
          let studentSender = null

          // Récupérer l'expéditeur si c'est un utilisateur
          // Utiliser une fonction RPC pour bypasser RLS dans l'espace apprenant
          if (message.sender_id) {
            try {
              // Essayer d'abord avec une fonction RPC si elle existe
              const { data: rpcData, error: rpcError } = await supabase
                .rpc('get_user_name', { p_user_id: message.sender_id })
              
              if (!rpcError && rpcData) {
                sender = rpcData
              } else {
                // Fallback : essayer la requête directe
                const { data: userData, error: userError } = await supabase
                  .from('users')
                  .select('id, full_name, email, avatar_url')
                  .eq('id', message.sender_id)
                  .maybeSingle()
                
                if (!userError && userData) {
                  sender = userData
                } else {
                  sender = { id: message.sender_id, full_name: null, email: null, avatar_url: null }
                }
              }
            } catch (err) {
              sender = { id: message.sender_id, full_name: null, email: null, avatar_url: null }
            }
          }

          // Récupérer l'expéditeur si c'est un étudiant
          if (message.student_sender_id) {
            try {
              const { data: studentData, error: studentError } = await supabase
                .from('students')
                .select('id, first_name, last_name, email, student_number')
                .eq('id', message.student_sender_id)
                .maybeSingle()
              
              if (!studentError && studentData) {
                studentSender = studentData
              }
            } catch (err) {
              // Silently handle student fetch error
            }
          }

          return {
            ...message,
            sender,
            student_sender: studentSender,
          }
        })
      )

      return enrichedMessages.reverse() // Inverser pour avoir les plus anciens en premier
    },
    enabled: !!conversationId && !!studentId,
    refetchInterval: 5000, // Rafraîchir toutes les 5 secondes
  })

  // Mutation pour supprimer un message (seulement pour les messages de l'étudiant)
  const deleteMessageMutation = useMutation({
    mutationFn: async (messageId: string) => {
      if (!supabase) {
        throw new Error('Client Supabase non disponible')
      }
      // Utiliser le service de messaging qui fait un soft delete
      return messagingService.deleteMessage(messageId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['learner-messages', conversationId] })
      queryClient.invalidateQueries({ queryKey: ['learner-conversations'] })
    },
    onError: (error) => {
      alert(error instanceof Error ? error.message : 'Impossible de supprimer le message.')
    },
  })

  // Mutation pour envoyer un message
  // Note: Les étudiants doivent avoir un user_id pour envoyer des messages
  // Si l'étudiant n'a pas de user_id, il faudra créer un compte utilisateur ou utiliser un autre mécanisme
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!studentId || !conversationId || !supabase) {
        throw new Error('Étudiant non identifié')
      }

      // Vérifier si l'étudiant a un user_id associé
      const { data: student } = await supabase
        .from('students')
        .select('id, email')
        .eq('id', studentId)
        .maybeSingle()

      if (!student) {
        throw new Error('Étudiant non trouvé')
      }

      // Utiliser la fonction RPC pour insérer le message
      // Cette fonction gère automatiquement la recherche du user_id
      const { data: message, error: rpcError } = await supabase
        .rpc('insert_student_message', {
          p_conversation_id: conversationId,
          p_student_id: studentId,
          p_content: content.trim(),
        })

      if (rpcError) {
        throw new Error(rpcError.message || 'Erreur lors de l\'envoi du message')
      }

      if (!message) {
        throw new Error('Le message n\'a pas pu être créé')
      }

      return message
    },
    onSuccess: () => {
      setMessageText('')
      queryClient.invalidateQueries({ queryKey: ['learner-messages', conversationId] })
      queryClient.invalidateQueries({ queryKey: ['learner-conversations'] })
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      }, 100)
    },
    onError: (error) => {
      alert(error instanceof Error ? error.message : 'Une erreur est survenue lors de l\'envoi du message.')
    },
  })

  // Scroll vers le bas quand de nouveaux messages arrivent
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (!messageText.trim() || sendMessageMutation.isPending) return
    sendMessageMutation.mutate(messageText.trim())
  }

  // Trouver le participant étudiant pour la comparaison
  const studentParticipant = conversation?.participants?.find(
    (p: any) => p.student_id === studentId
  )

  // Obtenir le nom de l'administrateur/autre participant (pour l'en-tête et les messages)
  // Dans l'espace apprenant, l'autre participant est généralement un admin/utilisateur du dashboard
  const getOtherParticipant = () => {
    if (!conversation?.participants || conversation.participants.length === 0) return null
    
    // Si c'est une conversation de groupe, utiliser le nom de la conversation
    if (conversation.conversation_type === 'group' && conversation.name) {
      return {
        name: conversation.name,
        type: 'group' as const,
        data: null,
      }
    }
    
    // Trouver le participant qui n'est pas l'étudiant actuel
    // Dans l'espace apprenant, c'est généralement un admin/utilisateur (user_id)
    let otherParticipant = conversation.participants.find(
      (p: any) => {
        // Exclure l'étudiant actuel par student_id
        if (p.student_id === studentId) return false
        // Exclure aussi par user_id si l'étudiant a un user_id
        if (studentParticipant?.user_id && p.user_id === studentParticipant.user_id) return false
        return true
      }
    )
    
    // Si on n'a pas trouvé, essayer avec n'importe quel participant qui n'est pas l'étudiant actuel
    if (!otherParticipant) {
      otherParticipant = conversation.participants.find(
        (p: any) => p.student_id !== studentId
      )
    }
    
    if (!otherParticipant) {
      return null
    }
    
    // Priorité aux données utilisateur (admin/utilisateur du dashboard)
    if (otherParticipant.user_id) {
      // Si on a des données utilisateur enrichies
      if (otherParticipant.user) {
        const userName = otherParticipant.user.full_name || otherParticipant.user.email
        if (userName) {
          return {
            name: userName,
            type: 'admin' as const,
            data: otherParticipant.user,
          }
        }
      }
      
      return {
        name: `Administrateur ${otherParticipant.user_id.substring(0, 8)}`,
        type: 'admin' as const,
        data: { id: otherParticipant.user_id, full_name: null, email: null },
      }
    }
    
    // Si c'est un autre étudiant (cas rare dans l'espace apprenant)
    if (otherParticipant.student_id) {
      if (otherParticipant.student) {
        const studentName = `${otherParticipant.student.first_name || ''} ${otherParticipant.student.last_name || ''}`.trim() || 
                            otherParticipant.student.email || 
                            (otherParticipant.student.student_number ? `Candidat ${otherParticipant.student.student_number}` : null)
        if (studentName) {
          return {
            name: studentName,
            type: 'student' as const,
            data: otherParticipant.student,
          }
        }
      }
      
      return {
        name: `Candidat ${otherParticipant.student_id.substring(0, 8)}`,
        type: 'student' as const,
        data: { id: otherParticipant.student_id, first_name: null, last_name: null, email: null },
      }
    }
    
    return null
  }

  const otherParticipant = conversation ? getOtherParticipant() : null
  
  // Essayer de récupérer le nom de l'utilisateur via RPC si on n'a pas de nom complet
  const [enrichedOtherParticipant, setEnrichedOtherParticipant] = useState(otherParticipant)
  
  useEffect(() => {
    const fetchAdminName = async () => {
      // Récupérer le nom de l'admin si c'est un utilisateur/admin
      if (!otherParticipant || otherParticipant.type !== 'admin' || !otherParticipant.data?.id) return
      
      // Si on a déjà un nom complet, ne rien faire
      if (otherParticipant.name && !otherParticipant.name.startsWith('Administrateur ') && !otherParticipant.name.startsWith('Utilisateur ')) return
      
      try {
        if (!supabase) return
        const { data: userData, error } = await supabase
          .rpc('get_user_name', { p_user_id: otherParticipant.data.id })
        
        if (!error && userData) {
          const userName = (userData as any).full_name || (userData as any).email
          if (userName) {
            setEnrichedOtherParticipant({
              ...otherParticipant,
              name: userName,
              type: 'admin' as const,
              data: userData,
            })
          }
        }
      } catch (err) {
        // Silently handle RPC error
      }
    }
    
    fetchAdminName()
  }, [otherParticipant, supabase])
  
  // Utiliser le participant enrichi si disponible, sinon le participant de base
  const finalOtherParticipant = enrichedOtherParticipant || otherParticipant
  

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !conversation) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => router.push('/learner/messages')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">Conversation introuvable</h1>
        </div>
        <div className="text-center py-8">
          <p className="text-muted-foreground">
            Cette conversation n'existe pas ou vous n'avez pas la permission de la voir.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4 max-w-7xl">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.push('/learner/messages')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-3 flex-1">
              {otherParticipant?.type === 'student' ? (
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-5 w-5 text-primary" />
                </div>
              ) : (
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Users className="h-5 w-5 text-primary" />
                </div>
              )}
              <div>
                <h1 className="text-lg font-semibold">
                  {finalOtherParticipant?.name || 
                   (conversation.conversation_type === 'group' && conversation.name) || 
                   'Conversation'}
                </h1>
                {conversation.conversation_type === 'group' && conversation.name && finalOtherParticipant?.name !== conversation.name && (
                  <p className="text-sm text-muted-foreground">{conversation.name}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto container mx-auto px-4 py-6 max-w-7xl">
        {isLoadingMessages ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : messages && messages.length > 0 ? (
          <div className="space-y-4">
            {messages.map((message: any) => {
              // Déterminer si le message est de l'étudiant
              // Chercher le participant qui correspond à cet étudiant
              const studentParticipant = conversation.participants?.find(
                (p: any) => p.student_id === studentId
              )
              
              // Si l'étudiant a un user_id associé, comparer avec le sender_id
              // Sinon, on ne peut pas déterminer (on considère que ce n'est pas son message)
              const isOwnMessage = studentParticipant?.user_id === message.sender_id || 
                                   message.student_sender_id === studentId
              
              // Obtenir le nom de l'expéditeur avec priorité
              let senderName = null
              
              // D'abord, essayer de récupérer depuis message.sender (utilisateur)
              if (message.sender) {
                senderName = message.sender.full_name || message.sender.email || null
              }
              
              // Si pas trouvé, essayer depuis message.student_sender (étudiant)
              if (!senderName && message.student_sender) {
                const studentName = `${message.student_sender.first_name || ''} ${message.student_sender.last_name || ''}`.trim()
                senderName = studentName || message.student_sender.email || (message.student_sender.student_number ? `Candidat ${message.student_sender.student_number}` : null)
              }
              
              // Si toujours pas trouvé, essayer de récupérer depuis les participants de la conversation
              if (!senderName && !isOwnMessage && conversation.participants) {
                // Chercher le participant admin qui correspond au sender_id
                if (message.sender_id) {
                  const senderParticipant = conversation.participants.find(
                    (p: any) => p.user_id === message.sender_id
                  )
                  if (senderParticipant?.user) {
                    senderName = senderParticipant.user.full_name || senderParticipant.user.email || null
                  }
                }
                
                // Chercher le participant qui correspond au student_sender_id
                if (!senderName && message.student_sender_id) {
                  const senderParticipant = conversation.participants.find(
                    (p: any) => p.student_id === message.student_sender_id
                  )
                  if (senderParticipant?.student) {
                    const studentName = `${senderParticipant.student.first_name || ''} ${senderParticipant.student.last_name || ''}`.trim()
                    senderName = studentName || senderParticipant.student.email || (senderParticipant.student.student_number ? `Candidat ${senderParticipant.student.student_number}` : null)
                  }
                }
              }
              
              // En dernier recours, utiliser le nom de l'admin (autre participant) de la conversation
              if (!senderName && !isOwnMessage && finalOtherParticipant?.name) {
                senderName = finalOtherParticipant.name
              }
              
              return (
                <div
                  key={message.id}
                  className={`flex items-start gap-2 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                >
                  {!isOwnMessage && <div className="w-8" />}
                  <div className="group relative flex items-start gap-2">
                    <div
                      className={`max-w-[70%] rounded-lg px-4 py-2 ${
                        isOwnMessage
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      {!isOwnMessage && senderName && (
                        <p className="text-xs font-medium mb-1 opacity-80">
                          {senderName}
                        </p>
                      )}
                      {message.attachments && Array.isArray(message.attachments) && message.attachments.length > 0 && (
                        <div className="mb-2">
                          <MessageAttachmentViewer attachments={message.attachments} />
                        </div>
                      )}
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      <p
                        className={`text-xs mt-1 ${
                          isOwnMessage ? 'text-primary-foreground/70' : 'text-muted-foreground'
                        }`}
                      >
                        {formatRelativeTime(message.created_at)}
                      </p>
                    </div>
                    {/* Bouton de suppression uniquement pour les messages de l'étudiant */}
                    {isOwnMessage && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              if (confirm('Êtes-vous sûr de vouloir supprimer ce message ?')) {
                                deleteMessageMutation.mutate(message.id)
                              }
                            }}
                            disabled={deleteMessageMutation.isPending}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                  {isOwnMessage && <div className="w-8" />}
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Aucun message pour le moment</p>
              <p className="text-sm text-muted-foreground mt-2">
                Commencez la conversation en envoyant un message
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4 max-w-7xl">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <Input
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Tapez votre message..."
              disabled={sendMessageMutation.isPending}
              className="flex-1"
            />
            <Button
              type="submit"
              disabled={!messageText.trim() || sendMessageMutation.isPending}
              size="icon"
            >
              {sendMessageMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}

