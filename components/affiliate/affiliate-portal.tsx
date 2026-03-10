'use client'

import React, { useState, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from '@/components/ui/motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Copy,
  Check,
  TrendingUp,
  Wallet,
  Clock,
  Percent,
  Link2,
  Download,
  Mail,
  FileText,
  Image as ImageIcon,
  Video,
} from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import {
  RechartsAreaChart,
  RechartsArea,
  RechartsXAxis,
  RechartsYAxis,
  RechartsTooltip,
  RechartsResponsiveContainer,
  RechartsCartesianGrid,
} from '@/components/charts/recharts-wrapper'
import { updateAffiliatePaymentDetails } from '@/lib/actions/affiliate-portal-actions'
import type { AffiliatePortalData } from '@/app/api/affiliate/me/route'

const BASE_URL = typeof window !== 'undefined' ? window.location.origin : 'https://eduzen.fr'
const KIT_LOGO = process.env.NEXT_PUBLIC_AFFILIATE_KIT_URL || BASE_URL
const KIT_BANNERS = process.env.NEXT_PUBLIC_AFFILIATE_KIT_URL || BASE_URL
const KIT_PDF = process.env.NEXT_PUBLIC_AFFILIATE_KIT_URL || BASE_URL
const CONTACT_EMAIL = process.env.NEXT_PUBLIC_AFFILIATE_CONTACT_EMAIL || 'arafate@eduzen.fr'

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(value)
    setCopied(true)
    toast.success(`${label} copié`)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <Button variant="outline" size="sm" onClick={copy} className="gap-2 shrink-0">
      {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
      Copier
    </Button>
  )
}

export function AffiliatePortal({ data }: { data: AffiliatePortalData }) {
  const queryClient = useQueryClient()
  const [iban, setIban] = useState(data.affiliate.payment_iban ?? '')
  const [bic, setBic] = useState(data.affiliate.payment_bic ?? '')
  const [holderName, setHolderName] = useState(data.affiliate.payment_holder_name ?? '')
  const [saving, setSaving] = useState(false)

  const referralLink = `${BASE_URL}?ref=${data.affiliate.id}`

  const chartData = useMemo(() => {
    const months: Record<string, number> = {}
    const now = new Date()
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      months[key] = 0
    }
    for (const c of data.commissions) {
      if (c.status !== 'paid') continue
      const d = new Date(c.created_at)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (key in months) months[key] += Number(c.commission_amount)
    }
    return Object.entries(months)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, value]) => ({
        month: new Date(month + '-01').toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }),
        revenus: Math.round(value * 100) / 100,
      }))
  }, [data.commissions])

  const nextPayoutLabel = useMemo(() => {
    const now = new Date()
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    return `Traitement en cours · Fin ${formatDate(end.toISOString().slice(0, 10))}`
  }, [])

  const handleSavePayment = async () => {
    setSaving(true)
    const res = await updateAffiliatePaymentDetails({
      payment_iban: iban.trim() || null,
      payment_bic: bic.trim() || null,
      payment_holder_name: holderName.trim() || null,
    })
    setSaving(false)
    if (res.success) {
      toast.success('Coordonnées bancaires enregistrées')
      queryClient.invalidateQueries({ queryKey: ['affiliate-portal'] })
    } else {
      toast.error(res.error)
    }
  }

  return (
    <div className="space-y-8 pb-8">
      {/* --- Money Bar --- */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="overflow-hidden border-0 bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium opacity-90">Total cumulé</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold tracking-tight">
                {formatCurrency(data.stats.totalEarned, 'EUR')}
              </p>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
        >
          <Card className="overflow-hidden border-0 bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium opacity-90">En attente</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold tracking-tight">
                {formatCurrency(data.stats.pendingAmount, 'EUR')}
              </p>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Card className="overflow-hidden border-0 bg-gradient-to-br from-emerald-600 to-green-700 text-white shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium opacity-90">Taux de conversion</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold tracking-tight">{data.stats.conversionRate} %</p>
              <p className="text-xs opacity-80 mt-1">
                {data.stats.totalConversions} conversion{data.stats.totalConversions !== 1 ? 's' : ''} / {data.stats.totalClicks} clics
              </p>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
        >
          <Card className="border bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Prochain paiement
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm font-medium">{nextPayoutLabel}</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* --- Boîte à outils (Referral Hub) --- */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <Card className="border-emerald-200/50 bg-gradient-to-br from-emerald-50/80 to-teal-50/50 dark:from-emerald-950/20 dark:to-teal-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-emerald-800 dark:text-emerald-200">
              <Link2 className="h-5 w-5" />
              Boîte à outils
            </CardTitle>
            <CardDescription>
              Votre lien et votre code promo pour suivre vos conversions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
              <Label className="text-sm font-medium shrink-0">Votre lien unique</Label>
              <div className="flex flex-1 flex-col xs:flex-row gap-2">
                <code className="flex-1 rounded-lg border bg-muted/50 px-3 py-2 text-sm break-all">
                  {referralLink}
                </code>
                <CopyButton value={referralLink} label="Lien" />
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
              <Label className="text-sm font-medium shrink-0">Votre code promo</Label>
              <div className="flex flex-1 flex-col xs:flex-row gap-2">
                {data.promoCode ? (
                  <>
                    <code className="flex-1 rounded-lg border bg-muted/50 px-3 py-2 text-sm font-mono font-semibold">
                      {data.promoCode.code}
                      {data.promoCode.discount_value ? ` (-${data.promoCode.discount_value}%)` : ''}
                    </code>
                    <CopyButton value={data.promoCode.code} label="Code promo" />
                  </>
                ) : (
                  <span className="text-muted-foreground text-sm">Aucun code promo actif</span>
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Astuce : partagez votre code dans vos newsletters pour un suivi infaillible.
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* --- Graphique + Tableau --- */}
      <div className="grid gap-6 lg:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.25 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
                Évolution des revenus
              </CardTitle>
              <CardDescription>Derniers 6 mois (commissions payées)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <RechartsResponsiveContainer width="100%" height="100%">
                  <RechartsAreaChart
                    data={chartData}
                    margin={{ top: 8, right: 8, left: 8, bottom: 8 }}
                  >
                    <defs>
                      <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <RechartsCartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <RechartsXAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <RechartsYAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `€${v}`} />
                    <RechartsTooltip
                      formatter={(value: number) => [formatCurrency(value, 'EUR'), 'Revenus']}
                    />
                    <RechartsArea
                      type="monotone"
                      dataKey="revenus"
                      stroke="#059669"
                      strokeWidth={2}
                      fill="url(#areaGradient)"
                    />
                  </RechartsAreaChart>
                </RechartsResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Conversions & commissions</CardTitle>
              <CardDescription>Liste des ventes attribuées (anonymisées)</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-64 overflow-auto rounded-b-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="text-right">Commission</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.commissions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                          Aucune commission pour le moment
                        </TableCell>
                      </TableRow>
                    ) : (
                      data.commissions.slice(0, 20).map((c) => (
                        <TableRow key={c.id}>
                          <TableCell className="text-sm">
                            {formatDate(c.created_at)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={c.status === 'paid' ? 'default' : 'secondary'}>
                              {c.status === 'paid' ? 'Payé' : 'En attente'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(c.commission_amount, 'EUR')}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* --- Marketing Toolbox --- */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.35 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Kit Marketing
            </CardTitle>
            <CardDescription>
              Téléchargez logos, bannières et supports pour promouvoir EDUZEN
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" className="gap-2" asChild>
                <a href={KIT_LOGO} target="_blank" rel="noopener noreferrer">
                  <ImageIcon className="h-4 w-4" aria-hidden />
                  Logo
                </a>
              </Button>
              <Button variant="outline" className="gap-2" asChild>
                <a href={KIT_BANNERS} target="_blank" rel="noopener noreferrer">
                  <ImageIcon className="h-4 w-4" aria-hidden />
                  Bannières
                </a>
              </Button>
              <Button variant="outline" className="gap-2" asChild>
                <a href={KIT_PDF} target="_blank" rel="noopener noreferrer">
                  <FileText className="h-4 w-4" />
                  PDF présentation
                </a>
              </Button>
              <Button variant="outline" className="gap-2" asChild>
                <a href={KIT_PDF} target="_blank" rel="noopener noreferrer">
                  <Video className="h-4 w-4" />
                  Script vidéo démo
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* --- Paramètres de paiement --- */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.4 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Coordonnées bancaires
            </CardTitle>
            <CardDescription>
              Renseignez votre IBAN pour recevoir vos commissions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="iban">IBAN</Label>
              <Input
                id="iban"
                value={iban}
                onChange={(e) => setIban(e.target.value)}
                placeholder="FR76 1234 5678 9012 3456 7890 123"
                className="mt-1 font-mono"
              />
            </div>
            <div>
              <Label htmlFor="bic">BIC (optionnel)</Label>
              <Input
                id="bic"
                value={bic}
                onChange={(e) => setBic(e.target.value)}
                placeholder="BNPAFRPP"
                className="mt-1 font-mono"
              />
            </div>
            <div>
              <Label htmlFor="holder">Titulaire du compte</Label>
              <Input
                id="holder"
                value={holderName}
                onChange={(e) => setHolderName(e.target.value)}
                placeholder="Jean Dupont"
                className="mt-1"
              />
            </div>
            <Button onClick={handleSavePayment} disabled={saving} className="gap-2">
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      {/* --- Support Corner --- */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.45 }}
      >
        <Card className="border-sky-200/50 bg-gradient-to-br from-sky-50/80 to-blue-50/50 dark:from-sky-950/20 dark:to-blue-950/20">
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-sky-800 dark:text-sky-200">
              Besoin d&apos;un accès démo pour un gros client ?
            </p>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="inline-flex items-center gap-2 mt-2 text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300 font-medium"
            >
              <Mail className="h-4 w-4" />
              Contactez Arafate
            </a>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
