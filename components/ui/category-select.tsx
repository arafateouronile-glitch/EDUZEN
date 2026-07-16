'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Category {
  id: string
  name: string
  color: string | null
}

interface CategorySelectProps {
  value: string
  onChange: (value: string) => void
  className?: string
  selectClassName?: string
  placeholder?: string
}

export function CategorySelect({
  value,
  onChange,
  className,
  selectClassName,
  placeholder = 'Sélectionner une catégorie',
}: CategorySelectProps) {
  const queryClient = useQueryClient()
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')

  const { data: categories = [], isLoading } = useQuery<Category[]>({
    queryKey: ['program-categories'],
    queryFn: async () => {
      const res = await fetch('/api/program-categories')
      if (!res.ok) throw new Error('Erreur chargement catégories')
      return res.json()
    },
    staleTime: 5 * 60 * 1000,
  })

  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch('/api/program-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Erreur création')
      }
      return res.json() as Promise<Category>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['program-categories'] })
    },
  })

  const handleCreate = () => {
    const name = newName.trim()
    if (!name) return
    // Met à jour le formulaire parent immédiatement : si l'utilisateur valide le
    // formulaire principal avant que la requête de création de catégorie ait fini,
    // la valeur sélectionnée doit déjà être la bonne (pas d'attente réseau ici).
    onChange(name)
    setCreating(false)
    setNewName('')
    createMutation.mutate(name)
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex gap-2">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={isLoading}
          className={cn(
            'flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-transparent bg-white disabled:opacity-50',
            selectClassName
          )}
        >
          <option value="">{placeholder}</option>
          {/* Afficher la valeur actuelle même si elle n'est plus dans la liste */}
          {value && !categories.find((c) => c.name === value) && (
            <option value={value}>{value}</option>
          )}
          {categories.map((cat) => (
            <option key={cat.id} value={cat.name}>
              {cat.name}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => { setCreating(true); setNewName('') }}
          title="Créer une nouvelle catégorie"
          className="flex-shrink-0 flex items-center justify-center w-10 h-10 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-500 hover:text-brand-blue transition-colors"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {creating && (
        <div className="flex gap-2 items-center">
          <input
            autoFocus
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); handleCreate() }
              if (e.key === 'Escape') { setCreating(false); setNewName('') }
            }}
            placeholder="Nom de la catégorie..."
            className="flex-1 px-3 py-2 text-sm border border-brand-blue rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-transparent"
          />
          <button
            type="button"
            onClick={handleCreate}
            disabled={!newName.trim() || createMutation.isPending}
            className="flex items-center justify-center w-8 h-8 bg-brand-blue text-white rounded-lg hover:bg-brand-blue/90 disabled:opacity-50 transition-colors"
          >
            <Check className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => { setCreating(false); setNewName('') }}
            className="flex items-center justify-center w-8 h-8 border border-gray-200 text-gray-500 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
          {createMutation.isError && (
            <span className="text-xs text-red-500">{(createMutation.error as Error).message}</span>
          )}
        </div>
      )}
    </div>
  )
}
