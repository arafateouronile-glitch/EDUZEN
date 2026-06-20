'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Tag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'

interface Category {
  id: string
  name: string
  color: string | null
}

export default function CategoriesSettingsPage() {
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const [newName, setNewName] = useState('')

  const { data: categories = [], isLoading } = useQuery<Category[]>({
    queryKey: ['program-categories'],
    queryFn: async () => {
      const res = await fetch('/api/program-categories')
      if (!res.ok) throw new Error('Erreur chargement')
      return res.json()
    },
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
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['program-categories'] })
      setNewName('')
      addToast({ type: 'success', title: 'Catégorie créée' })
    },
    onError: (err: Error) => {
      addToast({ type: 'error', title: err.message })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/program-categories/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Erreur suppression')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['program-categories'] })
      addToast({ type: 'success', title: 'Catégorie supprimée' })
    },
    onError: (err: Error) => {
      addToast({ type: 'error', title: err.message })
    },
  })

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    const name = newName.trim()
    if (!name) return
    createMutation.mutate(name)
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Catégories</h1>
        <p className="text-sm text-gray-500 mt-1">
          Gérez les catégories disponibles pour vos programmes et formations.
        </p>
      </div>

      {/* Formulaire d'ajout */}
      <form onSubmit={handleCreate} className="flex gap-3">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Nouvelle catégorie..."
          className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-transparent"
        />
        <Button
          type="submit"
          disabled={!newName.trim() || createMutation.isPending}
          className="bg-brand-blue hover:bg-brand-blue/90 text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Ajouter
        </Button>
      </form>

      {/* Liste */}
      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
        {isLoading ? (
          <div className="p-6 text-center text-gray-400 text-sm">Chargement...</div>
        ) : categories.length === 0 ? (
          <div className="p-8 text-center">
            <Tag className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">Aucune catégorie créée.</p>
            <p className="text-xs text-gray-400 mt-1">Ajoutez votre première catégorie ci-dessus.</p>
          </div>
        ) : (
          categories.map((cat) => (
            <div key={cat.id} className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <Tag className="h-4 w-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-900">{cat.name}</span>
              </div>
              <button
                type="button"
                onClick={() => deleteMutation.mutate(cat.id)}
                disabled={deleteMutation.isPending}
                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                title="Supprimer"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))
        )}
      </div>

      <p className="text-xs text-gray-400">
        La suppression d'une catégorie ne modifie pas les programmes et formations qui l'utilisent déjà.
      </p>
    </div>
  )
}
