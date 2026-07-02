import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { CheckCircle2, Award, Calendar, User, BookOpen, XCircle } from 'lucide-react'
import type { Metadata } from 'next'

interface PageProps {
  params: Promise<{ code: string }>
}

async function getCertificate(code: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
  const { data } = await (supabase as any)
    .from('certificates')
    .select('*')
    .eq('verification_code', code)
    .maybeSingle()
  return data
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { code } = await params
  const cert = await getCertificate(code)
  if (!cert) return { title: 'Certificat invalide' }
  return {
    title: `Certificat — ${cert.course_title}`,
    description: `Certificat de réussite de ${cert.student_name} pour la formation "${cert.course_title}"`,
  }
}

export default async function CertificatePage({ params }: PageProps) {
  const { code } = await params
  const cert = await getCertificate(code)

  if (!cert) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="flex justify-center mb-4">
            <XCircle className="h-16 w-16 text-red-400" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Certificat introuvable</h1>
          <p className="text-sm text-gray-500">
            Ce code de vérification est invalide ou le certificat n&apos;existe pas.
          </p>
          <p className="text-xs text-gray-400 mt-4 font-mono break-all">{code}</p>
        </div>
      </div>
    )
  }

  const issuedDate = cert.issued_at
    ? new Date(cert.issued_at).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center px-4 py-12">
      <div className="max-w-xl w-full">
        {/* Certificate card */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100">
          {/* Top ribbon */}
          <div className="bg-gradient-to-r from-brand-blue to-indigo-600 px-8 py-6 text-white text-center">
            <div className="flex justify-center mb-3">
              <Award className="h-12 w-12 opacity-90" />
            </div>
            <p className="text-sm font-medium opacity-80 tracking-wider uppercase">Certificat de réussite</p>
          </div>

          {/* Content */}
          <div className="px-8 py-8">
            <div className="text-center mb-8">
              <p className="text-sm text-gray-500 mb-1">Décerné à</p>
              <h2 className="text-2xl font-bold text-gray-900">{cert.student_name}</h2>
            </div>

            <div className="text-center mb-8">
              <p className="text-sm text-gray-500 mb-1">Pour avoir complété la formation</p>
              <h3 className="text-lg font-semibold text-gray-800 leading-snug">{cert.course_title}</h3>
            </div>

            {cert.score_percentage != null && (
              <div className="flex justify-center mb-8">
                <div className="bg-green-50 border border-green-200 rounded-2xl px-6 py-3 text-center">
                  <p className="text-2xl font-bold text-green-700">{cert.score_percentage}%</p>
                  <p className="text-xs text-green-600">Score moyen</p>
                </div>
              </div>
            )}

            {/* Meta */}
            <div className="space-y-3 mb-8">
              {issuedDate && (
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <Calendar className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <span>Délivré le <strong>{issuedDate}</strong></span>
                </div>
              )}
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <User className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <span>{cert.student_name}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <BookOpen className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <span>{cert.course_title}</span>
              </div>
            </div>

            {/* Verification badge */}
            <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-green-800">Certificat authentique et vérifié</p>
                  <p className="text-xs text-green-600 mt-0.5">
                    Ce certificat a été émis par la plateforme EduZen et son authenticité est confirmée.
                  </p>
                  <p className="text-xs text-gray-400 mt-2 font-mono break-all">Code : {code}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Vérification effectuée sur{' '}
          <span className="font-medium">EduZen</span>
        </p>
      </div>
    </div>
  )
}
