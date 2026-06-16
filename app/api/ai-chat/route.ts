import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import type { MessageParam } from '@anthropic-ai/sdk/resources/messages'
import { createClient } from '@/lib/supabase/server'
import { AI_TOOLS, executeTool } from '@/lib/ai/tools'
import { AI_CHAT_SYSTEM_PROMPT } from '@/lib/ai/system-prompt'

// Tools avec cache_control sur le dernier — Anthropic cache tout jusqu'à ce bloc
const CACHED_TOOLS = AI_TOOLS.map((tool, i) =>
  i === AI_TOOLS.length - 1
    ? { ...tool, cache_control: { type: 'ephemeral' as const } }
    : tool
)

export const runtime = 'nodejs'
export const maxDuration = 120

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return new Response('Non autorisé', { status: 401 })
  }

  const { data: profile } = await supabase
    .from('users')
    .select('organization_id, full_name, role')
    .eq('id', user.id)
    .single()

  if (!profile?.organization_id) {
    return new Response('Organisation introuvable', { status: 400 })
  }

  const rawBody = await req.json()
  const messages = rawBody.messages as MessageParam[]
  const pageContext = rawBody.pageContext as string | undefined

  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response('Messages invalides', { status: 400 })
  }
  if (messages.length > 50) {
    return new Response('Trop de messages (max 50)', { status: 400 })
  }
  if (pageContext && typeof pageContext === 'string' && pageContext.length > 2000) {
    return new Response('pageContext trop long (max 2000 caractères)', { status: 400 })
  }
  // Validate individual message structure
  for (const msg of messages) {
    if (!msg.role || !['user', 'assistant'].includes(msg.role)) {
      return new Response('Structure de message invalide', { status: 400 })
    }
    const content = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)
    if (content.length > 50_000) {
      return new Response('Message trop long (max 50 000 caractères)', { status: 400 })
    }
  }

  const encoder = new TextEncoder()

  const readable = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      let currentMessages: MessageParam[] = messages
      let iterations = 0
      const maxIterations = 10

      try {
        while (iterations < maxIterations) {
          iterations++

          // Système prompt : partie statique cachée + contexte de page dynamique non caché
          const systemBlocks: Anthropic.TextBlockParam[] = [
            {
              type: 'text',
              text: AI_CHAT_SYSTEM_PROMPT,
              cache_control: { type: 'ephemeral' },
            },
          ]
          if (pageContext) {
            systemBlocks.push({ type: 'text', text: `## Contexte de la page actuelle\n${pageContext}` })
          }

          const stream = anthropic.messages.stream({
            model: 'claude-sonnet-4-6',
            max_tokens: 2048,
            system: systemBlocks,
            tools: CACHED_TOOLS,
            messages: currentMessages,
          })

          // Forward text tokens as they arrive
          stream.on('text', (text) => {
            send({ type: 'text_delta', content: text })
          })

          const message = await stream.finalMessage()

          if (message.stop_reason === 'end_turn') {
            send({ type: 'done' })
            break
          }

          if (message.stop_reason === 'tool_use') {
            const toolResults: Anthropic.ToolResultBlockParam[] = []

            for (const block of message.content) {
              if (block.type !== 'tool_use') continue

              send({ type: 'tool_start', name: block.name, id: block.id })

              const result = await executeTool(
                block.name,
                block.input as Record<string, unknown>,
                supabase,
                profile.organization_id!
              )

              // Send the first line as a short summary
              send({
                type: 'tool_done',
                name: block.name,
                id: block.id,
                summary: result.split('\n')[0],
              })

              toolResults.push({
                type: 'tool_result',
                tool_use_id: block.id,
                content: result,
              })
            }

            currentMessages = [
              ...currentMessages,
              { role: 'assistant', content: message.content },
              { role: 'user', content: toolResults },
            ]
            continue
          }

          // Unexpected stop reason
          send({ type: 'done' })
          break
        }

        if (iterations >= maxIterations) {
          send({ type: 'text_delta', content: "\n\n*(Limite d'itérations atteinte.)*" })
          send({ type: 'done' })
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erreur inconnue'
        send({ type: 'error', message })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
