'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from '@/components/ui/motion'
import { Loader2, CheckCircle, XCircle, User, BookOpen, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { createLearnerClient } from '@/lib/supabase/learner-client'
import { logger, maskId, sanitizeError } from '@/lib/utils/logger'
import { secureSessionStorage, TTL } from '@/lib/utils/secure-storage'

export default function LearnerAccessPage() {
  const params = useParams()
  const router = useRouter()
  const studentId = params.id as string
  
  const [status, setStatus] = useState<'validating' | 'valid' | 'invalid' | 'redirecting'>('validating')
  const [error, setError] = useState<string>('')
  
  useEffect(() => {
    const validateAndRedirect = async () => {
      logger.info('Learner Access - Validating student ID', {
        hasStudentId: !!studentId,
      })

      // Vérifier le format de l'ID (UUID)
      if (!studentId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(studentId)) {
        logger.warn('Learner Access - Invalid student ID format')
        setStatus('invalid')
        setError('Format de lien invalide')
        return
      }
      
      try {
        // Valider que l'étudiant existe dans la base de données
        const supabase = createLearnerClient(studentId)
        const { data: student, error: studentError } = await supabase
          .from('students')
          .select('id, first_name, last_name, status')
          .eq('id', studentId)
          .maybeSingle()
        
        if (studentError || !student) {
          logger.error('Learner Access - Student not found', studentError, {
            studentId: maskId(studentId),
            error: sanitizeError(studentError),
          })
          setStatus('invalid')
          setError('Étudiant introuvable. Ce lien peut avoir expiré ou être invalide.')
          return
        }

        // Vérifier que l'étudiant est actif
        if (student.status !== 'active') {
          logger.warn('Learner Access - Student not active', {
            studentId: maskId(studentId),
            status: student.status,
          })
          setStatus('invalid')
          setError('Votre compte n\'est pas actif. Contactez votre formateur.')
          return
        }

        logger.info('Learner Access - Student validated successfully')
        
        // Sauvegarder l'ID dans le stockage sécurisé pour la persistance (24h)
        if (typeof window !== 'undefined') {
          secureSessionStorage.set('learner_student_id', studentId, { ttl: TTL.DAY })
        }

        // Redirection vers l'espace apprenant
        setStatus('redirecting')
        router.replace('/learner')

        // Fallback si le router est ralenti/bloqué
        const fallback = setTimeout(() => {
          try {
            if (typeof window !== 'undefined' && window.location.pathname.startsWith('/learner/access')) {
              window.location.replace('/learner')
            }
          } catch (_e) {}
        }, 1000)

        return () => clearTimeout(fallback)
      } catch (err) {
        logger.error('Learner Access - Error validating student', err, {
          studentId: maskId(studentId),
          error: sanitizeError(err),
        })
        setStatus('invalid')
        setError('Erreur lors de la validation de votre accès. Veuillez réessayer.')
      }
    }
    
    if (studentId) {
      validateAndRedirect()
    }
  }, [studentId, router])
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl" />
      </div>
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 bg-white/10 backdrop-blur-xl rounded-3xl p-8 md:p-12 max-w-md w-full border border-white/20 shadow-2xl"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">eduzen</h1>
          <p className="text-blue-200/80">Espace Apprenant</p>
        </div>
        
        {/* Status: Validating */}
        {status === 'validating' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center"
          >
            <div className="w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Loader2 className="w-10 h-10 text-blue-400 animate-spin" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">
              Vérification en cours...
            </h2>
            <p className="text-blue-200/70">
              Nous préparons votre espace personnel
            </p>
          </motion.div>
        )}
        
        {/* Status: Valid */}
        {status === 'valid' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-emerald-400" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-4">
              Bienvenue !
            </h2>
            
            <p className="text-blue-200/70 text-sm">
              Redirection vers votre espace personnel...
            </p>
            
            <div className="mt-4 flex justify-center">
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0.3 }}
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                    className="w-2 h-2 bg-blue-400 rounded-full"
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}
        
        {/* Status: Redirecting */}
        {status === 'redirecting' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center"
          >
            <div className="w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <BookOpen className="w-10 h-10 text-blue-400" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">
              Accès à votre espace...
            </h2>
            <p className="text-blue-200/70">
              Vous allez être redirigé automatiquement
            </p>

            <div className="mt-6">
              <Button
                className="w-full bg-white/10 hover:bg-white/15 border border-white/20 text-white"
                onClick={() => {
                  try {
                    if (typeof window !== 'undefined') {
                      secureSessionStorage.set('learner_student_id', studentId, { ttl: TTL.DAY })
                      window.location.replace('/learner')
                    }
                  } catch (_e) {}
                }}
              >
                Continuer
              </Button>
            </div>
          </motion.div>
        )}
        
        {/* Status: Invalid */}
        {status === 'invalid' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <XCircle className="w-10 h-10 text-red-400" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">
              Lien invalide
            </h2>
            <p className="text-red-200/70 mb-6">
              {error}
            </p>
            
            <div className="space-y-3">
              <p className="text-blue-200/60 text-sm">
                Ce lien peut avoir expiré ou a été désactivé. 
                Contactez votre formateur pour obtenir un nouveau lien.
              </p>
              
              <Link href="/auth/login">
                <Button variant="outline" className="w-full border-white/20 text-white hover:bg-white/10">
                  <User className="w-4 h-4 mr-2" />
                  Se connecter autrement
                </Button>
              </Link>
            </div>
          </motion.div>
        )}
        
        {/* Security notice */}
        <div className="mt-8 pt-6 border-t border-white/10">
          <div className="flex items-center justify-center gap-2 text-blue-200/50 text-xs">
            <Shield className="w-4 h-4" />
            <span>Accès sécurisé</span>
          </div>
        </div>
      </motion.div>
    </div>
  )
}



