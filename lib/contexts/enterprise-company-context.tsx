'use client'

import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/hooks/use-auth'
import { enterprisePortalService } from '@/lib/services/enterprise-portal.service.client'
import type { Company } from '@/lib/services/enterprise-portal.service.client'

type EnterpriseCompanyContextValue = {
  company: Company | null
  isLoading: boolean
  entityId: string | null
  isEntityContext: boolean
  /** Pour les liens : préfixe à ajouter (ex. "?entity=xxx" ou "") */
  entityQueryString: string
}

const EnterpriseCompanyContext = React.createContext<EnterpriseCompanyContextValue | null>(null)

export function EnterpriseCompanyProvider({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams()
  const entityId = searchParams.get('entity')
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin'

  const { data: companyByEntity, isPending: isLoadingByEntity } = useQuery({
    queryKey: ['enterprise-company-by-entity', entityId],
    queryFn: async (): Promise<Company | null> => {
      if (!entityId) return null
      const res = await fetch(`/api/enterprise/company-by-entity?entity=${entityId}`)
      if (!res.ok) return null
      const json = await res.json()
      return json.company ?? null
    },
    enabled: !!entityId && !!user?.id && !!isAdmin,
  })

  const { data: companyAsManager, isPending: isLoadingAsManager } = useQuery({
    queryKey: ['enterprise-company', user?.id],
    queryFn: async () => {
      if (!user?.id) return null
      return enterprisePortalService.getCompanyForManager(user.id)
    },
    enabled: !!user?.id && !entityId,
  })

  const company = (entityId && isAdmin ? companyByEntity : companyAsManager) ?? null
  const isLoading =
    (!!entityId && !!isAdmin && isLoadingByEntity) || (!entityId && !!user?.id && isLoadingAsManager)

  const isEntityContext = !!(entityId && isAdmin)
  const entityQueryString = entityId ? `?entity=${entityId}` : ''

  const value: EnterpriseCompanyContextValue = {
    company,
    isLoading,
    entityId: entityId || null,
    isEntityContext,
    entityQueryString,
  }

  return (
    <EnterpriseCompanyContext.Provider value={value}>
      {children}
    </EnterpriseCompanyContext.Provider>
  )
}

export function useEnterpriseCompany(): EnterpriseCompanyContextValue {
  const ctx = React.useContext(EnterpriseCompanyContext)
  if (!ctx) {
    throw new Error('useEnterpriseCompany must be used within EnterpriseCompanyProvider')
  }
  return ctx
}
