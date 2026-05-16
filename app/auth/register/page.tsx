'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/hooks/use-auth'
import { Syne, DM_Sans } from 'next/font/google'

const syne = Syne({ subsets: ['latin'], weight: ['700', '800'], variable: '--font-syne' })
const dmSans = DM_Sans({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-dm-sans' })

const BENEFITS = [
  'Conventions générées en 45 secondes',
  'Émargements numériques inclus',
  '32 indicateurs Qualiopi automatisés',
  'CPF/EDOF synchronisé sans double saisie',
  'Essai gratuit 14 jours — sans carte bancaire',
]

const STATS = [
  { value: '17', label: 'Documents générés' },
  { value: '32', label: 'Indicateurs Qualiopi' },
  { value: '6h+', label: 'Récupérées/semaine' },
]

const TRUST_BADGES = ['📞 Appel fondateur 48h', '🛡️ 14j gratuits', '✓ Sans engagement']

export default function RegisterPage() {
  const { register, isRegistering, registerError } = useAuth()
  const [formData, setFormData] = useState({
    organizationName: '',
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (formData.password !== formData.confirmPassword) {
      setError('Les mots de passe ne correspondent pas')
      return
    }

    if (formData.password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères')
      return
    }

    try {
      await register({
        email: formData.email,
        password: formData.password,
        fullName: formData.fullName,
        organizationName: formData.organizationName,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue')
    }
  }

  return (
    <div className={`${syne.variable} ${dmSans.variable}`} style={{ minHeight: '100vh', display: 'flex', background: '#15263f' }}>
      <style>{`
        .reg-input {
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 10px;
          padding: 13px 16px;
          color: #ffffff;
          font-family: var(--font-dm-sans), DM Sans, sans-serif;
          font-size: 15px;
          outline: none;
          width: 100%;
          transition: border-color 0.2s, background 0.2s;
        }
        .reg-input::placeholder { color: rgba(255,255,255,0.3); }
        .reg-input:focus {
          border-color: #34B9EE;
          background: rgba(52,185,238,0.05);
        }
        .reg-btn {
          background: linear-gradient(135deg, #335ACF, #34B9EE);
          color: #ffffff;
          font-family: var(--font-syne), Syne, sans-serif;
          font-weight: 700;
          font-size: 16px;
          padding: 15px;
          border-radius: 10px;
          border: none;
          width: 100%;
          cursor: pointer;
          box-shadow: 0 8px 24px rgba(52,185,238,0.25);
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .reg-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 12px 32px rgba(52,185,238,0.35);
        }
        .reg-btn:disabled { opacity: 0.7; cursor: not-allowed; }
        .reg-login-link { color: #34B9EE; text-decoration: none; }
        .reg-login-link:hover { text-decoration: underline; }
        .reg-label {
          display: block;
          font-family: var(--font-dm-sans), DM Sans, sans-serif;
          font-size: 13px;
          font-weight: 500;
          color: #d1d9e2;
          margin-bottom: 6px;
        }
      `}</style>

      {/* ── LEFT COLUMN — value + social proof ── */}
      <div
        className="hidden md:flex flex-col justify-between"
        style={{ width: '50%', background: '#274472', padding: '40px 48px' }}
      >
        {/* Logo + tagline */}
        <div>
          <div style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '24px', color: '#ffffff', marginBottom: '4px' }}>
            Edu<span style={{ color: '#34B9EE' }}>Zen</span>
          </div>
          <p style={{ fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif', fontSize: '13px', color: '#d1d9e2' }}>
            Logiciel de gestion pour OF français
          </p>
        </div>

        {/* Main content area */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          {/* Hero title */}
          <div>
            <h1 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '32px', color: '#ffffff', lineHeight: '1.25', marginBottom: '12px' }}>
              Gérez votre OF<br />en 2h par semaine<br />au lieu de 8h.
            </h1>
            <p style={{ fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif', fontSize: '15px', color: '#d1d9e2', lineHeight: '1.65' }}>
              Conventions, émargements, Qualiopi, CPF —<br />tout automatisé en un seul outil.
            </p>
          </div>

          {/* Founder call badge */}
          <div style={{ background: 'rgba(52,185,238,0.12)', border: '1px solid rgba(52,185,238,0.3)', borderRadius: '12px', padding: '16px 20px' }}>
            <p style={{ fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif', fontSize: '14px', color: '#ffffff', lineHeight: '1.55', margin: 0 }}>
              📞 Le fondateur vous appelle personnellement dans les 48h pour configurer votre espace.
            </p>
          </div>

          {/* Benefits list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {BENEFITS.map((benefit) => (
              <div key={benefit} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ color: '#34B9EE', fontWeight: 700, flexShrink: 0 }}>✓</span>
                <span style={{ fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif', fontSize: '14px', color: '#d1d9e2' }}>{benefit}</span>
              </div>
            ))}
          </div>

          {/* Testimonial */}
          <div style={{ background: 'rgba(21,38,63,0.5)', borderLeft: '3px solid #34B9EE', borderRadius: '8px', padding: '20px' }}>
            <p style={{ fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif', fontStyle: 'italic', fontSize: '14px', color: '#ffffff', lineHeight: '1.65', marginBottom: '12px' }}>
              &ldquo;Je suis passée de 7h à moins de 2h d&apos;administratif par semaine. J&apos;ai retrouvé mes soirées.&rdquo;
            </p>
            <p style={{ fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif', fontSize: '13px', color: '#d1d9e2', marginBottom: '6px' }}>
              — Marie D., Directrice OF, Île-de-France
            </p>
            <span style={{ color: '#34B9EE', fontSize: '14px' }}>★★★★★</span>
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: '12px' }}>
          {STATS.map((stat) => (
            <div key={stat.label} style={{ flex: 1, background: 'rgba(21,38,63,0.4)', borderRadius: '10px', padding: '14px 12px', textAlign: 'center' }}>
              <div style={{
                fontFamily: 'var(--font-syne), Syne, sans-serif',
                fontWeight: 700,
                fontSize: '28px',
                background: 'linear-gradient(135deg, #335ACF 0%, #34B9EE 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>
                {stat.value}
              </div>
              <div style={{ fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif', fontSize: '11px', color: '#8a9bb0', marginTop: '4px' }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── RIGHT COLUMN — form ── */}
      <div
        style={{
          width: '100%',
          background: '#1d3556',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '32px 24px',
          minHeight: '100vh',
        }}
        className="md:w-1/2"
      >
        {/* Mobile-only header */}
        <div className="md:hidden" style={{ marginBottom: '28px', textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '20px', color: '#ffffff', marginBottom: '10px' }}>
            Edu<span style={{ color: '#34B9EE' }}>Zen</span>
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', background: 'rgba(52,185,238,0.12)', border: '1px solid rgba(52,185,238,0.3)', borderRadius: '100px', padding: '5px 14px', marginBottom: '14px' }}>
            <span style={{ fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif', fontSize: '12px', color: '#34B9EE' }}>📞 Appel fondateur sous 48h</span>
          </div>
          <div style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '20px', color: '#ffffff' }}>
            Créez votre espace gratuit
          </div>
        </div>

        <div style={{ width: '100%', maxWidth: '420px' }}>
          {/* Desktop form header */}
          <div className="hidden md:block" style={{ marginBottom: '28px' }}>
            <h2 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '22px', color: '#ffffff', marginBottom: '6px' }}>
              Créez votre espace gratuit
            </h2>
            <p style={{ fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif', fontSize: '14px', color: '#8a9bb0' }}>
              14 jours gratuits · Sans carte bancaire
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label htmlFor="organizationName" className="reg-label">
                Nom de l&apos;établissement *
              </label>
              <input
                id="organizationName"
                type="text"
                value={formData.organizationName}
                onChange={(e) => setFormData({ ...formData, organizationName: e.target.value })}
                required
                className="reg-input"
                placeholder="Mon Organisme de Formation"
              />
            </div>

            <div>
              <label htmlFor="fullName" className="reg-label">
                Votre nom complet *
              </label>
              <input
                id="fullName"
                type="text"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                required
                className="reg-input"
                placeholder="Jean Dupont"
              />
            </div>

            <div>
              <label htmlFor="email" className="reg-label">
                Email *
              </label>
              <input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                className="reg-input"
                placeholder="votre@email.com"
                autoComplete="email"
              />
            </div>

            <div>
              <label htmlFor="password" className="reg-label">
                Mot de passe *
              </label>
              <input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                minLength={8}
                className="reg-input"
                placeholder="Au moins 8 caractères"
                autoComplete="new-password"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="reg-label">
                Confirmer le mot de passe *
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                required
                className="reg-input"
                placeholder="••••••••"
                autoComplete="new-password"
              />
            </div>

            {(error || registerError) && (() => {
              const msg = error || (registerError instanceof Error ? registerError.message : 'Une erreur est survenue')
              const isInfo = msg.includes('email de confirmation') || msg.includes('boîte de réception')
              return (
                <div style={{
                  padding: '12px 16px',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif',
                  background: isInfo ? 'rgba(52,185,238,0.1)' : 'rgba(239,68,68,0.1)',
                  border: isInfo ? '1px solid rgba(52,185,238,0.3)' : '1px solid rgba(239,68,68,0.3)',
                  color: isInfo ? '#34B9EE' : '#f87171',
                }}>
                  {msg}
                </div>
              )
            })()}

            <button type="submit" disabled={isRegistering} className="reg-btn">
              {isRegistering ? 'Création en cours...' : 'Démarrer mon essai gratuit →'}
            </button>

            <p style={{ textAlign: 'center', fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif', fontSize: '12px', color: '#8a9bb0', margin: 0 }}>
              🔒 Sécurisé · Aucune CB requise · Annulation libre
            </p>
          </form>

          {/* Login link */}
          <div style={{ marginTop: '24px', textAlign: 'center', fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif', fontSize: '14px' }}>
            <span style={{ color: '#8a9bb0' }}>Déjà un compte ? </span>
            <Link href="/auth/login" className="reg-login-link">
              Se connecter
            </Link>
          </div>

          {/* Trust badges */}
          <div style={{ marginTop: '24px', display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
            {TRUST_BADGES.map((badge) => (
              <span key={badge} style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '100px',
                padding: '5px 12px',
                fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif',
                fontSize: '12px',
                color: '#d1d9e2',
              }}>
                {badge}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
