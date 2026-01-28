'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/hooks/use-auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowLeft, Loader2, Plus } from 'lucide-react'
import Link from 'next/link'
import { useToast } from '@/components/ui/toast'

type Doc = { id: string; title: string; type: string }

export default function NewSigningProcessPage() {
  const router = useRouter()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const supabase = createClient()

  const [documentId, setDocumentId] = useState('')
  const [title, setTitle] = useState('')
  const [signatories, setSignatories] = useState([
    { email: '', name: '', order_index: 0 },
    { email: '', name: '', order_index: 1 },
  ])

  const { data: docs } = useQuery({
    queryKey: ['documents-conventions', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) {
        throw new Error('Organization ID manquant')
      }
      const { data, error } = await supabase
        .from('documents')
        .select('id, title, type')
        .eq('organization_id', user.organization_id)
        .in('type', ['convention', 'contract'] as string[])
        .order('created_at', { ascending: false })
        .limit(100)
      if (error) throw error
      return (data ?? []) as Doc[]
    },
    enabled: !!user?.organization_id,
  })

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/signing-processes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document_id: documentId,
          title: title || undefined,
          signatories: signatories.filter((s) => s.email.trim() && s.name.trim()),
        }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j?.error ?? 'Erreur')
      }
      return res.json()
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['signing-processes'] })
      addToast({
        title: 'Processus créé',
        description: data?.firstEmailSent
          ? 'Le premier signataire a reçu le lien par email.'
          : 'Créez le processus. Vérifiez RESEND_API_KEY pour l’envoi des mails.',
        type: 'success',
      })
      router.push(`/dashboard/signing-processes/${data?.process?.id ?? ''}`)
    },
    onError: (e) => {
      addToast({
        title: 'Erreur',
        description: e instanceof Error ? e.message : 'Impossible de créer le processus.',
        type: 'error',
      })
    },
  })

  const valid =
    documentId &&
    signatories.length >= 2 &&
    signatories.every((s) => s.email.trim() && s.name.trim())

  return (
    <div className="container max-w-xl space-y-6 py-8">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/signing-processes">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">Nouveau processus en cascade</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Stagiaire (ordre 0) puis Directeur (ordre 1). Le mail est envoyé automatiquement au premier.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Document et signataires</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Document (convention / contrat)</Label>
            <Select value={documentId} onValueChange={setDocumentId}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir un document" />
              </SelectTrigger>
              <SelectContent>
                {docs?.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Titre affiché (optionnel)</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="ex. Convention #452"
            />
          </div>

          <div className="space-y-3 pt-2">
            <Label>Signataires (ordre 0 = premier à signer)</Label>
            {signatories.map((s, i) => (
              <div key={i} className="flex gap-2 items-end">
                <div className="flex-1 space-y-1">
                  <Input
                    placeholder="Nom"
                    value={s.name}
                    onChange={(e) => {
                      const n = [...signatories]
                      n[i] = { ...n[i], name: e.target.value }
                      setSignatories(n)
                    }}
                  />
                </div>
                <div className="flex-1 space-y-1">
                  <Input
                    type="email"
                    placeholder="Email"
                    value={s.email}
                    onChange={(e) => {
                      const n = [...signatories]
                      n[i] = { ...n[i], email: e.target.value }
                      setSignatories(n)
                    }}
                  />
                </div>
                <span className="text-sm text-muted-foreground shrink-0 pb-2">
                  Ordre {s.order_index}
                </span>
              </div>
            ))}
          </div>

          <Button
            onClick={() => createMutation.mutate()}
            disabled={!valid || createMutation.isPending}
            className="w-full bg-[#34B9EE] hover:bg-[#2aa8dd] text-[#0f2847]"
          >
            {createMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Plus className="h-4 w-4 mr-2" />
            )}
            Créer et envoyer le lien au premier signataire
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
