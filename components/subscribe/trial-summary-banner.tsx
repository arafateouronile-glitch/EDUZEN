'use client'

import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/use-auth'
import { createClient } from '@/lib/supabase/client'
import { BookOpen, Users, FileText, Calendar } from 'lucide-react'

export function TrialSummaryBanner() {
  const { user } = useAuth()
  const supabase = createClient()

  const { data } = useQuery({
    queryKey: ['trial-summary', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return null
      const [programs, formations, sessions, documents] = await Promise.all([
        supabase.from('programs').select('id', { count: 'exact', head: true }).eq('organization_id', user.organization_id),
        supabase.from('formations').select('id', { count: 'exact', head: true }).eq('organization_id', user.organization_id),
        supabase.from('sessions').select('id', { count: 'exact', head: true }).eq('organization_id', user.organization_id),
        supabase.from('documents').select('id', { count: 'exact', head: true }).eq('organization_id', user.organization_id),
      ])
      return {
        programs: programs.count ?? 0,
        formations: formations.count ?? 0,
        sessions: sessions.count ?? 0,
        documents: documents.count ?? 0,
      }
    },
    enabled: !!user?.organization_id,
  })

  if (!data) return null
  const total = data.programs + data.formations + data.sessions + data.documents
  if (total === 0) return null

  const items = [
    { icon: BookOpen, count: data.programs, label: data.programs > 1 ? 'programmes' : 'programme' },
    { icon: Calendar, count: data.formations, label: data.formations > 1 ? 'formations' : 'formation' },
    { icon: Users, count: data.sessions, label: data.sessions > 1 ? 'sessions' : 'session' },
    { icon: FileText, count: data.documents, label: data.documents > 1 ? 'documents générés' : 'document généré' },
  ].filter(i => i.count > 0)

  return (
    <div className="mb-10 rounded-2xl border border-brand-blue/20 bg-gradient-to-r from-brand-blue/5 via-white to-brand-cyan/5 px-6 py-5">
      <div className="flex items-start justify-between gap-4 mb-3">
        <p className="text-sm font-semibold text-brand-blue">
          Ce que vous avez construit pendant votre essai — ne perdez pas ce travail.
        </p>
        <span className="shrink-0 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-3 py-1 whitespace-nowrap">
          🎁 Premier cycle : 37 jours
        </span>
      </div>
      <div className="flex flex-wrap gap-4">
        {items.map(({ icon: Icon, count, label }) => (
          <div key={label} className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-gray-100 shadow-sm">
            <Icon className="h-4 w-4 text-brand-blue shrink-0" />
            <span className="text-sm font-bold text-gray-900">{count}</span>
            <span className="text-sm text-gray-500">{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
