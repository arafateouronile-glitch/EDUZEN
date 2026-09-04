'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  BookOpen, Save, RefreshCw, CheckCircle, AlertCircle, ExternalLink, Info, Eye, EyeOff, Download,
} from 'lucide-react'
import { useAuth } from '@/lib/hooks/use-auth'
import { useToast } from '@/components/ui/toast'
import { accountingService } from '@/lib/services/accounting.service.client'
import { getFulllMetadata, FULLL_METADATA_DEFAULTS, type FulllMetadata } from '@/lib/services/accounting/accounting.types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'

const ALLOWED_ROLES = ['super_admin', 'admin', 'accountant']
const PROVIDER = 'fulll' as const
const FULLL_DOC_URL = 'https://developer.fulll.io/'

type SyncLogRow = {
  id: string
  status: string
  sync_type: string
  entity_type: string | null
  records_synced: number | null
  records_failed: number | null
  records_skipped: number | null
  error_message: string | null
  started_at: string
  completed_at: string | null
}

type StatusResponse = {
  integration: {
    is_active: boolean | null
    is_test_mode: boolean | null
    auto_sync: boolean | null
    company_name: string | null
    last_sync_at: string | null
    last_sync_status: string | null
    last_sync_error: string | null
  } | null
  logs: SyncLogRow[]
}

export default function FulllSettingsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const { user, isLoading: authLoading } = useAuth()
  const { addToast } = useToast()

  const orgId = user?.organization_id

  const [meta, setMeta] = useState<FulllMetadata>(FULLL_METADATA_DEFAULTS)
  const [isTestMode, setIsTestMode] = useState(true)
  const [autoSync, setAutoSync] = useState(false)
  const [showDossier, setShowDossier] = useState(false)
  const [rangeStart, setRangeStart] = useState('')
  const [rangeEnd, setRangeEnd] = useState('')

  // Garde de rôle
  useEffect(() => {
    if (!authLoading && user?.role && !ALLOWED_ROLES.includes(user.role)) {
      addToast({
        type: 'error',
        title: 'Accès refusé',
        description: 'Réservé aux administrateurs et comptables.',
      })
      router.push('/dashboard')
    }
  }, [authLoading, user?.role, router, addToast])

  // Toasts sur retour OAuth
  useEffect(() => {
    if (searchParams.get('connected') === '1') {
      addToast({ type: 'success', title: 'Fulll connecté', description: 'Votre dossier Fulll est relié.' })
      router.replace('/dashboard/settings/fulll')
    }
    const err = searchParams.get('error')
    if (err) {
      const messages: Record<string, string> = {
        invalid_state: 'Lien de connexion expiré, réessayez.',
        org_mismatch: 'Organisation non concordante.',
        forbidden: 'Permissions insuffisantes.',
        missing_code: 'Réponse Fulll incomplète.',
        exchange_failed: "L'échange de jetons Fulll a échoué.",
      }
      addToast({ type: 'error', title: 'Connexion Fulll', description: messages[err] || err })
      router.replace('/dashboard/settings/fulll')
    }
  }, [searchParams, addToast, router])

  // Config existante
  const { data: config, isLoading: configLoading } = useQuery({
    queryKey: ['fulll-config', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const c = await accountingService.getConfig(orgId!, PROVIDER)
      if (c) {
        setMeta(getFulllMetadata({ metadata: c.metadata as Record<string, unknown>, company_id: c.company_id }))
        setIsTestMode(c.is_test_mode ?? true)
        setAutoSync(c.auto_sync ?? false)
      }
      return c
    },
  })

  // Statut + historique (réconcilie les jobs en attente au passage)
  const { data: status, isLoading: statusLoading } = useQuery<StatusResponse>({
    queryKey: ['fulll-status', orgId],
    enabled: !!orgId && !!config?.is_active,
    refetchInterval: 30_000,
    queryFn: async () => {
      const res = await fetch(`/api/accounting/sync?provider=${PROVIDER}`)
      if (!res.ok) throw new Error('Statut indisponible')
      return res.json()
    },
  })

  const isConnected = Boolean(config?.is_active)

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!orgId) throw new Error('Organisation manquante')
      return accountingService.upsertConfig(orgId, PROVIDER, {
        is_test_mode: isTestMode,
        auto_sync: autoSync,
        sync_invoices: true,
        metadata: { ...(config?.metadata as Record<string, unknown> | undefined), ...meta } as never,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fulll-config'] })
      addToast({ type: 'success', title: 'Enregistré', description: 'Configuration Fulll mise à jour.' })
    },
    onError: (e: Error) => addToast({ type: 'error', title: 'Erreur', description: e.message }),
  })

  const connectMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/accounting/authenticate/${PROVIDER}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Connexion impossible')
      if (data.auth_url) window.location.href = data.auth_url
    },
    onError: (e: Error) => addToast({ type: 'error', title: 'Connexion Fulll', description: e.message }),
  })

  const pushMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/accounting/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: PROVIDER, mode: 'range', startDate: rangeStart || undefined, endDate: rangeEnd || undefined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Échec de l'envoi")
      return data as { records_synced: number; records_created: number; records_failed: number; records_skipped: number }
    },
    onSuccess: (r) => {
      queryClient.invalidateQueries({ queryKey: ['fulll-status'] })
      addToast({
        type: r.records_failed > 0 ? 'error' : 'success',
        title: 'Envoi vers Fulll',
        description: `${r.records_synced} synchronisées · ${r.records_created} en attente · ${r.records_failed} en échec · ${r.records_skipped} ignorées`,
      })
    },
    onError: (e: Error) => addToast({ type: 'error', title: 'Envoi vers Fulll', description: e.message }),
  })

  const updateMeta = useCallback(<K extends keyof FulllMetadata>(key: K, value: FulllMetadata[K]) => {
    setMeta((prev) => ({ ...prev, [key]: value }))
  }, [])

  const vatRows = useMemo(() => Object.entries(meta.vat_account_map), [meta.vat_account_map])

  if (authLoading || configLoading) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-brand-blue" />
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <BookOpen className="h-8 w-8 text-brand-blue" />
          Fulll — Compatibilité comptable
        </h1>
        <p className="text-gray-600 mt-1">
          Envoyez vos factures et avoirs de vente dans votre dossier Fulll, sans manipulation de fichier.
        </p>
      </div>

      {/* Connexion */}
      <Card>
        <CardHeader>
          <CardTitle>Connexion</CardTitle>
          <CardDescription>
            Autorisez EDUZEN à publier des écritures dans Fulll (OAuth2).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isConnected ? (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
              <div>
                <p className="font-semibold text-green-800 flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" /> Connecté
                  {config?.company_name ? ` — ${config.company_name}` : ''}
                </p>
                {status?.integration?.last_sync_at && (
                  <p className="text-xs text-green-700 mt-1">
                    Dernière synchro : {new Date(status.integration.last_sync_at).toLocaleString('fr-FR')}
                    {status.integration.last_sync_status ? ` (${status.integration.last_sync_status})` : ''}
                  </p>
                )}
                {status?.integration?.last_sync_error && (
                  <p className="text-xs text-red-600 mt-1">{status.integration.last_sync_error}</p>
                )}
              </div>
              <Button variant="outline" onClick={() => connectMutation.mutate()} disabled={connectMutation.isPending}>
                <ExternalLink className="h-4 w-4 mr-2" /> Reconnecter
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between p-4 bg-gray-50 border rounded-lg">
              <p className="text-sm text-gray-600">Aucun dossier Fulll relié.</p>
              <Button onClick={() => connectMutation.mutate()} disabled={connectMutation.isPending}>
                {connectMutation.isPending ? (
                  <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Redirection…</>
                ) : (
                  <><ExternalLink className="h-4 w-4 mr-2" /> Connecter à Fulll</>
                )}
              </Button>
            </div>
          )}

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2">
            <Info className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
            <div className="text-sm text-blue-800">
              L&apos;accès à l&apos;API Fulll nécessite un compte partenaire.{' '}
              <a href={FULLL_DOC_URL} target="_blank" rel="noopener noreferrer" className="underline inline-flex items-center gap-1">
                Documentation développeur <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Mapping comptable */}
      <Card>
        <CardHeader>
          <CardTitle>Correspondance comptable</CardTitle>
          <CardDescription>Comment EDUZEN ventile une vente avant l&apos;envoi vers Fulll.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="journal">Code journal des ventes</Label>
              <Input id="journal" value={meta.sales_journal_code}
                onChange={(e) => updateMeta('sales_journal_code', e.target.value)} placeholder="VT" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="strategy">Compte client</Label>
              <select id="strategy" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={meta.customer_account_strategy}
                onChange={(e) => updateMeta('customer_account_strategy', e.target.value as FulllMetadata['customer_account_strategy'])}>
                <option value="collective_auxiliary">Compte collectif + auxiliaire</option>
                <option value="per_customer">Un compte par client</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="collective">Compte client collectif</Label>
              <Input id="collective" value={meta.collective_customer_account}
                onChange={(e) => updateMeta('collective_customer_account', e.target.value)} placeholder="411000" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="revenue">Compte de produit par défaut</Label>
              <Input id="revenue" value={meta.default_revenue_account}
                onChange={(e) => updateMeta('default_revenue_account', e.target.value)} placeholder="701000" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Comptes de TVA collectée (par taux)</Label>
            {vatRows.map(([rate, account]) => (
              <div key={rate} className="flex items-center gap-2">
                <span className="text-sm w-16 text-gray-600">{rate} %</span>
                <Input
                  value={account}
                  onChange={(e) =>
                    updateMeta('vat_account_map', { ...meta.vat_account_map, [rate]: e.target.value })
                  }
                  placeholder="445710"
                  className="max-w-xs"
                />
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <Label htmlFor="dossier" className="flex items-center gap-2">
              Identifiant du dossier Fulll
              <button type="button" onClick={() => setShowDossier((s) => !s)} className="text-gray-400">
                {showDossier ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </Label>
            <Input id="dossier" type={showDossier ? 'text' : 'password'} value={meta.company_id || ''}
              onChange={(e) => updateMeta('company_id', e.target.value)}
              placeholder="rempli automatiquement à la connexion" className="max-w-md" />
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <Label htmlFor="test">Mode test</Label>
              <p className="text-sm text-muted-foreground">N&apos;écrit pas dans le dossier réel.</p>
            </div>
            <Switch id="test" checked={isTestMode} onCheckedChange={setIsTestMode} />
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <Label htmlFor="auto">Synchronisation automatique nocturne</Label>
              <p className="text-sm text-muted-foreground">Envoie chaque nuit les nouvelles factures / avoirs.</p>
            </div>
            <Switch id="auto" checked={autoSync} onCheckedChange={setAutoSync} />
          </div>

          <div className="flex justify-end">
            <Button variant="outline" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              <Save className="h-4 w-4 mr-2" /> Enregistrer
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Envoi manuel */}
      <Card>
        <CardHeader>
          <CardTitle>Envoyer vers Fulll</CardTitle>
          <CardDescription>Envoi ponctuel des factures et avoirs d&apos;une période. Les documents déjà envoyés sont ignorés.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start">Date de début</Label>
              <Input id="start" type="date" value={rangeStart} onChange={(e) => setRangeStart(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end">Date de fin</Label>
              <Input id="end" type="date" value={rangeEnd} onChange={(e) => setRangeEnd(e.target.value)} />
            </div>
          </div>
          <p className="text-sm text-muted-foreground -mt-2">Laissez vide pour toute la période.</p>
          <div className="flex justify-end">
            <Button onClick={() => pushMutation.mutate()} disabled={!isConnected || pushMutation.isPending}>
              {pushMutation.isPending ? (
                <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Envoi…</>
              ) : (
                <><Download className="h-4 w-4 mr-2" /> Envoyer vers Fulll</>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Historique */}
      <Card>
        <CardHeader>
          <CardTitle>Historique des synchronisations</CardTitle>
        </CardHeader>
        <CardContent>
          {statusLoading ? (
            <p className="text-sm text-muted-foreground">Chargement…</p>
          ) : !status?.logs?.length ? (
            <p className="text-sm text-muted-foreground">Aucune synchronisation pour le moment.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b">
                    <th className="py-2 pr-4">Date</th>
                    <th className="py-2 pr-4">Type</th>
                    <th className="py-2 pr-4">Statut</th>
                    <th className="py-2 pr-4">OK</th>
                    <th className="py-2 pr-4">Échec</th>
                    <th className="py-2 pr-4">Ignorées</th>
                  </tr>
                </thead>
                <tbody>
                  {status.logs.map((log) => (
                    <tr key={log.id} className="border-b last:border-0">
                      <td className="py-2 pr-4">{new Date(log.started_at).toLocaleString('fr-FR')}</td>
                      <td className="py-2 pr-4">{log.sync_type}</td>
                      <td className="py-2 pr-4">
                        <span className={
                          log.status === 'success' ? 'text-green-600 inline-flex items-center gap-1'
                          : log.status === 'partial' ? 'text-amber-600 inline-flex items-center gap-1'
                          : 'text-red-600 inline-flex items-center gap-1'
                        }>
                          {log.status === 'success' ? <CheckCircle className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
                          {log.status}
                        </span>
                      </td>
                      <td className="py-2 pr-4">{log.records_synced ?? 0}</td>
                      <td className="py-2 pr-4">{log.records_failed ?? 0}</td>
                      <td className="py-2 pr-4">{log.records_skipped ?? 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
