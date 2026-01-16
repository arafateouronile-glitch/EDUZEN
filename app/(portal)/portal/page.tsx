'use client'

import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/use-auth'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { User, Calendar, ClipboardList, CreditCard, FileText, TrendingUp, AlertCircle } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import Link from 'next/link'
import type { StudentWithRelations } from '@/lib/types/query-types'

export default function PortalDashboardPage() {
  const { user } = useAuth()
  const supabase = createClient()

  // Récupérer les enfants du parent
  const { data: children } = useQuery({
    queryKey: ['children', user?.id],
    queryFn: async () => {
      if (!user?.id || user?.role !== 'parent') return []

      // Récupérer les tuteurs liés à cet utilisateur
      const { data: guardians } = await supabase
        .from('guardians')
        .select('id')
        .eq('user_id', user.id)

      if (!guardians || guardians.length === 0) return []

      // Récupérer les élèves liés à ces tuteurs
      const { data: studentGuardians } = await supabase
        .from('student_guardians')
        .select('student_id')
        .in('guardian_id', guardians.map((g) => g.id))

      if (!studentGuardians || studentGuardians.length === 0) return []

      const { data: students } = await supabase
        .from('students')
        .select('*, classes(name)')
        .in('id', studentGuardians.map((sg) => sg.student_id))
        .eq('status', 'active')

      return students || []
    },
    enabled: !!user?.id && user?.role === 'parent',
  })

  // Récupérer les données de l'étudiant
  const { data: student } = useQuery({
    queryKey: ['student', user?.id],
    queryFn: async () => {
      if (!user?.id || user?.role !== 'student') return null

      const { data } = await supabase
        .from('students')
        .select('*, classes(name)')
        .eq('id', user.id)
        .single()

      return data
    },
    enabled: !!user?.id && user?.role === 'student',
  })

  // Récupérer les factures impayées
  const { data: unpaidInvoices } = useQuery({
    queryKey: ['unpaid-invoices', user?.id],
    queryFn: async () => {
      if (!user?.id) return []

      let studentIds: string[] = []

      if (user?.role === 'parent' && children) {
        studentIds = children.map((child: any) => child.id)
      } else if (user?.role === 'student' && student) {
        studentIds = [student.id]
      }

      if (studentIds.length === 0) return []

      const { data } = await supabase
        .from('invoices')
        .select('*')
        .in('student_id', studentIds)
        .in('status', ['sent', 'partial', 'overdue'])
        .order('due_date', { ascending: true })
        .limit(5)

      return data || []
    },
    enabled: (!!user?.id && user?.role === 'parent' && !!children) || (!!user?.id && user?.role === 'student' && !!student),
  })

  // Récupérer les présences récentes
  const { data: recentAttendance } = useQuery({
    queryKey: ['recent-attendance', user?.id],
    queryFn: async () => {
      if (!user?.id) return []

      let studentIds: string[] = []

      if (user?.role === 'parent' && children) {
        studentIds = children.map((child: any) => child.id)
      } else if (user?.role === 'student' && student) {
        studentIds = [student.id]
      }

      if (studentIds.length === 0) return []

      const { data } = await supabase
        .from('attendance')
        .select('*, students(first_name, last_name), classes(name)')
        .in('student_id', studentIds)
        .order('date', { ascending: false })
        .limit(10)

      return data || []
    },
    enabled: (!!user?.id && user?.role === 'parent' && !!children) || (!!user?.id && user?.role === 'student' && !!student),
  })

  // Récupérer les statistiques de présence
  const { data: attendanceStats } = useQuery({
    queryKey: ['attendance-stats', user?.id],
    queryFn: async () => {
      if (!user?.id) return null

      let studentIds: string[] = []

      if (user?.role === 'parent' && children) {
        studentIds = children.map((child: any) => child.id)
      } else if (user?.role === 'student' && student) {
        studentIds = [student.id]
      }

      if (studentIds.length === 0) return null

      const currentMonth = new Date()
      currentMonth.setDate(1)

      const { data } = await supabase
        .from('attendance')
        .select('status')
        .in('student_id', studentIds)
        .gte('date', currentMonth.toISOString().split('T')[0])

      const total = data?.length || 0
      const present = data?.filter((a) => a.status === 'present').length || 0
      const absent = data?.filter((a) => a.status === 'absent').length || 0

      return {
        total,
        present,
        absent,
        rate: total > 0 ? Math.round((present / total) * 100) : 0,
      }
    },
    enabled: (!!user?.id && user?.role === 'parent' && !!children) || (!!user?.id && user?.role === 'student' && !!student),
  })

  const displayData = user?.role === 'parent' ? children : student ? [student] : []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          {user?.role === 'parent' ? 'Tableau de bord Parent' : 'Tableau de bord Étudiant'}
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          Vue d'ensemble de la scolarité
        </p>
      </div>

      {/* Informations principales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Taux de présence (mois)
            </CardTitle>
            <TrendingUp className="h-5 w-5 text-brand-blue" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-brand-blue">
              {attendanceStats?.rate || 0}%
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {attendanceStats?.present || 0} présences / {attendanceStats?.total || 0} jours
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Factures en attente
            </CardTitle>
            <AlertCircle className="h-5 w-5 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {unpaidInvoices?.length || 0}
            </div>
            {unpaidInvoices && unpaidInvoices.length > 0 && (
              <p className="text-sm text-muted-foreground mt-1">
                Total: {formatCurrency(
                  unpaidInvoices.reduce((sum, inv) => sum + Number(inv.total_amount) - Number(inv.paid_amount || 0), 0),
                  unpaidInvoices[0]?.currency || 'XOF'
                )}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {user?.role === 'parent' ? 'Enfants' : 'Classe'}
            </CardTitle>
            <User className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {user?.role === 'parent' ? (children?.length || 0) : (student ? 1 : 0)}
            </div>
            {user?.role === 'student' && student && (
              <p className="text-sm text-muted-foreground mt-1">
                {(student.classes as { name: string } | undefined)?.name || 'Non assigné'}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Liste des enfants (pour parents) ou profil (pour étudiants) */}
      {user?.role === 'parent' && children && children.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Mes enfants</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {children.map((child: any) => (
                <Link
                  key={child.id}
                  href={`/portal/children/${child.id}`}
                  className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    {child.photo_url ? (
                      <img
                        src={child.photo_url}
                        alt={`${child.first_name} ${child.last_name}`}
                        className="h-16 w-16 rounded-full object-cover"
                      />
                    ) : (
                      <div className="h-16 w-16 rounded-full bg-primary text-white flex items-center justify-center text-xl font-semibold">
                        {child.first_name.charAt(0)}{child.last_name.charAt(0)}
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold">
                        {child.first_name} {child.last_name}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {(child.classes as { name: string } | undefined)?.name || 'Non assigné'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {child.student_number}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Factures en attente */}
      {unpaidInvoices && unpaidInvoices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Factures en attente de paiement</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {unpaidInvoices.map((invoice: any) => (
                <div
                  key={invoice.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div>
                    <p className="font-semibold">{invoice.invoice_number}</p>
                    <p className="text-sm text-muted-foreground">
                      Échéance: {formatDate(invoice.due_date)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-lg">
                      {formatCurrency(
                        Number(invoice.total_amount) - Number(invoice.paid_amount || 0),
                        invoice.currency
                      )}
                    </p>
                    <Link href={`/portal/payments/${invoice.id}`}>
                      <button className="mt-2 px-4 py-2 bg-primary text-white rounded-lg text-sm hover:bg-primary-dark transition-colors">
                        Payer
                      </button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Présences récentes */}
      {recentAttendance && recentAttendance.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Présences récentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentAttendance.map((attendance: any) => (
                <div
                  key={attendance.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <p className="font-medium">
                      {attendance.students?.first_name} {attendance.students?.last_name}
                      {attendance.classes?.name && ` - ${attendance.classes.name}`}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(attendance.date)}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-1 rounded text-xs ${
                      attendance.status === 'present'
                        ? 'bg-success-bg text-success-primary'
                        : attendance.status === 'absent'
                        ? 'bg-red-100 text-red-800'
                        : attendance.status === 'late'
                        ? 'bg-warning-bg text-warning-primary'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {attendance.status === 'present'
                      ? 'Présent'
                      : attendance.status === 'absent'
                      ? 'Absent'
                      : attendance.status === 'late'
                      ? 'En retard'
                      : 'Justifié'}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

