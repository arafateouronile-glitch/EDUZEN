'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import type { SessionFormData, SlotConfig } from '../hooks/use-session-detail'
import type { TableRow } from '@/lib/types/supabase-helpers'
import type { FormationWithRelations } from '@/lib/types/query-types'

type Program = TableRow<'programs'>
type Formation = TableRow<'formations'>

interface ConfigProgrammeProps {
  formData: SessionFormData
  onFormDataChange: (data: SessionFormData) => void
  programs?: Program[]
  formations?: FormationWithRelations[]
  sessionPrograms?: Program[]
  formation?: FormationWithRelations | null
  program?: Program | null
}

export function ConfigProgramme({
  formData,
  onFormDataChange,
  programs = [],
  formations = [],
  sessionPrograms = [],
  formation,
  program,
}: ConfigProgrammeProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Programmes et Formation</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Programmes *</label>
          <p className="text-xs text-muted-foreground mb-3">
            Sélectionnez un ou plusieurs programmes associés à cette session
          </p>
          <div className="space-y-2 max-h-64 overflow-y-auto border rounded-lg p-3">
            {programs.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun programme disponible</p>
            ) : (
              programs.map((p) => (
                <label
                  key={p.id}
                  className="flex items-center space-x-2 p-2 rounded hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={formData.program_ids.includes(p.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        onFormDataChange({
                          ...formData,
                          program_ids: [...formData.program_ids, p.id],
                          formation_id: formData.formation_id && formations.some((f) => 
                            f.id === formData.formation_id && f.program_id && [...formData.program_ids, p.id].includes(f.program_id)
                          ) ? formData.formation_id : '',
                        })
                      } else {
                        const newProgramIds = formData.program_ids.filter((id) => id !== p.id)
                        onFormDataChange({
                          ...formData,
                          program_ids: newProgramIds,
                          formation_id: formData.formation_id && formations.some((f) => 
                            f.id === formData.formation_id && f.program_id && newProgramIds.includes(f.program_id)
                          ) ? formData.formation_id : '',
                        })
                      }
                    }}
                    className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                  />
                  <span className="text-sm">{p.name}</span>
                  {p.code && (
                    <span className="text-xs text-muted-foreground">({p.code})</span>
                  )}
                </label>
              ))
            )}
          </div>
          {formData.program_ids.length > 0 && (
            <p className="text-xs text-muted-foreground mt-2">
              {formData.program_ids.length} programme{formData.program_ids.length > 1 ? 's' : ''} sélectionné{formData.program_ids.length > 1 ? 's' : ''}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Formation *</label>
          <select
            value={formData.formation_id}
            onChange={(e) => onFormDataChange({ ...formData, formation_id: e.target.value })}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            disabled={formData.program_ids.length === 0}
          >
            <option value="">Sélectionner une formation</option>
            {formations.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name} {f.program_id && formData.program_ids.includes(f.program_id) ? '' : '(hors programmes sélectionnés)'}
              </option>
            ))}
          </select>
          {formData.program_ids.length === 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              Veuillez d'abord sélectionner au moins un programme
            </p>
          )}
        </div>

        {formation && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium mb-2">Formation sélectionnée</h4>
            <p className="text-sm text-muted-foreground">
              <Link href={`/dashboard/formations/${formation.id}`} className="text-primary hover:underline">
                {formation.name}
              </Link>
            </p>
            {sessionPrograms.length > 0 ? (
              <div className="mt-2">
                <p className="text-xs text-muted-foreground font-medium mb-1">Programmes associés:</p>
                <ul className="list-disc list-inside space-y-1">
                  {sessionPrograms.map((p) => (
                    <li key={p.id} className="text-xs text-muted-foreground">
                      <Link href={`/dashboard/programs/${p.id}`} className="text-primary hover:underline">
                        {p.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : program && (
              <p className="text-xs text-muted-foreground mt-1">
                Programme: <Link href={`/dashboard/programs/${program.id}`} className="text-primary hover:underline">
                  {program.name}
                </Link>
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
























