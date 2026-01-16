'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/use-auth'
import { messagingService } from '@/lib/services/messaging.service'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowLeft, Send, Loader2, Users, User, MessageSquare, Trash2, MoreVertical } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { formatRelativeTime } from '@/lib/utils'
import { useToast } from '@/components/ui/toast'
import { MessageAttachments, type AttachmentFile } from '@/components/messaging/message-attachments'
import { MessageAttachmentViewer } from '@/components/messaging/message-attachment-viewer'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export default function ConversationPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const conversationId = params.id as string
  
  const [messageText, setMessageText] = useState('')
  const [messagesLimit, setMessagesLimit] = useState(50)
  const [messagesOffset, setMessagesOffset] = useState(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const [hasMoreMessages, setHasMoreMessages] = useState(true)
  const [attachments, setAttachments] = useState<AttachmentFile[]>([])

  // Récupérer la conversation
  const { data: conversation, isLoading, error } = useQuery({
    queryKey: ['conversation', conversationId],
    queryFn: () => messagingService.getConversationById(conversationId),
    enabled: !!conversationId,
  })

  // Récupérer les messages avec pagination
  const { data: messages, isLoading: isLoadingMessages, refetch: refetchMessages } = useQuery({
    queryKey: ['messages', conversationId, messagesLimit],
    queryFn: async () => {
      const fetchedMessages = await messagingService.getMessages(conversationId, messagesLimit, 0)
      // Si on récupère moins de messages que la limite, il n'y a plus de messages à charger
      setHasMoreMessages(fetchedMessages.length >= messagesLimit)
      return fetchedMessages
    },
    enabled: !!conversationId,
    refetchInterval: 5000, // Rafraîchir toutes les 5 secondes
  })

  // Fonction pour charger plus de messages
  const loadMoreMessages = () => {
    setMessagesLimit(prev => prev + 50)
  }

  // Réinitialiser la limite quand on change de conversation
  useEffect(() => {
    setMessagesLimit(50)
    setHasMoreMessages(true)
  }, [conversationId])

  // Mutation pour supprimer un message
  const deleteMessageMutation = useMutation({
    mutationFn: async (messageId: string) => {
      return messagingService.deleteMessage(messageId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] })
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
      addToast({
        type: 'success',
        title: 'Message supprimé',
        description: 'Le message a été supprimé avec succès.',
      })
    },
    onError: (error) => {
      addToast({
        type: 'error',
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Une erreur est survenue lors de la suppression du message.',
      })
    },
  })

  // Mutation pour envoyer un message
  const sendMessageMutation = useMutation({
    mutationFn: async ({ content, files }: { content: string; files: AttachmentFile[] }) => {
      if (!user?.id || !conversationId) {
        throw new Error('Utilisateur non authentifié')
      }

      // Upload des fichiers si présents
      let attachmentsData: Array<{ url: string; filename: string; type: string; size: number }> | null = null
      
      if (files.length > 0) {
        // Upload tous les fichiers
        const uploadPromises = files.map(async (attachment) => {
          const filePath = await messagingService.uploadAttachment(
            attachment.file,
            conversationId
          )
          
          // Stocker le chemin du fichier au lieu de l'URL signée (qui expire)
          // L'URL signée sera générée à la volée lors de l'affichage
          return {
            url: filePath, // Utiliser 'url' au lieu de 'path' pour correspondre au type attendu
            filename: attachment.file.name,
            type: attachment.file.type,
            size: attachment.file.size,
          }
        })

        attachmentsData = await Promise.all(uploadPromises)
      }

      // Créer le message avec les pièces jointes
      return messagingService.sendMessage({
        conversation_id: conversationId,
        sender_id: user.id,
        content: content.trim() || (attachmentsData ? '[Pièces jointes]' : ''),
        attachments: attachmentsData,
        message_type: attachmentsData && attachmentsData.some(a => a.type.startsWith('image/')) ? 'image' : 'text',
        is_deleted: false,
        is_edited: false,
      })
    },
    onSuccess: () => {
      setMessageText('')
      setAttachments([])
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] })
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
      // Scroll vers le bas
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      }, 100)
    },
    onError: (error) => {
      addToast({
        type: 'error',
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Une erreur est survenue lors de l\'envoi du message.',
      })
    },
  })

  // Scroll vers le bas quand de nouveaux messages arrivent
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if ((!messageText.trim() && attachments.length === 0) || sendMessageMutation.isPending) return
    sendMessageMutation.mutate({ content: messageText.trim(), files: attachments })
  }

  const handleRemoveAttachment = (id: string) => {
    const attachment = attachments.find(a => a.id === id)
    if (attachment?.preview) {
      URL.revokeObjectURL(attachment.preview)
    }
    setAttachments(attachments.filter(a => a.id !== id))
  }

  // Obtenir le nom de l'autre participant
  const getOtherParticipant = () => {
    if (!conversation?.participants) return null
    
    const otherParticipant = conversation.participants.find(
      (p: any) => p.user_id !== user?.id && p.student_id
    )
    
    if (otherParticipant?.student) {
      return {
        name: `${otherParticipant.student.first_name || ''} ${otherParticipant.student.last_name || ''}`.trim() || 
              otherParticipant.student.email || 
              `Candidat ${otherParticipant.student.student_number || ''}`,
        type: 'student' as const,
        data: otherParticipant.student,
      }
    }
    
    const otherUserParticipant = conversation.participants.find(
      (p: any) => p.user_id !== user?.id && p.user
    )
    
    if (otherUserParticipant?.user) {
      return {
        name: otherUserParticipant.user.full_name || otherUserParticipant.user.email || 'Utilisateur',
        type: 'user' as const,
        data: otherUserParticipant.user,
      }
    }
    
    return null
  }

  const otherParticipant = getOtherParticipant()

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
          <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard/messages')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">Conversation introuvable</h1>
        </div>
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              Cette conversation n'existe pas ou vous n'avez pas la permission de la voir.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4 max-w-7xl">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard/messages')}>
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
                  {otherParticipant?.name || 'Conversation'}
                </h1>
                {conversation.conversation_type === 'group' && conversation.name && (
                  <p className="text-sm text-muted-foreground">{conversation.name}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto container mx-auto px-4 py-6 max-w-7xl"
      >
        {isLoadingMessages && messagesLimit === 50 ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : messages && messages.length > 0 ? (
          <div className="space-y-4">
            {/* Bouton pour charger plus de messages */}
            {hasMoreMessages && messages.length > 0 && (
              <div className="flex justify-center py-4">
                <Button
                  variant="outline"
                  onClick={loadMoreMessages}
                  disabled={isLoadingMessages}
                  className="flex items-center gap-2"
                >
                  {isLoadingMessages ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Chargement...
                    </>
                  ) : (
                    <>
                      <ArrowLeft className="h-4 w-4 rotate-90" />
                      Charger plus de messages ({messages.length} affichés)
                    </>
                  )}
                </Button>
              </div>
            )}
            
            {messages.map((message: any) => {
              const isOwnMessage = message.sender_id === user?.id
              
              // Déterminer le nom de l'expéditeur avec priorité : sender (admin) > student_sender (étudiant)
              let senderName = 'Expéditeur inconnu'
              if (message.sender) {
                senderName = message.sender.full_name || message.sender.email || 'Expéditeur inconnu'
              } else if (message.student_sender) {
                const studentName = `${message.student_sender.first_name || ''} ${message.student_sender.last_name || ''}`.trim()
                senderName = studentName || message.student_sender.email || (message.student_sender.student_number ? `Candidat ${message.student_sender.student_number}` : 'Expéditeur inconnu')
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
                      {!isOwnMessage && (
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
        <div className="container mx-auto px-4 py-4 max-w-7xl space-y-3">
          {/* Pièces jointes */}
          {attachments.length > 0 && (
            <div className="pb-2">
              <MessageAttachments
                attachments={attachments}
                onAttachmentsChange={setAttachments}
                onRemove={handleRemoveAttachment}
                disabled={sendMessageMutation.isPending}
              />
            </div>
          )}
          
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
              disabled={(!messageText.trim() && attachments.length === 0) || sendMessageMutation.isPending}
              size="icon"
            >
              {sendMessageMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
          
          {/* Bouton pour ajouter des pièces jointes */}
          {attachments.length === 0 && (
            <div className="pt-2">
              <MessageAttachments
                attachments={attachments}
                onAttachmentsChange={setAttachments}
                onRemove={handleRemoveAttachment}
                disabled={sendMessageMutation.isPending}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

