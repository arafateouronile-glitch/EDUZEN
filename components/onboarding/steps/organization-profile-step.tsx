'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/toast'
import { Search, Loader2, Upload } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { logger } from '@/lib/utils/logger'

export interface OrganizationProfileData {
  name: string
  siret: string
  nda: string // Numéro de Déclaration d'Activité
  address: string
  postalCode: string
  city: string
  logoUrl?: string
}

interface OrganizationProfileStepProps {
  data: OrganizationProfileData
  onChange: (data: OrganizationProfileData) => void
  organizationId?: string
}

export function OrganizationProfileStep({
  data,
  onChange,
  organizationId,
}: OrganizationProfileStepProps) {
  const { addToast } = useToast()
  const supabase = createClient()
  const [searchingSirene, setSearchingSirene] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)

  // Recherche SIRENE
  const handleSearchSirene = async () => {
    if (!data.siret || data.siret.length !== 14) {
      addToast({
        title: 'SIRET invalide',
        description: 'Le SIRET doit contenir 14 chiffres',
        type: 'error',
      })
      return
    }

    setSearchingSirene(true)
    try {
      const response = await fetch(`/api/sirene/search?siret=${data.siret}`)
      const result = await response.json()

      if (response.ok) {
        onChange({
          ...data,
          name: result.name || data.name,
          siret: result.siret || data.siret,
          address: result.address || data.address,
          postalCode: result.postalCode || data.postalCode,
          city: result.city || data.city,
        })
        addToast({
          title: 'Informations récupérées',
          description: 'Les données de l\'entreprise ont été chargées automatiquement',
          type: 'success',
        })
      } else {
        addToast({
          title: 'Recherche échouée',
          description: result.error || 'Impossible de récupérer les informations',
          type: 'error',
        })
      }
    } catch (error) {
      logger.error('Erreur recherche SIRENE', error)
      addToast({
        title: 'Erreur',
        description: 'Une erreur est survenue lors de la recherche',
        type: 'error',
      })
    } finally {
      setSearchingSirene(false)
    }
  }

  // Upload du logo
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !organizationId) return

    setUploadingLogo(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `logo-${organizationId}-${Date.now()}.${fileExt}`
      const filePath = `organizations/${organizationId}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('public')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('public')
        .getPublicUrl(filePath)

      onChange({ ...data, logoUrl: publicUrl })
      addToast({
        title: 'Logo uploadé',
        description: 'Votre logo a été ajouté avec succès',
        type: 'success',
      })
    } catch (error) {
      logger.error('Erreur upload logo', error)
      addToast({
        title: 'Erreur',
        description: 'Impossible d\'uploader le logo',
        type: 'error',
      })
    } finally {
      setUploadingLogo(false)
    }
  }

  return (
    <div className="space-y-8">
      <div className="text-center pb-2">
        <h3 className="font-display text-xl font-bold text-brand-blue mb-2 tracking-tight">
          Présentez votre organisme de formation
        </h3>
        <p className="text-gray-600 text-sm max-w-md mx-auto">
          Ces informations seront utilisées pour personnaliser vos documents officiels et faciliter vos démarches Qualiopi
        </p>
      </div>

      {/* SIRET avec recherche */}
      <div className="bg-brand-blue/[0.02] rounded-xl p-5 border border-brand-blue/10">
        <Label htmlFor="siret" className="text-brand-blue font-semibold flex items-center gap-2 mb-3">
          <Search className="w-4 h-4" />
          Recherche automatique par SIRET
        </Label>
        <div className="flex gap-3">
          <Input
            id="siret"
            value={data.siret}
            onChange={(e) => onChange({ ...data, siret: e.target.value.replace(/\D/g, '') })}
            placeholder="Entrez votre numéro SIRET (14 chiffres)"
            maxLength={14}
            className="text-lg tracking-wide font-mono"
          />
          <Button
            type="button"
            variant="outline"
            onClick={handleSearchSirene}
            disabled={searchingSirene || data.siret.length !== 14}
            className="px-6 border-brand-blue/30 text-brand-blue hover:bg-brand-blue hover:text-white transition-all"
          >
            {searchingSirene ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Search className="w-4 h-4 mr-2" />
                Rechercher
              </>
            )}
          </Button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Gagnez du temps : nous pré-remplissons automatiquement vos informations depuis l'INSEE
        </p>
      </div>

      {/* Nom de l'organisme */}
      <div>
        <Label htmlFor="name" className="font-semibold text-gray-700">
          Nom de votre organisme <span className="text-brand-cyan">*</span>
        </Label>
        <Input
          id="name"
          value={data.name}
          onChange={(e) => onChange({ ...data, name: e.target.value })}
          placeholder="Ex: Institut de Formation Professionnelle"
          className="mt-2 text-lg"
        />
        <p className="text-xs text-gray-500 mt-1">
          Ce nom apparaîtra sur tous vos documents officiels
        </p>
      </div>

      {/* NDA */}
      <div>
        <Label htmlFor="nda" className="font-semibold text-gray-700">
          Numéro de Déclaration d'Activité (NDA)
        </Label>
        <Input
          id="nda"
          value={data.nda}
          onChange={(e) => onChange({ ...data, nda: e.target.value })}
          placeholder="Ex: 11 75 12345 75"
          className="mt-2 font-mono tracking-wide"
        />
        <p className="text-xs text-gray-500 mt-1">
          Attribué par la DREETS · Vous pouvez l'ajouter plus tard si vous ne l'avez pas encore
        </p>
      </div>

      {/* Adresse complète */}
      <div className="space-y-4">
        <Label className="font-semibold text-gray-700">Adresse du siège</Label>
        <Input
          id="address"
          value={data.address}
          onChange={(e) => onChange({ ...data, address: e.target.value })}
          placeholder="Numéro et nom de rue"
          className="text-base"
        />
        <div className="grid grid-cols-3 gap-4">
          <div>
            <Input
              id="postalCode"
              value={data.postalCode}
              onChange={(e) => onChange({ ...data, postalCode: e.target.value })}
              placeholder="Code postal"
              className="font-mono"
            />
          </div>
          <div className="col-span-2">
            <Input
              id="city"
              value={data.city}
              onChange={(e) => onChange({ ...data, city: e.target.value })}
              placeholder="Ville"
            />
          </div>
        </div>
      </div>

      {/* Logo */}
      <div>
        <Label className="font-semibold text-gray-700">Logo de votre organisme</Label>
        <p className="text-xs text-gray-500 mb-3">Optionnel · Apparaîtra sur vos documents</p>
        <div>
          <input
            type="file"
            accept="image/*"
            onChange={handleLogoUpload}
            className="hidden"
            id="logo-upload"
            disabled={uploadingLogo}
          />
          <label htmlFor="logo-upload">
            <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center cursor-pointer hover:border-brand-cyan hover:bg-brand-cyan/[0.02] transition-all duration-300 group">
              {uploadingLogo ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-10 h-10 animate-spin text-brand-blue" />
                </div>
              ) : data.logoUrl ? (
                <div className="space-y-3">
                  <img
                    src={data.logoUrl}
                    alt="Logo"
                    className="max-h-20 mx-auto rounded-lg shadow-sm"
                  />
                  <p className="text-sm text-brand-blue font-medium">Cliquez pour modifier</p>
                </div>
              ) : (
                <>
                  <div className="w-16 h-16 mx-auto bg-gray-100 rounded-2xl flex items-center justify-center mb-3 group-hover:bg-brand-cyan/10 transition-colors">
                    <Upload className="w-8 h-8 text-gray-400 group-hover:text-brand-cyan transition-colors" />
                  </div>
                  <p className="text-gray-700 font-medium mb-1">
                    Déposez votre logo ici
                  </p>
                  <p className="text-gray-400 text-xs">
                    PNG ou JPG · Max 2 Mo
                  </p>
                </>
              )}
            </div>
          </label>
        </div>
      </div>
    </div>
  )
}
