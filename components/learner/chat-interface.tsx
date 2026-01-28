'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/use-auth'
import { createClient } from '@/lib/supabase/client'
import { GlassCard } from '@/components/ui/glass-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { motion, AnimatePresence } from '@/components/ui/motion'
import {
  Send,
  Paperclip,
  Smile,
  MoreVertical,
  Phone,
  Video,
  ArrowLeft,
  CheckCheck,
  Clock,
  Image as ImageIcon,
  File,
  X,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import Image from 'next/image'
import { fr } from 'date-fns/locale'

interface Message {
  id: string
  content: string
  sender_id: string
  created_at: string
  read_at: string | null
  attachments?: {
    name: string
    url: string
    type: string
  }[]
}

interface Participant {
  id: string
  name: string
  avatar: string | null
  role: string
  online?: boolean
}

interface ChatInterfaceProps {
  conversationId: string
  participant: Participant
  onBack?: () => void
}

export function ChatInterface({ conversationId, participant, onBack }: ChatInterfaceProps) {
  const { user } = useAuth()
  const supabase = createClient()
  const queryClient = useQueryClient()
  const [message, setMessage] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Récupérer les messages
  const { data: messages, isLoading } = useQuery({
    queryKey: ['chat-messages', conversationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
      
      if (error) throw error
      return (data || []) as unknown as Message[]
    },
    enabled: !!conversationId,
    refetchInterval: 5000, // Polling toutes les 5 secondes
  })

  // Écouter les nouveaux messages en temps réel
  useEffect(() => {
    if (!conversationId) return

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          queryClient.setQueryData(
            ['chat-messages', conversationId],
            (old: Message[] | undefined) => {
              if (!old) return [payload.new as Message]
              return [...old, payload.new as Message]
            }
          )
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversationId, supabase, queryClient])

  // Scroll automatique vers le bas
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Mutation pour envoyer un message
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      const { error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user?.id,
          content,
          created_at: new Date().toISOString(),
        })
      
      if (error) throw error
    },
    onSuccess: () => {
      setMessage('')
      inputRef.current?.focus()
    },
  })

  // Marquer les messages comme lus
  const markAsRead = useCallback(async () => {
    if (!user?.id || !messages?.length) return

    const unreadMessages = messages
      .filter((m) => m.sender_id !== user.id && !m.read_at)
      .map((m) => m.id)

    if (unreadMessages.length === 0) return

    await supabase
      .from('messages')
      .update({ read_at: new Date().toISOString() } as any)
      .in('id', unreadMessages)
  }, [messages, user?.id, supabase])

  useEffect(() => {
    markAsRead()
  }, [markAsRead])

  const handleSend = () => {
    if (!message.trim()) return
    sendMessageMutation.mutate(message.trim())
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] lg:h-[600px]">
      {/* Header */}
      <div className="flex items-center gap-4 p-4 border-b bg-white/80 backdrop-blur-sm rounded-t-2xl">
        {onBack && (
          <Button variant="ghost" size="icon" onClick={onBack} className="lg:hidden">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        <div className="relative">
          <div className={`relative w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold ${
            participant.role === 'support'
              ? 'bg-gradient-to-br from-brand-blue to-brand-cyan'
              : 'bg-gradient-to-br from-brand-blue-light to-brand-cyan'
          }`}>
            {participant.avatar ? (
              <Image
                src={participant.avatar}
                alt={participant.name}
                fill
                className="rounded-full object-cover"
              />
            ) : (
              participant.name.charAt(0)
            )}
          </div>
          {participant.online && (
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-brand-cyan rounded-full border-2 border-white" />
          )}
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">{participant.name}</h3>
          <p className="text-sm text-gray-500">
            {participant.online ? 'En ligne' : 'Hors ligne'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon">
            <Phone className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon">
            <Video className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon">
            <MoreVertical className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-gray-50/50 to-white">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-brand-blue border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-sm text-gray-500">Chargement des messages...</p>
            </div>
          </div>
        ) : messages && messages.length > 0 ? (
          <AnimatePresence initial={false}>
            {messages.map((msg, index) => {
              const isOwnMessage = msg.sender_id === user?.id
              const showAvatar = !isOwnMessage && (
                index === 0 || messages[index - 1].sender_id !== msg.sender_id
              )

              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex items-end gap-2 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                >
                  {!isOwnMessage && showAvatar && (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-blue to-brand-cyan flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                      {participant.name.charAt(0)}
                    </div>
                  )}
                  {!isOwnMessage && !showAvatar && <div className="w-8" />}
                  
                  <div className={`max-w-[70%] ${isOwnMessage ? 'order-first' : ''}`}>
                    <div
                      className={`px-4 py-2 rounded-2xl ${
                        isOwnMessage
                          ? 'bg-brand-blue text-white rounded-br-md'
                          : 'bg-white text-gray-900 shadow-sm border rounded-bl-md'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    </div>
                    <div className={`flex items-center gap-1 mt-1 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                      <span className="text-xs text-gray-400">
                        {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true, locale: fr })}
                      </span>
                      {isOwnMessage && (
                        msg.read_at ? (
                          <CheckCheck className="h-3 w-3 text-brand-blue" />
                        ) : (
                          <Clock className="h-3 w-3 text-gray-400" />
                        )
                      )}
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        ) : (
          <div className="flex items-center justify-center h-full text-center">
            <div>
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <Send className="h-8 w-8 text-gray-400" />
              </div>
              <p className="text-gray-500">Aucun message</p>
              <p className="text-sm text-gray-400">Commencez la conversation !</p>
            </div>
          </div>
        )}

        {/* Indicateur de frappe */}
        {isTyping && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-blue to-indigo-600 flex items-center justify-center text-white text-xs font-semibold">
              {participant.name.charAt(0)}
            </div>
            <div className="bg-white shadow-sm border rounded-2xl rounded-bl-md px-4 py-2">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t bg-white rounded-b-2xl">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="text-gray-400 hover:text-gray-600">
            <Paperclip className="h-5 w-5" />
          </Button>
          <Input
            ref={inputRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Écrivez votre message..."
            className="flex-1 bg-gray-50 border-none focus-visible:ring-1 focus-visible:ring-brand-blue"
          />
          <Button variant="ghost" size="icon" className="text-gray-400 hover:text-gray-600">
            <Smile className="h-5 w-5" />
          </Button>
          <Button
            onClick={handleSend}
            disabled={!message.trim() || sendMessageMutation.isPending}
            size="icon"
            className="bg-brand-blue hover:bg-brand-blue/90"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}





