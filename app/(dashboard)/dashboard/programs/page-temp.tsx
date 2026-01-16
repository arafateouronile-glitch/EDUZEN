'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/use-auth'
import { programService } from '@/lib/services/program.service'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus } from 'lucide-react'
import Link from 'next/link'

export default function ProgramsPage() {
  const { user } = useAuth()
  const [search, setSearch] = useState('')

  const { data: programs, isLoading } = useQuery({
    queryKey: ['programs', user?.organization_id, search],
    queryFn: async () => {
      if (!user?.organization_id) return []
      return programService.getAllPrograms(user.organization_id, { search })
    },
    enabled: !!user?.organization_id,
  })

  if (!user?.organization_id) {
    return <div>Aucune organisation</div>
  }

  return (
    <div className="space-y-8 p-6">
      <h1>Programmes</h1>
      {isLoading ? (
        <p>Chargement...</p>
      ) : (
        <p>Nombre de programmes: {(programs as any[])?.length || 0}</p>
      )}
    </div>
  )
}























