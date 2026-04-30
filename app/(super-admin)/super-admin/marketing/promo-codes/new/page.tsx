'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { PlatformAdminGuard } from '@/components/super-admin/platform-admin-guard'
import { PromoCodeForm } from '@/components/super-admin/marketing/promo-code-form'
import { motion } from '@/components/ui/motion'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import type { CreatePromoCodeInput } from '@/types/super-admin.types'

export default function NewPromoCodePage() {
  const router = useRouter()

  const handleCreate = async (data: CreatePromoCodeInput) => {
    const response = await fetch('/api/super-admin/promo-codes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const err = await response.json()
      throw new Error(err.error || 'Erreur lors de la création')
    }

    toast.success('Code promo créé avec succès')
    router.push('/super-admin/marketing/promo-codes')
  }

  return (
    <PlatformAdminGuard requiredPermission="manage_promo_codes">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/super-admin/marketing/promo-codes">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <motion.h1
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-2xl font-bold tracking-tight"
            >
              Nouveau code promo
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-muted-foreground text-sm"
            >
              Créez un nouveau code promotionnel pour vos clients
            </motion.p>
          </div>
        </div>

        <PromoCodeForm
          onSubmit={handleCreate}
          onCancel={() => router.push('/super-admin/marketing/promo-codes')}
        />
      </div>
    </PlatformAdminGuard>
  )
}
