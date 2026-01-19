'use client'

import { LearnerProvider, useLearnerContext } from '@/lib/contexts/learner-context'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { LearnerSidebar } from '@/components/learner/sidebar'
import { LearnerHeader } from '@/components/learner/header'
import { LearnerMobileNav } from '@/components/learner/mobile-nav'
import { OfflineIndicator } from '@/components/learner/offline-indicator'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { secureSessionStorage } from '@/lib/utils/secure-storage'

const LEARNER_STORAGE_KEY = 'learner_student_id'

function LearnerLayoutContent({ children }: { children: React.ReactNode }) {
  const { student, isLoading, hasStudent, studentId } = useLearnerContext()
  const router = useRouter()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  // S'assurer que le composant est monté côté client pour éviter les problèmes d'hydratation
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // En DEV : désinscrire tout Service Worker déjà installé + purger le cache
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return
    if (!('serviceWorker' in navigator)) return

    navigator.serviceWorker.getRegistrations().then((regs) => {
      regs.forEach((r) => r.unregister())
    })

    if ('caches' in window) {
      caches.keys().then((keys) => {
        keys.forEach((k) => caches.delete(k))
      })
    }
  }, [])

  // Initialiser les notifications push au chargement
  useEffect(() => {
    if (isMounted && student?.id && typeof window !== 'undefined' && 'Notification' in window) {
      const timer = setTimeout(() => {
        if (Notification.permission === 'default') {
          Notification.requestPermission()
        }
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [student?.id, isMounted])

  useEffect(() => {
    if (!isMounted) return
    
    // Si pas d'étudiant trouvé après chargement, rediriger vers la page d'accès
    if (!isLoading && !hasStudent && !studentId) {
      // Utiliser le stockage sécurisé au lieu de localStorage
      const savedId = secureSessionStorage.get<string>(LEARNER_STORAGE_KEY)
      if (savedId) {
        router.push(`/learner/access/${savedId}`)
      } else {
        // Utiliser window.location pour éviter les problèmes de préchargement Next.js
        if (typeof window !== 'undefined') {
          window.location.href = '/auth/login?redirect=/learner'
        }
      }
    }
  }, [hasStudent, isLoading, studentId, router, isMounted])

  // Afficher le loader pendant le chargement initial ou si pas encore monté
  if (!isMounted || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-brand-blue mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Chargement de votre espace...</p>
        </div>
      </div>
    )
  }

  // Si pas d'étudiant ET pas de studentId, ne rien afficher (redirection en cours)
  // Si on a un studentId mais pas encore de student, on attend le chargement
  if (!studentId && !isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-brand-blue mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Redirection...</p>
        </div>
      </div>
    )
  }

  // Si on a un studentId mais pas de student après chargement, afficher l'erreur
  if (studentId && !isLoading && !student) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-brand-blue mx-auto mb-4" />
          <p className="text-gray-600 font-medium">
            Accès apprenant introuvable ou indisponible
          </p>

          <div className="mt-6 space-y-3">
            <p className="text-gray-500 text-sm max-w-sm">
              Soit le lien n'est plus valide, soit la base n'autorise pas encore la lecture de l'apprenant.
              Cliquez sur "Réessayer" après avoir appliqué la migration RLS, ou "Recommencer".
            </p>

            <Button
              className="w-full"
              onClick={() => {
                try {
                  window.location.reload()
                } catch (_e) {}
              }}
            >
              Réessayer
            </Button>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                try {
                  // Utiliser le stockage sécurisé au lieu de localStorage
                  secureSessionStorage.remove(LEARNER_STORAGE_KEY)
                } catch (_e) {}
                if (typeof window !== 'undefined') {
                  window.location.href = '/auth/login?redirect=/learner'
                }
              }}
            >
              Recommencer
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Si on a un studentId mais pas encore de student, continuer à charger
  // (permet l'accès aux pages même si student n'est pas encore chargé)
  if (studentId && !student && isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-brand-blue mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Chargement de votre espace...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50">
      {/* Indicateur de mode offline */}
      <OfflineIndicator />
      
      {/* Desktop Sidebar */}
      <LearnerSidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
      />
      
      {/* Main Content */}
      <div className="lg:pl-72">
        {/* Header */}
        <LearnerHeader onMenuClick={() => setIsSidebarOpen(true)} />
        
        {/* Page Content */}
        <main className="py-6 px-4 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <LearnerMobileNav />
    </div>
  )
}

export default function LearnerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <LearnerProvider>
      <LearnerLayoutContent>{children}</LearnerLayoutContent>
    </LearnerProvider>
  )
}
