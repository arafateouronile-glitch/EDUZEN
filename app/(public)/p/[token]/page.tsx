'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams } from 'next/navigation'
import SignatureCanvas from 'react-signature-canvas'
import { CheckCircle, XCircle, Loader2, ChevronLeft, RotateCcw, User } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface AttendanceRequest {
  id: string
  student_id: string
  student_name: string
  student_email: string
  status: 'pending' | 'signed' | 'expired' | 'declined'
  signed_at: string | null
  signed_via: string | null
}

interface SessionData {
  id: string
  title: string
  date: string
  start_time: string | null
  end_time: string | null
  session_name: string | null
  organization_id: string
  has_pin: boolean
  requests: AttendanceRequest[]
}

type Step = 'loading' | 'error' | 'pin' | 'select' | 'confirm' | 'sign' | 'success' | 'already_signed'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function formatTime(t: string) {
  return t.slice(0, 5)
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen w-full flex flex-col items-center justify-center px-4 py-8"
      style={{
        background: 'linear-gradient(135deg, #274472 0%, #1e3a5f 50%, #0f2847 100%)',
      }}
    >
      <div
        className="w-full max-w-md relative"
        style={{
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 20,
          backdropFilter: 'blur(20px)',
          padding: '28px 24px',
        }}
      >
        {children}
      </div>
    </div>
  )
}

function LayoutWide({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen w-full flex flex-col items-center justify-center px-4 py-8"
      style={{
        background: 'linear-gradient(135deg, #274472 0%, #1e3a5f 50%, #0f2847 100%)',
      }}
    >
      <div className="w-full max-w-2xl space-y-4">{children}</div>
    </div>
  )
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={className}
      style={{
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 16,
        backdropFilter: 'blur(20px)',
        padding: '20px',
      }}
    >
      {children}
    </div>
  )
}

function SessionHeader({ session }: { session: SessionData }) {
  return (
    <div className="mb-6">
      <p className="text-[#34B9EE] text-xs font-semibold uppercase tracking-widest mb-1">
        Feuille de présence
      </p>
      <h1 className="text-white text-lg font-bold leading-tight">
        {session.session_name ?? session.title}
      </h1>
      <p className="text-white/60 text-sm mt-1">
        {formatDate(session.date)}
        {session.start_time && (
          <> · {formatTime(session.start_time)}{session.end_time ? ` – ${formatTime(session.end_time)}` : ''}</>
        )}
      </p>
    </div>
  )
}

// ─── PIN Step ─────────────────────────────────────────────────────────────────

function PinStep({
  token,
  onSuccess,
}: {
  token: string
  onSuccess: () => void
}) {
  const [digits, setDigits] = useState(['', '', '', ''])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const refs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ]

  const handleChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return
    const next = [...digits]
    next[index] = value
    setDigits(next)
    if (value && index < 3) refs[index + 1].current?.focus()
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      refs[index - 1].current?.focus()
    }
  }

  const handleSubmit = async () => {
    const pin = digits.join('')
    if (pin.length < 4) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/electronic-attendance/public-link/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify_pin', pin }),
      })
      const json = await res.json()
      if (!res.ok || !json.valid) {
        setError(json.error ?? 'Code incorrect, réessayez')
        setDigits(['', '', '', ''])
        refs[0].current?.focus()
      } else {
        sessionStorage.setItem(`pin_ok_${token}`, '1')
        onSuccess()
      }
    } catch {
      setError('Erreur réseau, réessayez')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (digits.every((d) => d !== '')) handleSubmit()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [digits])

  return (
    <Layout>
      <p className="text-[#34B9EE] text-xs font-semibold uppercase tracking-widest mb-4">
        Accès protégé
      </p>
      <h1 className="text-white text-xl font-bold mb-2">Code d'accès</h1>
      <p className="text-white/60 text-sm mb-8">
        Saisissez le code fourni par votre formateur
      </p>

      <div className="flex gap-3 justify-center mb-6">
        {digits.map((d, i) => (
          <input
            key={i}
            ref={refs[i]}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={d}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            autoFocus={i === 0}
            className="w-14 h-14 text-center text-2xl font-bold text-white rounded-xl outline-none transition-all"
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: `2px solid ${d ? '#34B9EE' : 'rgba(255,255,255,0.2)'}`,
            }}
          />
        ))}
      </div>

      {error && <p className="text-red-400 text-sm text-center mb-4">{error}</p>}

      {loading && (
        <div className="flex justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-[#34B9EE]" />
        </div>
      )}
    </Layout>
  )
}

// ─── Learner selection grid ────────────────────────────────────────────────────

function LearnerCard({
  request,
  onClick,
}: {
  request: AttendanceRequest
  onClick?: () => void
}) {
  const signed = request.status === 'signed'
  const signedTime = signed && request.signed_at
    ? new Date(request.signed_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <button
      onClick={signed ? undefined : onClick}
      disabled={signed}
      className="flex flex-col items-center gap-2 p-4 rounded-2xl transition-all text-center w-full"
      style={{
        background: signed ? 'rgba(30,110,90,0.15)' : 'rgba(39,68,114,0.7)',
        border: signed
          ? '1px solid rgba(30,110,90,0.3)'
          : '1px solid rgba(52,185,238,0.2)',
        cursor: signed ? 'default' : 'pointer',
        transform: 'scale(1)',
        transition: 'transform 0.15s, border-color 0.15s',
      }}
      onMouseEnter={(e) => {
        if (!signed) (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.03)'
        if (!signed) (e.currentTarget as HTMLButtonElement).style.borderColor = '#34B9EE'
      }}
      onMouseLeave={(e) => {
        if (!signed) (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'
        if (!signed) (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(52,185,238,0.2)'
      }}
    >
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold"
        style={{
          background: signed ? 'rgba(30,110,90,0.4)' : 'rgba(52,185,238,0.2)',
          color: signed ? '#4ade80' : '#34B9EE',
        }}
      >
        {signed ? <CheckCircle className="h-6 w-6" /> : getInitials(request.student_name)}
      </div>
      <span className="text-white text-sm font-semibold leading-tight">
        {request.student_name}
      </span>
      {signed ? (
        <span className="text-green-400 text-xs">
          Signé{signedTime ? ` à ${signedTime}` : ''}
        </span>
      ) : (
        <span className="text-white/40 text-xs">Pas encore signé</span>
      )}
    </button>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PublicEmargementPage() {
  const params = useParams()
  const token = (params?.token as string) ?? ''

  const [step, setStep] = useState<Step>('loading')
  const [errorMsg, setErrorMsg] = useState('')
  const [session, setSession] = useState<SessionData | null>(null)
  const [selected, setSelected] = useState<AttendanceRequest | null>(null)
  const [alreadySignedMsg, setAlreadySignedMsg] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [signedAt, setSignedAt] = useState<string | null>(null)

  const sigCanvasRef = useRef<SignatureCanvas>(null)
  const [sigEmpty, setSigEmpty] = useState(true)

  const loadSession = useCallback(async () => {
    try {
      const res = await fetch(`/api/electronic-attendance/public-link/${token}`)
      const json = await res.json()
      if (!res.ok) {
        setErrorMsg(json.error ?? 'Erreur lors du chargement')
        setStep('error')
        return
      }
      setSession(json.session)

      // Si le PIN a déjà été validé pour ce token (sessionStorage)
      const pinOk = sessionStorage.getItem(`pin_ok_${token}`)
      if (json.session.has_pin && !pinOk) {
        setStep('pin')
      } else {
        setStep('select')
      }
    } catch {
      setErrorMsg('Impossible de contacter le serveur')
      setStep('error')
    }
  }, [token])

  useEffect(() => {
    loadSession()
  }, [loadSession])

  const handlePinSuccess = () => setStep('select')

  const handleSelectLearner = (req: AttendanceRequest) => {
    setSelected(req)
    setStep('confirm')
  }

  const handleSign = async () => {
    if (!selected || !session) return
    const canvas = sigCanvasRef.current
    if (!canvas || canvas.isEmpty()) return

    setSubmitting(true)
    try {
      const signatureData = canvas.toDataURL('image/png')
      const res = await fetch('/api/electronic-attendance/public-sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, learnerId: selected.student_id, signatureData }),
      })
      const json = await res.json()

      if (!res.ok) {
        setErrorMsg(json.error ?? 'Erreur lors de la soumission')
        setStep('error')
        return
      }

      if (json.alreadySigned) {
        setAlreadySignedMsg(json.message ?? 'Vous avez déjà signé.')
        setStep('already_signed')
        return
      }

      setSignedAt(json.signed_at ?? new Date().toISOString())
      setStep('success')

      // Rafraîchir la liste pour l'admin (realtime se charge du reste)
      await loadSession()
    } catch {
      setErrorMsg('Erreur réseau, réessayez')
      setStep('error')
    } finally {
      setSubmitting(false)
    }
  }

  // ─── Render steps ────────────────────────────────────────────────────────────

  if (step === 'loading') {
    return (
      <Layout>
        <div className="flex flex-col items-center gap-4 py-8">
          <Loader2 className="h-8 w-8 animate-spin text-[#34B9EE]" />
          <p className="text-white/60 text-sm">Chargement…</p>
        </div>
      </Layout>
    )
  }

  if (step === 'error') {
    return (
      <Layout>
        <div className="flex flex-col items-center gap-4 py-6 text-center">
          <div className="rounded-full bg-red-500/20 p-3">
            <XCircle className="h-8 w-8 text-red-400" />
          </div>
          <h1 className="text-white text-lg font-semibold">Lien indisponible</h1>
          <p className="text-white/60 text-sm">{errorMsg}</p>
        </div>
      </Layout>
    )
  }

  if (step === 'pin') {
    return <PinStep token={token} onSuccess={handlePinSuccess} />
  }

  if (step === 'select' && session) {
    const unsigned = session.requests.filter((r) => r.status !== 'signed')
    const signed = session.requests.filter((r) => r.status === 'signed')
    return (
      <LayoutWide>
        <Card>
          <SessionHeader session={session} />
          <p className="text-white font-semibold mb-4">
            Choisissez votre nom pour signer votre présence
          </p>

          {/* Grid apprenants non signés */}
          {unsigned.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
              {unsigned.map((r) => (
                <LearnerCard key={r.id} request={r} onClick={() => handleSelectLearner(r)} />
              ))}
            </div>
          )}

          {/* Signés en bas, réduits */}
          {signed.length > 0 && (
            <>
              <div className="my-4 border-t border-white/10" />
              <p className="text-white/40 text-xs uppercase tracking-wider mb-3">Déjà signés</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {signed.map((r) => (
                  <LearnerCard key={r.id} request={r} />
                ))}
              </div>
            </>
          )}

          <p className="text-white/40 text-xs text-center mt-6">
            Votre nom n'apparaît pas ? Contactez votre formateur.
          </p>
        </Card>
      </LayoutWide>
    )
  }

  if (step === 'confirm' && selected && session) {
    return (
      <Layout>
        <button
          onClick={() => setStep('select')}
          className="flex items-center gap-1 text-white/50 text-sm mb-6 hover:text-white transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Retour
        </button>

        <div className="flex flex-col items-center gap-4 text-center">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold"
            style={{ background: 'rgba(52,185,238,0.2)', color: '#34B9EE' }}
          >
            <User className="h-10 w-10" />
          </div>

          <div>
            <p className="text-white/60 text-sm mb-1">Vous êtes bien</p>
            <h2 className="text-white text-2xl font-bold">{selected.student_name} ?</h2>
          </div>

          <div className="flex flex-col gap-3 w-full mt-4">
            <button
              onClick={() => setStep('sign')}
              className="w-full py-3 rounded-xl text-white font-semibold text-sm transition-opacity"
              style={{ background: 'linear-gradient(135deg, #335ACF, #34B9EE)' }}
            >
              Oui, c'est moi → Signer
            </button>
            <button
              onClick={() => setStep('select')}
              className="w-full py-3 rounded-xl text-white/70 text-sm border border-white/20 hover:border-white/40 transition-colors"
            >
              Ce n'est pas moi
            </button>
          </div>
        </div>
      </Layout>
    )
  }

  if (step === 'sign' && selected && session) {
    return (
      <Layout>
        <button
          onClick={() => setStep('confirm')}
          className="flex items-center gap-1 text-white/50 text-sm mb-6 hover:text-white transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Retour
        </button>

        <div className="mb-5">
          <p className="text-white/60 text-xs mb-1">
            {formatDate(session.date)}
            {session.start_time && (
              <> · {formatTime(session.start_time)}{session.end_time ? ` – ${formatTime(session.end_time)}` : ''}</>
            )}
          </p>
          <p className="text-white font-semibold text-sm">
            {session.session_name ?? session.title}
          </p>
          <p className="text-[#34B9EE] text-sm mt-0.5">{selected.student_name}</p>
        </div>

        <p className="text-white/70 text-sm mb-3">Signez dans le cadre ci-dessous</p>

        <div
          className="relative rounded-xl overflow-hidden mb-3"
          style={{ border: '2px solid rgba(52,185,238,0.4)', background: '#fff' }}
        >
          <SignatureCanvas
            ref={sigCanvasRef}
            canvasProps={{
              style: { width: '100%', height: '180px', display: 'block' },
              className: 'cursor-crosshair',
            }}
            backgroundColor="#ffffff"
            penColor="#000000"
            onEnd={() => setSigEmpty(sigCanvasRef.current?.isEmpty() ?? true)}
          />
          {sigEmpty && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <p className="text-gray-400 text-sm">Signez ici</p>
            </div>
          )}
        </div>

        <button
          onClick={() => {
            sigCanvasRef.current?.clear()
            setSigEmpty(true)
          }}
          className="flex items-center gap-1.5 text-white/50 text-xs hover:text-white/80 transition-colors mb-5"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Effacer
        </button>

        <button
          onClick={handleSign}
          disabled={sigEmpty || submitting}
          className="w-full py-3 rounded-xl text-white font-semibold text-sm transition-opacity"
          style={{
            background: 'linear-gradient(135deg, #335ACF, #34B9EE)',
            opacity: sigEmpty || submitting ? 0.4 : 1,
          }}
        >
          {submitting ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Envoi…
            </span>
          ) : (
            'Valider ma signature'
          )}
        </button>
      </Layout>
    )
  }

  if (step === 'already_signed') {
    return (
      <Layout>
        <div className="flex flex-col items-center gap-4 py-6 text-center">
          <div className="rounded-full bg-amber-500/20 p-3">
            <CheckCircle className="h-8 w-8 text-amber-400" />
          </div>
          <h1 className="text-white text-lg font-semibold">Déjà signé</h1>
          <p className="text-white/60 text-sm">{alreadySignedMsg}</p>
        </div>
      </Layout>
    )
  }

  if (step === 'success' && selected && session) {
    const time = signedAt
      ? new Date(signedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
      : ''
    return (
      <Layout>
        <div className="flex flex-col items-center gap-4 py-6 text-center">
          <div
            className="rounded-full p-4"
            style={{ background: 'rgba(52,185,238,0.2)', animation: 'spring 0.4s ease' }}
          >
            <CheckCircle className="h-14 w-14 text-[#34B9EE]" />
          </div>
          <h1 className="text-white text-xl font-bold">Présence confirmée !</h1>
          <div
            className="w-full text-left rounded-xl p-4 space-y-2"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <p className="text-white/60 text-xs">Vous avez signé votre feuille de présence pour :</p>
            <p className="text-white text-sm font-semibold">{session.session_name ?? session.title}</p>
            <p className="text-white/70 text-sm">Séance du {formatDate(session.date)}</p>
            {time && <p className="text-[#34B9EE] text-sm font-medium">Signé à {time}</p>}
          </div>
          <p className="text-white/40 text-xs">Vous pouvez fermer cette page.</p>
        </div>
      </Layout>
    )
  }

  return null
}
