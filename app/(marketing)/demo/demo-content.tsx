'use client'

import { useState } from 'react'
import { submitDemoLead } from '@/lib/actions/demo-actions'
import { Button } from '@/components/ui/button'
import { ArrowRight, Loader2 } from 'lucide-react'

const YOUTUBE_ID = 'VP-5kmHzERU'

export function DemoContent() {
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const form = e.currentTarget
    const data = {
      first_name: (form.elements.namedItem('first_name') as HTMLInputElement).value,
      last_name: (form.elements.namedItem('last_name') as HTMLInputElement).value,
      company: (form.elements.namedItem('company') as HTMLInputElement).value,
      email: (form.elements.namedItem('email') as HTMLInputElement).value,
    }

    const result = await submitDemoLead(data)

    if (!result.success) {
      setError(result.error ?? 'Erreur inconnue')
      setLoading(false)
      return
    }

    setSubmitted(true)
    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-[#FDFDFD] flex flex-col items-center justify-center px-4 py-24">
      <div className="w-full max-w-2xl mx-auto">
        {!submitted ? (
          <div className="bg-white border border-gray-100 rounded-3xl shadow-xl p-8 md:p-12">
            <div className="mb-8 text-center">
              <h1 className="text-3xl md:text-4xl font-black text-gray-900 mb-3 font-display">
                Voir la démo EDUZEN
              </h1>
              <p className="text-gray-500">
                Remplis le formulaire pour accéder à la démonstration complète.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="first_name" className="text-sm font-medium text-gray-700">
                    Prénom
                  </label>
                  <input
                    id="first_name"
                    name="first_name"
                    type="text"
                    required
                    placeholder="Marie"
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10 transition-all"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="last_name" className="text-sm font-medium text-gray-700">
                    Nom
                  </label>
                  <input
                    id="last_name"
                    name="last_name"
                    type="text"
                    required
                    placeholder="Dupont"
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10 transition-all"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="company" className="text-sm font-medium text-gray-700">
                  Entreprise / Organisme
                </label>
                <input
                  id="company"
                  name="company"
                  type="text"
                  required
                  placeholder="Mon Organisme de Formation"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10 transition-all"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="email" className="text-sm font-medium text-gray-700">
                  Email professionnel
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  placeholder="marie@monorganisme.fr"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10 transition-all"
                />
              </div>

              {error && (
                <p className="text-sm text-red-500 text-center">{error}</p>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="mt-2 w-full rounded-xl bg-[#111] hover:bg-gray-900 text-white py-3 font-semibold flex items-center justify-center gap-2"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    Accéder à la démo
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>

              <p className="text-xs text-gray-400 text-center mt-1">
                Aucun spam. Tes données restent confidentielles.
              </p>
            </form>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Voici la démo complète</h2>
              <p className="text-gray-500">Découvre toutes les fonctionnalités d'EDUZEN.</p>
            </div>
            <a
              href={`https://www.youtube.com/watch?v=${YOUTUBE_ID}`}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative block w-full aspect-video rounded-2xl overflow-hidden shadow-2xl"
            >
              <img
                src={`https://img.youtube.com/vi/${YOUTUBE_ID}/maxresdefault.jpg`}
                alt="Démo EDUZEN"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                <div className="w-20 h-20 rounded-full bg-white/90 group-hover:bg-white transition-colors flex items-center justify-center shadow-2xl">
                  <svg className="w-8 h-8 text-gray-900 ml-1" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              </div>
            </a>
          </div>
        )}
      </div>
    </main>
  )
}
