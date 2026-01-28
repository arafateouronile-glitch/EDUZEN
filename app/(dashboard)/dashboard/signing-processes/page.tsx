'use client'

import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/hooks/use-auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { SkeletonList } from '@/components/ui/skeleton'
import { ArrowLeft, CheckCircle, Clock, FileText, Loader2, Plus, Send } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { cn } from '@/lib/utils'

type Process = {
  id: string
  organization_id: string
  document_id: string
  status: string
  current_index: number
  title: string | null
  created_at: string
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

export default function SigningProcessesPage() {
  const router = useRouter()
  const { user } = useAuth()
  const supabase = createClient()

  const { data: processes, isLoading } = useQuery({
    queryKey: ['signing-processes', user?.organization_id],
    queryFn: async () => {
      const res = await fetch('/api/signing-processes')
      if (!res.ok) throw new Error('Erreur chargement')
      return res.json() as Promise<Process[]>
    },
    enabled: !!user?.organization_id,
  })

  return (
    <div className="container max-w-4xl space-y-6 py-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/documents">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
              <FileText className="h-6 w-6 text-[#34B9EE]" />
              Tour de contrôle – Signature en cascade
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Suivi des conventions en cours de signature (stagiaire → directeur)
            </p>
          </div>
        </div>
        <Button asChild className="bg-[#34B9EE] hover:bg-[#2aa8dd] text-[#0f2847]">
          <Link href="/dashboard/signing-processes/new">
            <Plus className="h-4 w-4 mr-2" />
            Nouveau processus
          </Link>
        </Button>
      </div>

      {isLoading && <SkeletonList count={5} />}

      {!isLoading && (!processes || processes.length === 0) && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              Aucun processus en cours. Créez-en un pour lancer une signature en cascade.
            </p>
            <Button asChild className="mt-4">
              <Link href="/dashboard/signing-processes/new">Créer un processus</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {!isLoading && processes && processes.length > 0 && (
        <div className="space-y-4">
          {processes.map((p) => {
            const docTitle = (p.document as { title?: string })?.title ?? p.title ?? `Convention #${p.id.slice(0, 8)}`
            const current = p.signatories.find((s) => s.order_index === p.current_index)
            const done = p.signatories.filter((s) => s.signed_at).length
            const total = p.signatories.length
            return (
              <Card
                key={p.id}
                className="cursor-pointer transition-colors hover:bg-muted/50"
                onClick={() => router.push(`/dashboard/signing-processes/${p.id}`)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      {docTitle}
                      <span
                        className={cn(
                          'text-xs font-normal rounded-full px-2 py-0.5',
                          p.status === 'completed'
                            ? 'bg-green-500/20 text-green-700 dark:text-green-400'
                            : 'bg-amber-500/20 text-amber-700 dark:text-amber-400'
                        )}
                      >
                        {p.status === 'completed' ? 'Complété' : 'En cours'}
                      </span>
                    </CardTitle>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(p.created_at), 'd MMM yyyy à HH:mm', { locale: fr })}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex flex-wrap gap-2">
                    {p.signatories.map((s) => (
                      <span
                        key={s.id}
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
                          s.signed_at
                            ? 'bg-green-500/15 text-green-700 dark:text-green-400'
                            : s.order_index === p.current_index
                              ? 'bg-[#34B9EE]/15 text-[#274472] dark:text-[#34B9EE]'
                              : 'bg-muted text-muted-foreground'
                        )}
                      >
                        {s.signed_at ? (
                          <CheckCircle className="h-3.5 w-3.5" />
                        ) : (
                          <Clock className="h-3.5 w-3.5" />
                        )}
                        {s.name}
                        {s.signed_at && (
                          <span className="opacity-75">
                            – {format(new Date(s.signed_at), 'd MMM à HH:mm', { locale: fr })}
                          </span>
                        )}
                        {!s.signed_at && s.order_index === p.current_index && (
                          <span className="opacity-75">(en attente)</span>
                        )}
                      </span>
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    {done}/{total} signature(s) ·{' '}
                    {p.status === 'completed'
                      ? 'Convention signée par toutes les parties'
                      : current
                        ? `En attente de ${current.name}`
                        : '—'}
                  </p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
