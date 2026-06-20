'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { MapPin, Plus, Check, X, Building2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Site {
  id: string
  name: string
  address: string | null
  city: string | null
  postal_code: string | null
  is_headquarters: boolean | null
}

function siteLabel(site: Site): string {
  const parts = [site.address, site.postal_code, site.city].filter(Boolean).join(' ')
  return parts ? `${site.name} — ${parts}` : site.name
}

interface LocationSelectProps {
  value: string
  onChange: (value: string) => void
  className?: string
  inputClassName?: string
  placeholder?: string
}

export function LocationSelect({
  value,
  onChange,
  className,
  inputClassName,
  placeholder = 'Ex : Salle A1 ou 12 rue de Rivoli, 75001 Paris',
}: LocationSelectProps) {
  const queryClient = useQueryClient()
  const [mode, setMode] = useState<'site' | 'custom'>('site')
  const [creating, setCreating] = useState(false)
  const [newSite, setNewSite] = useState({ name: '', address: '', city: '', postal_code: '' })

  const { data: sites = [] } = useQuery<Site[]>({
    queryKey: ['org-sites'],
    queryFn: async () => {
      const res = await fetch('/api/sites')
      if (!res.ok) throw new Error('Erreur chargement sites')
      return res.json()
    },
    staleTime: 5 * 60 * 1000,
  })

  // Détecter le mode initial selon la valeur existante
  useEffect(() => {
    if (!value) return
    const match = sites.find((s) => siteLabel(s) === value)
    setMode(match ? 'site' : 'custom')
  }, [sites, value])

  const createMutation = useMutation({
    mutationFn: async (site: typeof newSite) => {
      const res = await fetch('/api/sites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(site),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Erreur création')
      }
      return res.json() as Promise<Site>
    },
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['org-sites'] })
      onChange(siteLabel(created))
      setMode('site')
      setCreating(false)
      setNewSite({ name: '', address: '', city: '', postal_code: '' })
    },
  })

  const selectedSiteId = sites.find((s) => siteLabel(s) === value)?.id ?? ''

  return (
    <div className={cn('space-y-2', className)}>
      {/* Toggle mode */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-lg w-fit text-xs">
        <button
          type="button"
          onClick={() => { setMode('site'); onChange('') }}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors font-medium',
            mode === 'site'
              ? 'bg-white text-brand-blue shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          )}
        >
          <Building2 className="h-3.5 w-3.5" />
          Site enregistré
        </button>
        <button
          type="button"
          onClick={() => { setMode('custom'); onChange('') }}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors font-medium',
            mode === 'custom'
              ? 'bg-white text-brand-blue shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          )}
        >
          <MapPin className="h-3.5 w-3.5" />
          Adresse libre
        </button>
      </div>

      {mode === 'site' ? (
        <div className="space-y-2">
          <div className="flex gap-2">
            <select
              value={selectedSiteId}
              onChange={(e) => {
                const site = sites.find((s) => s.id === e.target.value)
                onChange(site ? siteLabel(site) : '')
              }}
              className={cn(
                'flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-transparent bg-white',
                inputClassName
              )}
            >
              <option value="">Sélectionner un site...</option>
              {sites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name}{site.is_headquarters ? ' (Siège)' : ''}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setCreating(true)}
              title="Ajouter un site"
              className="flex-shrink-0 flex items-center justify-center w-10 h-10 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-500 hover:text-brand-blue transition-colors"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          {/* Adresse complète du site sélectionné */}
          {value && selectedSiteId && (
            <p className="text-xs text-gray-500 flex items-center gap-1.5 pl-1">
              <MapPin className="h-3 w-3 text-brand-blue flex-shrink-0" />
              {value}
            </p>
          )}

          {/* Mini formulaire de création */}
          {creating && (
            <div className="border border-brand-blue/30 rounded-xl p-4 space-y-3 bg-blue-50/30">
              <p className="text-xs font-semibold text-gray-700">Nouveau site</p>
              <input
                autoFocus
                type="text"
                placeholder="Nom du site *"
                value={newSite.name}
                onChange={(e) => setNewSite({ ...newSite, name: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-blue"
              />
              <input
                type="text"
                placeholder="Adresse"
                value={newSite.address}
                onChange={(e) => setNewSite({ ...newSite, address: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-blue"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Code postal"
                  value={newSite.postal_code}
                  onChange={(e) => setNewSite({ ...newSite, postal_code: e.target.value })}
                  className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-blue"
                />
                <input
                  type="text"
                  placeholder="Ville"
                  value={newSite.city}
                  onChange={(e) => setNewSite({ ...newSite, city: e.target.value })}
                  className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-blue"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => createMutation.mutate(newSite)}
                  disabled={!newSite.name.trim() || createMutation.isPending}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-brand-blue text-white rounded-lg hover:bg-brand-blue/90 disabled:opacity-50"
                >
                  <Check className="h-3.5 w-3.5" />
                  Enregistrer
                </button>
                <button
                  type="button"
                  onClick={() => { setCreating(false); setNewSite({ name: '', address: '', city: '', postal_code: '' }) }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-200 text-gray-500 rounded-lg hover:bg-gray-50"
                >
                  <X className="h-3.5 w-3.5" />
                  Annuler
                </button>
                {createMutation.isError && (
                  <span className="text-xs text-red-500 self-center">{(createMutation.error as Error).message}</span>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cn(
            'w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-transparent',
            inputClassName
          )}
        />
      )}
    </div>
  )
}
