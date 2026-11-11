'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from '@/components/ui/motion'
import { Loader2, XCircle, User, ClipboardCheck } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { logger, maskId } from '@/lib/utils/logger'

/** Intervenant, entreprise ou financeur (questionnaires non apprenants) */
interface Respondent {
  key: string
  name: string
  detail: string | null
}

interface EligibleStudent {
  grade_id: string
  student_id: string
  student_name: string
}

export default function PublicEvaluationLinkPage() {
  const params = useParams()
  const router = useRouter()
  const token = params.token as string

  const [status, setStatus] = useState<'loading' | 'select' | 'redirecting' | 'done' | 'invalid'>('loading')
  const [subject, setSubject] = useState<string>('')
  const [sessionName, setSessionName] = useState<string | null>(null)
  const [students, setStudents] = useState<EligibleStudent[]>([])
  const [respondents, setRespondents] = useState<Respondent[] | null>(null)
  const [selectError, setSelectError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/evaluations/public-link/${token}`)
        if (!res.ok) {
          setStatus('invalid')
          return
        }
        const data = await res.json()
        setSubject(data.subject || 'Évaluation')
        setSessionName(data.session_name || null)
        setStudents(data.students || [])
        setRespondents(data.respondents ?? null)
        setStatus('select')
      } catch (err) {
        logger.error('Public evaluation link - load failed', err, { token: maskId(token) })
        setStatus('invalid')
      }
    }
    if (token) load()
  }, [token])

  const handleSelect = (student: EligibleStudent) => {
    setStatus('redirecting')
    router.replace(`/learner/access/${student.student_id}?redirect=${encodeURIComponent(`/learner/evaluations/${student.grade_id}`)}`)
  }

  // Questionnaire intervenant / manager / financeur : lien /q nominatif, sans espace apprenant
  const handleSelectRespondent = async (respondent: Respondent) => {
    setSelectError(null)
    setStatus('redirecting')
    try {
      const res = await fetch(`/api/evaluations/public-link/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: respondent.key }),
      })
      const data = (await res.json()) as { status?: string; token?: string; error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Accès impossible')
      if (data.status === 'already_submitted') {
        setStatus('done')
        return
      }
      router.replace(`/q/${data.token}`)
    } catch (err) {
      logger.error('Public evaluation link - respondent failed', err, { token: maskId(token) })
      setSelectError(err instanceof Error ? err.message : 'Accès impossible')
      setStatus('select')
    }
  }

  const people = respondents
    ? respondents.map((r) => ({ key: r.key, name: r.name, detail: r.detail, onClick: () => handleSelectRespondent(r) }))
    : students.map((s) => ({ key: s.grade_id, name: s.student_name, detail: null, onClick: () => handleSelect(s) }))

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 bg-white/10 backdrop-blur-xl rounded-3xl p-8 md:p-12 max-w-lg w-full border border-white/20 shadow-2xl"
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">eduzen</h1>
          <p className="text-blue-200/80">Évaluation</p>
        </div>

        {status === 'loading' && (
          <div className="text-center">
            <div className="w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Loader2 className="w-10 h-10 text-blue-400 animate-spin" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">Chargement...</h2>
          </div>
        )}

        {status === 'select' && (
          <div>
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <ClipboardCheck className="w-8 h-8 text-blue-400" />
              </div>
              <h2 className="text-lg font-semibold text-white mb-1">{subject}</h2>
              {sessionName && <p className="text-blue-200/70 text-sm">{sessionName}</p>}
              <p className="text-blue-200/60 text-sm mt-3">
                {respondents ? 'Touchez votre nom pour répondre au questionnaire' : 'Touchez votre nom pour accéder à votre évaluation'}
              </p>
            </div>

            {selectError && <p className="text-center text-red-300 text-sm mb-4">{selectError}</p>}

            {people.length === 0 ? (
              <p className="text-center text-blue-200/70 text-sm py-6">
                {respondents ? 'Aucun destinataire trouvé pour ce questionnaire.' : 'Aucun apprenant trouvé pour cette évaluation.'}
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-3 max-h-[50vh] overflow-y-auto pr-1">
                {people.map((person) => (
                  <button
                    key={person.key}
                    type="button"
                    onClick={person.onClick}
                    className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-white/5 hover:bg-white/15 border border-white/10 transition-colors text-center"
                  >
                    <div className="w-10 h-10 rounded-full bg-blue-500/30 flex items-center justify-center">
                      <User className="w-5 h-5 text-blue-200" />
                    </div>
                    <span className="text-sm text-white font-medium leading-tight">{person.name}</span>
                    {person.detail && <span className="text-xs text-blue-200/60 leading-tight">{person.detail}</span>}
                  </button>
                ))}
              </div>
            )}

            <p className="text-center text-blue-200/50 text-xs mt-6">
              {respondents
                ? <>Votre nom n&apos;apparaît pas ? Contactez l&apos;organisme de formation.</>
                : <>Votre nom n&apos;apparaît pas ? Contactez votre formateur.</>}
            </p>
          </div>
        )}

        {status === 'redirecting' && (
          <div className="text-center">
            <div className="w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Loader2 className="w-10 h-10 text-blue-400 animate-spin" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">{respondents ? 'Ouverture du questionnaire...' : 'Accès à votre espace...'}</h2>
          </div>
        )}

        {status === 'done' && (
          <div className="text-center">
            <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <ClipboardCheck className="w-10 h-10 text-emerald-300" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">Déjà répondu</h2>
            <p className="text-blue-200/70">Vous avez déjà répondu à ce questionnaire. Merci !</p>
          </div>
        )}

        {status === 'invalid' && (
          <div className="text-center">
            <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <XCircle className="w-10 h-10 text-red-400" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">Lien invalide</h2>
            <p className="text-red-200/70 mb-6">Ce lien peut avoir expiré ou être invalide.</p>
            <Link href="/auth/login">
              <Button variant="outline" className="w-full border-white/20 text-white hover:bg-white/10">
                Se connecter autrement
              </Button>
            </Link>
          </div>
        )}
      </motion.div>
    </div>
  )
}
