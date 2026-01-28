'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, CheckCircle, Clock, Loader2, Send } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/ui/toast'

type Process = {
  id: string
  organization_id: string
  document_id: string
  status: string
  current_index: number
  title: string | null
  document?: { id: string; title: string; file_url: string | null }
  signatories: Array<{
    id: string
    email: string
    name: string
    order_index: number
    signed_at: string | null
    mail_sent_at: string | null
  }>
}

export default function SigningProcessDetailPage() {
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const id = params?.id as string

  const { data: process, isLoading } = useQuery({
    queryKey: ['signing-process', id],
    queryFn: async () => {
      const res = await fetch(`/api/signing-processes/${id}`)
      if (!res.ok) throw new Error('Processus introuvable')
      return res.json() as Promise<Process>
    },
    enabled: !!id,
  })

  const resendMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/signing-processes/${id}/resend`, { method: 'POST' })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j?.error ?? 'Erreur')
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['signing-process', id] })
      addToast({
        title: 'Lien renvoyé',
        description: 'Le signataire courant a reçu un nouvel email avec le lien.',
        type: 'success',
      })
    },
    onError: (e) => {
      addToast({
        title: 'Erreur',
        description: e instanceof Error ? e.message : 'Impossible de renvoyer le lien.',
        type: 'error',
      })
    },
  })

  const current = process?.signatories.find((s) => s.order_index === process.current_index)
  const docTitle = (process?.document as { title?: string })?.title ?? process?.title ?? `Convention #${id?.slice(0, 8)}`

  if (isLoading || !process) {
    return (
      <div className="container max-w-2xl py-8">
        <Card>
          <CardContent className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-[#34B9EE]" />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container max-w-2xl space-y-6 py-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/signing-processes">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Tour de contrôle</h1>
            <p className="text-muted-foreground text-sm mt-0.5">{docTitle}</p>
          </div>
        </div>
        {process.status !== 'completed' && current && (
          <Button
            onClick={() => resendMutation.mutate()}
            disabled={resendMutation.isPending}
            variant="outline"
            className="border-[#34B9EE] text-[#34B9EE] hover:bg-[#34B9EE]/10"
          >
            {resendMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Renvoyer le lien à {current.name}
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            Statut
            <span
              className={cn(
                'text-xs font-normal rounded-full px-2 py-0.5',
                process.status === 'completed'
                  ? 'bg-green-500/20 text-green-700 dark:text-green-400'
                  : 'bg-amber-500/20 text-amber-700 dark:text-amber-400'
              )}
            >
              {process.status === 'completed' ? 'Complété' : 'En cours'}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {process.signatories.map((s) => {
            const isCurrent = s.order_index === process.current_index && !s.signed_at
            return (
              <div
                key={s.id}
                className={cn(
                  'flex items-center justify-between rounded-lg border p-4',
                  isCurrent && 'border-[#34B9EE] bg-[#34B9EE]/5'
                )}
              >
                <div className="flex items-center gap-3">
                  {s.signed_at ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <Clock className="h-5 w-5 text-amber-500" />
                  )}
                  <div>
                    <p className="font-medium">{s.name}</p>
                    <p className="text-sm text-muted-foreground">{s.email}</p>
                  </div>
                </div>
                <div className="text-right text-sm">
                  {s.signed_at ? (
                    <span className="text-green-600 dark:text-green-400">
                      Signé le {format(new Date(s.signed_at), "d MMM yyyy 'à' HH:mm", { locale: fr })}
                    </span>
                  ) : isCurrent ? (
                    <span className="text-amber-600 dark:text-amber-400">
                      En attente
                      {s.mail_sent_at && (
                        <> · Mail envoyé le {format(new Date(s.mail_sent_at), 'd MMM à HH:mm', { locale: fr })}</>
                      )}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">En attente de son tour</span>
                  )}
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}
