'use client'

import { useQuery } from '@tanstack/react-query'
import { motion } from '@/components/ui/motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { AffiliatePortal } from '@/components/affiliate/affiliate-portal'
import { Wallet } from 'lucide-react'
import type { AffiliatePortalData } from '@/app/api/affiliate/me/route'

export default function AffiliatePortalPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['affiliate-portal'],
    queryFn: async () => {
      const res = await fetch('/api/affiliate/me')
      if (res.status === 403 || res.status === 401) {
        return null
      }
      if (!res.ok) throw new Error(await res.text())
      return res.json() as Promise<AffiliatePortalData>
    },
    staleTime: 1000 * 60 * 2,
  })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-center min-h-[50vh]"
      >
        <Card className="max-w-md">
          <CardHeader>
            <div className="flex justify-center mb-2">
              <div className="rounded-full bg-muted p-4">
                <Wallet className="h-10 w-10 text-muted-foreground" />
              </div>
            </div>
            <CardTitle className="text-center">Espace Partenaire</CardTitle>
            <CardDescription className="text-center">
              Vous n&apos;avez pas accès au portail affilié. Si vous êtes partenaire EDUZEN,
              assurez-vous que votre compte est validé et que vous utilisez l&apos;email
              enregistré.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center text-sm text-muted-foreground">
            En cas de question, contactez l&apos;équipe EDUZEN.
          </CardContent>
        </Card>
      </motion.div>
    )
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="text-2xl font-bold tracking-tight">Espace Partenaire</h1>
        <p className="text-muted-foreground">
          Suivez vos performances, vos commissions et vos outils de parrainage
        </p>
      </motion.div>
      <AffiliatePortal data={data} />
    </div>
  )
}
