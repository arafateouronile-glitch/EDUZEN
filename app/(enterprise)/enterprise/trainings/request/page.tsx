'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/use-auth'
import { createClient } from '@/lib/supabase/client'
import { enterprisePortalService, type TrainingRequest } from '@/lib/services/enterprise-portal.service'
import { GlassCard } from '@/components/ui/glass-card'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import {
  GraduationCap,
  Users,
  Calendar,
  Briefcase,
  ArrowLeft,
  Send,
  Loader2,
  CheckCircle,
  AlertCircle,
} from 'lucide-react'
import Link from 'next/link'

type RequestType = TrainingRequest['request_type']
type FundingType = 'company' | 'opco' | 'cpf' | 'mixed'
type FormatType = 'presential' | 'remote' | 'hybrid' | 'elearning' | 'flexible'
type UrgencyType = 'low' | 'normal' | 'high' | 'urgent'

export default function TrainingRequestPage() {
  const { user } = useAuth()
  const router = useRouter()
  const supabase = createClient()

  // Form state
  const [formData, setFormData] = useState({
    requestType: 'new_enrollment' as RequestType,
    title: '',
    description: '',
    numberOfParticipants: 1,
    preferredStartDate: '',
    preferredEndDate: '',
    preferredFormat: 'flexible' as FormatType,
    budgetRange: '',
    fundingType: 'company' as FundingType,
    opcoPreApproved: false,
    urgency: 'normal' as UrgencyType,
    selectedEmployees: [] as string[],
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

  // Get employees
  const { data: employeesData } = useQuery({
    queryKey: ['enterprise-employees', company?.id],
    queryFn: async () => {
      if (!company?.id) return { employees: [], total: 0 }
      return enterprisePortalService.getEmployees(company.id, { limit: 100 })
    },
    enabled: !!company?.id,
  })

  // Submit mutation
  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!company?.id || !manager?.id) {
        throw new Error('Company or manager not found')
      }

      const request = await enterprisePortalService.createTrainingRequest({
        company_id: company.id,
        requested_by: manager.id,
        request_type: formData.requestType,
        title: formData.title,
        description: formData.description,
        employee_ids: formData.selectedEmployees,
        number_of_participants: formData.numberOfParticipants,
        preferred_start_date: formData.preferredStartDate || undefined,
        preferred_end_date: formData.preferredEndDate || undefined,
        preferred_format: formData.preferredFormat,
        budget_range: formData.budgetRange || undefined,
        funding_type: formData.fundingType,
        opco_pre_approved: formData.opcoPreApproved,
        urgency: formData.urgency,
        status: 'pending',
        attachments: [],
        metadata: {},
      })

      if (!request) {
        throw new Error('Failed to create training request')
      }

      return request
    },
    onSuccess: () => {
      toast.success('Demande de formation envoyée', {
        description: 'L\'organisme de formation a été notifié de votre demande.',
      })
      router.push('/enterprise/trainings')
    },
    onError: (error) => {
      toast.error('Erreur', {
        description: 'Impossible d\'envoyer la demande. Veuillez réessayer.',
      })
      console.error('Error submitting training request:', error)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title) {
      toast.error('Veuillez renseigner un titre pour la demande')
      return
    }
    submitMutation.mutate()
  }

  const requestTypes: { value: RequestType; label: string; description: string; icon: typeof GraduationCap }[] = [
    {
      value: 'new_enrollment',
      label: 'Inscription à une formation',
      description: 'Inscrire un ou plusieurs collaborateurs à une formation existante',
      icon: Users,
    },
    {
      value: 'custom_training',
      label: 'Formation sur mesure',
      description: 'Demander une formation personnalisée adaptée à vos besoins',
      icon: GraduationCap,
    },
    {
      value: 'group_training',
      label: 'Formation de groupe',
      description: 'Organiser une session de formation pour une équipe',
      icon: Briefcase,
    },
    {
      value: 'certification',
      label: 'Certification',
      description: 'Préparer vos collaborateurs à une certification professionnelle',
      icon: CheckCircle,
    },
  ]

  const formatOptions: { value: FormatType; label: string }[] = [
    { value: 'presential', label: 'Présentiel' },
    { value: 'remote', label: 'Distanciel' },
    { value: 'hybrid', label: 'Hybride' },
    { value: 'elearning', label: 'E-learning' },
    { value: 'flexible', label: 'Flexible (à définir)' },
  ]

  const fundingOptions: { value: FundingType; label: string }[] = [
    { value: 'company', label: 'Financement entreprise' },
    { value: 'opco', label: 'Prise en charge OPCO' },
    { value: 'cpf', label: 'CPF des salariés' },
    { value: 'mixed', label: 'Financement mixte' },
  ]

  const urgencyOptions: { value: UrgencyType; label: string; color: string }[] = [
    { value: 'low', label: 'Basse', color: 'text-gray-600' },
    { value: 'normal', label: 'Normale', color: 'text-blue-600' },
    { value: 'high', label: 'Haute', color: 'text-amber-600' },
    { value: 'urgent', label: 'Urgente', color: 'text-red-600' },
  ]

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/enterprise/trainings">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Nouvelle demande de formation
          </h1>
          <p className="text-sm text-gray-600">
            Remplissez le formulaire ci-dessous pour soumettre votre demande
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Request Type Selection */}
        <GlassCard variant="premium" className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Type de demande
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {requestTypes.map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => setFormData({ ...formData, requestType: type.value })}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  formData.requestType === type.value
                    ? 'border-[#274472] bg-[#274472]/5'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${
                    formData.requestType === type.value
                      ? 'bg-[#274472] text-white'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    <type.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">{type.label}</h3>
                    <p className="text-sm text-gray-500 mt-1">{type.description}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </GlassCard>

        {/* Training Details */}
        <GlassCard variant="default" className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Détails de la formation
          </h2>
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Titre de la demande *</Label>
              <Input
                id="title"
                placeholder="Ex: Formation management d'équipe"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="description">Description des besoins</Label>
              <Textarea
                id="description"
                placeholder="Décrivez vos besoins de formation, les objectifs souhaités, le contexte..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="participants">Nombre de participants</Label>
                <Input
                  id="participants"
                  type="number"
                  min={1}
                  value={formData.numberOfParticipants}
                  onChange={(e) => setFormData({ ...formData, numberOfParticipants: parseInt(e.target.value) || 1 })}
                />
              </div>
              <div>
                <Label htmlFor="format">Format souhaité</Label>
                <select
                  id="format"
                  value={formData.preferredFormat}
                  onChange={(e) => setFormData({ ...formData, preferredFormat: e.target.value as FormatType })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#274472]"
                >
                  {formatOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Dates & Budget */}
        <GlassCard variant="default" className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Dates et budget
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startDate">Date de début souhaitée</Label>
              <Input
                id="startDate"
                type="date"
                value={formData.preferredStartDate}
                onChange={(e) => setFormData({ ...formData, preferredStartDate: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="endDate">Date de fin souhaitée</Label>
              <Input
                id="endDate"
                type="date"
                value={formData.preferredEndDate}
                onChange={(e) => setFormData({ ...formData, preferredEndDate: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="budget">Budget envisagé</Label>
              <Input
                id="budget"
                placeholder="Ex: 2000-5000 EUR"
                value={formData.budgetRange}
                onChange={(e) => setFormData({ ...formData, budgetRange: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="urgency">Priorité</Label>
              <select
                id="urgency"
                value={formData.urgency}
                onChange={(e) => setFormData({ ...formData, urgency: e.target.value as UrgencyType })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#274472]"
              >
                {urgencyOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </GlassCard>

        {/* Funding */}
        <GlassCard variant="default" className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Financement
          </h2>
          <div className="space-y-4">
            <div>
              <Label>Type de financement</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2">
                {fundingOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, fundingType: option.value })}
                    className={`p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                      formData.fundingType === option.value
                        ? 'border-[#274472] bg-[#274472]/5 text-[#274472]'
                        : 'border-gray-200 text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            {(formData.fundingType === 'opco' || formData.fundingType === 'mixed') && (
              <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
                <input
                  type="checkbox"
                  id="opcoApproved"
                  checked={formData.opcoPreApproved}
                  onChange={(e) => setFormData({ ...formData, opcoPreApproved: e.target.checked })}
                  className="w-4 h-4 text-[#274472] border-gray-300 rounded focus:ring-[#274472]"
                />
                <label htmlFor="opcoApproved" className="text-sm text-blue-800">
                  J'ai déjà obtenu un accord de prise en charge de mon OPCO
                </label>
              </div>
            )}
          </div>
        </GlassCard>

        {/* Employee Selection */}
        {employeesData && employeesData.employees.length > 0 && (
          <GlassCard variant="default" className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Collaborateurs concernés (optionnel)
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Sélectionnez les collaborateurs qui suivront cette formation
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {employeesData.employees.map((emp: any) => (
                <label
                  key={emp.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                    formData.selectedEmployees.includes(emp.id)
                      ? 'border-[#274472] bg-[#274472]/5'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={formData.selectedEmployees.includes(emp.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormData({
                          ...formData,
                          selectedEmployees: [...formData.selectedEmployees, emp.id],
                        })
                      } else {
                        setFormData({
                          ...formData,
                          selectedEmployees: formData.selectedEmployees.filter((id) => id !== emp.id),
                        })
                      }
                    }}
                    className="w-4 h-4 text-[#274472] border-gray-300 rounded focus:ring-[#274472]"
                  />
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-[#274472] text-white flex items-center justify-center text-sm font-medium">
                      {emp.student?.first_name?.charAt(0)}{emp.student?.last_name?.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {emp.student?.first_name} {emp.student?.last_name}
                      </p>
                      {emp.department && (
                        <p className="text-xs text-gray-500">{emp.department}</p>
                      )}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </GlassCard>
        )}

        {/* Submit */}
        <div className="flex items-center justify-between pt-4">
          <Link href="/enterprise/trainings">
            <Button type="button" variant="outline">
              Annuler
            </Button>
          </Link>
          <Button
            type="submit"
            disabled={submitMutation.isPending || !formData.title}
            className="bg-[#274472] hover:bg-[#1e3a5f]"
          >
            {submitMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Envoi en cours...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Envoyer la demande
              </>
            )}
          </Button>
        </div>
      </form>

      {/* Info */}
      <GlassCard variant="subtle" className="p-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h3 className="font-medium text-gray-900 mb-1">
              Que se passe-t-il après votre demande ?
            </h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>1. L'organisme de formation reçoit votre demande immédiatement</li>
              <li>2. Un conseiller vous contactera sous 48h ouvrées</li>
              <li>3. Vous recevrez une proposition personnalisée</li>
              <li>4. Après validation, les inscriptions seront effectuées</li>
            </ul>
          </div>
        </div>
      </GlassCard>
    </div>
  )
}
