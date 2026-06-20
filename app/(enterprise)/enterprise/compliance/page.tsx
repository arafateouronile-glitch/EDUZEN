'use client'

import { useQuery } from '@tanstack/react-query'
import { useEnterpriseCompany } from '@/lib/contexts/enterprise-company-context'
import { enterprisePortalService } from '@/lib/services/enterprise-portal.service.client'
import { ComplianceMatrix } from '@/components/enterprise/compliance-matrix'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertCircle } from 'lucide-react'

export default function CompliancePage() {
  const { company, isLoading } = useEnterpriseCompany()

  const { data: employeesData } = useQuery({
    queryKey: ['enterprise-employees', company?.id],
    queryFn: async () => {
      if (!company?.id) return { employees: [] }
      return enterprisePortalService.getEmployees(company.id, { limit: 500 })
    },
    enabled: !!company?.id,
  })

  const employees = (employeesData?.employees ?? []).map((e) => ({
    id: e.id,
    first_name: (e.student as { first_name?: string } | null)?.first_name ?? '',
    last_name: (e.student as { last_name?: string } | null)?.last_name ?? '',
  }))

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-5 w-80 mt-2" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-[400px] rounded-xl" />
      </div>
    )
  }

  if (!company) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <AlertCircle className="w-16 h-16 text-gray-400 mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Aucune entreprise associée</h2>
        <p className="text-gray-600 max-w-md">
          Votre compte n'est pas encore associé à une entreprise. Veuillez contacter l'organisme de formation.
        </p>
      </div>
    )
  }

  return <ComplianceMatrix companyId={company.id} employees={employees} />
}
