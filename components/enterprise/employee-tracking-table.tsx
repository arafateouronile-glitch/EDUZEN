'use client'

import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { cn, formatDate } from '@/lib/utils'
import type { EmployeeProgress } from '@/lib/services/enterprise-portal.service'
import { CheckCircle, XCircle, Clock, AlertCircle, User } from 'lucide-react'

interface EmployeeTrackingTableProps {
  employees: EmployeeProgress[]
  isLoading?: boolean
  limit?: number
}

export function EmployeeTrackingTable({ employees, isLoading, limit }: EmployeeTrackingTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(limit || 5)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    )
  }

  if (!employees || employees.length === 0) {
    return (
      <div className="text-center py-8">
        <User className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">Aucun collaborateur en formation</p>
      </div>
    )
  }

  const displayedEmployees = limit ? employees.slice(0, limit) : employees

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
              Collaborateur
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
              Formation en cours
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 hidden sm:table-cell">
              Progression
            </th>
            <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">
              Présence
            </th>
            <th className="text-center py-3 px-4 text-sm font-medium text-gray-500 hidden md:table-cell">
              Dernier émargement
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {displayedEmployees.map((item) => (
            <tr key={item.employee.id} className="hover:bg-gray-50/50 transition-colors">
              {/* Employee Info */}
              <td className="py-4 px-4">
                <div className="flex items-center gap-3">
                  {item.employee.student?.photo_url ? (
                    <img
                      src={item.employee.student.photo_url}
                      alt={`${item.employee.student.first_name} ${item.employee.student.last_name}`}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-[#274472] text-white flex items-center justify-center font-medium">
                      {item.employee.student?.first_name?.charAt(0)}
                      {item.employee.student?.last_name?.charAt(0)}
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-gray-900">
                      {item.employee.student?.first_name} {item.employee.student?.last_name}
                    </p>
                    <p className="text-sm text-gray-500">
                      {item.employee.department || item.employee.job_title || 'Collaborateur'}
                    </p>
                  </div>
                </div>
              </td>

              {/* Current Training */}
              <td className="py-4 px-4">
                {item.currentSession ? (
                  <div>
                    <p className="font-medium text-gray-900 line-clamp-1">
                      {item.currentSession.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatDate(item.currentSession.startDate)} - {formatDate(item.currentSession.endDate)}
                    </p>
                  </div>
                ) : (
                  <span className="text-gray-400 text-sm">Aucune formation active</span>
                )}
              </td>

              {/* Progress */}
              <td className="py-4 px-4 hidden sm:table-cell">
                {item.currentSession ? (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Progression</span>
                      <span className="font-medium text-[#274472]">
                        {item.currentSession.progress}%
                      </span>
                    </div>
                    <Progress
                      value={item.currentSession.progress}
                      className="h-2"
                      indicatorClassName={getProgressColor(item.currentSession.progress)}
                    />
                  </div>
                ) : (
                  <span className="text-gray-300">-</span>
                )}
              </td>

              {/* Attendance Rate */}
              <td className="py-4 px-4 text-center">
                <div className="flex flex-col items-center">
                  <span className={cn(
                    'text-lg font-bold',
                    item.attendanceRate >= 80 ? 'text-green-600' :
                    item.attendanceRate >= 50 ? 'text-amber-600' : 'text-red-600'
                  )}>
                    {item.attendanceRate}%
                  </span>
                  <span className="text-xs text-gray-500">Assiduité</span>
                </div>
              </td>

              {/* Last Attendance */}
              <td className="py-4 px-4 hidden md:table-cell">
                <div className="flex justify-center">
                  <AttendanceStatusBadge
                    status={item.lastAttendanceStatus}
                    date={item.lastAttendanceDate}
                  />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// Helper to get progress bar color
function getProgressColor(progress: number): string {
  if (progress >= 80) return 'bg-green-500'
  if (progress >= 50) return 'bg-amber-500'
  if (progress >= 25) return 'bg-blue-500'
  return 'bg-gray-400'
}

// Attendance Status Badge
interface AttendanceStatusBadgeProps {
  status: 'present' | 'absent' | 'late' | 'excused' | null
  date?: string
}

function AttendanceStatusBadge({ status, date }: AttendanceStatusBadgeProps) {
  if (!status) {
    return (
      <div className="flex items-center gap-1 text-gray-400 text-sm">
        <AlertCircle className="w-4 h-4" />
        <span>Aucun émargement</span>
      </div>
    )
  }

  const statusConfig: Record<string, { icon: typeof CheckCircle; className: string; label: string }> = {
    present: {
      icon: CheckCircle,
      className: 'text-green-600 bg-green-50',
      label: 'Présent',
    },
    absent: {
      icon: XCircle,
      className: 'text-red-600 bg-red-50',
      label: 'Absent',
    },
    late: {
      icon: Clock,
      className: 'text-amber-600 bg-amber-50',
      label: 'Retard',
    },
    excused: {
      icon: AlertCircle,
      className: 'text-blue-600 bg-blue-50',
      label: 'Justifié',
    },
  }

  const config = statusConfig[status]
  const Icon = config.icon

  return (
    <div className="flex flex-col items-center gap-1">
      <div className={cn('flex items-center gap-1 px-2 py-1 rounded-full text-sm font-medium', config.className)}>
        <Icon className="w-4 h-4" />
        <span>{config.label}</span>
      </div>
      {date && (
        <span className="text-xs text-gray-500">
          {formatDate(date)}
        </span>
      )}
    </div>
  )
}
