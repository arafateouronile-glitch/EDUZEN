'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/use-auth'
import { enterprisePortalService, type OpcoShareLink } from '@/lib/services/enterprise-portal.service'
import { GlassCard } from '@/components/ui/glass-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { formatDate } from '@/lib/utils'
import {
  Share2,
  Plus,
  Copy,
  Trash2,
  Clock,
  Eye,
  Link as LinkIcon,
  AlertCircle,
  CheckCircle,
  ExternalLink,
  Shield,
  FileText,
  Loader2,
} from 'lucide-react'

export default function OpcoSharePage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [formData, setFormData] = useState({
    title: 'Documents de formation',
    description: '',
    opcoEmail: '',
    opcoName: '',
    expiresInDays: 30,
  })

  // Get company and manager
  const { data: company } = useQuery({
    queryKey: ['enterprise-company', user?.id],
    queryFn: async () => {
      if (!user?.id) return null
      return enterprisePortalService.getCompanyForManager(user.id)
    },
    enabled: !!user?.id,
  })

  const { data: manager } = useQuery({
    queryKey: ['enterprise-manager', user?.id, company?.id],
    queryFn: async () => {
      if (!user?.id || !company?.id) return null
      return enterprisePortalService.getManagerPermissions(user.id, company.id)
    },
    enabled: !!user?.id && !!company?.id,
  })

  // Get existing share links
  const { data: shareLinks, isLoading } = useQuery({
    queryKey: ['enterprise-opco-links', company?.id],
    queryFn: async () => {
      if (!company?.id) return []
      return enterprisePortalService.getOpcoShareLinks(company.id)
    },
    enabled: !!company?.id,
  })

  // Create link mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      if (!company?.id || !manager?.id) {
        throw new Error('Company or manager not found')
      }
      return enterprisePortalService.createOpcoShareLink(company.id, manager.id, {
        title: formData.title,
        description: formData.description,
        opcoEmail: formData.opcoEmail || undefined,
        opcoName: formData.opcoName || undefined,
        expiresInDays: formData.expiresInDays,
        documentTypes: ['certificat_realisation', 'attestation_assiduite', 'convention'],
      })
    },
    onSuccess: (link) => {
      toast.success('Lien de partage créé', {
        description: 'Le lien a été généré avec succès.',
      })
      queryClient.invalidateQueries({ queryKey: ['enterprise-opco-links'] })
      setShowCreateForm(false)
      setFormData({
        title: 'Documents de formation',
        description: '',
        opcoEmail: '',
        opcoName: '',
        expiresInDays: 30,
      })
    },
    onError: () => {
      toast.error('Erreur', {
        description: 'Impossible de créer le lien de partage.',
      })
    },
  })

  // Deactivate link mutation
  const deactivateMutation = useMutation({
    mutationFn: async (linkId: string) => {
      return enterprisePortalService.deactivateOpcoShareLink(linkId)
    },
    onSuccess: () => {
      toast.success('Lien désactivé')
      queryClient.invalidateQueries({ queryKey: ['enterprise-opco-links'] })
    },
    onError: () => {
      toast.error('Erreur lors de la désactivation')
    },
  })

  const handleCopyLink = (token: string) => {
    const url = `${window.location.origin}/opco-access/${token}`
    navigator.clipboard.writeText(url)
    toast.success('Lien copié dans le presse-papier')
  }

  const getShareUrl = (token: string) => {
    return `${typeof window !== 'undefined' ? window.location.origin : ''}/opco-access/${token}`
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Partage OPCO
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Générez des liens sécurisés pour partager vos documents avec votre OPCO
          </p>
        </div>
        {!showCreateForm && (
          <Button
            onClick={() => setShowCreateForm(true)}
            className="bg-[#274472] hover:bg-[#1e3a5f]"
          >
            <Plus className="w-4 h-4 mr-2" />
            Créer un lien de partage
          </Button>
        )}
      </div>

      {/* Info Banner */}
      <GlassCard variant="subtle" className="p-6 border-l-4 border-[#274472]">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-[#274472]/10 flex items-center justify-center flex-shrink-0">
            <Shield className="w-5 h-5 text-[#274472]" />
          </div>
          <div>
            <h3 className="font-medium text-gray-900 mb-1">
              Service Premium : Partage sécurisé avec votre OPCO
            </h3>
            <p className="text-sm text-gray-600">
              Simplifiez vos remboursements OPCO en générant un lien temporaire et sécurisé.
              Votre conseiller OPCO pourra accéder directement aux pièces justificatives
              (certificats de réalisation, attestations d'assiduité, conventions) sans que vous
              ayez à les envoyer manuellement.
            </p>
          </div>
        </div>
      </GlassCard>

      {/* Create Form */}
      {showCreateForm && (
        <GlassCard variant="premium" className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Nouveau lien de partage
          </h2>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              createMutation.mutate()
            }}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="title">Titre du partage</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Ex: Documents formation management"
                />
              </div>
              <div>
                <Label htmlFor="opcoName">Nom de l'OPCO (optionnel)</Label>
                <Input
                  id="opcoName"
                  value={formData.opcoName}
                  onChange={(e) => setFormData({ ...formData, opcoName: e.target.value })}
                  placeholder="Ex: OPCO EP, Atlas, etc."
                />
              </div>
            </div>
            <div>
              <Label htmlFor="opcoEmail">Email du conseiller OPCO (optionnel)</Label>
              <Input
                id="opcoEmail"
                type="email"
                value={formData.opcoEmail}
                onChange={(e) => setFormData({ ...formData, opcoEmail: e.target.value })}
                placeholder="conseiller@opco.fr"
              />
              <p className="text-xs text-gray-500 mt-1">
                Un email sera envoyé automatiquement avec le lien d'accès
              </p>
            </div>
            <div>
              <Label htmlFor="description">Description (optionnel)</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Informations complémentaires pour l'OPCO..."
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="expires">Durée de validité</Label>
              <select
                id="expires"
                value={formData.expiresInDays}
                onChange={(e) => setFormData({ ...formData, expiresInDays: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#274472]"
              >
                <option value={7}>7 jours</option>
                <option value={14}>14 jours</option>
                <option value={30}>30 jours</option>
                <option value={60}>60 jours</option>
                <option value={90}>90 jours</option>
              </select>
            </div>
            <div className="flex items-center justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreateForm(false)}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending}
                className="bg-[#274472] hover:bg-[#1e3a5f]"
              >
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Création...
                  </>
                ) : (
                  <>
                    <Share2 className="w-4 h-4 mr-2" />
                    Créer le lien
                  </>
                )}
              </Button>
            </div>
          </form>
        </GlassCard>
      )}

      {/* Active Share Links */}
      <GlassCard variant="premium" className="p-0 overflow-hidden">
        <div className="p-6 border-b border-gray-200/50">
          <h2 className="text-lg font-semibold text-gray-900">
            Liens de partage actifs
          </h2>
          <p className="text-sm text-gray-500">
            Gérez vos liens de partage existants
          </p>
        </div>

        {isLoading ? (
          <div className="p-6 space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-lg" />
            ))}
          </div>
        ) : !shareLinks || shareLinks.length === 0 ? (
          <div className="p-12 text-center">
            <Share2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Aucun lien de partage actif
            </h3>
            <p className="text-gray-500 mb-6">
              Créez votre premier lien pour partager des documents avec votre OPCO
            </p>
            {!showCreateForm && (
              <Button
                onClick={() => setShowCreateForm(true)}
                className="bg-[#274472] hover:bg-[#1e3a5f]"
              >
                <Plus className="w-4 h-4 mr-2" />
                Créer un lien
              </Button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {shareLinks.map((link) => (
              <ShareLinkCard
                key={link.id}
                link={link}
                onCopy={() => handleCopyLink(link.token)}
                onDeactivate={() => deactivateMutation.mutate(link.id)}
                isDeactivating={deactivateMutation.isPending}
                shareUrl={getShareUrl(link.token)}
              />
            ))}
          </div>
        )}
      </GlassCard>

      {/* Documents included */}
      <GlassCard variant="default" className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Documents accessibles via le lien
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Certificats de réalisation</p>
              <p className="text-sm text-gray-500">Preuve d'achèvement</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Attestations d'assiduité</p>
              <p className="text-sm text-gray-500">Feuilles de présence</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
            <div className="w-10 h-10 rounded-lg bg-violet-100 flex items-center justify-center">
              <FileText className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Conventions de formation</p>
              <p className="text-sm text-gray-500">Contrats signés</p>
            </div>
          </div>
        </div>
      </GlassCard>
    </div>
  )
}

// Share Link Card Component
interface ShareLinkCardProps {
  link: OpcoShareLink
  onCopy: () => void
  onDeactivate: () => void
  isDeactivating: boolean
  shareUrl: string
}

function ShareLinkCard({ link, onCopy, onDeactivate, isDeactivating, shareUrl }: ShareLinkCardProps) {
  const isExpired = new Date(link.expires_at) < new Date()

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-semibold text-gray-900">{link.title}</h3>
            {isExpired ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">
                Expiré
              </span>
            ) : (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
                Actif
              </span>
            )}
          </div>
          {link.opco_name && (
            <p className="text-sm text-gray-600 mb-1">
              OPCO: {link.opco_name}
            </p>
          )}
          {link.description && (
            <p className="text-sm text-gray-500 mb-2">{link.description}</p>
          )}
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              Expire le {formatDate(link.expires_at)}
            </span>
            <span className="flex items-center gap-1">
              <Eye className="w-4 h-4" />
              {link.access_count} accès
            </span>
            {link.last_accessed_at && (
              <span>
                Dernier accès: {formatDate(link.last_accessed_at)}
              </span>
            )}
          </div>
          <div className="mt-3 p-2 bg-gray-50 rounded-lg flex items-center gap-2 overflow-hidden">
            <LinkIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <code className="text-xs text-gray-600 truncate flex-1">
              {shareUrl}
            </code>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onCopy}
            disabled={isExpired}
          >
            <Copy className="w-4 h-4 mr-2" />
            Copier
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onDeactivate}
            disabled={isDeactivating || isExpired}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            {isDeactivating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
