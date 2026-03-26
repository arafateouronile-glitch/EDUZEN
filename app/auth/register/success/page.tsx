'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { CheckCircle2, Mail, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

function SuccessContent() {
  const searchParams = useSearchParams()
  const email = searchParams.get('email')

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-white px-4">
      <div className="w-full max-w-md text-center space-y-6">

        {/* Icône */}
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>
        </div>

        {/* Titre */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-gray-900">Inscription enregistrée !</h1>
          <p className="text-gray-500">
            Votre compte a bien été créé.
          </p>
        </div>

        {/* Bloc email */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 text-left space-y-3">
          <div className="flex items-center gap-2 text-blue-700 font-semibold">
            <Mail className="w-5 h-5" />
            <span>Confirmez votre adresse email</span>
          </div>
          <p className="text-sm text-blue-800">
            Un lien de confirmation a été envoyé à{' '}
            {email ? (
              <span className="font-semibold">{email}</span>
            ) : (
              'votre adresse email'
            )}
            . Cliquez sur ce lien pour activer votre compte.
          </p>
          <p className="text-xs text-blue-600">
            Pensez à vérifier vos spams si vous ne le recevez pas dans quelques minutes.
          </p>
        </div>

        {/* Étapes */}
        <div className="bg-gray-50 rounded-xl p-5 text-left space-y-3">
          <p className="text-sm font-semibold text-gray-700">Prochaines étapes :</p>
          <ol className="space-y-2 text-sm text-gray-600">
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-brand-blue text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
              Ouvrez l&apos;email de confirmation
            </li>
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-brand-blue text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
              Cliquez sur le lien pour activer votre compte
            </li>
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-brand-blue text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
              Connectez-vous et accédez à votre espace
            </li>
          </ol>
        </div>

        {/* CTA */}
        <Link href="/auth/login">
          <Button className="w-full" size="lg">
            Aller à la connexion
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>

        <p className="text-xs text-gray-400">
          Vous avez déjà confirmé votre email ?{' '}
          <Link href="/auth/login" className="underline hover:text-gray-600">
            Connectez-vous directement
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function RegisterSuccessPage() {
  return (
    <Suspense>
      <SuccessContent />
    </Suspense>
  )
}
