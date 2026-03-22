/**
 * POST /api/learner/conversations/start
 * Crée une conversation directe entre l'apprenant et un utilisateur (formateur, admin, secrétaire).
 * Authentification : Authorization: Bearer <token> ou x-learner-access-token.
 * Body : { recipientUserId: string, firstMessage?: string }
 */
import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getStudentIdFromLearnerRequest } from '@/lib/api/learner-auth'
import { logger, sanitizeError } from '@/lib/utils/logger'

export async function POST(request: NextRequest) {
  try {
    const auth = await getStudentIdFromLearnerRequest(request)
    if (!auth) {
      return NextResponse.json(
        { error: 'Token d\'accès requis (Authorization: Bearer ou x-learner-access-token)' },
        { status: 401 }
      )
    }
    const studentId = auth.studentId

    let body: { recipientUserId?: string; firstMessage?: string }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'Body JSON invalide' },
        { status: 400 }
      )
    }

    const recipientUserId = body?.recipientUserId
    if (!recipientUserId || typeof recipientUserId !== 'string') {
      return NextResponse.json(
        { error: 'recipientUserId requis' },
        { status: 400 }
      )
    }

    const firstMessage = typeof body?.firstMessage === 'string' ? body.firstMessage.trim() : undefined

    const supabase = createAdminClient()

    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id, organization_id')
      .eq('id', studentId)
      .single()

    if (studentError || !student) {
      return NextResponse.json(
        { error: 'Apprenant non trouvé' },
        { status: 404 }
      )
    }

    const { data: recipient, error: recipientError } = await supabase
      .from('users')
      .select('id, organization_id, role')
      .eq('id', recipientUserId)
      .eq('is_active', true)
      .single()

    if (recipientError || !recipient) {
      return NextResponse.json(
        { error: 'Destinataire non trouvé' },
        { status: 404 }
      )
    }

    const orgId = student.organization_id
    if (!orgId || recipient.organization_id !== orgId) {
      return NextResponse.json(
        { error: 'Destinataire d\'une autre organisation' },
        { status: 403 }
      )
    }

    const allowedRoles = ['teacher', 'admin', 'secretary']
    if (!allowedRoles.includes(recipient.role)) {
      return NextResponse.json(
        { error: 'Ce contact ne peut pas recevoir de messages' },
        { status: 403 }
      )
    }

    // Conversation directe existante ?
    const { data: existingConvs } = await supabase
      .from('conversations')
      .select('id')
      .eq('organization_id', orgId!)
      .eq('conversation_type', 'direct')

    if (existingConvs && existingConvs.length > 0) {
      const convIds = existingConvs.map((c: { id: string }) => c.id)
      const { data: studentParts } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('student_id', studentId)
        .in('conversation_id', convIds)

      if (studentParts && studentParts.length > 0) {
        const studentConvIds = studentParts.map((p: { conversation_id: string }) => p.conversation_id)
        const { data: recipientPart } = await supabase
          .from('conversation_participants')
          .select('conversation_id')
          .eq('user_id', recipientUserId)
          .in('conversation_id', studentConvIds)
          .maybeSingle()

        if (recipientPart) {
          return NextResponse.json({
            conversationId: recipientPart.conversation_id,
            existing: true,
          })
        }
      }
    }

    // Créer la conversation (created_by = null pour initiative apprenant)
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .insert({
        organization_id: orgId!,
        conversation_type: 'direct',
        created_by: null,
      })
      .select('id')
      .single()

    if (convError) {
      logger.error('[learner/conversations/start] Insert conversation', sanitizeError(convError))
      return NextResponse.json(
        { error: 'Erreur lors de la création de la conversation' },
        { status: 500 }
      )
    }

    await supabase.from('conversation_participants').insert({
      conversation_id: conversation.id,
      student_id: studentId,
      role: 'member',
    })
    await supabase.from('conversation_participants').insert({
      conversation_id: conversation.id,
      user_id: recipientUserId,
      role: 'member',
    })

    // Premier message optionnel (inséré côté serveur avec student_sender_id)
    if (firstMessage) {
      const { error: msgError } = await supabase.from('messages').insert({
        conversation_id: conversation.id,
        sender_id: null,
        student_sender_id: studentId,
        content: firstMessage,
        is_deleted: false,
        is_edited: false,
      })
      if (msgError) {
        logger.warn('[learner/conversations/start] Insert first message failed', sanitizeError(msgError))
      } else {
        await supabase
          .from('conversations')
          .update({ last_message_at: new Date().toISOString() })
          .eq('id', conversation.id)
      }
    }

    return NextResponse.json({
      conversationId: conversation.id,
      existing: false,
    })
  } catch (err) {
    logger.error('[learner/conversations/start] Unexpected error', sanitizeError(err))
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}
