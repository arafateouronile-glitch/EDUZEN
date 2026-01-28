'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/use-auth'
import { enterprisePortalService, type CompanyEmployee } from '@/lib/services/enterprise-portal.service'
import { GlassCard } from '@/components/ui/glass-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { formatDate } from '@/lib/utils'
import {
  Users,
  Search,
  Filter,
  Plus,
  ChevronRight,
  GraduationCap,
  CheckCircle,
  Clock,
  XCircle,
  Mail,
  Phone,
  Building2,
  User,
} from 'lucide-react'
import Link from 'next/link'

export default function EnterpriseEmployeesPage() {
  const { user } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDepartment, setSelectedDepartment] = useState<string | undefined>()
  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive' | 'all'>('active')
  const [page, setPage] = useState(1)

  // Get company
  const { data: company } = useQuery({
    queryKey: ['enterprise-company', user?.id],
    queryFn: async () => {
      if (!user?.id) return null
      return enterprisePortalService.getCompanyForManager(user.id)
    },
    enabled: !!user?.id,
  })

  // Get departments
  const { data: departments } = useQuery({
    queryKey: ['enterprise-departments', company?.id],
    queryFn: async () => {
      if (!company?.id) return []
      return enterprisePortalService.getDepartments(company.id)
    },
    enabled: !!company?.id,
  })

  // Get employees
  const { data: employeesData, isLoading } = useQuery({
    queryKey: ['enterprise-employees', company?.id, searchQuery, selectedDepartment, statusFilter, page],
    queryFn: async () => {
      if (!company?.id) return { employees: [], total: 0 }
      return enterprisePortalService.getEmployees(company.id, {
        search: searchQuery,
        department: selectedDepartment,
        status: statusFilter,
        page,
        limit: 20,
      })
    },
    enabled: !!company?.id,
  })

  // Get employee progress for additional stats
  const { data: employeeProgress } = useQuery({
    queryKey: ['enterprise-employee-progress', company?.id],
    queryFn: async () => {
      if (!company?.id) return []
      return enterprisePortalService.getEmployeeProgress(company.id)
    },
    enabled: !!company?.id,
  })

  // Merge employee data with progress
  const employeesWithProgress = (employeesData?.employees || []).map((emp) => {
    const progress = employeeProgress?.find((p) => p.employee.id === emp.id)
    return {
      ...emp,
      progress,
    }
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Collaborateurs
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Suivez la formation de vos collaborateurs
          </p>
        </div>
        <Link href="/enterprise/trainings/request">
          <Button className="bg-[#274472] hover:bg-[#1e3a5f]">
            <Plus className="w-4 h-4 mr-2" />
            Inscrire un collaborateur
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <GlassCard variant="default" className="p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Rechercher un collaborateur..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setPage(1)
              }}
              className="pl-9"
            />
          </div>

          {/* Department Filter */}
          {departments && departments.length > 0 && (
            <select
              value={selectedDepartment || ''}
              onChange={(e) => {
                setSelectedDepartment(e.target.value || undefined)
                setPage(1)
              }}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#274472]"
            >
              <option value="">Tous les services</option>
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          )}

          {/* Status Filter */}
          <div className="flex gap-2">
            {(['active', 'inactive', 'all'] as const).map((status) => (
              <Button
                key={status}
                variant={statusFilter === status ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setStatusFilter(status)
                  setPage(1)
                }}
                className={statusFilter === status ? 'bg-[#274472]' : ''}
              >
                {status === 'active' && 'Actifs'}
                {status === 'inactive' && 'Inactifs'}
                {status === 'all' && 'Tous'}
              </Button>
            ))}
          </div>
        </div>
      </GlassCard>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <GlassCard variant="default" className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {employeesData?.total || 0}
              </p>
              <p className="text-sm text-gray-500">Collaborateurs</p>
            </div>
          </div>
        </GlassCard>
        <GlassCard variant="default" className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {employeeProgress?.filter((p) => p.currentSession).length || 0}
              </p>
              <p className="text-sm text-gray-500">En formation</p>
            </div>
          </div>
        </GlassCard>
        <GlassCard variant="default" className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-violet-100 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {employeeProgress
                  ? Math.round(employeeProgress.reduce((sum, p) => sum + p.attendanceRate, 0) / (employeeProgress.length || 1))
                  : 0}%
              </p>
              <p className="text-sm text-gray-500">Taux moyen présence</p>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Employees List */}
      <GlassCard variant="premium" className="p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-lg" />
            ))}
          </div>
        ) : employeesWithProgress.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Aucun collaborateur trouvé
            </h3>
            <p className="text-gray-500 mb-6">
              {searchQuery || selectedDepartment
                ? 'Essayez de modifier vos filtres de recherche'
                : 'Inscrivez votre premier collaborateur à une formation'}
            </p>
            {!searchQuery && !selectedDepartment && (
              <Link href="/enterprise/trainings/request">
                <Button className="bg-[#274472] hover:bg-[#1e3a5f]">
                  <Plus className="w-4 h-4 mr-2" />
                  Inscrire un collaborateur
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {employeesWithProgress.map((emp) => (
              <EmployeeCard key={emp.id} employee={emp} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {employeesData && employeesData.total > 20 && (
          <div className="flex items-center justify-between p-4 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              Page {page} sur {Math.ceil(employeesData.total / 20)}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Précédent
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= Math.ceil(employeesData.total / 20)}
              >
                Suivant
              </Button>
            </div>
          </div>
        )}
      </GlassCard>
    </div>
  )
}

// Employee Card Component
interface EmployeeCardProps {
  employee: CompanyEmployee & {
    progress?: {
      currentSession?: {
        name: string
        progress: number
        startDate: string
        endDate: string
      }
      attendanceRate: number
      lastAttendanceStatus: 'present' | 'absent' | 'late' | 'excused' | null
      lastAttendanceDate?: string
    }
  }
}

function EmployeeCard({ employee }: EmployeeCardProps) {
  const { student, progress } = employee

  return (
    <div className="p-4 sm:p-6 hover:bg-gray-50/50 transition-colors">
      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
        {/* Employee Info */}
        <div className="flex items-center gap-4 flex-1 min-w-0">
          {student?.photo_url ? (
            <img
              src={student.photo_url}
              alt={`${student.first_name} ${student.last_name}`}
              className="w-14 h-14 rounded-full object-cover"
            />
          ) : (
            <div className="w-14 h-14 rounded-full bg-[#274472] text-white flex items-center justify-center text-lg font-semibold">
              {student?.first_name?.charAt(0)}{student?.last_name?.charAt(0)}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900">
              {student?.first_name} {student?.last_name}
            </h3>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500 mt-1">
              {employee.job_title && (
                <span className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  {employee.job_title}
                </span>
              )}
              {employee.department && (
                <span className="flex items-center gap-1">
                  <Building2 className="w-3 h-3" />
                  {employee.department}
                </span>
              )}
              {student?.email && (
                <span className="flex items-center gap-1">
                  <Mail className="w-3 h-3" />
                  {student.email}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Training Status */}
        <div className="flex-1 min-w-0 lg:max-w-sm">
          {progress?.currentSession ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-700 font-medium truncate">
                  {progress.currentSession.name}
                </span>
                <span className="text-[#274472] font-semibold">
                  {progress.currentSession.progress}%
                </span>
              </div>
              <Progress
                value={progress.currentSession.progress}
                className="h-2"
                indicatorClassName={
                  progress.currentSession.progress >= 80 ? 'bg-green-500' :
                  progress.currentSession.progress >= 50 ? 'bg-blue-500' : 'bg-amber-500'
                }
              />
              <p className="text-xs text-gray-500">
                {formatDate(progress.currentSession.startDate)} - {formatDate(progress.currentSession.endDate)}
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-gray-500 text-sm">
              <Clock className="w-4 h-4" />
              <span>Pas de formation en cours</span>
            </div>
          )}
        </div>

        {/* Attendance & Actions */}
        <div className="flex items-center gap-4">
          <div className="text-center">
            <p className={`text-2xl font-bold ${
              progress && progress.attendanceRate >= 80 ? 'text-green-600' :
              progress && progress.attendanceRate >= 50 ? 'text-amber-600' : 'text-red-600'
            }`}>
              {progress?.attendanceRate || 0}%
            </p>
            <p className="text-xs text-gray-500">Présence</p>
          </div>
          {progress?.lastAttendanceStatus && (
            <AttendanceBadge status={progress.lastAttendanceStatus} />
          )}
          <Link href={`/enterprise/employees/${employee.id}`}>
            <Button variant="outline" size="sm">
              Détails
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}

// Attendance Badge
function AttendanceBadge({ status }: { status: 'present' | 'absent' | 'late' | 'excused' }) {
  const config: Record<string, { icon: typeof CheckCircle; className: string; label: string }> = {
    present: { icon: CheckCircle, className: 'bg-green-100 text-green-700', label: 'Présent' },
    absent: { icon: XCircle, className: 'bg-red-100 text-red-700', label: 'Absent' },
    late: { icon: Clock, className: 'bg-amber-100 text-amber-700', label: 'Retard' },
    excused: { icon: CheckCircle, className: 'bg-blue-100 text-blue-700', label: 'Justifié' },
  }

  const { icon: Icon, className, label } = config[status]

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${className}`}>
      <Icon className="w-3 h-3" />
      {label}
    </span>
  )
}
