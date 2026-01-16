'use client'

import { useQuery } from '@tanstack/react-query'
import { useLearnerContext } from '@/lib/contexts/learner-context'
import { createLearnerClient } from '@/lib/supabase/learner-client'
import { GlassCard } from '@/components/ui/glass-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { motion } from '@/components/ui/motion'
import {
  MessageSquare,
  Search,
  Send,
  Plus,
  User,
  Clock,
  CheckCheck,
  Circle,
} from 'lucide-react'
import { useState, useMemo } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useRouter } from 'next/navigation'
import { logger, maskId, sanitizeError } from '@/lib/utils/logger'

export default function LearnerMessagesPage() {
  const { student: studentData, studentId, organizationId } = useLearnerContext()
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')

  // Créer un client Supabase pour l'apprenant
  const supabase = useMemo(() => createLearnerClient(studentId), [studentId])

  // Récupérer les conversations directement avec le client apprenant
  const { data: conversations, isLoading } = useQuery({
    queryKey: ['learner-conversations', studentId, organizationId],
    queryFn: async () => {
      if (!studentId || !organizationId) return []
      
      // Récupérer les conversations où l'étudiant est participant (via student_id)
      const { data: participantConversations, error: participantError } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('student_id', studentId)

      if (participantError) {
        logger.warn('Error fetching conversation participants', participantError, {
          studentId: maskId(studentId),
          error: sanitizeError(participantError),
        })
        throw participantError
      }

      if (!participantConversations || participantConversations.length === 0) {
        return []
      }

      const conversationIds = participantConversations.map((p: any) => p.conversation_id)

      // Récupérer les conversations
      const { data: convs, error: conversationsError } = await supabase
        .from('conversations')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_archived', false)
        .in('id', conversationIds)
        .order('last_message_at', { ascending: false, nullsFirst: false })

      if (conversationsError) {
        logger.error('Error fetching conversations', conversationsError, {
          studentId: maskId(studentId),
          organizationId: maskId(organizationId),
          error: sanitizeError(conversationsError),
        })
        throw conversationsError
      }

      if (!convs || convs.length === 0) {
        return []
      }

      // Enrichir chaque conversation avec les participants et le dernier message
      const enrichedConversations = await Promise.all(
        convs.map(async (conversation: any) => {
          // Récupérer les participants
          const { data: participants } = await supabase
            .from('conversation_participants')
            .select('*')
            .eq('conversation_id', conversation.id)

          const enrichedParticipants = await Promise.all(
            (participants || []).map(async (participant: any) => {
              let user = null
              let student = null

              if (participant.user_id) {
                // Utiliser la fonction RPC pour récupérer le nom de l'utilisateur (bypass RLS)
                try {
                  const { data: userData, error: rpcError } = await supabase
                    .rpc('get_user_name', { p_user_id: participant.user_id })
                  
                  if (!rpcError && userData) {
                    // La fonction RPC retourne un jsonb avec full_name et email
                    user = {
                      id: participant.user_id,
                      full_name: userData.full_name,
                      email: userData.email,
                      avatar_url: null // L'avatar n'est pas retourné par la fonction RPC
                    }
                  } else {
                    // Fallback : essayer de récupérer directement depuis users
                    const { data: userData } = await supabase
                      .from('users')
                      .select('id, full_name, email, avatar_url')
                      .eq('id', participant.user_id)
                      .maybeSingle()
                    user = userData
                  }
              } catch (error) {
                // Fallback
                  const { data: userData } = await supabase
                    .from('users')
                    .select('id, full_name, email, avatar_url')
                    .eq('id', participant.user_id)
                    .maybeSingle()
                  user = userData
                }
              }

              if (participant.student_id) {
                const { data: studentData } = await supabase
                  .from('students')
                  .select('id, first_name, last_name, email, student_number')
                  .eq('id', participant.student_id)
                  .maybeSingle()
                student = studentData
              }

              return {
                ...participant,
                user,
                student,
              }
            })
          )

          // Récupérer le dernier message
          const { data: lastMessages } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', conversation.id)
            .eq('is_deleted', false)
            .order('created_at', { ascending: false })
            .limit(1)

          let lastMessage = null
          if (lastMessages && lastMessages.length > 0) {
            const msg = lastMessages[0]
            let sender = null
            let studentSender = null
            
            if (msg.sender_id) {
              const { data: senderData } = await supabase
                .from('users')
                .select('id, full_name, email')
                .eq('id', msg.sender_id)
                .maybeSingle()
              sender = senderData
            }
            
            if (msg.student_sender_id) {
              const { data: studentData } = await supabase
                .from('students')
                .select('id, first_name, last_name, email, student_number')
                .eq('id', msg.student_sender_id)
                .maybeSingle()
              studentSender = studentData
            }
            
            lastMessage = {
              ...msg,
              sender,
              student_sender: studentSender,
            }
          }

          return {
            ...conversation,
            participants: enrichedParticipants,
            last_message: lastMessage,
          }
        })
      )

      return enrichedConversations
    },
    enabled: !!studentId && !!organizationId,
    refetchInterval: 10000, // Rafraîchir toutes les 10 secondes
  })

  // Fonction pour obtenir le nom de la conversation
  const getConversationName = (conversation: any) => {
    // Pour les conversations de groupe, utiliser le nom de la conversation
    if (conversation.conversation_type === 'group' && conversation.name) {
      return conversation.name
    }
    
    // Priorité 1 : Utiliser le dernier message pour déterminer l'expéditeur (plus fiable)
    if (conversation.last_message) {
      // Si le message a un sender (admin/formateur)
      if (conversation.last_message.sender) {
        const senderName = conversation.last_message.sender.full_name || conversation.last_message.sender.email
        if (senderName) {
          return senderName
        }
      }
      // Si le message a un student_sender, mais ce n'est PAS l'étudiant actuel (c'est un autre étudiant)
      if (conversation.last_message.student_sender) {
        const senderStudentId = conversation.last_message.student_sender.id
        // Si ce n'est pas l'étudiant actuel, utiliser son nom
        if (senderStudentId !== studentId) {
          const senderName = `${conversation.last_message.student_sender.first_name || ''} ${conversation.last_message.student_sender.last_name || ''}`.trim()
          if (senderName) {
            return senderName
          }
          return conversation.last_message.student_sender.email || `Candidat ${conversation.last_message.student_sender.student_number || ''}`
        }
      }
    }
    
    // Priorité 2 : Chercher l'autre participant dans la liste des participants
    if (conversation.participants && conversation.participants.length > 0) {
      // Trouver le participant avec user_id (admin/formateur) - c'est l'autre participant
      // Exclure le participant qui correspond à l'étudiant actuel
      const adminParticipant = conversation.participants.find((p: any) => {
        // Si le participant a un user_id et pas de student_id (c'est un admin)
        if (p.user_id && !p.student_id) {
          return true
        }
        // Si le participant a un user_id ET un student_id, vérifier que le student_id n'est pas l'étudiant actuel
        if (p.user_id && p.student_id && p.student_id !== studentId) {
          return true
        }
        return false
      })
      
      if (adminParticipant?.user) {
        const adminName = adminParticipant.user.full_name || adminParticipant.user.email
        if (adminName) {
          return adminName
        }
      }
      
      // Si pas d'admin trouvé, chercher un participant avec student_id différent
      const otherStudentParticipant = conversation.participants.find((p: any) => {
        return p.student_id && p.student_id !== studentId
      })
      
      if (otherStudentParticipant?.student) {
        const studentName = `${otherStudentParticipant.student.first_name || ''} ${otherStudentParticipant.student.last_name || ''}`.trim()
        if (studentName) {
          return studentName
        }
        return otherStudentParticipant.student.email || `Candidat ${otherStudentParticipant.student.student_number || ''}`
      }
    }
    
    return 'Conversation'
  }

  const filteredConversations = conversations?.filter((conv: any) => {
    const conversationName = getConversationName(conv)
    return conversationName.toLowerCase().includes(searchQuery.toLowerCase())
  }) || []

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  }

  return (
    <motion.div
      className="space-y-6 pb-24 lg:pb-8"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-xl">
              <MessageSquare className="h-8 w-8 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                Messages
              </h1>
              <p className="text-gray-500">
                Communiquez avec vos formateurs et le support
              </p>
            </div>
          </div>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Nouveau message
          </Button>
        </div>
      </motion.div>

      {/* Search */}
      <motion.div variants={itemVariants}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="search"
            placeholder="Rechercher une conversation..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </motion.div>

      {/* Conversations */}
      <motion.div variants={itemVariants}>
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-gray-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : filteredConversations.length > 0 ? (
          <div className="space-y-3">
            {filteredConversations.map((conversation: any) => {
              const conversationName = getConversationName(conversation)
              const lastMessage = conversation.last_message
              const lastMessageTime = lastMessage?.created_at
              
              // Pour les messages de groupe, récupérer aussi le nom de l'expéditeur
              let lastMessageSender = null
              if (lastMessage?.sender) {
                lastMessageSender = lastMessage.sender.full_name || lastMessage.sender.email
              } else if (lastMessage?.student_sender) {
                lastMessageSender = `${lastMessage.student_sender.first_name || ''} ${lastMessage.student_sender.last_name || ''}`.trim() || 
                                  lastMessage.student_sender.email
              }
              
              return (
                <GlassCard
                  key={conversation.id}
                  className="p-4 cursor-pointer hover:shadow-lg transition-all duration-300"
                  onClick={() => router.push(`/learner/messages/${conversation.id}`)}
                >
                  <div className="flex items-center gap-4">
                    {/* Avatar */}
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold bg-gradient-to-br from-brand-blue to-indigo-600">
                        <User className="h-6 w-6" />
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-gray-900 truncate">
                          {conversationName}
                        </h3>
                        {lastMessageTime && (
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDistanceToNow(new Date(lastMessageTime), {
                              addSuffix: true,
                              locale: fr,
                            })}
                          </span>
                        )}
                      </div>
                      {lastMessage && (
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-sm truncate text-gray-500">
                            {conversation.conversation_type === 'group' && lastMessageSender ? (
                              <span className="font-medium">{lastMessageSender}: </span>
                            ) : null}
                            {lastMessage.content}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </GlassCard>
              )
            })}
          </div>
        ) : (
          <GlassCard className="p-12 text-center">
            <MessageSquare className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Aucune conversation
            </h3>
            <p className="text-gray-500 mb-4">
              Commencez une nouvelle conversation avec un formateur ou le support
            </p>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nouveau message
            </Button>
          </GlassCard>
        )}
      </motion.div>

      {/* Quick actions */}
      <motion.div variants={itemVariants}>
        <GlassCard className="p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Actions rapides</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button variant="outline" className="justify-start">
              <MessageSquare className="h-4 w-4 mr-2" />
              Contacter le support
            </Button>
            <Button variant="outline" className="justify-start">
              <User className="h-4 w-4 mr-2" />
              Contacter un formateur
            </Button>
            <Button variant="outline" className="justify-start">
              <Send className="h-4 w-4 mr-2" />
              Signaler un problème
            </Button>
          </div>
        </GlassCard>
      </motion.div>
    </motion.div>
  )
}


