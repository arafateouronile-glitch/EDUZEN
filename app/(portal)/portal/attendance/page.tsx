'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/use-auth'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle, XCircle, Clock, AlertCircle, Calendar } from 'lucide-react'
import { formatDate } from '@/lib/utils'

export default function AttendancePage() {
  const { user } = useAuth()
  const supabase = createClient()
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().slice(0, 7) // Format YYYY-MM
  )

  // Récupérer les présences
  const { data: attendance } = useQuery({
    queryKey: ['portal-attendance', user?.id, selectedMonth],
    queryFn: async () => {
      if (!user?.id) return []

      let studentIds: string[] = []

      if (user?.role === 'parent') {
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
        studentIds = studentGuardians.map((sg) => sg.student_id).filter((id): id is string => id !== null)
      } else if (user?.role === 'student') {
        studentIds = [user.id]
      }

      if (studentIds.length === 0) return []

      const startDate = `${selectedMonth}-01`
      const endDate = new Date(
        new Date(selectedMonth + '-01').getFullYear(),
        new Date(selectedMonth + '-01').getMonth() + 1,
        0
      ).toISOString().split('T')[0]

      const { data } = await supabase
        .from('attendance')
        .select('*, students(first_name, last_name, photo_url), classes(name)')
        .in('student_id', studentIds)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false })

      return data || []
    },
    enabled: !!user?.id,
  })

  // Statistiques du mois
  const stats = attendance
    ? {
        total: attendance.length,
        present: attendance.filter((a: any) => a.status === 'present').length,
        absent: attendance.filter((a: any) => a.status === 'absent').length,
        late: attendance.filter((a: any) => a.status === 'late').length,
        excused: attendance.filter((a: any) => a.status === 'excused').length,
        rate:
          attendance.length > 0
            ? Math.round(
                (attendance.filter((a: any) => a.status === 'present').length /
                  attendance.length) *
                  100
              )
            : 0,
      }
    : null

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present':
        return <CheckCircle className="h-5 w-5 text-success-primary" />
      case 'absent':
        return <XCircle className="h-5 w-5 text-red-600" />
      case 'late':
        return <Clock className="h-5 w-5 text-warning-primary" />
      case 'excused':
        return <AlertCircle className="h-5 w-5 text-blue-600" />
      default:
        return null
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'present':
        return 'Présent'
      case 'absent':
        return 'Absent'
      case 'late':
        return 'En retard'
      case 'excused':
        return 'Justifié'
      default:
        return status
    }
  }

  // Grouper par étudiant pour les parents
  const groupedByStudent =
    user?.role === 'parent' && attendance
      ? attendance.reduce((acc: any, att: any) => {
          const studentId = att.student_id
          if (!acc[studentId]) {
            acc[studentId] = {
              student: att.students,
              class: att.classes,
              records: [],
            }
          }
          acc[studentId].records.push(att)
          return acc
        }, {})
      : null

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Présences</h1>
          <p className="mt-2 text-sm text-gray-600">
            Suivez les présences et absences
          </p>
        </div>
        <input
          type="month"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent min-touch-target"
        />
      </div>

      {/* Statistiques */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold">{stats.total}</div>
                <div className="text-sm text-muted-foreground">Total</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-success-primary">{stats.present}</div>
                <div className="text-sm text-muted-foreground">Présents</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{stats.absent}</div>
                <div className="text-sm text-muted-foreground">Absents</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-warning-primary">{stats.late}</div>
                <div className="text-sm text-muted-foreground">En retard</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.rate}%</div>
                <div className="text-sm text-muted-foreground">Taux</div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Liste des présences */}
      <Card>
        <CardHeader>
          <CardTitle>Historique des présences</CardTitle>
        </CardHeader>
        <CardContent>
          {attendance && attendance.length > 0 ? (
            user?.role === 'parent' && groupedByStudent ? (
              <div className="space-y-6">
                {Object.values(groupedByStudent).map((group: any) => (
                  <div key={group.student.id} className="space-y-2">
                    <h3 className="font-semibold text-lg mb-3">
                      {group.student.first_name} {group.student.last_name}
                      {group.class?.name && ` - ${group.class.name}`}
                    </h3>
                    <div className="space-y-2">
                      {group.records.map((record: any) => (
                        <div
                          key={record.id}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div className="flex items-center space-x-3">
                            {getStatusIcon(record.status)}
                            <div>
                              <p className="font-medium">{formatDate(record.date)}</p>
                              {record.late_minutes > 0 && (
                                <p className="text-xs text-muted-foreground">
                                  Retard: {record.late_minutes} min
                                </p>
                              )}
                            </div>
                          </div>
                          <span
                            className={`px-2 py-1 rounded text-xs ${
                              record.status === 'present'
                                ? 'bg-success-bg text-success-primary'
                                : record.status === 'absent'
                                ? 'bg-red-100 text-red-800'
                                : record.status === 'late'
                                ? 'bg-warning-bg text-warning-primary'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {getStatusLabel(record.status)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {attendance.map((record: any) => (
                  <div
                    key={record.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center space-x-4">
                      {getStatusIcon(record.status)}
                      <div>
                        <p className="font-medium">{formatDate(record.date)}</p>
                        {record.classes?.name && (
                          <p className="text-sm text-muted-foreground">
                            {record.classes.name}
                          </p>
                        )}
                        {record.late_minutes > 0 && (
                          <p className="text-xs text-muted-foreground">
                            Retard: {record.late_minutes} min
                          </p>
                        )}
                      </div>
                    </div>
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        record.status === 'present'
                          ? 'bg-success-bg text-success-primary'
                          : record.status === 'absent'
                          ? 'bg-red-100 text-red-800'
                          : record.status === 'late'
                          ? 'bg-warning-bg text-warning-primary'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {getStatusLabel(record.status)}
                    </span>
                  </div>
                ))}
              </div>
            )
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p>Aucune donnée de présence disponible</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

