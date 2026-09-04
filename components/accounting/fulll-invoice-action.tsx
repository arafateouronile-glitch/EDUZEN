'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { BookOpen, CheckCircle, Clock, AlertCircle, RefreshCw, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'

type MappingRow = {
  id: string
  sync_status: string | null
  external_entity_id: string | null
  external_entity_data: { url?: string; error_message?: string } | null
  last_synced_at: string | null
}

type StatusResponse = {
  integration: { is_active: boolean | null } | null
  mappings: MappingRow[]
}

interface Props {
  invoiceId: string
  /** 'invoice' | 'credit_note' — la facture d'origine (pas un devis). */
  documentType: string | null | undefined
  /** `invoices.updated_at`, pour détecter un document modifié après export. */
  invoiceUpdatedAt?: string | null
}

/**
 * Bouton « Envoyer vers Fulll » + badge de statut sur une facture / un avoir.
 * Ne s'affiche que si une intégration Fulll est active pour l'organisation.
 */
export function FulllInvoiceAction({ invoiceId, documentType, invoiceUpdatedAt }: Props) {
  const queryClient = useQueryClient()
  const { addToast } = useToast()

  const eligible = documentType === 'invoice' || documentType === 'credit_note'

  const { data, isLoading } = useQuery<StatusResponse>({
    queryKey: ['fulll-invoice-status', invoiceId],
    enabled: eligible,
    queryFn: async () => {
      const res = await fetch(`/api/accounting/sync?provider=fulll&invoiceId=${invoiceId}`)
      if (!res.ok) throw new Error('statut indisponible')
      return res.json()
    },
  })

  const pushMutation = useMutation({
    mutationFn: async (force: boolean) => {
      const res = await fetch('/api/accounting/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: 'fulll', mode: 'single', invoiceId, force }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || "Échec de l'envoi vers Fulll")
      return body as { items?: Array<{ status: string; error?: string }> }
    },
    onSuccess: (body) => {
      queryClient.invalidateQueries({ queryKey: ['fulll-invoice-status', invoiceId] })
      const item = body.items?.[0]
      addToast({
        type: item?.status === 'error' ? 'error' : 'success',
        title: 'Fulll',
        description:
          item?.status === 'synced'
            ? 'Document exporté vers Fulll.'
            : item?.status === 'pending'
              ? 'Document soumis à Fulll (import en cours).'
              : item?.status === 'skipped'
                ? item.error || 'Document déjà exporté.'
                : item?.error || 'Envoyé.',
      })
    },
    onError: (e: Error) => addToast({ type: 'error', title: 'Fulll', description: e.message }),
  })

  if (!eligible || isLoading) return null
  if (!data?.integration?.is_active) return null

  const mapping = data.mappings?.[0]
  const status = mapping?.sync_status ?? 'none'
  const isStale =
    status === 'synced' &&
    invoiceUpdatedAt &&
    mapping?.last_synced_at &&
    new Date(invoiceUpdatedAt).getTime() > new Date(mapping.last_synced_at).getTime()

  const badge = (() => {
    if (isStale) return { cls: 'text-amber-600', icon: AlertCircle, label: 'Modifié depuis l’export' }
    switch (status) {
      case 'synced':
        return { cls: 'text-green-600', icon: CheckCircle, label: 'Exporté vers Fulll' }
      case 'pending':
        return { cls: 'text-blue-600', icon: Clock, label: 'Import Fulll en cours' }
      case 'error':
        return { cls: 'text-red-600', icon: AlertCircle, label: 'Échec de l’export Fulll' }
      default:
        return { cls: 'text-gray-500', icon: BookOpen, label: 'Non exporté vers Fulll' }
    }
  })()

  const canSend = status === 'none' || status === 'error' || status === 'pending'
  const BadgeIcon = badge.icon
  const fulllUrl = mapping?.external_entity_data?.url

  return (
    <div className="flex items-center gap-3">
      <span className={`inline-flex items-center gap-1.5 text-sm font-medium ${badge.cls}`} title={mapping?.external_entity_data?.error_message || undefined}>
        <BadgeIcon className="h-4 w-4" />
        {badge.label}
      </span>

      {fulllUrl && (
        <a href={fulllUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 inline-flex items-center gap-1">
          Voir dans Fulll <ExternalLink className="h-3 w-3" />
        </a>
      )}

      {(canSend || isStale) && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => pushMutation.mutate(Boolean(isStale))}
          disabled={pushMutation.isPending}
        >
          {pushMutation.isPending ? (
            <><RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Envoi…</>
          ) : (
            <><BookOpen className="mr-2 h-4 w-4" /> {status === 'error' || isStale ? 'Renvoyer vers Fulll' : 'Envoyer vers Fulll'}</>
          )}
        </Button>
      )}
    </div>
  )
}
