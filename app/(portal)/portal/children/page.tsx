'use client'

import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/use-auth'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { User, Calendar, ClipboardList, BookOpen, CreditCard } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import type { StudentWithRelations } from '@/lib/types/query-types'

export default function ChildrenPage() {
  const { user } = useAuth()
  const supabase = createClient()

  const { data: children } = useQuery({
    queryKey: ['children', user?.id],
    queryFn: async () => {
      if (!user?.id || user?.role !== 'parent') return []

      const { data: guardians } = await supabase
        .from('guardians')
        .select('id')
        .eq('user_id', user.id)

      if (!guardians || guardians.length === 0) return []

      const { data: studentGuardians } = await supabase
        .from('student_guardians')
        .select('student_id')
        .in('guardian_id', guardians.map((g) => g.id))

      if (!studentGuardians || studentGuardians.length === 0) return []

      const { data: students } = await supabase
        .from('students')
        .select('*, classes(name)')
        .in('id', studentGuardians.map((sg) => sg.student_id).filter((id): id is string => id !== null))
        .eq('status', 'active')

      return students || []
    },
    enabled: !!user?.id && user?.role === 'parent',
  })

  if (user?.role !== 'parent') {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Accès réservé aux parents
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Mes enfants</h1>
        <p className="mt-2 text-sm text-gray-600">
          Gérez les informations de vos enfants
        </p>
      </div>

      {children && children.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {(children as StudentWithRelations[]).map((child) => (
            <Card key={child.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center space-x-4">
                  {child.photo_url ? (
                    <Image
                      src={child.photo_url}
                      alt={`${child.first_name} ${child.last_name}`}
                      width={80}
                      height={80}
                      className="h-20 w-20 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-20 w-20 rounded-full bg-primary text-white flex items-center justify-center text-2xl font-semibold">
                      {child.first_name.charAt(0)}{child.last_name.charAt(0)}
                    </div>
                  )}
                  <div>
                    <CardTitle className="text-lg">
                      {child.first_name} {child.last_name}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {((child as any).classes as { name: string } | undefined)?.name || 'Non assigné'}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 mb-4">
                  <p className="text-sm text-muted-foreground">
                    N° étudiant: <span className="font-medium">{child.student_number}</span>
                  </p>
                  {child.email && (
                    <p className="text-sm text-muted-foreground">
                      Email: <span className="font-medium">{child.email}</span>
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2 mt-4">
                  <Link
                    href={`/portal/children/${child.id}/attendance`}
                    className="flex flex-col items-center p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <ClipboardList className="h-5 w-5 text-primary mb-1" />
                    <span className="text-xs text-center">Présences</span>
                  </Link>
                  <Link
                    href={`/portal/children/${child.id}/grades`}
                    className="flex flex-col items-center p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <BookOpen className="h-5 w-5 text-primary mb-1" />
                    <span className="text-xs text-center">Notes</span>
                  </Link>
                  <Link
                    href={`/portal/children/${child.id}/schedule`}
                    className="flex flex-col items-center p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Calendar className="h-5 w-5 text-primary mb-1" />
                    <span className="text-xs text-center">Emploi du temps</span>
                  </Link>
                  <Link
                    href={`/portal/children/${child.id}/payments`}
                    className="flex flex-col items-center p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <CreditCard className="h-5 w-5 text-primary mb-1" />
                    <span className="text-xs text-center">Paiements</span>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="text-center py-12 text-muted-foreground">
            <User className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p>Aucun enfant enregistré</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

