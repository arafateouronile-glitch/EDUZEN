'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { SessionFormData } from '../hooks/use-session-detail'
import type { TableRow } from '@/lib/types/supabase-helpers'

type User = TableRow<'users'>

interface ConfigIntervenantsProps {
  formData: SessionFormData
  onFormDataChange: (data: SessionFormData) => void
  users?: User[]
}

export function ConfigIntervenants({
  formData,
  onFormDataChange,
  users = [],
}: ConfigIntervenantsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Intervenants</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Enseignant/Formateur</label>
          <select
            value={formData.teacher_id}
            onChange={(e) => onFormDataChange({ ...formData, teacher_id: e.target.value })}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="">Sélectionner un intervenant</option>
            {users.filter((u) => u.role === 'teacher' || u.role === 'admin').map((u) => (
              <option key={u.id} value={u.id}>
                {u.full_name}
              </option>
            ))}
          </select>
        </div>
      </CardContent>
    </Card>
  )
}
























