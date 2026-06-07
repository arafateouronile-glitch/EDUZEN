'use client'

import { useEffect, useState, useTransition } from 'react'
import { motion } from '@/components/ui/motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { RefreshCw, Search, Users, CheckCircle2, AlertTriangle, XCircle, Sparkles, Mail, Building2, UserRound, Phone, Video, MessageSquare, ChevronDown, Link2, Check, Ban, Clock, ExternalLink, Loader2, Send } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { OrganizationHealthCard } from '@/components/super-admin/crm/organization-health-card'
import { getCrmOrganizations, getDemoLeads, getVslLeads, getContactSubmissions, updateContactStatus, getAffiliateApplications, updateAffiliateApplicationStatus } from '@/lib/actions/crm-actions'
import type { OrganizationCrmSummary, HealthStatus } from '@/types/crm.types'
import type { DemoLead, VslLead, ContactSubmission, AffiliateApplication } from '@/lib/actions/crm-actions'
import { cn } from '@/lib/utils'

type Tab = 'organisations' | 'leads' | 'vsl' | 'contact' | 'affiliation'
type Filter = 'all' | HealthStatus

const FILTER_CONFIG: { value: Filter; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: 'all', label: 'Tous', icon: Users },
  { value: 'active', label: 'Actifs', icon: CheckCircle2 },
  { value: 'at_risk', label: 'À risque', icon: AlertTriangle },
  { value: 'inactive', label: 'Inactifs', icon: XCircle },
  { value: 'new', label: 'Nouveaux', icon: Sparkles },
]

const FILTER_COLORS: Record<Filter, string> = {
  all: 'data-[active=true]:bg-primary data-[active=true]:text-primary-foreground',
  active: 'data-[active=true]:bg-emerald-100 data-[active=true]:text-emerald-800 dark:data-[active=true]:bg-emerald-950/60 dark:data-[active=true]:text-emerald-300',
  at_risk: 'data-[active=true]:bg-amber-100 data-[active=true]:text-amber-800 dark:data-[active=true]:bg-amber-950/60 dark:data-[active=true]:text-amber-300',
  inactive: 'data-[active=true]:bg-rose-100 data-[active=true]:text-rose-800 dark:data-[active=true]:bg-rose-950/60 dark:data-[active=true]:text-rose-300',
  new: 'data-[active=true]:bg-sky-100 data-[active=true]:text-sky-800 dark:data-[active=true]:bg-sky-950/60 dark:data-[active=true]:text-sky-300',
}

export default function CrmPage() {
  const [tab, setTab] = useState<Tab>('organisations')
  const [orgs, setOrgs] = useState<OrganizationCrmSummary[]>([])
  const [leads, setLeads] = useState<DemoLead[]>([])
  const [vslLeads, setVslLeads] = useState<VslLead[]>([])
  const [contacts, setContacts] = useState<ContactSubmission[]>([])
  const [affiliateApps, setAffiliateApps] = useState<AffiliateApplication[]>([])
  const [affiliateSearch, setAffiliateSearch] = useState('')
  const [affiliateStatusFilter, setAffiliateStatusFilter] = useState<string>('all')
  const [expandedAffiliate, setExpandedAffiliate] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>('all')
  const [search, setSearch] = useState('')
  const [leadsSearch, setLeadsSearch] = useState('')
  const [vslSearch, setVslSearch] = useState('')
  const [contactSearch, setContactSearch] = useState('')
  const [isPending, startTransition] = useTransition()

  const load = () => {
    startTransition(async () => {
      const [orgsResult, leadsResult, vslResult, contactResult, affiliateResult] = await Promise.all([
        getCrmOrganizations(),
        getDemoLeads(),
        getVslLeads(),
        getContactSubmissions(),
        getAffiliateApplications(),
      ])
      if (orgsResult.success && orgsResult.data) {
        setOrgs(orgsResult.data)
        setError(null)
      } else {
        setError(orgsResult.error ?? 'Erreur inconnue')
      }
      if (leadsResult.success && leadsResult.data) setLeads(leadsResult.data)
      if (vslResult.success && vslResult.data) setVslLeads(vslResult.data)
      if (contactResult.success && contactResult.data) setContacts(contactResult.data)
      if (affiliateResult.success && affiliateResult.data) setAffiliateApps(affiliateResult.data)
    })
  }

  const handleContactStatus = async (id: string, status: ContactSubmission['status']) => {
    await updateContactStatus(id, status)
    setContacts((prev) => prev.map((c) => c.id === id ? { ...c, status } : c))
  }

  const handleAffiliateStatus = async (id: string, status: 'pending' | 'approved' | 'banned') => {
    await updateAffiliateApplicationStatus(id, status)
    setAffiliateApps((prev) => prev.map((a) => a.id === id ? { ...a, status } : a))
  }

  // ── Prospect email dialog ────────────────────────────────────────────────
  const [prospectDialog, setProspectDialog] = useState<{
    open: boolean
    orgId: string
    orgName: string
    recipientEmail: string
    recipientName: string
    subject: string
    body: string
  } | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSendingProspect, setIsSendingProspect] = useState(false)
  const [prospectSent, setProspectSent] = useState(false)

  const handleContactOrg = async (org: OrganizationCrmSummary) => {
    setIsGenerating(true)
    setProspectDialog({ open: true, orgId: org.organization_id, orgName: org.organization_name, recipientEmail: '', recipientName: '', subject: '', body: '' })
    try {
      const res = await fetch('/api/super-admin/crm/generate-prospect-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId: org.organization_id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur génération')
      setProspectDialog({ open: true, orgId: org.organization_id, orgName: org.organization_name, recipientEmail: data.recipientEmail, recipientName: data.recipientName, subject: data.subject, body: data.body })
    } catch (err: unknown) {
      setProspectDialog(null)
      alert((err as Error).message || 'Erreur lors de la génération de l\'email')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSendProspectEmail = async () => {
    if (!prospectDialog) return
    setIsSendingProspect(true)
    try {
      const res = await fetch('/api/super-admin/crm/send-prospect-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientEmail: prospectDialog.recipientEmail, subject: prospectDialog.subject, body: prospectDialog.body }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur envoi')
      setProspectSent(true)
      setTimeout(() => { setProspectDialog(null); setProspectSent(false) }, 1800)
    } catch (err: unknown) {
      alert((err as Error).message || 'Erreur lors de l\'envoi')
    } finally {
      setIsSendingProspect(false)
    }
  }

  useEffect(() => { load() }, [])

  const counts = {
    all: orgs.length,
    active: orgs.filter((o) => o.health_status === 'active').length,
    at_risk: orgs.filter((o) => o.health_status === 'at_risk').length,
    inactive: orgs.filter((o) => o.health_status === 'inactive').length,
    new: orgs.filter((o) => o.health_status === 'new').length,
  }

  const filtered = orgs.filter((o) => {
    const matchesFilter = filter === 'all' || o.health_status === filter
    const matchesSearch = !search || o.organization_name.toLowerCase().includes(search.toLowerCase())
    return matchesFilter && matchesSearch
  })

  const filteredLeads = leads.filter((l) =>
    !leadsSearch ||
    `${l.first_name} ${l.last_name} ${l.company} ${l.email}`.toLowerCase().includes(leadsSearch.toLowerCase())
  )

  const filteredVslLeads = vslLeads.filter((l) =>
    !vslSearch ||
    `${l.full_name} ${l.organization_name ?? ''} ${l.email} ${l.phone ?? ''}`.toLowerCase().includes(vslSearch.toLowerCase())
  )

  const filteredAffiliateApps = affiliateApps.filter((a) => {
    const matchesSearch = !affiliateSearch ||
      `${a.full_name ?? ''} ${a.email} ${a.company_name ?? ''}`.toLowerCase().includes(affiliateSearch.toLowerCase())
    const matchesStatus = affiliateStatusFilter === 'all' || a.status === affiliateStatusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl font-bold tracking-tight"
          >
            CRM — Parcours Client
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-muted-foreground"
          >
            Suivez le cycle de vie de chaque Organisme de Formation
          </motion.p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={load}
          disabled={isPending}
          className="gap-2"
        >
          <RefreshCw className={cn('h-4 w-4', isPending && 'animate-spin')} />
          Actualiser
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        <button
          onClick={() => setTab('organisations')}
          className={cn(
            'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
            tab === 'organisations'
              ? 'border-primary text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          Organisations
          <span className="ml-2 rounded-full bg-muted px-1.5 py-0.5 text-[10px]">{orgs.length}</span>
        </button>
        <button
          onClick={() => setTab('leads')}
          className={cn(
            'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
            tab === 'leads'
              ? 'border-primary text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          Leads / Formulaires
          <span className="ml-2 rounded-full bg-muted px-1.5 py-0.5 text-[10px]">{leads.length}</span>
        </button>
        <button
          onClick={() => setTab('vsl')}
          className={cn(
            'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors flex items-center gap-1.5',
            tab === 'vsl'
              ? 'border-violet-500 text-violet-700 dark:text-violet-400'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          <Video className="h-3.5 w-3.5" />
          Leads VSL
          <span className="ml-1 rounded-full bg-violet-100 dark:bg-violet-950/40 text-violet-700 dark:text-violet-400 px-1.5 py-0.5 text-[10px]">
            {vslLeads.length}
          </span>
        </button>
        <button
          onClick={() => setTab('contact')}
          className={cn(
            'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors flex items-center gap-1.5',
            tab === 'contact'
              ? 'border-brand-blue text-brand-blue'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          <MessageSquare className="h-3.5 w-3.5" />
          Messages contact
          {contacts.filter((c) => c.status === 'new').length > 0 && (
            <span className="ml-1 rounded-full bg-brand-blue text-white px-1.5 py-0.5 text-[10px]">
              {contacts.filter((c) => c.status === 'new').length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab('affiliation')}
          className={cn(
            'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors flex items-center gap-1.5',
            tab === 'affiliation'
              ? 'border-emerald-500 text-emerald-700'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          <Link2 className="h-3.5 w-3.5" />
          Candidatures affiliation
          {affiliateApps.filter((a) => a.status === 'pending').length > 0 && (
            <span className="ml-1 rounded-full bg-emerald-600 text-white px-1.5 py-0.5 text-[10px]">
              {affiliateApps.filter((a) => a.status === 'pending').length}
            </span>
          )}
        </button>
      </div>

      {tab === 'organisations' && (
        <>
          {/* Stats summary */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: 'Actifs', count: counts.active, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/20' },
              { label: 'À risque', count: counts.at_risk, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/20' },
              { label: 'Inactifs', count: counts.inactive, color: 'text-rose-600', bg: 'bg-rose-50 dark:bg-rose-950/20' },
              { label: 'Nouveaux', count: counts.new, color: 'text-sky-600', bg: 'bg-sky-50 dark:bg-sky-950/20' },
            ].map((stat) => (
              <Card key={stat.label} className={cn('border-0', stat.bg)}>
                <CardContent className="p-4">
                  <div className={cn('text-2xl font-bold', stat.color)}>{stat.count}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{stat.label}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Filters + Search */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un organisme..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {FILTER_CONFIG.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  data-active={filter === value}
                  onClick={() => setFilter(value)}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
                    'border border-border bg-background text-muted-foreground hover:text-foreground',
                    FILTER_COLORS[value]
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                  <span className="rounded-full bg-black/10 dark:bg-white/10 px-1.5 py-0.5 text-[10px]">
                    {counts[value]}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* List */}
          {error ? (
            <Card className="border-rose-200 bg-rose-50 dark:bg-rose-950/20">
              <CardContent className="p-4 text-sm text-rose-700 dark:text-rose-400">{error}</CardContent>
            </Card>
          ) : isPending ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-28 rounded-lg bg-muted animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Users className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">Aucun organisme trouvé</p>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
            >
              {filtered.map((org) => (
                <OrganizationHealthCard key={org.organization_id} org={org} onContact={handleContactOrg} />
              ))}
            </motion.div>
          )}
        </>
      )}

      {tab === 'vsl' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          {/* Header + search */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Rechercher un lead VSL..."
                value={vslSearch}
                onChange={(e) => setVslSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-violet-400"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {filteredVslLeads.length} inscription{filteredVslLeads.length !== 1 ? 's' : ''} via la page VSL
            </p>
          </div>

          {isPending ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
              ))}
            </div>
          ) : filteredVslLeads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Video className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">Aucun lead VSL pour le moment</p>
            </div>
          ) : (
            <Card>
              <div className="divide-y divide-border">
                {filteredVslLeads.map((lead) => (
                  <div key={lead.id} className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3">
                    {/* Avatar initiales */}
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-950/40 text-violet-700 dark:text-violet-400 font-semibold text-sm">
                      {(lead.first_name?.[0] ?? '?')}{(lead.last_name?.[0] ?? '')}
                    </div>

                    {/* Nom + OF */}
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm truncate">{lead.full_name}</p>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                        <Building2 className="h-3 w-3 shrink-0" />
                        <span className="truncate">{lead.organization_name ?? '—'}</span>
                      </div>
                    </div>

                    {/* Contacts */}
                    <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground sm:shrink-0">
                      <a
                        href={`mailto:${lead.email}`}
                        className="flex items-center gap-1.5 hover:text-foreground transition-colors"
                      >
                        <Mail className="h-3.5 w-3.5 shrink-0" />
                        <span>{lead.email}</span>
                      </a>
                      {lead.phone && (
                        <a
                          href={`tel:${lead.phone}`}
                          className="flex items-center gap-1.5 hover:text-foreground transition-colors"
                        >
                          <Phone className="h-3.5 w-3.5 shrink-0" />
                          <span>{lead.phone}</span>
                        </a>
                      )}
                      <span className="hidden sm:block shrink-0 text-muted-foreground/60">
                        {new Date(lead.created_at).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </motion.div>
      )}

      {tab === 'leads' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          {/* Search leads */}
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un lead..."
              value={leadsSearch}
              onChange={(e) => setLeadsSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {isPending ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
              ))}
            </div>
          ) : filteredLeads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <UserRound className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">Aucun lead trouvé</p>
            </div>
          ) : (
            <Card>
              <div className="divide-y divide-border">
                {filteredLeads.map((lead) => (
                  <div key={lead.id} className="flex flex-col sm:flex-row sm:items-center gap-2 px-4 py-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm">
                        {lead.first_name[0]}{lead.last_name[0]}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">
                          {lead.first_name} {lead.last_name}
                        </p>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                          <Building2 className="h-3 w-3 shrink-0" />
                          <span className="truncate">{lead.company}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground sm:shrink-0">
                      <a
                        href={`mailto:${lead.email}`}
                        className="flex items-center gap-1.5 hover:text-foreground transition-colors"
                      >
                        <Mail className="h-3.5 w-3.5 shrink-0" />
                        <span>{lead.email}</span>
                      </a>
                      <span className="hidden sm:block shrink-0">
                        {new Date(lead.created_at).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </motion.div>
      )}
      {tab === 'contact' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          {/* Search */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Rechercher un message..."
                value={contactSearch}
                onChange={(e) => setContactSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-brand-blue"
              />
            </div>
            <p className="text-xs text-muted-foreground shrink-0">
              {contacts.filter((c) => c.status === 'new').length} non lu(s) · {contacts.length} total
            </p>
          </div>

          {isPending ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
              ))}
            </div>
          ) : contacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <MessageSquare className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">Aucun message reçu</p>
            </div>
          ) : (
            <Card>
              <div className="divide-y divide-border">
                {contacts
                  .filter((c) =>
                    !contactSearch ||
                    `${c.first_name} ${c.last_name} ${c.email} ${c.company} ${c.message}`
                      .toLowerCase()
                      .includes(contactSearch.toLowerCase())
                  )
                  .map((contact) => (
                    <div key={contact.id} className={cn(
                      'px-4 py-4 space-y-3',
                      contact.status === 'new' && 'bg-brand-blue/[0.02] border-l-2 border-brand-blue'
                    )}>
                      {/* Header */}
                      <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                        {/* Avatar */}
                        <div className={cn(
                          'flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-semibold text-sm',
                          contact.status === 'new' ? 'bg-brand-blue text-white' : 'bg-muted text-muted-foreground'
                        )}>
                          {contact.first_name[0]}{contact.last_name[0]}
                        </div>

                        {/* Identité */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className={cn('font-semibold text-sm', contact.status === 'new' && 'text-foreground')}>
                              {contact.first_name} {contact.last_name}
                            </p>
                            <Badge variant="outline" className="text-[10px] py-0 h-4 font-normal">
                              {REASON_LABELS[contact.reason] ?? contact.reason}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mt-1">
                            <a href={`mailto:${contact.email}`} className="flex items-center gap-1 hover:text-foreground transition-colors">
                              <Mail className="h-3 w-3" />{contact.email}
                            </a>
                            {contact.company && (
                              <span className="flex items-center gap-1">
                                <Building2 className="h-3 w-3" />{contact.company}
                              </span>
                            )}
                            <span className="text-muted-foreground/60">
                              {new Date(contact.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                          </div>
                        </div>

                        {/* Statut */}
                        <select
                          value={contact.status}
                          onChange={(e) => handleContactStatus(contact.id, e.target.value as ContactSubmission['status'])}
                          className={cn(
                            'text-xs border rounded px-1.5 py-0.5 bg-background cursor-pointer shrink-0',
                            contact.status === 'new' && 'border-brand-blue text-brand-blue',
                            contact.status === 'read' && 'border-gray-300 text-gray-600',
                            contact.status === 'replied' && 'border-emerald-500 text-emerald-700',
                            contact.status === 'archived' && 'border-gray-200 text-gray-400',
                          )}
                        >
                          <option value="new">Nouveau</option>
                          <option value="read">Lu</option>
                          <option value="replied">Répondu</option>
                          <option value="archived">Archivé</option>
                        </select>
                      </div>

                      {/* Message — toujours visible */}
                      {contact.message && (
                        <div className="ml-12 p-3 bg-muted/50 rounded-lg text-sm text-foreground whitespace-pre-wrap leading-relaxed border border-border/50">
                          {contact.message}
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </Card>
          )}
        </motion.div>
      )}
      {/* Dialog email prospect */}
      <ProspectEmailDialog
        dialog={prospectDialog}
        isGenerating={isGenerating}
        isSending={isSendingProspect}
        sent={prospectSent}
        onChange={(field, value) => setProspectDialog((prev) => prev ? { ...prev, [field]: value } : prev)}
        onSend={handleSendProspectEmail}
        onClose={() => { setProspectDialog(null); setProspectSent(false) }}
      />

      {tab === 'affiliation' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Rechercher nom, email, société…"
                value={affiliateSearch}
                onChange={(e) => setAffiliateSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>
            <select
              value={affiliateStatusFilter}
              onChange={(e) => setAffiliateStatusFilter(e.target.value)}
              className="text-sm border border-border rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-emerald-400"
            >
              <option value="all">Tous ({affiliateApps.length})</option>
              <option value="pending">En attente ({affiliateApps.filter((a) => a.status === 'pending').length})</option>
              <option value="approved">Validés ({affiliateApps.filter((a) => a.status === 'approved').length})</option>
              <option value="banned">Bannis ({affiliateApps.filter((a) => a.status === 'banned').length})</option>
            </select>
          </div>

          {isPending ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
              ))}
            </div>
          ) : filteredAffiliateApps.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Link2 className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">Aucune candidature</p>
            </div>
          ) : (
            <Card>
              <div className="divide-y divide-border">
                {filteredAffiliateApps.map((app) => (
                  <div key={app.id} className="px-4 py-3">
                    <div
                      className="flex flex-col sm:flex-row sm:items-center gap-3 cursor-pointer"
                      onClick={() => setExpandedAffiliate(expandedAffiliate === app.id ? null : app.id)}
                    >
                      {/* Avatar */}
                      <div className={cn(
                        'flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-semibold text-sm uppercase',
                        app.status === 'pending' ? 'bg-emerald-100 text-emerald-700' :
                        app.status === 'approved' ? 'bg-brand-blue/10 text-brand-blue' :
                        'bg-rose-100 text-rose-700'
                      )}>
                        {(app.full_name ?? app.email).slice(0, 2)}
                      </div>

                      {/* Identité */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-sm">{app.full_name ?? '—'}</p>
                          {app.metadata?.profile_type && (
                            <Badge variant="outline" className="text-[10px] py-0 h-4 font-normal">
                              {PROFILE_LABELS[app.metadata.profile_type] ?? app.metadata.profile_type}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                          <a href={`mailto:${app.email}`} className="hover:text-foreground transition-colors" onClick={(e) => e.stopPropagation()}>
                            {app.email}
                          </a>
                          {app.company_name && (
                            <><span>·</span><span className="flex items-center gap-1"><Building2 className="h-3 w-3" />{app.company_name}</span></>
                          )}
                          {app.metadata?.website && (
                            <a
                              href={app.metadata.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 hover:text-foreground transition-colors"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ExternalLink className="h-3 w-3" />Site
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Date + statut + actions */}
                      <div className="flex items-center gap-2 sm:shrink-0 text-xs">
                        <span className="text-muted-foreground hidden sm:block">
                          {new Date(app.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                        <Badge className={cn(
                          'text-[10px] py-0',
                          app.status === 'pending' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                          app.status === 'approved' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                          'bg-rose-100 text-rose-700 border-rose-200'
                        )}>
                          {app.status === 'pending' ? 'En attente' : app.status === 'approved' ? 'Validé' : 'Banni'}
                        </Badge>
                        {app.status === 'pending' && (
                          <>
                            <button
                              title="Valider"
                              onClick={(e) => { e.stopPropagation(); handleAffiliateStatus(app.id, 'approved') }}
                              className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                            >
                              <Check className="h-3.5 w-3.5" />
                            </button>
                            <button
                              title="Refuser"
                              onClick={(e) => { e.stopPropagation(); handleAffiliateStatus(app.id, 'banned') }}
                              className="flex h-7 w-7 items-center justify-center rounded-full bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors"
                            >
                              <Ban className="h-3.5 w-3.5" />
                            </button>
                          </>
                        )}
                        {app.status === 'approved' && (
                          <button
                            title="Remettre en attente"
                            onClick={(e) => { e.stopPropagation(); handleAffiliateStatus(app.id, 'pending') }}
                            className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
                          >
                            <Clock className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', expandedAffiliate === app.id && 'rotate-180')} />
                      </div>
                    </div>

                    {/* Message déroulant */}
                    {expandedAffiliate === app.id && app.metadata?.message && (
                      <div className="mt-3 ml-12 p-3 bg-muted/50 rounded-lg text-sm text-foreground whitespace-pre-wrap">
                        {app.metadata.message}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}
        </motion.div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Dialog prévisualisation email prospect
// ─────────────────────────────────────────────────────────────────────────────

function ProspectEmailDialog({
  dialog,
  isGenerating,
  isSending,
  sent,
  onChange,
  onSend,
  onClose,
}: {
  dialog: { open: boolean; orgName: string; recipientEmail: string; recipientName: string; subject: string; body: string } | null
  isGenerating: boolean
  isSending: boolean
  sent: boolean
  onChange: (field: 'subject' | 'body' | 'recipientEmail', value: string) => void
  onSend: () => void
  onClose: () => void
}) {
  if (!dialog) return null
  return (
    <Dialog open={dialog.open} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-brand-blue" />
            Email de contact — {dialog.orgName}
          </DialogTitle>
        </DialogHeader>

        {isGenerating ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-brand-blue" />
            <p className="text-sm text-muted-foreground">Génération de l&apos;email par l&apos;IA…</p>
          </div>
        ) : sent ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <CheckCircle2 className="h-10 w-10 text-emerald-500" />
            <p className="text-sm font-semibold text-emerald-700">Email envoyé avec succès !</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            {/* Destinataire */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Destinataire</label>
              <Input
                value={dialog.recipientEmail}
                onChange={(e) => onChange('recipientEmail', e.target.value)}
                placeholder="email@exemple.fr"
                className="text-sm"
              />
              {dialog.recipientName && (
                <p className="text-xs text-muted-foreground">{dialog.recipientName}</p>
              )}
            </div>

            {/* Objet */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Objet</label>
              <Input
                value={dialog.subject}
                onChange={(e) => onChange('subject', e.target.value)}
                className="text-sm font-medium"
              />
            </div>

            {/* Corps */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Corps de l&apos;email</label>
              <Textarea
                value={dialog.body}
                onChange={(e) => onChange('body', e.target.value)}
                className="text-sm min-h-[280px] resize-y font-mono leading-relaxed"
              />
            </div>

            <p className="text-xs text-muted-foreground bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              ✏️ Vous pouvez modifier l&apos;objet et le corps avant l&apos;envoi. L&apos;email sera envoyé en votre nom depuis noreply@eduzen.io.
            </p>
          </div>
        )}

        {!isGenerating && !sent && (
          <DialogFooter className="pt-4 border-t">
            <Button variant="outline" onClick={onClose}>Annuler</Button>
            <Button
              onClick={onSend}
              disabled={isSending || !dialog.recipientEmail || !dialog.subject || !dialog.body}
              className="gap-2"
            >
              {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {isSending ? 'Envoi…' : 'Envoyer l\'email'}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}

const PROFILE_LABELS: Record<string, string> = {
  formateur:  'Formateur indépendant',
  consultant: 'Consultant en formation',
  blogueur:   'Blogueur / EdTech',
  conseiller: 'Conseiller OPCO',
  autre:      'Autre',
}

const REASON_LABELS: Record<string, string> = {
  demo:        'Démo',
  question:    'Fonctionnalités',
  pricing:     'Tarifs',
  support:     'Support',
  partnership: 'Partenariat',
  other:       'Autre',
}
