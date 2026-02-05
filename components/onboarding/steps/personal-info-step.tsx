'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { User, Phone, Briefcase } from 'lucide-react'

export interface PersonalInfoData {
  firstName: string
  lastName: string
  phone: string
  jobTitle: string
}

interface PersonalInfoStepProps {
  data: PersonalInfoData
  onChange: (data: PersonalInfoData) => void
}

// Validation du numéro de téléphone français
const formatPhoneNumber = (value: string): string => {
  // Supprimer tous les caractères non numériques
  const numbers = value.replace(/\D/g, '')

  // Formater le numéro
  if (numbers.length <= 2) return numbers
  if (numbers.length <= 4) return `${numbers.slice(0, 2)} ${numbers.slice(2)}`
  if (numbers.length <= 6) return `${numbers.slice(0, 2)} ${numbers.slice(2, 4)} ${numbers.slice(4)}`
  if (numbers.length <= 8) return `${numbers.slice(0, 2)} ${numbers.slice(2, 4)} ${numbers.slice(4, 6)} ${numbers.slice(6)}`
  return `${numbers.slice(0, 2)} ${numbers.slice(2, 4)} ${numbers.slice(4, 6)} ${numbers.slice(6, 8)} ${numbers.slice(8, 10)}`
}

export function PersonalInfoStep({ data, onChange }: PersonalInfoStepProps) {
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value)
    onChange({ ...data, phone: formatted })
  }

  return (
    <div className="space-y-8">
      <div className="text-center pb-2">
        <h3 className="font-display text-xl font-bold text-brand-blue mb-2 tracking-tight">
          Qui êtes-vous ?
        </h3>
        <p className="text-gray-600 text-sm max-w-md mx-auto">
          En tant que responsable, vous serez notre interlocuteur privilégié pour toute question relative à votre compte
        </p>
      </div>

      {/* Prénom et Nom */}
      <div className="grid grid-cols-2 gap-5">
        <div>
          <Label htmlFor="firstName" className="flex items-center gap-2 font-semibold text-gray-700 mb-2">
            <div className="w-6 h-6 rounded-lg bg-brand-blue/10 flex items-center justify-center">
              <User className="w-3.5 h-3.5 text-brand-blue" />
            </div>
            Prénom <span className="text-brand-cyan">*</span>
          </Label>
          <Input
            id="firstName"
            value={data.firstName}
            onChange={(e) => onChange({ ...data, firstName: e.target.value })}
            placeholder="Votre prénom"
            className="text-lg"
          />
        </div>
        <div>
          <Label htmlFor="lastName" className="flex items-center gap-2 font-semibold text-gray-700 mb-2">
            Nom <span className="text-brand-cyan">*</span>
          </Label>
          <Input
            id="lastName"
            value={data.lastName}
            onChange={(e) => onChange({ ...data, lastName: e.target.value })}
            placeholder="Votre nom"
            className="text-lg"
          />
        </div>
      </div>

      {/* Téléphone */}
      <div>
        <Label htmlFor="phone" className="flex items-center gap-2 font-semibold text-gray-700 mb-2">
          <div className="w-6 h-6 rounded-lg bg-brand-cyan/10 flex items-center justify-center">
            <Phone className="w-3.5 h-3.5 text-brand-cyan" />
          </div>
          Téléphone <span className="text-brand-cyan">*</span>
        </Label>
        <Input
          id="phone"
          type="tel"
          value={data.phone}
          onChange={handlePhoneChange}
          placeholder="06 12 34 56 78"
          className="text-lg font-mono tracking-wide"
          maxLength={14}
        />
        <p className="text-xs text-gray-500 mt-2">
          Pour vous contacter en cas de besoin urgent uniquement
        </p>
      </div>

      {/* Poste / Fonction */}
      <div>
        <Label htmlFor="jobTitle" className="flex items-center gap-2 font-semibold text-gray-700 mb-2">
          <div className="w-6 h-6 rounded-lg bg-gray-100 flex items-center justify-center">
            <Briefcase className="w-3.5 h-3.5 text-gray-500" />
          </div>
          Poste / Fonction
        </Label>
        <Input
          id="jobTitle"
          value={data.jobTitle}
          onChange={(e) => onChange({ ...data, jobTitle: e.target.value })}
          placeholder="Ex: Directeur, Responsable formation, Gérant..."
          className="text-base"
        />
      </div>

      {/* Note d'information */}
      <div className="bg-gradient-to-r from-brand-blue/5 to-brand-cyan/5 border border-brand-blue/10 rounded-xl p-5">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-brand-blue/10 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-brand-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-brand-blue mb-1">Vos données sont protégées</p>
            <p className="text-xs text-gray-600 leading-relaxed">
              Ces informations sont strictement confidentielles et ne seront jamais partagées. Elles servent uniquement à personnaliser votre expérience et vous informer des mises à jour importantes.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
