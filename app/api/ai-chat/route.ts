import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import type { MessageParam } from '@anthropic-ai/sdk/resources/messages'
import { createClient } from '@/lib/supabase/server'
import { AI_TOOLS, executeTool } from '@/lib/ai/tools'
import { AI_CHAT_SYSTEM_PROMPT } from '@/lib/ai/system-prompt'

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

  const { messages, pageContext } = (await req.json()) as { messages: MessageParam[]; pageContext?: string }

  const encoder = new TextEncoder()

  const readable = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      let currentMessages: MessageParam[] = messages
      let iterations = 0
      const maxIterations = 15

      try {
        while (iterations < maxIterations) {
          iterations++

          // Use streaming to get real-time text deltas
          const systemPrompt = pageContext
            ? `${AI_CHAT_SYSTEM_PROMPT}\n\n## Contexte de la page actuelle\n${pageContext}`
            : AI_CHAT_SYSTEM_PROMPT

          const stream = anthropic.messages.stream({
            model: 'claude-sonnet-4-6',
            max_tokens: 4096,
            system: systemPrompt,
            tools: AI_TOOLS,
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
