'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { SessionFormData } from '../hooks/use-session-detail'
import type { TableRow } from '@/lib/types/supabase-helpers'

type User = TableRow<'users'>

interface ConfigInitialisationProps {
  formData: SessionFormData
  onFormDataChange: (data: SessionFormData) => void
  users?: User[]
}

export function ConfigInitialisation({
  formData,
  onFormDataChange,
  users = [],
}: ConfigInitialisationProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Informations générales</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Nom de la session *</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => onFormDataChange({ ...formData, name: e.target.value })}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Type de session</label>
          <select
            value={formData.type}
            onChange={(e) => onFormDataChange({ ...formData, type: e.target.value })}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="formation_professionnelle">Formation professionnelle</option>
            <option value="stage">Stage</option>
            <option value="cours">Cours</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Code interne</label>
          <input
            type="text"
            value={formData.code}
            onChange={(e) => onFormDataChange({ ...formData, code: e.target.value })}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Gestionnaire n°1</label>
            <select
              value={formData.manager1_id}
              onChange={(e) => onFormDataChange({ ...formData, manager1_id: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="">Sélectionner un gestionnaire</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.full_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Gestionnaire n°2</label>
            <select
              value={formData.manager2_id}
              onChange={(e) => onFormDataChange({ ...formData, manager2_id: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="">Sélectionner un gestionnaire</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.full_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={formData.inter_entreprise}
              onChange={(e) => onFormDataChange({ ...formData, inter_entreprise: e.target.checked })}
              className="rounded border-gray-300"
            />
            <span className="text-sm">Inter entreprise</span>
          </label>
          <p className="text-xs text-muted-foreground mt-1 ml-6">
            Décochez la case pour considérer cette session comme intra entreprise
          </p>
        </div>

        <div>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={formData.sous_traitance}
              onChange={(e) => onFormDataChange({ ...formData, sous_traitance: e.target.checked })}
              className="rounded border-gray-300"
            />
            <span className="text-sm">Sous-traitance</span>
          </label>
          <p className="text-xs text-muted-foreground mt-1 ml-6">
            Cochez la case si cette session est réalisée en sous-traitance
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Fuseau horaire</label>
          <select
            value={formData.timezone}
            onChange={(e) => onFormDataChange({ ...formData, timezone: e.target.value })}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="Europe/Paris">UTC +01:00 Europe/Paris</option>
            <option value="Africa/Dakar">UTC +00:00 Africa/Dakar</option>
            <option value="Africa/Abidjan">UTC +00:00 Africa/Abidjan</option>
          </select>
          <p className="text-xs text-muted-foreground mt-1">
            Fuseau horaire utilisé pour la définition des dates et heures des modules
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
























